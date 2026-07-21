'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

/**
 * ============================================================
 *  Interprétation de symptômes en TEXTE LIBRE via l'API Claude.
 * ============================================================
 *  L'infirmier d'accueil-triage décrit un symptôme absent de la liste ;
 *  l'IA le traduit en drapeaux booléens exploitables par le moteur de
 *  triage Manchester (triage.service.js).
 *
 *  ⚠️ AIDE À LA DÉCISION UNIQUEMENT : l'infirmier valide toujours le
 *  résultat avant l'évaluation. L'IA ne pose aucun diagnostic.
 */

// Clés ASCII (produites par l'IA) → clés EXACTES lues par le moteur / le front.
// « difficultéRespiratoire » porte un accent côté moteur : on le rétablit ici,
// ce qui évite tout souci d'encodage dans le schéma JSON envoyé à l'IA.
const MAP_CLES = {
  douleurThoracique:      'douleurThoracique',
  difficulteRespiratoire: 'difficultéRespiratoire',
  fievre:                 'fievre',
  vomissements:           'vomissements',
  cephalees:              'cephalees',
  malaise:                'malaise',
  hemorragie:             'hemorragie',
  traumatisme:            'traumatisme',
  perteConnaissance:      'perteConnaissance',
  convulsions:            'convulsions',
  brulures:               'brulures',
  diarrhee:               'diarrhee',
};

const DEFINITIONS = `- douleurThoracique : douleur, oppression ou serrement dans la poitrine
- difficulteRespiratoire : essoufflement, dyspnée, gêne ou difficulté à respirer
- fievre : température élevée, fièvre, corps chaud, frissons
- vomissements : vomissements ou nausées avec rejet
- cephalees : maux de tête, migraine
- malaise : malaise général, faiblesse, vertiges, étourdissement
- hemorragie : saignement abondant
- traumatisme : choc, blessure, chute, fracture, accident, plaie
- perteConnaissance : évanouissement, perte de conscience, syncope
- convulsions : crises convulsives, spasmes, tremblements incontrôlés
- brulures : brûlures cutanées
- diarrhee : selles liquides répétées`;

const SYSTEME = `Tu assistes un infirmier d'accueil-triage aux urgences au Bénin. À partir d'une description libre de symptômes (français courant, parfois expressions locales), tu identifies lesquels des symptômes ci-dessous sont présents, pour alimenter un moteur de triage Manchester.

Symptômes possibles (ne mets à true QUE ceux clairement indiqués) :
${DEFINITIONS}

Règles :
- Sois prudent : mets true uniquement si le texte l'indique clairement, sinon false. N'invente rien, ne déduis pas un diagnostic.
- echelleDouleur : entier de 0 à 10 si une intensité de douleur est décrite (ex. « douleur atroce » ≈ 9, « légère gêne » ≈ 2), sinon 0.
- resume : une phrase courte, en français, résumant ce que tu as compris.
Tu es une aide à la décision : l'infirmier valide toujours. Tu ne poses aucun diagnostic.`;

// Sortie structurée : garantit un JSON conforme (tous les drapeaux + douleur + résumé).
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...Object.fromEntries(Object.keys(MAP_CLES).map((k) => [k, { type: 'boolean' }])),
    echelleDouleur: { type: 'integer', description: '0 à 10 ; 0 si aucune intensité décrite' },
    resume:         { type: 'string' },
  },
  required: [...Object.keys(MAP_CLES), 'echelleDouleur', 'resume'],
};

let client = null;
function getClient() {
  if (!env.anthropicApiKey) return null;
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey, timeout: 30000 });
  return client;
}

/** Vrai si la fonctionnalité est configurée (clé API présente). */
function estDisponible() {
  return Boolean(env.anthropicApiKey);
}

/**
 * Traduit une description libre en symptômes exploitables par le triage.
 * @param {string} texte  Description saisie par l'infirmier.
 * @returns {Promise<{ symptomes: Object<string,true>, echelleDouleur: number, resume: string }>}
 */
async function interpreterSymptomes(texte) {
  const cli = getClient();
  if (!cli) {
    const err = new Error('Assistance IA non configurée (clé API manquante).');
    err.code = 'IA_INDISPONIBLE';
    throw err;
  }

  const message = await cli.messages.create({
    model:      env.anthropicModel,   // claude-opus-4-8 par défaut (ANTHROPIC_MODEL pour changer)
    max_tokens: 1024,
    system:     SYSTEME,
    messages:   [{ role: 'user', content: texte }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  });

  const bloc   = message.content.find((b) => b.type === 'text');
  const parsed = JSON.parse(bloc ? bloc.text : '{}');

  // ASCII → clés exactes du moteur ; on ne conserve que les symptômes à true.
  const symptomes = {};
  for (const [asciiKey, frontKey] of Object.entries(MAP_CLES)) {
    if (parsed[asciiKey] === true) symptomes[frontKey] = true;
  }

  let echelle = parseInt(parsed.echelleDouleur, 10);
  if (Number.isNaN(echelle)) echelle = 0;
  echelle = Math.min(10, Math.max(0, echelle));

  return {
    symptomes,
    echelleDouleur: echelle,
    resume: typeof parsed.resume === 'string' ? parsed.resume : '',
  };
}

module.exports = { interpreterSymptomes, estDisponible };
