'use strict';
const db     = require('../config/db');
const socket = require('./socket.service');

/**
 * Crée une notification en base ET l'envoie via WebSocket.
 */
const creerNotification = async ({ destinataireId, type, message, patientId = null }) => {
  try {
    const { rows } = await db.query(
      `INSERT INTO notifications (destinataire_id, patient_id, type, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [destinataireId, patientId, type, message]
    );
    const notif = rows[0];

    socket.emitNotification(destinataireId, {
      id:        notif.id,
      type:      notif.type,
      message:   notif.message,
      patientId: notif.patient_id,
      date:      notif.date_creation,
    });

    return notif;
  } catch (err) {
    // Non bloquant — les notifications ne doivent jamais faire planter une transaction
    console.error('⚠️  Erreur création notification :', err.message);
    return null;
  }
};

/**
 * Notifie tous les médecins d'un patient critique (niveaux 1 ou 2).
 */
const notifierMedecinsCritique = async (patient) => {
  const { rows: medecins } = await db.query(
    `SELECT id FROM utilisateurs WHERE role = 'medecin' AND statut = 'actif'`
  );

  const niveau      = patient.manchester_niveau;
  const labelNiveau = niveau === 1 ? 'CRITIQUE' : 'TRÈS URGENT';

  await Promise.all(
    medecins.map(m =>
      creerNotification({
        destinataireId: m.id,
        patientId:      patient.id,
        type:           'critical',
        message: `🚨 [${labelNiveau}] Patient ${patient.prenom} ${patient.nom} — Niveau ${niveau} — Service : ${patient.service || 'À définir'} — Prise en charge immédiate requise`,
      })
    )
  );

  // Alerte WebSocket globale médecins
  socket.emitAlerteCritique(patient);
};

/**
 * Notifie tous les agents d'un nouveau patient enregistré.
 * @param {Object} patient - Données du patient
 * @param {Object} triage  - Résultat du triage
 * @param {string} agentId - UUID de l'agent qui a enregistré (pour ne pas se notifier soi-même)
 */
const notifierAgentsNouveauPatient = async (patient, triage, agentId) => {
  const { rows: agents } = await db.query(
    `SELECT id FROM utilisateurs WHERE role = 'agent' AND statut = 'actif' AND id != $1`,
    [agentId]
  );

  const niveau = patient.manchester_niveau ?? triage?.niveau;
  const niveauEmoji = niveau === 1 ? '🔴' : niveau === 2 ? '🟠' : niveau === 3 ? '🟡' : niveau === 4 ? '🟢' : '🔵';
  const service = patient.service || triage?.service || 'À définir';

  const message = `${niveauEmoji} Nouveau patient enregistré : ${patient.prenom} ${patient.nom} — Niveau ${niveau} — ${service}`;

  await Promise.all(
    agents.map(a =>
      creerNotification({
        destinataireId: a.id,
        patientId:      patient.id,
        type:           niveau <= 2 ? 'critical' : niveau === 3 ? 'warning' : 'info',
        message,
      })
    )
  );
};

/**
 * Notifie les agents ET les médecins d'un changement de statut patient.
 */
const notifierChangementStatut = async (patient, nouveauStatut) => {
  const messages = {
    en_cours:       `🔄 Patient ${patient.prenom} ${patient.nom} est maintenant en cours de prise en charge`,
    pris_en_charge: `✅ Patient ${patient.prenom} ${patient.nom} a été pris en charge par l'équipe médicale`,
    sorti:          `🏠 Patient ${patient.prenom} ${patient.nom} est sorti — dossier clos`,
  };

  const msg = messages[nouveauStatut];
  if (!msg) return;

  const type = nouveauStatut === 'pris_en_charge' ? 'success' : 'info';

  // Notifier agents ET médecins
  const { rows: destinataires } = await db.query(
    `SELECT id FROM utilisateurs
     WHERE role IN ('agent', 'medecin') AND statut = 'actif'`
  );

  await Promise.all(
    destinataires.map(u =>
      creerNotification({
        destinataireId: u.id,
        patientId:      patient.id,
        type,
        message:        msg,
      })
    )
  );
};

/**
 * Notifie les infirmiers de triage (agents d'accueil) qu'un patient en attente
 * a dépassé son délai cible et doit être réévalué.
 * @param {Object} patient - { id, nom, prenom, manchester_niveau, code_suivi }
 */
const notifierReevaluationRequise = async (patient) => {
  const { rows: agents } = await db.query(
    `SELECT id FROM utilisateurs WHERE role = 'agent' AND statut = 'actif'`
  );

  const niveau  = patient.manchester_niveau;
  const message = `⏰ Réévaluation requise : ${patient.prenom} ${patient.nom} — Niveau ${niveau} — délai cible dépassé, un nouveau triage est nécessaire`;

  await Promise.all(
    agents.map(a =>
      creerNotification({
        destinataireId: a.id,
        patientId:      patient.id,
        type:           niveau <= 2 ? 'critical' : 'warning',
        message,
      })
    )
  );

  // Émission temps réel (room agents + suivi patient)
  socket.emitReevaluationRequise(patient);
};

module.exports = {
  creerNotification,
  notifierMedecinsCritique,
  notifierAgentsNouveauPatient,
  notifierChangementStatut,
  notifierReevaluationRequise,
};
