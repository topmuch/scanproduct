# Déploiement VerifScan sur Coolify

Guide pas-à-pas pour déployer **VerifScan** (Next.js 16 + Prisma + SQLite)
sur une instance [Coolify](https://coolify.io) auto-hébergée.

> Slogan : *« La vérité au bout du scan »*

---

## 1. Prérequis

Avant de commencer, vous devez disposer de :

- **Une instance Coolify** opérationnelle (v4 ou supérieure) installée sur un VPS.
- **Un serveur cible** connecté à Coolify (le même VPS ou un autre), avec Docker installé.
- **Un nom de domaine** (ou sous-domaine) pointant vers l'adresse IP de votre serveur
  via un enregistrement DNS `A`. Exemple : `scanproduct.votredomaine.sn`.
- **Le repo GitHub public** du projet :
  [https://github.com/topmuch/scanproduct](https://github.com/topmuch/scanproduct)

> ℹ️ Coolify gère automatiquement les certificats SSL (Let's Encrypt) une fois
> le domaine configuré.

---

## 2. Étape 1 — Connecter le repo

1. Dans le tableau de bord Coolify, cliquez sur **+ New Resource**.
2. Choisissez **Public Git Repository** (repo public GitHub).
3. Collez l'URL : `https://github.com/topmuch/scanproduct`
4. Sélectionnez la branche **`main`**.
5. Donnez un nom à la ressource, par exemple `verifscan`.

Coolify va cloner le dépôt et détecter la présence d'un `Dockerfile`.

---

## 3. Étape 2 — Build Pack

Dans la section **Build Pack** de votre ressource :

1. Sélectionnez **Dockerfile** (et **non** Nixpacks).
2. Coolify détecte automatiquement le fichier `Dockerfile` à la racine du dépôt.
3. laissez le **Port** par défaut : `3000` (Next.js).

> Le `Dockerfile` est multi-stage (`deps` → `builder` → `runner`) et utilise
> `node:20-alpine`. Aucune action supplémentaire n'est requise ici.

---

## 4. Étape 3 — Variables d'environnement

Cliquez sur **Environment Variables** dans le menu de la ressource, puis ajoutez
**une à une** les variables suivantes (voir `.env.example` à la racine du repo
pour référence) :

| Variable | Valeur | Notes |
|---|---|---|
| `DATABASE_URL` | `file:./db/custom.db` | Chemin local SQLite. **Ne pas modifier.** |
| `NEXTAUTH_SECRET` | *(voir ci-dessous)* | **OBLIGATOIRE** — chaîne aléatoire de 32+ caractères. |
| `NEXTAUTH_URL` | `https://scanproduct.votredomaine.sn` | Votre domaine Coolify final (avec `https://`). |
| `ADMIN_EMAIL` | `admin@verifscan.sn` | Email du compte SuperAdmin (utilisé par le seed). |
| `ADMIN_PASSWORD` | `ChangeMeOnFirstLogin!2025` | Mot de passe SuperAdmin — **changez-le** après 1ʳᵉ connexion. |
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | |
| `HOSTNAME` | `0.0.0.0` | |

### 🔑 Générer `NEXTAUTH_SECRET`

- **Option A** (locale) : exécutez `openssl rand -base64 32` dans un terminal.
- **Option B** (Coolify) : à côté du champ de la variable, cliquez sur l'icône
  **🎲 Generate** — Coolify produira une valeur aléatoire.

> ⚠️ **Ne perdez pas cette valeur.** Si elle change, toutes les sessions
> utilisateurs existantes seront invalidées et les tokens JWT deviendront
> invalides (erreurs 401 sur les routes API).

---

## 5. Étape 4 — Persist Storage (IMPORTANT pour SQLite) ⚠️

La base de données SQLite est un **fichier local** (`/app/db/custom.db` dans le
conteneur). Sans stockage persistant, ce fichier est **effacé à chaque
reconstruction** du conteneur — vous perdriez tous les utilisateurs, fabricants
et produits.

### Configurer le volume persistant

1. Dans le menu de la ressource, ouvrez **Persistent Storage** (ou
   **Storages** selon la version de Coolify).
2. Cliquez sur **+ Add Volume**.
3. Configurez :
   - **Name / Source** : `verifscan-db`
   - **Mount Path / Target** : `/app/db`
4. Sauvegardez.

Coolify créera un volume Docker nommé `verifscan-db` et le montera dans le
conteneur à `/app/db`. Le fichier `custom.db` survivra ainsi aux redéploiements.

> 💡 **Pour la mise à l'échelle en production** : SQLite convient parfaitement
> pour un déploiement mono-conteneur. Si vous prévoyez plusieurs conteneurs ou
> un trafic élevé, migrez vers PostgreSQL (il faudra alors adapter
> `prisma/schema.prisma` et la variable `DATABASE_URL`).

---

## 6. Étape 5 — Port & Health Check

- **Port** : `3000` — détecté automatiquement par Coolify depuis le `Dockerfile`
  (`EXPOSE 3000`).
- **Health Check Path** : `/api/health`
  - Coolify interroge cette URL pour savoir quand le conteneur est prêt.
  - Réponse attendue : `200 OK` avec le JSON
    `{ "status": "ok", "timestamp": "...", "version": "1.0.0", "service": "verifscan" }`.
  - Le `Dockerfile` embarque déjà un `HEALTHCHECK` Docker qui appelle cette
    même URL avec `wget --spider`.

Si Coolify vous propose un champ **Health Check Path**, renseignez-y
`/api/health`.

---

## 7. Étape 6 — Deploy

1. Cliquez sur le bouton **Deploy** (en haut à droite).
2. Suivez les logs de build en temps réel (onglet **Build Logs** / **Logs**).
3. Premier build : **~3 à 5 minutes** (installation des dépendances,
   `prisma generate`, `next build`).
4. Au démarrage du conteneur, la commande exécutée est :
   ```
   npx prisma db push --accept-data-loss && node server.js
   ```
   → Le schéma SQLite est appliqué **avant** le lancement du serveur Next.js.

Une fois le build terminé et le health check au vert, le statut passe à
**Running**.

---

## 8. Étape 7 — Premier accès

1. Visitez votre domaine Coolify : `https://scanproduct.votredomaine.sn`
2. La landing page VerifScan s'affiche.
3. Cliquez sur **Connexion** (en haut à droite).
4. Connectez-vous avec les identifiants SuperAdmin que vous avez définis
   (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
5. Le SuperAdmin est redirigé vers `/superadmin` (tableau de bord administrateur).
6. Les fabricants, eux, atterrissent sur `/dashboard`.

> Si la connexion échoue, vérifiez que le seed s'est exécuté (voir
> **Dépannage** ci-dessous).

---

## 9. Étape 8 — Créer un fabricant de test

Deux options :

### Option A — Via l'interface

1. Déconnectez-vous du compte SuperAdmin.
2. Allez sur `/register`.
3. Créez un compte avec le rôle **Fabricant**.

### Option B — Via le terminal Coolify

1. Dans Coolify, ouvrez l'onglet **Terminal** de votre ressource
   (bouton **Terminal** ou **Execute Command**).
2. Dans le shell du conteneur, exécutez :
   ```bash
   bun run db:seed
   ```
   *(ou `npm run db:seed` si Bun n'est pas disponible — il faudra alors l'ajouter
   au `package.json`)*
3. Le script crée un fabricant de démonstration (voir le code du seed pour les
   identifiants exacts).

---

## 10. Dépannage (Troubleshooting)

| Problème | Cause probable | Solution |
|---|---|---|
| **Base de données perdue après un redéploiement** | Volume persistant non configuré | Voir **Étape 4** — monter un volume à `/app/db`. |
| **401 sur toutes les routes API** | `NEXTAUTH_SECRET` manquant ou modifié | Régénérer et redéfinir `NEXTAUTH_SECRET`, puis **Redeploy**. |
| **Impossible de se connecter (admin)** | `ADMIN_EMAIL` / `ADMIN_PASSWORD` ne correspondent pas à ce que le seed attend | Vérifier que ces deux variables sont définies dans Coolify et relancer le seed via le terminal. |
| **Prisma client non généré** | Le build a échoué avant l'étape `prisma generate` | Consulter les **Build Logs** ; vérifier que `prisma/schema.prisma` est bien présent. |
| **`prisma db push` échoue au démarrage** | Volume non inscriptible par l'utilisateur `node` | Le `Dockerfile` fait déjà `chown -R node:node /app`. Vérifier que le volume monté n'écrase pas les permissions. |
| **Health check qui ne passe jamais au vert** | Port incorrect ou `/api/health` injoignable | Vérifier que le Port Coolify = `3000` et que la route `/api/health` répond (curl depuis le terminal). |
| **502 Bad Gateway** | Le conteneur n'est pas encore prêt ou a crashé | Consulter les **Logs** du conteneur ; attendre que le health check passe au vert. |

---

## 11. Mise à jour

Pour mettre à jour VerifScan avec les derniers changements du dépôt :

1. **Sur le repo GitHub** : poussez vos nouveaux commits sur la branche `main`
   (ou faites un `git pull` si vous travaillez directement sur le serveur).
2. **Dans Coolify** : ouvrez la ressource `verifscan` et cliquez sur
   **Redeploy** (ou **Update** → **Deploy**).
3. Coolify rebuild entièrement l'image avec le nouveau code.
4. Le volume `verifscan-db` étant persistant, vos données sont conservées.

> 💡 Activez **Automatic Deploy** dans Coolify pour qu'un push sur `main`
> déclenche un redéploiement automatique.

---

## 12. Récapitulatif rapide (cheat-sheet)

```text
Repo    : https://github.com/topmuch/scanproduct
Branche : main
Build   : Dockerfile (multi-stage, node:20-alpine)
Port    : 3000
Health  : /api/health
Volume  : verifscan-db → /app/db
CMD     : npx prisma db push --accept-data-loss && node server.js
```

Bon déploiement ! 🚀
