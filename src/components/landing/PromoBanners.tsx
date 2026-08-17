import Link from "next/link";

/**
 * PromoBanners — 3 promotional banners side-by-side.
 *
 * Adapted to VerifScan's three value propositions:
 *   - Authentique : vérifiez l'origine et la traçabilité
 *   - Local : soutenez les producteurs sénégalais
 *   - Export : produits certifiés pour l'international
 *
 * Style: Nest grocery 3-banner row — soft pastel background + image/illustration
 * + "Shop now →" CTA.
 */
export function PromoBanners() {
  const banners = [
    {
      title: "Produits 100% authentiques",
      subtitle: "Vérifiez l'origine et la traçabilité en un scan",
      cta: "Découvrir",
      href: "/produits?sort=transparency",
      bg: "bg-[#FFF8E1]",
      accent: "text-[#7A4D00]",
      emoji: "✅",
      emojiBg: "bg-[#FFE082]",
    },
    {
      title: "Soutenez le Sénégal",
      subtitle: "Producteurs locaux & savoir-faire d'ici",
      cta: "Voir le local",
      href: "/produits",
      bg: "bg-[#FCE4EC]",
      accent: "text-[#880E4F]",
      emoji: "🇸🇳",
      emojiBg: "bg-[#F8BBD0]",
    },
    {
      title: "Certifié pour l'export",
      subtitle: "Normes internationales & traçabilité complète",
      cta: "Voir l'export",
      href: "/produits",
      bg: "bg-[#E8F5E9]",
      accent: "text-[#1B5E20]",
      emoji: "🌍",
      emojiBg: "bg-[#A5D6A7]",
    },
  ];

  return (
    <section className="bg-white py-6 sm:py-8" aria-label="Bannières promotionnelles">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => (
            <div
              key={b.title}
              className={`relative overflow-hidden rounded-2xl ${b.bg} p-5 sm:p-6`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full ${b.emojiBg} text-3xl`}
                  aria-hidden
                >
                  {b.emoji}
                </span>
                <div className="flex-1">
                  <h3 className={`text-[16px] font-bold leading-tight ${b.accent} sm:text-[18px]`}>
                    {b.title}
                  </h3>
                  <p className="mt-1 text-[12px] text-[#5A5A5A] sm:text-[13px]">
                    {b.subtitle}
                  </p>
                  <Link
                    href={b.href}
                    className={`mt-3 inline-flex items-center gap-1 text-[12px] font-semibold ${b.accent} hover:gap-2 transition-all`}
                  >
                    {b.cta}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
