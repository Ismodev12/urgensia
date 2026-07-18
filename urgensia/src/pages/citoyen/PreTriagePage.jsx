import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, ArrowLeft, ArrowRight, CheckCircle,
  User, Thermometer, AlertTriangle, Copy, ExternalLink,
  Heart, Stethoscope, Clock, Navigation
} from 'lucide-react';
import { soumettrePreTriage } from '../../services/preTriageService';

// ─── Données symptômes ────────────────────────────────────────────────────────

const SYMPTOMES_CRITIQUES = [
  { key: 'douleurThoracique',      label: 'Douleur thoracique',      emoji: '💔', desc: 'Douleur dans la poitrine' },
  { key: 'difficultéRespiratoire', label: 'Difficulté respiratoire', emoji: '😮‍💨', desc: 'Mal à respirer, essoufflement' },
  { key: 'hemorragie',             label: 'Hémorragie',              emoji: '🩸', desc: 'Saignement important' },
  { key: 'perteConnaissance',      label: 'Perte de connaissance',   emoji: '😵', desc: 'Évanouissement, perte de conscience' },
  { key: 'convulsions',            label: 'Convulsions',             emoji: '⚡', desc: 'Crises, tremblements involontaires' },
  { key: 'traumatisme',            label: 'Traumatisme',             emoji: '🤕', desc: 'Choc, blessure physique grave' },
];

const SYMPTOMES_MODERES = [
  { key: 'fievre',       label: 'Fièvre',         emoji: '🌡️', desc: 'Température élevée, frissons' },
  { key: 'vomissements', label: 'Vomissements',   emoji: '🤢', desc: 'Nausées, vomissements répétés' },
  { key: 'malaise',      label: 'Malaise général', emoji: '😰', desc: 'Faiblesse, sensation de malaise' },
  { key: 'brulures',     label: 'Brûlures',       emoji: '🔥', desc: 'Brûlures cutanées' },
  { key: 'cephalees',    label: 'Céphalées',      emoji: '🤯', desc: 'Maux de tête intenses' },
  { key: 'diarrhee',     label: 'Diarrhée',       emoji: '🤒', desc: 'Diarrhées fréquentes' },
];

const NIVEAUX_COLORS = {
  1: { couleur: '#DC2626', bg: '#FEE2E2', border: '#FECACA', label: 'CRITIQUE' },
  2: { couleur: '#EA580C', bg: '#FFEDD5', border: '#FED7AA', label: 'TRÈS URGENT' },
  3: { couleur: '#EAB308', bg: '#FEF9C3', border: '#FEF08A', label: 'URGENT' },
  4: { couleur: '#22C55E', bg: '#DCFCE7', border: '#BBF7D0', label: 'STANDARD' },
  5: { couleur: '#3B82F6', bg: '#DBEAFE', border: '#BFDBFE', label: 'NON URGENT' },
};

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeSlide = {
  hidden:  { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35 } },
  exit:    { opacity: 0, x: -40, transition: { duration: 0.25 } },
};

// ─── Composant case à cocher symptôme ────────────────────────────────────────
function SymptomeCard({ item, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer group ${
        checked
          ? 'border-teal-500 bg-teal-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{item.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${checked ? 'text-teal-800' : 'text-slate-700'}`}>
            {item.label}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
          checked ? 'bg-teal-500 border-teal-500' : 'border-slate-300 group-hover:border-teal-400'
        }`}>
          {checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
        </div>
      </div>
    </button>
  );
}

// ─── Étape 1 : Identité ───────────────────────────────────────────────────────
function EtapeIdentite({ form, setForm, onNext }) {
  return (
    <motion.div key="etape1" variants={fadeSlide} initial="hidden" animate="visible" exit="exit"
      className="space-y-6">
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <User className="w-7 h-7 text-teal-700" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Vos informations</h2>
        <p className="text-sm text-slate-500 mt-1">Ces informations sont optionnelles mais nous aident à vous identifier</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { label: 'Prénom', key: 'prenom', placeholder: 'Jean-Baptiste', type: 'text' },
          { label: 'Nom',    key: 'nom',    placeholder: 'Fassinou',     type: 'text' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" />
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Âge</label>
          <input type="number" placeholder="35" min="0" max="120" value={form.age}
            onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sexe</label>
          <select value={form.sexe} onChange={e => setForm(p => ({ ...p, sexe: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer">
            <option value="">Sélectionner…</option>
            <option>Homme</option>
            <option>Femme</option>
            <option>Autre</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Téléphone (optionnel)</label>
        <input type="tel" placeholder="+229 97 00 00 00" value={form.telephone}
          onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button"
          onClick={() => { setForm(p => ({ ...p, prenom: '', nom: '', age: '', sexe: '', telephone: '' })); onNext(); }}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer">
          Continuer anonymement
        </button>
        <button type="button" onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 transition-colors cursor-pointer">
          Continuer <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Étape 2 : Symptômes ──────────────────────────────────────────────────────
function EtapeSymptomes({ form, setForm, onNext, onBack, loading }) {
  const toggle = (key) => setForm(p => ({ ...p, [key]: !p[key] }));
  const nbSymptomes = [...SYMPTOMES_CRITIQUES, ...SYMPTOMES_MODERES].filter(s => form[s.key]).length;

  return (
    <motion.div key="etape2" variants={fadeSlide} initial="hidden" animate="visible" exit="exit"
      className="space-y-6">
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Stethoscope className="w-7 h-7 text-red-600" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Vos symptômes</h2>
        <p className="text-sm text-slate-500 mt-1">Cochez tous les symptômes que vous ressentez</p>
        {nbSymptomes > 0 && (
          <span className="inline-block mt-2 bg-teal-100 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full">
            {nbSymptomes} symptôme{nbSymptomes > 1 ? 's' : ''} sélectionné{nbSymptomes > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Symptômes critiques */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Symptômes graves</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {SYMPTOMES_CRITIQUES.map(s => (
            <SymptomeCard key={s.key} item={s} checked={!!form[s.key]} onChange={v => toggle(s.key)} />
          ))}
        </div>
      </div>

      {/* Symptômes modérés */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-orange-400 rounded-full" />
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">Autres symptômes</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {SYMPTOMES_MODERES.map(s => (
            <SymptomeCard key={s.key} item={s} checked={!!form[s.key]} onChange={v => toggle(s.key)} />
          ))}
        </div>
      </div>

      {/* Échelle douleur */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-slate-700">
            Intensité de la douleur
          </label>
          <span className={`text-2xl font-black ${
            form.echelleDouleur >= 8 ? 'text-red-600' :
            form.echelleDouleur >= 5 ? 'text-orange-500' : 'text-green-600'
          }`}>
            {form.echelleDouleur}/10
          </span>
        </div>
        <input type="range" min="0" max="10" step="1" value={form.echelleDouleur}
          onChange={e => setForm(p => ({ ...p, echelleDouleur: parseInt(e.target.value) }))}
          className="w-full accent-teal-600 cursor-pointer" />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0 — Aucune</span><span>5 — Modérée</span><span>10 — Insupportable</span>
        </div>
      </div>

      {/* Température */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          <Thermometer className="w-3.5 h-3.5 inline mr-1" />
          Température (optionnel)
        </label>
        <input type="number" placeholder="37.5" min="35" max="42" step="0.1"
          value={form.temperature}
          onChange={e => setForm(p => ({ ...p, temperature: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <button type="button" onClick={onNext} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer">
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Calcul en cours…
            </>
          ) : (
            <>Calculer mon niveau <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Étape 3 : Résultat + Code ────────────────────────────────────────────────
function EtapeResultat({ resultat, onRecommencer }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const n = NIVEAUX_COLORS[resultat.niveau] || NIVEAUX_COLORS[5];

  const copier = () => {
    navigator.clipboard?.writeText(resultat.codeSuivi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <motion.div key="etape3" variants={fadeSlide} initial="hidden" animate="visible" exit="exit"
      className="space-y-5">

      {/* Badge niveau Manchester */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="inline-flex flex-col items-center"
        >
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl mx-auto mb-3"
            style={{ backgroundColor: n.couleur }}
          >
            N{resultat.niveau}
          </div>
          <div
            className="px-5 py-1.5 rounded-full text-sm font-black tracking-wide"
            style={{ color: n.couleur, backgroundColor: n.bg, border: `2px solid ${n.border}` }}
          >
            {n.label}
          </div>
        </motion.div>
      </div>

      {/* Délai + service */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 text-slate-500" />
          <p className="text-xs text-slate-500">Délai estimé</p>
          <p className="font-bold text-slate-800 text-sm mt-0.5">{resultat.delai}</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
          <Stethoscope className="w-5 h-5 mx-auto mb-1 text-slate-500" />
          <p className="text-xs text-slate-500">Orientation</p>
          <p className="font-bold text-slate-800 text-sm mt-0.5 leading-tight">{resultat.service}</p>
        </div>
      </div>

      {/* Résumé clinique */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200">
        <p className="text-xs font-semibold text-slate-500 mb-1.5">Résumé clinique</p>
        <p className="text-sm text-slate-700 leading-relaxed">{resultat.resumeClinique}</p>
      </div>

      {/* Recommandations */}
      {resultat.recommandations?.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-2">Recommandations</p>
          <ul className="space-y-1.5">
            {resultat.recommandations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Code de suivi — élément central */}
      <div
        className="rounded-2xl p-5 border-2 text-center"
        style={{ backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }}
      >
        <p className="text-xs font-semibold text-green-700 mb-2">🎫 Votre code de suivi</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl font-black tracking-widest text-green-800 font-mono">
            {resultat.codeSuivi}
          </span>
          <button onClick={copier}
            className="p-2 rounded-xl bg-green-100 hover:bg-green-200 text-green-700 transition-colors cursor-pointer"
            title="Copier le code">
            <Copy className="w-4 h-4" />
          </button>
        </div>
        {copied && (
          <p className="text-xs text-green-600 mt-1 font-medium">✓ Copié !</p>
        )}
        <p className="text-xs text-green-700 mt-2 leading-snug">
          Conservez ce code. Il vous permet de suivre votre position<br />dans la file d'attente.
          Valable <strong>24 heures</strong>.
        </p>
      </div>

      {/* Position initiale */}
      {resultat.position !== undefined && (
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0">
            {resultat.patientsDevant + 1}
          </div>
          <div>
            <p className="text-sm font-bold text-blue-800">
              {resultat.patientsDevant === 0
                ? 'Vous serez pris en charge à votre arrivée'
                : `${resultat.patientsDevant} patient${resultat.patientsDevant > 1 ? 's' : ''} avant vous`}
            </p>
            <p className="text-xs text-blue-600">
              Estimation : {resultat.estimationMinutes > 0 ? `~${resultat.estimationMinutes} min` : 'Immédiat'}
            </p>
          </div>
        </div>
      )}

      {/* Bouton suivi temps réel */}
      <button
        onClick={() => navigate(`/suivi/${resultat.codeSuivi}`)}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-teal-700 text-white font-bold text-sm hover:bg-teal-800 transition-all shadow-lg cursor-pointer"
      >
        <ExternalLink className="w-4 h-4" />
        Suivre ma position en temps réel
      </button>

      {/* Bouton plan d'orientation */}
      <Link
        to={`/orientation/pretriage/${resultat.codeSuivi}`}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm text-white transition-all shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1E3A8A, #1D4ED8)' }}
      >
        <Navigation className="w-4 h-4" />
        Voir le plan d’accès à l’hôpital
      </Link>

      {/* Alerte urgence */}
      {resultat.niveau <= 2 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700">Cas très urgent !</p>
            <p className="text-xs text-red-600 mt-0.5">
              Ne tardez pas. Rendez-vous <strong>immédiatement</strong> aux urgences.
            </p>
          </div>
        </div>
      )}

      <button onClick={onRecommencer}
        className="w-full py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer">
        Faire un nouveau pré-triage
      </button>
    </motion.div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function PreTriagePage() {
  const [etape, setEtape] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultat, setResultat] = useState(null);

  const [form, setForm] = useState({
    prenom: '', nom: '', age: '', sexe: '', telephone: '',
    // symptômes
    douleurThoracique: false, difficultéRespiratoire: false, hemorragie: false,
    traumatisme: false, perteConnaissance: false, convulsions: false,
    fievre: false, vomissements: false, malaise: false,
    brulures: false, cephalees: false, diarrhee: false,
    // constantes
    echelleDouleur: 0, temperature: '',
  });

  const soumettre = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await soumettrePreTriage({
        ...form,
        age:         form.age         ? parseInt(form.age)         : null,
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        echelleDouleur: form.echelleDouleur || 0,
        sexe: form.sexe || 'Inconnu',
      });
      setResultat(res);
      setEtape(3);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erreur lors du calcul. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const recommencer = () => {
    setEtape(1);
    setResultat(null);
    setError(null);
    setForm({
      prenom: '', nom: '', age: '', sexe: '', telephone: '',
      douleurThoracique: false, difficultéRespiratoire: false, hemorragie: false,
      traumatisme: false, perteConnaissance: false, convulsions: false,
      fievre: false, vomissements: false, malaise: false,
      brulures: false, cephalees: false, diarrhee: false,
      echelleDouleur: 0, temperature: '',
    });
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F0FDFA 0%, #F8FAFC 50%, #EFF6FF 100%)' }}>
      {/* Header */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-700 to-teal-500 rounded-xl flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800">URGENSIA</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Accueil
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Titre */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
            Évaluez votre urgence
          </h1>
          <p className="text-slate-500 text-sm">
            Répondez aux questions et obtenez une estimation de votre niveau d'urgence
            selon le système médical Manchester.
          </p>
        </div>

        {/* Indicateur d'étapes */}
        {etape < 3 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map(n => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                  etape >= n ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  {etape > n ? <CheckCircle className="w-4 h-4" /> : n}
                </div>
                <span className={`text-xs font-medium flex-1 ${etape >= n ? 'text-teal-700' : 'text-slate-400'}`}>
                  {n === 1 ? 'Identité' : 'Symptômes'}
                </span>
                {n < 2 && <div className={`h-0.5 flex-1 rounded ${etape > n ? 'bg-teal-500' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Erreur globale */}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Card formulaire */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {etape === 1 && (
              <EtapeIdentite form={form} setForm={setForm} onNext={() => setEtape(2)} />
            )}
            {etape === 2 && (
              <EtapeSymptomes
                form={form} setForm={setForm}
                onBack={() => setEtape(1)}
                onNext={soumettre}
                loading={loading}
              />
            )}
            {etape === 3 && resultat && (
              <EtapeResultat resultat={resultat} onRecommencer={recommencer} />
            )}
          </AnimatePresence>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-slate-400 mt-6 px-4 leading-relaxed">
          Ce pré-triage est une <strong>estimation indicative</strong> et ne remplace pas un diagnostic médical.
        </p>
      </div>
    </div>
  );
}
