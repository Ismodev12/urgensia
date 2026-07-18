'use strict';
/**
 * Script de vérification de l'algorithme MTS.
 * Lance : node test-triage.js
 */
const { calculerNiveauManchester } = require('./src/services/triage.service');

const cas = [
  {
    nom: 'Cas 1 — CRITIQUE (SpO2 < 90 + douleur thoracique)',
    data: {
      douleurThoracique: true,
      difficultéRespiratoire: true,
      saturationOxygene: 87,
      frequenceCardiaque: 145,
      echelleDouleur: 9,
    },
    attendu: 1,
  },
  {
    nom: 'Cas 2 — TRÈS URGENT (convulsions)',
    data: {
      convulsions: true,
      echelleDouleur: 6,
      frequenceCardiaque: 125,
    },
    attendu: 2,
  },
  {
    nom: 'Cas 3 — URGENT (fièvre 39.5°C + vomissements)',
    data: {
      fievre: true,
      temperature: 39.5,
      vomissements: true,
      echelleDouleur: 4,
    },
    attendu: 3,
  },
  {
    nom: 'Cas 4 — STANDARD (fièvre 38.2°C)',
    data: {
      fievre: true,
      temperature: 38.2,
      echelleDouleur: 2,
    },
    attendu: 4,
  },
  {
    nom: 'Cas 5 — NON URGENT (aucun symptôme critique)',
    data: {
      echelleDouleur: 1,
    },
    attendu: 5,
  },
];

console.log('\n🏥  URGENSIA — Test de l\'algorithme Manchester Triage System\n');
console.log('═'.repeat(60));

let ok = 0;
let ko = 0;

cas.forEach(({ nom, data, attendu }) => {
  const result = calculerNiveauManchester(data);
  const pass   = result.niveau === attendu;

  if (pass) ok++;
  else ko++;

  const icon  = pass ? '✅' : '❌';
  const color = { 1: '🔴', 2: '🟠', 3: '🟡', 4: '🟢', 5: '🔵' };

  console.log(`\n${icon}  ${nom}`);
  console.log(`   Attendu : N${attendu}  |  Obtenu : N${result.niveau} — ${result.label} ${color[result.niveau]}`);
  console.log(`   Délai   : ${result.delai}`);
  console.log(`   Service : ${result.service}`);
  console.log(`   Résumé  : ${result.resumeClinique.substring(0, 80)}...`);
  if (!pass) {
    console.log(`   ⚠️  ÉCHEC — score: ${JSON.stringify(result.scoreDetail.constantes)}`);
  }
});

console.log('\n' + '═'.repeat(60));
console.log(`\n📊  Résultat : ${ok}/${cas.length} cas corrects (${ko} échec${ko > 1 ? 's' : ''})\n`);

if (ko > 0) process.exit(1);
