import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  User, Thermometer, Heart, Activity, AlertCircle,
  ChevronRight, ChevronLeft, Check, Stethoscope,
  Wind, Droplets, Zap, Frown, EyeOff, Flame, Brain, Pill,
  HeartHandshake, Sparkles, ShieldCheck, Laugh, Smile, Meh, Angry, Gauge,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { PhotoCapture } from '../../components/common/PhotoCapture';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { createPatient, uploadPatientPhoto } from '../../services/patientService';

const symptoms = [
  { id: 'douleurThoracique',      label: 'Douleur thoracique',    desc: 'Poitrine, oppression',   Icon: Heart,       critical: true,  group: 'frequent' },
  { id: 'difficultéRespiratoire', label: 'Difficulté à respirer', desc: 'Essoufflement',          Icon: Wind,        critical: true,  group: 'frequent' },
  { id: 'fievre',                 label: 'Fièvre',                desc: 'Température élevée',      Icon: Thermometer, critical: false, group: 'frequent' },
  { id: 'vomissements',           label: 'Vomissements',          desc: 'Nausées, vomissements',  Icon: Frown,       critical: false, group: 'frequent' },
  { id: 'cephalees',              label: 'Céphalées',             desc: 'Maux de tête',           Icon: Brain,       critical: false, group: 'frequent' },
  { id: 'malaise',                label: 'Malaise général',       desc: 'Faiblesse, vertiges',    Icon: Activity,    critical: false, group: 'frequent' },
  { id: 'hemorragie',             label: 'Hémorragie',            desc: 'Saignement abondant',    Icon: Droplets,    critical: true,  group: 'autre' },
  { id: 'traumatisme',            label: 'Traumatisme',           desc: 'Choc, blessure',         Icon: Zap,         critical: false, group: 'autre' },
  { id: 'perteConnaissance',      label: 'Perte de connaissance', desc: 'Évanouissement',         Icon: EyeOff,      critical: true,  group: 'autre' },
  { id: 'convulsions',            label: 'Convulsions',           desc: 'Crises, spasmes',        Icon: AlertCircle, critical: true,  group: 'autre' },
  { id: 'brulures',               label: 'Brûlures',              desc: 'Lésions cutanées',       Icon: Flame,       critical: false, group: 'autre' },
  { id: 'diarrhee',               label: 'Diarrhée',              desc: 'Selles liquides',        Icon: Pill,        critical: false, group: 'autre' },
];

const symptomesFrequents = symptoms.filter(s => s.group === 'frequent');
const symptomesAutres    = symptoms.filter(s => s.group === 'autre');

const steps = [
  { id: 0, title: 'Le patient',         short: 'Identité',    icon: User,        hint: 'Faisons connaissance' },
  { id: 1, title: 'Constantes vitales', short: 'Constantes',  icon: Activity,    hint: 'Les mesures du moment' },
  { id: 2, title: 'Symptômes',          short: 'Symptômes',   icon: Stethoscope, hint: "Ce qui ne va pas" },
  { id: 3, title: 'Évaluation',         short: 'Résultat',    icon: Check,       hint: 'Orientation Manchester' },
];

const douleurColors = [
  '#22C55E', '#4ADE80', '#86EFAC', '#BEF264', '#FDE047',
  '#FACC15', '#FB923C', '#F97316', '#EF4444', '#DC2626', '#7F1D1D',
];

/** Visage + libellé correspondant au niveau de douleur (EVA). */
function douleurFace(scale) {
  if (scale === 0)  return { Icon: Laugh, label: 'Pas de douleur' };
  if (scale <= 3)   return { Icon: Smile, label: 'Légère' };
  if (scale <= 6)   return { Icon: Meh,   label: 'Modérée' };
  if (scale <= 8)   return { Icon: Frown, label: 'Intense' };
  return              { Icon: Angry, label: 'Insupportable' };
}

/** En-tête chaleureux réutilisé en tête de chaque étape. */
function StepHeader({ icon: Icon, tone, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="font-bold text-night-blue leading-tight">{title}</h2>
        <p className="text-xs text-soft-gray">{subtitle}</p>
      </div>
    </div>
  );
}

/** Carte d'une constante vitale : coquille visuelle + repère de valeurs normales. */
function VitalCard({ icon: Icon, tone, label, unit, hint, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-teal-200">
      <div className="flex items-center gap-2.5 mb-3">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-night-blue leading-tight">{label}</p>
          {unit && <p className="text-[11px] text-soft-gray">{unit}</p>}
        </div>
      </div>
      {children}
      {hint && (
        <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-slate-300" />{hint}
        </p>
      )}
    </div>
  );
}

const inputClass =
  'w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm text-night-blue placeholder-slate-400 ' +
  'bg-white transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';

const vitalInput =
  'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-base font-bold text-night-blue text-center ' +
  'placeholder-slate-300 bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white';

/** Carte d'un symptôme : icône + libellé + courte description + case à cocher. */
function SymptomCard({ symptom, selected, onToggle }) {
  const rose = symptom.critical;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`group relative flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
        selected
          ? rose ? 'bg-rose-50 border-rose-300 focus-visible:ring-rose-400' : 'bg-teal-50 border-teal-300 focus-visible:ring-teal-400'
          : 'bg-white border-slate-200 hover:border-teal-200 hover:bg-teal-50/40 focus-visible:ring-teal-400'
      }`}
    >
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
        selected ? (rose ? 'bg-rose-100' : 'bg-teal-100') : 'bg-slate-50 group-hover:bg-white'
      }`}>
        <symptom.Icon className={`w-5 h-5 transition-colors ${
          selected ? (rose ? 'text-rose-600' : 'text-teal-700') : 'text-slate-400 group-hover:text-teal-600'
        }`} />
      </span>

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold leading-tight truncate ${
            selected ? (rose ? 'text-rose-700' : 'text-teal-800') : 'text-night-blue'
          }`}>{symptom.label}</span>
          {rose && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" title="Symptôme prioritaire" />}
        </span>
        <span className="block text-xs text-soft-gray truncate">{symptom.desc}</span>
      </span>

      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        selected
          ? rose ? 'bg-rose-500 border-rose-500' : 'bg-teal-600 border-teal-600'
          : 'border-slate-300 group-hover:border-teal-400'
      }`}>
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </span>
    </button>
  );
}

export default function NewPatientPage() {
  const [currentStep,      setCurrentStep]      = useState(0);
  const [selectedSymptoms, setSelectedSymptoms] = useState({});
  const [douleurScale,     setDouleurScale]     = useState(0);
  const [submitting,       setSubmitting]       = useState(false);
  const [submitError,      setSubmitError]      = useState(null);
  const [photoFile,        setPhotoFile]        = useState(null); // fichier photo facultatif

  const navigate = useNavigate();
  const { setTriageResult, setPendingPatient } = useApp();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();

  const { register, handleSubmit, getValues, trigger, formState: { errors } } = useForm();

  const handleNext = async () => {
    if (currentStep === 0) {
      const valid = await trigger(['nom', 'prenom', 'sexe', 'age']);
      if (!valid) return;
    }
    setCurrentStep(s => s + 1);
  };

  const toggleSymptom = (id) => {
    setSelectedSymptoms(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedCount = Object.values(selectedSymptoms).filter(Boolean).length;

  // ── Évaluation : appel API backend ────────────────────────────────────────
  const onEvaluate = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const formValues = getValues();

      // Construire les labels de symptômes sélectionnés
      const symptomesLabels = Object.entries(selectedSymptoms)
        .filter(([, v]) => v)
        .map(([k]) => {
          const sym = symptoms.find(s => s.id === k);
          return sym ? sym.label : k;
        });

      const payload = {
        // Infos patient
        nom:    formValues.nom,
        prenom: formValues.prenom,
        age:    formValues.age,
        sexe:   formValues.sexe,
        telephone: formValues.telephone || null,
        adresse:   formValues.adresse   || null,
        // Constantes
        temperature:           formValues.temperature          || null,
        tensionSystolique:     formValues.tensionSystolique    || null,
        tensionDiastolique:    formValues.tensionDiastolique   || null,
        frequenceCardiaque:    formValues.frequenceCardiaque   || null,
        saturationOxygene:     formValues.saturationOxygene    || null,
        echelleDouleur:        douleurScale,
        // Symptômes (labels pour BDD + flags booléens pour moteur MTS backend)
        symptomes:             symptomesLabels,
        ...selectedSymptoms,   // flags booléens : douleurThoracique, fievre, etc.
      };

      const { patient, triage, codeSuivi } = await createPatient(payload);

      // Upload la photo si l'infirmier en a pris une (facultatif)
      let photoUrl = null;
      if (photoFile && patient?.id) {
        try {
          const res = await uploadPatientPhoto(patient.id, photoFile);
          photoUrl = res.photoUrl;
        } catch {
          // Photo non critique — on continue sans bloquer
          console.warn('Upload photo échoué, patient enregistré quand même.');
        }
      }

      // Préparer les données pour TriageResultPage
      setPendingPatient({
        ...patient,
        photo: photoUrl ?? patient.photo,
        symptomes: symptomesLabels,
      });
      setTriageResult({
        ...triage,
        patient: { ...patient, photo: photoUrl ?? patient.photo },
        codeSuivi, // code unique à communiquer au patient
      });
      navigate('/agent/resultat-triage');
    } catch (err) {
      console.error('Erreur création patient:', err);
      setSubmitError(err.response?.data?.error ?? 'Erreur lors de l\'enregistrement. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = Math.round((currentStep / (steps.length - 1)) * 100);
  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 } };

  const PainFace = douleurFace(douleurScale).Icon;

  return (
    <DashboardLayout role="agent" user={user} title="Nouveau patient">
      <div className="relative">
        {/* Décor doux en arrière-plan — chaleureux sans distraire */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-teal-100/40 blur-3xl" />
          <div className="absolute top-40 -left-20 w-72 h-72 rounded-full bg-cyan-100/40 blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Bandeau d'accueil */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start gap-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-500 flex items-center justify-center shadow-teal flex-shrink-0">
              <HeartHandshake className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-night-blue leading-tight">Accueillons ce patient</h1>
              <p className="text-sm text-soft-gray">
                Quelques étapes simples pour une orientation juste, rapide et humaine.
              </p>
            </div>
          </motion.div>

          {/* Progression */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-teal-700">
                Étape {currentStep + 1} sur {steps.length}
              </span>
              <span className="text-xs text-soft-gray">{steps[currentStep].hint}</span>
            </div>

            {/* Barre de progression continue */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-cyan-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: reduceMotion ? 0 : 0.4, ease: 'easeOut' }}
              />
            </div>

            {/* Pastilles d'étape */}
            <div className="flex items-center justify-between">
              {steps.map((step, i) => {
                const done    = i < currentStep;
                const active  = i === currentStep;
                return (
                  <div key={step.id} className="flex flex-col items-center gap-1.5 flex-1">
                    <div
                      aria-current={active ? 'step' : undefined}
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        done    ? 'bg-teal-600 text-white' :
                        active  ? 'bg-teal-600 text-white ring-4 ring-teal-100 scale-110' :
                                  'bg-white text-slate-400 border border-slate-200'
                      }`}
                    >
                      {done ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-[11px] font-medium hidden sm:block transition-colors ${
                      active ? 'text-teal-700' : done ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {step.short}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Erreur API */}
          {submitError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {submitError}
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()}>
            <AnimatePresence mode="wait">
              {/* ── Étape 0 : Identité ─────────────────────────────────── */}
              {currentStep === 0 && (
                <motion.div key="step-0" {...slide} transition={{ duration: reduceMotion ? 0 : 0.25 }}>
                  <Card>
                    <StepHeader
                      icon={User}
                      tone="bg-teal-50 text-teal-700"
                      title="Faisons connaissance"
                      subtitle="Identité et coordonnées du patient"
                    />

                    <div className="mb-2 flex flex-col sm:flex-row gap-6 items-start">
                      <div className="flex-shrink-0 mx-auto sm:mx-0">
                        <PhotoCapture
                          value={photoFile}
                          onChange={setPhotoFile}
                          label="Photo du patient"
                          size="lg"
                        />
                      </div>
                      <div className="flex-1 grid sm:grid-cols-2 gap-5 w-full">
                        <div>
                          <label htmlFor="nom" className="block text-sm font-semibold text-night-blue mb-1.5">Nom *</label>
                          <input id="nom" {...register('nom', { required: 'Requis' })} placeholder="Ex : Agossou" className={inputClass} />
                          {errors.nom && <p className="text-red-500 text-xs mt-1">{errors.nom.message}</p>}
                        </div>
                        <div>
                          <label htmlFor="prenom" className="block text-sm font-semibold text-night-blue mb-1.5">Prénom *</label>
                          <input id="prenom" {...register('prenom', { required: 'Requis' })} placeholder="Ex : Koffi" className={inputClass} />
                          {errors.prenom && <p className="text-red-500 text-xs mt-1">{errors.prenom.message}</p>}
                        </div>
                        <div>
                          <label htmlFor="sexe" className="block text-sm font-semibold text-night-blue mb-1.5">Sexe *</label>
                          <select id="sexe" {...register('sexe', { required: 'Requis' })} className={`${inputClass} cursor-pointer`}>
                            <option value="">Sélectionner</option>
                            <option value="Homme">Homme</option>
                            <option value="Femme">Femme</option>
                            <option value="Autre">Autre</option>
                          </select>
                          {errors.sexe && <p className="text-red-500 text-xs mt-1">{errors.sexe.message}</p>}
                        </div>
                        <div>
                          <label htmlFor="age" className="block text-sm font-semibold text-night-blue mb-1.5">Âge *</label>
                          <input id="age" type="number" {...register('age', { required: 'Requis', min: 0, max: 150 })} placeholder="Ex : 35" className={inputClass} />
                          {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age.message}</p>}
                        </div>
                        <div>
                          <label htmlFor="telephone" className="block text-sm font-semibold text-night-blue mb-1.5">Téléphone</label>
                          <input id="telephone" {...register('telephone')} placeholder="+229 XX XX XX XX" className={inputClass} />
                        </div>
                        <div>
                          <label htmlFor="adresse" className="block text-sm font-semibold text-night-blue mb-1.5">Adresse</label>
                          <input id="adresse" {...register('adresse')} placeholder="Ex : Cotonou, Akpakpa" className={inputClass} />
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* ── Étape 1 : Constantes vitales ───────────────────────── */}
              {currentStep === 1 && (
                <motion.div key="step-1" {...slide} transition={{ duration: reduceMotion ? 0 : 0.25 }}>
                  <Card>
                    <StepHeader
                      icon={Activity}
                      tone="bg-blue-50 text-blue-700"
                      title="Les mesures du moment"
                      subtitle="Renseignez ce que vous avez — tout est optionnel"
                    />

                    <div className="grid sm:grid-cols-2 gap-4">
                      <VitalCard icon={Thermometer} tone="bg-orange-50 text-orange-600" label="Température" unit="°C" hint="Normale : 36 – 37,5">
                        <input id="temperature" type="number" step="0.1" aria-label="Température en degrés Celsius"
                          {...register('temperature')} placeholder="37.5" className={vitalInput} />
                      </VitalCard>

                      <VitalCard icon={Heart} tone="bg-red-50 text-red-600" label="Fréquence cardiaque" unit="battements / min" hint="Normale : 60 – 100">
                        <input id="frequenceCardiaque" type="number" aria-label="Fréquence cardiaque en battements par minute"
                          {...register('frequenceCardiaque')} placeholder="80" className={vitalInput} />
                      </VitalCard>

                      <VitalCard icon={Gauge} tone="bg-teal-50 text-teal-700" label="Tension artérielle" unit="mmHg — systolique / diastolique" hint="Normale : 120 / 80">
                        <div className="flex items-center gap-2">
                          <input id="tensionSystolique" type="number" aria-label="Tension systolique en mmHg"
                            {...register('tensionSystolique')} placeholder="120" className={vitalInput} />
                          <span className="text-slate-300 font-black text-lg" aria-hidden>/</span>
                          <input id="tensionDiastolique" type="number" aria-label="Tension diastolique en mmHg"
                            {...register('tensionDiastolique')} placeholder="80" className={vitalInput} />
                        </div>
                      </VitalCard>

                      <VitalCard icon={Wind} tone="bg-blue-50 text-blue-600" label="Saturation O₂ (SpO₂)" unit="%" hint="Normale : 95 – 100">
                        <input id="saturationOxygene" type="number" aria-label="Saturation en oxygène en pourcentage"
                          {...register('saturationOxygene')} placeholder="98" className={vitalInput} />
                      </VitalCard>
                    </div>

                    <p className="mt-5 flex items-center gap-2 text-xs text-soft-gray bg-teal-50/60 rounded-xl px-3 py-2.5">
                      <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      Pas de mesure sous la main ? Aucun souci — passez à l'étape suivante, le triage s'adapte.
                    </p>
                  </Card>
                </motion.div>
              )}

              {/* ── Étape 2 : Symptômes ────────────────────────────────── */}
              {currentStep === 2 && (
                <motion.div key="step-2" {...slide} transition={{ duration: reduceMotion ? 0 : 0.25 }} className="space-y-6">
                  <Card>
                    <div className="flex items-center justify-between gap-3 mb-6">
                      <StepHeader
                        icon={Stethoscope}
                        tone="bg-rose-50 text-rose-600"
                        title="Qu'observez-vous ?"
                        subtitle="Sélectionnez tout ce qui s'applique — même un seul suffit"
                      />
                      <AnimatePresence>
                        {selectedCount > 0 && (
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="flex-shrink-0 inline-flex items-center gap-1.5 bg-teal-600 text-white text-xs font-bold px-3 py-1.5 rounded-full"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <p className="text-xs font-bold text-soft-gray uppercase tracking-wide mb-3">Symptômes fréquents</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {symptomesFrequents.map((s) => (
                            <SymptomCard key={s.id} symptom={s} selected={!!selectedSymptoms[s.id]} onToggle={() => toggleSymptom(s.id)} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-soft-gray uppercase tracking-wide mb-3">Autres symptômes</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {symptomesAutres.map((s) => (
                            <SymptomCard key={s.id} symptom={s} selected={!!selectedSymptoms[s.id]} onToggle={() => toggleSymptom(s.id)} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="mt-5 flex items-center gap-2 text-xs text-soft-gray">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      Un point rose signale un symptôme prioritaire pour la sécurité du patient.
                    </p>
                  </Card>

                  {/* Échelle de douleur (EVA) — plus humaine */}
                  <Card>
                    <div className="flex items-center gap-4 mb-5">
                      <motion.div
                        key={douleurScale}
                        initial={{ scale: reduceMotion ? 1 : 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${douleurColors[douleurScale]}20` }}
                      >
                        <PainFace className="w-7 h-7" style={{ color: douleurColors[douleurScale] }} />
                      </motion.div>
                      <div>
                        <p className="text-sm font-semibold text-night-blue">Niveau de douleur ressentie</p>
                        <p className="text-xs text-soft-gray">Échelle visuelle analogique (EVA)</p>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-2xl font-black" style={{ color: douleurColors[douleurScale] }}>
                            {douleurScale}<span className="text-sm text-soft-gray font-bold">/10</span>
                          </span>
                          <span className="text-xs font-semibold" style={{ color: douleurColors[douleurScale] }}>
                            {douleurFace(douleurScale).label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Niveau de douleur de 0 à 10">
                      {Array.from({ length: 11 }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setDouleurScale(i)}
                          aria-label={`Douleur niveau ${i} sur 10`}
                          aria-pressed={douleurScale === i}
                          className="w-11 h-11 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                          style={{
                            backgroundColor: douleurScale === i ? douleurColors[i] : `${douleurColors[i]}22`,
                            color: douleurScale === i ? 'white' : douleurColors[i],
                            border: `2px solid ${douleurColors[i]}40`,
                            transform: douleurScale === i && !reduceMotion ? 'scale(1.1)' : undefined,
                            boxShadow: douleurScale === i ? '0 4px 12px -2px rgba(0,0,0,0.15)' : undefined,
                          }}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-soft-gray mt-2.5">
                      <span>Pas de douleur</span>
                      <span>Douleur maximale</span>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" icon={ChevronLeft} onClick={() => setCurrentStep(s => s - 1)} disabled={currentStep === 0}>
              Précédent
            </Button>

            {currentStep < 2 ? (
              <Button variant="primary" iconRight={ChevronRight} onClick={handleNext}>
                Continuer
              </Button>
            ) : (
              <Button
                variant="primary" size="lg"
                onClick={onEvaluate}
                disabled={submitting}
                className="bg-gradient-to-r from-teal-700 to-teal-600 shadow-teal hover:from-teal-800 hover:to-teal-700"
              >
                {submitting ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg> Enregistrement…</>
                ) : (
                  <><Activity className="w-5 h-5" /> Évaluer le patient</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
