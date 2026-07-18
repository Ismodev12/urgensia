import api from './api';
import { normalizeService } from '../utils/normalizeApi';

/**
 * GET /api/services
 */
export async function getServices() {
  const { data } = await api.get('/services');
  return data.map(normalizeService);
}

/**
 * POST /api/services
 * Body: { nom, medecinChef, capaciteLits, description? }
 */
export async function createService(serviceData) {
  const payload = {
    nom:          serviceData.name || serviceData.nom,
    medecinChef:  serviceData.chef,
    capaciteLits: serviceData.capacity,
    description:  serviceData.description || null,
  };
  const { data } = await api.post('/services', payload);
  return normalizeService(data);
}

/**
 * PUT /api/services/:id — Modifier un service (infos + occupation des lits).
 * Le backend fait un COALESCE : seuls les champs fournis sont mis à jour.
 */
export async function updateService(id, serviceData) {
  const payload = {
    nom:          serviceData.name ?? serviceData.nom,
    medecinChef:  serviceData.chef,
    capaciteLits: serviceData.capacity,
    litsOccupes:  serviceData.current,
    description:  serviceData.description ?? null,
  };
  const { data } = await api.put(`/services/${id}`, payload);
  return normalizeService(data);
}

/**
 * DELETE /api/services/:id  (désactivation logique)
 */
export async function deleteService(id) {
  await api.delete(`/services/${id}`);
}
