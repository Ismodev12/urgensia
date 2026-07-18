import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Soumettre un pré-triage citoyen (sans authentification)
 * @param {Object} formData - Symptômes + constantes + identité optionnel
 * @returns {{ codeSuivi, niveau, label, couleur, recommandations, position, ... }}
 */
export const soumettrePreTriage = async (formData) => {
  const { data } = await axios.post(`${API}/api/pretriage`, formData);
  return data;
};

/**
 * Récupérer le statut + position en file d'un pré-triage
 * @param {string} code - Code de suivi ex: "URG-4X7K"
 * @returns {{ statut, position, patientsDevant, estimationMinutes, manchesterNiveau, ... }}
 */
export const getStatutPreTriage = async (code) => {
  const { data } = await axios.get(`${API}/api/pretriage/${code.toUpperCase()}`);
  return data;
};
