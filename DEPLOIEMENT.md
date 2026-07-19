# 🚀 Déployer URGENSIA — Netlify (front) + Render (back)

**Principe :** le **front** (React/Vite, dossier `urgensia/`) va sur **Netlify** ; le **back** (Node/Express + PostgreSQL, dossier `urgensia-api/`) va sur **Render**.

> Ordre : d'abord la base de données, puis le backend, puis le frontend, et enfin on relie les deux.

---

## ✅ Prérequis
- [ ] Le code est poussé sur **GitHub** (un seul repo avec les 2 dossiers, c'est parfait).
- [ ] Un compte **Render** (render.com) et un compte **Netlify** (netlify.com) — les deux gratuits.
- [ ] `psql` installé en local (pour charger la base). *(déjà le cas ici)*

---

## 1️⃣ Créer la base de données (Render)
- [ ] Sur Render : **New +** → **PostgreSQL**.
- [ ] Nom : `urgensia-db` · Région : la plus proche · Plan : **Free** → **Create**.
- [ ] Attendre que le statut passe à **Available**.
- [ ] Dans la page de la base, copier **« External Database URL »** (commence par `postgresql://…`). On la note : `URL_DB`.

## 2️⃣ Charger le schéma + les données de démo
En local, dans `urgensia-api`. **Ordre important** : `001` → **seed** → `002…008`
(le seed doit passer avant `005`, et l'UTF-8 évite les accents cassés).

**Windows (CMD)** — remplacer l'URL par la tienne :
```bat
cd urgensia-api
set PGCLIENTENCODING=UTF8
set DB=postgresql://user:pass@host/dbname

psql "%DB%" -v ON_ERROR_STOP=1 -f src\db\migrations\001_init.sql
psql "%DB%" -v ON_ERROR_STOP=1 -f src\db\seeds\001_seed.sql
psql "%DB%" -v ON_ERROR_STOP=1 -f src\db\migrations\002_pretriage.sql
psql "%DB%" -v ON_ERROR_STOP=1 -f src\db\migrations\003_orientation.sql
psql "%DB%" -v ON_ERROR_STOP=1 -f src\db\migrations\004_code_suivi_patient.sql
psql "%DB%" -v ON_ERROR_STOP=1 -f src\db\migrations\005_retriage.sql
psql "%DB%" -v ON_ERROR_STOP=1 -f src\db\migrations\006_localisation_specialites.sql
psql "%DB%" -v ON_ERROR_STOP=1 -f src\db\migrations\007_reset_password.sql
psql "%DB%" -v ON_ERROR_STOP=1 -f src\db\migrations\008_services_normalisation.sql
```

**macOS / Linux (bash)** :
```bash
cd urgensia-api
export PGCLIENTENCODING=UTF8
export DB="postgresql://user:pass@host/dbname"
for f in 001_init; do psql "$DB" -v ON_ERROR_STOP=1 -f "src/db/migrations/$f.sql"; done
psql "$DB" -v ON_ERROR_STOP=1 -f src/db/seeds/001_seed.sql
for f in 002_pretriage 003_orientation 004_code_suivi_patient 005_retriage 006_localisation_specialites 007_reset_password 008_services_normalisation; do psql "$DB" -v ON_ERROR_STOP=1 -f "src/db/migrations/$f.sql"; done
```

- [ ] Aucune erreur **ERROR** rouge → la base est prête.
- [ ] Vérifie l'UTF-8 : `psql "%DB%" -c "SELECT nom FROM services ORDER BY nom;"` doit montrer **Pédiatrie** / **Réanimation** avec accents.

## 3️⃣ Déployer le backend (Render Web Service)
- [ ] Render : **New +** → **Web Service** → connecter le repo GitHub.
- [ ] **Root Directory** : `urgensia-api`
- [ ] **Build Command** : `npm install`
- [ ] **Start Command** : `npm start`
- [ ] Plan : **Free**.
- [ ] **Environment Variables** (onglet Environment) — ajouter :

| Clé | Valeur |
|---|---|
| `DB_HOST` | l'hôte de la base Render |
| `DB_PORT` | `5432` |
| `DB_NAME` | le nom de la base Render |
| `DB_USER` | l'utilisateur de la base Render |
| `DB_PASSWORD` | le mot de passe de la base Render |
| `JWT_SECRET` | une longue chaîne aléatoire *(ex. `openssl rand -hex 32`)* |
| `JWT_REFRESH_SECRET` | une autre longue chaîne aléatoire |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://exemple.netlify.app` *(provisoire — on corrige à l'étape 5)* |

> 💡 `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` se trouvent dans la page **Info** de ta base Render (section *Connections*). `PORT` est géré automatiquement par Render — ne pas le définir.

- [ ] **Create Web Service** → attendre le déploiement.
- [ ] Noter l'URL du backend, ex. **`https://urgensia-api.onrender.com`** → on la note `URL_API`.
- [ ] Test rapide : ouvrir `URL_API/api/health` (ou la racine) dans le navigateur.

## 4️⃣ Déployer le frontend (Netlify)
- [ ] Netlify : **Add new site** → **Import an existing project** → connecter le repo.
- [ ] **Base directory** : `urgensia`
- [ ] **Build command** : `npm run build`
- [ ] **Publish directory** : `urgensia/dist`
- [ ] **Environment variables** → ajouter :

| Clé | Valeur |
|---|---|
| `VITE_API_URL` | `URL_API` *(ex. `https://urgensia-api.onrender.com`, **sans** `/` final, **sans** `/api`)* |

- [ ] **Deploy site** → attendre.
- [ ] Noter l'URL Netlify, ex. **`https://urgensia.netlify.app`** → on la note `URL_FRONT`.

> Le routing des pages (`/connexion`, `/agent`, …) est déjà géré : le fichier `urgensia/public/_redirects` est en place.

## 5️⃣ Relier les deux (CORS)
- [ ] Retourner sur **Render** → service backend → **Environment** → modifier `FRONTEND_URL` = **`URL_FRONT`** (l'URL Netlify exacte).
- [ ] **Save** → Render redéploie automatiquement.

## 6️⃣ Vérifier 🎉
- [ ] Ouvrir `URL_FRONT`.
- [ ] Se connecter avec le compte admin de démo : **`n.kiki@urgensia.bj` / `admin123`**.
- [ ] Tester : créer un patient, voir la file, télécharger un rapport PDF.

---

## ℹ️ Bon à savoir (offre gratuite)
- **Backend Render Free** : le service **s'endort** après ~15 min d'inactivité → le **1er appel** après une pause est lent (~30–50 s), puis c'est fluide.
- **PostgreSQL Free** : la base gratuite **expire après ~90 jours** (Render prévient par e-mail). Pour du long terme → passer en plan payant ou refaire une base + recharger le schéma.
- **Mises à jour** : chaque `git push` sur la branche connectée redéclenche automatiquement le déploiement (Netlify **et** Render).
- **Sécurité** : ne jamais committer le vrai `.env` (mots de passe, secrets JWT) — ils vivent uniquement dans les variables d'environnement de Render.

## 🧩 En cas de souci
- **Le front s'affiche mais rien ne charge / erreurs réseau** → `VITE_API_URL` mal réglée sur Netlify (mauvaise URL, ou `/api` en trop). Corriger puis **Clear cache and deploy**.
- **Erreur CORS dans la console** → `FRONTEND_URL` sur Render ≠ URL Netlify exacte. Corriger (étape 5).
- **Le backend crashe au démarrage** → une variable `DB_*` ou `JWT_*` manquante. Vérifier la liste de l'étape 3 dans les logs Render.
- **Page blanche au rafraîchissement d'une route** → vérifier que `urgensia/public/_redirects` est bien déployé.
