/**
 * E2E — Nouvelle page produit artisanale engageante (/a/<code>).
 *
 * 1. Login SuperAdmin
 * 2. POST batch de test 2/1/0 → 2 codes maîtres (2 packs de 1 produit)
 * 3. Activation maître #1 avec artisanBio + usageTips (artisan « Cosmeto Test »)
 * 4. Activation maître #2, même artisan, SANS bio/conseils (test des défauts)
 * 5. GET /a/<maître1>  → sections 1-11 présentes, bio custom, conseils custom,
 *    produits similaires (les produits du même artisan apparaissent)
 * 6. GET /a/<ART pack2> → 200 + bio par défaut (fallback) + conseils par défaut
 *
 * Usage : bun scripts/test-artisan-page.ts
 */
const BASE = "http://localhost:3000";

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
      "user-agent": "test-artisan-page-script",
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

function expect(html: string, label: string, needle: string, mustHave = true) {
  const ok = html.includes(needle);
  if (mustHave && !ok) {
    console.error(`   ✗ ${label} — « ${needle} » ABSENT`);
    process.exitCode = 1;
  } else {
    console.log(`   ✓ ${label}${mustHave ? "" : " (absent comme attendu)"}`);
  }
  return ok;
}

async function main() {
  const failuresBefore = process.exitCode;

  console.log("1. Login SuperAdmin...");
  const ok = await login(process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025");
  console.log("   login:", ok ? "OK" : "ÉCHEC");
  if (!ok) process.exit(1);

  console.log("2. POST batch de test 2/1/0 (2 packs de 1 produit)...");
  const create = await req("/api/admin/batches", {
    method: "POST",
    body: JSON.stringify({ totalQuantity: 2, packSize: 1, pricePerPack: 0 }),
  });
  if (create.status !== 201) {
    console.error("   ✗ création batch:", create.status, create.body);
    process.exit(1);
  }
  const batchId: string = create.body.batch.id;
  const [master1, master2]: string[] = create.body.masterCodes;
  const batch8 = batchId.slice(0, 8).toUpperCase();
  const art2 = `ART-${batch8}-P02-0001`; // code produit du pack 2 (déterministe)
  console.log(`   201 ✓ maîtres: ${master1}, ${master2} — art2: ${art2}`);

  console.log("3. Activation maître #1 (avec bio + conseils, artisan « Cosmeto Test »)...");
  const act1 = await req("/api/artisan/activate-pack", {
    method: "POST",
    body: JSON.stringify({
      masterCode: master1,
      productData: {
        productName: "Beurre de karité pur",
        contenance: "250g",
        ingredients: "Beurre de karité brut du Sénégal, vitamine E naturelle, huile de baobab pressée à froid, amour des artisans locaux",
        manufacturingDate: "2026-09-01",
        expirationDate: "2027-09-01",
        artisanName: "Cosmeto Test",
        contactPhone: "77 123 45 67",
        artisanBio:
          "Cosmeto fabrique des beurres et savons naturels depuis 2020 à Dakar, avec des ingrédients achetés directement aux coopératives de femmes.",
        usageTips: "Appliquer matin et soir sur le visage propre\nConserver au frais en saison chaude",
      },
    }),
  });
  console.log("   status:", act1.status, act1.body?.message ?? act1.body?.error ?? "");
  if (act1.status !== 200) process.exit(1);

  console.log("4. Activation maître #2 (même artisan, SANS bio ni conseils)...");
  const act2 = await req("/api/artisan/activate-pack", {
    method: "POST",
    body: JSON.stringify({
      masterCode: master2,
      productData: {
        productName: "Savon noir exfoliant",
        contenance: "150g",
        ingredients: "Huile de palmiste, cendres de cacao, beurre de karité",
        manufacturingDate: "2026-08-15",
        expirationDate: "2027-08-15",
        artisanName: "Cosmeto Test",
        contactPhone: "771234567",
      },
    }),
  });
  console.log("   status:", act2.status, act2.body?.message ?? act2.body?.error ?? "");
  if (act2.status !== 200) process.exit(1);

  console.log("5. GET /a/" + master1 + " (bio + conseils custom)...");
  const page1 = await req(`/a/${master1}`);
  console.log("   status:", page1.status);
  if (page1.status !== 200) process.exit(1);
  const html1: string = page1.body;
  expect(html1, "S3 avantages", "Pourquoi choisir ce produit");
  expect(html1, "S3 badge naturel", "100% Naturel");
  expect(html1, "S4 composition", "Composition naturelle");
  expect(html1, "S4 sans allergènes", "Sans allergènes de synthèse");
  expect(html1, "S5 fraîcheur", "Encore frais pendant");
  expect(html1, "S5 dates", "Fabriqué le");
  expect(html1, "S5 barre progression", "Fabrication");
  expect(html1, "S6 histoire", "histoire de");
  expect(html1, "S6 artisan nommé", "Cosmeto Test");
  expect(html1, "S6 bio custom", "coopératives de femmes");
  expect(html1, "S6 avatar certifié", "Artisan certifié VerifScan");
  expect(html1, "S7 conseils", "Conseils d");
  expect(html1, "S7 tip custom", "Appliquer matin et soir sur le visage propre");
  expect(html1, "S8 WhatsApp lien normalisé", "wa.me/221771234567");
  expect(html1, "S8 CTA contacter", "Contacter");
  expect(html1, "S8 téléphone", "77 123 45 67");
  expect(html1, "S9 avis", "Avis des clients");
  expect(html1, "S10 similaires", "Autres produits de");
  expect(html1, "S10 produit lié", "Savon noir exfoliant");
  expect(html1, "S11 footer", "Vérifié par VerifScan");

  console.log("6. GET /a/" + art2 + " (fallbacks par défaut)...");
  const page2 = await req(`/a/${art2}`);
  console.log("   status:", page2.status);
  if (page2.status !== 200) process.exit(1);
  const html2: string = page2.body;
  expect(html2, "produit 2", "Savon noir exfoliant");
  expect(html2, "S6 bio par défaut", "fabrique des produits naturels avec passion");
  expect(html2, "S7 tip par défaut", "Appliquer sur peau propre");
  expect(html2, "S10 similaires (produit 1)", "Beurre de karité pur");
  expect(html2, "WhatsApp sans espace (771234567)", "771234567");

  if (process.exitCode === failuresBefore && process.exitCode !== 1) {
    console.log("=== PAGE ARTISAN ENGAGEANTE VALIDÉE (11 sections + similaires dynamiques) ===");
  }
}

main();
