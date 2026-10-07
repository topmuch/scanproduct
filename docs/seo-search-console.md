# Guide Search Console — indexation des lots VerifScan

Ce document explique les **motifs de non-indexation** rapportés par Google
Search Console pour verifscan.com, les correctifs appliqués dans le code et
la procédure d'automatisation de l'indexation des passeports produits.

---

## 1. Motifs Search Console et correctifs

### « Autre page avec balise canonique correcte »

**Cause.** Les QR codes imprimés encodent l'URL courte `/p/{id}`. Jusqu'à
présent cette forme était servie en **200** avec une balise `<link
rel="canonical">` pointant vers la forme parlante `/p/{id}-{nom-marque}`.
Google explorait les deux formes, refusait d'indexer la courte (duplicate)
et la listait dans ce motif. Le comportement était correct mais polluait le
rapport.

**Correctif** (src/app/p/[lotId]/page.tsx). La forme courte (et toute
ancienne forme parlante après renommage du produit) est désormais
**redirigée en 308 Permanent Redirect** vers la forme parlante canonique,
avec conservation du paramètre `?code=` d'attribution des scans. Les
redirections sont suivies par les lecteurs de QR codes : rien ne change
pour l'utilisateur, et Google consolide définitivement les signaux.

> « Autre page avec balise canonique correcte » n'a jamais été une erreur :
> Google indique seulement que ces pages redondantes ne sont PAS indexées
> (volontairement). Après le déploiement, les URLs concernées migreront
> vers « Page avec redirection » puis disparaîtront du rapport lors des
> réexplorations.

### « Introuvable (404) »

**Causes.**
1. **URLs historiques** : les IDs de lots changent quand la base est
   réinitialisée (re-seed). Les URLs indexées avant une réinitialisation
   pointent vers des lots qui n'existent plus — Google les écarte de
   lui-même après quelques réexplorations (c'est le fonctionnement normal).
2. **Sondes de bots** : `/wp-admin`, `/wp-login.php`, etc. — bruit normal
   présent sur tous les sites.
3. **Soft-404 corrigés** : les lots inconnus sous `/p/` renvoyaient une
   page amicale en **statut 200** (soft-404 — le pire signal possible :
   Google croyait que la page existait mais était vide).

**Correctif** (src/app/p/[lotId]/page.tsx + not-found.tsx). Les lots
inconnus renvoient désormais un **vrai statut HTTP 404** (`notFound()`)
tout en affichant une page branding VerifScan (en-tête/pied publics, lien
catalogue). Le resolver GS1 racine servait déjà une 404 HTML correcte pour
les chemins hors routes ; une 404 globale branding existe aussi
(src/app/not-found.tsx).

**Action Search Console** : dans le rapport « Pages », sélectionner les
URLs 404 historiques et cliquer **« Valider la correction »** après
déploiement. Ne JAMAIS « corriger » les 404 de sondes de bots : c'est le
statut correct.

### « Page avec redirection »

**Cause.** Redirections saines : http→https, www→verifscan.com (gérées par
Coolify), slash final, et désormais courte→parlante (308). Ce motif est
**informationnel** : tant que la cible de redirection renvoie 200, rien à
corriger. Après quelques semaines, Google purge ces entrées.

---

## 2. Automatisation de l'indexation

### Endpoint de ping : `GET|POST /api/seo/ping?secret=…`

Protégé par `SEO_PING_SECRET` (ou `NEXTAUTH_SECRET` à défaut), le endpoint :

1. Lit `/sitemap.xml` et compte les URLs (dont les passeports `/p/`).
2. **IndexNow** (actif — Bing, Yandex, Seznam, Naver) : pousse les URLs des
   lots mis à jour depuis ≤ 30 jours. Clé générée automatiquement (Setting
   `indexNowKey`) et servie à la racine `/{clé}.txt` (spécification IndexNow).
3. **Google Indexing API** (actif si configuré — voir ci-dessous) : pousse
   les mêmes URLs via `urlNotifications:publish` (quota Google 200/jour).
4. Journalise le résultat dans le Setting `seoLastPing` (lisible dans
   Superadmin → Paramètres).

### Cron quotidien (Coolify / crontab)

```bash
0 8 * * * curl -s "https://verifscan.com/api/seo/ping?secret=$SEO_PING_SECRET" >> /var/log/verifscan-seo.log 2>&1
```

(Le script `scripts/ping-google.sh` encapsule cet appel.)

### Activer le canal Google Indexing API (recommandé)

1. **Google Cloud Console** → créer/sélectionner un projet → activer
   l'« **Indexing API** » (Bibliothèque d'API).
2. **IAM & Admin → Comptes de service** → créer un compte de service →
   onglet « Clés » → créer une clé **JSON**.
3. **Search Console** (propriété verifscan.com) → Paramètres → Utilisateurs
   et autorisations → ajouter l'e-mail du compte de service
   (`…@…iam.gserviceaccount.com`) avec le rôle **Propriétaire**.
4. Dans Coolify (Variables d'environnement de l'application) :
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=…@…iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n"
   ```
   (garder les `\n` littéraux entre guillemets — le code les convertit).
5. Redéployer, puis tester : `curl
   "https://verifscan.com/api/seo/ping?secret=$SEO_PING_SECRET"` — le
   rapport affiche `googleIndexing: "poussé (N URLs)"`.

> Google documente officiellement l'API Indexing pour les pages
> JobPosting/Livestream ; elle accepte en pratique tous types de pages.
> Les canaux complémentaires restent le sitemap (déjà déclaré dans
> robots.txt) et la soumission manuelle du sitemap dans Search Console.

### Bonnes pratiques Search Console

- **Sitemap** : s'assurer que `https://verifscan.com/sitemap.xml` est bien
  soumis dans « Sitemaps » (statut « Réussite », N URLs découvertes).
- **Inspection d'URL** : pour accélérer l'indexation d'un nouveau lot,
  « Demander une indexation » sur son URL parlante.
- **Validation** : après chaque déploiement corrigeant un motif, cliquer
  « Valider la correction » — le délai type est de 2 à 4 semaines.
