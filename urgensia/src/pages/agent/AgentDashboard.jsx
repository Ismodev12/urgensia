import { useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, AlertTriangle, Clock, UserPlus,
  ArrowRight, Activity, Bell, Siren, Home, CheckCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card, KPICard } from '../../components/common/Card';
import { ManchesterBadge } from '../../components/common/ManchesterBadge';
import { Avatar } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatTime, getWaitingTime, sortPatientsByPriority } from '../../utils/helpers';
import { getPatients } from '../../services/patientService';
import { getDashboardStats, getWeeklyStats, getAnalytics } from '../../services/statsService';
import { AnalyticsSection } from '../../components/dashboard/AnalyticsSection';
import { onSocketEvent } from '../../services/socketService';
import { normalizePatient } from '../../utils/normalizeApi';
import api from '../../services/api';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

export default function AgentDashboard() {
  const { patients, setPatients } = useApp();
  const { user } = useAuth();
  const [stats,         setStats]         = useState(null);
  const [analytics,     setAnalytics]     = useState(null);
  const [activityData,  setActivityData]  = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [preTriages,    setPreTriages]    = useState([]); // pré-triages à distance
  const [loading,       setLoading]       = useState(true);
  const [confirmingCode, setConfirmingCode] = useState(null);

  // ── Chargement initial ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    // Patients = donnée critique
    try {
      setPatients(await getPatients());
    } catch (err) {
      console.error('Erreur chargement patients:', err);
    }
    // Stats : dégradation gracieuse — une route en échec ne casse pas le reste
    const [statsRes, weeklyRes, analyticsRes] = await Promise.allSettled([
      getDashboardStats(),
      getWeeklyStats(),
      getAnalytics(),
    ]);
    if (statsRes.status     === 'fulfilled') setStats(statsRes.value);
    if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
    if (weeklyRes.status    === 'fulfilled') setActivityData(weeklyRes.value.map(d => ({ heure: d.jour, patients: d.patients })));
    setLoading(false);
  }, [setPatients]);

  useEffect(() => {
    loadData();

    // ── WebSocket : nouveau patient ────────────────────────────────────────
    const offNew = onSocketEvent('patient:new', (data) => {
      setPatients(prev => {
        if (prev.find(p => p.id === data.id)) return prev;
        return [normalizePatient(data), ...prev];
      });
      setNotifications(prev => [{
        id: Date.now(),
        type: data.manchesterNiveau <= 2 ? 'critical' : 'info',
        message: `Nouveau patient : ${data.prenom} ${data.nom} — N${data.manchesterNiveau}`,
        time: 'À l\'instant',
        read: false,
      }, ...prev.slice(0, 9)]);
    });

    // ── WebSocket : changement de statut ──────────────────────────────────
    const offStatus = onSocketEvent('patient:status_changed', ({ patientId, nouveauStatut, manchesterNiveau }) => {
      setPatients(prev => prev.map(p =>
        p.id === patientId
          ? { ...p, statut: nouveauStatut === 'en_attente' ? 'En attente' : nouveauStatut === 'en_cours' ? 'En cours' : 'Pris en charge', manchesterLevel: manchesterNiveau ?? p.manchesterLevel }
          : p
      ));
    });

    // ── WebSocket : pré-triage citoyen reçu ────────────────────────────────
    const offPreTriage = onSocketEvent('pretriage:new', (data) => {
      setPreTriages(prev => {
        if (prev.find(pt => pt.codeSuivi === data.codeSuivi)) return prev;
        return [data, ...prev.slice(0, 9)];
      });
      setNotifications(prev => [{
        id: Date.now(),
        type: data.manchesterNiveau <= 2 ? 'critical' : 'warning',
        message: `🏠 Pré-triage : ${data.prenom} ${data.nom} — N${data.manchesterNiveau} (${data.codeSuivi})`,
        time: 'À l\'instant',
        read: false,
      }, ...prev.slice(0, 9)]);
    });

    // Rafraîchissement périodique des statistiques (60 s) — garde les indicateurs à jour
    const statsInterval = setInterval(loadData, 60000);

    return () => { offNew(); offStatus(); offPreTriage(); clearInterval(statsInterval); };
  }, [loadData, setPatients]);

  // ── Données dérivées ──────────────────────────────────────────────────────
  const criticalPatients = patients.filter(p => p.manchesterLevel <= 2);
  const waitingPatients  = patients.filter(p => p.statut === 'En attente');
  const sortedPatients   = sortPatientsByPriority(patients).slice(0, 5);
  const avgWaitMins      = analytics?.global?.attenteMoyenneMin ?? '—'; // réel : arrivée → prise en charge (24 h)

  // ── Confirmer l'arrivée d'un pré-triage ──────────────────────────────────
  const confirmerArrivee = async (codeSuivi) => {
    setConfirmingCode(codeSuivi);
    try {
      await api.patch(`/pretriage/${codeSuivi}/confirmer`);
      setPreTriages(prev => prev.filter(pt => pt.codeSuivi !== codeSuivi));
      setNotifications(prev => [{
        id: Date.now(),
        type: 'success',
        message: `✅ Arrivée confirmée pour le code ${codeSuivi}`,
        time: 'À l\'instant',
        read: false,
      }, ...prev.slice(0, 9)]);
    } catch (err) {
      console.error('Erreur confirmation arrivée:', err);
    } finally {
      setConfirmingCode(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="agent" user={user} title="Tableau de bord">
        <div className="flex items-center justify-center h-64">
          <svg className="animate-spin w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="agent" user={user} title="Tableau de bord">
      <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">

        {/* Welcome Banner */}
        <motion.div
          variants={fadeUp}
          className="relative overflow-hidden rounded-2xl p-6 text-white"
          style={{ background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 60%, #06B6D4 100%)' }}
        >
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-12 right-16 w-32 h-32 bg-white/5 rounded-full" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-teal-100 text-sm mb-1">Bienvenue,</p>
              <h2 className="text-2xl font-bold mb-1">{user?.prenom} {user?.nom}</h2>
              <p className="text-teal-100 text-sm">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/agent/nouveau-patient"
                className="flex items-center gap-2 bg-white text-teal-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-teal-50 transition-colors shadow-md cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Nouveau patient
              </Link>
              <Link
                to="/agent/cas-critique"
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-900/40 cursor-pointer border-2 border-red-400"
              >
                <Siren className="w-4 h-4" />
                🚨 Cas critique
              </Link>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Patients aujourd'hui"
            value={stats?.patients?.aujourd_hui ?? patients.length}
            subtitle="Depuis l'ouverture"
            icon={Users}
            color="teal"
          />
          <KPICard
            title="Cas critiques"
            value={criticalPatients.length}
            subtitle="Niveaux 1 & 2"
            icon={AlertTriangle}
            color="red"
          />
          <KPICard
            title="Temps moyen"
            value={`${avgWaitMins} min`}
            subtitle="Triage complet"
            icon={Clock}
            color="blue"
          />
          <KPICard
            title="En attente"
            value={waitingPatients.length}
            subtitle="File d'attente active"
            icon={Activity}
            color="orange"
          />
        </motion.div>

        {/* Charts Row */}
        <motion.div variants={fadeUp} className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-night-blue">Activité de la semaine</h3>
                  <p className="text-xs text-soft-gray">Admissions par jour</p>
                </div>
                <span className="text-xs bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full font-medium">7 derniers jours</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activityData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0F766E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="heure" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    labelStyle={{ color: '#0F172A', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="patients" stroke="#0F766E" strokeWidth={2.5} fill="url(#colorPatients)" dot={{ fill: '#0F766E', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Level Distribution */}
          <Card>
            <div className="mb-4">
              <h3 className="font-semibold text-night-blue">Niveaux Manchester</h3>
              <p className="text-xs text-soft-gray">Distribution actuelle</p>
            </div>
            <div className="space-y-3">
              {[
                { level: 1, count: patients.filter(p => p.manchesterLevel === 1).length },
                { level: 2, count: patients.filter(p => p.manchesterLevel === 2).length },
                { level: 3, count: patients.filter(p => p.manchesterLevel === 3).length },
                { level: 4, count: patients.filter(p => p.manchesterLevel === 4).length },
                { level: 5, count: patients.filter(p => p.manchesterLevel === 5).length },
              ].map(({ level, count }) => {
                const colors = ['#DC2626', '#EA580C', '#EAB308', '#22C55E', '#3B82F6'];
                const labels = ['Critique', 'Très Urgent', 'Urgent', 'Standard', 'Non Urgent'];
                const total  = patients.length || 1;
                const pct    = Math.round((count / total) * 100);
                return (
                  <div key={level}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[level - 1] }} />
                        <span className="text-soft-gray">N{level} - {labels[level - 1]}</span>
                      </div>
                      <span className="font-semibold text-night-blue">{count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: colors[level - 1] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Statistiques détaillées (temps réel) — occupation des services masquée (réservée médecin/admin) */}
        <AnalyticsSection analytics={analytics} accent="teal" showOccupation={false} />

        {/* Bottom Row */}
        <motion.div variants={fadeUp} className="grid lg:grid-cols-3 gap-6">
          {/* Recent Patients */}
          <div className="lg:col-span-2">
            <Card padding={false}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-night-blue">Derniers patients</h3>
                  <p className="text-xs text-soft-gray">File d'attente prioritaire</p>
                </div>
                <Link to="/agent/file-attente" className="text-xs text-teal-700 font-medium hover:text-teal-800 flex items-center gap-1">
                  Voir tout <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {sortedPatients.length === 0 ? (
                  <div className="py-12 text-center text-soft-gray text-sm">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    Aucun patient pour le moment
                  </div>
                ) : sortedPatients.map((patient) => (
                  <div key={patient.id} className="flex items-center gap-4 px-4 sm:px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    <Avatar photo={patient.photo} nom={patient.nom} prenom={patient.prenom} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-night-blue text-sm truncate">
                        {patient.prenom} {patient.nom}
                      </p>
                      <p className="text-xs text-soft-gray">{patient.service} · {formatTime(patient.dateArrivee)}</p>
                    </div>
                    <ManchesterBadge level={patient.manchesterLevel} />
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-semibold text-night-blue">{getWaitingTime(patient.dateArrivee)}</p>
                      <p className={`text-xs ${patient.statut === 'En cours' ? 'text-teal-600' : 'text-orange-500'}`}>
                        {patient.statut}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Alerts + Pre-triages */}
          <div className="space-y-4">
            {/* Pré-triages à distance */}
            {preTriages.length > 0 && (
              <Card padding={false}>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-night-blue text-sm flex items-center gap-2">
                      <Home className="w-4 h-4 text-teal-600" />
                      Pré-triages à distance
                    </h3>
                    <p className="text-xs text-soft-gray">{preTriages.length} en attente d'arrivée</p>
                  </div>
                  <span className="w-5 h-5 bg-teal-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {preTriages.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {preTriages.map((pt) => {
                    const colors = { 1: '#DC2626', 2: '#EA580C', 3: '#EAB308', 4: '#22C55E', 5: '#3B82F6' };
                    const color  = colors[pt.manchesterNiveau] || '#64748B';
                    return (
                      <div key={pt.codeSuivi} className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                            style={{ backgroundColor: color }}>
                            N{pt.manchesterNiveau}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-night-blue text-sm truncate">
                              {pt.prenom} {pt.nom}
                              {pt.age && <span className="text-soft-gray font-normal"> · {pt.age} ans</span>}
                            </p>
                            <p className="text-xs font-mono text-teal-700">{pt.codeSuivi}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => confirmerArrivee(pt.codeSuivi)}
                          disabled={confirmingCode === pt.codeSuivi}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-60 cursor-pointer"
                        >
                          {confirmingCode === pt.codeSuivi ? (
                            <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Confirmation…</>
                          ) : (
                            <><CheckCircle className="w-3.5 h-3.5" /> Confirmer l'arrivée</>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Notifications */}
            <Card padding={false}>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-night-blue text-sm">Alertes</h3>
                  <p className="text-xs text-soft-gray">{notifications.filter(n => !n.read).length} non lues</p>
                </div>
                <Bell className="w-4 h-4 text-soft-gray" />
              </div>
              <div className="divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-soft-gray text-sm text-xs">Aucune alerte</div>
                ) : notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 hover:bg-slate-50/50 transition-colors ${!notif.read ? 'bg-teal-50/20' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        notif.type === 'critical' ? 'bg-red-500 animate-pulse' :
                        notif.type === 'warning'  ? 'bg-orange-500' :
                        notif.type === 'success'  ? 'bg-green-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="text-xs text-night-blue leading-snug">{notif.message}</p>
                        <p className="text-xs text-soft-gray mt-1">{notif.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
