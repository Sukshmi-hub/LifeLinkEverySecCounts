import api from '@/api/api';

export const authService = {
  // Registration
  register: async (userData) => {
    try {
      const { data } = await api.post('/api/auth/register', userData);
      return data;
    } catch (error) {
      // Normalize error for the UI
      return {
        success: false,
        message: error?.response?.data?.message || error.message || 'Connection failed',
      };
    }
  },

  // Login
  login: async (credentials) => {
    try {
      const { data } = await api.post('/api/auth/login', credentials);
      return data;
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || error.message || 'Connection failed',
      };
    }
  }
};
