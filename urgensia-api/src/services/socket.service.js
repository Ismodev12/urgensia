'use strict';

/**
 * Service WebSocket (socket.io).
 * Centralise toutes les émissions d'événements temps réel.
 *
 * Usage dans les controllers :
 *   const socket = require('../services/socket.service');
 *   socket.emitQueueUpdate(io);
 */

let _io = null;

/** Initialise le service avec l'instance socket.io */
const init = (io) => { _io = io; };

/** Émet vers une room spécifique */
const emit = (room, event, data) => {
  if (!_io) return;
  _io.to(room).emit(event, { ...data, timestamp: new Date().toISOString() });
};

/** Émet vers tous les clients connectés */
const broadcast = (event, data) => {
  if (!_io) return;
  _io.emit(event, { ...data, timestamp: new Date().toISOString() });
};

// ─── Événements métier ────────────────────────────────────────────────────────

/**
 * Nouveau patient enregistré → tous les connectés.
 * @param {Object} patient - Données patient (sans infos sensibles)
 */
const emitNouveauPatient = (patient) => {
  broadcast('patient:new', {
    id: patient.id,
    nom: patient.nom,
    prenom: patient.prenom,
    manchesterNiveau: patient.manchester_niveau,
    service: patient.service,
    statut: patient.statut,
    dateArrivee: patient.date_arrivee,
  });
};

/**
 * Statut patient changé → tous les connectés.
 */
const emitStatutPatient = (patientId, nouveauStatut, manchesterNiveau) => {
  broadcast('patient:status_changed', {
    patientId,
    nouveauStatut,
    manchesterNiveau,
  });
};

/**
 * Mise à jour de la file d'attente → agents + médecins.
 */
const emitQueueUpdate = (stats) => {
  emit('queue', 'queue:update', { stats });
};

/**
 * Alerte critique (niveau 1 ou 2) → médecins.
 * @param {Object} patient
 */
const emitAlerteCritique = (patient) => {
  emit('medecins', 'alert:critical', {
    patientId:   patient.id,
    nom:         patient.nom,
    prenom:      patient.prenom,
    niveau:      patient.manchester_niveau,
    service:     patient.service,
    dateArrivee: patient.date_arrivee,
    message:     `🚨 Patient ${patient.prenom} ${patient.nom} — Niveau ${patient.manchester_niveau} — Prise en charge immédiate`,
  });
};

/**
 * Occupation d'un service mise à jour → admins.
 */
const emitCapaciteService = (service) => {
  emit('admins', 'service:capacity_update', {
    serviceId:   service.id,
    nom:         service.nom,
    litsOccupes: service.lits_occupes,
    capacite:    service.capacite_lits,
    tauxOccupation: Math.round((service.lits_occupes / service.capacite_lits) * 100),
  });
};

/**
 * Nouvelle notification → utilisateur ciblé.
 */
const emitNotification = (userId, notification) => {
  emit(`user:${userId}`, 'notification:new', notification);
};

/**
 * Nouveau pré-triage soumis depuis la maison → agents.
 * @param {Object} pretriage - Données du pré-triage
 */
const emitPreTriageNouveau = (pretriage) => {
  emit('agents', 'pretriage:new', {
    id:               pretriage.id,
    codeSuivi:        pretriage.codeSuivi,
    nom:              pretriage.nom,
    prenom:           pretriage.prenom,
    age:              pretriage.age,
    manchesterNiveau: pretriage.manchesterNiveau,
    manchesterLabel:  pretriage.manchesterLabel,
    manchesterCouleur: pretriage.manchesterCouleur,
    service:          pretriage.service,
    dateCreation:     pretriage.dateCreation,
    message: `🏠 Pré-triage reçu : ${pretriage.prenom} ${pretriage.nom} — N${pretriage.manchesterNiveau}`,
  });
};

/**
 * Mise à jour du statut d'un pré-triage → patient ciblé par son code.
 * @param {string} codeSuivi - ex: 'URG-4X7K'
 * @param {Object} data - Données de mise à jour
 */
const emitPreTriageUpdate = (codeSuivi, data) => {
  emit(`pretriage:${codeSuivi}`, 'pretriage:update', data);
};

/**
 * Mise à jour du suivi patient (orienté par infirmier) → patient ciblé par son code.
 * @param {string} codeSuivi - ex: 'PAT-A2MB7X'
 * @param {Object} data - Données de mise à jour (statut, position, etc.)
 */
const emitSuiviUpdate = (codeSuivi, data) => {
  emit(`suivi:${codeSuivi}`, 'suivi:update', data);
};

/**
 * Délai de réévaluation dépassé → infirmiers de triage (agents) + patient suivi.
 * Signale qu'une réévaluation est requise SANS modifier le niveau d'urgence.
 * @param {Object} patient - { id, nom, prenom, manchester_niveau, code_suivi }
 */
const emitReevaluationRequise = (patient) => {
  emit('agents', 'patient:reevaluation', {
    patientId: patient.id,
    nom:       patient.nom,
    prenom:    patient.prenom,
    niveau:    patient.manchester_niveau,
    message:   `⏰ Réévaluation requise — ${patient.prenom} ${patient.nom} (N${patient.manchester_niveau})`,
  });

  if (patient.code_suivi) {
    emit(`suivi:${patient.code_suivi}`, 'suivi:update', {
      aReevaluer: true,
      message:    'Votre situation va être réévaluée par l\'infirmier de triage.',
    });
  }
};

/**
 * Re-triage effectué → mise à jour de la file (tous) + patient suivi.
 * @param {Object} patient - { id, nom, prenom, manchester_niveau, code_suivi }
 * @param {Object} infos   - { ancienNiveau, position, patientsDevant }
 */
const emitRetriage = (patient, infos = {}) => {
  broadcast('patient:retriaged', {
    patientId:        patient.id,
    nom:              patient.nom,
    prenom:           patient.prenom,
    manchesterNiveau: patient.manchester_niveau,
    ancienNiveau:     infos.ancienNiveau ?? null,
    position:         infos.position ?? null,
  });

  if (patient.code_suivi) {
    emit(`suivi:${patient.code_suivi}`, 'suivi:update', {
      aReevaluer:       false,
      manchesterNiveau: patient.manchester_niveau,
      position:         infos.position ?? null,
      patientsDevant:   infos.patientsDevant ?? null,
      message:          'Votre niveau de priorité a été réévalué par l\'infirmier de triage.',
    });
  }
};

/**
 * La file d'attente a bougé (prise en charge, sortie, nouveau patient, re-triage).
 * Signal léger diffusé à TOUS les suivis patient pour qu'ils rafraîchissent
 * leur position en temps réel (et détectent « c'est bientôt votre tour »).
 */
const emitQueueMoved = () => {
  broadcast('queue:moved', {});
};

module.exports = {
  init,
  emitNouveauPatient,
  emitStatutPatient,
  emitQueueUpdate,
  emitAlerteCritique,
  emitCapaciteService,
  emitNotification,
  emitPreTriageNouveau,
  emitPreTriageUpdate,
  emitSuiviUpdate,
  emitReevaluationRequise,
  emitRetriage,
  emitQueueMoved,
};
