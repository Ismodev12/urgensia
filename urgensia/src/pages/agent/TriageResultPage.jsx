import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, MapPin, FileText, CheckCircle, ArrowLeft, Plus, Activity,
  AlertTriangle, Shield, Navigation, QrCode, Copy, Smartphone,
  Share2, Check, Camera, Stethoscope,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const LEVELS = [
  { n: 1, c: '#DC2626', l: 'Critique' },
  { n: 2, c: '#EA580C', l: 'Très Urgent' },
  { n: 3, c: '#EAB308', l: 'Urgent' },
  { n: 4, c: '#22C55E', l: 'Standard' },
  { n: 5, c: '#3B82F6', l: 'Non Urgent' },
];

const levelIcons = { 1: AlertTriangle, 2: AlertTriangle, 3: Clock, 4: Activity, 5: Shield };

// ─── Échelle de priorité (repère visuel N1 → N5) ─────────────────────────────
function PriorityScale({ level }) {
  return (
    <div className="flex gap-1.5">
      {LEVELS.map((L) => {
        const active = L.n === level;
        return (
          <div
            key={L.n}
            className="flex-1 rounded-xl py-2 text-center transition-all"
            style={{
              backgroundColor: active ? L.c : `${L.c}18`,
              color: active ? '#fff' : L.c,
              transform: active ? 'scale(1.06)' : undefined,
              boxShadow: active ? '0 6px 16px -4px rgba(0,0,0,0.25)' : undefined,
            }}
          >
            <p className="text-sm font-black leading-none">N{L.n}</p>
            <p className="text-[9px] font-semibold mt-0.5 leading-tight">{L.l}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Code de suivi à remettre au patient ─────────────────────────────────────
function CodeSuiviSection({ codeSuivi, couleur }) {
  const [copied, setCopied] = useState(false);
  const suiviUrl = `${window.location.origin}/patient/suivi/${codeSuivi}`;

  const copier = () => {
    navigator.clipboard?.writeText(codeSuivi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const partager = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'URGENSIA — Votre suivi de file d\'attente',
          text: `Votre code de suivi : ${codeSuivi}`,
          url: suiviUrl,
        });
      } catch { /* annulé */ }
    } else {
      copier();
    }
  };

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-4 h-4 text-teal-600" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-night-blue text-sm leading-tight">Code de suivi</p>
          <p className="text-xs text-soft-gray">À remettre au patient</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-green-700 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Actif
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Code */}
        <div className="rounded-2xl px-4 py-4 text-center border-2 bg-slate-50" style={{ borderColor: `${couleur}33` }}>
          <p className="text-[11px] text-soft-gray uppercase tracking-widest mb-1">Code unique</p>
          <p className="text-2xl font-black tracking-widest font-mono" style={{ color: couleur }}>{codeSuivi}</p>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center">
          <div className="p-3 bg-white rounded-2xl border-2" style={{ borderColor: `${couleur}22` }}>
            <QRCodeSVG value={suiviUrl} size={128} fgColor={couleur} bgColor="white" level="M" />
          </div>
          <p className="text-xs text-soft-gray text-center mt-2 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5" /> Scanner pour ouvrir le suivi
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={copier}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {copied ? <><Check className="w-4 h-4 text-green-600" /> Copié</> : <><Copy className="w-4 h-4" /> Copier</>}
          </button>
          <button
            onClick={partager}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" /> Partager
          </button>
        </div>

        <p className="text-xs text-soft-gray leading-relaxed">
          Le patient saisit ce code sur <strong className="text-night-blue">{window.location.host}/patient</strong> (ou scanne le QR) pour suivre sa position et son orientation.
        </p>
      </div>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function TriageResultPage() {
  const navigate = useNavigate();
  const { triageResult, pendingPatient, setTriageResult, setPendingPatient } = useApp();
  const { user } = useAuth();

  useEffect(() => {
    if (!triageResult || !pendingPatient) {
      navigate('/agent/nouveau-patient');
    }
  }, [triageResult, pendingPatient, navigate]);

  if (!triageResult || !pendingPatient) return null;

  const { level, label, color, bgColor, maxDelay, service, resume, recommendations, codeSuivi } = triageResult;
  const LevelIcon = levelIcons[level] || Activity;

  const handleAddToQueue = () => {
    setTriageResult(null);
    setPendingPatient(null);
    navigate('/agent/file-attente');
  };

  return (
    <DashboardLayout role="agent" user={user} title="Résultat du triage">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-5"
        >
          {/* Bandeau de confirmation */}
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-green-800 text-sm">Triage terminé</p>
              <p className="text-xs text-green-700">Le patient a été évalué et ajouté à la file d'attente triée par priorité.</p>
            </div>
          </div>

          {/* Carte résultat principale */}
          <Card padding={false} className="overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: color }} />
            <div className="p-6 sm:p-8">
              {/* Patient */}
              <div className="flex items-center gap-4 mb-6">
                <Avatar photo={pendingPatient.photo} nom={pendingPatient.nom} prenom={pendingPatient.prenom} size="2xl" ring />
                <div>
                  <p className="font-black text-night-blue text-lg leading-tight">{pendingPatient.prenom} {pendingPatient.nom}</p>
                  <p className="text-soft-gray text-sm">{pendingPatient.age} ans · {pendingPatient.sexe}</p>
                  {pendingPatient.photo && (
                    <span className="inline-flex items-center gap-1 text-xs text-teal-600 font-medium mt-1">
                      <Camera className="w-3.5 h-3.5" /> Photo enregistrée
                    </span>
                  )}
                </div>
              </div>

              {/* Niveau */}
              <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: bgColor }}>
                <motion.div
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
                  className="inline-flex w-20 h-20 rounded-3xl items-center justify-center shadow-large mb-3"
                  style={{ backgroundColor: color }}
                >
                  <LevelIcon className="w-10 h-10 text-white" />
                </motion.div>
                <p className="text-4xl sm:text-5xl font-black leading-none" style={{ color }}>Niveau {level}</p>
                <p className="text-xl font-bold text-night-blue mt-2">{label}</p>
                <p className="text-xs text-soft-gray mt-0.5">Manchester Triage System</p>
              </div>

              {/* Échelle de priorité */}
              <div className="mt-5">
                <p className="text-xs font-semibold text-soft-gray uppercase tracking-wide mb-2">Échelle de priorité</p>
                <PriorityScale level={level} />
              </div>

              {/* Délai + Service */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-soft-gray">Délai cible de prise en charge</p>
                    <p className="text-sm font-semibold text-night-blue">{maxDelay}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-soft-gray">Service d'orientation</p>
                    <p className="text-sm font-semibold text-night-blue">{service}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Détails (gauche) + Code suivi (droite) */}
          <div className="grid lg:grid-cols-3 gap-5">

            {/* Colonne gauche — clinique + recommandations */}
            <div className="lg:col-span-2 space-y-5">
              {/* Résumé clinique */}
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-4 h-4 text-soft-gray" />
                  </div>
                  <h3 className="font-bold text-night-blue">Résumé clinique</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">{resume}</p>

                {pendingPatient.symptomes?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-soft-gray mb-2 uppercase tracking-wide">Symptômes identifiés</p>
                    <div className="flex flex-wrap gap-2">
                      {pendingPatient.symptomes.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-lg text-xs font-medium">
                          <Stethoscope className="w-3 h-3" /> {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Recommandations */}
              {recommendations?.length > 0 && (
                <Card>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                      <CheckCircle className="w-4 h-4" style={{ color }} />
                    </div>
                    <h3 className="font-bold text-night-blue">Recommandations de prise en charge</h3>
                  </div>
                  <div className="space-y-2">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: color }}>
                          {i + 1}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Colonne droite — code suivi + orientation */}
            <div className="space-y-5">
              {codeSuivi && <CodeSuiviSection codeSuivi={codeSuivi} couleur={color} />}

              {triageResult?.patient?.id && (
                <Link
                  to={`/orientation/patient/${triageResult.patient.id}?from=agent`}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm text-white transition-all shadow-lg cursor-pointer hover:opacity-95"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}
                >
                  <Navigation className="w-5 h-5" />
                  Plan d'orientation du patient
                </Link>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" icon={ArrowLeft} className="flex-1" onClick={() => navigate('/agent/nouveau-patient')}>
              Nouveau patient
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              size="lg"
              className="flex-1 bg-gradient-to-r from-teal-700 to-teal-600 shadow-teal"
              onClick={handleAddToQueue}
            >
              Voir la file d'attente
            </Button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
