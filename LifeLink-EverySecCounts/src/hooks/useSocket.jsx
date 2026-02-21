import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '@/context/AuthContext'

// Hook to manage socket connection with JWT auth and reconnection/backoff
export function useSocket(serverUrl = 'http://localhost:5000') {
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const reconnectRef = useRef({ attempts: 0 })

  const connect = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const s = io(serverUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    })

    s.on('connect', () => {
      reconnectRef.current.attempts = 0
      setIsConnected(true)
      setConnectionError(null)
    })

    s.on('connect_error', (err) => {
      setConnectionError(err.message || 'Connection error')
      setIsConnected(false)
    })

    s.on('disconnect', (reason) => {
      setIsConnected(false)
      if (reason === 'io client disconnect') {
        // manual disconnect
      }
    })

    setSocket(s)
  }, [serverUrl])

  useEffect(() => {
    // Auto-connect when we have a token
    const token = localStorage.getItem('token')
    if (token) connect()
    return () => {
      if (socket) socket.disconnect()
    }
  }, [])

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }, [socket])

  return { socket, isConnected, connectionError, connect, disconnect }
}

export default useSocket
