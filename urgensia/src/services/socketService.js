import { io } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

let socket = null;
// File d'attente : listeners enregistrés AVANT que le socket soit créé
const pendingListeners = [];

/**
 * Connecte le socket et rejoint les rooms selon le rôle.
 * Idempotent : retourne l'instance existante si déjà connecté.
 */
export function connectSocket(role, userId) {
  if (socket?.connected) {
    // Rejoindre les rooms en cas de reconnexion
    if (role)   socket.emit('join:role', role);
    if (userId) socket.emit('join:user', userId);
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token: getAccessToken() },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connecté :', socket.id);
    if (role)   socket.emit('join:role', role);
    if (userId) socket.emit('join:user', userId);

    // Appliquer les listeners en attente
    pendingListeners.forEach(({ event, callback }) => {
      socket.on(event, callback);
    });
  });

  socket.on('connect_error', (err) => {
    console.warn('⚠️ Socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket déconnecté :', reason);
  });

  return socket;
}

/** Déconnecte le socket proprement. */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    pendingListeners.length = 0;
  }
}

/**
 * Écoute un événement socket.
 * Si le socket n'est pas encore créé, met le listener en file d'attente.
 * Retourne une fonction de nettoyage.
 */
export function onSocketEvent(event, callback) {
  if (socket) {
    socket.on(event, callback);
    return () => socket?.off(event, callback);
  }

  // Socket pas encore créé → file d'attente
  const entry = { event, callback };
  pendingListeners.push(entry);
  return () => {
    const idx = pendingListeners.indexOf(entry);
    if (idx !== -1) pendingListeners.splice(idx, 1);
    socket?.off(event, callback);
  };
}

/** Retourne l'instance socket courante. */
export function getSocket() {
  return socket;
}

// ─── Socket public (patient, sans authentification) ───────────────────────────

let publicSocket = null;

/**
 * Connecte un socket public (sans token JWT) pour le suivi patient.
 */
export function connectSocketPublic() {
  if (publicSocket?.connected) return publicSocket;

  publicSocket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  publicSocket.on('connect', () => {
    console.log('🔌 Socket public connecté :', publicSocket.id);
  });

  publicSocket.on('connect_error', (err) => {
    console.warn('Socket public connection error:', err.message);
  });

  return publicSocket;
}

/**
 * Rejoindre la room de suivi pré-triage.
 */
export function joinPreTriageRoom(codeSuivi) {
  if (!publicSocket?.connected) {
    publicSocket?.on('connect', () => publicSocket.emit('join:pretriage', codeSuivi));
  } else {
    publicSocket.emit('join:pretriage', codeSuivi);
  }
}

/** Écouter un événement sur le socket public. Retourne une fonction de nettoyage. */
export function onPublicSocketEvent(event, callback) {
  if (!publicSocket) return () => {};
  publicSocket.on(event, callback);
  return () => publicSocket?.off(event, callback);
}

/** Déconnecter le socket public. */
export function disconnectPublicSocket() {
  if (publicSocket) {
    publicSocket.disconnect();
    publicSocket = null;
  }
}

/**
 * Rejoindre la room de suivi patient (code donné par l'infirmier après triage).
 */
export function joinSuiviRoom(codeSuivi) {
  if (!publicSocket?.connected) {
    publicSocket?.on('connect', () => publicSocket.emit('join:suivi', codeSuivi));
  } else {
    publicSocket.emit('join:suivi', codeSuivi);
  }
}
