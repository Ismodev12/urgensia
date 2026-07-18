import api from './api';

/**
 * GET /api/stats/dashboard — KPIs globaux
 */
export async function getDashboardStats() {
  const { data } = await api.get('/stats/dashboard');
  return data;
}

/**
 * GET /api/stats/weekly — Activité 7 derniers jours
 */
export async function getWeeklyStats() {
  const { data } = await api.get('/stats/weekly');
  // Adapter les noms pour recharts (qui attend { jour, patients, critiques })
  return data.map(row => ({
    jour:      row.jour,
    date:      row.date,
    patients:  parseInt(row.patients,  10) || 0,
    critiques: parseInt(row.critiques, 10) || 0,
  }));
}

/**
 * GET /api/stats/services — Occupation des services
 */
export async function getServicesStats() {
  const { data } = await api.get('/stats/services');
  return data;
}

/**
 * GET /api/stats/analytics — Indicateurs avancés
 * (temps d'attente moyen par niveau, affluence horaire, réévaluations dépassées)
 */
export async function getAnalytics() {
  const { data } = await api.get('/stats/analytics');
  return data;
}

/**
 * GET /api/stats/audit — Journal d'audit (admin)
 */
export async function getJournalAudit(limit = 50, offset = 0) {
  const { data } = await api.get('/stats/audit', { params: { limit, offset } });
  return data;
}

/**
 * GET /api/stats/rapport-journalier — Télécharge le PDF du rapport du jour
 */
export async function telechargerRapportJournalier() {
  await telechargerPdf('/stats/rapport-journalier', 'rapport_urgensia');
}

/**
 * GET /api/stats/resume-prises-en-charge — PDF détaillé des patients pris en charge
 * (une fiche clinique complète par patient).
 */
export async function telechargerResumePrisEnCharge() {
  await telechargerPdf('/stats/resume-prises-en-charge', 'resume_prises_en_charge');
}

/** Télécharge un endpoint PDF (blob) avec un nom de fichier daté. */
async function telechargerPdf(endpoint, prefix) {
  const response = await api.get(endpoint, { responseType: 'blob' });
  const today = new Date().toISOString().split('T')[0];
  const url   = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `${prefix}_${today}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
