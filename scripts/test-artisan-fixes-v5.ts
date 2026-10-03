/**
 * E2E — Page artisan WOW v5 : correctifs retour test mobile.
 *
 * 1. Login SuperAdmin
 * 2. POST batch de test 1/1/0 → 1 code maître
 * 3. Activation avec productDesignation + prix
 * 4. GET /a/<maître> → vérifie les 5 correctifs :
 *    a) hero plus bas sur mobile (min-h-[75svh] + sm:min-h-[92svh])
 *    b) overlay allégé (from-stone-950/95 via-stone-950/15 to-stone-950/5)
 *       + description ABSENTE du hero (présente 1× dans la carte)
 *    c) badges opaques (bg-emerald-600 / bg-amber-500 / bg-white)
 *    d) logo VerifScan EN COULEUR (verifscan-logo.webp) sur pastille blanche
 *       dans le hero ET le footer (plus de verifscan-logo-white)
 *    e) logos artisan object-contain (2 occurrences)
 *
 * Usage : BASE=http://localhost:3100 bun scripts/test-artisan-fixes-v5.ts
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
  const ok = await login(process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025");
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

  console.log("3b. Attribution d'un logo HORIZONTAL 400x120 au pack (cas testé)...");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  await db.pack.updateMany({ data: { logoUrl: "/test-logo-horizontal.png" } });
  const packCount = await db.pack.count();
  await db.$disconnect();
  console.log(`   ✓ logoUrl défini sur ${packCount} pack(s)`);

  console.log("4. GET /a/" + master1 + " — vérification des 5 correctifs...");
  const page = await req(`/a/${master1}`);
  console.log("   status:", page.status);
  if (page.status !== 200) process.exit(1);
  const html: string = page.body;
  // Le HTML servi contient le payload RSC d'hydratation (<script>…JSON…</script>)
  // qui DUPRIQUE le markup — ne compter que le DOM visible.
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, "");

  console.log("   a) Hero mobile compact :");
  expect(html, "hero 75svh mobile", "min-h-[75svh]");
  expect(html, "hero 92svh desktop", "sm:min-h-[92svh]");

  console.log("   b) Image produit visible :");
  expect(html, "overlay allégé (haut quasi transparent)", "from-stone-950/95 via-stone-950/15 to-stone-950/5");
  // La désignation ne doit apparaître qu'UNE fois visible (carte), jamais dans le hero.
  const designation = "ideal pour la peau et les cheveux";
  const occurrences = visible.split(designation).length - 1;
  if (occurrences !== 1) {
    console.error(`   ✗ désignation affichée ${occurrences}× (attendu 1× — carte seulement)`);
    failed++;
  } else {
    console.log("   ✓ désignation affichée 1× (carte flottante, plus de recouvrement hero)");
  }

  console.log("   c) Badges visibles :");
  expect(html, "badge authentique opaque", "bg-emerald-600");
  expect(html, "badge fait main opaque", "bg-amber-500");
  expect(html, "badge naturel blanc", "text-emerald-700 shadow-lg ring-1 ring-white");

  console.log("   d) Logo VerifScan en couleur :");
  expect(html, "logo couleur hero", "verifscan-logo.webp?v=5");
  expect(html, "plus de logo blanc", "verifscan-logo-white", false);
  expect(html, "pastille blanche hero", "rounded-full bg-white px-5 py-2.5");
  expect(html, "carte blanche footer", "rounded-3xl bg-white px-6 py-3.5");

  console.log("   e) Logo artisan non coupé :");
  expect(visible, "logo horizontal servi", "test-logo-horizontal.png");
  const containCount = (visible.match(/object-contain p-0\.5/g) ?? []).length;
  if (containCount !== 2) {
    console.error(`   ✗ object-contain p-0.5 présent ${containCount}× (attendu 2×)`);
    failed++;
  } else {
    console.log("   ✓ 2 avatars logo en object-contain (carte + histoire)");
  }

  console.log("   f) Non-régression :");
  expect(html, "nom produit", "Beurre de karité pur");
  expect(html, "prix", "5 000 FCFA");
  expect(html, "badge fait main carte", "Fait main");
  expect(html, "footer vérifié", "Vérifié par VerifScan");
  expect(html, "WhatsApp wa.me", "wa.me/221771234567");

  if (failed > 0) {
    console.error(`\n✗ ${failed} échec(s)`);
    process.exit(1);
  }
  console.log("\n✓ Tous les correctifs sont en place.");
}

main();
