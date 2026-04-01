// src/lib/serverConfig.js
// Centralized server URL from Vite environment variables with production fallback.
const DEFAULT_API_URL = 'https://lifelink-backend-g7h9.onrender.com';

export const serverUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
