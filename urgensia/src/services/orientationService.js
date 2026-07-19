import axios from 'axios';
import api from './api';

const API_PUBLIC = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

/**
 * Récupère les données du plan hospitalier (tous les services + coordonnées SVG).
 * Public — utilisé pour initialiser le plan interactif.
 */
export const getPlanHospital = async () => {
  const { data } = await axios.get(`${API_PUBLIC}/api/orientation/plan`);
  return data;
};

/**
 * Récupère l'orientation d'un pré-triage citoyen par code de suivi.
 * Public.
 * @param {string} code - ex: "URG-4X7K"
 */
export const getOrientationPreTriage = async (code) => {
  const { data } = await axios.get(`${API_PUBLIC}/api/orientation/pretriage/${code.toUpperCase()}`);
  return data;
};

/**
 * Récupère l'orientation complète d'un patient enregistré.
 * Protégé (JWT via intercepteur api.js).
 * @param {string} patientId - UUID du patient
 */
export const getOrientationPatient = async (patientId) => {
  const { data } = await api.get(`/orientation/patient/${patientId}`);
  return data;
};
