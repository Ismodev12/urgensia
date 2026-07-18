import api from './api';
import { normalizeUser } from '../utils/normalizeApi';

/**
 * Service self-service du profil de l'utilisateur connecté.
 * (Distinct de utilisateurService, réservé à l'admin pour gérer les autres comptes.)
 */

/** GET /api/profil — profil complet de l'utilisateur connecté */
export async function getProfil() {
  const { data } = await api.get('/profil');
  return normalizeUser(data);
}

/**
 * PATCH /api/profil — met à jour ses infos (nom, prénom, téléphone, email)
 * @param {{nom?:string, prenom?:string, telephone?:string, email?:string}} payload
 */
export async function updateProfil(payload) {
  const { data } = await api.patch('/profil', payload);
  return normalizeUser(data);
}

/** PATCH /api/profil/mot-de-passe — change son mot de passe */
export async function changePassword(motDePasseActuel, nouveauMotDePasse) {
  const { data } = await api.patch('/profil/mot-de-passe', {
    motDePasseActuel,
    nouveauMotDePasse,
  });
  return data;
}

/** POST /api/profil/photo — upload/remplacement de la photo de profil */
export async function uploadProfilePhoto(file) {
  const form = new FormData();
  form.append('photo', file);
  const { data } = await api.post('/profil/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data; // { message, photoUrl }
}

/** DELETE /api/profil/photo — supprime la photo de profil */
export async function deleteProfilePhoto() {
  const { data } = await api.delete('/profil/photo');
  return data;
}
