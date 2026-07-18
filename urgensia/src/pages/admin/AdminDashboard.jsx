import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  Users, Building, Shield, BarChart3, Activity,
  Plus, Edit, Trash2, CheckCircle, XCircle, Search, AlertTriangle,
  Settings, Bell, Lock, Save, Globe, Database, Key, X, User, Stethoscope,
  Copy, RefreshCw, Minus
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card, KPICard } from '../../components/common/Card';
import { Avatar } from '../../components/common/Avatar';
import { ProfileSettings } from '../../components/settings/ProfileSettings';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { getUtilisateurs, createUtilisateur, deleteUtilisateur, reinitialiserMotDePasse } from '../../services/utilisateurService';
import { getServices, createService, updateService, deleteService } from '../../services/serviceService';
import { getDashboardStats, getWeeklyStats, getJournalAudit, getAnalytics } from '../../services/statsService';
import { roleLabel } from '../../utils/helpers';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

/* ─── Modaux ──────────────────────────────────────────────────────────────── */
function ModalOverlay({ children, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="bg-white rounded-3xl shadow-large w-full max-w-lg border border-slate-100 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ModalHeader({ title, subtitle, icon: Icon, color, onClose }) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-black text-night-blue text-lg">{title}</h3>
          <p className="text-soft-gray text-xs">{subtitle}</p>
        </div>
      </div>
      <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-soft-gray hover:text-night-blue transition-colors cursor-pointer">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function FormField({ label, id, type = 'text', placeholder, value, onChange, required, options }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-soft-gray mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {options ? (
        <select id={id} value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-night-blue focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all cursor-pointer">
          <option value="">Sélectionner…</option>
          {options.map(o => {
            const val = typeof o === 'object' ? o.value : o;
            const lbl = typeof o === 'object' ? o.label : o;
            return <option key={val} value={val}>{lbl}</option>;
          })}
        </select>
      ) : (
        <input id={id} type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-night-blue focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all" />
      )}
    </div>
  );
}

/* ─── Modal : Nouvel utilisateur ──────────────────────────────────────────── */
function ModalNouvelUtilisateur({ onClose, onCreated }) {
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', role: '', service: '', telephone: '', motDePasse: '' });
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const field = key => ({ value: form[key], onChange: v => setForm(f => ({ ...f, [key]: v })) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.prenom || !form.nom || !form.email || !form.role) return;
    setLoading(true); setError(null);
    try {
      const created = await createUtilisateur({ ...form, motDePasse: form.motDePasse || 'Temp1234!' });
      setSuccess(true);
      onCreated(created);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Nouvel utilisateur" subtitle="Créer un compte pour un membre du personnel" icon={User} color="bg-slate-800" onClose={onClose} />
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <p className="text-red-600 text-xs bg-red-50 rounded-xl p-3">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Prénom" id="prenom" placeholder="Jean-Baptiste" required {...field('prenom')} />
          <FormField label="Nom"    id="nom"    placeholder="Fassinou"      required {...field('nom')} />
        </div>
        <FormField label="Adresse email" id="email" type="email" placeholder="j.fassinou@urgensia.bj" required {...field('email')} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Rôle" id="role" required {...field('role')} options={[
            { value: 'agent',   label: 'Infirmier d\'accueil-triage' },
            { value: 'medecin', label: 'Médecin' },
            { value: 'admin',   label: 'Administrateur' },
          ]} />
          <FormField label="Service" id="service" {...field('service')} options={['Urgences','Cardiologie','Neurologie','Pédiatrie','Chirurgie','Réanimation','Accueil','Administration']} />
        </div>
        <FormField label="Téléphone" id="telephone" placeholder="+229 97 00 00 00" {...field('telephone')} />
        <FormField label="Mot de passe temporaire" id="motDePasse" type="password" placeholder="Min. 8 caractères" {...field('motDePasse')} />
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs text-blue-700 font-medium">🔐 Un mot de passe temporaire sera envoyé à l'utilisateur.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-soft-gray hover:bg-slate-50 transition-colors cursor-pointer">Annuler</button>
          <button type="submit" disabled={loading} className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-60 ${success ? 'bg-green-600' : 'bg-slate-800 hover:bg-slate-900'}`}>
            {success ? '✓ Créé !' : loading ? '…' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

/* ─── Modal : Nouveau service ─────────────────────────────────────────────── */
function ModalNouveauService({ onClose, onCreated }) {
  const [form,    setForm]    = useState({ name: '', chef: '', capacity: '', description: '' });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const field = key => ({ value: form[key], onChange: v => setForm(f => ({ ...f, [key]: v })) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.chef || !form.capacity) return;
    setLoading(true); setError(null);
    try {
      const created = await createService({ ...form, capacity: parseInt(form.capacity, 10) });
      setSuccess(true);
      onCreated(created);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Nouveau service" subtitle="Ajouter un service hospitalier" icon={Building} color="bg-teal-700" onClose={onClose} />
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <p className="text-red-600 text-xs bg-red-50 rounded-xl p-3">{error}</p>}
        <FormField label="Nom du service"  id="name"     placeholder="Ophtalmologie" required {...field('name')} />
        <FormField label="Médecin chef"    id="chef"     placeholder="Dr. Adjovi"    required {...field('chef')} />
        <FormField label="Capacité (lits)" id="capacity" type="number" placeholder="15" required {...field('capacity')} />
        <div>
          <label className="block text-xs font-semibold text-soft-gray mb-1.5">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
            placeholder="Spécialités prises en charge…"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-night-blue focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-soft-gray hover:bg-slate-50 transition-colors cursor-pointer">Annuler</button>
          <button type="submit" disabled={loading} className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-60 ${success ? 'bg-green-600' : 'bg-teal-700 hover:bg-teal-800'}`}>
            {success ? '✓ Créé !' : loading ? '…' : 'Créer le service'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

/* ─── Vues ─────────────────────────────────────────────────────────────────── */
function VueDashboard({ stats, weeklyData, servicesData, usersCount, servicesCount, user }) {
  const allPatients = stats?.patients;
  const totalPatients = allPatients ? Object.values(allPatients).reduce((a, b) => a + parseInt(b || 0), 0) : 0;

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      {/* Welcome Banner */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 60%, #475569 100%)' }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-slate-400 text-sm mb-1">Administration centrale</p>
            <h2 className="text-2xl font-bold mb-1">{user?.prenom} {user?.nom}</h2>
            <p className="text-slate-400 text-sm">{user?.service} · URGENSIA v1.0</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-black text-white">{usersCount}</p>
              <p className="text-xs text-slate-400">Utilisateurs</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-black text-white">{servicesCount}</p>
              <p className="text-xs text-slate-400">Services</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total patients"      value={totalPatients} subtitle="Aujourd'hui"       icon={Users}         color="teal" />
        <KPICard title="Utilisateurs actifs" value={usersCount}    subtitle="Tous rôles"         icon={Activity}      color="blue" />
        <KPICard title="Services"            value={servicesCount} subtitle="En activité"        icon={Building}      color="green" />
        <KPICard title="Alertes système"     value={2}             subtitle="Nécessitent action" icon={AlertTriangle} color="red" />
      </motion.div>

      {/* Charts */}
      <motion.div variants={fadeUp} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <h3 className="font-semibold text-night-blue mb-5">Activité globale — 7 derniers jours</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#334155" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#334155" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="jour" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="patients" stroke="#334155" strokeWidth={2} fill="url(#colorAdmin)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <Card>
          <h3 className="font-semibold text-night-blue mb-4">Répartition services</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={servicesData} cx="50%" cy="50%" outerRadius={65} paddingAngle={2} dataKey="value">
                {servicesData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={v => [`${v}%`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {servicesData.slice(0, 4).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-soft-gray flex-1">{s.name}</span>
                <span className="text-xs font-bold text-night-blue">{s.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

/* ─── Modale : réinitialisation du mot de passe (admin) ──────────────────── */
function genererMotDePasse() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

function ModalResetPassword({ user, onClose }) {
  const [password, setPassword] = useState(genererMotDePasse);
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState(null);
  const [copied,   setCopied]   = useState(false);

  const copier = () => {
    navigator.clipboard?.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submit = async () => {
    if (password.trim().length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setSaving(true); setError(null);
    try {
      await reinitialiserMotDePasse(user.id, password.trim());
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erreur lors de la réinitialisation.');
    } finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.93, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Key className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-night-blue leading-tight">Réinitialiser le mot de passe</p>
            <p className="text-xs text-soft-gray truncate">{user.prenom} {user.nom} · {user.email}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-xl hover:bg-slate-100 text-soft-gray transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="font-bold text-night-blue">Mot de passe réinitialisé</p>
            <p className="text-sm text-soft-gray mt-1 mb-4">Communiquez ce mot de passe temporaire à l'utilisateur.</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <code className="flex-1 font-mono font-bold text-night-blue text-center tracking-wide">{password}</code>
              <button onClick={copier} title="Copier"
                className="p-2 rounded-lg hover:bg-white text-soft-gray hover:text-teal-700 transition-colors cursor-pointer">
                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={onClose} className="mt-5 w-full py-3 rounded-2xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 transition-colors cursor-pointer">
              Terminé
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-night-blue mb-1.5">Nouveau mot de passe temporaire</label>
              <div className="flex items-center gap-2">
                <input value={password} onChange={e => setPassword(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setPassword(genererMotDePasse())} title="Régénérer"
                  className="p-2.5 rounded-xl border border-slate-200 text-soft-gray hover:text-blue-700 hover:border-blue-300 transition-colors cursor-pointer">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button type="button" onClick={copier} title="Copier"
                  className="p-2.5 rounded-xl border border-slate-200 text-soft-gray hover:text-teal-700 hover:border-teal-300 transition-colors cursor-pointer">
                  {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-soft-gray mt-2">L'utilisateur pourra le changer après connexion. Minimum 6 caractères.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                Annuler
              </button>
              <button onClick={submit} disabled={saving}
                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer">
                {saving ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : <Key className="w-4 h-4" />}
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function VueUtilisateurs({ users, setUsers }) {
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const filtered = users.filter(u =>
    `${u.nom} ${u.prenom} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    try { await deleteUtilisateur(id); setUsers(prev => prev.filter(u => u.id !== id)); }
    catch (err) { console.error(err); }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      {showModal && (
        <ModalNouvelUtilisateur
          onClose={() => setShowModal(false)}
          onCreated={(u) => setUsers(prev => [...prev, u])}
        />
      )}
      {resetUser && (
        <ModalResetPassword user={resetUser} onClose={() => setResetUser(null)} />
      )}
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-black text-night-blue mb-1">Utilisateurs</h2>
        <p className="text-soft-gray text-sm">{users.length} comptes enregistrés</p>
      </motion.div>
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-soft-gray" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur…"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500" />
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 transition-colors cursor-pointer">
          <Plus className="w-4 h-4" /> Nouvel utilisateur
        </button>
      </motion.div>
      <motion.div variants={fadeUp}>
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide hidden sm:table-cell">Rôle</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide hidden md:table-cell">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide hidden lg:table-cell">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((user, i) => (
                  <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar photo={user.photo} nom={user.nom} prenom={user.prenom} size="md" />
                        <div>
                          <p className="font-semibold text-night-blue text-sm">{user.prenom} {user.nom}</p>
                          <p className="text-xs text-soft-gray">{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell"><span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-medium">{roleLabel(user.role)}</span></td>
                    <td className="px-4 py-4 hidden md:table-cell text-sm text-slate-600">{user.service}</td>
                    <td className="px-4 py-4 hidden lg:table-cell text-sm text-slate-600">{user.email}</td>
                    <td className="px-4 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold ${user.statut === 'Actif' ? 'text-green-600' : 'text-red-600'}`}>
                        {user.statut === 'Actif' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {user.statut}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setResetUser(user)} title="Réinitialiser le mot de passe"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-soft-gray hover:text-blue-700 transition-colors cursor-pointer">
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(user.id)} title="Supprimer"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-soft-gray hover:text-red-700 transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

/* ─── Modal : Modifier un service (infos + lits) ──────────────────────────── */
function ModalEditerService({ service, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:        service.name ?? '',
    chef:        service.chef ?? '',
    capacity:    service.capacity ?? 0,
    current:     service.current ?? 0,
    description: service.description ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const field = key => ({ value: form[key], onChange: v => setForm(f => ({ ...f, [key]: v })) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const capacity = parseInt(form.capacity, 10) || 0;
    const current  = parseInt(form.current, 10) || 0;
    if (!form.name.trim()) { setError('Le nom du service est requis.'); return; }
    if (capacity < 1)      { setError('La capacité doit être d\'au moins 1 lit.'); return; }
    if (current > capacity){ setError('Les lits occupés ne peuvent pas dépasser la capacité.'); return; }
    setLoading(true); setError(null);
    try {
      const updated = await updateService(service.id, { ...form, capacity, current });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Modifier le service" subtitle={service.name} icon={Building} color="bg-slate-800" onClose={onClose} />
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <p className="text-red-600 text-xs bg-red-50 rounded-xl p-3">{error}</p>}
        <FormField label="Nom du service" id="e-name" placeholder="Ophtalmologie" required {...field('name')} />
        <FormField label="Médecin chef"   id="e-chef" placeholder="Dr. Adjovi" {...field('chef')} />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Capacité (lits)" id="e-capacity" type="number" {...field('capacity')} />
          <FormField label="Lits occupés"    id="e-current"  type="number" {...field('current')} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-soft-gray mb-1.5">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
            placeholder="Spécialités prises en charge…"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-night-blue focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-soft-gray hover:bg-slate-50 transition-colors cursor-pointer">Annuler</button>
          <button type="submit" disabled={loading} className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 transition-colors disabled:opacity-60 cursor-pointer">
            {loading ? 'Enregistrement…' : <><Save className="w-4 h-4" /> Enregistrer</>}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

function VueServices({ services, setServices }) {
  const [showModal,   setShowModal]   = useState(false);
  const [editService, setEditService] = useState(null);

  const handleDelete = async (id) => {
    try { await deleteService(id); setServices(prev => prev.filter(s => s.id !== id)); }
    catch (err) { console.error(err); }
  };

  // Gestion rapide des lits (mise à jour optimiste)
  const adjustBeds = async (service, delta) => {
    const next = Math.max(0, Math.min(service.capacity ?? 0, (service.current ?? 0) + delta));
    if (next === service.current) return;
    setServices(prev => prev.map(s => s.id === service.id ? { ...s, current: next } : s));
    try {
      await updateService(service.id, { ...service, current: next });
    } catch (err) {
      console.error(err);
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, current: service.current } : s)); // revert
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      {showModal && (
        <ModalNouveauService
          onClose={() => setShowModal(false)}
          onCreated={(s) => setServices(prev => [...prev, s])}
        />
      )}
      {editService && (
        <ModalEditerService
          service={editService}
          onClose={() => setEditService(null)}
          onSaved={(s) => setServices(prev => prev.map(x => x.id === s.id ? { ...x, ...s } : x))}
        />
      )}
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black text-night-blue mb-1">Services</h2>
          <p className="text-soft-gray text-sm">{services.length} services hospitaliers</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-xl text-sm font-semibold hover:bg-teal-800 transition-colors cursor-pointer">
          <Plus className="w-4 h-4" /> Nouveau service
        </button>
      </motion.div>
      <motion.div variants={fadeUp} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => {
          const pct = service.capacity > 0 ? Math.round((service.current / service.capacity) * 100) : 0;
          const isCritical = pct > 80;
          return (
            <Card key={service.id} hover>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Building className="w-5 h-5 text-slate-700" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${isCritical ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {isCritical ? 'Saturé' : 'Actif'}
                  </span>
                  <button onClick={() => setEditService(service)} title="Modifier le service"
                    className="p-1 rounded-lg hover:bg-blue-50 text-soft-gray hover:text-blue-600 transition-colors cursor-pointer">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(service.id)} title="Désactiver le service"
                    className="p-1 rounded-lg hover:bg-red-50 text-soft-gray hover:text-red-600 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-night-blue mb-1">{service.name}</h3>
              <p className="text-xs text-soft-gray mb-4">{service.chef}</p>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-soft-gray">Occupation</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => adjustBeds(service, -1)} disabled={(service.current ?? 0) <= 0} title="Libérer un lit"
                    className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-soft-gray hover:text-teal-700 hover:border-teal-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-semibold text-night-blue tabular-nums text-center" style={{ minWidth: '60px' }}>{service.current}/{service.capacity} lits</span>
                  <button onClick={() => adjustBeds(service, 1)} disabled={(service.current ?? 0) >= (service.capacity ?? 0)} title="Occuper un lit"
                    className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-soft-gray hover:text-teal-700 hover:border-teal-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: isCritical ? '#DC2626' : '#0F766E' }} />
              </div>
              <p className="text-xs mt-1 text-right font-semibold" style={{ color: isCritical ? '#DC2626' : '#0F766E' }}>{pct}%</p>
            </Card>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

function VueStatistiques({ weeklyData, analytics }) {
  const a       = analytics || {};
  const attente = a.attenteParNiveau || [];
  const debit   = a.debitParHeure   || [];
  const reeval  = a.reevaluations   || { signales: 0, delaiDepasse: 0 };
  const glob    = a.global          || { aujourdHui: 0, traitesAujourdHui: 0, attenteMoyenneMin: 0 };

  const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`);

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-black text-night-blue mb-1">Statistiques</h2>
        <p className="text-soft-gray text-sm">Analyse de l'activité et des performances</p>
      </motion.div>

      {/* KPIs temps réel */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Attente moyenne"     value={fmtMin(glob.attenteMoyenneMin)} subtitle="Dernières 24 h"                         icon={Activity}      color="blue" />
        <KPICard title="Patients aujourd'hui" value={glob.aujourdHui}               subtitle={`${glob.traitesAujourdHui} pris en charge`} icon={Users}         color="teal" />
        <KPICard title="Réévaluations dues"  value={reeval.delaiDepasse}            subtitle={`${reeval.signales} signalée(s)`}        icon={AlertTriangle} color="red" />
        <KPICard title="Pic d'affluence"     value={a.picAffluence?.heure ?? '—'}   subtitle={a.picAffluence ? `${a.picAffluence.patients} patients` : 'Aucune donnée'} icon={BarChart3} color="green" />
      </motion.div>

      {/* Temps d'attente moyen par niveau Manchester */}
      <motion.div variants={fadeUp}>
        <Card>
          <h3 className="font-semibold text-night-blue mb-1">Temps d'attente moyen par niveau</h3>
          <p className="text-xs text-soft-gray mb-4">Minutes entre arrivée et prise en charge · dernières 24 h</p>
          {attente.length === 0 ? (
            <div className="py-12 text-center text-soft-gray text-sm">Aucune donnée sur la période</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attente} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}
                  formatter={(v) => [`${v} min`, 'Attente moyenne']}
                />
                <Bar dataKey="attenteMin" radius={[4, 4, 0, 0]} name="Attente (min)">
                  {attente.map((e, i) => <Cell key={i} fill={e.couleur || '#0F766E'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>

      {/* Affluence par heure (aujourd'hui) */}
      <motion.div variants={fadeUp}>
        <Card>
          <h3 className="font-semibold text-night-blue mb-1">Affluence par heure</h3>
          <p className="text-xs text-soft-gray mb-4">Arrivées de patients aujourd'hui</p>
          {debit.length === 0 ? (
            <div className="py-12 text-center text-soft-gray text-sm">Aucune arrivée enregistrée aujourd'hui</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={debit} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="affluence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F766E" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0F766E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="patients" stroke="#0F766E" strokeWidth={2} fill="url(#affluence)" name="Patients" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>

      {/* Activité de la semaine */}
      <motion.div variants={fadeUp}>
        <Card>
          <h3 className="font-semibold text-night-blue mb-4">Patients par jour (semaine)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }} />
              <Bar dataKey="patients"  fill="#0F766E" radius={[4, 4, 0, 0]} name="Patients" />
              <Bar dataKey="critiques" fill="#DC2626" radius={[4, 4, 0, 0]} name="Critiques" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function VueParametres() {
  return (
    <div>
      <div className="max-w-2xl mx-auto mb-2">
        <h2 className="text-2xl font-black text-night-blue mb-1">Paramètres</h2>
        <p className="text-soft-gray text-sm">Gérez votre compte administrateur</p>
      </div>
      <ProfileSettings accent="slate" />
    </div>
  );
}

/* ─── Vue : Sécurité (journal d'audit) ─────────────────────────────────────── */
function VueSecurite() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const data = await getJournalAudit(100, 0);
        if (actif) setLogs(data.logs || []);
      } catch {
        if (actif) setError('Impossible de charger le journal d\'audit.');
      } finally {
        if (actif) setLoading(false);
      }
    })();
    return () => { actif = false; };
  }, []);

  const total    = logs.length;
  const echecs   = logs.filter(l => l.statut === 'echec').length;
  const succes   = total - echecs;
  const derniere = logs[0]?.timestamp ? new Date(logs[0].timestamp) : null;

  const fmt = (d) => d
    ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-black text-night-blue mb-1">Sécurité &amp; journal d'audit</h2>
        <p className="text-soft-gray text-sm">Traçabilité des actions sensibles (connexions, créations, suppressions).</p>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Événements"        value={total}  subtitle="100 derniers"        icon={Shield}      color="blue" />
        <KPICard title="Actions réussies"  value={succes} subtitle="Opérations valides"   icon={CheckCircle} color="green" />
        <KPICard title="Échecs"            value={echecs} subtitle="Tentatives échouées"  icon={XCircle}     color="red" />
        <KPICard
          title="Dernière activité"
          value={derniere ? derniere.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
          subtitle={derniere ? derniere.toLocaleDateString('fr-FR') : 'Aucune'}
          icon={Activity}
          color="teal"
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card padding={false}>
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-night-blue">Journal d'audit</h3>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <svg className="animate-spin w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-600 flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-soft-gray text-sm">Aucun événement enregistré pour le moment.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3 hidden md:table-cell">Adresse IP</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(l.timestamp)}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-night-blue">{l.utilisateur_nom || 'Système / anonyme'}</p>
                        {l.utilisateur_email && <p className="text-xs text-soft-gray">{l.utilisateur_email}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{l.action}</td>
                      <td className="px-4 py-3 text-xs text-soft-gray font-mono hidden md:table-cell">{l.adresse_ip || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          l.statut === 'succes' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {l.statut === 'succes' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {l.statut === 'succes' ? 'Succès' : 'Échec'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}

/* ─── Composant principal ──────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user }    = useAuth();
  const { patients } = useApp();
  const location     = useLocation();
  const path         = location.pathname;

  const [users,        setUsers]        = useState([]);
  const [services,     setServices]     = useState([]);
  const [weeklyData,   setWeeklyData]   = useState([]);
  const [servicesData, setServicesData] = useState([]);
  const [stats,        setStats]        = useState(null);
  const [analytics,    setAnalytics]    = useState(null);
  const [loading,      setLoading]      = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [usersData, servicesRes, weekly, statsData, analyticsData] = await Promise.all([
        getUtilisateurs(),
        getServices(),
        getWeeklyStats(),
        getDashboardStats(),
        getAnalytics(),
      ]);
      setUsers(usersData);
      setServices(servicesRes);
      setWeeklyData(weekly);
      setStats(statsData);
      setAnalytics(analyticsData);

      // Générer les données de répartition des services pour PieChart
      const colors = ['#0F766E','#3B82F6','#EAB308','#DC2626','#8B5CF6','#14B8A6'];
      const total  = servicesRes.reduce((sum, s) => sum + (s.current || 0), 0) || 1;
      setServicesData(servicesRes.slice(0, 6).map((s, i) => ({
        name:  s.name,
        value: Math.round(((s.current || 0) / total) * 100),
        color: colors[i] || '#64748B',
      })));
    } catch (err) {
      console.error('Erreur chargement admin:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Rafraîchissement périodique des statistiques (60 s)
    const id = setInterval(loadData, 60000);
    return () => clearInterval(id);
  }, [loadData]);

  const getTitle = () => {
    if (path.includes('/utilisateurs')) return 'Utilisateurs';
    if (path.includes('/services'))     return 'Services';
    if (path.includes('/statistiques')) return 'Statistiques';
    if (path.includes('/securite'))     return 'Sécurité';
    if (path.includes('/parametres'))  return 'Paramètres';
    return 'Administration';
  };

  if (loading) {
    return (
      <DashboardLayout role="admin" user={user} title={getTitle()}>
        <div className="flex items-center justify-center h-64">
          <svg className="animate-spin w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </DashboardLayout>
    );
  }

  const renderView = () => {
    if (path.includes('/utilisateurs')) return <VueUtilisateurs users={users} setUsers={setUsers} />;
    if (path.includes('/services'))     return <VueServices services={services} setServices={setServices} />;
    if (path.includes('/statistiques')) return <VueStatistiques stats={stats} weeklyData={weeklyData} analytics={analytics} />;
    if (path.includes('/securite'))     return <VueSecurite />;
    if (path.includes('/parametres'))  return <VueParametres />;
    return <VueDashboard stats={stats} weeklyData={weeklyData} servicesData={servicesData} usersCount={users.length} servicesCount={services.length} user={user} />;
  };

  return (
    <DashboardLayout role="admin" user={user} title={getTitle()}>
      {renderView()}
    </DashboardLayout>
  );
}
