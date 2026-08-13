"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Smartphone, QrCode, Star, MapPin } from "lucide-react";

/**
 * PhoneMockup — a CSS/JSX 3D-style smartphone showing a VerifScan product page.
 * Includes floating badges ("Sécurisé par blockchain", "Scanné en 0.3s").
 */
export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      {/* Decorative blurred circles */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[#2563EB]/10 blur-3xl animate-slow-spin" />
      <div className="pointer-events-none absolute -bottom-16 -right-12 h-64 w-64 rounded-full bg-[#10B981]/10 blur-3xl animate-slow-spin" style={{ animationDirection: "reverse" }} />
      <div className="pointer-events-none absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-[#F59E0B]/10 blur-3xl" />

      {/* Floating badge top-right */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="absolute -right-4 top-10 z-20 flex items-center gap-2 rounded-xl border border-[#BFDBFE] bg-white/95 px-3 py-2 shadow-lg backdrop-blur"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF]">
          <Lock className="h-4 w-4 text-[#2563EB]" />
        </span>
        <div className="leading-tight">
          <p className="text-[11px] font-semibold text-[#111827]">Sécurisé</p>
          <p className="text-[10px] text-[#6B7280]">par blockchain</p>
        </div>
      </motion.div>

      {/* Floating badge bottom-left */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        className="absolute -left-6 bottom-16 z-20 flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-white/95 px-3 py-2 shadow-lg backdrop-blur"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FDF4]">
          <Smartphone className="h-4 w-4 text-[#10B981]" />
        </span>
        <div className="leading-tight">
          <p className="text-[11px] font-semibold text-[#111827]">Scanné en</p>
          <p className="text-[10px] font-bold text-[#10B981]">0.3 seconde</p>
        </div>
      </motion.div>

      {/* Phone body */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
      >
        <div className="relative rounded-[2.6rem] border-[10px] border-[#111827] bg-[#111827] shadow-2xl">
          {/* notch */}
          <div className="absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-[#111827]" />
          {/* screen */}
          <div className="relative h-[560px] w-[300px] overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#EFF6FF] via-white to-white">
            {/* status bar */}
            <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-semibold text-[#111827]">
              <span>9:41</span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                VerifScan
              </span>
              <span>●●●●</span>
            </div>

            {/* Product hero image area */}
            <div className="mx-4 mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#DC2626] to-[#F59E0B] p-4 shadow-sm">
              <div className="flex items-center justify-center py-6">
                <span className="text-5xl">🌺</span>
              </div>
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-[10px] font-medium opacity-90">Jus naturel</p>
                  <p className="font-display text-lg font-bold leading-tight">Bissap Premium</p>
                </div>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-semibold backdrop-blur">
                  1 L
                </span>
              </div>
            </div>

            {/* Authentic badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-[#A7F3D0] bg-[#F0FDF4] px-3 py-2.5"
            >
              <ShieldCheck className="h-5 w-5 flex-shrink-0 text-[#10B981]" />
              <div className="leading-tight">
                <p className="text-[11px] font-bold text-[#065F46]">Produit authentique</p>
                <p className="text-[9px] text-[#047857]">Vérifié · Lot #VS-2026-04821</p>
              </div>
            </motion.div>

            {/* Info rows */}
            <div className="mx-4 mt-3 space-y-2">
              {[
                { label: "Origine", value: "Mbour, Sénégal 🇸🇳" },
                { label: "Fabrication", value: "12 fév. 2026" },
                { label: "À consommer avant", value: "12 août 2026" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg bg-[#F9FAFB] px-3 py-2"
                >
                  <span className="text-[10px] text-[#6B7280]">{row.label}</span>
                  <span className="text-[10px] font-semibold text-[#111827]">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Rating + location */}
            <div className="mx-4 mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-3 w-3 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
                <span className="ml-1 text-[10px] font-semibold text-[#6B7280]">4.9</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                <MapPin className="h-3 w-3" /> Dakar
              </span>
            </div>

            {/* QR code */}
            <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-[#F9FAFB]">
                <FakeQR />
              </div>
              <div className="leading-tight">
                <p className="flex items-center gap-1 text-[10px] font-bold text-[#2563EB]">
                  <QrCode className="h-3 w-3" /> QR Code unique
                </p>
                <p className="mt-0.5 text-[9px] text-[#6B7280]">
                  Infalsifiable · lié au fabricant
                </p>
                <p className="mt-1 inline-block rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[8px] font-semibold text-[#2563EB]">
                  Scanné 142×
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** A small faux-QR pattern drawn with divs for a realistic look. */
function FakeQR() {
  // deterministic 7x7 pattern
  const cells = [
    1, 1, 1, 0, 1, 0, 1,
    1, 0, 1, 1, 0, 1, 1,
    1, 1, 0, 1, 1, 1, 0,
    0, 1, 1, 0, 1, 0, 1,
    1, 0, 1, 1, 1, 1, 0,
    1, 1, 0, 0, 1, 1, 1,
    0, 1, 1, 1, 0, 1, 0,
  ];
  return (
    <div className="grid grid-cols-7 gap-[2px]">
      {cells.map((c, i) => (
        <span
          key={i}
          className={c ? "h-1.5 w-1.5 rounded-[1px] bg-[#111827]" : "h-1.5 w-1.5"}
        />
      ))}
    </div>
  );
}
