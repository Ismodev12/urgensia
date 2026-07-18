'use strict';

/**
 * ============================================================
 *  URGENSIA — Manchester Triage System (MTS) Engine
 *  Portage fidèle du triageEngine.js frontend + enrichissements
 *  médicaux conformes au protocole MTS officiel.
 * ============================================================
 *
 *  Niveaux :
 *    1 — Critique     → Immédiat        (rouge)
 *    2 — Très Urgent  → 10 minutes      (orange)
 *    3 — Urgent       → 30 minutes      (jaune)
 *    4 — Standard     → 60 minutes      (vert)
 *    5 — Non Urgent   → 120 minutes     (bleu)
 */

// ─── Constantes MTS ──────────────────────────────────────────────────────────

const NIVEAUX = {
  1: { label: 'Critique',    couleur: '#DC2626', bgCouleur: '#FEE2E2', delai: 'Immédiat (0 min)',  service: 'Réanimation',   serviceLabel: 'Réanimation / Urgences Vitales' },
  2: { label: 'Très Urgent', couleur: '#EA580C', bgCouleur: '#FFEDD5', delai: '10 minutes',        service: 'Urgences',      serviceLabel: 'Service des Urgences' },
  3: { label: 'Urgent',      couleur: '#EAB308', bgCouleur: '#FEF9C3', delai: '30 minutes',        service: 'Urgences',      serviceLabel: 'Urgences — Médecine Générale' },
  4: { label: 'Standard',    couleur: '#22C55E', bgCouleur: '#DCFCE7', delai: '60 minutes',        service: 'Urgences',      serviceLabel: 'Médecine Générale' },
  5: { label: 'Non Urgent',  couleur: '#3B82F6', bgCouleur: '#DBEAFE', delai: '2 heures',          service: 'Urgences',      serviceLabel: 'Consultation Externe' },
};

// Libellés d'affichage par service (orientation par spécialité)
const SERVICES_META = {
  'Réanimation': 'Réanimation / Urgences Vitales',
  'Cardiologie': 'Service de Cardiologie',
  'Neurologie':  'Service de Neurologie',
  'Pédiatrie':   'Service de Pédiatrie',
  'Chirurgie':   'Service de Chirurgie',
  'Urgences':    'Service des Urgences',
};

const RECOMMANDATIONS = {
  1: [
    'Transfert immédiat en salle de réanimation',
    'Mise en place voie veineuse périphérique',
    'Monitoring continu (FC, PA, SpO₂)',
    'Appel médecin de garde immédiat',
    'Préparation chariot d\'urgence',
  ],
  2: [
    'Prise en charge dans les 10 minutes',
    'Évaluation médicale prioritaire',
    'Monitoring des constantes vitales',
    'Bilan sanguin en urgence si nécessaire',
    'Installation en box de soins',
  ],
  3: [
    'Prise en charge dans les 30 minutes',
    'Évaluation clinique complète',
    'Surveillance régulière des constantes',
    'Antalgiques si douleur > 5/10',
    'Bilan complémentaire selon clinique',
  ],
  4: [
    'Prise en charge dans l\'heure',
    'Consultation médicale standard',
    'Surveillance des symptômes',
    'Hydratation si nécessaire',
    'Traitement symptomatique',
  ],
  5: [
    'Prise en charge dans les 2 heures',
    'Consultation médicale planifiée',
    'Pas de risque vital identifié',
    'Réévaluation si aggravation',
    'Possibilité de renvoi en consultation externe',
  ],
};

// ─── Utilitaires internes ─────────────────────────────────────────────────────

const toInt   = (v) => (v !== null && v !== undefined && v !== '' ? parseInt(v, 10)   : null);
const toFloat = (v) => (v !== null && v !== undefined && v !== '' ? parseFloat(v)      : null);
const bool    = (v) => v === true || v === 'true' || v === 1;

/**
 * Évalue si les constantes vitales sont compatibles avec un état critique.
 * Critères MTS niveau 1.
 */
function estCritique(d) {
  const spo2 = toInt(d.saturationOxygene);
  const fc   = toInt(d.frequenceCardiaque);
  const tas  = toInt(d.tensionSystolique);

  return (
    // Détresse respiratoire sévère ou choc cardiogénique
    (bool(d.douleurThoracique) && (bool(d.difficultéRespiratoire) || d.echelleDouleur >= 9)) ||
    // Hypoxémie grave
    (spo2 !== null && spo2 < 90) ||
    // Arythmie grave
    (fc !== null && (fc > 140 || fc < 40)) ||
    // Choc hémodynamique
    (tas !== null && tas < 70) ||
    // Altération de la conscience
    bool(d.perteConnaissance) ||
    // Convulsions avec perte de conscience
    (bool(d.convulsions) && bool(d.perteConnaissance)) ||
    // Hémorragie + détresse respiratoire (hémothorax)
    (bool(d.hemorragie) && bool(d.difficultéRespiratoire))
  );
}

/**
 * Évalue si le patient est très urgent (niveau 2).
 * Critères MTS niveau 2.
 */
function estTresUrgent(d) {
  const spo2 = toInt(d.saturationOxygene);
  const fc   = toInt(d.frequenceCardiaque);
  const tas  = toInt(d.tensionSystolique);

  return (
    (bool(d.douleurThoracique) && d.echelleDouleur >= 7) ||
    (bool(d.difficultéRespiratoire) && spo2 !== null && spo2 < 94) ||
    (bool(d.hemorragie) && d.echelleDouleur >= 7) ||
    (bool(d.traumatisme) && bool(d.douleurThoracique)) ||
    bool(d.convulsions) ||
    (fc !== null && fc > 120) ||
    (tas !== null && tas < 90) ||
    (spo2 !== null && spo2 < 94) ||
    (d.echelleDouleur >= 8 && (bool(d.hemorragie) || bool(d.traumatisme)))
  );
}

/**
 * Évalue si le patient est urgent (niveau 3).
 * Critères MTS niveau 3.
 */
function estUrgent(d) {
  const temp = toFloat(d.temperature);

  return (
    (bool(d.fievre) && temp !== null && temp >= 39) ||
    (bool(d.douleurThoracique) && d.echelleDouleur >= 5) ||
    bool(d.difficultéRespiratoire) ||
    (bool(d.hemorragie) && !bool(d.traumatisme)) ||
    (bool(d.traumatisme) && d.echelleDouleur >= 5) ||
    d.echelleDouleur >= 6 ||
    bool(d.malaise) ||
    (bool(d.convulsions) && !bool(d.perteConnaissance)) ||
    (bool(d.brulures) && d.echelleDouleur >= 5) ||
    (bool(d.vomissements) && temp !== null && temp >= 38.5)
  );
}

/**
 * Évalue si le patient est en catégorie standard (niveau 4).
 */
function estStandard(d) {
  const temp = toFloat(d.temperature);

  return (
    (bool(d.fievre) && temp !== null && temp >= 38) ||
    bool(d.vomissements) ||
    d.echelleDouleur >= 3 ||
    bool(d.malaise) ||
    (bool(d.traumatisme) && d.echelleDouleur < 5)
  );
}

// ─── Génération du résumé clinique ───────────────────────────────────────────

function genererResumeClinique(d, niveau) {
  const symptomesPresents = [];
  if (bool(d.douleurThoracique))      symptomesPresents.push('douleur thoracique');
  if (bool(d.difficultéRespiratoire)) symptomesPresents.push('difficultés respiratoires');
  if (bool(d.hemorragie))             symptomesPresents.push('hémorragie');
  if (bool(d.traumatisme))            symptomesPresents.push('traumatisme');
  if (bool(d.fievre))                 symptomesPresents.push('fièvre');
  if (bool(d.vomissements))           symptomesPresents.push('vomissements');
  if (bool(d.malaise))                symptomesPresents.push('malaise');
  if (bool(d.perteConnaissance))      symptomesPresents.push('perte de connaissance');
  if (bool(d.convulsions))            symptomesPresents.push('convulsions');
  if (bool(d.brulures))               symptomesPresents.push('brûlures');
  if (bool(d.cephalees))              symptomesPresents.push('céphalées');
  if (bool(d.diarrhee))               symptomesPresents.push('diarrhée');

  const symptomesText = symptomesPresents.length > 0
    ? `présentant ${symptomesPresents.join(', ')}`
    : 'sans symptôme majeur identifié';

  const constantes = [];
  if (d.temperature)      constantes.push(`température ${d.temperature}°C`);
  if (d.tensionSystolique && d.tensionDiastolique)
    constantes.push(`TA ${d.tensionSystolique}/${d.tensionDiastolique} mmHg`);
  if (d.frequenceCardiaque) constantes.push(`FC ${d.frequenceCardiaque} bpm`);
  if (d.saturationOxygene)  constantes.push(`SpO₂ ${d.saturationOxygene}%`);

  const constantesText = constantes.length > 0
    ? ` Constantes vitales : ${constantes.join(', ')}.`
    : '';

  const douleurText = d.echelleDouleur > 0
    ? ` Intensité de la douleur : ${d.echelleDouleur}/10.`
    : '';

  const descriptions = {
    1: 'Situation clinique critique nécessitant une prise en charge immédiate.',
    2: 'Situation très urgente nécessitant une évaluation médicale rapide.',
    3: 'Situation urgente nécessitant une prise en charge dans les 30 minutes.',
    4: 'Situation standard, prise en charge dans l\'heure recommandée.',
    5: 'Situation non urgente, consultation planifiable.',
  };

  return `Patient ${symptomesText}.${constantesText}${douleurText} ${descriptions[niveau]}`;
}

// ─── Calcul du score de détail ────────────────────────────────────────────────

function calculerScoreDetail(d) {
  return {
    symptomesCritiques: [
      bool(d.douleurThoracique) && 'Douleur thoracique',
      bool(d.difficultéRespiratoire) && 'Difficulté respiratoire',
      bool(d.hemorragie) && 'Hémorragie',
      bool(d.perteConnaissance) && 'Perte de connaissance',
      bool(d.convulsions) && 'Convulsions',
      bool(d.traumatisme) && 'Traumatisme',
    ].filter(Boolean),
    symptomesModeres: [
      bool(d.fievre) && 'Fièvre',
      bool(d.vomissements) && 'Vomissements',
      bool(d.malaise) && 'Malaise',
      bool(d.brulures) && 'Brûlures',
      bool(d.cephalees) && 'Céphalées',
      bool(d.diarrhee) && 'Diarrhée',
    ].filter(Boolean),
    constantes: {
      temperature:         toFloat(d.temperature),
      tensionSystolique:   toInt(d.tensionSystolique),
      tensionDiastolique:  toInt(d.tensionDiastolique),
      frequenceCardiaque:  toInt(d.frequenceCardiaque),
      saturationOxygene:   toInt(d.saturationOxygene),
      echelleDouleur:      d.echelleDouleur || 0,
    },
    agePediatrique: toInt(d.age) !== null && toInt(d.age) < 15,
  };
}

// ─── Choix du service d'orientation (par spécialité) ─────────────────────────

/**
 * Choisit le service d'accueil selon le symptôme dominant, PAR-DESSUS le niveau
 * de gravité. Règles (ordre de priorité) :
 *   1. Niveau 1 (urgence vitale)      → Réanimation (prime sur tout)
 *   2. Patient de moins de 15 ans     → Pédiatrie
 *   3. Douleur thoracique             → Cardiologie
 *   4. Perte de connaissance / convulsions / céphalées → Neurologie
 *   5. Traumatisme / hémorragie / brûlures → Chirurgie
 *   6. Par défaut                     → Urgences (médecine générale)
 *
 * @returns {{ service: string, motif: string }}
 */
function choisirService(d, niveau) {
  if (niveau === 1) return { service: 'Réanimation', motif: 'urgence vitale' };

  const age = toInt(d.age);
  if (age !== null && age < 15)  return { service: 'Pédiatrie',   motif: 'patient pédiatrique (moins de 15 ans)' };
  if (bool(d.douleurThoracique)) return { service: 'Cardiologie', motif: 'douleur thoracique' };
  if (bool(d.perteConnaissance) || bool(d.convulsions) || bool(d.cephalees))
                                 return { service: 'Neurologie',  motif: 'signe neurologique' };
  if (bool(d.traumatisme) || bool(d.hemorragie) || bool(d.brulures))
                                 return { service: 'Chirurgie',   motif: 'traumatisme ou plaie' };
  return { service: 'Urgences', motif: 'médecine générale d\'urgence' };
}

// ─── Fonction principale exportée ────────────────────────────────────────────

/**
 * Calcule le niveau Manchester d'un patient selon le protocole MTS.
 *
 * @param {Object} formData - Données du formulaire de triage
 * @param {boolean} formData.douleurThoracique
 * @param {boolean} formData.difficultéRespiratoire
 * @param {boolean} formData.hemorragie
 * @param {boolean} formData.traumatisme
 * @param {boolean} formData.perteConnaissance
 * @param {boolean} formData.convulsions
 * @param {boolean} formData.fievre
 * @param {boolean} formData.vomissements
 * @param {boolean} formData.malaise
 * @param {boolean} formData.brulures
 * @param {boolean} formData.cephalees
 * @param {boolean} formData.diarrhee
 * @param {number}  formData.temperature
 * @param {number}  formData.tensionSystolique
 * @param {number}  formData.tensionDiastolique
 * @param {number}  formData.frequenceCardiaque
 * @param {number}  formData.saturationOxygene
 * @param {number}  formData.echelleDouleur  (0–10)
 * @param {number}  formData.age
 *
 * @returns {{
 *   niveau: number,
 *   label: string,
 *   couleur: string,
 *   bgCouleur: string,
 *   delai: string,
 *   service: string,
 *   resumeClinique: string,
 *   recommandations: string[],
 *   scoreDetail: Object
 * }}
 */
function calculerNiveauManchester(formData) {
  // Normalisation : s'assurer que echelleDouleur est un nombre
  const d = {
    ...formData,
    echelleDouleur: toInt(formData.echelleDouleur) || 0,
  };

  let niveau;

  if (estCritique(d))    niveau = 1;
  else if (estTresUrgent(d)) niveau = 2;
  else if (estUrgent(d))     niveau = 3;
  else if (estStandard(d))   niveau = 4;
  else                        niveau = 5;

  const meta = NIVEAUX[niveau];
  const { service, motif } = choisirService(d, niveau);

  return {
    niveau,
    label:          meta.label,
    couleur:        meta.couleur,
    bgCouleur:      meta.bgCouleur,
    delai:          meta.delai,
    service,                                  // ex. « Cardiologie » — sert à résoudre le service_id
    serviceLabel:   SERVICES_META[service] || service,
    serviceMotif:   motif,                    // ex. « douleur thoracique » — transparence de l'orientation
    resumeClinique: genererResumeClinique(d, niveau),
    recommandations: RECOMMANDATIONS[niveau],
    scoreDetail:    calculerScoreDetail(d),
  };
}

module.exports = { calculerNiveauManchester };
