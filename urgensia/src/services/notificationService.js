import api from './api';

/** GET /api/notifications */
export async function fetchNotifications() {
  const { data } = await api.get('/notifications');
  return data.map(n => ({
    id:             n.id,
    type:           n.type,                    // 'critical'|'warning'|'info'|'success'
    message:        n.message,
    patientId:      n.patient_id ?? null,
    patientNom:     n.patient_nom ?? null,
    patientPrenom:  n.patient_prenom ?? null,
    manchesterNiveau: n.manchester_niveau ?? null,
    read:           n.est_lue,
    date:           n.date_creation,
  }));
}

/** GET /api/notifications/count */
export async function fetchUnreadCount() {
  const { data } = await api.get('/notifications/count');
  return data.count;
}

/** PATCH /api/notifications/:id/lire */
export async function markAsRead(id) {
  await api.patch(`/notifications/${id}/lire`);
}

/** PATCH /api/notifications/lire-tout */
export async function markAllRead() {
  await api.patch('/notifications/lire-tout');
}
