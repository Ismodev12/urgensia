/**
 * Normalisation des réponses API (snake_case → camelCase)
 * et mapping des statuts backend → valeurs frontend.
 */

// ─── Statuts patients ─────────────────────────────────────────────────────────
const STATUT_MAP = {
  en_attente:     'En attente',
  en_cours:       'En cours',
  pris_en_charge: 'Pris en charge',
  sorti:          'Sorti',
};

const STATUT_MAP_REVERSE = {
  'En attente':    'en_attente',
  'En cours':      'en_cours',
  'Pris en charge':'pris_en_charge',
  'Sorti':         'sorti',
};

export const toApiStatut  = (statut) => STATUT_MAP_REVERSE[statut] ?? statut;
export const toUiStatut   = (statut) => STATUT_MAP[statut]         ?? statut;

// ─── Patient ──────────────────────────────────────────────────────────────────
export function normalizePatient(raw) {
  if (!raw) return null;
  return {
    id:                   raw.id,
    nom:                  raw.nom,
    prenom:               raw.prenom,
    age:                  raw.age,
    sexe:                 raw.sexe,
    telephone:            raw.telephone,
    adresse:              raw.adresse,
    // Triage
    manchesterLevel:      raw.manchester_niveau ?? raw.manchesterLevel,
    manchesterLabel:      raw.manchester_label  ?? raw.manchesterLabel  ?? '',
    manchesterCouleur:    raw.manchester_couleur ?? '',
    // Service
    service:              raw.service_nom       ?? raw.service ?? '',
    serviceId:            raw.service_id        ?? raw.serviceId ?? null,
    // Statut
    statut:               toUiStatut(raw.statut),
    // Dates
    dateArrivee:          raw.date_arrivee      ?? raw.dateArrivee,
    datePriseEnCharge:    raw.date_prise_en_charge ?? null,
    dateSortie:           raw.date_sortie       ?? null,
    // Constantes
    temperature:          raw.temperature,
    tensionSystolique:    raw.tension_systolique,
    tensionDiastolique:   raw.tension_diastolique,
    frequenceCardiaque:   raw.frequence_cardiaque,
    saturationOxygene:    raw.saturation_oxygene,
    echelleDouleur:       raw.echelle_douleur,
    // Autres
    symptomes:            raw.symptomes ?? [],
    resumeClinique:       raw.resume_clinique ?? '',
    casCritique:          raw.manchester_niveau === 1,
    aReevaluer:           raw.a_reevaluer ?? raw.aReevaluer ?? false,
    dateReevaluation:     raw.date_reevaluation ?? raw.dateReevaluation ?? null,
    photo:                raw.photo_url ?? null,
    // Enregistré par
    enregistrePar:        raw.enregistre_par_nom ?? '',
  };
}

// ─── Utilisateur ──────────────────────────────────────────────────────────────
export function normalizeUser(raw) {
  if (!raw) return null;
  return {
    id:             raw.id,
    nom:            raw.nom,
    prenom:         raw.prenom,
    email:          raw.email,
    role:           raw.role,
    service:        raw.service_nom  ?? raw.service  ?? '',
    serviceId:      raw.service_id   ?? raw.serviceId ?? null,
    telephone:      raw.telephone    ?? '',
    statut:         raw.statut === 'actif' ? 'Actif' : 'Inactif',
    dateCreation:   raw.date_creation ?? raw.dateCreation ?? '',
    photo:          raw.photo_url    ?? null,
  };
}

// ─── Service hospitalier ──────────────────────────────────────────────────────
export function normalizeService(raw) {
  if (!raw) return null;
  return {
    id:             raw.id,
    name:           raw.nom,
    nom:            raw.nom,
    chef:           raw.medecin_chef  ?? raw.chef    ?? '',
    description:    raw.description   ?? '',
    capacity:       raw.capacite_lits ?? raw.capacity ?? 0,
    current:        raw.lits_occupes  ?? raw.current  ?? 0,
    tauxOccupation: raw.taux_occupation ?? 0,
    active:         raw.actif         ?? true,
  };
}

// ─── Résultat de triage (réponse API) ────────────────────────────────────────
export function normalizeTriage(raw) {
  if (!raw) return null;
  const colors = {
    1: { color: '#DC2626', bgColor: '#FEE2E2' },
    2: { color: '#EA580C', bgColor: '#FFEDD5' },
    3: { color: '#EAB308', bgColor: '#FEF9C3' },
    4: { color: '#22C55E', bgColor: '#DCFCE7' },
    5: { color: '#3B82F6', bgColor: '#DBEAFE' },
  };
  const niveau = raw.niveau ?? raw.level ?? 5;
  return {
    level:           niveau,
    label:           raw.label   ?? '',
    color:           raw.couleur ?? colors[niveau]?.color  ?? '#3B82F6',
    bgColor:         colors[niveau]?.bgColor ?? '#DBEAFE',
    maxDelay:        raw.delai   ?? '',
    service:         raw.service ?? '',
    resume:          raw.resumeClinique ?? raw.resume_clinique ?? '',
    recommendations: raw.recommandations ?? [],
    scoreDetail:     raw.scoreDetail ?? null,
  };
}
