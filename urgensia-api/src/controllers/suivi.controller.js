'use strict';
const db     = require('../config/db');
const socket = require('../services/socket.service');
const notif  = require('../services/notif.service');

// ─── Fallback orientations par niveau Manchester ──────────────────────────────
const ORIENTATION_FALLBACKS = {
  1: { serviceNom: 'Réanimation / Urgences Vitales', batiment: 'Bâtiment A', etage: 'Rez-de-chaussée', salle: 'Bloc Réanimation',  descriptionChemin: 'Prenez le couloir principal à droite, passez les Urgences et continuez jusqu\'au bout. Le Bloc Réanimation est à l\'extrémité.', couleurPlan: '#B91C1C', iconeEmoji: '❤️‍🔥' },
  2: { serviceNom: 'Service des Urgences',           batiment: 'Bâtiment A', etage: 'Rez-de-chaussée', salle: 'Salles 1 à 3',       descriptionChemin: 'Depuis l\'accueil, prenez le couloir principal à droite. Les Urgences sont la première porte sur votre gauche.',              couleurPlan: '#DC2626', iconeEmoji: '🚨' },
  3: { serviceNom: 'Urgences — Médecine Générale',   batiment: 'Bâtiment A', etage: 'Rez-de-chaussée', salle: 'Aile D',             descriptionChemin: 'Depuis l\'accueil, tournez à droite dans le couloir principal, puis prenez le premier couloir à droite. Médecine Générale est au fond.', couleurPlan: '#0F766E', iconeEmoji: '🩺' },
  4: { serviceNom: 'Médecine Générale',              batiment: 'Bâtiment A', etage: 'Rez-de-chaussée', salle: 'Aile D',             descriptionChemin: 'Depuis l\'accueil, tournez à droite dans le couloir principal, puis prenez le premier couloir à droite. Médecine Générale est au fond.', couleurPlan: '#22C55E', iconeEmoji: '🩺' },
  5: { serviceNom: 'Consultation Externe',           batiment: 'Bâtiment B', etage: 'Sous-sol',         salle: 'Bloc Radiologie R-0', descriptionChemin: 'Prenez l\'ascenseur central jusqu\'au sous-sol. Suivez les panneaux "Consultation Externe" (flèches bleues).',                     couleurPlan: '#3B82F6', iconeEmoji: '🔬' },
};

// ─── GET /api/suivi/:code ──────────────────────────────────────────────────────

/**
 * GET /api/suivi/:code
 * Retourne l'orientation + position en file d'un patient triage par l'infirmier.
 * Le code est le code_suivi généré lors du triage infirmier.
 * Public — aucune authentification requise.
 */
const getSuiviPatient = async (req, res, next) => {
  try {
    const { code } = req.params;
    const codeSuivi = code.toUpperCase().trim();

    // ── 1. Récupérer le patient avec son service et triage courant ─────────
    const { rows } = await db.query(
      `SELECT p.*,
              nm.label          AS manchester_label,
              nm.couleur_hex    AS manchester_couleur,
              nm.bg_couleur_hex AS manchester_bg_couleur,
              nm.delai_max      AS manchester_delai,
              s.nom             AS service_nom,
              t.service_oriente AS triage_service_oriente
       FROM patients p
       LEFT JOIN niveaux_manchester nm ON nm.niveau = p.manchester_niveau
       LEFT JOIN services           s  ON s.id      = p.service_id
       LEFT JOIN triages            t  ON t.patient_id = p.id AND t.est_courant = TRUE
       WHERE p.code_suivi = $1`,
      [codeSuivi]
    );

    if (!rows[0]) {
      return res.status(404).json({
        error: 'Code de suivi introuvable. Vérifiez le code communiqué par l\'infirmier.'
      });
    }

    const p = rows[0];

    // ── 2. Calculer la position en file ────────────────────────────────────
    let position = null;
    let patientsDevant = null;
    let estimationMinutes = null;

    if (p.statut === 'en_attente' || p.statut === 'en_cours') {
      const { rows: posRows } = await db.query(
        `SELECT
           COUNT(*) FILTER (
             WHERE manchester_niveau < $1
             AND statut IN ('en_attente','en_cours')
             AND id != $2
           ) AS devant_priorite,
           COUNT(*) FILTER (
             WHERE manchester_niveau = $1
             AND statut IN ('en_attente','en_cours')
             AND date_arrivee < $3
             AND id != $2
           ) AS meme_niveau_avant
         FROM patients
         WHERE statut IN ('en_attente', 'en_cours')`,
        [p.manchester_niveau, p.id, p.date_arrivee]
      );

      const devantPriorite  = parseInt(posRows[0].devant_priorite, 10);
      const memeNiveauAvant = parseInt(posRows[0].meme_niveau_avant, 10);
      position       = devantPriorite + memeNiveauAvant;
      patientsDevant = position;

      const delaisParNiveau = { 1: 0, 2: 10, 3: 30, 4: 60, 5: 120 };
      const delaiBase = delaisParNiveau[p.manchester_niveau] || 60;
      estimationMinutes = delaiBase + (devantPriorite * 5);
    }

    // ── 3. Résoudre l'orientation ──────────────────────────────────────────
    // Stratégie multi-étape pour garantir qu'une orientation est toujours fournie :
    //   a) Match par service_nom → localisation_services (exact)
    //   b) Match par triage_service_oriente → localisation_services (partiel)
    //   c) Fallback par niveau Manchester

    let orientation = null;
    const serviceNomRecherche = p.service_nom || p.triage_service_oriente;

    if (serviceNomRecherche) {
      // Tentative a) : match exact par nom de service DB
      const { rows: locRows } = await db.query(
        `SELECT * FROM localisation_services
         WHERE service_nom ILIKE $1
            OR $1 ILIKE '%' || service_nom || '%'
            OR service_nom ILIKE '%' || $1 || '%'
         ORDER BY CASE WHEN service_nom ILIKE $1 THEN 0 ELSE 1 END
         LIMIT 1`,
        [serviceNomRecherche]
      );

      if (locRows[0]) {
        const ls = locRows[0];
        orientation = {
          serviceNom:          ls.service_nom,
          batiment:            ls.batiment,
          etage:               ls.etage,
          salle:               ls.salle,
          descriptionChemin:   ls.description_chemin,
          planX:               ls.plan_x,
          planY:               ls.plan_y,
          couleurPlan:         ls.couleur_plan,
          iconeEmoji:          ls.icone_emoji,
          cheminDepuisAccueil: ls.chemin_depuis_accueil || [],
        };
      }
    }

    // Fallback : orientation par défaut basée sur le niveau Manchester
    if (!orientation) {
      const fb = ORIENTATION_FALLBACKS[p.manchester_niveau] || ORIENTATION_FALLBACKS[4];
      orientation = {
        serviceNom:          p.service_nom || fb.serviceNom,
        batiment:            fb.batiment,
        etage:               fb.etage,
        salle:               fb.salle,
        descriptionChemin:   fb.descriptionChemin,
        planX:               null,
        planY:               null,
        couleurPlan:         fb.couleurPlan,
        iconeEmoji:          fb.iconeEmoji,
        cheminDepuisAccueil: [],
      };
    }

    return res.status(200).json({
      id:               p.id,
      codeSuivi:        p.code_suivi,
      nom:              p.nom,
      prenom:           p.prenom,
      age:              p.age,
      sexe:             p.sexe,
      statut:           p.statut,
      manchesterNiveau: p.manchester_niveau,
      manchesterLabel:  p.manchester_label,
      manchesterCouleur: p.manchester_couleur,
      manchesterBgCouleur: p.manchester_bg_couleur,
      manchesterDelai:  p.manchester_delai,
      resumeClinique:   p.resume_clinique,
      serviceNom:       p.service_nom,
      orientation,
      position,
      patientsDevant,
      estimationMinutes,
      dateArrivee:      p.date_arrivee,
      datePriseEnCharge: p.date_prise_en_charge,
      dateSortie:        p.date_sortie,
    });

  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/suivi/generer-code/:patientId
 * Génère et enregistre un code_suivi pour un patient existant.
 * Protégé — agent authentifié.
 */
const genererCodeSuivi = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // Vérifier que le patient existe
    const { rows: existRows } = await db.query(
      `SELECT id, code_suivi, nom, prenom FROM patients WHERE id = $1`,
      [patientId]
    );

    if (!existRows[0]) {
      return res.status(404).json({ error: 'Patient non trouvé.' });
    }

    // Si le code existe déjà, le retourner
    if (existRows[0].code_suivi) {
      return res.status(200).json({
        codeSuivi: existRows[0].code_suivi,
        patientId,
        nom:    existRows[0].nom,
        prenom: existRows[0].prenom,
      });
    }

    // Générer un nouveau code unique
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codeSuivi;
    let attempts = 0;

    do {
      let suffix = '';
      for (let i = 0; i < 6; i++) {
        suffix += chars[Math.floor(Math.random() * chars.length)];
      }
      codeSuivi = `PAT-${suffix}`;

      const { rows: check } = await db.query(
        'SELECT id FROM patients WHERE code_suivi = $1',
        [codeSuivi]
      );
      if (check.length === 0) break;
      attempts++;
    } while (attempts < 10);

    // Enregistrer le code
    const { rows } = await db.query(
      `UPDATE patients SET code_suivi = $1 WHERE id = $2 RETURNING id, code_suivi, nom, prenom`,
      [codeSuivi, patientId]
    );

    return res.status(200).json({
      codeSuivi: rows[0].code_suivi,
      patientId: rows[0].id,
      nom:       rows[0].nom,
      prenom:    rows[0].prenom,
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { getSuiviPatient, genererCodeSuivi };
