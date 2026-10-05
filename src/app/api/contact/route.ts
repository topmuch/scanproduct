import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { VERIFSCAN_EMAIL } from "@/lib/contact";

/**
 * POST /api/contact — formulaire de contact public (/contact).
 *
 * 1. Validation zod + honeypot (champ « website » caché : les bots qui le
 *    remplissent reçoivent un faux succès SANS stockage ni email).
 * 2. Rate-limit mémoire : 5 messages / heure / IP (limite anti-spam douce).
 * 3. Stockage EN BASE (ContactMessage) — aucune perte même si l'email
 *    échoue : l'onglet SuperAdmin « Messages » les affiche tous.
 * 4. Notification email à contact@verifscan.com (sendEmail central :
 *    SMTP configuré dans Paramètres → Email, sinon « skipped » en dev,
 *    EmailLog pour l'audit). Répondre au mail = répondre au visiteur
 *    (header Reply-To = email du visiteur).
 */

export const dynamic = "force-dynamic";

const ContactSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(120),
  email: z.string().trim().email("Email invalide").max(200),
  phone: z.string().trim().max(40).optional().default(""),
  subject: z.enum(["demo", "partner", "support", "press", "other"]),
  message: z.string().trim().min(10, "Message trop court").max(5000),
  // Honeypot anti-bot — invisible dans l'UI, rempli uniquement par les bots.
  website: z.string().max(200).optional().default(""),
});

const SUBJECT_LABELS: Record<string, string> = {
  demo: "Demander une démo",
  partner: "Devenir partenaire",
  support: "Support technique",
  press: "Presse / Médias",
  other: "Autre",
};

// ---------------------------------------------------------------------------
// Rate-limit mémoire (5 messages / heure / IP)
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Anti-fuite mémoire : on purge périodiquement les vieilles entrées.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  // 1) Parse du corps JSON (le formulaire envoie Content-Type application/json).
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  // 2) Honeypot — succès silencieux, rien stocké, rien envoyé.
  const website = typeof (raw as Record<string, unknown>)?.website === "string"
    ? ((raw as Record<string, unknown>).website as string)
    : "";
  if (website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  // 3) Rate-limit par IP (X-Forwarded-For derrière le reverse proxy Coolify).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "inconnue";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Trop de messages envoyés. Merci de réessayer dans une heure." },
      { status: 429 },
    );
  }

  // 4) Validation.
  const parsed = ContactSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Champs invalides" },
      { status: 400 },
    );
  }
  const { name, email, phone, subject, message } = parsed.data;
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;

  // 5) Stockage en base — source de vérité (onglet Messages SuperAdmin).
  let saved;
  try {
    saved = await db.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject,
        message,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    console.error("[POST /api/contact] Échec enregistrement DB:", err);
    return NextResponse.json(
      { error: "Impossible d'enregistrer votre message. Réessayez." },
      { status: 500 },
    );
  }

  // 6) Notification email à contact@verifscan.com — jamais bloquante pour
  //    l'utilisateur (le message est déjà en base). Le résultat met à jour
  //    ContactMessage.emailStatus (auditable dans l'onglet Messages).
  const sujetLabel = SUBJECT_LABELS[subject] ?? subject;
  const rows: Array<[string, string]> = [
    ["Nom", name],
    ["Email", email],
    ["Téléphone", phone || "—"],
    ["Sujet", sujetLabel],
    ["Message", message],
  ];
  const tableHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;color:#6B7280;font-weight:600;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 12px;color:#111827">${escapeHtml(v).replace(/\n/g, "<br/>")}</td></tr>`,
    )
    .join("");
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#022150;color:#fff;padding:18px 24px;border-radius:10px 10px 0 0">
    <h2 style="margin:0;font-size:18px">Nouveau message — formulaire de contact</h2>
  </div>
  <table style="border:1px solid #E5E7EB;border-top:none;border-radius:0 0 10px 10px;width:100%;border-collapse:collapse;background:#fff">
    ${tableHtml}
  </table>
  <p style="color:#9CA3AF;font-size:12px;margin-top:14px">
    Reçu le ${new Date().toLocaleString("fr-FR")} depuis /contact — le message est aussi visible dans l'onglet « Messages » du SuperAdmin.
  </p>
</div>`;

  void sendEmail({
    to: VERIFSCAN_EMAIL,
    subject: `[VerifScan Contact] ${sujetLabel} — ${name}`,
    html,
    text: `Nom: ${name}\nEmail: ${email}\nTéléphone: ${phone || "—"}\nSujet: ${sujetLabel}\n\n${message}`,
  })
    .then(async (result) => {
      try {
        await db.contactMessage.update({
          where: { id: saved.id },
          data: { emailStatus: result.status.toUpperCase() },
        });
      } catch (e) {
        console.error("[POST /api/contact] MAJ emailStatus échouée:", e);
      }
    })
    .catch(async (e) => {
      console.error("[POST /api/contact] Notification email échouée:", e);
      try {
        await db.contactMessage.update({
          where: { id: saved.id },
          data: { emailStatus: "FAILED" },
        });
      } catch {
        /* base indisponible — rien de plus à faire */
      }
    });

  return NextResponse.json({ ok: true, id: saved.id });
}
