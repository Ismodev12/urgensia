'use strict';
const PDFDocument = require('pdfkit');
const db          = require('../config/db');

// Couleurs Manchester
const MTS_COLORS = {
  1: { r: 220, g:  38, b:  38 }, // rouge
  2: { r: 234, g:  88, b:  12 }, // orange
  3: { r: 234, g: 179, b:   8 }, // jaune
  4: { r:  34, g: 197, b:  94 }, // vert
  5: { r:  59, g: 130, b: 246 }, // bleu
};
const MTS_LABELS = { 1: 'Critique', 2: 'Très Urgent', 3: 'Urgent', 4: 'Standard', 5: 'Non Urgent' };
const STATUT_LABELS = {
  en_attente:     'En attente',
  en_cours:       'En cours',
  pris_en_charge: 'Pris en charge',
  sorti:          'Sorti',
};

// Palette de marque (cohérente avec le front URGENSIA)
const BRAND    = '#0F766E';
const BRAND_2  = '#06B6D4';
const LIGHT    = '#F8FAFC';
const BORDER   = '#E2E8F0';
const TEXT     = '#1E293B';
const SUBTEXT  = '#64748B';

function hexFromLevel(level) {
  const c = MTS_COLORS[level] || { r: 100, g: 100, b: 100 };
  return `#${[c.r, c.g, c.b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

function formatTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateFull(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Durée en minutes → « 27 min » ou « 1 h 05 ». */
function formatDuration(min) {
  if (min == null || Number.isNaN(min)) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} h${m > 0 ? ` ${String(m).padStart(2, '0')}` : ''}`;
}

/** Croix médicale blanche dans un carré arrondi — logo dessiné (sans emoji). */
function drawLogoMark(doc, x, y, size = 30) {
  doc.roundedRect(x, y, size, size, 7).fill('#FFFFFF');
  const arm = size * 0.18;
  const len = size * 0.58;
  const cx  = x + size / 2;
  const cy  = y + size / 2;
  doc.fillColor(BRAND);
  doc.rect(cx - arm / 2, cy - len / 2, arm, len).fill(); // vertical
  doc.rect(cx - len / 2, cy - arm / 2, len, arm).fill(); // horizontal
}

/** En-tête de marque commun aux rapports (bandeau dégradé teal → cyan). */
function drawBrandHeader(doc, { title, subtitle, doctor }) {
  const W = doc.page.width;
  const grad = doc.linearGradient(0, 0, W, 0);
  grad.stop(0, BRAND).stop(1, BRAND_2);
  doc.rect(0, 0, W, 120).fill(grad);

  drawLogoMark(doc, 50, 24, 30);
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#FFFFFF').text('URGENSIA', 90, 26);
  doc.fontSize(9).font('Helvetica').fillColor('#CFFAFE')
     .text("Plateforme de pré-triage d'urgences hospitalières", 90, 50);

  doc.fontSize(15).font('Helvetica-Bold').fillColor('#FFFFFF').text(title, 50, 76);
  doc.fontSize(9).font('Helvetica').fillColor('#E0F7FA').text(subtitle, 50, 97);

  const who = `${doctor.prenom || ''} ${doctor.nom || ''}`.trim() || 'Médecin URGENSIA';
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF')
     .text(who, W - 250, 78, { width: 200, align: 'right' });
  doc.fontSize(8).font('Helvetica').fillColor('#CFFAFE')
     .text(doctor.email || '', W - 250, 92, { width: 200, align: 'right' });

  doc.y = 142;
}

/** Titre de section avec barre d'accent (structure visuelle homogène). */
function drawSectionTitle(doc, title) {
  const y = doc.y;
  doc.roundedRect(50, y + 1, 4, 14, 2).fill(BRAND);
  doc.fontSize(13).font('Helvetica-Bold').fillColor(BRAND).text(title, 62, y);
  doc.moveDown(0.5);
}

/** Pied de page + numérotation, dessiné sur CHAQUE page (nécessite bufferPages). */
function finalizeFooters(doc, note) {
  const range  = doc.bufferedPageRange();
  const PAGE_W = doc.page.width - 100;
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const footerY = doc.page.height - 38;
    doc.moveTo(50, footerY).lineTo(50 + PAGE_W, footerY).strokeColor(BORDER).lineWidth(1).stroke();
    doc.fontSize(8).font('Helvetica').fillColor(SUBTEXT)
       .text(note, 50, footerY + 7, { width: PAGE_W - 70, align: 'left', lineBreak: false });
    doc.fontSize(8).font('Helvetica').fillColor(SUBTEXT)
       .text(`Page ${i + 1} / ${range.count}`, 50, footerY + 7, { width: PAGE_W, align: 'right', lineBreak: false });
  }
}

/** Badge arrondi avec texte. Retourne sa largeur. */
function drawBadge(doc, text, x, y, bg, fg, { size = 7.5, padX = 6, h = 14 } = {}) {
  doc.fontSize(size).font('Helvetica-Bold');
  const w = doc.widthOfString(text) + padX * 2;
  doc.roundedRect(x, y, w, h, 4).fill(bg);
  doc.fillColor(fg).text(text, x + padX, y + (h - size) / 2 - 0.5, { width: w - padX * 2, lineBreak: false });
  return w;
}

/**
 * GET /api/stats/rapport-journalier
 * Rapport PDF synthétique de la journée (tous patients). Médecins & admins.
 */
const rapportJournalier = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [patientsRes, kpiRes, manchesterRes] = await Promise.all([
      db.query(`
        SELECT p.*,
               nm.label        AS manchester_label,
               nm.couleur_hex  AS manchester_couleur,
               s.nom           AS service_nom
        FROM patients p
        LEFT JOIN niveaux_manchester nm ON nm.niveau = p.manchester_niveau
        LEFT JOIN services           s  ON s.id      = p.service_id
        WHERE p.date_arrivee::date = $1
        ORDER BY p.manchester_niveau ASC NULLS LAST, p.date_arrivee ASC
      `, [today]),

      db.query(`
        SELECT
          COUNT(*)                                                     AS total,
          COUNT(*) FILTER (WHERE statut = 'en_attente')               AS en_attente,
          COUNT(*) FILTER (WHERE statut = 'en_cours')                 AS en_cours,
          COUNT(*) FILTER (WHERE statut = 'pris_en_charge')           AS pris_en_charge,
          COUNT(*) FILTER (WHERE statut = 'sorti')                    AS sortis,
          COUNT(*) FILTER (WHERE manchester_niveau <= 2)              AS critiques,
          ROUND(AVG(
            EXTRACT(EPOCH FROM (COALESCE(date_prise_en_charge, NOW()) - date_arrivee)) / 60
          ))::int                                                       AS attente_moy_min
        FROM patients
        WHERE date_arrivee::date = $1
      `, [today]),

      db.query(`
        SELECT manchester_niveau AS niveau, nm.label, COUNT(*) AS count
        FROM patients p
        JOIN niveaux_manchester nm ON nm.niveau = p.manchester_niveau
        WHERE p.date_arrivee::date = $1
        GROUP BY p.manchester_niveau, nm.label
        ORDER BY p.manchester_niveau
      `, [today]),
    ]);

    const patients       = patientsRes.rows;
    const kpi            = kpiRes.rows[0];
    const manchesterStats = manchesterRes.rows;
    const doctor         = req.user;

    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title:   `Rapport journalier URGENSIA — ${today}`,
        Author:  `${doctor.prenom || ''} ${doctor.nom || ''}`.trim() || 'Médecin URGENSIA',
        Subject: 'Rapport quotidien de triage et de prise en charge',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport_urgensia_${today}.pdf"`);
    doc.pipe(res);

    const PAGE_W = doc.page.width - 100;

    drawBrandHeader(doc, {
      title: 'Rapport journalier',
      subtitle: new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      doctor,
    });

    // ── Résumé KPIs ───────────────────────────────────────────────────────
    drawSectionTitle(doc, 'Résumé de la journée');

    const kpiBoxW = (PAGE_W - 15) / 4;
    const kpiBoxH = 62;
    const kpiY    = doc.y;
    const kpiItems = [
      { label: 'Patients total',  value: kpi.total,          color: BRAND },
      { label: 'Cas critiques',   value: kpi.critiques,      color: '#DC2626' },
      { label: 'Pris en charge',  value: kpi.pris_en_charge, color: '#16A34A' },
      { label: 'Attente moy.',    value: `${kpi.attente_moy_min || 0} min`, color: '#D97706' },
    ];
    kpiItems.forEach((item, i) => {
      const x = 50 + i * (kpiBoxW + 5);
      doc.roundedRect(x, kpiY, kpiBoxW, kpiBoxH, 6).fillAndStroke(LIGHT, BORDER);
      doc.fontSize(22).font('Helvetica-Bold').fillColor(item.color)
         .text(String(item.value), x, kpiY + 10, { width: kpiBoxW, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor(SUBTEXT)
         .text(item.label, x, kpiY + 40, { width: kpiBoxW, align: 'center' });
    });
    doc.y = kpiY + kpiBoxH + 18;

    // ── Répartition Manchester ────────────────────────────────────────────
    drawSectionTitle(doc, 'Répartition par niveau Manchester');

    if (manchesterStats.length > 0) {
      const barMaxW  = PAGE_W - 130;
      const maxCount = Math.max(...manchesterStats.map(r => parseInt(r.count, 10)));
      manchesterStats.forEach(row => {
        const level = parseInt(row.niveau, 10);
        const count = parseInt(row.count, 10);
        const barW  = maxCount > 0 ? Math.round((count / maxCount) * barMaxW) : 0;
        const color = hexFromLevel(level);
        const rowY  = doc.y;
        doc.roundedRect(50, rowY, 22, 14, 3).fill(color);
        doc.fontSize(7).font('Helvetica-Bold').fillColor('white').text(`N${level}`, 50, rowY + 3, { width: 22, align: 'center' });
        doc.fontSize(9).font('Helvetica').fillColor(TEXT).text(MTS_LABELS[level] || row.label, 78, rowY + 2, { width: 80 });
        if (barW > 0) {
          doc.roundedRect(165, rowY + 1, barW, 12, 3).fill(color + '55');
          doc.roundedRect(165, rowY + 1, barW, 12, 3).stroke(color);
        }
        doc.fontSize(9).font('Helvetica-Bold').fillColor(color).text(`${count}`, 165 + barW + 6, rowY + 2);
        doc.moveDown(0.6);
      });
    } else {
      doc.fontSize(10).font('Helvetica').fillColor(SUBTEXT).text("Aucun patient enregistré aujourd'hui.", 50, doc.y);
      doc.moveDown(0.5);
    }
    doc.moveDown(0.5);

    // ── Statuts ───────────────────────────────────────────────────────────
    drawSectionTitle(doc, 'Statuts des patients');
    const statutItems = [
      { label: 'En attente',     value: kpi.en_attente,     color: '#D97706' },
      { label: 'En cours',       value: kpi.en_cours,       color: '#0F766E' },
      { label: 'Pris en charge', value: kpi.pris_en_charge, color: '#16A34A' },
      { label: 'Sortis',         value: kpi.sortis,         color: SUBTEXT   },
    ];
    const sColW = (PAGE_W - 15) / 4;
    const sY    = doc.y;
    statutItems.forEach((item, i) => {
      const x = 50 + i * (sColW + 5);
      doc.rect(x, sY, sColW, 36).fillAndStroke(LIGHT, BORDER);
      doc.fontSize(16).font('Helvetica-Bold').fillColor(item.color).text(String(item.value), x, sY + 4, { width: sColW, align: 'center' });
      doc.fontSize(7).font('Helvetica').fillColor(SUBTEXT).text(item.label, x, sY + 24, { width: sColW, align: 'center' });
    });
    doc.y = sY + 36 + 20;

    // ── Liste des patients (tableau compact) ──────────────────────────────
    drawSectionTitle(doc, 'Détail des patients');

    if (patients.length === 0) {
      doc.fontSize(10).font('Helvetica').fillColor(SUBTEXT).text('Aucun patient enregistré pour cette journée.', 50, doc.y);
    } else {
      const COL = { n: 22, nom: 120, age: 30, service: 95, arrivee: 48, statut: 72, mts: 38 };
      const HEADER_Y = doc.y;
      let cx = 50;
      doc.rect(50, HEADER_Y, PAGE_W, 16).fill(BRAND);
      doc.fontSize(7).font('Helvetica-Bold').fillColor('white');
      [
        { label: '#',       w: COL.n }, { label: 'Nom', w: COL.nom }, { label: 'Âge', w: COL.age },
        { label: 'Service', w: COL.service }, { label: 'Arrivée', w: COL.arrivee },
        { label: 'Statut',  w: COL.statut }, { label: 'Niveau', w: COL.mts },
      ].forEach(h => { doc.text(h.label, cx + 3, HEADER_Y + 4, { width: h.w - 3 }); cx += h.w; });
      doc.y = HEADER_Y + 16;

      patients.forEach((patient, idx) => {
        if (doc.y + 22 > doc.page.height - 70) { doc.addPage(); doc.y = 50; }
        const rowY  = doc.y;
        const bg    = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        const level = patient.manchester_niveau;
        const color = hexFromLevel(level);
        doc.rect(50, rowY, PAGE_W, 20).fill(bg);
        doc.rect(50, rowY, 3, 20).fill(color);
        doc.fontSize(7.5).font('Helvetica').fillColor(TEXT);
        cx = 53;
        doc.text(String(idx + 1), cx, rowY + 6, { width: COL.n - 3 }); cx += COL.n;
        doc.font('Helvetica-Bold').text(`${patient.prenom} ${patient.nom}`.substring(0, 22), cx, rowY + 6, { width: COL.nom - 4 }); cx += COL.nom;
        doc.font('Helvetica').text(`${patient.age || '?'}`, cx, rowY + 6, { width: COL.age - 2 }); cx += COL.age;
        doc.text((patient.service_nom || '—').substring(0, 14), cx, rowY + 6, { width: COL.service - 4 }); cx += COL.service;
        doc.text(formatTime(patient.date_arrivee), cx, rowY + 6, { width: COL.arrivee - 2 }); cx += COL.arrivee;
        doc.text(STATUT_LABELS[patient.statut] || patient.statut || '—', cx, rowY + 6, { width: COL.statut - 2 }); cx += COL.statut;
        doc.roundedRect(cx, rowY + 4, COL.mts - 4, 13, 3).fill(color);
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('white').text(MTS_LABELS[level] || `N${level}`, cx, rowY + 7, { width: COL.mts - 4, align: 'center' });
        doc.moveTo(50, rowY + 20).lineTo(50 + PAGE_W, rowY + 20).strokeColor(BORDER).lineWidth(0.5).stroke();
        doc.y = rowY + 20;
      });
    }

    finalizeFooters(doc, `URGENSIA — Rapport confidentiel · Généré le ${formatDateFull(new Date())} · ${patients.length} patient(s)`);
    doc.end();
  } catch (err) { next(err); }
};

/** Dessine une fiche détaillée de prise en charge pour un patient. */
function drawPriseEnChargeCard(doc, patient, idx, PAGE_W) {
  const X       = 50;
  const PAD     = 14;
  const innerX  = X + PAD;
  const innerW  = PAGE_W - PAD * 2;
  const level   = patient.manchester_niveau;
  const color   = hexFromLevel(level);

  // ── Préparation des contenus ──
  const fullName = `${patient.prenom} ${patient.nom}`.trim();
  const metaBits = [
    `${patient.age ?? '?'} ans`,
    patient.sexe || null,
    patient.code_suivi ? `Dossier ${patient.code_suivi}` : null,
    `Service : ${patient.service_nom || '—'}`,
  ].filter(Boolean).join('   ·   ');

  const attenteMin = (patient.date_arrivee && patient.date_prise_en_charge)
    ? Math.max(0, Math.round((new Date(patient.date_prise_en_charge) - new Date(patient.date_arrivee)) / 60000))
    : null;

  const vitals = [];
  if (patient.temperature        != null) vitals.push(`${patient.temperature} °C`);
  if (patient.frequence_cardiaque != null) vitals.push(`FC ${patient.frequence_cardiaque} bpm`);
  if (patient.tension_systolique != null && patient.tension_diastolique != null)
    vitals.push(`TA ${patient.tension_systolique}/${patient.tension_diastolique}`);
  if (patient.saturation_oxygene != null) vitals.push(`SpO2 ${patient.saturation_oxygene} %`);
  vitals.push(`Douleur ${patient.echelle_douleur ?? 0}/10`);
  const vitalsText = vitals.join('   ·   ');

  const symptomesText = (patient.symptomes || []).filter(Boolean).join('   ·   ') || 'Aucun symptôme renseigné';
  const resumeText    = patient.resume_clinique || 'Aucun résumé clinique renseigné.';
  const intervenants  = [
    patient.enregistre_par_nom     ? `Enregistré par ${patient.enregistre_par_nom}` : null,
    patient.pris_en_charge_par_nom ? `Pris en charge par ${patient.pris_en_charge_par_nom}` : null,
  ].filter(Boolean).join('   ·   ') || '—';

  // ── Mesure de hauteur (parties variables) ──
  doc.fontSize(9).font('Helvetica');
  const symptomesH = doc.heightOfString(symptomesText, { width: innerW });
  const resumeH    = doc.heightOfString(resumeText,    { width: innerW });

  const labelH = 11;   // hauteur d'un libellé de section
  const lineH  = 13;
  const cardH  = PAD                          // marge haute
    + 18                                      // nom + badges
    + 15                                      // méta
    + 8                                       // séparateur + espace
    + (labelH + lineH + 6)                    // CHRONOLOGIE
    + (labelH + lineH + 6)                    // CONSTANTES VITALES
    + (labelH + symptomesH + 6)               // SYMPTÔMES
    + (labelH + resumeH + 6)                  // RÉSUMÉ CLINIQUE
    + lineH                                   // intervenants
    + PAD;                                    // marge basse

  // Saut de page si la fiche ne tient pas
  if (doc.y + cardH > doc.page.height - 60) { doc.addPage(); doc.y = 50; }

  const top = doc.y;

  // ── Cadre de la fiche ──
  doc.roundedRect(X, top, PAGE_W, cardH, 10).fillAndStroke('#FFFFFF', BORDER);
  doc.roundedRect(X, top, 5, cardH, 2.5).fill(color); // bande couleur MTS à gauche

  let y = top + PAD;

  // ── Ligne 1 : numéro + nom + badges (MTS, statut) ──
  doc.fontSize(8).font('Helvetica-Bold').fillColor(SUBTEXT).text(`#${idx + 1}`, innerX, y + 3, { width: 24, lineBreak: false });
  doc.fontSize(13).font('Helvetica-Bold').fillColor(TEXT).text(fullName, innerX + 24, y, { width: innerW - 200, lineBreak: false });

  const statutKey  = patient.statut === 'sorti' ? 'sorti' : 'pris_en_charge';
  const statutBg   = statutKey === 'sorti' ? '#F1F5F9' : '#DCFCE7';
  const statutFg   = statutKey === 'sorti' ? SUBTEXT   : '#15803D';
  const statutTxt  = STATUT_LABELS[statutKey];
  doc.fontSize(7.5).font('Helvetica-Bold');
  const statutW = doc.widthOfString(statutTxt) + 12;
  const mtsTxt  = `N${level} ${MTS_LABELS[level] || ''}`.trim();
  const mtsW    = doc.widthOfString(mtsTxt) + 12;
  const rightEdge = X + PAGE_W - PAD;
  drawBadge(doc, statutTxt, rightEdge - statutW, y + 1, statutBg, statutFg);
  drawBadge(doc, mtsTxt, rightEdge - statutW - 6 - mtsW, y + 1, color, '#FFFFFF');
  y += 18;

  // ── Ligne 2 : méta ──
  doc.fontSize(8.5).font('Helvetica').fillColor(SUBTEXT).text(metaBits, innerX, y, { width: innerW, lineBreak: false });
  y += 15;

  // ── Séparateur ──
  doc.moveTo(innerX, y).lineTo(innerX + innerW, y).strokeColor(BORDER).lineWidth(0.5).stroke();
  y += 8;

  // ── Chronologie ──
  const chrono = [
    `Arrivée ${formatTime(patient.date_arrivee)}`,
    `Prise en charge ${formatTime(patient.date_prise_en_charge)}`,
    attenteMin != null ? `Attente ${formatDuration(attenteMin)}` : null,
    patient.date_sortie ? `Sortie ${formatTime(patient.date_sortie)}` : null,
  ].filter(Boolean).join('   >   ');
  doc.fontSize(7).font('Helvetica-Bold').fillColor(SUBTEXT).text('CHRONOLOGIE', innerX, y, { characterSpacing: 0.5 });
  y += labelH;
  doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND).text(chrono, innerX, y, { width: innerW, lineBreak: false });
  y += lineH + 6;

  // ── Constantes vitales ──
  doc.fontSize(7).font('Helvetica-Bold').fillColor(SUBTEXT).text('CONSTANTES VITALES', innerX, y, { characterSpacing: 0.5 });
  y += labelH;
  doc.fontSize(9).font('Helvetica').fillColor(TEXT).text(vitalsText, innerX, y, { width: innerW, lineBreak: false });
  y += lineH + 6;

  // ── Symptômes ──
  doc.fontSize(7).font('Helvetica-Bold').fillColor(SUBTEXT).text('SYMPTÔMES', innerX, y, { characterSpacing: 0.5 });
  y += labelH;
  doc.fontSize(9).font('Helvetica').fillColor(TEXT).text(symptomesText, innerX, y, { width: innerW });
  y += symptomesH + 6;

  // ── Résumé clinique ──
  doc.fontSize(7).font('Helvetica-Bold').fillColor(SUBTEXT).text('RÉSUMÉ CLINIQUE', innerX, y, { characterSpacing: 0.5 });
  y += labelH;
  doc.fontSize(9).font('Helvetica').fillColor(TEXT).text(resumeText, innerX, y, { width: innerW });
  y += resumeH + 6;

  // ── Intervenants ──
  doc.fontSize(8).font('Helvetica-Oblique').fillColor(SUBTEXT).text(intervenants, innerX, y, { width: innerW, lineBreak: false });

  doc.y = top + cardH + 12;
}

/**
 * GET /api/stats/resume-prises-en-charge
 * Résumé PDF détaillé des patients pris en charge dans la journée
 * (une fiche complète par patient). Médecins & admins.
 */
const resumePrisEnCharge = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [patientsRes, kpiRes] = await Promise.all([
      db.query(`
        SELECT p.*,
               nm.label        AS manchester_label,
               nm.couleur_hex  AS manchester_couleur,
               s.nom           AS service_nom,
               u1.nom || ' ' || u1.prenom AS enregistre_par_nom,
               u2.nom || ' ' || u2.prenom AS pris_en_charge_par_nom,
               ARRAY(
                 SELECT sym.label FROM patient_symptomes ps
                 JOIN symptomes sym ON sym.id = ps.symptome_id
                 WHERE ps.patient_id = p.id
               ) AS symptomes
        FROM patients p
        LEFT JOIN niveaux_manchester nm ON nm.niveau = p.manchester_niveau
        LEFT JOIN services           s  ON s.id      = p.service_id
        LEFT JOIN utilisateurs       u1 ON u1.id     = p.enregistre_par
        LEFT JOIN utilisateurs       u2 ON u2.id     = p.pris_en_charge_par
        WHERE p.date_prise_en_charge::date = $1
        ORDER BY p.manchester_niveau ASC NULLS LAST, p.date_prise_en_charge ASC
      `, [today]),

      db.query(`
        SELECT
          COUNT(*)                                                                     AS total,
          COUNT(*) FILTER (WHERE manchester_niveau <= 2)                               AS critiques,
          COUNT(*) FILTER (WHERE statut = 'sorti')                                     AS sortis,
          ROUND(AVG(EXTRACT(EPOCH FROM (date_prise_en_charge - date_arrivee)) / 60))::int AS attente_moy_min
        FROM patients
        WHERE date_prise_en_charge::date = $1
      `, [today]),
    ]);

    const patients = patientsRes.rows;
    const kpi      = kpiRes.rows[0];
    const doctor   = req.user;

    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title:   `Résumé des prises en charge URGENSIA — ${today}`,
        Author:  `${doctor.prenom || ''} ${doctor.nom || ''}`.trim() || 'Médecin URGENSIA',
        Subject: 'Résumé clinique des patients pris en charge',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resume_prises_en_charge_${today}.pdf"`);
    doc.pipe(res);

    const PAGE_W = doc.page.width - 100;

    drawBrandHeader(doc, {
      title: 'Résumé des prises en charge',
      subtitle: new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      doctor,
    });

    // ── Synthèse ──
    const kpiBoxW = (PAGE_W - 15) / 4;
    const kpiBoxH = 60;
    const kpiY    = doc.y;
    const kpiItems = [
      { label: 'Patients pris en charge', value: kpi.total || 0,                       color: BRAND },
      { label: 'Dont cas critiques',      value: kpi.critiques || 0,                   color: '#DC2626' },
      { label: 'Sortis',                  value: kpi.sortis || 0,                      color: '#16A34A' },
      { label: 'Attente moy. avant PEC',  value: `${kpi.attente_moy_min || 0} min`,    color: '#D97706' },
    ];
    kpiItems.forEach((item, i) => {
      const x = 50 + i * (kpiBoxW + 5);
      doc.roundedRect(x, kpiY, kpiBoxW, kpiBoxH, 6).fillAndStroke(LIGHT, BORDER);
      doc.fontSize(20).font('Helvetica-Bold').fillColor(item.color).text(String(item.value), x, kpiY + 9, { width: kpiBoxW, align: 'center' });
      doc.fontSize(7.5).font('Helvetica').fillColor(SUBTEXT).text(item.label, x, kpiY + 38, { width: kpiBoxW, align: 'center' });
    });
    doc.y = kpiY + kpiBoxH + 20;

    // ── Fiches détaillées ──
    drawSectionTitle(doc, 'Dossiers de prise en charge');
    doc.moveDown(0.1);

    if (patients.length === 0) {
      doc.roundedRect(50, doc.y, PAGE_W, 60, 8).fillAndStroke(LIGHT, BORDER);
      doc.fontSize(10).font('Helvetica').fillColor(SUBTEXT)
         .text("Aucun patient n'a encore été pris en charge aujourd'hui.", 50, doc.y + 24, { width: PAGE_W, align: 'center' });
      doc.y += 60;
    } else {
      patients.forEach((patient, idx) => drawPriseEnChargeCard(doc, patient, idx, PAGE_W));
    }

    finalizeFooters(doc, `URGENSIA — Document confidentiel · Généré le ${formatDateFull(new Date())} · ${patients.length} prise(s) en charge`);
    doc.end();
  } catch (err) { next(err); }
};

module.exports = { rapportJournalier, resumePrisEnCharge };
