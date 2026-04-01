import axios from 'axios';

const DEFAULT_API_URL = 'https://lifelink-backend-g7h9.onrender.com';

export const baseURL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
