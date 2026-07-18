// URGENSIA - Triage Engine based on Manchester Triage System

export function calculateManchesterLevel(formData) {
  const {
    douleurThoracique,
    difficultéRespiratoire,
    hemorragie,
    traumatisme,
    perteConnaissance,
    convulsions,
    fievre,
    vomissements,
    malaise,
    brulures,
    temperature,
    tensionSystolique,
    tensionDiastolique,
    frequenceCardiaque,
    saturationOxygene,
    echelleDouleur,
    age,
  } = formData;

  // Level 1 - Critique: Immediate
  if (
    (douleurThoracique && (difficultéRespiratoire || echelleDouleur >= 9)) ||
    (saturationOxygene && parseInt(saturationOxygene) < 90) ||
    (frequenceCardiaque && (parseInt(frequenceCardiaque) > 140 || parseInt(frequenceCardiaque) < 40)) ||
    (tensionSystolique && parseInt(tensionSystolique) < 70) ||
    perteConnaissance ||
    (convulsions && perteConnaissance) ||
    (hemorragie && difficultéRespiratoire)
  ) {
    return {
      level: 1,
      label: 'Critique',
      color: '#DC2626',
      bgColor: '#FEE2E2',
      maxDelay: 'Immédiat (0 min)',
      service: 'Réanimation / Urgences Vitales',
      resume: generateClinicalSummary(formData, 1),
      recommendations: [
        'Transfert immédiat en salle de réanimation',
        'Mise en place voie veineuse périphérique',
        'Monitoring continu (FC, PA, SpO2)',
        'Appel médecin de garde immédiat',
        'Préparation chariot d\'urgence',
      ],
    };
  }

  // Level 2 - Très Urgent: 10 min
  if (
    (douleurThoracique && echelleDouleur >= 7) ||
    (difficultéRespiratoire && saturationOxygene && parseInt(saturationOxygene) < 94) ||
    (hemorragie && echelleDouleur >= 7) ||
    (traumatisme && douleurThoracique) ||
    convulsions ||
    (frequenceCardiaque && parseInt(frequenceCardiaque) > 120) ||
    (tensionSystolique && parseInt(tensionSystolique) < 90) ||
    (saturationOxygene && parseInt(saturationOxygene) < 94) ||
    (echelleDouleur >= 8 && (hemorragie || traumatisme))
  ) {
    return {
      level: 2,
      label: 'Très Urgent',
      color: '#EA580C',
      bgColor: '#FFEDD5',
      maxDelay: '10 minutes',
      service: 'Service des Urgences',
      resume: generateClinicalSummary(formData, 2),
      recommendations: [
        'Prise en charge dans les 10 minutes',
        'Évaluation médicale prioritaire',
        'Monitoring des constantes vitales',
        'Bilan sanguin en urgence si nécessaire',
        'Installation en box de soins',
      ],
    };
  }

  // Level 3 - Urgent: 30 min
  if (
    (fievre && temperature && parseFloat(temperature) >= 39) ||
    (douleurThoracique && echelleDouleur >= 5) ||
    difficultéRespiratoire ||
    (hemorragie && !traumatisme) ||
    (traumatisme && echelleDouleur >= 5) ||
    (echelleDouleur >= 6) ||
    malaise ||
    (convulsions && !perteConnaissance) ||
    (brulures && echelleDouleur >= 5) ||
    (vomissements && temperature && parseFloat(temperature) >= 38.5)
  ) {
    return {
      level: 3,
      label: 'Urgent',
      color: '#EAB308',
      bgColor: '#FEF9C3',
      maxDelay: '30 minutes',
      service: 'Médecine Générale / Urgences',
      resume: generateClinicalSummary(formData, 3),
      recommendations: [
        'Prise en charge dans les 30 minutes',
        'Évaluation clinique complète',
        'Surveillance régulière des constantes',
        'Antalgiques si douleur > 5/10',
        'Bilan complémentaire selon clinique',
      ],
    };
  }

  // Level 4 - Standard: 60 min
  if (
    (fievre && temperature && parseFloat(temperature) >= 38) ||
    vomissements ||
    (echelleDouleur >= 3) ||
    malaise ||
    (traumatisme && echelleDouleur < 5)
  ) {
    return {
      level: 4,
      label: 'Standard',
      color: '#22C55E',
      bgColor: '#DCFCE7',
      maxDelay: '60 minutes',
      service: 'Médecine Générale',
      resume: generateClinicalSummary(formData, 4),
      recommendations: [
        'Prise en charge dans l\'heure',
        'Consultation médicale standard',
        'Surveillance des symptômes',
        'Hydratation si nécessaire',
        'Traitement symptomatique',
      ],
    };
  }

  // Level 5 - Non Urgent: 120 min
  return {
    level: 5,
    label: 'Non Urgent',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    maxDelay: '2 heures',
    service: 'Consultation Externe',
    resume: generateClinicalSummary(formData, 5),
    recommendations: [
      'Prise en charge dans les 2 heures',
      'Consultation médicale planifiée',
      'Pas de risque vital identifié',
      'Réévaluation si aggravation',
      'Possibilité de renvoi en consultation externe',
    ],
  };
}

function generateClinicalSummary(formData, level) {
  const symptoms = [];
  if (formData.douleurThoracique) symptoms.push('douleur thoracique');
  if (formData.difficultéRespiratoire) symptoms.push('difficultés respiratoires');
  if (formData.hemorragie) symptoms.push('hémorragie');
  if (formData.traumatisme) symptoms.push('traumatisme');
  if (formData.fievre) symptoms.push('fièvre');
  if (formData.vomissements) symptoms.push('vomissements');
  if (formData.malaise) symptoms.push('malaise');
  if (formData.perteConnaissance) symptoms.push('perte de connaissance');
  if (formData.convulsions) symptoms.push('convulsions');
  if (formData.brulures) symptoms.push('brûlures');

  const symptomsText = symptoms.length > 0
    ? `présentant ${symptoms.join(', ')}`
    : 'sans symptôme majeur identifié';

  const vitalsText = [];
  if (formData.temperature) vitalsText.push(`température ${formData.temperature}°C`);
  if (formData.tensionSystolique && formData.tensionDiastolique)
    vitalsText.push(`TA ${formData.tensionSystolique}/${formData.tensionDiastolique} mmHg`);
  if (formData.frequenceCardiaque) vitalsText.push(`FC ${formData.frequenceCardiaque} bpm`);
  if (formData.saturationOxygene) vitalsText.push(`SpO2 ${formData.saturationOxygene}%`);

  const vitalsString = vitalsText.length > 0 ? ` Constantes vitales : ${vitalsText.join(', ')}.` : '';
  const douleurText = formData.echelleDouleur ? ` Intensité de la douleur : ${formData.echelleDouleur}/10.` : '';

  const levelDescriptions = {
    1: 'Situation clinique critique nécessitant une prise en charge immédiate.',
    2: 'Situation très urgente nécessitant une évaluation médicale rapide.',
    3: 'Situation urgente nécessitant une prise en charge dans les 30 minutes.',
    4: 'Situation standard, prise en charge dans l\'heure recommandée.',
    5: 'Situation non urgente, consultation planifiable.',
  };

  return `Patient ${symptomsText}.${vitalsString}${douleurText} ${levelDescriptions[level]}`;
}
