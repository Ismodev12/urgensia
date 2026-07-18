import api from './api';
import { normalizeUser } from '../utils/normalizeApi';
import { getServices } from './serviceService';

/**
 * GET /api/utilisateurs
 */
export async function getUtilisateurs() {
  const { data } = await api.get('/utilisateurs');
  return data.map(normalizeUser);
}

/**
 * POST /api/utilisateurs
 * Le backend attend : { nom, prenom, email, password, role, serviceId?, telephone }
 * Le frontend envoie : { nom, prenom, email, motDePasse, role, service (nom), telephone }
 * On traduit ici.
 */
export async function createUtilisateur(userData) {
  // 1. Trouver l'ID du service à partir du nom (optionnel)
  let serviceId = null;
  if (userData.service) {
    try {
      const services = await getServices();
      const match = services.find(
        s => s.name?.toLowerCase() === userData.service.toLowerCase()
      );
      serviceId = match?.id ?? null;
    } catch (_) {
      // service non trouvé → on laisse null
    }
  }

  // 2. Construire le payload attendu par le backend
  const payload = {
    nom:       userData.nom,
    prenom:    userData.prenom,
    email:     userData.email,
    password:  userData.motDePasse || 'Temp1234!',  // motDePasse → password
    role:      userData.role,
    telephone: userData.telephone || null,
    serviceId,
  };

  const { data } = await api.post('/utilisateurs', payload);
  return normalizeUser(data);
}

/**
 * PATCH /api/utilisateurs/:id — Modifier un utilisateur (admin).
 */
export async function updateUtilisateur(id, data) {
  const { data: res } = await api.patch(`/utilisateurs/${id}`, data);
  return res;
}

/**
 * Réinitialise le mot de passe d'un utilisateur (admin).
 * Le backend accepte le champ `password` sur PATCH /utilisateurs/:id.
 */
export async function reinitialiserMotDePasse(id, motDePasse) {
  await updateUtilisateur(id, { password: motDePasse });
}

/**
 * DELETE /api/utilisateurs/:id
 */
export async function deleteUtilisateur(id) {
  await api.delete(`/utilisateurs/${id}`);
}
