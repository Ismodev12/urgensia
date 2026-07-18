// Niveaux Manchester statiques (indépendant du backend)
const MANCHESTER_LEVELS = [
  { level: 1, label: 'Critique',    color: '#DC2626', bgColor: '#FEE2E2', borderColor: '#FECACA', maxDelay: 'Immédiat' },
  { level: 2, label: 'Très Urgent', color: '#EA580C', bgColor: '#FFEDD5', borderColor: '#FED7AA', maxDelay: '10 minutes' },
  { level: 3, label: 'Urgent',      color: '#EAB308', bgColor: '#FEF9C3', borderColor: '#FEF08A', maxDelay: '30 minutes' },
  { level: 4, label: 'Standard',    color: '#22C55E', bgColor: '#DCFCE7', borderColor: '#BBF7D0', maxDelay: '60 minutes' },
  { level: 5, label: 'Non Urgent',  color: '#3B82F6', bgColor: '#DBEAFE', borderColor: '#BFDBFE', maxDelay: '2 heures'   },
];

export function getManchesterInfo(level) {
  return MANCHESTER_LEVELS.find(m => m.level === level) || MANCHESTER_LEVELS[4];
}

export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(dateString) {
  return `${formatDate(dateString)} à ${formatTime(dateString)}`;
}

export function getWaitingTime(dateString) {
  const arrival = new Date(dateString);
  const now = new Date();
  const diffMs = now - arrival;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins} min`;
  } else {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  }
}

export function getPatientInitials(nom, prenom) {
  return `${(prenom || '').charAt(0)}${(nom || '').charAt(0)}`.toUpperCase();
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function sortPatientsByPriority(patients) {
  return [...patients].sort((a, b) => a.manchesterLevel - b.manchesterLevel);
}

// Libellé lisible d'un rôle (la valeur technique 'agent' reste inchangée en base/routes)
export const ROLE_LABELS = {
  agent:   'Infirmier d\'accueil-triage',
  medecin: 'Médecin',
  admin:   'Administrateur',
};
export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role;
}

export function generatePatientId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `P${timestamp}${random}`;
}
