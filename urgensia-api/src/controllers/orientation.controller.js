'use strict';
const db = require('../config/db');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Récupère la localisation d'un service à partir de son nom MTS.
 * Fait une correspondance partielle (ILIKE) pour gérer les variantes de noms.
 */
async function getLocalisation(serviceNom) {
  if (!serviceNom) return null;

  // Correspondance exacte d'abord
  let { rows } = await db.query(
    `SELECT * FROM localisation_services WHERE service_nom = $1`,
    [serviceNom]
  );
  if (rows[0]) return rows[0];

  // Correspondance partielle (le nom MTS peut être une variante)
  const res = await db.query(
    `SELECT * FROM localisation_services
     WHERE $1 ILIKE '%' || service_nom || '%'
        OR service_nom ILIKE '%' || $1 || '%'
     ORDER BY LENGTH(service_nom) DESC
     LIMIT 1`,
    [serviceNom]
  );
  return res.rows[0] || null;
}

/**
 * Formate une réponse d'orientation complète.
 */
function formatOrientation(localisation, serviceNom) {
  if (!localisation) {
    return {
      serviceNom,
      batiment:    'Bâtiment Principal',
      etage:       'Rez-de-chaussée',
      salle:       null,
      descriptionChemin: 'Renseignez-vous à l\'accueil.',
      planX: 70, planY: 240,
      cheminDepuisAccueil: [{ x: 70, y: 240 }],
      couleurPlan: '#0F766E',
      iconeEmoji:  '🏥',
    };
  }
  return {
    serviceNom:   localisation.service_nom,
    batiment:     localisation.batiment,
    etage:        localisation.etage,
    salle:        localisation.salle,
    descriptionChemin: localisation.description_chemin,
    planX:        localisation.plan_x,
    planY:        localisation.plan_y,
    cheminDepuisAccueil: localisation.chemin_depuis_accueil || [],
    couleurPlan:  localisation.couleur_plan,
    iconeEmoji:   localisation.icone_emoji,
  };
}

// ─── GET /api/orientation/plan ────────────────────────────────────────────────

/**
 * Retourne la liste complète de tous les services avec leurs coordonnées SVG.
 * Public — utilisé pour initialiser le plan interactif.
 */
const getPlan = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT service_nom, batiment, etage, salle,
              plan_x, plan_y, couleur_plan, icone_emoji,
              description_chemin, chemin_depuis_accueil
       FROM localisation_services
       ORDER BY plan_x ASC, plan_y ASC`
    );
    return res.status(200).json(rows.map(r => ({
      serviceNom:          r.service_nom,
      batiment:            r.batiment,
      etage:               r.etage,
      salle:               r.salle,
      planX:               r.plan_x,
      planY:               r.plan_y,
      couleurPlan:         r.couleur_plan,
      iconeEmoji:          r.icone_emoji,
      descriptionChemin:   r.description_chemin,
      cheminDepuisAccueil: r.chemin_depuis_accueil,
    })));
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/orientation/patient/:patientId ──────────────────────────────────

/**
 * Retourne l'orientation complète d'un patient enregistré.
 * Protégé — agent / médecin / admin.
 */
const getOrientationPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const { rows } = await db.query(
      `SELECT p.*,
              nm.label       AS manchester_label,
              nm.couleur_hex AS manchester_couleur,
              nm.bg_couleur_hex AS manchester_bg_couleur,
              nm.delai_max   AS manchester_delai,
              s.nom          AS service_nom_db
       FROM patients p
       LEFT JOIN niveaux_manchester nm ON nm.niveau = p.manchester_niveau
       LEFT JOIN services           s  ON s.id      = p.service_id
       WHERE p.id = $1`,
      [patientId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Patient introuvable.' });
    }

    const patient = rows[0];

    // Récupérer la localisation à partir du résumé clinique ou du service DB
    const serviceRechercheNom = patient.service_nom_db || patient.resume_clinique;
    const localisation = await getLocalisation(serviceRechercheNom);

    // Générer le numéro de dossier lisible
    const numDossier = `PAT-${patient.id.substring(0, 8).toUpperCase()}`;

    return res.status(200).json({
      patient: {
        id:        patient.id,
        numDossier,
        nom:       patient.nom,
        prenom:    patient.prenom,
        age:       patient.age,
        sexe:      patient.sexe,
        photoUrl:  patient.photo_url,
        dateArrivee: patient.date_arrivee,
        statut:    patient.statut,
      },
      triage: {
        manchesterNiveau:  patient.manchester_niveau,
        manchesterLabel:   patient.manchester_label,
        manchesterCouleur: patient.manchester_couleur,
        manchesterBgCouleur: patient.manchester_bg_couleur,
        manchesterDelai:   patient.manchester_delai,
        resumeClinique:    patient.resume_clinique,
      },
      orientation: formatOrientation(localisation, serviceRechercheNom),
    });

  } catch (err) {
    next(err);
  }
};

// ─── GET /api/orientation/pretriage/:code ─────────────────────────────────────

/**
 * Retourne l'orientation d'un pré-triage citoyen par code de suivi.
 * Public — affiché sur la page d'orientation depuis la maison.
 */
const getOrientationPreTriage = async (req, res, next) => {
  try {
    const { code } = req.params;

    const { rows } = await db.query(
      `SELECT pt.*,
              nm.label       AS manchester_label,
              nm.couleur_hex AS manchester_couleur,
              nm.bg_couleur_hex AS manchester_bg_couleur,
              nm.delai_max   AS manchester_delai
       FROM pre_triages pt
       LEFT JOIN niveaux_manchester nm ON nm.niveau = pt.manchester_niveau
       WHERE pt.code_suivi = $1 AND pt.expire_le > NOW()`,
      [code.toUpperCase()]
    );

    if (!rows[0]) {
      return res.status(404).json({
        error: 'Code de pré-triage introuvable ou expiré.'
      });
    }

    const pt = rows[0];
    const localisation = await getLocalisation(pt.service_oriente);

    const numDossier = pt.code_suivi;

    return res.status(200).json({
      patient: {
        id:        pt.id,
        numDossier,
        nom:       pt.nom,
        prenom:    pt.prenom,
        age:       pt.age,
        sexe:      pt.sexe,
        photoUrl:  null,
        dateArrivee: pt.date_creation,
        statut:    pt.statut,
      },
      triage: {
        manchesterNiveau:  pt.manchester_niveau,
        manchesterLabel:   pt.manchester_label,
        manchesterCouleur: pt.manchester_couleur,
        manchesterBgCouleur: pt.manchester_bg_couleur,
        manchesterDelai:   pt.manchester_delai,
        resumeClinique:    pt.resume_clinique,
      },
      orientation: formatOrientation(localisation, pt.service_oriente),
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { getPlan, getOrientationPatient, getOrientationPreTriage };
