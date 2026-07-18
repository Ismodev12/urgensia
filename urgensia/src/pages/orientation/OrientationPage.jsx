import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, ArrowLeft, Building2, Layers, DoorOpen,
  MapPin, Navigation, AlertTriangle, Loader,
  FileText, Clock, CheckCircle, Smartphone, User,
} from 'lucide-react';
import QRCodeDisplay from '../../components/orientation/QRCodeDisplay';
import { getOrientationPreTriage, getOrientationPatient } from '../../services/orientationService';
import { PublicFooter } from '../../components/common/PublicFooter';

// ─── MTS config ───────────────────────────────────────────────────────────────
const MTS_META = {
  1: { label: 'CRITIQUE',    couleur: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
  2: { label: 'TRÈS URGENT', couleur: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' },
  3: { label: 'URGENT',      couleur: '#EAB308', bg: '#FEF9C3', border: '#FEF08A' },
  4: { label: 'STANDARD',    couleur: '#22C55E', bg: '#DCFCE7', border: '#BBF7D0' },
  5: { label: 'NON URGENT',  couleur: '#3B82F6', bg: '#DBEAFE', border: '#BFDBFE' },
};

// ─── Patient identity card (left column) ─────────────────────────────────────
function PatientCard({ patient, triage, mts }) {
  const nom = patient?.nom && patient?.prenom
    ? `${patient.prenom} ${patient.nom}`
    : 'Patient anonyme';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Colored strip */}
      <div className="h-2 w-full" style={{ backgroundColor: mts.couleur }} />

      <div className="p-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0 shadow"
            style={{ backgroundColor: mts.couleur }}>
            {patient?.photoUrl
              ? <img src={patient.photoUrl} alt={nom} className="w-full h-full object-cover rounded-2xl" />
              : <User className="w-7 h-7" />}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black text-slate-800 truncate leading-tight">{nom}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {patient?.age && <span className="text-sm text-slate-500">{patient.age} ans</span>}
              {patient?.sexe && patient.sexe !== 'Inconnu' && (
                <span className="text-sm text-slate-500">· {patient.sexe}</span>
              )}
            </div>
            <span className="inline-block mt-1 text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {patient?.numDossier}
            </span>
          </div>
        </div>

        {/* MTS level */}
        <div className="flex items-center gap-3 p-4 rounded-xl border"
          style={{ backgroundColor: mts.bg, borderColor: mts.border }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-sm"
            style={{ backgroundColor: mts.couleur }}>
            N{triage?.manchesterNiveau}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Niveau Manchester</p>
            <p className="text-lg font-black leading-tight" style={{ color: mts.couleur }}>{mts.label}</p>
            {triage?.manchesterDelai && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {triage.manchesterDelai}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Destination banner (right column top) ────────────────────────────────────
function DestinationBanner({ orientation, mts, isUrgent }) {
  if (!orientation) return null;

  const locItems = [
    orientation.batiment && { icon: Building2, value: orientation.batiment },
    orientation.etage    && { icon: Layers,    value: orientation.etage },
    orientation.salle    && { icon: DoorOpen,  value: orientation.salle },
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border-2 overflow-hidden shadow-sm"
      style={{ borderColor: mts.border }}>
      {/* Colored header */}
      <div className="px-6 py-6" style={{ background: `linear-gradient(135deg, ${mts.bg} 0%, white 100%)` }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: mts.couleur }}>
          Votre destination
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight flex items-start gap-3">
          <MapPin className="w-7 h-7 mt-0.5 flex-shrink-0" style={{ color: mts.couleur }} />
          {orientation.serviceNom}
        </h2>
        {isUrgent && (
          <p className="mt-2 text-sm font-semibold text-red-700">
            Accompagnement immédiat requis
          </p>
        )}
      </div>

      {/* Location badges */}
      <div className="bg-white px-6 py-4 flex flex-wrap gap-2 border-t" style={{ borderColor: mts.border }}>
        {locItems.map(({ icon: Icon, value }) => (
          <div key={value}
            className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
            <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-700">{value}</span>
          </div>
        ))}
        {!isUrgent && (
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">Service disponible</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Route card ────────────────────────────────────────────────────────────────
function RouteCard({ orientation, mts, isUrgent }) {
  const steps = [
    {
      num: '1',
      title: 'Point de départ — Accueil',
      desc: 'Signalez votre présence à l\'infirmier d\'accueil-triage au rez-de-chaussée (Bâtiment A).',
      icon: DoorOpen,
      couleur: '#334155',
    },
    {
      num: '2',
      title: 'Suivez l\'itinéraire',
      desc: orientation?.descriptionChemin
        || 'Suivez la signalétique de couleur et les flèches directionnelles dans les couloirs jusqu\'au service indiqué.',
      icon: Navigation,
      couleur: mts.couleur,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-base font-black text-slate-800 flex items-center gap-2.5 mb-7">
        <span className="w-9 h-9 bg-cyan-50 border border-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Navigation className="w-4.5 h-4.5 text-cyan-700" />
        </span>
        Comment s'y rendre
      </h3>

      <div>
        {steps.map((step, i) => (
          <div key={i} className="flex gap-5">
            {/* Step indicator */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-lg shadow-sm"
                style={{ backgroundColor: step.couleur }}>
                {step.num}
              </div>
              {i < steps.length - 1 && (
                <div className="w-0.5 flex-1 my-2 rounded-full"
                  style={{ backgroundColor: mts.couleur + '55', minHeight: '32px' }} />
              )}
            </div>

            {/* Content */}
            <div className={i < steps.length - 1 ? 'pb-7 flex-1' : 'flex-1'}>
              <div className="flex items-center gap-2 mb-1.5">
                <step.icon className="w-4 h-4 flex-shrink-0" style={{ color: step.couleur }} />
                <p className="text-base font-bold text-slate-800">{step.title}</p>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}

        {/* Final destination step */}
        <div className="flex gap-5 mt-0">
          <div className="flex-shrink-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: mts.couleur }}>
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex-1 rounded-2xl p-4 border"
            style={{ backgroundColor: mts.bg, borderColor: mts.border }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: mts.couleur }}>
              Destination finale
            </p>
            <p className="text-xl font-black text-slate-800 leading-tight">{orientation?.serviceNom}</p>
            <p className="text-sm text-slate-600 mt-1">
              {[orientation?.batiment, orientation?.etage, orientation?.salle]
                .filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function OrientationPage() {
  const { mode, id } = useParams();
  const [searchParams] = useSearchParams();
  const fromRole = searchParams.get('from');

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const pageUrl = window.location.href;

  useEffect(() => {
    const charger = async () => {
      try {
        const res = mode === 'pretriage'
          ? await getOrientationPreTriage(id)
          : await getOrientationPatient(id);
        setData(res);
      } catch (err) {
        setError(
          err.response?.status === 404
            ? 'Dossier introuvable. Vérifiez le code ou l\'identifiant.'
            : 'Erreur de connexion. Vérifiez votre réseau.'
        );
      } finally {
        setLoading(false);
      }
    };
    charger();
  }, [mode, id]);

  const backUrl = fromRole === 'agent'   ? '/agent'
                : fromRole === 'medecin' ? '/medecin'
                : mode === 'pretriage'   ? `/suivi/${id}`
                : '/';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #ECFEFF, #F0FDFA)' }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-3xl shadow-lg border border-cyan-100 flex items-center justify-center mx-auto mb-4">
            <Loader className="w-8 h-8 text-cyan-600 animate-spin" />
          </div>
          <p className="text-cyan-900 font-semibold">Chargement de l'orientation…</p>
        </div>
      </div>
    );
  }

  // ── Erreur ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #ECFEFF, #F0FDFA)' }}>
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Dossier introuvable</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <Link to="/"
            className="block w-full py-3 bg-cyan-700 text-white rounded-xl font-semibold hover:bg-cyan-800 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-cyan-300"
            aria-label="Retourner à la page d'accueil">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const { patient, triage, orientation } = data;
  const mts      = MTS_META[triage?.manchesterNiveau] || MTS_META[5];
  const isUrgent = triage?.manchesterNiveau <= 2;

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'linear-gradient(160deg, #F0FDFA 0%, #ECFEFF 50%, #F0F9FF 100%)' }}>

      {/* Décor doux en arrière-plan */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-teal-100/40 blur-3xl" />
        <div className="absolute top-1/3 -left-24 w-80 h-80 rounded-full bg-cyan-100/40 blur-3xl" />
      </div>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to={backUrl} aria-label="Retour"
              className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-slate-800 tracking-wide">URGENSIA</span>
              <span className="hidden sm:block text-slate-300">/</span>
              <span className="hidden sm:block text-sm font-medium text-slate-500">Orientation</span>
            </div>
          </div>

          {/* MTS badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold border"
            style={{ backgroundColor: mts.bg, color: mts.couleur, borderColor: mts.border }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: mts.couleur }} />
            N{triage?.manchesterNiveau} — {mts.label}
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">

        {/* ── Urgent alert ───────────────────────────────────────────────── */}
        {isUrgent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            aria-live="assertive"
            className="mb-6 flex items-start gap-4 bg-red-50 border-2 border-red-300 rounded-2xl p-5"
          >
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-black text-red-700 text-base">Cas urgent — Accompagnement immédiat requis</p>
              <p className="text-sm text-red-600 mt-1 leading-relaxed">
                Ce patient doit être pris en charge immédiatement. Un infirmier d'accueil-triage doit l'accompagner physiquement vers le service.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Page title ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7"
        >
          <h1 className="text-3xl sm:text-4xl font-black text-cyan-900 leading-tight">
            Orientation Patient
          </h1>
          <p className="text-slate-500 mt-1.5 text-base">
            Itinéraire vers <strong className="text-slate-700">{orientation?.serviceNom}</strong>
          </p>
        </motion.div>

        {/* ── Main grid ──────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* LEFT — patient identity + QR */}
          <div className="space-y-6">

            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}>
              <PatientCard patient={patient} triage={triage} mts={mts} />
            </motion.div>

            {/* Résumé clinique */}
            {triage?.resumeClinique && (
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-500" />
                  </div>
                  <h3 className="font-bold text-slate-700">Résumé clinique</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                  {triage.resumeClinique}
                </p>
              </motion.div>
            )}

            {/* QR Code */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-cyan-50 border border-cyan-100 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">QR Code Patient</p>
                  <p className="text-xs text-slate-400">Accès mobile</p>
                </div>
              </div>
              <QRCodeDisplay
                url={pageUrl}
                label="Scannez pour ouvrir l'orientation sur votre téléphone"
                couleur={mts.couleur}
              />
            </motion.div>
          </div>

          {/* RIGHT — destination + itinerary + emergency */}
          <div className="lg:col-span-2 space-y-6">

            {/* Destination banner */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}>
              <DestinationBanner orientation={orientation} mts={mts} isUrgent={isUrgent} />
            </motion.div>

            {/* Route steps */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}>
              <RouteCard orientation={orientation} mts={mts} isUrgent={isUrgent} />
            </motion.div>

          </div>
        </div>
      </div>

      <div className="relative z-10">
        <PublicFooter />
      </div>
    </div>
  );
}
