/**
 * E2E — Page artisan v6 : retour test n°2.
 *
 * 1. Login SuperAdmin
 * 2. POST batch 1/1/0 + activation (designation + prix) + logo horizontal
 *    + 3 photos atelier
 * 3. GET /a/<maître> → vérifie :
 *    a) HERO 100 % IMAGE : plus AUCUNE superposition (ni badges, ni titre,
 *       ni étoiles/avis) — logo VerifScan couleur + bouton Découvrir seuls
 *    b) overlay très léger
 *    c) badges carte EN VEDETTE (gradients pleins Fait main/Naturel/Local)
 *    d) péremption à FOND VERT (gradient emerald→teal plein)
 *    e) galerie atelier en SLIDER grandes images (plus de grille h-24)
 *    f) non-régressions (logo couleur, object-contain, footer, wa.me…)
 *
 * Usage : BASE=http://localhost:3100 ADMIN_PASSWORD=… DATABASE_URL=file:… \
 *          bun scripts/test-artisan-fixes-v5.ts
 */
const BASE = process.env.BASE ?? "http://localhost:3100";

let cookieJar = "";

function captureCookies(res: Response) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const [nv] = raw.split(";");
    const name = nv.split("=")[0];
    if (!name) continue;
    if (cookieJar.includes(name + "=")) {
      cookieJar = cookieJar.replace(new RegExp(`${name}=[^;]*`), nv);
    } else {
      cookieJar = cookieJar ? `${cookieJar}; ${nv}` : nv;
    }
  }
}

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      "user-agent": "test-artisan-fixes-v5",
      ...(init.headers ?? {}),
      cookie: cookieJar,
    },
  });
  captureCookies(res);
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function login(password: string) {
  const csrf = await req("/api/auth/csrf");
  const res = await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: csrf.body?.csrfToken,
      email: "admin@verifscan.sn",
      password,
      callbackUrl: `${BASE}/admin`,
    }),
  });
  const sess = await req("/api/auth/session");
  return !!(sess.body as any)?.user;
}

let failed = 0;
function expect(html: string, label: string, needle: string, mustHave = true) {
  const ok = html.includes(needle);
  if (mustHave && !ok) {
    console.error(`   ✗ ${label} — « ${needle} » ABSENT`);
    failed++;
  } else {
    console.log(`   ✓ ${label}${mustHave ? "" : " (absent comme attendu)"}`);
  }
}

async function main() {
  console.log("1. Login SuperAdmin...");
  const ok = await login(process.env.ADMIN_PASSWORD ?? "Admin123!2025");
  console.log("   login:", ok ? "OK" : "ÉCHEC");
  if (!ok) process.exit(1);

  console.log("2. POST batch de test 1/1/0...");
  const create = await req("/api/admin/batches", {
    method: "POST",
    body: JSON.stringify({ totalQuantity: 1, packSize: 1, pricePerPack: 0 }),
  });
  if (create.status !== 201) {
    console.error("   ✗ création batch:", create.status, create.body);
    process.exit(1);
  }
  const master1: string = create.body.masterCodes[0];
  console.log(`   201 ✓ maître: ${master1}`);

  console.log("3. Activation maître #1 (avec désignation + prix)...");
  const act = await req("/api/artisan/activate-pack", {
    method: "POST",
    body: JSON.stringify({
      masterCode: master1,
      productData: {
        productName: "Beurre de karité pur",
        contenance: "250g",
        productPrice: "5 000 FCFA",
        productDesignation:
          "Un beurre de karité 100 % naturel, ideal pour la peau et les cheveux.",
        ingredients:
          "Beurre de karité brut du Sénégal, vitamine E naturelle, huile de baobab pressée à froid",
        manufacturingDate: "2026-09-01",
        expirationDate: "2027-09-01",
        artisanName: "Cosmeto Test",
        contactPhone: "77 123 45 67",
      },
    }),
  });
  console.log("   status:", act.status, act.body?.message ?? act.body?.error ?? "");
  if (act.status !== 200) process.exit(1);

  console.log("3b. Logo horizontal + 3 photos atelier sur le pack (cas testés)...");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  await db.pack.updateMany({
    data: {
      logoUrl: "/test-logo-horizontal.png",
      artisanPhotos: JSON.stringify([
        "/test-atelier-1.png",
        "/test-atelier-2.png",
        "/test-atelier-3.png",
      ]),
    },
  });
  const packCount = await db.pack.count();
  await db.$disconnect();
  console.log(`   ✓ logoUrl + artisanPhotos définis sur ${packCount} pack(s)`);

  console.log("4. GET /a/" + master1 + " — vérification retour test n°2...");
  const page = await req(`/a/${master1}`);
  console.log("   status:", page.status);
  if (page.status !== 200) process.exit(1);
  const html: string = page.body;
  // Le HTML servi contient le payload RSC d'hydratation (<script>…JSON…</script>)
  // qui duplique le markup — ne compter que le DOM visible.
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, "");
  // Le hero est le seul <header> de la page.
  const hero = visible.split("<header")[1]?.split("</header>")[0] ?? "";
  const after = visible.split("</header>")[1] ?? "";

  console.log("   a) HERO 100 % image (plus de superpositions) :");
  expect(hero, "hero SANS badge Produit authentique", "Produit authentique", false);
  expect(hero, "hero SANS badge Fait main", "Fait main", false);
  expect(hero, "hero SANS sur-titre Création artisanale", "Création artisanale", false);
  expect(hero, "hero SANS titre h1", "<h1", false);
  expect(hero, "hero SANS étoiles/avis", "Avis vérifiés", false);
  expect(hero, "hero avec logo couleur", "verifscan-logo.webp?v=5");
  expect(hero, "hero avec bouton Découvrir", "Découvrir");

  console.log("   b) Overlay très léger :");
  expect(visible, "voile léger", "from-stone-950/70 via-stone-950/5 to-transparent");
  expect(visible, "ancien voile supprimé", "via-stone-950/15", false);

  console.log("   c) Badges carte EN VEDETTE :");
  expect(after, "Fait main gradient plein", "from-amber-500 to-orange-500");
  expect(after, "Naturel gradient plein", "from-emerald-500 to-teal-500");
  expect(after, "Local gradient plein", "from-sky-500 to-blue-600");

  console.log("   d) Péremption à FOND VERT :");
  expect(after, "fond vert plein", "from-emerald-500 via-green-500 to-teal-600");
  expect(after, "date en blanc sur fond vert", "text-[1.55rem] font-black leading-tight text-white");
  expect(after, "ancienne carte blanche supprimée", "rounded-[calc(2rem-1.5px)] bg-white", false);

  console.log("   e) Galerie atelier en SLIDER :");
  expect(after, "photo atelier 1 servie", "test-atelier-1.png");
  expect(after, "photo atelier 2 servie", "test-atelier-2.png");
  expect(after, "photo atelier 3 servie", "test-atelier-3.png");
  expect(after, "piste scrollbar masquée", "art-hide-scrollbar");
  expect(after, "piste scroll-snap", "snap-x snap-mandatory");
  expect(after, "grandes images h-60", "h-60 w-full object-cover");
  expect(after, "flèches navigation", "Photo suivante");
  expect(after, "points indicateurs", "Aller à la photo 2");
  expect(after, "ancienne grille supprimée", "grid grid-cols-3 gap-2", false);

  console.log("   f) Non-régression :");
  expect(after, "nom produit (carte)", "Beurre de karité pur");
  expect(after, "prix", "5 000 FCFA");
  expect(after, "désignation 1× (carte)", "ideal pour la peau et les cheveux");
  expect(visible, "2 avatars logo object-contain", "object-contain p-0.5");
  expect(after, "footer vérifié", "Vérifié par VerifScan");
  expect(after, "WhatsApp wa.me", "wa.me/221771234567");
  expect(after, "logo horizontal servi", "test-logo-horizontal.png");

  // Désignation : 1 seule occurrence visible (carte, jamais hero)
  const designation = "ideal pour la peau et les cheveux";
  const occurrences = visible.split(designation).length - 1;
  if (occurrences !== 1) {
    console.error(`   ✗ désignation affichée ${occurrences}× (attendu 1× — carte)`);
    failed++;
  } else {
    console.log("   ✓ désignation affichée 1× (carte flottante)");
  }
  // object-contain ×2 exactement (carte + histoire)
  const containCount = (visible.match(/object-contain p-0\.5/g) ?? []).length;
  if (containCount !== 2) {
    console.error(`   ✗ object-contain p-0.5 présent ${containCount}× (attendu 2×)`);
    failed++;
  } else {
    console.log("   ✓ 2 avatars logo en object-contain (carte + histoire)");
  }

  if (failed > 0) {
    console.error(`\n✗ ${failed} échec(s)`);
    process.exit(1);
  }
  console.log("\n✓ Retour test n°2 : tous les changements sont en place.");
}

main();
