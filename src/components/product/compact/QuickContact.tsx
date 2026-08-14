import { MessageCircle, Phone, Mail, HelpCircle } from "lucide-react";
import type { LotWithDetails } from "@/lib/public-data";

/**
 * QuickContact — prominent contact buttons (WhatsApp / Phone / Email).
 *
 * This is the section that was missing in the previous design. The consumer
 * who scans a QR code in a supermarket needs to be able to contact the
 * manufacturer in 1 tap if they have a question or a problem.
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

export function QuickContact({ fabricant }: Props) {
  const name = fabricant.companyName ?? fabricant.name ?? "le fabricant";
  const phone = fabricant.phone ?? null;
  const whatsapp = fabricant.whatsapp ?? null;
  const email = fabricant.email ?? null;

  // Build the list of available contact methods
  const methods: {
    icon: React.ReactNode;
    label: string;
    href: string;
    color: string;
  }[] = [];

  if (whatsapp) {
    methods.push({
      icon: <MessageCircle className="h-5 w-5" />,
      label: "WhatsApp",
      href: `https://wa.me/${normalizePhone(whatsapp)}`,
      color: "bg-green-500 hover:bg-green-600",
    });
  }
  if (phone) {
    methods.push({
      icon: <Phone className="h-5 w-5" />,
      label: "Téléphone",
      href: `tel:${normalizePhone(phone)}`,
      color: "bg-blue-500 hover:bg-blue-600",
    });
  }
  if (email) {
    methods.push({
      icon: <Mail className="h-5 w-5" />,
      label: "Email",
      href: `mailto:${email}`,
      color: "bg-purple-500 hover:bg-purple-600",
    });
  }

  // If no contact info at all, show a fallback
  if (methods.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-gray-500" />
          <p className="text-sm text-gray-600">
            Coordonnées du fabricant non disponibles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="mb-3 flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-gray-700" />
        <h3 className="text-sm font-bold text-gray-900">
          Une question ? Contactez {name}
        </h3>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${methods.length}, 1fr)` }}
      >
        {methods.map((m, i) => (
          <a
            key={i}
            href={m.href}
            target={m.href.startsWith("http") ? "_blank" : undefined}
            rel={m.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className={`${m.color} flex flex-col items-center gap-1.5 rounded-xl p-3 text-white transition-all hover:scale-105 hover:shadow-lg active:scale-95`}
          >
            {m.icon}
            <span className="text-[10px] font-semibold">{m.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
