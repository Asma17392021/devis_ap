# Plan d'implémentation — Plateforme de Gestion de Devis
**Date :** 2026-07-20
**Spec de référence :** `docs/superpowers/specs/2026-07-20-plateforme-devis-design.md`

---

## Vue d'ensemble

L'implémentation se déroule en **8 phases** séquentielles. Chaque phase produit du code fonctionnel et testable avant de passer à la suivante.

```
Phase 1 → Foundation backend (structure, DB, auth)
Phase 2 → CRUD métier backend (devis, clients, lignes)
Phase 3 → PDF, signature électronique, portail client
Phase 4 → Notifications FCM + emails Resend
Phase 5 → Foundation frontend (structure, auth, routing)
Phase 6 → UI Devis + Portail client
Phase 7 → Dashboard, export, recherche
Phase 8 → API Swagger, i18n, polish final
```

---

## Phase 1 — Foundation Backend

### 1.1 Initialisation du projet backend

**Fichiers à créer :**
- `devis-backend/package.json`
- `devis-backend/tsconfig.json`
- `devis-backend/.env.example`
- `devis-backend/src/index.ts` — point d'entrée Express
- `devis-backend/src/app.ts` — configuration Express (middlewares globaux)
- `devis-backend/src/config/env.ts` — validation des variables d'environnement avec zod

**Dépendances à installer :**
```bash
# Production
express, prisma, @prisma/client, jsonwebtoken, bcrypt,
zod, helmet, cors, express-rate-limit, cookie-parser,
morgan, uuid

# Dev
typescript, ts-node, nodemon, @types/*
```

**Configuration Express dans `app.ts` :**
- `helmet()` — headers sécurisés
- `cors({ origin: process.env.FRONTEND_URL, credentials: true })`
- `express.json()`
- `cookie-parser()`
- `morgan('dev')` — logs
- Rate limiting sur `/api/auth` (10 req/min par IP)

---

### 1.2 Schéma Prisma et base de données

**Fichier :** `devis-backend/prisma/schema.prisma`

Définir les modèles dans cet ordre (respect des dépendances FK) :
1. `User` (id, email, passwordHash, role, firstName, lastName, phone, fcmToken, createdAt, updatedAt)
2. `Client` (id, name, email, phone, address, city, postalCode, country, siret, vatNumber, createdAt, updatedAt)
3. `Quote` (id, number, status, clientId, createdById, title, notes, termsAndConditions, issueDate, expiryDate, discount, discountType, pdfUrl, signatureToken, signedAt, signedIp, signedUserAgent, createdAt, updatedAt)
4. `QuoteLine` (id, quoteId, description, quantity, unitPrice, vatRate, discount, discountType, position)
5. `Attachment` (id, quoteId, fileName, fileUrl, fileSize, mimeType, uploadedAt)
6. `Notification` (id, userId, type, quoteId, message, readAt, createdAt)

**Enums Prisma :** `Role`, `QuoteStatus`, `DiscountType`, `NotificationType`

**Fichier :** `devis-backend/prisma/seed.ts`
- Créer un utilisateur ADMIN par défaut (email + mot de passe depuis `.env`)

**Commandes :**
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

---

### 1.3 Authentification JWT

**Fichiers à créer :**
- `src/middleware/auth.middleware.ts` — vérifie access_token, attache `req.user`
- `src/middleware/role.middleware.ts` — vérifie le rôle requis (`requireRole('ADMIN')`)
- `src/utils/jwt.ts` — `generateAccessToken()`, `generateRefreshToken()`, `verifyToken()`
- `src/utils/password.ts` — `hashPassword()`, `comparePassword()`
- `src/routes/auth.routes.ts`
- `src/controllers/auth.controller.ts`

**Endpoints auth :**

`POST /api/auth/login`
- Body : `{ email, password }`
- Vérifie credentials en DB
- Retourne `access_token` dans la réponse JSON
- Set `refresh_token` en cookie HttpOnly

`POST /api/auth/refresh`
- Lit `refresh_token` depuis cookie
- Vérifie validité, rotation : invalide l'ancien, génère nouveau
- Retourne nouveau `access_token`

`POST /api/auth/logout`
- Clear cookie `refresh_token`

`GET /api/auth/me`
- Retourne profil utilisateur courant (protégé)

`PATCH /api/auth/fcm-token`
- Met à jour `fcmToken` de l'utilisateur courant (pour FCM mobile)

---

### 1.4 Structure des routes

**Fichier :** `src/routes/index.ts` — monte tous les routers

```
/api/auth       → auth.routes.ts
/api/users      → users.routes.ts
/api/clients    → clients.routes.ts
/api/quotes     → quotes.routes.ts
/api/client     → portal.routes.ts     (sans auth JWT)
/api/export     → export.routes.ts
/api/dashboard  → dashboard.routes.ts
/api/notifications → notifications.routes.ts
/api/docs       → swagger (Phase 8)
```

**Middleware d'erreur global :** `src/middleware/error.middleware.ts`
- Intercepte toutes les erreurs non gérées
- Format de réponse uniforme : `{ success: false, message, errors? }`

**Critère de validation de la Phase 1 :**
`POST /api/auth/login` retourne un token valide. `GET /api/auth/me` avec le token retourne le profil.

---

## Phase 2 — CRUD Métier Backend

### 2.1 Gestion des utilisateurs

**Fichiers :** `src/routes/users.routes.ts`, `src/controllers/users.controller.ts`

- `GET /api/users` — liste (ADMIN uniquement)
- `POST /api/users` — créer un MANAGER (ADMIN uniquement), hash du mot de passe
- `PATCH /api/users/:id` — modifier profil (ADMIN ou soi-même)
- `DELETE /api/users/:id` — supprimer (ADMIN uniquement, ne peut pas se supprimer soi-même)

---

### 2.2 Gestion des clients

**Fichiers :** `src/routes/clients.routes.ts`, `src/controllers/clients.controller.ts`

- `GET /api/clients` — liste avec pagination + recherche (`?search=`, `?page=`, `?limit=`)
- `POST /api/clients` — créer (ADMIN | MANAGER)
- `GET /api/clients/:id` — détail
- `PATCH /api/clients/:id` — modifier (ADMIN | MANAGER)
- `DELETE /api/clients/:id` — supprimer (ADMIN uniquement, vérifie qu'aucun devis actif)

---

### 2.3 Gestion des devis

**Fichiers :** `src/routes/quotes.routes.ts`, `src/controllers/quotes.controller.ts`
**Fichier :** `src/services/quote-number.service.ts` — génération du numéro auto-incrémenté

**Format numéro :** `QT-YYYY-NNN` (ex: `QT-2026-001`)
- Logique : trouver le dernier numéro de l'année courante, incrémenter
- Utiliser une transaction Prisma pour éviter les doublons en concurrence

**Endpoints :**
- `GET /api/quotes` — liste avec filtres (`?status=`, `?clientId=`, `?search=`, `?dateFrom=`, `?dateTo=`, `?page=`, `?limit=`)
- `POST /api/quotes` — créer devis + lignes (transaction Prisma : Quote + QuoteLines atomiques)
- `GET /api/quotes/:id` — détail complet (quote + lines + client + attachments)
- `PATCH /api/quotes/:id` — modifier (seulement si `DRAFT`, ou régénérer PDF si `SENT`)
- `DELETE /api/quotes/:id` — supprimer (ADMIN uniquement, seulement si `DRAFT`)
- `POST /api/quotes/:id/send` — envoyer au client (déclenche Phase 3 + 4)

**Fichier :** `src/services/quote-calculations.service.ts`
```typescript
// Fonctions pures, testables unitairement
calculateLineSubtotal(line: QuoteLine): number
calculateTotals(lines: QuoteLine[], globalDiscount?, globalDiscountType?): {
  subtotalHT: number,
  discountAmount: number,
  totalHT: number,
  vatByRate: Record<number, number>,
  totalTTC: number
}
```

---

### 2.4 Gestion des pièces jointes

**Fichier :** `src/services/storage.service.ts` — wrapper Supabase Storage
- `uploadFile(buffer, path, mimeType): Promise<string>` — retourne URL publique
- `deleteFile(path): Promise<void>`
- `getSignedUrl(path, expiresIn): Promise<string>`

**Endpoints attachments (sur quotes.routes.ts) :**
- `POST /api/quotes/:id/attachments` — upload (multer en mémoire → Supabase)
- `DELETE /api/quotes/:id/attachments/:attachmentId`

**Critère de validation Phase 2 :**
Créer un devis avec 3 lignes, vérifier les calculs de totaux, envoyer une requête `PATCH`, vérifier la persistance.

---

## Phase 3 — PDF, Signature Électronique & Portail Client

### 3.1 Génération PDF avec Puppeteer

**Fichier :** `src/services/pdf.service.ts`
**Fichier :** `src/templates/quote-template.ts` — retourne HTML string

**Fonction principale :**
```typescript
generateQuotePDF(quoteId: string, lang: 'fr' | 'en'): Promise<Buffer>
```

**Contenu du template HTML :**
- En-tête : logo (depuis variable d'environnement URL), nom entreprise, coordonnées
- Infos devis : numéro, date d'émission, date d'expiration, statut
- Bloc client : nom, adresse, email
- Tableau des lignes : description, qté, prix unitaire, remise, HT, TVA
- Sous-total, remise globale, tableau récapitulatif TVA par taux, total TTC
- Conditions générales
- QR code (librairie `qrcode`) pointant vers `FRONTEND_URL/client/[signatureToken]`
- Si signé : mention "Signé électroniquement le [date] depuis l'adresse IP [ip]"

**Endpoint :**
- `GET /api/quotes/:id/pdf` — génère (ou récupère depuis Supabase si déjà généré) et retourne le PDF

**Flux complet `POST /api/quotes/:id/send` :**
```
1. Vérifier statut DRAFT
2. Générer signatureToken (uuid v4)
3. Appeler generateQuotePDF() → Buffer
4. Upload buffer → Supabase Storage → pdfUrl
5. UPDATE Quote: status=SENT, signatureToken, pdfUrl
6. Déclencher email (Phase 4)
7. Déclencher notifications FCM (Phase 4)
8. Retourner quote mise à jour
```

---

### 3.2 Portail client (sans login)

**Fichiers :** `src/routes/portal.routes.ts`, `src/controllers/portal.controller.ts`

**Middleware spécifique :** `src/middleware/portal-token.middleware.ts`
- Lit `:token` depuis l'URL
- Vérifie existence en DB et que `expiryDate >= aujourd'hui`
- Attache `req.quote` à la requête

**Endpoints :**

`GET /api/client/:token`
- Retourne les données du devis (sans notes internes, sans infos sensibles)
- Inclut : lignes, client, totaux calculés, pdfUrl (URL signée Supabase)

`POST /api/client/:token/sign`
- Body : `{ decision: 'ACCEPTED' | 'REFUSED', reason?: string }`
- Vérifie que devis est `SENT` (pas déjà signé)
- Enregistre `signedAt = now()`, `signedIp`, `signedUserAgent`
- Met à jour statut
- Régénère PDF avec mention de signature
- Déclenche email de confirmation client (Phase 4)
- Déclenche notifications FCM managers (Phase 4)

**Critère de validation Phase 3 :**
Envoyer un devis → vérifier PDF généré sur Supabase → ouvrir `/api/client/[token]` → signer → vérifier statut `ACCEPTED` et PDF régénéré.

---

## Phase 4 — Notifications FCM & Emails Resend

### 4.1 Service Firebase FCM

**Fichier :** `src/services/fcm.service.ts`

```typescript
// Initialisation Firebase Admin dans src/config/firebase.ts
import * as admin from 'firebase-admin'

// Fonction principale
async sendNotificationToManagers(payload: {
  type: NotificationType,
  quoteNumber: string,
  clientName: string,
  quoteId: string
}): Promise<void>
```

**Logique :**
1. Récupérer tous les `User` avec `role IN [ADMIN, MANAGER]` et `fcmToken != null`
2. Construire message FCM : `{ title, body, data: { quoteId, type } }`
3. Envoyer via `admin.messaging().sendEachForMulticast()`
4. Logger les tokens invalides (les supprimer de la DB)

**Événements à notifier :**
- `QUOTE_SENT` — à l'envoi
- `QUOTE_ACCEPTED` / `QUOTE_REFUSED` — à la signature client
- `QUOTE_EXPIRING` — cron J-3
- `QUOTE_EXPIRED` — cron exécution

**Fichier :** `src/services/notification.service.ts`
- `createNotification(userId, type, quoteId, message)` — persiste en DB
- Appelé systématiquement après chaque envoi FCM

---

### 4.2 Service Email Resend

**Fichier :** `src/services/email.service.ts`

```typescript
sendQuoteToClient(params: {
  clientEmail: string,
  clientName: string,
  quoteNumber: string,
  portalUrl: string,
  pdfBuffer: Buffer,
  lang: 'fr' | 'en'
}): Promise<void>

sendSignatureConfirmation(params: {
  clientEmail: string,
  clientName: string,
  quoteNumber: string,
  decision: 'ACCEPTED' | 'REFUSED',
  lang: 'fr' | 'en'
}): Promise<void>
```

**Templates email :** HTML inline (pas de moteur de template externe), deux versions FR/EN.

---

### 4.3 Cron job d'expiration

**Fichier :** `src/jobs/expiration.job.ts`

```typescript
import cron from 'node-cron'

// Tous les jours à 00:00
cron.schedule('0 0 * * *', async () => {
  // 1. Passer EXPIRED les devis SENT dont expiryDate < aujourd'hui
  // 2. Notifier FCM pour chaque devis expiré
  // 3. Envoyer notification QUOTE_EXPIRING pour devis expirant dans 3 jours
})
```

Initialisé dans `src/index.ts` au démarrage du serveur.

---

### 4.4 Endpoints notifications

**Fichiers :** `src/routes/notifications.routes.ts`, `src/controllers/notifications.controller.ts`

- `GET /api/notifications` — liste des notifications de l'utilisateur courant (non lues en premier)
- `PATCH /api/notifications/:id/read` — marquer comme lue
- `PATCH /api/notifications/read-all` — tout marquer comme lu

**Critère de validation Phase 4 :**
Signer un devis via le portail → vérifier : email reçu, notification FCM envoyée (logs), notification créée en DB.

---

## Phase 5 — Foundation Frontend

### 5.1 Initialisation du projet frontend

**Commandes :**
```bash
npx create-next-app@latest devis-frontend --typescript --tailwind --app --src-dir
cd devis-frontend
npx shadcn-ui@latest init
```

**Dépendances à installer :**
```bash
@tanstack/react-query axios next-intl
react-hook-form @hookform/resolvers zod
date-fns lucide-react
```

**Structure des dossiers :**
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← sidebar + header
│   │   ├── page.tsx            ← dashboard KPIs
│   │   ├── quotes/
│   │   │   ├── page.tsx        ← liste des devis
│   │   │   ├── new/page.tsx    ← créer devis
│   │   │   └── [id]/page.tsx   ← détail devis
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── users/page.tsx      ← ADMIN uniquement
│   │   └── settings/page.tsx
│   ├── client/
│   │   └── [token]/page.tsx    ← portail client public
│   └── layout.tsx              ← providers globaux
├── components/
│   ├── ui/                     ← shadcn/ui components
│   ├── quotes/
│   ├── clients/
│   ├── dashboard/
│   └── layout/
├── lib/
│   ├── api.ts                  ← instance axios configurée
│   ├── auth.ts                 ← helpers auth
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useQuotes.ts
│   └── useClients.ts
├── stores/
│   └── auth.store.ts           ← zustand pour état auth
├── messages/
│   ├── fr.json
│   └── en.json
└── middleware.ts               ← next-intl + protection routes
```

---

### 5.2 Gestion de l'authentification frontend

**Fichier :** `src/lib/api.ts`
- Instance axios avec `baseURL = process.env.NEXT_PUBLIC_API_URL`
- `withCredentials: true` (cookies refresh token)
- Intercepteur de réponse : si 401 → appel `/api/auth/refresh` → retry la requête originale
- Si refresh échoue → redirect vers `/login`

**Fichier :** `src/stores/auth.store.ts` (Zustand)
- État : `{ user, accessToken, isAuthenticated }`
- Actions : `login()`, `logout()`, `refreshToken()`, `setUser()`

**Fichier :** `src/middleware.ts`
- Protéger toutes les routes `/(dashboard)/*`
- Rediriger vers `/login` si non authentifié
- Autoriser `/client/*` sans auth

**Page `(auth)/login/page.tsx` :**
- Formulaire email + mot de passe (react-hook-form + zod)
- Call `POST /api/auth/login`
- Store access_token en mémoire (Zustand)
- Redirect vers `/` (dashboard)

---

### 5.3 Layout dashboard

**Fichier :** `src/components/layout/Sidebar.tsx`
- Navigation : Dashboard, Devis, Clients, (Utilisateurs si ADMIN), Paramètres
- Badge de notifications non lues
- Info utilisateur + bouton logout

**Fichier :** `src/components/layout/Header.tsx`
- Barre de recherche globale (debounce 300ms)
- Sélecteur de langue FR/EN
- Cloche notifications (dropdown des dernières)

**Critère de validation Phase 5 :**
Login fonctionnel, navigation dashboard, refresh token automatique sur expiration access_token.

---

## Phase 6 — UI Devis & Portail Client

### 6.1 Liste des devis

**Fichier :** `src/app/(dashboard)/quotes/page.tsx`

- Table avec colonnes : Numéro, Client, Montant TTC, Statut (badge coloré), Date émission, Date expiration, Actions
- Filtres : statut, client, période (date range picker)
- Pagination côté serveur
- Bouton "Nouveau devis"
- Badging statuts :
  - `DRAFT` → gris
  - `SENT` → bleu
  - `ACCEPTED` → vert
  - `REFUSED` → rouge
  - `EXPIRED` → orange

---

### 6.2 Formulaire de création/modification de devis

**Fichier :** `src/app/(dashboard)/quotes/new/page.tsx`
**Fichier :** `src/components/quotes/QuoteForm.tsx`

**Sections du formulaire :**
1. **En-tête** : Client (select avec recherche), Titre, Date émission, Date expiration
2. **Lignes** : tableau dynamique
   - Bouton "Ajouter une ligne"
   - Chaque ligne : description, quantité, prix unitaire, taux TVA (select), remise ligne, sous-total HT (calculé en temps réel)
   - Drag & drop pour réordonner (via `@dnd-kit/core`)
   - Bouton supprimer ligne
3. **Remise globale** : montant ou pourcentage
4. **Récapitulatif** : sous-total HT, remise, total HT, TVA par taux, total TTC (recalculé en temps réel côté frontend pour la preview)
5. **Notes internes** : textarea
6. **Conditions générales** : textarea (pré-rempli depuis paramètres)
7. **Pièces jointes** : drag & drop upload
8. **Actions** : Sauvegarder (DRAFT), Envoyer au client

---

### 6.3 Page détail d'un devis

**Fichier :** `src/app/(dashboard)/quotes/[id]/page.tsx`

- Affichage lecture du devis avec toutes les infos
- Statut actuel + historique des changements
- Boutons contextuels selon statut :
  - `DRAFT` → Modifier, Envoyer, Supprimer (ADMIN)
  - `SENT` → Télécharger PDF, Copier lien client, Re-envoyer
  - `ACCEPTED` / `REFUSED` / `EXPIRED` → Télécharger PDF uniquement
- Section pièces jointes
- Section notifications liées au devis

---

### 6.4 Portail client

**Fichier :** `src/app/client/[token]/page.tsx`

- Page publique (sans auth)
- Appel `GET /api/client/:token` → affiche les données du devis
- Layout épuré (pas de sidebar), logo entreprise en en-tête
- Affichage du devis : infos, tableau lignes, totaux
- Bouton "Télécharger le devis PDF"
- Si statut `SENT` : boutons "Accepter" et "Refuser"
  - Modal de confirmation avant action
  - Après action : message de succès et statut mis à jour
- Si déjà signé/expiré : message informatif, pas de boutons d'action
- Multilingue : détecte langue navigateur client

**Critère de validation Phase 6 :**
Créer un devis → l'envoyer → ouvrir le lien client → signer → vérifier statut mis à jour dans le dashboard.

---

## Phase 7 — Dashboard, Export & Recherche

### 7.1 Dashboard KPIs

**Fichier :** `src/app/(dashboard)/page.tsx`
**Fichier :** `src/components/dashboard/KPICard.tsx`
**Fichier :** `src/components/dashboard/RecentQuotesList.tsx`
**Fichier :** `src/components/dashboard/ExpiringAlert.tsx`

**Endpoint backend :** `GET /api/dashboard/stats`
```json
{
  "quotesThisMonth": 24,
  "pendingQuotes": 8,
  "signedRevenueThisMonth": 48500,
  "acceptanceRate": 72,
  "recentQuotes": [...],
  "expiringQuotes": [...]
}
```

**React Query :** `refetchInterval: 30000` (30 secondes)

---

### 7.2 Export

**Backend — Fichier :** `src/controllers/export.controller.ts`

`GET /api/export/excel?status=&dateFrom=&dateTo=&clientId=`
- Récupère devis filtrés
- Génère fichier Excel avec `exceljs` :
  - Colonnes : Numéro, Client, Titre, Statut, Date émission, Date expiration, Total HT, TVA, Total TTC, Signé le
  - Mise en forme : en-tête coloré, colonnes auto-width, format monétaire
- Retourne fichier en `Content-Disposition: attachment`

`GET /api/export/pdf-list?status=&dateFrom=&dateTo=`
- Génère PDF tableau des devis (Puppeteer)
- Retourne fichier en `Content-Disposition: attachment`

**Frontend :** bouton "Exporter" sur la page liste des devis, avec dropdown Excel / PDF.

---

### 7.3 Recherche rapide

**Backend :** paramètre `?search=` sur `GET /api/quotes`
```sql
WHERE (
  number ILIKE '%{search}%'
  OR clients.name ILIKE '%{search}%'
  OR CAST(total_ttc AS TEXT) ILIKE '%{search}%'
)
```

**Frontend :** barre de recherche dans le `Header.tsx`
- Debounce 300ms
- Résultats affichés en dropdown (max 5 résultats)
- Clic → navigation vers le détail du devis

---

## Phase 8 — Swagger, i18n & Polish Final

### 8.1 Documentation API Swagger

**Fichiers :** `src/config/swagger.ts`, annotations JSDoc sur tous les controllers

```typescript
// swagger.ts
import swaggerJsdoc from 'swagger-jsdoc'
const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Devis API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
}
```

Monter sur `/api/docs` avec `swagger-ui-express`.

Documenter chaque endpoint avec : description, paramètres, body schema (zod → swagger), réponses (200, 400, 401, 403, 404).

---

### 8.2 Internationalisation (i18n)

**Configuration `next-intl` :**
- `src/i18n.ts` — configuration des locales supportées (`['fr', 'en']`, default `'fr'`)
- `src/middleware.ts` — ajouter la détection de locale

**Fichiers de traduction :**
- `src/messages/fr.json` — toutes les clés en français
- `src/messages/en.json` — toutes les clés en anglais

**Clés à couvrir :**
- Navigation, statuts des devis, labels formulaires
- Messages d'erreur et de succès
- Textes du portail client
- Labels du dashboard

**Sélecteur de langue :** dans `Header.tsx` et dans les paramètres utilisateur (persisté en DB sur `User.preferredLang`).

---

### 8.3 Page Paramètres

**Fichier :** `src/app/(dashboard)/settings/page.tsx`

- **Informations entreprise** : nom, logo (upload), adresse, email, téléphone, SIRET
- **Conditions générales par défaut** : textarea (pré-remplissage formulaire devis)
- **Paramètres de notification** : activer/désactiver les types de notifs FCM
- **Langue préférée** : FR / EN

Les infos entreprise sont stockées en DB dans une table `CompanySettings` (singleton, une seule ligne).

---

### 8.4 Gestion des erreurs & UX

**Frontend :**
- Toast notifications (shadcn/ui `Sonner`) pour toutes les actions (succès/erreur)
- États de chargement avec skeletons sur toutes les listes
- Pages d'erreur : 404, 403, 500
- Confirmation modal pour actions destructives (supprimer devis, refuser)

**Backend :**
- Tous les handlers wrappés dans `try/catch` → middleware d'erreur global
- Logs structurés avec Morgan
- Gestion des erreurs Prisma (violation unique, FK manquante)

---

## Récapitulatif des fichiers critiques

### Backend
```
src/
├── index.ts                          ← démarrage serveur + cron
├── app.ts                            ← Express config
├── config/
│   ├── env.ts                        ← validation .env avec zod
│   ├── firebase.ts                   ← init Firebase Admin
│   └── swagger.ts                    ← config Swagger
├── middleware/
│   ├── auth.middleware.ts
│   ├── role.middleware.ts
│   ├── portal-token.middleware.ts
│   └── error.middleware.ts
├── routes/
│   ├── index.ts
│   ├── auth.routes.ts
│   ├── users.routes.ts
│   ├── clients.routes.ts
│   ├── quotes.routes.ts
│   ├── portal.routes.ts
│   ├── export.routes.ts
│   ├── dashboard.routes.ts
│   └── notifications.routes.ts
├── controllers/                      ← un fichier par router
├── services/
│   ├── pdf.service.ts
│   ├── storage.service.ts
│   ├── fcm.service.ts
│   ├── email.service.ts
│   ├── notification.service.ts
│   └── quote-calculations.service.ts
├── jobs/
│   └── expiration.job.ts
├── utils/
│   ├── jwt.ts
│   └── password.ts
└── templates/
    └── quote-template.ts
```

### Frontend
```
src/
├── app/                              ← pages Next.js App Router
├── components/
│   ├── ui/                          ← shadcn/ui
│   ├── quotes/
│   ├── clients/
│   ├── dashboard/
│   └── layout/
├── lib/
│   ├── api.ts                       ← axios + intercepteurs
│   └── utils.ts
├── hooks/                           ← React Query hooks
├── stores/                          ← Zustand
└── messages/
    ├── fr.json
    └── en.json
```

---

## Variables d'environnement à configurer

### Backend `.env`
```env
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<secret-32-chars>
JWT_REFRESH_SECRET=<secret-32-chars>
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@xxx.iam.gserviceaccount.com
RESEND_API_KEY=re_xxx
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@monentreprise.com
ADMIN_PASSWORD=<mot-de-passe-initial>
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Ordre d'implémentation recommandé

1. **Phase 1** — Backend foundation (structure + DB + auth) → tester avec Postman/Thunder Client
2. **Phase 2** — CRUD métier backend → tester tous les endpoints
3. **Phase 3** — PDF + portail client → vérifier PDF généré + lien signable
4. **Phase 4** — FCM + emails → vérifier notifications reçues
5. **Phase 5** — Frontend foundation → login fonctionnel + navigation
6. **Phase 6** — UI devis + portail → workflow complet end-to-end
7. **Phase 7** — Dashboard + export + recherche → KPIs + téléchargements
8. **Phase 8** — Swagger + i18n + polish → prêt pour production
