import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const DotsContext = createContext(undefined);

export const DotsProvider = ({ children }) => {
  const { user } = useAuth();
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
    if (!user?._id) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/dots/${user._id}`, {
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
    if (!user?._id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/dots/clear/${user._id}/${section}`, {
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
    if (!user?._id) return;

    // Fetch immediately on mount
    fetchDots();

    // Set up polling interval
    const interval = setInterval(fetchDots, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [user?._id]);

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
