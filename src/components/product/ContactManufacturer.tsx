import { MessageCircle, Mail, Phone, Globe, MapPin, Facebook, Instagram } from "lucide-react";
import type { LotWithDetails } from "@/lib/public-data";

type Props = {
  fabricant: LotWithDetails["fabricant"];
};

function normalizePhone(p: string): string {
  // Keep digits and + for tel: / wa.me links
  const trimmed = p.trim();
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

/**
 * ContactManufacturer — card with manufacturer info and contact actions.
 * Server component.
 */
export function ContactManufacturer({ fabricant }: Props) {
  const phone = fabricant.phone ?? null;
  const whatsapp = fabricant.whatsapp ?? null;
  const email = fabricant.email ?? null;
  const website = fabricant.website ?? null;
  const facebook = fabricant.facebook ?? null;
  const instagram = fabricant.instagram ?? null;
  const address = [fabricant.address, fabricant.city, fabricant.country]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
        📞 Contact fabricant
      </h2>

      <div className="mt-4 flex items-start gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-200">
          {fabricant.logoUrl ? (
            <img
              src={fabricant.logoUrl}
              alt={fabricant.companyName ?? "Logo"}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-xl font-bold text-blue-600">
              {(fabricant.companyName ?? fabricant.name ?? "?")
                .charAt(0)
                .toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">
            {fabricant.companyName ?? fabricant.name ?? "Fabricant"}
          </p>
          {fabricant.description && (
            <p className="mt-0.5 line-clamp-3 text-xs text-gray-600">
              {fabricant.description}
            </p>
          )}
          {fabricant.yearFounded && (
            <p className="mt-1 text-[11px] text-gray-500">
              Depuis {fabricant.yearFounded}
              {fabricant.sector ? ` · ${fabricant.sector}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Contact buttons */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {whatsapp && (
          <a
            href={`https://wa.me/${normalizePhone(whatsapp)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-600"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        )}
        {phone && (
          <a
            href={`tel:${normalizePhone(phone)}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Phone className="h-4 w-4" />
            Téléphone
          </a>
        )}
      </div>

      {/* Address */}
      {address && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
          <span>{address}</span>
        </div>
      )}

      {/* Website + socials */}
      {(website || facebook || instagram) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Globe className="h-3.5 w-3.5 text-blue-600" />
              {(() => {
                try {
                  return new URL(website).hostname.replace(/^www\./, "");
                } catch {
                  return "Site web";
                }
              })()}
            </a>
          )}
          {facebook && (
            <a
              href={`https://facebook.com/${facebook.replace(/^\//, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />
              Facebook
            </a>
          )}
          {instagram && (
            <a
              href={`https://instagram.com/${instagram.replace(/^\//, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Instagram className="h-3.5 w-3.5 text-pink-600" />
              Instagram
            </a>
          )}
        </div>
      )}
    </section>
  );
}
