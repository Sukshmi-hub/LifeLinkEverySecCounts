// src/lib/serverConfig.js
// Centralized server URL. Use Vite env `VITE_API_URL` in production or default to localhost:5000.
export const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
