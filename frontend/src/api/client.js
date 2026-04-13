import axios from 'axios';
import toast from 'react-hot-toast';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor ────────────────────────────────────────────────────────
// Automatically attach JWT from localStorage to every outgoing request.
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ───────────────────────────────────────────────────────
// 401 = token expired / invalid → force re-login.
// 403 = domain restriction or permission denied → let the UI show the error,
//       do NOT clear the session or redirect (user may be legitimately logged in).
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.error('Session expired. Please log in again.');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // 403: fall through — caller's catch block receives the full error with
    // err.response.data.message so the form can display the restriction message.

    return Promise.reject(error);
  }
);

export default client;
