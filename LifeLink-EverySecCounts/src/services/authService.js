const API_URL = 'http://localhost:5000/api/auth';

const handleResponse = async (res) => {
  const text = await res.text();
  try {
    const json = JSON.parse(text || '{}');
    if (!res.ok) throw new Error(json.message || json.error || res.statusText || 'Request failed');
    return json;
  } catch (err) {
    // If JSON.parse fails, return plain text or error
    if (!res.ok) throw new Error(text || res.statusText || 'Request failed');
    try {
      return JSON.parse(text);
    } catch (e) {
      return { data: text };
    }
  }
};

export const authService = {
  // Registration
  register: async (userData) => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return await handleResponse(response);
    } catch (error) {
      // Normalize error for the UI
      return { success: false, message: error.message || 'Connection failed' };
    }
  },

  // Login
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      return await handleResponse(response);
    } catch (error) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }
};
