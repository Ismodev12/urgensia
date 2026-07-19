import axios from 'axios';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

/**
 * Récupérer le statut + orientation + position en file d'un patient triage par l'infirmier.
 * @param {string} code - Code de suivi ex: "PAT-A2MB7X"
 * @returns {{ statut, manchesterNiveau, orientation, position, patientsDevant, ... }}
 */
export const getSuiviPatient = async (code) => {
  const { data } = await axios.get(`${API}/api/suivi/${code.toUpperCase().trim()}`);
  return data;
};
