# Plateforme de Gestion de Devis — Design Spec
**Date :** 2026-07-20
**Statut :** Approuvé

---

## 1. Contexte et objectif

Construire une plateforme SaaS mono-tenant professionnelle permettant à une entreprise de gérer ses demandes de devis de A à Z : création, envoi, signature électronique, suivi, notifications, export et reporting.

---

## 2. Utilisateurs et rôles

Trois rôles distincts :

| Rôle | Description | Accès |
|------|-------------|-------|
| **ADMIN** | Administrateur plateforme | Tout : CRUD devis, gestion utilisateurs, suppression |
| **MANAGER** | Gestionnaire commercial | Créer/modifier/envoyer des devis, voir tous les devis |
| **CLIENT** | Client externe | Accès sans login via lien sécurisé (token), consultation et signature uniquement |

---

## 3. Architecture globale

```
┌─────────────────────────────────────────────────────────┐
│                     VERCEL                               │
│  Next.js 14 (App Router)                                │
│  ├── /app/(auth)          → Login, Register             │
│  ├── /app/(dashboard)     → Gestionnaires               │
│  ├── /app/client/[token]  → Portail client (public)     │
│  └── /app/admin           → Administration              │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / REST
┌──────────────────────▼──────────────────────────────────┐
│                    RAILWAY                               │
│  Express.js + Prisma ORM                                │
│  ├── /api/auth            → JWT (access + refresh)      │
│  ├── /api/quotes          → CRUD devis                  │
│  ├── /api/clients         → Gestion clients             │
│  ├── /api/pdf             → Génération PDF (Puppeteer)  │
│  ├── /api/notifications   → FCM                         │
│  ├── /api/export          → Excel (exceljs)             │
│  └── /api/docs            → Swagger UI                  │
│                                                         │
│  PostgreSQL (Railway)                                   │
│  node-cron → expiration devis chaque nuit               │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
  Supabase Storage             Firebase FCM
  (PDF, pièces jointes)        (notifications mobiles)
```

**Deux repos Git :**
- `devis-frontend` — déployé sur Vercel
- `devis-backend` — déployé sur Railway

---

## 4. Modèle de données

### User
```
id              UUID PK
email           STRING UNIQUE
passwordHash    STRING
role            ENUM(ADMIN, MANAGER)
firstName       STRING
lastName        STRING
phone           STRING?
fcmToken        STRING?   ← token Firebase pour notifications mobiles
createdAt       DATETIME
updatedAt       DATETIME
```

### Client
```
id              UUID PK
name            STRING
email           STRING
phone           STRING?
address         STRING?
city            STRING?
postalCode      STRING?
country         STRING DEFAULT 'FR'
siret           STRING?
vatNumber       STRING?
createdAt       DATETIME
updatedAt       DATETIME
```

### Quote
```
id              UUID PK
number          STRING UNIQUE (QT-2026-001, auto-incrémenté)
status          ENUM(DRAFT, SENT, ACCEPTED, REFUSED, EXPIRED)
clientId        UUID FK → Client
createdById     UUID FK → User
title           STRING
notes           TEXT?     ← notes internes, non visibles par le client
termsAndConditions TEXT?
issueDate       DATE
expiryDate      DATE
discount        DECIMAL?
discountType    ENUM(PERCENTAGE, FIXED)?
pdfUrl          STRING?   ← URL Supabase Storage
signatureToken  UUID UNIQUE ← lien client sécurisé
signedAt        DATETIME?
signedIp        STRING?
signedUserAgent STRING?
createdAt       DATETIME
updatedAt       DATETIME
```

### QuoteLine
```
id              UUID PK
quoteId         UUID FK → Quote
description     STRING
quantity        DECIMAL
unitPrice       DECIMAL
vatRate         DECIMAL (0, 5.5, 10, 20)
discount        DECIMAL?
discountType    ENUM(PERCENTAGE, FIXED)?
position        INT       ← ordre d'affichage
```

### Attachment
```
id              UUID PK
quoteId         UUID FK → Quote
fileName        STRING
fileUrl         STRING
fileSize        INT
mimeType        STRING
uploadedAt      DATETIME
```

### Notification
```
id              UUID PK
userId          UUID FK → User
type            ENUM(QUOTE_SENT, QUOTE_ACCEPTED, QUOTE_REFUSED, QUOTE_EXPIRING, QUOTE_EXPIRED)
quoteId         UUID FK → Quote
message         STRING
readAt          DATETIME?
createdAt       DATETIME
```

### Calculs (backend uniquement)
- Sous-total HT ligne = `quantité × prix unitaire − remise ligne`
- Total HT = somme des sous-totaux − remise globale
- TVA par taux = regroupée (ex: TVA 20% : X€, TVA 10% : Y€)
- Total TTC = Total HT + somme TVA

---

## 5. Authentification & Sécurité

### Stratégie JWT dual-token
- `access_token` : durée 15 min, stocké en mémoire JS (pas localStorage)
- `refresh_token` : durée 7 jours, cookie `HttpOnly; Secure; SameSite=Strict`
- Rotation du refresh token à chaque renouvellement

### Portail client (sans login)
- URL : `https://app.com/client/[signatureToken]`
- Token UUID v4, généré à l'envoi du devis, valide jusqu'à `expiryDate`
- À la signature : `signedAt` + `signedIp` + `signedUserAgent` enregistrés comme preuve

### Matrice des permissions

| Action | ADMIN | MANAGER | CLIENT (token) |
|--------|-------|---------|----------------|
| Créer/modifier devis | ✓ | ✓ | ✗ |
| Supprimer devis | ✓ | ✗ | ✗ |
| Gérer utilisateurs | ✓ | ✗ | ✗ |
| Voir tous les devis | ✓ | ✓ | ✗ |
| Consulter son devis | ✗ | ✗ | ✓ |
| Accepter/Refuser | ✗ | ✗ | ✓ |

### Sécurité backend
- Rate limiting `/api/auth` : 10 req/min par IP (express-rate-limit)
- Helmet.js (headers HTTP sécurisés)
- Validation zod sur toutes les routes
- CORS restreint à l'URL du frontend

---

## 6. Génération PDF & Signature électronique

### Génération PDF (Puppeteer)
- Template HTML interne rendu par Puppeteer → PDF
- Déclenché à l'envoi du devis et à chaque modification si déjà `SENT`
- Contenu : logo, coordonnées, numéro, tableau lignes, totaux TVA, CGV, QR code lien client
- Stockage : `supabase-storage/quotes/{quoteId}/quote-{number}.pdf`
- URL signée et expirable retournée au frontend

### Flux d'envoi
```
Gestionnaire clique "Envoyer"
  → Backend génère PDF (Puppeteer)
  → Upload Supabase Storage
  → Génère signatureToken (UUID v4)
  → Statut → SENT
  → Email Resend (lien portail + PDF en pièce jointe)
  → Notification FCM → tous les MANAGERs et ADMINs
```

### Flux de signature
```
Client ouvre /client/[signatureToken]
  → Backend vérifie token valide + devis non expiré
  → Affiche devis en lecture seule
  → Client clique "Accepter" ou "Refuser"
  → Enregistre signedAt, signedIp, signedUserAgent
  → Statut → ACCEPTED ou REFUSED
  → Régénère PDF avec mention "Signé électroniquement le [date] — IP : [ip]"
  → Notification FCM → tous les MANAGERs et ADMINs
  → Email de confirmation au client
```

### Cron job d'expiration (node-cron)
- Tourne chaque nuit à 00:00
- Passe en `EXPIRED` tous les devis `SENT` avec `expiryDate < aujourd'hui`
- Notifie les managers/admins via FCM 3 jours avant expiration (`QUOTE_EXPIRING`)

---

## 7. Dashboard & Reporting

### 4 KPIs
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total devis  │ │ En attente   │ │ CA signé     │ │ Taux         │
│ ce mois      │ │ de réponse   │ │ ce mois      │ │ d'acceptation│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```
- Liste des 10 derniers devis (numéro, client, montant, statut coloré)
- Alertes : devis expirant dans les 3 prochains jours
- Rafraîchissement par polling toutes les 30 secondes (React Query)

### Export

| Format | Contenu | Librairie |
|--------|---------|-----------|
| PDF unique | Un devis complet formaté | Puppeteer |
| PDF liste | Tableau des devis filtrés | Puppeteer |
| Excel | Tous les devis, colonnes détaillées | exceljs |

Filtres avant export : période, statut, client.

### Recherche rapide
- Filtre sur : numéro de devis, nom client, montant
- Backend : `ILIKE` PostgreSQL
- Frontend : debounce 300ms

---

## 8. Notifications

### Firebase Cloud Messaging (FCM)
- `fcmToken` stocké sur le profil `User` (mis à jour à chaque login mobile)
- Destinataires : tous les `ADMIN` et `MANAGER`
- Événements déclencheurs :

| Événement | Type | Message |
|-----------|------|---------|
| Devis envoyé | QUOTE_SENT | "Devis #QT-2026-001 envoyé à [client]" |
| Devis accepté | QUOTE_ACCEPTED | "Devis #QT-2026-001 accepté par [client]" |
| Devis refusé | QUOTE_REFUSED | "Devis #QT-2026-001 refusé par [client]" |
| Expiration proche (J-3) | QUOTE_EXPIRING | "Devis #QT-2026-001 expire dans 3 jours" |
| Devis expiré | QUOTE_EXPIRED | "Devis #QT-2026-001 a expiré" |

### Emails (Resend)
- Envoi du devis au client (lien + PDF joint)
- Confirmation de signature au client
- Templates traduits FR/EN

---

## 9. Multilingue (i18n)

- **Frontend** : `next-intl`, fichiers `fr.json` / `en.json`
- Détection automatique langue navigateur, choix manuel dans paramètres utilisateur
- **PDF** : généré dans la langue du gestionnaire
- **Portail client** : détecte la langue du navigateur client
- **Emails Resend** : templates FR et EN distincts

---

## 10. API REST documentée

- Swagger UI accessible sur `/api/docs` (swagger-jsdoc + swagger-ui-express)
- Authentification Bearer token documentée
- Toutes les routes documentées avec schémas de réponse

### Endpoints principaux

```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id

GET    /api/clients
POST   /api/clients
PATCH  /api/clients/:id
DELETE /api/clients/:id

GET    /api/quotes
POST   /api/quotes
GET    /api/quotes/:id
PATCH  /api/quotes/:id
DELETE /api/quotes/:id
POST   /api/quotes/:id/send
GET    /api/quotes/:id/pdf

GET    /api/client/:token          ← portail client (sans auth)
POST   /api/client/:token/sign     ← accepter/refuser

GET    /api/export/excel
GET    /api/export/pdf

GET    /api/dashboard/stats

GET    /api/notifications
PATCH  /api/notifications/:id/read
```

---

## 11. Stack technique

### Frontend (Vercel)
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- React Query (cache + polling)
- next-intl (i18n)
- react-hook-form + zod
- axios

### Backend (Railway)
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- jsonwebtoken + bcrypt
- Puppeteer (PDF)
- ExcelJS (export Excel)
- Firebase Admin SDK (FCM)
- Resend (emails)
- node-cron
- swagger-jsdoc + swagger-ui-express
- Helmet + express-rate-limit + cors + zod

### Infrastructure
- Supabase Storage (PDF + pièces jointes)
- Firebase Cloud Messaging (notifications)
- Resend (emails transactionnels)

---

## 12. Variables d'environnement

### Backend (.env)
```
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
RESEND_API_KEY=
FRONTEND_URL=
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_URL=
```
