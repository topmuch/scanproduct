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
2. Vérifiez que le champ **Dockerfile Location** pointe bien vers la racine :
   `/Dockerfile`.
3. Laissez le **Port** par défaut : `3000` (Next.js).

### ⚠️ Le piège du « Dockerfile inline » périmé

Si votre ressource Coolify affiche un **champ de contenu Dockerfile** (texte
collé dans l'interface) contenant quelque chose comme :

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache git libc6-compat sqlite curl
```

… alors vous utilisez une **très ancienne version** du Dockerfile. Le
`Dockerfile` actuel du dépôt (base **`node:20-bookworm-slim`**, ~7 kB, clonage
git du source + bun épinglé + build standalone) est le seul supporté.

**Correction :** dans la ressource, supprimez le contenu inline et/ou forcez
*Dockerfile Location* = `/Dockerfile` (fichier lu depuis le dépôt), puis :

1. **Redeploy** avec l'option **« Clear build cache »** (ou sur le serveur :
   `docker builder prune -f`).
2. Vérifiez dans les **Build Logs** que la 1ʳᵉ étape est bien
   `FROM node:20-bookworm-slim` — si vous voyez `node:20-alpine`, la config
   est encore périmée.

---

## 4. Étape 3 — Variables d'environnement

Cliquez sur **Environment Variables** dans le menu de la ressource, puis ajoutez
**une à une** les variables suivantes (voir `.env.example` à la racine du repo
pour référence) :

| Variable | Valeur | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | *(voir ci-dessous)* | **OBLIGATOIRE** — chaîne aléatoire de 32+ caractères. |
| `NEXTAUTH_URL` | `https://scanproduct.votredomaine.sn` | Votre domaine Coolify final (avec `https://`). |
| `ADMIN_EMAIL` | `admin@verifscan.sn` | Email du compte SuperAdmin (utilisé par le seed). |
| `ADMIN_PASSWORD` | `ChangeMeOnFirstLogin!2025` | Mot de passe SuperAdmin — **changez-le** après 1ʳᵉ connexion. |
| `CRON_SECRET` | *(chaîne aléatoire)* | **OBLIGATOIRE pour les jobs emails** — protège `/api/cron/*`. Générer : `openssl rand -hex 24`. |
| `SMTP_HOST` | `smtp.votrefournisseur.com` | **OBLIGATOIRE pour les emails** (digest hebdo, alertes péremption, rappels lots). Vide = emails désactivés (loggés en console). |
| `SMTP_PORT` | `587` | 465 si SSL. |
| `SMTP_USER` | `no-reply@verifscan.sn` | Identifiant SMTP. |
| `SMTP_PASS` | `********` | Mot de passe SMTP. |
| `SMTP_FROM` | `VerifScan <no-reply@verifscan.sn>` | Expéditeur affiché. |

> ⚠️ **Ne définissez PAS `DATABASE_URL` dans Coolify.** Le `Dockerfile` fixe
> déjà `DATABASE_URL=file:/app/data/scanproduct.db` (aligné sur le volume
> persistant — voir Étape 4). Une valeur comme `file:./db/custom.db` définie
> dans l'interface **écraserait** celle du Dockerfile et la DB serait perdue
> à chaque redéploiement. Idem pour `UPLOAD_DIR` (géré par le Dockerfile).

### 🔑 Générer `NEXTAUTH_SECRET`

- **Option A** (locale) : exécutez `openssl rand -base64 32` dans un terminal.
- **Option B** (Coolify) : à côté du champ de la variable, cliquez sur l'icône
  **🎲 Generate** — Coolify produira une valeur aléatoire.

> ⚠️ **Ne perdez pas cette valeur.** Si elle change, toutes les sessions
> utilisateurs existantes seront invalidées et les tokens JWT deviendront
> invalides (erreurs 401 sur les routes API).

### ⏰ Tâches planifiées (notifications emails fabricants)

Les emails automatiques (rapport hebdo, rapport mensuel, alertes péremption,
fin d'abonnement) sont déclenchés par des appels HTTP protégés par
`CRON_SECRET`. Dans Coolify : **Project → Ressource → Scheduled Tasks → + Add** :

| Tâche | Commande | Fréquence |
|---|---|---|
| Rapport hebdo | `curl -fsS "http://scanproduct:3000/api/cron/weekly-digest?secret=$CRON_SECRET"` | Lundi 08:00 (`0 8 * * 1`) |
| Rapport mensuel | `curl -fsS "http://scanproduct:3000/api/cron/monthly-report?secret=$CRON_SECRET"` | 1er du mois 08:00 (`0 8 1 * *`) |
| Alertes péremption | `curl -fsS "http://scanproduct:3000/api/cron/expiry-alerts?secret=$CRON_SECRET"` | Tous les jours 08:00 (`0 8 * * *`) |
| Fin d'abonnement | `curl -fsS "http://scanproduct:3000/api/cron/subscription-alerts?secret=$CRON_SECRET"` | Tous les jours 08:15 (`15 8 * * *`) |

> Les jobs sont idempotents : un digest max par semaine, un rapport mensuel
> max par mois, une alerte péremption max par jour et une alerte abonnement
> max par palier (J-7 / J-3 / expiré) — un cron qui tourne deux
> fois ne double jamais l'envoi.

### 🧪 Tester le cron

Une fois `CRON_SECRET` défini, testez les endpoints **depuis le terminal
Coolify** (onglet Terminal de la ressource) ou depuis votre machine :

```bash
# 1) Sans secret → 401 (preuve que la route est bien protégée)
curl https://scanproduct.votredomaine.sn/api/cron/weekly-digest
# {"error":"Unauthorized","reason":"Secret manquant (Authorization: Bearer ou ?secret=)"}

# 2) Avec un mauvais secret → 401
curl "https://scanproduct.votredomaine.sn/api/cron/expiry-alerts?secret=WRONG"
# {"error":"Unauthorized","reason":"Secret invalide"}

# 3a) Avec le bon secret en query → 200
curl "https://scanproduct.votredomaine.sn/api/cron/weekly-digest?secret=$CRON_SECRET"

# 3b) Avec le bon secret en header Bearer → 200 (équivalent)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://scanproduct.votredomaine.sn/api/cron/subscription-alerts
```

**Réponse de succès attendue** (HTTP 200) :

```json
{
  "ok": true,
  "job": "weekly-digest",
  "processed": 5,
  "sent": 4,
  "skipped": 1,
  "errors": [],
  "durationMs": 834
}
```

| Champ | Signification |
|---|---|
| `processed` | Fabricants actifs parcourus par le job |
| `sent` | Emails réellement envoyés |
| `skipped` | Emails non envoyés (déjà envoyés cette période, ou préférences désactivées) |
| `errors` | Erreurs éventuelles par fabricant (tableau vide = tout OK) |

> ⚠️ Si `sent` reste à 0 alors que des fabricants devraient être notifiés :
> vérifiez les variables `SMTP_*` — sans SMTP configuré, les emails sont
> seulement **loggés dans la console** du conteneur (onglet Logs), jamais
> envoyés. Un 2ᵉ appel renvoyant `skipped` = nombre de fabricants est le
> comportement **normal** (idempotence, pas une panne).

### 🏠 Test en local (développement)

```bash
# .env.local doit contenir CRON_SECRET="..."
curl "http://localhost:3000/api/cron/weekly-digest?secret=$(grep CRON_SECRET .env | cut -d'"' -f2)"
```

---

## 5. Étape 4 — Persist Storage (IMPORTANT pour SQLite) ⚠️

La base de données SQLite est un **fichier local** (`/app/data/scanproduct.db`
dans le conteneur). Sans stockage persistant, ce fichier est **effacé à chaque
reconstruction** du conteneur — vous perdriez tous les utilisateurs, fabricants,
produits et articles de blog.

### Configurer les volumes persistants

1. Dans le menu de la ressource, ouvrez **Persistent Storage** (ou
   **Storages** selon la version de Coolify).
2. Cliquez sur **+ Add Volume** et configurez **2 volumes** :

| Volume | Source (nom) | Mount Path | Contenu |
|---|---|---|---|
| Base SQLite | `verifscan-db` | `/app/data` | `scanproduct.db` — utilisateurs, produits, **articles de blog** |
| Images produits | `verifscan-uploads` | `/app/public/uploads/product` | Photos uploadées par les fabricants |

> 💡 Le `Dockerfile` crée ces dossiers avec `chmod 777` pour que le volume
> soit inscriptible quel que soit l'utilisateur du conteneur.

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
  - Réponse attendue : JSON `status: ok|degraded` avec les checks database,
    mémoire et disque.
  - Configurez ce chemin dans les paramètres de la ressource Coolify
    (Webhook/Healthcheck).

---

## 7. Étape 6 — Deploy

1. Cliquez sur le bouton **Deploy** (en haut à droite).
2. Suivez les logs de build en temps réel (onglet **Build Logs** / **Logs**).
3. Premier build : **~3 à 5 minutes** (installation des dépendances,
   `prisma generate`, `next build`).
4. Au démarrage du conteneur, le script `docker-entrypoint.sh` exécute :
   1. `prisma db push` (application du schéma SQLite),
   2. un fallback SQL direct (ALTER TABLE) si des colonnes manquent,
   3. le seed principal (comptes, produits) **puis le seed blog**
      (4 articles fondateurs — idempotent),
   4. enfin `node .next/standalone/server.js`.

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
| **Le build utilise encore `node:20-alpine` / `apk add`** | Dockerfile inline périmé dans Coolify ou cache de build ancien | Voir **Étape 2 — Le piège du Dockerfile inline** : pointer `/Dockerfile` depuis le dépôt + **Clear build cache** + Redeploy. |
| **Échec quasi instantané sur `apk add` / `apt-get` / `git clone`** | DNS ou réseau indisponible dans le builder | Tester depuis le VPS : `curl -I https://dl-cdn.alpinelinux.org` et `curl -I https://github.com`. Redémarrer Docker/Coolify si le DNS échoue. |
| **Build bloqué ou 429 au clonage** | Rate limit GitHub anonyme | Définir la variable de build `GITHUB_TOKEN` (un PAT GitHub fin, scope `repo` si privé) ; ajouter `CACHEBUST=<timestamp>` pour invalider le cache du clone. |
| **Base de données perdue après un redéploiement** | Volume persistant non configuré ou `DATABASE_URL` écrasé dans l'UI | Vérifier le volume `/app/data` (Étape 4) et **supprimer** toute variable `DATABASE_URL` définie dans Coolify. |
| **Blog vide (aucun article) en production** | Seed blog absent d'une image ancienne | Redeploy avec la dernière image — l'entrypoint seede maintenant les 4 articles fondateurs à chaque démarrage (idempotent). |
| **401 sur toutes les routes API** | `NEXTAUTH_SECRET` manquant ou modifié | Régénérer et redéfinir `NEXTAUTH_SECRET`, puis **Redeploy**. |
| **Impossible de se connecter (admin)** | `ADMIN_EMAIL` / `ADMIN_PASSWORD` ne correspondent pas à ce que le seed attend | Vérifier que ces deux variables sont définies dans Coolify et relancer le seed via le terminal. |
| **Prisma client non généré** | Le build a échoué avant l'étape `prisma generate` | Consulter les **Build Logs** ; vérifier que `prisma/schema.prisma` est bien présent. |
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
Build   : Dockerfile (racine, node:20-bookworm-slim + bun 1.3.14)
Port    : 3000
Health  : /api/health
Volumes : verifscan-db → /app/data · verifscan-uploads → /app/public/uploads/product
DB      : file:/app/data/scanproduct.db (fixée par le Dockerfile — ne pas écraser)
CMD     : docker-entrypoint.sh (db push + fallback SQL + seeds + node standalone)
```

Bon déploiement ! 🚀
