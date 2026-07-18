require('dotenv').config();
const db = require('../src/config/db');

async function main() {
  const client = await db.getClient();
  try {
    const agentHash   = '$2a$10$c8g1IlOEsegPIAiYk3KDJeIt3WXPWgl6pGskNBMRuoGmA/pPWVjua';
    const medecinHash = '$2a$10$BJPmNZhoyTMnnBx6yqlxDOgqk0gq6p1ASbhy913rXhMXVJbLtyjbO';
    const adminHash   = '$2a$10$PafuSNtRCm0kKAG3cVRYG.akklZv3ODWqWzjv29quYWABhM9OGc/W';

    // Récupération des IDs services
    const { rows: svcs } = await client.query(
      "SELECT id, nom FROM services WHERE nom IN ('Accueil','Urgences','Administration')"
    );
    const svcMap = {};
    svcs.forEach(s => svcMap[s.nom] = s.id);

    console.log('Services trouvés:', Object.keys(svcMap));

    // UPSERT Agent
    const r1 = await client.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, role, service_id, telephone, statut)
       VALUES ('Hounkpatin','Christelle','c.hounkpatin@urgensia.bj', $1, 'agent', $2, '+229 96 33 44 55', 'actif')
       ON CONFLICT (email) DO UPDATE SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash, statut = 'actif'
       RETURNING email, role`,
      [agentHash, svcMap['Accueil']]
    );
    console.log('✅ Agent:  ', r1.rows[0].email, '—', r1.rows[0].role);

    // UPSERT Médecin
    const r2 = await client.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, role, service_id, telephone, statut)
       VALUES ('Fassinou','Jean-Baptiste','jb.fassinou@urgensia.bj', $1, 'medecin', $2, '+229 97 00 11 22', 'actif')
       ON CONFLICT (email) DO UPDATE SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash, statut = 'actif'
       RETURNING email, role`,
      [medecinHash, svcMap['Urgences']]
    );
    console.log('✅ Médecin:', r2.rows[0].email, '—', r2.rows[0].role);

    // UPSERT Admin
    const r3 = await client.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, role, service_id, telephone, statut)
       VALUES ('Kiki','Nadège','n.kiki@urgensia.bj', $1, 'admin', $2, '+229 95 66 77 88', 'actif')
       ON CONFLICT (email) DO UPDATE SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash, statut = 'actif'
       RETURNING email, role`,
      [adminHash, svcMap['Administration']]
    );
    console.log('✅ Admin:  ', r3.rows[0].email, '—', r3.rows[0].role);

    console.log('\n🎉 Tous les comptes de démo sont prêts !');
    console.log('   Agent   : c.hounkpatin@urgensia.bj  / agent123');
    console.log('   Médecin : jb.fassinou@urgensia.bj   / medecin123');
    console.log('   Admin   : n.kiki@urgensia.bj         / admin123');

  } finally {
    client.release();
    await db.pool.end();
  }
}

main().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
