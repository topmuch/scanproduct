import { NextResponse } from "next/server";

/**
 * GET /api
 * API root — returns a small index of available endpoints so that
 * curious callers (or future integrators) can discover the API surface
 * without having to read the source.
 */
export async function GET() {
  return NextResponse.json({
    name: "VerifScan API",
    version: "1.0.0",
    description:
      "Passeport numérique produit — authentification, traçabilité et transparence pour fabricants et consommateurs.",
    endpoints: {
      public: [
        { method: "GET", path: "/api/health", description: "Health check (DB + uptime)" },
        { method: "GET", path: "/api/products", description: "Catalogue public paginé + filtrable" },
        { method: "GET", path: "/api/lots/{id}?scan=true", description: "Passeport numérique d'un lot" },
        { method: "POST", path: "/api/register", description: "Création de compte FABRICANT" },
      ],
      auth: [
        { method: "GET", path: "/api/auth/*", description: "NextAuth.js (signin, signout, session, csrf)" },
        { method: "POST", path: "/api/products", description: "Créer un produit (FABRICANT authentifié)" },
        { method: "POST", path: "/api/upload", description: "Upload d'image produit (FABRICANT authentifié)" },
        { method: "POST", path: "/api/qr-codes/generate", description: "Générer des QR codes pour un lot (FABRICANT authentifié)" },
      ],
    },
    docs: "/docs",
    contact: "contact@verifscan.sn",
  });
}
