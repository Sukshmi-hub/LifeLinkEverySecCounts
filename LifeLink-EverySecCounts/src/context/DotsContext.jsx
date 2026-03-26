import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import useSocket from '@/hooks/useSocket'

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

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  // Fetch dots from API
  const fetchDots = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/dots/${userId}`, {
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
      const response = await fetch(`${API_BASE}/api/dots/clear/${userId}/${section}`, {
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
      fetchDots()
    }
    socket.on('dots_updated', onDots)
    return () => socket.off('dots_updated', onDots)
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
