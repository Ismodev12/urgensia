import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Activity, AlertCircle, Check, ArrowRight,
  Heart, Wind, Droplets, Zap, Thermometer, Frown,
  EyeOff, Flame, Brain, Pill, RefreshCw,
} from 'lucide-react';
import { Button } from '../common/Button';
import { ManchesterBadge } from '../common/ManchesterBadge';
import { retriagePatient } from '../../services/patientService';

// Miroir exact des drapeaux du moteur MTS backend (cf. NewPatientPage)
const symptoms = [
  { id: 'douleurThoracique',      label: 'Douleur thoracique',    Icon: Heart,       critical: true  },
  { id: 'difficultéRespiratoire', label: 'Difficulté respiratoire', Icon: Wind,       critical: true  },
  { id: 'hemorragie',             label: 'Hémorragie',            Icon: Droplets,    critical: true  },
  { id: 'traumatisme',            label: 'Traumatisme',           Icon: Zap,         critical: false },
  { id: 'fievre',                 label: 'Fièvre',                Icon: Thermometer, critical: false },
  { id: 'vomissements',           label: 'Vomissements',          Icon: Frown,       critical: false },
  { id: 'malaise',                label: 'Malaise général',       Icon: Activity,    critical: false },
  { id: 'perteConnaissance',      label: 'Perte de connaissance', Icon: EyeOff,      critical: true  },
  { id: 'convulsions',            label: 'Convulsions',           Icon: AlertCircle, critical: true  },
  { id: 'brulures',               label: 'Brûlures',              Icon: Flame,       critical: false },
  { id: 'cephalees',              label: 'Céphalées',             Icon: Brain,       critical: false },
  { id: 'diarrhee',               label: 'Diarrhée',              Icon: Pill,        critical: false },
];

const douleurColors = [
  '#22C55E', '#4ADE80', '#86EFAC', '#BEF264', '#FDE047',
  '#FACC15', '#FB923C', '#F97316', '#EF4444', '#DC2626', '#7F1D1D',
];

/**
 * Modal de re-triage (réévaluation MTS) d'un patient déjà en file.
 * L'identité n'est pas re-saisie ; seules les données cliniques évoluent.
 *
 * @param {Object}   patient    - patient de la file (id, prenom, nom, age, manchesterLevel)
 * @param {Function} onClose    - fermeture du modal
 * @param {Function} onSuccess  - callback(result) après re-triage réussi
 */
export function RetriageModal({ patient, onClose, onSuccess }) {
  const [selectedSymptoms, setSelectedSymptoms] = useState({});
  const [vitals, setVitals] = useState({
    temperature: '', frequenceCardiaque: '',
    tensionSystolique: '', tensionDiastolique: '', saturationOxygene: '',
  });
  const [douleurScale, setDouleurScale] = useState(0);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState(null);
  const [result,       setResult]       = useState(null); // résultat après succès

  const toggleSymptom = (id) =>
    setSelectedSymptoms(prev => ({ ...prev, [id]: !prev[id] }));

  const handleVital = (key, value) =>
    setVitals(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const symptomesLabels = Object.entries(selectedSymptoms)
        .filter(([, v]) => v)
        .map(([k]) => symptoms.find(s => s.id === k)?.label ?? k);

      const payload = {
        // Données cliniques réévaluées
        temperature:        vitals.temperature        || null,
        frequenceCardiaque: vitals.frequenceCardiaque || null,
        tensionSystolique:  vitals.tensionSystolique  || null,
        tensionDiastolique: vitals.tensionDiastolique || null,
        saturationOxygene:  vitals.saturationOxygene  || null,
        echelleDouleur:     douleurScale,
        age:                patient.age,
        symptomes:          symptomesLabels,
        ...selectedSymptoms, // drapeaux booléens pour le moteur MTS
      };

      const res = await retriagePatient(patient.id, payload);
      setResult(res);
      onSuccess?.(res);
    } catch (err) {
      console.error('Erreur re-triage:', err);
      setError(err.response?.data?.error ?? 'Échec du re-triage. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* En-tête */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-night-blue">Re-triage — {patient.prenom} {patient.nom}</h2>
              <p className="text-xs text-soft-gray flex items-center gap-1.5">
                Niveau actuel : <ManchesterBadge level={patient.manchesterLevel} size="xs" />
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Écran résultat ─────────────────────────────────────────── */}
        {result ? (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="text-center">
                <p className="text-xs text-soft-gray mb-2 font-medium">Ancien niveau</p>
                <ManchesterBadge level={result.ancienNiveau} size="lg" showLabel={false} />
              </div>
              <ArrowRight className="w-6 h-6 text-slate-300" />
              <div className="text-center">
                <p className="text-xs text-soft-gray mb-2 font-medium">Nouveau niveau</p>
                <ManchesterBadge level={result.nouveauNiveau} size="lg" showLabel={false} />
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-soft-gray">Position dans la file</span>
                <span className="font-bold text-night-blue">{result.position}{result.patientsDevant != null && ` (${result.patientsDevant} devant)`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-soft-gray">N° de triage</span>
                <span className="font-bold text-night-blue">#{result.numeroTriage}</span>
              </div>
              {result.triage?.service && (
                <div className="flex justify-between">
                  <span className="text-soft-gray">Service orienté</span>
                  <span className="font-bold text-night-blue text-right">{result.triage.service}</span>
                </div>
              )}
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-sm text-emerald-700 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              Re-triage enregistré. L'historique du triage précédent est conservé.
            </div>

            <div className="flex justify-end">
              <Button variant="primary" icon={Check} onClick={onClose}>Terminé</Button>
            </div>
          </div>
        ) : (
          /* ─── Formulaire de re-triage ──────────────────────────────── */
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Symptômes */}
            <div>
              <label className="block text-sm font-semibold text-night-blue mb-3">Symptômes présents</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {symptoms.map((symptom) => (
                  <button
                    key={symptom.id}
                    type="button"
                    onClick={() => toggleSymptom(symptom.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-2xl border text-left transition-all cursor-pointer
                      ${selectedSymptoms[symptom.id]
                        ? symptom.critical ? 'bg-red-50 border-red-300 text-red-700' : 'bg-teal-50 border-teal-300 text-teal-700'
                        : 'bg-white border-slate-200 text-soft-gray hover:border-teal-200 hover:bg-teal-50/50'}`}
                  >
                    <symptom.Icon className={`w-4 h-4 flex-shrink-0 ${selectedSymptoms[symptom.id] ? (symptom.critical ? 'text-red-600' : 'text-teal-600') : 'text-soft-gray'}`} />
                    <span className="text-xs font-medium leading-tight">{symptom.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Constantes vitales */}
            <div>
              <label className="block text-sm font-semibold text-night-blue mb-3">Constantes vitales</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <input type="number" step="0.1" placeholder="Temp. °C"
                  value={vitals.temperature} onChange={e => handleVital('temperature', e.target.value)}
                  className="px-3 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <input type="number" placeholder="FC bpm"
                  value={vitals.frequenceCardiaque} onChange={e => handleVital('frequenceCardiaque', e.target.value)}
                  className="px-3 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <input type="number" placeholder="SpO₂ %"
                  value={vitals.saturationOxygene} onChange={e => handleVital('saturationOxygene', e.target.value)}
                  className="px-3 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <input type="number" placeholder="TA systolique"
                  value={vitals.tensionSystolique} onChange={e => handleVital('tensionSystolique', e.target.value)}
                  className="px-3 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <input type="number" placeholder="TA diastolique"
                  value={vitals.tensionDiastolique} onChange={e => handleVital('tensionDiastolique', e.target.value)}
                  className="px-3 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>

            {/* Échelle de douleur */}
            <div>
              <label className="block text-sm font-semibold text-night-blue mb-3">
                Échelle de douleur (EVA)
                <span className="ml-2 text-lg font-black" style={{ color: douleurColors[douleurScale] }}>
                  {douleurScale}/10
                </span>
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: 11 }, (_, i) => (
                  <button key={i} type="button" onClick={() => setDouleurScale(i)}
                    className={`w-8 h-8 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${douleurScale === i ? 'scale-110 shadow-md' : 'hover:scale-105'}`}
                    style={{
                      backgroundColor: douleurScale === i ? douleurColors[i] : `${douleurColors[i]}25`,
                      color: douleurScale === i ? 'white' : douleurColors[i],
                      border: `2px solid ${douleurColors[i]}40`,
                    }}>
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={onClose} disabled={submitting}>Annuler</Button>
              <Button variant="primary" icon={Activity} onClick={handleSubmit} loading={submitting}>
                {submitting ? 'Réévaluation…' : 'Recalculer le niveau'}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
