import { createHmac, randomBytes } from "crypto";
import { db } from "@/lib/db";
import {
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * Webhooks sortants — Paramètres → API & Intégrations.
 *
 * À chaque événement métier, chaque webhook ACTIF abonné à cet événement
 * reçoit un POST JSON :
 *   { event, timestamp, data }
 * En-têtes :
 *   X-VerifScan-Event:     nom de l'événement
 *   X-VerifScan-Signature: sha256=<HMAC-SHA256(secret, corps brut)>
 * Le destinataire vérifie la signature avec le secret affiché à la création.
 *
 * CONTRAT : fireWebhooks ne JAMAIS jeter ni ralentir le flux appelant
 * (même contrat que notifySuperAdmins) — timeout 5 s par destinataire,
 * erreurs loguées, aucune propagation.
 */

export const WEBHOOK_EVENTS = [
  "scan.verified", // un QR produit a été vérifié (scan client authentique)
  "user.registered", // nouvelle inscription fabricant/marque
  "report.created", // signalement contrefaçon soumis
  "plan.activated", // un abonnement a été activé pour un utilisateur
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Secret HMAC dédié à un webhook (affiché une fois à la création). */
export function generateWebhookSecret(): string {
  return "whsec_" + randomBytes(24).toString("base64url");
}

/** Abonné à cet événement ? "*" = tous. `events` est stocké en CSV. */
function isSubscribed(eventsCsv: string, event: WebhookEvent): boolean {
  const list = eventsCsv.split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes("*") || list.includes(event);
}

async function loadActiveWebhooks(event: WebhookEvent) {
  const fetchWebhooks = () => db.webhook.findMany({ where: { active: true } });
  try {
    return (await fetchWebhooks()).filter((w) => isSubscribed(w.events, event));
  } catch (error) {
    if (!isTableMissingError(error)) throw error;
    const heal = await ensureArtisanTables();
    if (!heal.ok) return [];
    try {
      return (await fetchWebhooks()).filter((w) => isSubscribed(w.events, event));
    } catch {
      return [];
    }
  }
}

export type WebhookDeliveryResult = {
  webhookId: string;
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
};

/**
 * Livre un payload à UN webhook (test manuel ou événement).
 * Retourne le résultat détaillé — utilisé par le bouton « Tester » de l'UI.
 */
export async function deliverWebhook(
  url: string,
  secret: string,
  event: string,
  data: unknown
): Promise<WebhookDeliveryResult> {
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data,
  });
  const signature =
    "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "VerifScan-Webhooks/1.0",
        "X-VerifScan-Event": event,
        "X-VerifScan-Signature": signature,
      },
      body,
      signal: controller.signal,
    });
    return { webhookId: "", url, ok: res.ok, status: res.status };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      webhookId: "",
      url,
      ok: false,
      error: msg.includes("abort") ? "timeout (5 s)" : msg.slice(0, 200),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Déclenche un événement vers tous les webhooks abonnés.
 * Fire-and-forget : à appeler AVEC void + try/catch côté appelant.
 */
export async function fireWebhooks(
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const webhooks = await loadActiveWebhooks(event);
    if (webhooks.length === 0) return;
    await Promise.allSettled(
      webhooks.map(async (w) => {
        const result = await deliverWebhook(w.url, w.secret, event, data);
        if (result.ok) {
          console.log(`[webhooks] ${event} → ${w.url} (${result.status})`);
        } else {
          console.warn(
            `[webhooks] ${event} → ${w.url} ÉCHEC: ${result.error ?? result.status}`
          );
        }
      })
    );
  } catch (error) {
    console.warn("[webhooks] fireWebhooks erreur silencieuse:", error);
  }
}
