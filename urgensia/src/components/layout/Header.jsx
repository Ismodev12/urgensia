import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Menu, ChevronDown, LogOut, User, Settings,
  CheckCheck, AlertTriangle, Info, CheckCircle, Clock,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { roleLabel } from '../../utils/helpers';

// ─── Icône selon le type ──────────────────────────────────────────────────────
function NotifIcon({ type }) {
  const map = {
    critical: { icon: AlertTriangle, cls: 'text-red-500    bg-red-50'    },
    warning:  { icon: AlertTriangle, cls: 'text-orange-500 bg-orange-50' },
    success:  { icon: CheckCircle,   cls: 'text-green-500  bg-green-50'  },
    info:     { icon: Info,          cls: 'text-blue-500   bg-blue-50'   },
  };
  const cfg = map[type] ?? map.info;
  const Icon = cfg.icon;
  return (
    <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  );
}

// ─── Formatage heure relative ─────────────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

// ─── Header principal ─────────────────────────────────────────────────────────
export function Header({ user, title }) {
  const { setSidebarOpen }                   = useApp();
  const { logout }                           = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const [showNotifs,  setShowNotifs]  = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const notifsRef  = useRef(null);
  const profileRef = useRef(null);

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target))
        setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target))
        setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Marquer comme lues à l'ouverture du panneau (après 1s)
  useEffect(() => {
    if (!showNotifs) return;
    const timer = setTimeout(() => markAllRead(), 1500);
    return () => clearTimeout(timer);
  }, [showNotifs, markAllRead]);

  const recent = notifications.slice(0, 20);

  // Page de paramètres self-service selon le rôle
  const settingsPath =
    user?.role === 'medecin' ? '/medecin/parametres' :
    user?.role === 'admin'   ? '/admin/parametres'   :
                               '/agent/parametres';

  const allerAuxParametres = () => { setShowProfile(false); navigate(settingsPath); };

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-10 shadow-sm">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(prev => !prev)}
          className="p-2 rounded-xl hover:bg-slate-100 text-soft-gray transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && (
          <h1 className="text-lg font-semibold text-night-blue hidden sm:block">{title}</h1>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">

        {/* ── Cloche de notifications ────────────────────────────────── */}
        <div className="relative" ref={notifsRef}>
          <button
            onClick={() => { setShowNotifs(v => !v); setShowProfile(false); }}
            className="relative p-2 rounded-xl hover:bg-slate-100 text-soft-gray transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
              >
                {/* Header panneau */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-teal-600" />
                    <h3 className="font-bold text-night-blue text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {notifications.some(n => !n.read) && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Tout lire
                    </button>
                  )}
                </div>

                {/* Liste */}
                <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                  {recent.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Aucune notification</p>
                      <p className="text-xs text-slate-400 mt-1">Vous êtes à jour !</p>
                    </div>
                  ) : (
                    recent.map((notif) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => markRead(notif.id)}
                        className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer group ${
                          !notif.read ? 'bg-teal-50/40 border-l-2 border-l-teal-400' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <NotifIcon type={notif.type} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-snug ${!notif.read ? 'font-semibold text-night-blue' : 'text-slate-600'}`}>
                              {notif.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <p className="text-[10px] text-slate-400">{relativeTime(notif.date)}</p>
                            </div>
                          </div>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-center text-xs text-slate-400">
                    {notifications.length} notification{notifications.length > 1 ? 's' : ''} au total
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Profil ────────────────────────────────────────────────── */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setShowProfile(v => !v); setShowNotifs(false); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Avatar photo={user?.photo} nom={user?.nom} prenom={user?.prenom} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-night-blue leading-none">{user?.prenom} {user?.nom}</p>
              <p className="text-xs text-soft-gray leading-none mt-0.5">{roleLabel(user?.role)}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-soft-gray hidden sm:block" />
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <Avatar photo={user?.photo} nom={user?.nom} prenom={user?.prenom} size="md" />
                    <div>
                      <p className="font-semibold text-night-blue text-sm">{user?.prenom} {user?.nom}</p>
                      <p className="text-xs text-soft-gray">{roleLabel(user?.role)}</p>
                      {user?.service && (
                        <p className="text-xs text-teal-600 font-medium">{user?.service}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={allerAuxParametres}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-soft-gray" />
                    Mon profil
                  </button>
                  <button
                    onClick={allerAuxParametres}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-soft-gray" />
                    Paramètres
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => { logout(); navigate('/connexion'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
