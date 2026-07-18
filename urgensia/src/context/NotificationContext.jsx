import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchNotifications,
  markAsRead,
  markAllRead,
} from '../services/notificationService';
import { onSocketEvent } from '../services/socketService';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(false);

  // ── Son de notification ────────────────────────────────────────────────────
  const playSound = useCallback((type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'critical') {
        // Double bip aigu pour les critiques
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        // Bip doux pour les autres
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch { /* silencieux si AudioContext non supporté */ }
  }, []);

  // ── Charger les notifications depuis l'API ─────────────────────────────────
  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      console.warn('Notifications: impossible de charger depuis l\'API', err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ── Charger au montage + socket ────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    loadNotifications();

    // Écouter les nouvelles notifications temps réel
    const offNotif = onSocketEvent('notification:new', (notif) => {
      const normalized = {
        id:              notif.id,
        type:            notif.type,
        message:         notif.message,
        patientId:       notif.patientId ?? null,
        read:            false,
        date:            notif.date ?? new Date().toISOString(),
      };

      setNotifications(prev => [normalized, ...prev]);
      playSound(notif.type);

      // Notification navigateur si autorisée
      if (Notification.permission === 'granted') {
        const icons = {
          critical: '🚨',
          warning:  '⚠️',
          success:  '✅',
          info:     'ℹ️',
        };
        new Notification(`URGENSIA — ${icons[notif.type] ?? ''} Notification`, {
          body: notif.message,
          icon: '/favicon.ico',
          tag:  notif.id,
          requireInteraction: notif.type === 'critical',
        });
      }
    });

    // Écouter les alertes critiques (broadcast global)
    const offCritical = onSocketEvent('alert:critical', (data) => {
      const notif = {
        id:      `temp-${Date.now()}`,
        type:    'critical',
        message: data.message ?? `🚨 Alerte critique — Patient ${data.prenom} ${data.nom}`,
        read:    false,
        date:    new Date().toISOString(),
      };
      setNotifications(prev => {
        // Ne pas dupliquer si déjà reçu via notification:new
        if (prev.find(n => n.message === notif.message)) return prev;
        return [notif, ...prev];
      });
      playSound('critical');
    });

    // Demander la permission navigateur pour les notifications push
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      offNotif();
      offCritical();
    };
  }, [isAuthenticated, user, loadNotifications, playSound]);

  // ── Marquer une notif comme lue ────────────────────────────────────────────
  const handleMarkRead = useCallback(async (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    try { await markAsRead(id); } catch { /* optionnel */ }
  }, []);

  // ── Marquer toutes comme lues ──────────────────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await markAllRead(); } catch { /* optionnel */ }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markRead:    handleMarkRead,
      markAllRead: handleMarkAllRead,
      reload:      loadNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
