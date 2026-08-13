"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { RefreshCw, ShieldCheck, QrCode, Eye } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { getScanUrl } from "@/lib/qr-utils";
import { AnimatedSection } from "./AnimatedSection";
import { SectionBadge } from "./SectionBadge";

const DEMO_PRODUCTS = [
  { id: "bissap", nom: "Jus de Bissap Premium", image: "/products/jus-bissap.png", lot: "LOT-2026-07-001", score: 95, certifications: ["Bio", "Halal", "Sans gluten"] },
  { id: "moringa", nom: "Poudre de Moringa Bio", image: "/products/poudre-moringa.png", lot: "LOT-2026-06-142", score: 92, certifications: ["Bio", "Équitable"] },
  { id: "couscous", nom: "Couscous de Mil", image: "/products/couscous-mil.png", lot: "LOT-2026-07-008", score: 88, certifications: ["Local", "Sans gluten"] },
  { id: "baobab", nom: "Huile de Baobab", image: "/products/huile-baobab.png", lot: "LOT-2026-05-077", score: 90, certifications: ["Bio", "Artisanal"] },
];

const RESET_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function DemoSection() {
  const [productIndex, setProductIndex] = useState(0);
  const [remaining, setRemaining] = useState(RESET_INTERVAL_MS);
  const [resetting, setResetting] = useState(false);
  const resetAtRef = useRef<number>(0);

  // Persist reset timestamp + tick countdown
  useEffect(() => {
    const stored = localStorage.getItem("verifscan-demo-reset");
    let resetAt: number;
    if (stored) {
      resetAt = parseInt(stored, 10);
      if (isNaN(resetAt) || resetAt < Date.now()) {
        resetAt = Date.now() + RESET_INTERVAL_MS;
        localStorage.setItem("verifscan-demo-reset", String(resetAt));
      }
    } else {
      resetAt = Date.now() + RESET_INTERVAL_MS;
      localStorage.setItem("verifscan-demo-reset", String(resetAt));
    }
    resetAtRef.current = resetAt;

    const tick = () => {
      const left = resetAtRef.current - Date.now();
      if (left <= 0) {
        // Reset
        setResetting(true);
        const newResetAt = Date.now() + RESET_INTERVAL_MS;
        localStorage.setItem("verifscan-demo-reset", String(newResetAt));
        resetAtRef.current = newResetAt;
        setProductIndex((i) => (i + 1) % DEMO_PRODUCTS.length);
        setRemaining(RESET_INTERVAL_MS);
        setTimeout(() => setResetting(false), 800);
      } else {
        setRemaining(left);
      }
    };

    // Defer the first tick so we don't call setState synchronously in the effect body
    const initialTimeout = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  const product = DEMO_PRODUCTS[productIndex];
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <section id="demo" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <SectionBadge bg="bg-[#DBEAFE]" color="text-[#2563EB]">
            Démo interactive
          </SectionBadge>
          <h2 className="mt-4 font-display text-[28px] font-semibold leading-tight text-[#111827] sm:text-[36px] lg:text-[40px]">
            Vivez l&apos;expérience VerifScan en direct
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-base text-[#6B7280]">
            Cette démo se réinitialise toutes les heures. Découvrez ce que vos clients voient quand ils scannent un produit VerifScan.
          </p>
        </AnimatedSection>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 items-center">
          {/* Left: Product card */}
          <AnimatedSection>
            <motion.div
              className="relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xl"
              animate={resetting ? { opacity: 0.3, scale: 0.98 } : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Banner */}
              <div className="flex items-center justify-between bg-gradient-to-r from-[#10B981] to-[#34D399] px-5 py-3 text-white">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="font-semibold">Produit authentique vérifié</span>
                </div>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">{product.score}/100</span>
              </div>

              {/* Product */}
              <div className="flex gap-5 p-6">
                <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-[#F3F4F6]">
                  <img src={product.image} alt={product.nom} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold text-[#111827]">{product.nom}</h3>
                  <p className="mt-1 font-mono text-sm text-[#2563EB]">{product.lot}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {product.certifications.map((c) => (
                      <span key={c} className="rounded-full bg-[#D1FAE5] px-2 py-0.5 text-xs font-medium text-[#065F46]">{c}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-[#6B7280]">
                    <Eye className="h-3.5 w-3.5" /> 2 345 scans · Vérifié le 26 juil. 2026
                  </div>
                </div>
              </div>

              {/* Footer with QR */}
              <div className="flex items-center justify-between border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
                <div>
                  <p className="text-xs font-medium text-[#9CA3AF]">Scannez ce QR code</p>
                  <p className="text-sm font-semibold text-[#111827]">pour voir le passeport complet</p>
                </div>
                <div className="rounded-lg border-2 border-[#2563EB]/20 bg-white p-2">
                  <QRCodeCanvas value={getScanUrl(`${product.id}-demo`)} size={64} level="M" marginSize={1} />
                </div>
              </div>
            </motion.div>
          </AnimatedSection>

          {/* Right: info + timer */}
          <AnimatedSection index={1}>
            <div className="space-y-6">
              {/* Timer */}
              <div className="rounded-2xl border border-[#E5E7EB] bg-gradient-to-br from-[#EFF6FF] to-[#F0FDF4] p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2563EB] text-white">
                    <RefreshCw className={`h-5 w-5 ${resetting ? "animate-spin" : ""}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#6B7280]">Réinitialisation de la démo dans</p>
                    <p className="font-display text-3xl font-bold tabular-nums text-[#111827]">{timeStr}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-[#9CA3AF]">
                  La démo tourne en boucle sur 4 produits. Revenez dans une heure pour un nouveau cycle.
                </p>
              </div>

              {/* What you see */}
              <div className="space-y-3">
                <h3 className="font-display text-lg font-semibold text-[#111827]">
                  Ce que vos clients voient
                </h3>
                {[
                  { icon: ShieldCheck, color: "#10B981", title: "Authenticité prouvée", desc: "Bannière verte instantanée qui rassure le client" },
                  { icon: QrCode, color: "#2563EB", title: "Passeport numérique", desc: "Toutes les infos produit accessibles en 1 scan" },
                  { icon: Eye, color: "#F59E0B", title: "Transparence totale", desc: "Score de transparence, certifications, lot, dates" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#111827]">{item.title}</p>
                      <p className="text-sm text-[#6B7280]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => setProductIndex((i) => (i + 1) % DEMO_PRODUCTS.length)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#2563EB] bg-white px-5 py-3 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-[#EFF6FF]"
              >
                <Eye className="h-4 w-4" />
                Voir un autre produit
              </button>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
