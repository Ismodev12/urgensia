'use strict';

// ─── Variables d'environnement (doit être la 1ère ligne) ─────────────────────
require('dotenv').config();

const express      = require('express');
const http         = require('http');
const path         = require('path');
const { Server }   = require('socket.io');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');

// Config & DB
const env          = require('./config/env');
const db           = require('./config/db');

// WebSocket service
const socketSvc    = require('./services/socket.service');

const authRoutes        = require('./routes/auth.routes');
const patientsRoutes    = require('./routes/patients.routes');
const servicesRoutes    = require('./routes/services.routes');
const utilisateursRoutes = require('./routes/utilisateurs.routes');
const notifRoutes       = require('./routes/notifications.routes');
const statsRoutes       = require('./routes/stats.routes');
const preTriageRoutes   = require('./routes/pretriage.routes');
const orientationRoutes = require('./routes/orientation.routes');
const suiviRoutes       = require('./routes/suivi.routes');
const profilRoutes      = require('./routes/profil.routes');

// Middleware global
const errorHandler = require('./middleware/errorHandler');

// ─── Initialisation Express ───────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      env.frontendUrl,
    methods:     ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
});

// Initialiser le service WebSocket avec l'instance io
socketSvc.init(io);

// ─── Gestion des connexions WebSocket ─────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌  Client connecté : ${socket.id}`);

  // Le client envoie son rôle pour rejoindre la bonne room
  socket.on('join:role', (role) => {
    if (['agent', 'medecin', 'admin'].includes(role)) {
      socket.join(role + 's');   // ex: 'medecins', 'agents', 'admins'
      socket.join('queue');      // tout le monde reçoit les updates de file
      console.log(`   ↳ ${socket.id} rejoint la room [${role}s]`);
    }
  });

  // Rejoindre la room personnelle (notifications ciblées)
  socket.on('join:user', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`   ↗ ${socket.id} rejoint la room [user:${userId}]`);
    }
  });

  // Rejoindre la room de suivi pré-triage (patient depuis chez lui)
  socket.on('join:pretriage', (codeSuivi) => {
    if (codeSuivi && /^URG-[A-Z0-9]{4}$/.test(codeSuivi)) {
      socket.join(`pretriage:${codeSuivi}`);
      console.log(`   ↗ ${socket.id} rejoint la room [pretriage:${codeSuivi}]`);
    }
  });

  // Rejoindre la room de suivi patient (code donné par l'infirmier après triage)
  socket.on('join:suivi', (codeSuivi) => {
    if (codeSuivi && /^PAT-[A-Z0-9]{6}$/.test(codeSuivi)) {
      socket.join(`suivi:${codeSuivi}`);
      console.log(`   ↗ ${socket.id} rejoint la room [suivi:${codeSuivi}]`);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌  Client déconnecté : ${socket.id} (${reason})`);
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err.message);
  });
});

// ─── Middlewares Express ──────────────────────────────────────────────────────

// Sécurité HTTP
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — autorise uniquement le frontend
app.use(cors({
  origin:      env.frontendUrl,
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logs HTTP en développement
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (photos patients)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '7d',
  etag: true,
}));

// ─── Route de santé ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status:    'ok',
    service:   'URGENSIA API',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    env:       env.nodeEnv,
  });
});

// ─── Routes API ──────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/profil',        profilRoutes);
app.use('/api/patients',      patientsRoutes);
app.use('/api/services',      servicesRoutes);
app.use('/api/utilisateurs',  utilisateursRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/stats',         statsRoutes);
app.use('/api/pretriage',     preTriageRoutes);
app.use('/api/orientation',   orientationRoutes);
app.use('/api/suivi',         suiviRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} non trouvée` });
});

// ─── Gestionnaire d'erreurs global (DOIT être en dernier) ─────────────────────
app.use(errorHandler);

// ─── Démarrage du serveur ─────────────────────────────────────────────────────
const start = async () => {
  try {
    // Tester la connexion PostgreSQL avant de démarrer
    await db.testConnection();

    server.listen(env.port, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════╗');
      console.log('║         🏥  URGENSIA API — Démarré !             ║');
      console.log('╠══════════════════════════════════════════════════╣');
      console.log(`║  🌐  REST    → http://localhost:${env.port}/api        ║`);
      console.log(`║  🔌  Socket  → ws://localhost:${env.port}              ║`);
      console.log(`║  ❤️   Health  → http://localhost:${env.port}/health     ║`);
      console.log(`║  🛠️   Mode    → ${env.nodeEnv.padEnd(34)}║`);
      console.log('╚══════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (err) {
    console.error('❌  Impossible de démarrer le serveur :', err.message);
    console.error('   → Vérifiez votre fichier .env et que PostgreSQL est lancé');
    process.exit(1);
  }
};

// Gestion des erreurs non catchées
process.on('uncaughtException', (err) => {
  console.error('💥  uncaughtException :', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥  unhandledRejection :', reason);
  process.exit(1);
});

// Arrêt propre
process.on('SIGTERM', async () => {
  console.log('\n🛑  Arrêt du serveur (SIGTERM)...');
  server.close(() => {
    db.pool.end(() => {
      console.log('   Pool PostgreSQL fermé.');
      process.exit(0);
    });
  });
});

start();

module.exports = { app, server, io };
