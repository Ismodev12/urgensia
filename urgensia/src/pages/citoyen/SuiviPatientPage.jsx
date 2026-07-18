import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Clock, CheckCircle, AlertTriangle, RefreshCw, Home, Loader,
  Navigation, Bell, MapPin, Building2, Layers, DoorOpen,
  Stethoscope, Hourglass,
} from 'lucide-react';
import { getSuiviPatient } from '../../services/suiviService';
import { PublicFooter } from '../../components/common/PublicFooter';
import {
  connectSocketPublic,
  joinSuiviRoom,
  onPublicSocketEvent,
  disconnectPublicSocket,
} from '../../services/socketService';

// ─── Constantes MTS (thème clair) ─────────────────────────────────────────────
const MTS = {
  1: { couleur: '#DC2626', bg: '#FEE2E2', border: '#FECACA', label: 'Critique' },
  2: { couleur: '#EA580C', bg: '#FFEDD5', border: '#FED7AA', label: 'Très Urgent' },
  3: { couleur: '#EAB308', bg: '#FEF9C3', border: '#FEF08A', label: 'Urgent' },
  4: { couleur: '#22C55E', bg: '#DCFCE7', border: '#BBF7D0', label: 'Standard' },
  5: { couleur: '#3B82F6', bg: '#DBEAFE', border: '#BFDBFE', label: 'Non Urgent' },
};

const STATUTS = {
  en_attente:     { label: 'En attente',       icon: Clock,       color: '#D97706', bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'text-amber-600',  pulse: true  },
  en_cours:       { label: 'En cours de soin',  icon: Stethoscope, color: '#0F766E', bg: 'bg-teal-50',   text: 'text-teal-700',   ring: 'text-teal-600',   pulse: true  },
  pris_en_charge: { label: 'Pris en charge',    icon: CheckCircle, color: '#2563EB', bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'text-blue-600',   pulse: false },
  sorti:          { label: 'Sortie confirmée',  icon: Home,        color: '#16A34A', bg: 'bg-green-50',  text: 'text-green-700',  ring: 'text-green-600',  pulse: false },
};

// ─── Notifications navigateur ─────────────────────────────────────────────────
function useNotifications() {
  const [permission, setPermission] = useState(Notification?.permission ?? 'default');

  const demander = async () => {
    if (!('Notification' in window)) return;
    const res = await Notification.requestPermission();
    setPermission(res);
  };

  const notifier = useCallback((titre, corps) => {
    if (permission !== 'granted') return;
    try {
      new Notification(titre, {
        body: corps, icon: '/favicon.ico', badge: '/favicon.ico',
        tag: 'urgensia-suivi', requireInteraction: true,
      });
    } catch { /* silencieux */ }
  }, [permission]);

  return { permission, demander, notifier };
}

// ─── Étapes textuelles « comment s'y rendre » (non interactif) ────────────────
function construireEtapes(orientation) {
  if (!orientation) return [];
  const etapes = [
    {
      titre: 'Depuis l\'accueil principal',
      desc: 'Rendez-vous au hall d\'accueil — c\'est votre point de départ.',
      Icon: DoorOpen,
    },
  ];
  if (orientation.batiment) {
    etapes.push({
      titre: `Rejoignez le ${orientation.batiment}`,
      desc: 'Suivez le couloir principal en direction du bâtiment indiqué.',
      Icon: Building2,
    });
  }
  if (orientation.etage && !/rez/i.test(orientation.etage)) {
    etapes.push({
      titre: `Montez au ${orientation.etage}`,
      desc: 'Empruntez l\'ascenseur central ou les escaliers.',
      Icon: Layers,
    });
  }
  etapes.push({
    titre: 'Suivez la signalétique',
    desc: orientation.descriptionChemin
      || `Repérez les panneaux de couleur indiquant « ${orientation.serviceNom} ».`,
    Icon: Navigation,
  });
  etapes.push({
    titre: `Arrivée — ${orientation.serviceNom}`,
    desc: orientation.salle ? `Présentez-vous en ${orientation.salle}.` : 'Vous êtes arrivé à destination.',
    Icon: MapPin,
  });
  return etapes;
}

// ─── Toast temps réel ─────────────────────────────────────────────────────────
function NotificationToast({ message, onDismiss }) {
  if (!message) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
      >
        <div className="bg-teal-700 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-start gap-3">
          <Bell className="w-5 h-5 flex-shrink-0 mt-0.5 animate-bounce" />
          <p className="flex-1 font-bold text-sm">{message}</p>
          <button onClick={onDismiss} className="text-teal-200 hover:text-white text-sm flex-shrink-0 cursor-pointer" aria-label="Fermer">✕</button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Visualiseur de file (clair) ──────────────────────────────────────────────
function FileVisualizer({ patientsDevant, mts }) {
  const before = Math.min(patientsDevant, 5);
  return (
    <div className="relative flex items-center justify-between pt-1">
      <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-slate-200" />
      {Array.from({ length: before }).map((_, i) => (
        <span key={`b${i}`} className="relative w-3.5 h-3.5 rounded-full bg-teal-500 border-2 border-white shadow-sm" />
      ))}
      <span
        className="relative flex items-center justify-center min-w-8 h-8 px-2 rounded-full text-white text-xs font-black shadow-md"
        style={{ backgroundColor: mts.couleur }}
      >
        {patientsDevant}
      </span>
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={`a${i}`} className="relative w-3 h-3 rounded-full bg-white border-2 border-slate-200" />
      ))}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function SuiviPatientPage() {
  const { code } = useParams();
  const navigate  = useNavigate();
  const codeSuivi = (code || '').toUpperCase().trim();

  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [lastUpdate,   setLastUpdate]   = useState(null);
  const [wsConnected,  setWsConnected]  = useState(false);
  const [notification, setNotification] = useState(null);
  const prevStatutRef = useRef(null);
  const prevDevantRef = useRef(null);
  const lastQueueFetch = useRef(0);

  const { permission, demander, notifier } = useNotifications();

  // ─── Chargement ─────────────────────────────────────────────────────────
  const charger = useCallback(async () => {
    try {
      const res = await getSuiviPatient(codeSuivi);
      setData(res);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(
        err.response?.status === 404
          ? 'Code introuvable. Vérifiez le code communiqué par votre infirmier.'
          : 'Impossible de récupérer les informations. Vérifiez votre connexion.'
      );
    } finally {
      setLoading(false);
    }
  }, [codeSuivi]);

  // ─── WebSocket ──────────────────────────────────────────────────────────
  useEffect(() => {
    charger();
    connectSocketPublic();
    joinSuiviRoom(codeSuivi);

    const offUpdate = onPublicSocketEvent('suivi:update', (payload) => {
      setData(prev => prev ? { ...prev, ...payload } : prev);
      setLastUpdate(new Date());
      if (payload.message) {
        setNotification(payload.message);
        notifier('URGENSIA — Mise à jour', payload.message);
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      }
    });

    const offConnect    = onPublicSocketEvent('connect',    () => setWsConnected(true));
    const offDisconnect = onPublicSocketEvent('disconnect', () => setWsConnected(false));

    // La file a bougé (prise en charge / nouveau patient) → rafraîchir la position en temps réel (throttle 3 s)
    const offQueue = onPublicSocketEvent('queue:moved', () => {
      const now = Date.now();
      if (now - lastQueueFetch.current < 3000) return;
      lastQueueFetch.current = now;
      charger();
    });

    const interval = setInterval(charger, 90_000);

    return () => {
      offUpdate(); offConnect(); offDisconnect(); offQueue();
      clearInterval(interval);
      disconnectPublicSocket();
    };
  }, [codeSuivi, charger, notifier]);

  // ─── Détecter changement de statut ──────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    const prev = prevStatutRef.current;
    if (prev && prev !== data.statut) {
      const s = STATUTS[data.statut];
      if (s) {
        const msg = `Statut mis à jour : ${s.label}`;
        setNotification(msg);
        notifier('URGENSIA — Votre suivi', msg);
      }
    }
    prevStatutRef.current = data.statut;
  }, [data?.statut, notifier]);

  // ─── Détecter « c'est bientôt votre tour » (position → 0) ────────────────
  useEffect(() => {
    if (!data) return;
    const devant = data.patientsDevant;
    const prev   = prevDevantRef.current;
    // Passage de « au moins 1 devant » à « prochain », encore en attente
    if (prev != null && prev > 0 && devant === 0 && data.statut === 'en_attente') {
      const msg = 'C\'est bientôt votre tour — vous êtes le prochain patient. Restez à proximité.';
      setNotification(msg);
      notifier('URGENSIA — Bientôt à vous', 'Vous êtes le prochain patient. Restez à proximité du service.');
      if ('vibrate' in navigator) navigator.vibrate([300, 120, 300]);
    }
    prevDevantRef.current = devant;
  }, [data?.patientsDevant, data?.statut, notifier]);

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0FDFA, #F8FAFC)' }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 border border-teal-100 shadow-soft">
            <Loader className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
          <p className="text-night-blue font-semibold">Chargement de votre suivi…</p>
          <p className="text-soft-gray text-sm mt-1 font-mono">{codeSuivi}</p>
        </div>
      </div>
    );
  }

  // ─── Erreur ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #F0FDFA, #F8FAFC)' }}>
        <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-sm w-full text-center shadow-large">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-night-blue mb-2">Code introuvable</h2>
          <p className="text-soft-gray text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/patient')}
            className="w-full py-3 bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-xl font-bold text-sm hover:from-teal-800 hover:to-teal-700 transition-all cursor-pointer shadow-teal"
          >
            Réessayer avec un autre code
          </button>
        </div>
      </div>
    );
  }

  const n        = MTS[data?.manchesterNiveau] || MTS[5];
  const statut   = data?.statut || 'en_attente';
  const s        = STATUTS[statut] || STATUTS.en_attente;
  const StatutIcon = s.icon;
  const isActif  = statut === 'en_attente' || statut === 'en_cours';
  const orientation = data?.orientation;
  const etapes   = construireEtapes(orientation);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #F6FBFB 0%, #F8FAFC 100%)' }}>

      <NotificationToast message={notification} onDismiss={() => setNotification(null)} />

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-700 to-teal-500 flex items-center justify-center shadow-teal">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-night-blue tracking-wide text-lg">URGENSIA</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              wsConnected ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-teal-500 animate-pulse' : 'bg-slate-300'}`} />
              {wsConnected ? 'En direct' : 'Hors ligne'}
            </span>
            <button onClick={charger} title="Actualiser"
              className="p-2 rounded-xl hover:bg-slate-100 text-soft-gray hover:text-teal-700 transition-colors cursor-pointer">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl sm:text-4xl font-black text-night-blue leading-tight">
            Suivez votre passage <span className="gradient-text">en temps réel</span>
          </h1>
          <p className="text-soft-gray mt-2 max-w-2xl">
            Suivez votre position dans la file d'attente et l'itinéraire vers le service qui vous accueille.
            Cette page se met à jour automatiquement.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-soft">
              <span className="text-xs text-soft-gray">Code</span>
              <span className="font-mono font-black tracking-widest text-night-blue">{codeSuivi}</span>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 border ${s.bg} border-transparent`}>
              <StatutIcon className={`w-4 h-4 ${s.ring}`} />
              <span className={`text-sm font-bold ${s.text}`}>{s.label}</span>
              {s.pulse && <span className="w-2 h-2 rounded-full bg-current animate-pulse opacity-70" />}
            </div>
            {lastUpdate && (
              <span className="text-xs text-soft-gray">
                Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Bannières d'état (hors file active) ─────────────────────────── */}
        {statut === 'en_cours' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-teal-50 border border-teal-200 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Stethoscope className="w-7 h-7 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-teal-800">C'est votre tour !</h3>
              <p className="text-sm text-teal-700">Un membre de l'équipe médicale s'occupe de vous en ce moment.</p>
            </div>
          </motion.div>
        )}
        {statut === 'pris_en_charge' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-blue-100 flex items-center justify-center flex-shrink-0 shadow-sm">
              <CheckCircle className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-blue-800">Prise en charge en cours</h3>
              <p className="text-sm text-blue-700">L'équipe médicale s'occupe de vous.</p>
            </div>
          </div>
        )}
        {statut === 'sorti' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-green-100 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Home className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-green-800">Consultation terminée</h3>
              <p className="text-sm text-green-700">Prenez soin de vous et bonne récupération.</p>
            </div>
          </div>
        )}

        {/* ── C'est bientôt votre tour (vous êtes le prochain) ─────────────── */}
        {statut === 'en_attente' && data?.patientsDevant === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-teal-50 border-2 border-teal-300 rounded-2xl p-5 flex items-center gap-4"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
              className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center flex-shrink-0 shadow-teal"
            >
              <Bell className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h3 className="text-lg font-black text-teal-800">C'est bientôt votre tour !</h3>
              <p className="text-sm text-teal-700">Vous êtes le prochain patient. Restez à proximité du service, vous allez être appelé(e).</p>
            </div>
          </motion.div>
        )}

        {/* ── Alerte critique ─────────────────────────────────────────────── */}
        {data?.manchesterNiveau <= 2 && isActif && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-black text-red-700">Urgence vitale — Signalez-vous immédiatement</p>
              <p className="text-xs text-red-600 mt-0.5">Votre état est prioritaire : présentez-vous sans attendre au personnel médical présent.</p>
            </div>
          </div>
        )}

        {/* ── Position + Destination ──────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Position dans la file */}
          {isActif && data?.patientsDevant !== undefined && data?.patientsDevant !== null && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-2xl shadow-soft p-6">
              <h2 className="font-bold text-night-blue mb-5">Votre position dans la file d'attente</h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <p className="text-4xl font-black text-teal-700 leading-none">{data.patientsDevant}</p>
                  <p className="text-xs text-soft-gray mt-1.5">patient{data.patientsDevant !== 1 ? 's' : ''} devant vous</p>
                  <p className="text-xs text-soft-gray mt-3">Temps d'attente estimé</p>
                  <p className="text-lg font-black text-night-blue">
                    {data.estimationMinutes === 0 ? 'Immédiat' : `~ ${data.estimationMinutes} min`}
                  </p>
                </div>
                <div className="rounded-2xl p-4 border" style={{ backgroundColor: n.bg, borderColor: n.border }}>
                  <p className="text-xs font-semibold text-slate-600 mb-1.5">Niveau de priorité</p>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-black text-white" style={{ backgroundColor: n.couleur }}>
                    {data.manchesterNiveau} — {n.label}
                  </span>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    Votre état nécessite une prise en charge {data.manchesterDelai ? `sous ${data.manchesterDelai}` : 'selon la priorité'}.
                  </p>
                </div>
              </div>

              <FileVisualizer patientsDevant={data.patientsDevant} mts={n} />
              <div className="flex items-center justify-between text-xs text-soft-gray mt-2.5">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" /> En cours</span>
                <span>À venir</span>
              </div>

              {statut === 'en_attente' && (
                <div className="mt-5 flex items-start gap-2 bg-slate-50 rounded-xl p-3 text-xs text-soft-gray">
                  <Hourglass className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  Patientez en salle d'attente : vous serez appelé selon votre priorité. Le temps peut varier en fonction de l'évolution des urgences.
                </div>
              )}
            </motion.section>
          )}

          {/* Votre destination */}
          {orientation && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-white border border-slate-100 rounded-2xl shadow-soft p-6 ${!isActif ? 'lg:col-span-2' : ''}`}>
              <h2 className="font-bold text-night-blue mb-4">Votre destination</h2>

              <div className="rounded-2xl p-4 border mb-4" style={{ backgroundColor: n.bg, borderColor: n.border }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" style={{ color: n.couleur }} />
                  </div>
                  <p className="text-lg font-black text-night-blue leading-tight">{orientation.serviceNom}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {(orientation.etage || orientation.batiment) && (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-[11px] text-soft-gray">Niveau</p>
                      <p className="text-sm font-semibold text-night-blue">{orientation.etage || orientation.batiment}</p>
                    </div>
                  </div>
                )}
                {(orientation.batiment || orientation.salle) && (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-[11px] text-soft-gray">Zone</p>
                      <p className="text-sm font-semibold text-night-blue">
                        {[orientation.batiment, orientation.salle].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </div>

        {/* ── Comment vous y rendre (textuel, non interactif) ─────────────── */}
        {etapes.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-100 rounded-2xl shadow-soft p-6">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <h2 className="font-bold text-night-blue">Comment vous y rendre</h2>
                <p className="text-xs text-soft-gray">Itinéraire vers {orientation?.serviceNom}</p>
              </div>
            </div>

            <ol className="space-y-1">
              {etapes.map((e, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white font-black flex items-center justify-center shadow-sm">
                      {i + 1}
                    </span>
                    {i < etapes.length - 1 && <span className="w-0.5 flex-1 my-1 bg-teal-100 rounded-full min-h-6" />}
                  </div>
                  <div className={i < etapes.length - 1 ? 'pb-5' : ''}>
                    <div className="flex items-center gap-2">
                      <e.Icon className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <p className="font-bold text-night-blue">{e.titre}</p>
                    </div>
                    <p className="text-sm text-soft-gray mt-0.5 leading-relaxed">{e.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </motion.section>
        )}

        {/* ── Résumé clinique ─────────────────────────────────────────────── */}
        {data?.resumeClinique && (
          <section className="bg-white border border-slate-100 rounded-2xl shadow-soft p-6">
            <h2 className="font-bold text-night-blue mb-2">Résumé de votre évaluation</h2>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">{data.resumeClinique}</p>
          </section>
        )}

        {/* ── Restez informé ──────────────────────────────────────────────── */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white border border-amber-200 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-bold text-amber-800 text-sm">Restez informé</p>
              <p className="text-xs text-amber-700/90 mt-0.5">
                Les temps d'attente sont mis à jour en temps réel. Merci de rester à proximité du service.
              </p>
            </div>
          </div>
          {permission !== 'granted' && isActif && (
            <button
              onClick={demander}
              className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-amber-300 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              Activer les notifications
            </button>
          )}
        </section>

        {/* ── Retour ──────────────────────────────────────────────────────── */}
        <div className="pt-2">
          <button
            onClick={() => navigate('/patient')}
            className="inline-flex items-center gap-2 text-sm font-medium text-soft-gray hover:text-teal-700 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" /> Accueil patient
          </button>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
