/**
 * Test e2e ciblé — page artisan WOW (redesign v4).
 *  1. Vérifie les marqueurs du nouveau design dans le HTML rendu
 *  2. Teste /api/artisan/track-scan (équivalent client ScanTracker)
 *  3. Teste /api/artisan/reviews (formulaire d'avis)
 *  4. Rendu sans photo (placeholder stylisé)
 *
 * Usage : bun run scripts/test-artisan-wow.ts
 */
import { spawn } from "child_process";

const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const STANDALONE = "/home/z/my-project/scanproduct/.next/standalone";
const DB = "file:/home/z/my-project/db/custom.db";

let failures = 0;
function ok(label: string, condition: boolean, detail = "") {
  const icon = condition ? "✅" : "❌";
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures++;
}

async function waitForServer(timeoutMs = 20000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  // 1. Démarre le serveur standalone
  const server = spawn("bun", ["server.js"], {
    cwd: STANDALONE,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_URL: DB,
      NEXTAUTH_SECRET: "test-local-secret-0123456789abcdef",
      NODE_ENV: "production",
    },
    stdio: "ignore",
  });

  try {
    if (!(await waitForServer())) {
      console.error("❌ serveur jamais prêt");
      process.exit(1);
    }
    console.log("✅ Serveur prêt");

    // 2. Page produit active (sans photo → placeholder)
    const page = await fetch(`${BASE}/a/ART-CMURJRRV-P01-0001`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
    });
    const html = await page.text();
    ok("page produit → 200", page.status === 200);

    // ── Marqueurs du design WOW ────────────────────────────────────────────
    const markers: Array<[string, string]> = [
      ["hero plein écran 92svh", "min-h-[92svh]"],
      ["zoom Ken Burns", "art-kenburns"],
      ["badges flottants animés", "art-float"],
      ["titre révélé", "art-title-reveal"],
      ["bouton Découvrir", "Découvrir"],
      ["scroll smooth target", 'id="produit"'],
      ["glassmorphism carte", "backdrop-blur-2xl"],
      ["badges dynamiques (Fait main)", "Fait main"],
      ["badge Naturel", "Naturel"],
      ["badge Local", "Local"],
      ["compte à rebours jours", "jours restants"],
      ["barre fraîcheur shimmer", "art-shimmer"],
      ["section Pourquoi choisir", "Pourquoi choisir ce produit"],
      ["card soutien direct", "Soutien direct"],
      ["composition icônée", "Composition naturelle"],
      ["coche animée sans allergènes", "art-check-path"],
      ["histoire artisan", "Artisan certifié VerifScan"],
      ["timeline conseils (ligne)", "before:bg-gradient-to-b"],
      ["CTA WhatsApp géant", "Commander sur WhatsApp"],
      ["anneaux pulsants", "art-ring"],
      ["coordonnées tuiles", "Coordonnées de l"],
      ["avis clients", "Avis des clients"],
      ["footer dark blockchain", "Traçabilité blockchain"],
      ["historique immuable", "Historique immuable"],
      ["reveal au scroll", "art-reveal"],
      ["placeholder stylisé (pas de photo)", "radial-gradient"],
      ["lien WhatsApp wa.me", "wa.me/221771234567"],
    ];
    for (const [label, marker] of markers) {
      ok(label, html.includes(marker));
    }

    // ── 3. Tracking scan (ce que fait ScanTracker côté client) ────────────
    const track = await fetch(`${BASE}/api/artisan/track-scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "ART-CMURJRRV-P01-0001",
        timezone: "Africa/Dakar",
        deviceType: "mobile",
      }),
    });
    ok("track-scan → 2xx", track.ok, `status=${track.status}`);

    // ── 4. Formulaire d'avis ───────────────────────────────────────────────
    const review = await fetch(`${BASE}/api/artisan/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "ART-CMURJRRV-P01-0001",
        authorName: "Test Wow",
        rating: 5,
        comment: "Design magnifique, produit authentique !",
      }),
    });
    const reviewBody = (await review.json().catch(() => ({}))) as { error?: string };
    ok("POST avis → 2xx", review.ok, review.ok ? "" : reviewBody.error ?? "");

    // ── 5. Page avec photo (upload simulé : photoUrl sur un 2e lot) ───────
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();
    // Sections conditionnelles : précautions + conservation (assistant)
    await db.preActivatedLot.updateMany({
      where: { qrCode: "ART-CMURJRRV-P01-0001" },
      data: {
        precautions: JSON.stringify([
          "Éviter le contact avec les yeux",
          "Test cutané recommandé avant usage",
        ]),
        storageConditions: "Conserver au frais, à l'abri du soleil",
      },
    });
    const pagePrec = await fetch(`${BASE}/a/ART-CMURJRRV-P01-0001`);
    const htmlPrec = await pagePrec.text();
    ok("précautions cards (sections conditionnelles)", htmlPrec.includes("Précautions d"));
    ok("item précaution n°2", htmlPrec.includes("Test cutané recommandé"));
    ok("conservation (section conditionnelle)", htmlPrec.includes("Conservation"));
    ok("icône frigo animée", htmlPrec.includes("art-float"));
    ok("texte conservation", htmlPrec.includes("abri du soleil"));
    await db.preActivatedLot.updateMany({
      where: { qrCode: "ART-CMURJRRV-P01-0001" },
      data: { photoUrl: "/uploads/test-wow-photo.jpg" },
    });
    const page2 = await fetch(`${BASE}/a/ART-CMURJRRV-P01-0001`);
    const html2 = await page2.text();
    ok("photoUrl rendue dans le hero", html2.includes("/uploads/test-wow-photo.jpg"));
    // placeholder absent quand photo présente (trame de points)
    ok("trame placeholder masquée avec photo", !html2.includes("26px 26px"));
    // et l'aperçu OG utilise la photo
    ok("meta OG avec photo", html2.includes("og:image"));

    // remise à zéro
    await db.preActivatedLot.updateMany({
      where: { qrCode: "ART-CMURJRRV-P01-0001" },
      data: { photoUrl: null, precautions: null, storageConditions: null },
    });

    // scan bien enregistré
    const scans = await db.artisanScan.count({
      where: { lot: { qrCode: "ART-CMURJRRV-P01-0001" } },
    });
    ok("ArtisanScan enregistré via API", scans >= 1, `${scans} scan(s)`);
    const reviewsCount = await db.artisanReview.count({
      where: { lot: { qrCode: "ART-CMURJRRV-P01-0001" } },
    });
    ok("Avis enregistré", reviewsCount >= 1, `${reviewsCount} avis`);

    await db.$disconnect();

    console.log(
      failures === 0 ? "\n🎉 Tous les tests WOW passent" : `\n💥 ${failures} test(s) en échec`
    );
    process.exit(failures === 0 ? 0 : 1);
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((e) => {
  console.error("Erreur fatale:", e);
  process.exit(1);
});
