import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  Users, AlertTriangle, Clock, CheckCircle,
  Activity, ChevronRight, Stethoscope, TrendingUp,
  Settings, User, Bell, Shield, Save, Download,
  X, RefreshCw, LogOut, Heart, Thermometer, Wind,
  FileText, Phone, MapPin,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card, KPICard } from '../../components/common/Card';
import { ManchesterBadge } from '../../components/common/ManchesterBadge';
import { Avatar } from '../../components/common/Avatar';
import { ProfileSettings } from '../../components/settings/ProfileSettings';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { sortPatientsByPriority, getWaitingTime, formatTime } from '../../utils/helpers';
import { getPatients, changePatientStatus } from '../../services/patientService';
import { getWeeklyStats, getAnalytics, getServicesStats, telechargerRapportJournalier, telechargerResumePrisEnCharge } from '../../services/statsService';
import { AnalyticsSection } from '../../components/dashboard/AnalyticsSection';
import { onSocketEvent } from '../../services/socketService';
import { normalizePatient } from '../../utils/normalizeApi';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

// ─── Mapping statut backend → affichage ──────────────────────────────────────
const statutLabel = {
  en_attente:    'En attente',
  en_cours:      'En cours',
  pris_en_charge:'Pris en charge',
  sorti:         'Sorti',
};

// ─── Modale de consultation ───────────────────────────────────────────────────
function ConsultationModal({ patient, onClose, onStatusChange }) {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const handleAction = async (statut) => {
    setSaving(true);
    setError(null);
    try {
      await onStatusChange(patient.id, statut);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const manchesterColors = {
    1: '#DC2626', 2: '#EA580C', 3: '#EAB308', 4: '#22C55E', 5: '#3B82F6',
  };
  const color = manchesterColors[patient.manchesterLevel] ?? '#64748B';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: `3px solid ${color}20` }}>
          <div className="flex items-center gap-3">
            <Avatar photo={patient.photo} nom={patient.nom} prenom={patient.prenom} size="lg" />
            <div>
              <p className="font-black text-night-blue text-lg leading-none">{patient.prenom} {patient.nom}</p>
              <p className="text-xs text-soft-gray mt-0.5">{patient.age} ans · {patient.sexe}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <ManchesterBadge level={patient.manchesterLevel} size="xs" />
                <span className="text-xs text-soft-gray">· {patient.service}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-soft-gray transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Constantes vitales */}
          {(patient.temperature || patient.frequenceCardiaque || patient.saturationOxygene) && (
            <div>
              <p className="text-xs font-bold text-soft-gray uppercase tracking-wide mb-2">Constantes vitales</p>
              <div className="grid grid-cols-3 gap-3">
                {patient.temperature && (
                  <div className="bg-orange-50 rounded-2xl p-3 text-center">
                    <Thermometer className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                    <p className="text-lg font-black text-orange-700">{patient.temperature}°</p>
                    <p className="text-[10px] text-orange-500">Température</p>
                  </div>
                )}
                {patient.frequenceCardiaque && (
                  <div className="bg-red-50 rounded-2xl p-3 text-center">
                    <Heart className="w-4 h-4 text-red-500 mx-auto mb-1" />
                    <p className="text-lg font-black text-red-700">{patient.frequenceCardiaque}</p>
                    <p className="text-[10px] text-red-500">bpm</p>
                  </div>
                )}
                {patient.saturationOxygene && (
                  <div className="bg-blue-50 rounded-2xl p-3 text-center">
                    <Wind className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-lg font-black text-blue-700">{patient.saturationOxygene}%</p>
                    <p className="text-[10px] text-blue-500">SpO₂</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Symptômes */}
          {patient.symptomes?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-soft-gray uppercase tracking-wide mb-2">Symptômes</p>
              <div className="flex flex-wrap gap-1.5">
                {patient.symptomes.map(s => (
                  <span key={s} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Résumé clinique */}
          {patient.resumeClinique && (
            <div>
              <p className="text-xs font-bold text-soft-gray uppercase tracking-wide mb-2">Résumé clinique</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5 leading-relaxed">{patient.resumeClinique}</p>
            </div>
          )}

          {/* Temps d'attente */}
          <div className="flex items-center gap-2 text-sm text-soft-gray">
            <Clock className="w-4 h-4" />
            <span>En attente depuis <strong className="text-night-blue">{getWaitingTime(patient.dateArrivee)}</strong></span>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          {patient.statut !== 'en_cours' && patient.statut !== 'En cours' && (
            <button
              onClick={() => handleAction('en_cours')}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Stethoscope className="w-4 h-4" />
              {saving ? 'Mise à jour…' : 'Prendre en charge maintenant'}
            </button>
          )}
          {(patient.statut === 'en_cours' || patient.statut === 'En cours') && (
            <button
              onClick={() => handleAction('pris_en_charge')}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white rounded-2xl font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              {saving ? 'Mise à jour…' : 'Marquer comme pris en charge'}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Vue : Tableau de bord ──────────────────────────────────────────── */
function VueDashboard({ patients, weeklyStats, servicesStats, analytics, servicesOcc = [], currentUser, onConsulter }) {
  const [showTermines, setShowTermines] = useState(false); // terminés masqués par défaut

  // Patients encore actifs dans la file vs déjà pris en charge / sortis
  const STATUTS_TERMINES = ['pris_en_charge', 'sorti'];
  const statNorm = (s) => (s ?? '').toLowerCase().replace(/ /g, '_');
  const activePatients   = patients.filter(p => !STATUTS_TERMINES.includes(statNorm(p.statut)));
  const terminesPatients = patients.filter(p =>  STATUTS_TERMINES.includes(statNorm(p.statut)));
  const sorted   = sortPatientsByPriority(activePatients);
  const critical = activePatients.filter(p => p.manchesterLevel <= 2);
  const myPatients = sorted.slice(0, 6);

  // Liste « Patients à prendre en charge » : actifs, + terminés si l'option est activée
  const listePatients = showTermines
    ? [...sorted, ...sortPatientsByPriority(terminesPatients)]
    : myPatients;

  const [exportLoading, setExportLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [exportError,   setExportError]   = useState(null);

  const handleExportPDF = async () => {
    setExportLoading(true);
    setExportError(null);
    try {
      await telechargerRapportJournalier();
    } catch {
      setExportError('Impossible de générer le rapport. Réessayez.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportResume = async () => {
    setResumeLoading(true);
    setExportError(null);
    try {
      await telechargerResumePrisEnCharge();
    } catch {
      setExportError('Impossible de générer le résumé des prises en charge. Réessayez.');
    } finally {
      setResumeLoading(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">

      {/* Welcome */}
      <motion.div
        variants={fadeUp}
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #3B82F6 100%)' }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-200 text-sm mb-1">Bonjour,</p>
            <h2 className="text-2xl font-bold mb-1">{currentUser?.prenom} {currentUser?.nom}</h2>
            <p className="text-blue-200 text-sm">{currentUser?.service} · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {critical.length > 0 && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2">
                <AlertTriangle className="w-4 h-4 text-red-300 animate-pulse" />
                <span className="text-white text-sm font-semibold">{critical.length} cas critique{critical.length > 1 ? 's' : ''}</span>
              </div>
            )}
            <button
              onClick={handleExportResume}
              disabled={resumeLoading}
              title="PDF détaillé : une fiche clinique par patient pris en charge aujourd'hui"
              className="flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              <FileText className={`w-4 h-4 ${resumeLoading ? 'animate-pulse' : ''}`} />
              {resumeLoading ? 'Génération…' : 'Résumé prises en charge'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exportLoading}
              title="Rapport de synthèse de la journée (tous patients)"
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className={`w-4 h-4 ${exportLoading ? 'animate-bounce' : ''}`} />
              {exportLoading ? 'Génération…' : 'Rapport PDF'}
            </button>
          </div>
        </div>
        {exportError && <p className="relative mt-2 text-red-300 text-xs">{exportError}</p>}
      </motion.div>

      {/* KPIs */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="File active"    value={activePatients.length}                                                         subtitle="Patients en attente"  icon={Users}        color="blue" />
        <KPICard title="Cas critiques"  value={critical.length}                                                               subtitle="À prendre en charge"  icon={AlertTriangle} color="red" />
        <KPICard title="En cours"       value={activePatients.filter(p => { const s=(p.statut??'').toLowerCase().replace(/ /g,'_'); return s==='en_cours'; }).length} subtitle="Consultations" icon={Activity} color="teal" />
        <KPICard title="Terminés"       value={patients.filter(p => { const s=(p.statut??'').toLowerCase().replace(/ /g,'_'); return s==='pris_en_charge'||s==='sorti'; }).length} subtitle="Aujourd'hui" icon={CheckCircle} color="green" />
      </motion.div>

      {/* Critical alerts */}
      {critical.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border-red-200 bg-red-50/30">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-red-700">Alertes critiques — Action immédiate requise</h3>
            </div>
            <div className="space-y-3">
              {critical.map(patient => (
                <div key={patient.id} className="flex items-center gap-4 bg-white rounded-xl p-4 border border-red-100 hover:shadow-soft transition-shadow">
                  <div className="relative">
                    <Avatar photo={patient.photo} nom={patient.nom} prenom={patient.prenom} size="md" />
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-night-blue">{patient.prenom} {patient.nom}</p>
                      <ManchesterBadge level={patient.manchesterLevel} size="xs" />
                    </div>
                    <p className="text-xs text-soft-gray">{patient.symptomes?.join(' · ')}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-red-600">{getWaitingTime(patient.dateArrivee)}</p>
                    <p className="text-xs text-soft-gray">d'attente</p>
                  </div>
                  <button
                    onClick={() => onConsulter(patient)}
                    className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors flex-shrink-0 cursor-pointer"
                  >
                    <Stethoscope className="w-3 h-3" />
                    Prendre en charge
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Charts */}
      <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-night-blue">Activité hebdomadaire</h3>
              <p className="text-xs text-soft-gray">Patients et cas critiques</p>
            </div>
            <TrendingUp className="w-4 h-4 text-soft-gray" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyStats} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }} />
              <Bar dataKey="patients" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Patients" />
              <Bar dataKey="critiques" fill="#DC2626" radius={[4, 4, 0, 0]} name="Critiques" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div className="mb-5">
            <h3 className="font-semibold text-night-blue">Par service</h3>
            <p className="text-xs text-soft-gray">Distribution des orientations</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={servicesStats} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {servicesStats.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {servicesStats.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-soft-gray truncate">{s.name}</span>
                <span className="text-xs font-semibold text-night-blue ml-auto">{s.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Statistiques détaillées (temps réel) */}
      <motion.div variants={fadeUp}>
        <AnalyticsSection analytics={analytics} services={servicesOcc} accent="blue" />
      </motion.div>

      {/* Patients list */}
      <motion.div variants={fadeUp}>
        <Card padding={false}>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-night-blue">Patients à prendre en charge</h3>
              <p className="text-xs text-soft-gray">Triés par priorité</p>
            </div>
            <button
              onClick={() => setShowTermines(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showTermines
                  ? 'bg-slate-600 text-white border-slate-600'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {showTermines ? 'Masquer terminés' : `Voir terminés (${terminesPatients.length})`}
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {listePatients.map((patient, i) => {
              const colors = { 1: '#DC2626', 2: '#EA580C', 3: '#EAB308', 4: '#22C55E', 5: '#3B82F6' };
              const sn = statNorm(patient.statut);
              const isTermine = STATUTS_TERMINES.includes(sn);
              return (
                <div key={patient.id} className={`flex items-center gap-4 px-4 sm:px-6 py-4 transition-colors ${isTermine ? 'opacity-60 bg-slate-50/60' : 'hover:bg-slate-50/50'}`}>
                  <span className="text-xs text-soft-gray font-mono w-4 text-center">{i + 1}</span>
                  <Avatar photo={patient.photo} nom={patient.nom} prenom={patient.prenom} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-night-blue text-sm">{patient.prenom} {patient.nom}</p>
                    <p className="text-xs text-soft-gray">{patient.age} ans · {patient.sexe} · {patient.service}</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <ManchesterBadge level={patient.manchesterLevel} size="xs" />
                    <span className="text-xs text-soft-gray">{getWaitingTime(patient.dateArrivee)}</span>
                  </div>
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: colors[patient.manchesterLevel] }} />
                  {isTermine ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex-shrink-0">
                      {sn === 'sorti' ? 'Sorti' : 'Pris en charge'}
                    </span>
                  ) : (
                    <button
                      onClick={() => onConsulter(patient)}
                      className="p-2 rounded-xl hover:bg-teal-50 text-teal-700 transition-colors flex-shrink-0 cursor-pointer"
                      title="Consulter"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
            {listePatients.length === 0 && (
              <div className="py-12 text-center text-soft-gray text-sm">Aucun patient à afficher</div>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

/* ─── Vue : Mes patients ────────────────────────────────────── */
function VueMesPatients({ patients, onConsulter }) {
  const [search,       setSearch]       = useState('');
  const [filter,       setFilter]       = useState('tous');
  const [showTermines, setShowTermines] = useState(false);

  const statNorm   = (s) => (s ?? '').toLowerCase().replace(/ /g, '_');
  const isTermine  = (p) => ['pris_en_charge','sorti'].includes(statNorm(p.statut));
  const labelStatut = (s) => {
    const n = statNorm(s);
    if (n === 'en_cours')        return 'En cours';
    if (n === 'pris_en_charge')  return 'Pris en charge';
    if (n === 'sorti')           return 'Sorti';
    return 'En attente';
  };

  const sorted   = sortPatientsByPriority(patients);
  const actifs   = sorted.filter(p => !isTermine(p));
  const termines = sorted.filter(p =>  isTermine(p));

  const filteredActifs = actifs.filter(p => {
    const matchSearch = `${p.prenom} ${p.nom} ${p.service}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'tous' ||
      (filter === 'en_attente' && statNorm(p.statut) === 'en_attente') ||
      (filter === 'en_cours'   && statNorm(p.statut) === 'en_cours');
    return matchSearch && matchFilter;
  });

  const PatientRow = ({ patient, faded }) => {
    const sn  = statNorm(patient.statut);
    const lbl = labelStatut(patient.statut);
    const colors = { 1:'#DC2626', 2:'#EA580C', 3:'#EAB308', 4:'#22C55E', 5:'#3B82F6' };
    return (
      <div className={`flex items-center gap-4 px-6 py-4 transition-colors ${
        faded ? 'opacity-50 bg-slate-50/60' : 'hover:bg-slate-50/50'
      }`}>
        <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: colors[patient.manchesterLevel] }} />
        <Avatar photo={patient.photo} nom={patient.nom} prenom={patient.prenom} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-night-blue">{patient.prenom} {patient.nom}</p>
          <p className="text-xs text-soft-gray">{patient.age} ans · {patient.sexe}</p>
          <p className="text-xs text-soft-gray">{patient.symptomes?.join(', ')}</p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-xs text-soft-gray">{patient.service}</p>
          <p className="text-xs font-medium text-night-blue mt-0.5">{formatTime(patient.dateArrivee)}</p>
        </div>
        <ManchesterBadge level={patient.manchesterLevel} size="sm" />
        <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
          sn === 'en_cours'       ? 'bg-teal-50  text-teal-700'  :
          sn === 'pris_en_charge' ? 'bg-green-50 text-green-700' :
          sn === 'sorti'          ? 'bg-slate-100 text-slate-400' :
          'bg-orange-50 text-orange-600'
        }`}>{lbl}</span>
        {!faded && (
          <button
            onClick={() => onConsulter(patient)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Stethoscope className="w-3 h-3" />
            {sn === 'en_cours' ? 'Terminer' : 'Consulter'}
          </button>
        )}
      </div>
    );
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-black text-night-blue mb-1">Mes patients</h2>
        <p className="text-soft-gray text-sm">
          <span className="font-semibold text-night-blue">{actifs.length}</span> en file d'attente
          {termines.length > 0 && <span className="text-slate-400"> · {termines.length} terminé{termines.length > 1 ? 's' : ''} aujourd'hui</span>}
        </p>
      </motion.div>

      {/* Barre de filtres */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher un patient…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-night-blue placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
        <div className="flex gap-2">
          {[
            { val: 'tous',       label: 'Tous' },
            { val: 'en_attente', label: 'En attente' },
            { val: 'en_cours',   label: 'En cours' },
          ].map(({ val, label }) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filter === val ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-soft-gray hover:text-night-blue'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ─── Section ACTIVE ─── */}
      <motion.div variants={fadeUp}>
        <Card padding={false}>
          {filteredActifs.length === 0 ? (
            <div className="py-16 text-center text-soft-gray">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun patient actif en file</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredActifs.map(p => <PatientRow key={p.id} patient={p} faded={false} />)}
            </div>
          )}
        </Card>
      </motion.div>

      {/* ─── Section TERMINÉS ─── */}
      {termines.length > 0 && (
        <motion.div variants={fadeUp}>
          {/* En-tête cliquable */}
          <button
            onClick={() => setShowTermines(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-100 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer mb-3"
          >
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Terminés aujourd'hui</span>
            <span className="ml-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{termines.length}</span>
            <motion.span
              animate={{ rotate: showTermines ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="ml-auto text-slate-400"
            >
              ▼
            </motion.span>
          </button>

          <AnimatePresence>
            {showTermines && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <Card padding={false}>
                  <div className="divide-y divide-slate-50">
                    {termines.map(p => <PatientRow key={p.id} patient={p} faded={true} />)}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── Vue : Cas prioritaires ────────────────────────────────────── */
function VueCasPrioritaires({ patients, onConsulter }) {
  const [showTermines, setShowTermines] = useState(false);

  const statNorm  = (s) => (s ?? '').toLowerCase().replace(/ /g, '_');
  const isTermine = (p) => ['pris_en_charge','sorti'].includes(statNorm(p.statut));

  const actifs   = patients.filter(p => !isTermine(p));
  const termines = patients.filter(p =>  isTermine(p));

  const critical = actifs.filter(p => p.manchesterLevel <= 2);
  const urgent   = actifs.filter(p => p.manchesterLevel === 3);
  const standard = actifs.filter(p => p.manchesterLevel >= 4);

  const Group = ({ title, color, bgColor, items }) => (
    <motion.div variants={fadeUp}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="font-bold text-night-blue">{title}</h3>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: bgColor, color }}>
          {items.length} patient{items.length > 1 ? 's' : ''}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl py-8 text-center text-soft-gray text-sm">
          Aucun patient actif dans ce groupe
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(patient => (
            <div key={patient.id}
              className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl px-5 py-4 hover:shadow-soft transition-all"
              style={{ borderLeft: `4px solid ${color}` }}
            >
              <Avatar photo={patient.photo} nom={patient.nom} prenom={patient.prenom} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-night-blue">{patient.prenom} {patient.nom}</p>
                  <ManchesterBadge level={patient.manchesterLevel} size="xs" showLabel={false} />
                </div>
                <p className="text-xs text-soft-gray">{patient.symptomes?.join(' · ')}</p>
                <div className="flex items-center gap-3 mt-1">
                  {patient.temperature      && <span className="text-xs text-soft-gray">🌡 {patient.temperature}°C</span>}
                  {patient.frequenceCardiaque && <span className="text-xs text-soft-gray">❤️ {patient.frequenceCardiaque} bpm</span>}
                  {patient.saturationOxygene  && <span className="text-xs text-soft-gray">💨 SpO₂ {patient.saturationOxygene}%</span>}
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold" style={{ color }}>{getWaitingTime(patient.dateArrivee)}</p>
                <p className="text-xs text-soft-gray">d'attente</p>
              </div>
              <button
                onClick={() => onConsulter(patient)}
                className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                style={{ backgroundColor: color }}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Prendre en charge
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-8">
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-black text-night-blue mb-1">Cas prioritaires</h2>
        <p className="text-soft-gray text-sm">
          <span className="font-semibold text-night-blue">{actifs.length}</span> patients actifs
          {termines.length > 0 && <span className="text-slate-400"> · {termines.length} terminé{termines.length > 1 ? 's' : ''}</span>}
        </p>
      </motion.div>

      <Group title="Critiques & Très urgents" color="#DC2626" bgColor="#FEE2E2" items={critical} />
      <Group title="Urgents"                  color="#EAB308" bgColor="#FEF9C3" items={urgent} />
      <Group title="Standard & Non urgents"   color="#22C55E" bgColor="#DCFCE7" items={standard} />

      {/* ─── Section TERMINÉS (collapsible) ─── */}
      {termines.length > 0 && (
        <motion.div variants={fadeUp}>
          <button
            onClick={() => setShowTermines(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-100 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer mb-3"
          >
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Patients terminés aujourd'hui</span>
            <span className="ml-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{termines.length}</span>
            <motion.span animate={{ rotate: showTermines ? 180 : 0 }} transition={{ duration: 0.2 }} className="ml-auto text-slate-400">
              ▼
            </motion.span>
          </button>

          <AnimatePresence>
            {showTermines && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden space-y-2"
              >
                {termines.map(patient => (
                  <div key={patient.id}
                    className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 opacity-60"
                  >
                    <Avatar photo={patient.photo} nom={patient.nom} prenom={patient.prenom} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-600">{patient.prenom} {patient.nom}</p>
                      <p className="text-xs text-slate-400">{patient.symptomes?.join(' · ')}</p>
                    </div>
                    <ManchesterBadge level={patient.manchesterLevel} size="xs" showLabel={false} />
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                      {statNorm(patient.statut) === 'sorti' ? 'Sorti' : 'Pris en charge'}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── Vue : Paramètres ───────────────────────────────────────────────── */
function VueParametres() {
  return (
    <div>
      <h2 className="text-2xl font-black text-night-blue mb-6">Paramètres</h2>
      <ProfileSettings accent="blue" />
    </div>
  );
}

/* ─── Composant principal ────────────────────────────────────────────── */
export default function DoctorDashboard() {
  const { patients, setPatients } = useApp();
  const { user: currentUser }     = useAuth();
  const location  = useLocation();
  const path      = location.pathname;

  const [weeklyStats,    setWeeklyStats]    = useState([]);
  const [servicesStats,  setServicesStats]  = useState([]);
  const [analytics,      setAnalytics]      = useState(null);
  const [servicesOcc,    setServicesOcc]    = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [consultPatient, setConsultPatient] = useState(null); // modale consultation

  const loadData = useCallback(async () => {
    // Patients = donnée critique pour le tri / la prise en charge
    try {
      const pats = await getPatients();
      setPatients(pats);

      const colors = ['#3B82F6','#0F766E','#EAB308','#DC2626','#8B5CF6','#14B8A6'];
      const services = {};
      pats.forEach(p => { if (p.service) services[p.service] = (services[p.service] || 0) + 1; });
      const total = pats.length || 1;
      setServicesStats(Object.entries(services).map(([name, count], i) => ({
        name, value: Math.round((count / total) * 100), color: colors[i % colors.length],
      })));
    } catch (err) {
      console.error('Erreur chargement patients (médecin):', err);
    }
    // Stats : dégradation gracieuse — une route en échec ne casse pas le reste
    const [weeklyRes, analyticsRes, servicesRes] = await Promise.allSettled([
      getWeeklyStats(),
      getAnalytics(),
      getServicesStats(),
    ]);
    if (weeklyRes.status    === 'fulfilled') setWeeklyStats(weeklyRes.value);
    if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
    if (servicesRes.status  === 'fulfilled') setServicesOcc(servicesRes.value);
    setLoading(false);
  }, [setPatients]);

  useEffect(() => {
    loadData();
    const offNew    = onSocketEvent('patient:new', (data) => {
      setPatients(prev => prev.find(p => p.id === data.id) ? prev : [normalizePatient(data), ...prev]);
    });
    const offStatus = onSocketEvent('patient:status_changed', ({ patientId, nouveauStatut }) => {
      setPatients(prev => prev.map(p =>
        p.id === patientId
          ? { ...p, statut: nouveauStatut }
          : p
      ));
    });
    // Rafraîchissement périodique des statistiques (60 s) — garde les indicateurs à jour
    const statsInterval = setInterval(loadData, 60000);

    return () => { offNew(); offStatus(); clearInterval(statsInterval); };
  }, [loadData, setPatients]);

  // Changer le statut d'un patient
  const handleStatusChange = useCallback(async (patientId, statut) => {
    const updated = await changePatientStatus(patientId, statut);
    setPatients(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated, statut } : p));
  }, [setPatients]);

  const getTitle = () => {
    if (path.includes('/patients'))     return 'Mes patients';
    if (path.includes('/prioritaires')) return 'Cas prioritaires';
    if (path.includes('/parametres'))   return 'Paramètres';
    return 'Tableau de bord médecin';
  };

  if (loading) {
    return (
      <DashboardLayout role="medecin" user={currentUser} title={getTitle()}>
        <div className="flex items-center justify-center h-64">
          <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </DashboardLayout>
    );
  }

  const renderView = () => {
    if (path.includes('/patients'))     return <VueMesPatients     patients={patients} onConsulter={setConsultPatient} />;
    if (path.includes('/prioritaires')) return <VueCasPrioritaires patients={patients} onConsulter={setConsultPatient} />;
    if (path.includes('/parametres'))   return <VueParametres />;
    return <VueDashboard
      patients={patients}
      weeklyStats={weeklyStats}
      servicesStats={servicesStats}
      analytics={analytics}
      servicesOcc={servicesOcc}
      currentUser={currentUser}
      onConsulter={setConsultPatient}
    />;
  };

  return (
    <DashboardLayout role="medecin" user={currentUser} title={getTitle()}>
      {renderView()}

      {/* Modale de consultation */}
      <AnimatePresence>
        {consultPatient && (
          <ConsultationModal
            patient={consultPatient}
            onClose={() => setConsultPatient(null)}
            onStatusChange={handleStatusChange}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
