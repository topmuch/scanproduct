import { MessageCircle, Phone, Mail, HelpCircle } from "lucide-react";
import type { LotWithDetails } from "@/lib/public-data";
import { cn } from "@/lib/utils";

/**
 * ContactOrb — premium contact buttons with gradient + glow.
 *
 * Renders a glassmorphism card with up to 3 contact method buttons
 * (WhatsApp / Téléphone / Email). Each button has a colored gradient
 * background, matching glow shadow and hover lift animation.
 *
 * Server component (links open new tabs — no client interactivity needed).
 */

type Props = {
  fabricant: LotWithDetails["fabricant"];
};

function normalizePhone(p: string): string {
  const trimmed = p.trim();
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

type ContactMethod = {
  emoji: string;
  Icon: typeof MessageCircle;
  label: string;
  href: string;
  gradient: string;
  glow: string;
  external: boolean;
};

export function ContactOrb({ fabricant }: Props) {
  const name = fabricant.companyName ?? fabricant.name ?? "le fabricant";
  const phone = fabricant.phone?.trim() ?? null;
  const whatsapp = fabricant.whatsapp?.trim() ?? null;
  const email = fabricant.email?.trim() ?? null;

  const methods: ContactMethod[] = [];

  if (whatsapp) {
    methods.push({
      emoji: "💬",
      Icon: MessageCircle,
      label: "WhatsApp",
      href: `https://wa.me/${normalizePhone(whatsapp)}`,
      gradient: "from-green-500 via-emerald-500 to-teal-500",
      glow: "wow-shadow-glow-green",
      external: true,
    });
  }
  if (phone) {
    methods.push({
      emoji: "📞",
      Icon: Phone,
      label: "Téléphone",
      href: `tel:${normalizePhone(phone)}`,
      gradient: "from-blue-500 via-blue-600 to-cyan-500",
      glow: "wow-shadow-glow-blue",
      external: false,
    });
  }
  if (email) {
    methods.push({
      emoji: "✉️",
      Icon: Mail,
      label: "Email",
      href: `mailto:${email}`,
      gradient: "from-purple-500 via-pink-500 to-rose-500",
      glow: "wow-shadow-glow-purple",
      external: false,
    });
  }

  return (
    <div className="group relative">
      {/* Glow blur behind the whole card */}
      <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-30" />

      <div className="wow-glass wow-shadow-card relative overflow-hidden rounded-3xl p-4 sm:p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="wow-shadow-glow-purple flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-gray-900 sm:text-lg">
              Une question ?
            </h3>
            <p className="truncate text-xs text-gray-600 sm:text-sm">
              Contactez {name} directement
            </p>
          </div>
        </div>

        {/* Contact methods */}
        {methods.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-6 text-center">
            <div className="mb-2 text-3xl" aria-hidden>
              📭
            </div>
            <p className="text-sm font-medium text-gray-600">
              Contact non disponible
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Ce fabricant n&apos;a pas encore partagé ses coordonnées.
            </p>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${methods.length}, minmax(0, 1fr))` }}
          >
            {methods.map((m, i) => {
              const { Icon } = m;
              return (
                <a
                  key={i}
                  href={m.href}
                  target={m.external ? "_blank" : undefined}
                  rel={m.external ? "noopener noreferrer" : undefined}
                  className={cn(
                    "group/btn relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white transition-all duration-300 hover:-translate-y-2 hover:scale-110 hover:ring-4 hover:ring-white/40 active:scale-95 sm:p-5",
                    m.gradient,
                    m.glow,
                  )}
                >
                  {/* Decorative white blur circle */}
                  <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-white/20 blur-md transition-all duration-300 group-hover/btn:scale-150" />

                  <div className="relative flex flex-col items-center gap-1.5">
                    <div className="flex h-7 w-7 items-center justify-center" aria-hidden>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider sm:text-xs">
                      {m.label}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
