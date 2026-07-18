import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, User, Zap, ArrowLeft,
  CheckCircle, Siren, ShieldAlert, Activity,
  Heart, Clock, UserPlus
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { PhotoCapture } from '../../components/common/PhotoCapture';
import { useAuth } from '../../context/AuthContext';
import { createUrgentPatient, uploadPatientPhoto } from '../../services/patientService';

const motifs = [
  { id: 'arretCardiaque',       label: 'Arrêt cardiaque',             icon: Heart         },
  { id: 'detresseRespiratoire', label: 'Détresse respiratoire',        icon: Activity      },
  { id: 'traumatismeGrave',     label: 'Traumatisme grave',            icon: Zap           },
  { id: 'avn',                  label: 'AVC / Perte de connaissance',  icon: ShieldAlert   },
  { id: 'hemorragieActive',     label: 'Hémorragie active',            icon: Siren         },
  { id: 'convulsions',          label: 'Convulsions en cours',         icon: AlertTriangle },
  { id: 'bruluresEtendues',     label: 'Brûlures étendues',            icon: Zap           },
  { id: 'intoxication',         label: 'Intoxication / OD',            icon: ShieldAlert   },
  { id: 'chocAnaphylactique',   label: 'Choc anaphylactique',          icon: AlertTriangle },
  { id: 'autre',                label: 'Autre urgence vitale',         icon: Siren         },
];

const sexes = ['Homme', 'Femme', 'Inconnu'];

export default function CriticalCasePage() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  const [nom,           setNom]           = useState('');
  const [prenom,        setPrenom]        = useState('');
  const [age,           setAge]           = useState('');
  const [sexe,          setSexe]          = useState('Inconnu');
  const [selectedMotif, setSelectedMotif] = useState(null);
  const [notes,         setNotes]         = useState('');
  const [confirmed,     setConfirmed]     = useState(false);
  const [addedPatient,  setAddedPatient]  = useState(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [apiError,      setApiError]      = useState(null);
  const [photoFile,     setPhotoFile]     = useState(null);

  const canSubmit = selectedMotif !== null && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setApiError(null);

    const motifObj = motifs.find(m => m.id === selectedMotif);

    try {
      const { patient } = await createUrgentPatient({
        nom:          nom.trim()    || 'INCONNU',
        prenom:       prenom.trim() || '—',
        age:          age           || null,
        sexe,
        motifUrgence: motifObj.label,
        notes:        notes.trim()  || '',
      });

      // Upload photo si disponible (non bloquant)
      if (photoFile && patient?.id) {
        try {
          await uploadPatientPhoto(patient.id, photoFile);
        } catch { /* non critique */ }
      }

      setAddedPatient({ ...patient, motifUrgence: motifObj.label });
      setConfirmed(true);
    } catch (err) {
      setApiError(err.response?.data?.error ?? 'Erreur lors de l\'enregistrement. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Écran de confirmation ──────────────────────────────────────────────── */
  if (confirmed && addedPatient) {
    return (
      <DashboardLayout role="agent" user={user} title="Cas critique enregistré">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 180 }}
            className="space-y-5"
          >
            {/* Bannière succès */}
            <div className="rounded-3xl p-8 text-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 60%, #EF4444 100%)' }}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4 w-32 h-32 rounded-full border-4 border-white" />
                <div className="absolute bottom-4 left-4 w-20 h-20 rounded-full border-4 border-white" />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="relative z-10"
              >
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-black text-white mb-1">Cas critique enregistré !</h2>
                <p className="text-red-100 text-sm">Code d'urgence attribué automatiquement</p>
              </motion.div>
            </div>

            {/* Fiche patient */}
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center">
                  <User className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-night-blue">{addedPatient.prenom} {addedPatient.nom}</p>
                  <p className="text-xs text-soft-gray">{addedPatient.age ?? '?'} ans · {addedPatient.sexe}</p>
                </div>
                <div className="ml-auto flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  ROUGE · N1
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                  <Siren className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Motif d'urgence</p>
                    <p className="text-sm font-bold text-red-800">{addedPatient.motifUrgence}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Clock className="w-4 h-4 text-soft-gray flex-shrink-0" />
                  <div>
                    <p className="text-xs text-soft-gray font-semibold uppercase tracking-wide">Heure d'arrivée</p>
                    <p className="text-sm font-bold text-night-blue">
                      {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Activity className="w-4 h-4 text-soft-gray flex-shrink-0" />
                  <div>
                    <p className="text-xs text-soft-gray font-semibold uppercase tracking-wide">Priorité dans la file</p>
                    <p className="text-sm font-bold text-night-blue">1ère position · Prise en charge immédiate</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                <span className="font-bold">Note :</span> Ce patient a été placé en <strong>tête de file</strong>.
                Les constantes vitales devront être relevées dès que possible par le personnel médical.
                Une alerte a été envoyée aux médecins disponibles.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" icon={ArrowLeft} className="flex-1" onClick={() => navigate('/agent')}>
                Tableau de bord
              </Button>
              <Button variant="danger" icon={Siren} className="flex-1" onClick={() => {
                setConfirmed(false); setAddedPatient(null);
                setNom(''); setPrenom(''); setAge(''); setSexe('Inconnu');
                setSelectedMotif(null); setNotes('');
              }}>
                Nouveau cas critique
              </Button>
              <Button variant="primary" icon={Activity} className="flex-1" onClick={() => navigate('/agent/file-attente')}>
                Voir la file
              </Button>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Formulaire ─────────────────────────────────────────────────────────── */
  return (
    <DashboardLayout role="agent" user={user} title="Cas critique d'urgence">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Bandeau d'alerte rouge */}
          <div
            className="rounded-3xl p-5 sm:p-7 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 60%, #EF4444 100%)' }}
          >
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
            <div className="relative flex items-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0"
              >
                <Siren className="w-7 h-7 text-white" />
              </motion.div>
              <div>
                <h2 className="text-xl font-black">Prise en charge d'urgence vitale</h2>
                <p className="text-red-100 text-sm mt-0.5">
                  Code rouge (Niveau 1) attribué automatiquement · Priorité absolue dans la file
                </p>
              </div>
            </div>
          </div>

          {/* Erreur API */}
          <AnimatePresence>
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {apiError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Motif d'urgence */}
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-night-blue">Motif d'urgence *</h3>
                <p className="text-xs text-soft-gray">Sélectionnez le motif principal</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {motifs.map((motif) => {
                const isSelected = selectedMotif === motif.id;
                return (
                  <motion.button
                    key={motif.id} type="button" whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedMotif(motif.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer
                      ${isSelected
                        ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-200'
                        : 'bg-red-50/50 border-red-100 text-red-700 hover:border-red-300 hover:bg-red-50'
                      }`}
                  >
                    <motif.icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-red-500'}`} />
                    <span className="text-xs font-semibold leading-tight">{motif.label}</span>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-white" />}
                  </motion.button>
                );
              })}
            </div>
          </Card>

          {/* Infos patient (optionnelles) */}
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center">
                <User className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <h3 className="font-bold text-night-blue">Identité du patient</h3>
                <p className="text-xs text-soft-gray">Facultatif si patient inconnu ou incapable de communiquer</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-night-blue mb-1.5">Nom</label>
                <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: AGOSSOU (ou INCONNU)"
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-night-blue mb-1.5">Prénom</label>
                <input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Ex: Koffi"
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-night-blue mb-1.5">Âge estimé</label>
                <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Ex: 45" min="0" max="150"
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-night-blue mb-1.5">Sexe</label>
                <div className="flex gap-2">
                  {sexes.map(s => (
                    <button key={s} type="button" onClick={() => setSexe(s)}
                      className={`flex-1 py-3 rounded-2xl text-xs font-semibold border-2 transition-all
                        ${sexe === s ? 'bg-slate-800 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo facultative — colonne entierère */}
              <div className="sm:col-span-2">
                <PhotoCapture
                  value={photoFile}
                  onChange={setPhotoFile}
                  label="Photo du patient (facultatif)"
                  size="md"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-night-blue mb-1.5">Observations rapides</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Patient retrouvé inconscient à l'entrée, accompagné par SAMU..." rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-slate-50 resize-none" />
            </div>
          </Card>

          {/* Rappel code rouge */}
          <div className="flex items-start gap-3 bg-red-50 border-2 border-red-200 rounded-2xl p-4">
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">Attribution automatique : Code ROUGE · Niveau 1</p>
              <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                Ce patient sera placé en <strong>1ère position</strong> dans la file d'attente
                et tous les médecins disponibles seront alertés immédiatement.
              </p>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" icon={ArrowLeft} className="flex-1" onClick={() => navigate('/agent')}>
              Annuler
            </Button>

            <motion.button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              whileTap={{ scale: canSubmit ? 0.97 : 1 }}
              className={`flex-[2] flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-black text-base
                transition-all duration-200 focus:outline-none
                ${canSubmit
                  ? 'bg-gradient-to-r from-red-700 via-red-600 to-rose-600 text-white shadow-xl shadow-red-300 hover:shadow-red-400 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
            >
              {submitting ? (
                <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg> Enregistrement…</>
              ) : (
                <><Siren className="w-5 h-5" /> ENREGISTRER — CAS CRITIQUE <UserPlus className="w-5 h-5" /></>
              )}
            </motion.button>
          </div>

        </motion.div>
      </div>
    </DashboardLayout>
  );
}
