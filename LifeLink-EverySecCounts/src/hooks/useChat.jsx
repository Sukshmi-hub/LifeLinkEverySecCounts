import { useEffect, useReducer, useCallback } from 'react'
import { useSocket } from './useSocket'

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
      return { ...state, messages: [...state.messages, ...action.messages] }
    case 'RECEIVE_MESSAGE':
      return { ...state, messages: [...state.messages, action.message], unreadCount: state.activeRoomId === action.roomId ? state.unreadCount : state.unreadCount + 1 }
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
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (!socket) return

    const onReceive = ({ message }) => {
      dispatch({ type: 'RECEIVE_MESSAGE', message, roomId: message.roomId })
    }
    const onTyping = ({ userId }) => dispatch({ type: 'SET_TYPING', userId, isTyping: true })
    const onStopTyping = ({ userId }) => dispatch({ type: 'SET_TYPING', userId, isTyping: false })
    const onMessagesRead = ({ messageIds }) => dispatch({ type: 'MARK_READ', ids: messageIds })

    socket.on('receive_message', onReceive)
    socket.on('user_typing', onTyping)
    socket.on('user_stop_typing', onStopTyping)
    socket.on('messages_read', onMessagesRead)

    return () => {
      socket.off('receive_message', onReceive)
      socket.off('user_typing', onTyping)
      socket.off('user_stop_typing', onStopTyping)
      socket.off('messages_read', onMessagesRead)
    }
  }, [socket])

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

  const loadHistory = useCallback(async (roomId, opts = { limit: 50, offset: 0 }) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${serverUrl}/api/chat/history/${roomId}?limit=${opts.limit}&offset=${opts.offset}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      if (!res.ok) return
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        dispatch({ type: 'ADD_MESSAGES', messages: json.data })
      }
    } catch (err) {
      // ignore
    }
  }, [serverUrl])

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
    if (!socket) return
    socket.emit('mark_read', { roomId, messageIds }, (res) => {
      if (res && res.success) dispatch({ type: 'MARK_READ', ids: messageIds })
    })
  }, [socket])

  return { socket, isConnected, connectionError, connect, state, joinRoom, leaveRoom, sendMessage, markRead, loadHistory }
}

export default useChat
