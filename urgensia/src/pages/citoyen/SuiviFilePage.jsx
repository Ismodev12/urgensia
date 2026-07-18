import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Clock, CheckCircle, AlertTriangle,
  Phone, RefreshCw, Home, Users, Loader, Navigation
} from 'lucide-react';
import { getStatutPreTriage } from '../../services/preTriageService';
import {
  connectSocketPublic,
  joinPreTriageRoom,
  onPublicSocketEvent,
  disconnectPublicSocket,
} from '../../services/socketService';

// ─── Couleurs MTS ─────────────────────────────────────────────────────────────
const MTS = {
  1: { couleur: '#DC2626', bg: '#FEE2E2', border: '#FECACA', label: 'CRITIQUE',    emoji: '🔴' },
  2: { couleur: '#EA580C', bg: '#FFEDD5', border: '#FED7AA', label: 'TRÈS URGENT', emoji: '🟠' },
  3: { couleur: '#EAB308', bg: '#FEF9C3', border: '#FEF08A', label: 'URGENT',      emoji: '🟡' },
  4: { couleur: '#22C55E', bg: '#DCFCE7', border: '#BBF7D0', label: 'STANDARD',    emoji: '🟢' },
  5: { couleur: '#3B82F6', bg: '#DBEAFE', border: '#BFDBFE', label: 'NON URGENT',  emoji: '🔵' },
};

// ─── Statuts lisibles ─────────────────────────────────────────────────────────
const STATUTS = {
  en_attente: { label: 'En attente',         icon: Clock,        color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200' },
  arrive:     { label: 'Arrivée confirmée',  icon: CheckCircle,  color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200'   },
  en_cours:   { label: 'En cours de soin',   icon: Activity,     color: 'text-teal-700',   bg: 'bg-teal-50',    border: 'border-teal-200'   },
  termine:    { label: 'Consultation terminée', icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-200'  },
  expire:     { label: 'Code expiré',        icon: AlertTriangle, color: 'text-slate-500', bg: 'bg-slate-50',   border: 'border-slate-200'  },
};

// ─── Visualisation file d'attente ─────────────────────────────────────────────
function QueueVisualizer({ position, manchesterNiveau }) {
  const n = MTS[manchesterNiveau] || MTS[5];
  const devant = Math.max(0, position - 1);
  const maxAffiches = Math.min(devant, 4); // max 4 patients affichés devant

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100">
      <p className="text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wide">
        File d'attente simplifiée
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Patients devant (grisés) */}
        {Array.from({ length: maxAffiches }).map((_, i) => (
          <div key={i}
            className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold"
            title={`Patient ${i + 1}`}
          >
            <Users className="w-4 h-4" />
          </div>
        ))}
        {devant > 4 && (
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-semibold">
            +{devant - 4}
          </div>
        )}

        {/* VOUS */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg border-2 border-white"
          style={{ backgroundColor: n.couleur, boxShadow: `0 4px 20px ${n.couleur}55` }}
          title="Vous"
        >
          VOUS
        </motion.div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: n.couleur }} />
        <p className="text-xs font-semibold" style={{ color: n.couleur }}>
          Niveau {manchesterNiveau} — {n.label}
        </p>
      </div>
    </div>
  );
}

// ─── Carte de statut ──────────────────────────────────────────────────────────
function StatutCard({ statut }) {
  const s = STATUTS[statut] || STATUTS['en_attente'];
  const Icon = s.icon;

  return (
    <div className={`flex items-center gap-3 rounded-2xl p-4 border ${s.bg} ${s.border}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg} border ${s.border}`}>
        <Icon className={`w-5 h-5 ${s.color}`} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">Statut actuel</p>
        <p className={`font-bold text-sm ${s.color}`}>{s.label}</p>
      </div>
      {(statut === 'en_attente' || statut === 'arrive') && (
        <div className="ml-auto">
          <span className="w-2 h-2 bg-orange-400 rounded-full inline-block animate-pulse" />
        </div>
      )}
      {statut === 'en_cours' && (
        <div className="ml-auto">
          <span className="w-2 h-2 bg-teal-500 rounded-full inline-block animate-pulse" />
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SuiviFilePage() {
  const { code } = useParams();
  const codeSuivi = (code || '').toUpperCase();

  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  // ─── Chargement initial ──────────────────────────────────────────────────
  const charger = useCallback(async () => {
    try {
      const res = await getStatutPreTriage(codeSuivi);
      setData(res);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Code introuvable. Vérifiez le code ou effectuez un nouveau pré-triage.');
      } else {
        setError('Impossible de récupérer les informations. Vérifiez votre connexion.');
      }
    } finally {
      setLoading(false);
    }
  }, [codeSuivi]);

  // ─── WebSocket : mises à jour temps réel ────────────────────────────────
  useEffect(() => {
    charger();

    // Connexion socket public
    connectSocketPublic();
    joinPreTriageRoom(codeSuivi);

    const offUpdate = onPublicSocketEvent('pretriage:update', (payload) => {
      setData(prev => prev ? { ...prev, ...payload } : prev);
      setLastUpdate(new Date());
    });

    const offConnect = onPublicSocketEvent('connect', () => setWsConnected(true));
    const offDisconnect = onPublicSocketEvent('disconnect', () => setWsConnected(false));

    // Rafraîchissement auto toutes les 60 secondes (fallback)
    const interval = setInterval(charger, 60_000);

    return () => {
      offUpdate();
      offConnect();
      offDisconnect();
      clearInterval(interval);
      disconnectPublicSocket();
    };
  }, [codeSuivi, charger]);

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0FDFA, #EFF6FF)' }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-4">
            <Loader className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
          <p className="text-slate-600 font-semibold">Chargement…</p>
          <p className="text-slate-400 text-sm mt-1">Code : {codeSuivi}</p>
        </div>
      </div>
    );
  }

  // ─── Erreur ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #F0FDFA, #EFF6FF)' }}>
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Code introuvable</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <div className="space-y-3">
            <Link to="/triage-citoyen"
              className="block w-full py-3 bg-teal-700 text-white rounded-xl font-semibold text-sm hover:bg-teal-800 transition-colors">
              Faire un nouveau pré-triage
            </Link>
            <Link to="/"
              className="block w-full py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const n = MTS[data?.manchesterNiveau] || MTS[5];
  const statut = data?.statut || 'en_attente';
  const isActif = statut === 'en_attente' || statut === 'arrive';
  const isTermine = statut === 'termine' || statut === 'expire';

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F0FDFA 0%, #F8FAFC 60%, #EFF6FF 100%)' }}>

      {/* Header */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-700 to-teal-500 rounded-xl flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800">URGENSIA</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Indicateur WebSocket */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              wsConnected ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
              {wsConnected ? 'Temps réel' : 'Connecté'}
            </div>
            <button onClick={charger}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-teal-700 transition-colors cursor-pointer"
              title="Actualiser">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Code de suivi */}
        <div className="text-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Votre code de suivi</p>
          <p className="text-3xl font-black tracking-widest text-slate-800 font-mono">{codeSuivi}</p>
          {lastUpdate && (
            <p className="text-xs text-slate-400 mt-1">
              Mis à jour : {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>

        {/* Badge niveau Manchester */}
        <div
          className="rounded-2xl p-5 border-2 flex items-center gap-4"
          style={{ backgroundColor: n.bg, borderColor: n.border }}
        >
          <motion.div
            animate={data?.manchesterNiveau <= 2 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-md flex-shrink-0"
            style={{ backgroundColor: n.couleur }}
          >
            N{data?.manchesterNiveau}
          </motion.div>
          <div>
            <p className="text-xs font-semibold" style={{ color: n.couleur }}>Niveau Manchester</p>
            <p className="text-xl font-black" style={{ color: n.couleur }}>{n.label}</p>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {data?.manchesterDelai || 'Délai selon urgence'}
            </p>
          </div>
        </div>

        {/* Statut */}
        <StatutCard statut={statut} />

        {/* Position en file (seulement si actif) */}
        <AnimatePresence>
          {isActif && data?.position !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* KPIs position */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center shadow-sm">
                  <p className="text-3xl font-black text-slate-800">{data.patientsDevant}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    patient{data.patientsDevant !== 1 ? 's' : ''} avant vous
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center shadow-sm">
                  <p className="text-3xl font-black text-teal-700">
                    {data.estimationMinutes === 0 ? 'Immédiat' : `~${data.estimationMinutes}`}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {data.estimationMinutes === 0 ? 'à votre arrivée' : 'min d\'attente estimé'}
                  </p>
                </div>
              </div>

              {/* Visualisation file */}
              <QueueVisualizer position={data.position} manchesterNiveau={data.manchesterNiveau} />

              {/* Message de bienvenue à l'arrivée */}
              {statut === 'en_attente' && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">🏥</div>
                  <div>
                    <p className="text-sm font-bold text-blue-800">Vous n'êtes pas encore à l'hôpital ?</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Présentez ce code à l'accueil à votre arrivée. L'infirmier d'accueil-triage confirmera votre présence et votre place sera réservée.
                    </p>
                  </div>
                </div>
              )}

              {statut === 'arrive' && (
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">✅</div>
                  <div>
                    <p className="text-sm font-bold text-teal-800">Arrivée confirmée !</p>
                    <p className="text-xs text-teal-600 mt-0.5">
                      Un infirmier d'accueil-triage a confirmé votre arrivée. Veuillez patienter, vous serez appelé(e) selon votre niveau de priorité.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* En cours de soin */}
        {statut === 'en_cours' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-teal-50 border-2 border-teal-300 rounded-2xl p-6 text-center"
          >
            <div className="text-4xl mb-2">🩺</div>
            <h3 className="text-lg font-black text-teal-800">En cours de consultation</h3>
            <p className="text-sm text-teal-600 mt-1">Un médecin s'occupe de vous en ce moment.</p>
          </motion.div>
        )}

        {/* Terminé */}
        {statut === 'termine' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border-2 border-green-300 rounded-2xl p-6 text-center"
          >
            <div className="text-4xl mb-2">✅</div>
            <h3 className="text-lg font-black text-green-800">Consultation terminée</h3>
            <p className="text-sm text-green-600 mt-1">Votre visite aux urgences est terminée. Prenez soin de vous !</p>
          </motion.div>
        )}

        {/* Expiré */}
        {statut === 'expire' && (
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 text-center">
            <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-bold text-slate-600">Code expiré (24h)</p>
            <p className="text-xs text-slate-400 mt-1">Veuillez effectuer un nouveau pré-triage.</p>
          </div>
        )}

        {/* Résumé clinique */}
        {data?.resumeClinique && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Résumé clinique</p>
            <p className="text-sm text-slate-700 leading-relaxed">{data.resumeClinique}</p>
          </div>
        )}

        {/* Alerte urgence vitale */}
        {data?.manchesterNiveau <= 2 && isActif && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-red-700">Urgence vitale — Venez immédiatement</p>
              <p className="text-xs text-red-600 mt-0.5">
                Votre état nécessite une prise en charge immédiate. Rendez-vous aux urgences maintenant.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-col gap-3 pb-4">
          <Link
            to={`/orientation/pretriage/${codeSuivi}`}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #1E3A8A, #1D4ED8)' }}
          >
            <Navigation className="w-4 h-4" />
            Plan d’accès à l’hôpital
          </Link>
          <div className="flex gap-3">
            <Link to="/triage-citoyen"
              className="flex-1 py-3 text-center border border-slate-200 text-sm font-semibold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
              Nouveau pré-triage
            </Link>
            <Link to="/"
              className="flex items-center gap-1.5 px-4 py-3 border border-slate-200 text-sm font-semibold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
              <Home className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
