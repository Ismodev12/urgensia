/**
 * Client HTTP Axios centralisé pour URGENSIA.
 * Gère automatiquement :
 *  - L'injection du token JWT dans chaque requête
 *  - Le refresh automatique quand l'access token expire (code TOKEN_EXPIRED)
 */
import axios from 'axios';

// En production, définir VITE_API_URL (ex. https://urgensia.onrender.com) sur Netlify.
// En local, on retombe sur le backend local. Le socket (socketService) utilise la même variable.
// On retire tout slash final pour éviter un double slash (…//api) qui casse le routing Express.
export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
const BASE_URL = `${API_ORIGIN}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// ─── Helpers tokens (localStorage) ───────────────────────────────────────────
export const getAccessToken  = () => localStorage.getItem('urgensia_access_token');
export const getRefreshToken = () => localStorage.getItem('urgensia_refresh_token');
export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('urgensia_access_token',  accessToken);
  if (refreshToken) localStorage.setItem('urgensia_refresh_token', refreshToken);
};
export const clearTokens = () => {
  localStorage.removeItem('urgensia_access_token');
  localStorage.removeItem('urgensia_refresh_token');
};

// ─── Intercepteur requête : injecte le Bearer token ──────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Intercepteur réponse : refresh automatique ───────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isTokenExpired =
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry;

    if (isTokenExpired) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      const refreshToken = getRefreshToken();

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        setTokens(data.accessToken, null);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/connexion';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
