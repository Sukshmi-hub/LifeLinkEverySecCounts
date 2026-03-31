import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import useSocket from '@/hooks/useSocket'
import { serverUrl } from '@/lib/serverConfig';

const DotsContext = createContext(undefined);

export const DotsProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?._id || user?.id || null
  const { socket } = useSocket()
  const [dots, setDots] = useState({
    messages: false,
    requests: false,
    alerts: false,
    payments: false,
  });
  const [loading, setLoading] = useState(false);

  // Fetch dots from API
  const fetchDots = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${serverUrl}/api/dots/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setDots(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dots', err);
    } finally {
      setLoading(false);
    }
  };

  // Clear a specific dot
  const clearDot = async (section) => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${serverUrl}/api/dots/clear/${userId}/${section}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setDots(data.data);
        }
      }
    } catch (err) {
      console.error(`Failed to clear ${section} dot`, err);
    }
  };

  // Poll dots every 15 seconds
  useEffect(() => {
    if (!userId) return;

    // Fetch immediately on mount
    fetchDots();

    // Set up polling interval
    const interval = setInterval(fetchDots, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [userId]);

  // Listen for realtime dot updates via socket and refetch
  useEffect(() => {
    if (!socket) return
    const onDots = (payload) => {
      try {
        // Optimistically set the section dot so UI updates immediately even if fetch fails
        const section = payload && payload.section ? String(payload.section) : null
        if (section && ['messages', 'requests', 'alerts', 'payments'].includes(section)) {
          setDots(prev => ({ ...prev, [section]: true }))
        } else {
          // If no specific section provided, set a generic messages/request indicator
          setDots(prev => ({ ...prev, messages: true }))
        }
      } catch (e) {
        // ignore optimistic set errors
      }
      // also attempt a full refresh from server
      fetchDots()
    }
    socket.on('dots_updated', onDots)
    // Also listen for local incoming-message events from chat layer
    const onIncoming = (e) => {
      try {
        const section = e && e.detail && e.detail.section ? String(e.detail.section) : 'messages'
        if (section && ['messages', 'requests', 'alerts', 'payments'].includes(section)) {
          setDots(prev => ({ ...prev, [section]: true }))
        }
      } catch (e) {}
    }
    window.addEventListener('ll:incoming-message', onIncoming)

    return () => {
      socket.off('dots_updated', onDots)
      window.removeEventListener('ll:incoming-message', onIncoming)
    }
  }, [socket])

  return (
    <DotsContext.Provider value={{ dots, loading, clearDot, fetchDots }}>
      {children}
    </DotsContext.Provider>
  );
};

export const useDots = () => {
  const context = useContext(DotsContext);
  if (context === undefined) {
    throw new Error('useDots must be used within a DotsProvider');
  }
  return context;
};
