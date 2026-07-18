import api, { setTokens, clearTokens } from './api';
import { normalizeUser } from '../utils/normalizeApi';

/**
 * POST /api/auth/login
 * Retourne { accessToken, refreshToken, user }
 */
export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  setTokens(data.accessToken, data.refreshToken);
  return {
    accessToken:  data.accessToken,
    refreshToken: data.refreshToken,
    // Le backend renvoie photoUrl (camelCase) ; on expose aussi `photo`
    // pour rester cohérent avec normalizeUser (utilisé par getMe).
    user:         { ...data.user, photo: data.user.photoUrl ?? data.user.photo ?? null },
  };
}

/**
 * POST /api/auth/logout
 */
export async function logout() {
  const refreshToken = localStorage.getItem('urgensia_refresh_token');
  try {
    await api.post('/auth/logout', { refreshToken });
  } catch {
    // On ignore les erreurs réseau au logout
  } finally {
    clearTokens();
  }
}

/**
 * GET /api/auth/me
 * Récupère le profil complet de l'utilisateur connecté.
 */
export async function getMe() {
  const { data } = await api.get('/auth/me');
  return normalizeUser(data);
}

/**
 * POST /api/auth/forgot-password
 * @param {string} email
 * @returns {{ message, resetToken?, resetUrl?, expiresIn? }}
 */
export async function forgotPassword(email) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

/**
 * POST /api/auth/reset-password
 * @param {string} token
 * @param {string} newPassword
 * @returns {{ message }}
 */
export async function resetPassword(token, newPassword) {
  const { data } = await api.post('/auth/reset-password', { token, newPassword });
  return data;
}
