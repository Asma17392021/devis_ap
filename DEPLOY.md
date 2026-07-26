# Guide de déploiement — Plateforme Devis

Stack : **Supabase** (DB) + **Render** (Backend) + **Vercel** (Frontend)
Tout est **gratuit**.

---

## Étape 1 — Supabase (Base de données PostgreSQL)

1. Crée un compte sur https://supabase.com
2. Clique **"New project"**
3. Choisis un nom (ex: `devis-ap`), un mot de passe fort, région **West EU (Paris)**
4. Attends la création (~2 min)
5. Va dans **Settings > Database > Connection string > URI**
6. Copie l'URL — elle ressemble à :
   ```
   postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
7. Va dans **Settings > API** et copie :
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret → `SUPABASE_SERVICE_KEY`

---

## Étape 2 — Render (Backend Express)

1. Crée un compte sur https://render.com (connecte avec GitHub)
2. Push ce repo sur GitHub si ce n'est pas déjà fait
3. Clique **"New > Web Service"**
4. Connecte ton repo GitHub
5. Configure :
   - **Root Directory** : `devis-backend`
   - **Runtime** : Node
   - **Build Command** : `npm install && npx prisma generate && npm run build`
   - **Start Command** : `npx prisma migrate deploy && npm start`
   - **Plan** : Free
6. Dans **Environment Variables**, ajoute :

   | Variable | Valeur |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |
   | `DATABASE_URL` | L'URL Supabase copiée à l'étape 1 |
   | `JWT_ACCESS_SECRET` | Un secret aléatoire (min 32 chars) |
   | `JWT_REFRESH_SECRET` | Un autre secret aléatoire (min 32 chars) |
   | `FRONTEND_URL` | `https://ton-app.vercel.app` (à mettre à jour après Vercel) |
   | `SUPABASE_URL` | L'URL Supabase |
   | `SUPABASE_SERVICE_KEY` | La clé service_role Supabase |
   | `RESEND_API_KEY` | Ta clé Resend (voir étape optionnelle) |
   | `ADMIN_EMAIL` | Email du premier admin |
   | `ADMIN_PASSWORD` | Mot de passe du premier admin |
   | `ADMIN_FIRST_NAME` | Prénom admin |
   | `ADMIN_LAST_NAME` | Nom admin |

   > Pour générer des secrets JWT : `openssl rand -base64 48`

7. Clique **"Create Web Service"**
8. Attends le déploiement (~5 min) et copie l'URL : `https://devis-backend.onrender.com`

---

## Étape 3 — Vercel (Frontend Next.js)

1. Crée un compte sur https://vercel.com (connecte avec GitHub)
2. Clique **"Add New Project"**
3. Importe ton repo GitHub
4. Configure :
   - **Root Directory** : `devis-frontend`
   - **Framework** : Next.js (auto-détecté)
5. Dans **Environment Variables**, ajoute :

   | Variable | Valeur |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://devis-backend.onrender.com` |
   | `NEXT_PUBLIC_APP_URL` | `https://ton-app.vercel.app` |

6. Clique **"Deploy"**
7. Une fois déployé, copie l'URL Vercel (ex: `https://devis-ap.vercel.app`)

---

## Étape 4 — Mise à jour CORS (important !)

Retourne sur **Render > ton service > Environment Variables** et mets à jour :
```
FRONTEND_URL = https://devis-ap.vercel.app
```
Puis clique **"Save Changes"** — Render redéploie automatiquement.

---

## Étape optionnelle — Emails (Resend)

1. Crée un compte sur https://resend.com (gratuit : 3000 emails/mois)
2. Va dans **API Keys > Create API Key**
3. Ajoute la clé dans Render : `RESEND_API_KEY`
4. Pour envoyer depuis ton domaine, ajoute-le dans Resend > Domains

---

## Récapitulatif des URLs

| Service | URL |
|---|---|
| Frontend | `https://[nom].vercel.app` |
| Backend API | `https://devis-backend.onrender.com/api` |
| Docs API | `https://devis-backend.onrender.com/api/docs` |
| Health | `https://devis-backend.onrender.com/health` |

---

## Notes importantes

- **Render free tier** : le service se met en veille après 15 min d'inactivité. Le premier appel peut prendre ~30 secondes pour "réveiller" le serveur. Pour éviter ça, passe au plan **Starter** ($7/mois).
- **Supabase free tier** : 500 MB de stockage, 2 projets max, pause après 1 semaine d'inactivité (réactivation en 1 clic).
- **Vercel free tier** : illimité pour les projets personnels Next.js.
