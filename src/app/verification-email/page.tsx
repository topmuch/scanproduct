import Link from "next/link";
import {
  markEmailVerified,
  verifyEmailVerificationToken,
} from "@/lib/verify-email";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Validation de votre email — VerifScan",
  robots: { index: false, follow: false },
};

/**
 * GET /verification-email?token=...
 *
 * Server-rendered email verification landing page — the link embedded in the
 * welcome email points here. No client JS needed: the token is verified on
 * the server and emailVerified is stamped directly.
 *
 * States:
 *   - missing token      → error card ("lien incomplet")
 *   - invalid signature  → error card ("lien invalide")
 *   - expired            → error card ("lien expiré") + hint to re-request
 *   - valid              → success card (emailVerified stamped, idempotent)
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;

  let state: "success" | "already" | "error";
  let errorDetail: string | null = null;

  if (!rawToken) {
    state = "error";
    errorDetail = "Lien incomplet — aucun jeton de validation n'a été fourni.";
  } else {
    const check = verifyEmailVerificationToken(rawToken);
    if (!check.valid || !check.userId) {
      state = "error";
      errorDetail = check.expired
        ? "Ce lien de validation a expiré (validité : 48 heures). Connectez-vous puis reprenez la validation depuis votre tableau de bord."
        : "Ce lien de validation est invalide ou a été altéré.";
    } else {
      try {
        const result = await markEmailVerified(check.userId);
        if (!result.ok) {
          state = "error";
          errorDetail = "Compte introuvable — il a peut-être été supprimé.";
        } else {
          state = result.alreadyVerified ? "already" : "success";
        }
      } catch (err) {
        console.error("[verification-email] markEmailVerified failed:", err);
        state = "error";
        errorDetail =
          "Une erreur technique est survenue pendant la validation. Réessayez en rechargeant la page.";
      }
    }
  }

  const isSuccess = state === "success" || state === "already";

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4 py-12"
      data-testid="verify-email-page"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-lg">
        {/* Brand band */}
        <div className="bg-[#022150] px-8 py-6 text-center">
          <p className="font-display text-[22px] font-bold text-white">
            Verif<span className="text-[#10B981]">Scan</span>
          </p>
          <p className="mt-1 text-[12px] text-[#DCE7F2]">
            La vérité au bout du scan
          </p>
        </div>

        {/* State card */}
        <div className="px-8 py-10 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              isSuccess ? "bg-[#D1FAE5]" : "bg-[#FEE2E2]"
            }`}
          >
            {isSuccess ? (
              <svg
                className="h-8 w-8 text-[#059669]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="h-8 w-8 text-[#DC2626]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </div>

          {state === "success" && (
            <>
              <h1 className="mt-5 text-[20px] font-bold text-[#111827]">
                Email validé !
              </h1>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">
                Votre adresse email est confirmée. Votre compte fabricant est
                pleinement actif : connectez-vous pour accéder à votre tableau
                de bord.
              </p>
              <p
                className="mt-3 text-[12px] font-medium text-[#059669]"
                data-testid="verify-success"
              >
                Adresse email vérifiée avec succès.
              </p>
            </>
          )}

          {state === "already" && (
            <>
              <h1 className="mt-5 text-[20px] font-bold text-[#111827]">
                Email déjà validé
              </h1>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">
                Cette adresse email avait déjà été confirmée. Vous pouvez vous
                connecter directement à votre espace.
              </p>
              <p
                className="mt-3 text-[12px] font-medium text-[#059669]"
                data-testid="verify-already"
              >
                Aucune action supplémentaire nécessaire.
              </p>
            </>
          )}

          {state === "error" && (
            <>
              <h1 className="mt-5 text-[20px] font-bold text-[#111827]">
                Validation impossible
              </h1>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">
                {errorDetail}
              </p>
              <p
                className="mt-3 text-[12px] font-medium text-[#DC2626]"
                data-testid="verify-error"
              >
                Le lien de validation n&apos;a pas pu être traité.
              </p>
            </>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#022150] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#022150]/90"
            >
              Me connecter
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-[#E5E7EB] px-6 text-[14px] font-medium text-[#374151] transition-colors hover:bg-[#F9FAFB]"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
