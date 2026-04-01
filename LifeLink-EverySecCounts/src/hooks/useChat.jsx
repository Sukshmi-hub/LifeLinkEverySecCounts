import { useEffect, useReducer, useCallback } from 'react'
import { useSocket } from './useSocket'
import { useAuth } from '@/context/AuthContext'

const initialState = {
  messages: [],
  typingUsers: {},
  unreadCount: 0,
  activeRoomId: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ACTIVE_ROOM':
      return { ...state, activeRoomId: action.roomId, messages: [], unreadCount: 0 }
    case 'ADD_MESSAGES':
      // add messages while avoiding duplicates by _id
      try {
        const existingIds = new Set(state.messages.map(m => String(m._id)))
        const toAdd = (action.messages || []).filter(m => m && !existingIds.has(String(m._id)))
        return { ...state, messages: [...state.messages, ...toAdd] }
      } catch (e) {
        return { ...state, messages: [...state.messages, ...action.messages] }
      }
    case 'RECEIVE_MESSAGE':
      try {
        const id = String(action.message?._id || action.message?.id || '')
        if (id && state.messages.some(m => String(m._id) === id)) {
          return state
        }
        const senderId = String(action.message?.senderId || action.message?.sender_id || '')
        const currentUserId = String(action.currentUserId || '')
        const isOwnMessage = currentUserId && senderId === currentUserId
        const shouldIncrementUnread = state.activeRoomId !== action.roomId && !isOwnMessage
        return {
          ...state,
          messages: [...state.messages, action.message],
          unreadCount: shouldIncrementUnread ? state.unreadCount + 1 : state.unreadCount,
        }
      } catch (e) {
        return { ...state, messages: [...state.messages, action.message], unreadCount: state.unreadCount }
      }
    case 'SET_TYPING':
      return { ...state, typingUsers: { ...state.typingUsers, [action.userId]: action.isTyping } }
    case 'MARK_READ':
      return { ...state, messages: state.messages.map(m => action.ids.includes(m._id) ? { ...m, isRead: true } : m), unreadCount: 0 }
    default:
      return state
  }
}

export function useChat(serverUrl) {
  const { socket, isConnected, connectionError, connect } = useSocket(serverUrl)
  const { user } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (!socket) return

    const onReceive = ({ message }) => {
      dispatch({ type: 'RECEIVE_MESSAGE', message, roomId: message.roomId, currentUserId: String(user?._id || user?.id || '') })
      try {
        // If message is for another room (not active) and not from current user, notify Dots system
        const myId = String(user?._id || user?.id || '')
        const senderId = String(message?.senderId || message?.sender_id || '')
        if (senderId && senderId !== myId && state.activeRoomId !== message.roomId) {
          window.dispatchEvent(new CustomEvent('ll:incoming-message', { detail: { section: 'messages' } }))
        }
      } catch (e) {}
    }
    const onTyping = ({ userId }) => dispatch({ type: 'SET_TYPING', userId, isTyping: true })
    const onStopTyping = ({ userId }) => dispatch({ type: 'SET_TYPING', userId, isTyping: false })
    const onMessagesRead = ({ messageIds }) => dispatch({ type: 'MARK_READ', ids: messageIds })

    // Ensure we re-join active room after reconnect
    const onConnect = () => {
      try {
        if (state.activeRoomId && socket) {
          socket.emit('join_room', { roomId: state.activeRoomId }, (res) => {
            // ignore res; server will emit messages as needed
          })
        }
      } catch (e) {
        // ignore
      }
    }

    socket.on('receive_message', onReceive)
    socket.on('user_typing', onTyping)
    socket.on('user_stop_typing', onStopTyping)
    socket.on('messages_read', onMessagesRead)
    socket.on('connect', onConnect)

    return () => {
      socket.off('receive_message', onReceive)
      socket.off('user_typing', onTyping)
      socket.off('user_stop_typing', onStopTyping)
      socket.off('messages_read', onMessagesRead)
      socket.off('connect', onConnect)
    }
  }, [socket, state.activeRoomId, user?._id, user?.id])

  const joinRoom = useCallback(async (roomId) => {
    if (!socket) return { success: false, message: 'No socket' }
    return new Promise((resolve) => {
      socket.emit('join_room', { roomId }, (res) => {
        if (res && res.success) {
          dispatch({ type: 'SET_ACTIVE_ROOM', roomId })
          resolve(res)
        } else resolve(res)
      })
    })
  }, [socket])

  // allow setting active room locally when socket is not available
  const setActiveRoomLocal = useCallback((roomId) => {
    dispatch({ type: 'SET_ACTIVE_ROOM', roomId })
  }, [])

  const loadHistory = useCallback(async (roomId, opts = { limit: 50, offset: 0 }) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${serverUrl}/api/chat/history/${roomId}?limit=${opts.limit}&offset=${opts.offset}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      if (!res.ok) return
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        dispatch({ type: 'ADD_MESSAGES', messages: json.data })
        try {
          const myId = String(user?._id || user?.id || '')
          const unreadIds = (json.data || [])
            .filter(m => m && !m.isRead && String(m.senderId || m.sender_id || '') !== myId)
            .map(m => m._id)
          if (roomId && unreadIds.length > 0 && roomId === state.activeRoomId) {
            markRead(roomId, unreadIds)
          }
        } catch (e) {}
        return json.data
      }
    } catch (err) {
      // ignore
    }
    return []
  }, [serverUrl, markRead, state.activeRoomId, user?._id, user?.id])

  const leaveRoom = useCallback((roomId) => {
    if (!socket) return
    socket.emit('leave_room', { roomId })
    dispatch({ type: 'SET_ACTIVE_ROOM', roomId: null })
  }, [socket])

  const sendMessage = useCallback((roomId, content) => {
    if (!socket) return Promise.resolve({ success: false, message: 'No socket' })
    return new Promise((resolve) => {
      socket.emit('send_message', { roomId, content }, (res) => {
        resolve(res)
      })
    })
  }, [socket])

  const markRead = useCallback((roomId, messageIds) => {
    if (socket) {
      socket.emit('mark_read', { roomId, messageIds }, (res) => {
        if (res && res.success) dispatch({ type: 'MARK_READ', ids: messageIds })
      })
      return
    }

    // Fallback: call REST API to mark messages read
    (async () => {
      try {
        const token = localStorage.getItem('token')
        for (const id of (messageIds || [])) {
          await fetch(`${serverUrl}/api/chat/messages/${id}/read`, { method: 'PATCH', headers: { Authorization: token ? `Bearer ${token}` : '' } })
        }
        dispatch({ type: 'MARK_READ', ids: messageIds })
      } catch (e) {
        // ignore
      }
    })()
  }, [socket])

  return { socket, isConnected, connectionError, connect, state, joinRoom, leaveRoom, sendMessage, markRead, loadHistory, setActiveRoomLocal }
}

export default useChat
