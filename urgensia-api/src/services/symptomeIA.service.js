'use strict';
const Groq = require('groq-sdk');
const env = require('../config/env');

/**
 * ============================================================
 *  Interprétation de symptômes en TEXTE LIBRE via l'API Groq.
 *  Fournisseur gratuit (modèles Llama). Modèle par défaut :
 *  llama-3.3-70b-versatile (modifiable via GROQ_MODEL).
 * ============================================================
 *  L'infirmier d'accueil-triage décrit un symptôme absent de la liste ;
 *  l'IA le traduit en drapeaux booléens exploitables par le moteur de
 *  triage Manchester (triage.service.js).
 *
 *  ⚠️ AIDE À LA DÉCISION UNIQUEMENT : l'infirmier valide toujours le
 *  résultat avant l'évaluation. L'IA ne pose aucun diagnostic.
 */

// Clés ASCII (produites par l'IA) → clés EXACTES lues par le moteur / le front.
// « difficultéRespiratoire » porte un accent côté moteur : on le rétablit ici.
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

// JSON mode Groq : la réponse est garantie être un JSON valide.
// On décrit la structure EXACTE attendue dans la consigne.
const SYSTEME = `Tu assistes un infirmier d'accueil-triage aux urgences au Bénin. À partir d'une description libre de symptômes (français courant, parfois expressions locales), tu identifies lesquels des symptômes ci-dessous sont présents, pour alimenter un moteur de triage Manchester.

Symptômes possibles (ne mets à true QUE ceux clairement indiqués) :
${DEFINITIONS}

Réponds UNIQUEMENT par un objet JSON valide (aucun texte autour), avec EXACTEMENT ces clés :
- les 12 symptômes ci-dessus en booléens (douleurThoracique, difficulteRespiratoire, fievre, vomissements, cephalees, malaise, hemorragie, traumatisme, perteConnaissance, convulsions, brulures, diarrhee)
- "echelleDouleur" : entier de 0 à 10 (intensité de la douleur si décrite, sinon 0)
- "resume" : une phrase courte, en français, résumant ce que tu as compris

Règles : sois prudent, mets true uniquement si le texte l'indique clairement, sinon false. N'invente rien, ne pose aucun diagnostic. Tu es une aide à la décision : l'infirmier valide toujours.`;

let client = null;
function getClient() {
  if (!env.groqApiKey) return null;
  if (!client) client = new Groq({ apiKey: env.groqApiKey, timeout: 30000 });
  return client;
}

/** Vrai si la fonctionnalité est configurée (clé API présente). */
function estDisponible() {
  return Boolean(env.groqApiKey);
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

  const completion = await cli.chat.completions.create({
    model:           env.groqModel,   // llama-3.3-70b-versatile par défaut
    temperature:     0,               // classification déterministe
    max_tokens:      1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEME },
      { role: 'user',   content: texte },
    ],
  });

  const raw    = completion.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);

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
