'use strict';

// ── Variables d'environnement factices ───────────────────────────────────────
// config/env.js valide la présence de ces variables au chargement (process.exit
// sinon). On les fixe AVANT tout require applicatif. Les tests n'ouvrent jamais
// de vraie connexion : la couche DB est systématiquement injectée (fakes).
process.env.DB_HOST            = process.env.DB_HOST            || 'localhost';
process.env.DB_PORT            = process.env.DB_PORT            || '5432';
process.env.DB_NAME            = process.env.DB_NAME            || 'urgensia_test';
process.env.DB_USER            = process.env.DB_USER            || 'postgres';
process.env.DB_PASSWORD        = process.env.DB_PASSWORD        || 'postgres';
process.env.JWT_SECRET         = process.env.JWT_SECRET         || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const { test, after } = require('node:test');
const assert          = require('node:assert/strict');

const retriage = require('../src/services/retriage.service');
const roles    = require('../src/middleware/roles');
const { pool } = require('../src/config/db');

// Le pool pg n'est jamais utilisé (fakes injectés), mais on le ferme pour que le
// runner se termine sans handle ouvert.
after(async () => { try { await pool.end(); } catch (_) { /* déjà fermé */ } });

// ─── 1. Calcul de la date de réévaluation ─────────────────────────────────────

test('calculerDateReevaluation : dateTriage + délai cible du niveau', () => {
  const t0 = new Date('2026-06-16T10:00:00.000Z');

  // Niveau 3 → 30 minutes
  assert.equal(
    retriage.calculerDateReevaluation(t0, 3).toISOString(),
    '2026-06-16T10:30:00.000Z'
  );
  // Niveau 2 → 10 minutes
  assert.equal(
    retriage.calculerDateReevaluation(t0, 2).toISOString(),
    '2026-06-16T10:10:00.000Z'
  );
  // Niveau 1 → 0 minute (immédiat)
  assert.equal(
    retriage.calculerDateReevaluation(t0, 1).toISOString(),
    '2026-06-16T10:00:00.000Z'
  );
  // Niveau 5 → 120 minutes
  assert.equal(
    retriage.calculerDateReevaluation(t0, 5).toISOString(),
    '2026-06-16T12:00:00.000Z'
  );
  // Délai forcé prioritaire sur le niveau
  assert.equal(
    retriage.calculerDateReevaluation(t0, 5, 45).toISOString(),
    '2026-06-16T10:45:00.000Z'
  );
  // dateTriage invalide → erreur
  assert.throws(() => retriage.calculerDateReevaluation('pas-une-date', 3), TypeError);
});

// ─── 2. Détection d'un délai dépassé ──────────────────────────────────────────

test('estDelaiDepasse : compare l\'heure courante à la date de réévaluation', () => {
  const cible = new Date('2026-06-16T10:30:00.000Z');

  // Avant l'échéance → pas dépassé
  assert.equal(retriage.estDelaiDepasse(cible, new Date('2026-06-16T10:29:59.000Z')), false);
  // Pile à l'échéance → dépassé
  assert.equal(retriage.estDelaiDepasse(cible, new Date('2026-06-16T10:30:00.000Z')), true);
  // Après l'échéance → dépassé
  assert.equal(retriage.estDelaiDepasse(cible, new Date('2026-06-16T11:00:00.000Z')), true);
  // Pas de date → jamais dépassé
  assert.equal(retriage.estDelaiDepasse(null), false);
  assert.equal(retriage.estDelaiDepasse(undefined), false);
});

// ─── 3. Création de la notification (détection) ───────────────────────────────

test('detecterPatientsAReevaluer : marque le patient + notifie l\'infirmier + journalise', async () => {
  const patientDu = {
    id: 'p1', nom: 'Doe', prenom: 'Jane',
    manchester_niveau: 3, code_suivi: 'PAT-ABC123',
    date_reevaluation: new Date(Date.now() - 60_000), // dépassé d'une minute
  };

  const queries = [];
  const fakeDb = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      // La requête de détection (jointure patients/triages) renvoie le patient dû
      if (/JOIN triages t ON/i.test(sql)) return { rows: [patientDu] };
      return { rows: [] };
    },
  };

  const notifies = [];
  const fakeNotif = {
    notifierReevaluationRequise: async (p) => { notifies.push(p); },
  };

  const signales = await retriage.detecterPatientsAReevaluer({ db: fakeDb, notif: fakeNotif });

  // Le patient est signalé
  assert.equal(signales.length, 1);
  assert.equal(signales[0].id, 'p1');

  // Il est marqué « à réévaluer »
  assert.ok(
    queries.some(q => /UPDATE patients SET a_reevaluer = TRUE/i.test(q.sql) && q.params[0] === 'p1'),
    'le patient doit être marqué a_reevaluer = TRUE'
  );

  // L'infirmier de triage est notifié
  assert.equal(notifies.length, 1);
  assert.equal(notifies[0].id, 'p1');

  // L'événement est journalisé
  assert.ok(
    queries.some(q => /INSERT INTO journal_audit/i.test(q.sql)),
    'l\'événement doit être journalisé'
  );
});

test('detecterPatientsAReevaluer : idempotent quand aucun patient n\'est dû', async () => {
  const fakeDb   = { query: async () => ({ rows: [] }) };
  let notified   = 0;
  const fakeNotif = { notifierReevaluationRequise: async () => { notified++; } };

  const signales = await retriage.detecterPatientsAReevaluer({ db: fakeDb, notif: fakeNotif });

  assert.equal(signales.length, 0);
  assert.equal(notified, 0);
});

// ─── 4. Re-triage avec conservation de l'historique ───────────────────────────

test('enregistrerRetriage : archive l\'ancien triage et insère le nouveau (historique conservé)', async () => {
  const calls = [];
  const fakeClient = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      // Triage courant existant : niveau 4, n°1
      if (/FROM triages\s+WHERE patient_id = \$1 AND est_courant = TRUE/i.test(sql)) {
        return { rows: [{ manchester_niveau: 4, numero_triage: 1 }] };
      }
      // Numéro de triage max
      if (/COALESCE\(MAX\(numero_triage\)/i.test(sql)) {
        return { rows: [{ max_num: 1 }] };
      }
      // Insertion du nouveau triage
      if (/INSERT INTO triages/i.test(sql)) {
        return { rows: [{ id: 't2', manchester_niveau: params[2], numero_triage: params[7], est_courant: true }] };
      }
      return { rows: [] };
    },
  };

  const triageResult = {
    niveau: 2, service: 'Service des Urgences',
    resumeClinique: 'Aggravation', scoreDetail: { x: 1 },
  };

  const res = await retriage.enregistrerRetriage(fakeClient, {
    patientId: 'p1', triageResult, serviceId: 's1', userId: 'u-agent', ip: '127.0.0.1',
  });

  // Résultat retourné
  assert.equal(res.ancienNiveau, 4);
  assert.equal(res.nouveauNiveau, 2);
  assert.equal(res.numeroTriage, 2);
  assert.ok(res.dateReevaluation instanceof Date);

  // L'ancien triage est ARCHIVÉ (est_courant = FALSE), pas supprimé
  assert.ok(
    calls.some(c => /UPDATE triages SET est_courant = FALSE/i.test(c.sql)),
    'l\'ancien triage doit passer à est_courant = FALSE'
  );
  assert.ok(
    !calls.some(c => /DELETE FROM triages/i.test(c.sql)),
    'aucun triage ne doit être supprimé (historique conservé)'
  );

  // Le nouveau triage est inséré : niveau 2, niveau_precedent 4, numero_triage 2
  const insert = calls.find(c => /INSERT INTO triages/i.test(c.sql));
  assert.ok(insert, 'un nouveau triage doit être inséré');
  assert.equal(insert.params[2], 2, 'manchester_niveau du nouveau triage');
  assert.equal(insert.params[3], 4, 'niveau_precedent = ancien niveau');
  assert.equal(insert.params[7], 2, 'numero_triage incrémenté');

  // Le patient est mis à jour + marqueur « à réévaluer » nettoyé
  assert.ok(
    calls.some(c => /UPDATE patients[\s\S]*a_reevaluer\s*=\s*FALSE/i.test(c.sql)),
    'le patient doit être mis à jour et a_reevaluer remis à FALSE'
  );

  // Journal d'activité : qui / ancien / nouveau niveau
  const audit = calls.find(c => /INSERT INTO journal_audit/i.test(c.sql));
  assert.ok(audit, 'le re-triage doit être journalisé');
  assert.equal(audit.params[0], 'u-agent', 'qui : l\'infirmier');
  assert.equal(audit.params[1], 'Re-triage patient');
  const details = JSON.parse(audit.params[3]);
  assert.equal(details.ancienNiveau, 4);
  assert.equal(details.nouveauNiveau, 2);
});

// ─── 5. Contrôle d'accès : seul l'infirmier de triage (agent) re-trie ─────────

test('roles(\'agent\') : refuse tout rôle autre que l\'agent d\'accueil', () => {
  const appeler = (role) => {
    const req = { user: role ? { role } : null };
    const captured = { status: null, body: null, nextCalled: false };
    const res = {
      status(code) { captured.status = code; return this; },
      json(body)   { captured.body = body;  return this; },
    };
    roles('agent')(req, res, () => { captured.nextCalled = true; });
    return captured;
  };

  // Agent (infirmier de triage) → autorisé
  const agent = appeler('agent');
  assert.equal(agent.nextCalled, true);
  assert.equal(agent.status, null);

  // Médecin → refusé (403)
  const medecin = appeler('medecin');
  assert.equal(medecin.nextCalled, false);
  assert.equal(medecin.status, 403);
  assert.deepEqual(medecin.body.required, ['agent']);
  assert.equal(medecin.body.current, 'medecin');

  // Admin → refusé (403)
  assert.equal(appeler('admin').status, 403);

  // Non authentifié → 401
  assert.equal(appeler(null).status, 401);
});
