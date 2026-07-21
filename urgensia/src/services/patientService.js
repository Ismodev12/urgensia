import api from './api';
import { normalizePatient, normalizeTriage, toApiStatut } from '../utils/normalizeApi';

/**
 * GET /api/patients
 * Filtres disponibles : statut, manchesterNiveau, serviceId, search
 */
export async function getPatients(filters = {}) {
  const params = {};
  if (filters.statut)           params.statut          = toApiStatut(filters.statut);
  if (filters.manchesterNiveau) params.manchesterNiveau = filters.manchesterNiveau;
  if (filters.serviceId)        params.serviceId        = filters.serviceId;
  if (filters.search)           params.search           = filters.search;

  const { data } = await api.get('/patients', { params });
  return data.map(normalizePatient);
}

/**
 * GET /api/patients/:id
 */
export async function getPatient(id) {
  const { data } = await api.get(`/patients/${id}`);
  return normalizePatient(data);
}

/**
 * POST /api/patients
 * Crée un patient avec triage MTS calculé côté serveur.
 * Retourne { patient, triage, codeSuivi }
 */
/**
 * POST /api/patients/interpreter-symptomes
 * Traduit une description libre de symptômes en drapeaux exploitables par le
 * moteur de triage, via l'IA (aide à la décision — l'infirmier valide).
 * @returns {{ symptomes: Object, echelleDouleur: number, resume: string }}
 */
export async function interpreterSymptomes(texte) {
  const { data } = await api.post('/patients/interpreter-symptomes', { texte });
  return data;
}

export async function createPatient(formData) {
  const { data } = await api.post('/patients', formData);
  return {
    patient:   normalizePatient(data.patient),
    triage:    normalizeTriage(data.triage),
    codeSuivi: data.codeSuivi ?? null,
  };
}

/**
 * POST /api/patients/urgence
 * Enregistrement rapide d'un cas critique (Niveau 1 forcé).
 */
export async function createUrgentPatient(urgenceData) {
  const { data } = await api.post('/patients/urgence', urgenceData);
  return {
    patient:   normalizePatient(data.patient),
    triage:    data.triage,
    codeSuivi: data.codeSuivi ?? null,
  };
}

/**
 * POST /api/patients/:id/triage
 * Re-triage d'un patient encore en file (infirmier de triage / agent d'accueil).
 * Conserve l'historique du triage précédent et recalcule la priorité.
 * @param {string} id        - UUID du patient
 * @param {Object} formData  - mêmes champs que le triage initial (symptômes + constantes)
 * @returns {{ ancienNiveau, nouveauNiveau, numeroTriage, dateReevaluation, position, triage }}
 */
export async function retriagePatient(id, formData) {
  const { data } = await api.post(`/patients/${id}/triage`, formData);
  return {
    ...data,
    triage: normalizeTriage(data.triage),
  };
}

/**
 * POST /api/patients/reevaluation/scan
 * Déclenche la détection des délais de réévaluation dépassés.
 * Marque les patients concernés « à réévaluer » et notifie l'infirmier de triage.
 * À appeler au chargement de la file (ou par une tâche planifiée).
 * @returns {{ detectes: number, patients: Array }}
 */
export async function scanReevaluations() {
  const { data } = await api.post('/patients/reevaluation/scan');
  return data;
}

/**
 * GET /api/patients/:id/triages
 * Historique des triages d'un patient (triage initial + re-triages).
 */
export async function getTriageHistory(id) {
  const { data } = await api.get(`/patients/${id}/triages`);
  return data;
}

/**
 * PATCH /api/patients/:id/statut
 * Change le statut d'un patient.
 */
export async function changePatientStatus(id, statut) {
  const { data } = await api.patch(`/patients/${id}/statut`, {
    statut: toApiStatut(statut),
  });
  return normalizePatient(data);
}

/**
 * POST /api/patients/:id/photo
 * Upload la photo de profil d'un patient (multipart/form-data).
 * @param {string} patientId
 * @param {File}   file  - objet File du navigateur
 * @returns {{ photoUrl: string }}
 */
export async function uploadPatientPhoto(patientId, file) {
  const form = new FormData();
  form.append('photo', file);
  const { data } = await api.post(`/patients/${patientId}/photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // { photoUrl, patient, message }
}

/**
 * DELETE /api/patients/:id/photo
 * Supprime la photo de profil d'un patient.
 */
export async function deletePatientPhoto(patientId) {
  const { data } = await api.delete(`/patients/${patientId}/photo`);
  return data;
}
