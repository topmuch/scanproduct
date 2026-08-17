"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * InstallPrompt — bannière d'installation de la PWA VerifScan.
 *
 * Comportement :
 *   - Chrome / Edge / Android : l'événement `beforeinstallprompt` se déclenche ;
 *     on affiche une bannière avec un bouton « Installer » qui appelle prompt().
 *   - iOS Safari : pas d'API d'installation. On détecte iOS + navigateur
 *     Safari (non standalone) et on affiche des instructions (« Partager →
 *     Sur l'écran d'accueil »).
 *   - Déjà installé (display-mode: standalone) : on n'affiche rien.
 *
 * La bannière peut être dismissée ; on garde le refus en localStorage pendant
 * 7 jours pour ne pas harceler l'utilisateur.
 */

const DISMISS_KEY = "verifscan_pwa_dismissed";
const DISMISS_DAYS = 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari ajoute navigator.standalone quand lancé depuis l'écran d'accueil.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOSSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  // Détecte Safari (pas Chrome sur iOS, qui ne supporte pas l'installation).
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
  return isIOS && isSafari;
}

function isDismissed() {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const days = (Date.now() - parseInt(ts, 10)) / (1000 * 60 * 60 * 24);
    return days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosInstructions, setIosInstructions] = useState(false);

  useEffect(() => {
    // Déjà installé → on n'affiche jamais.
    if (isStandalone()) return;
    // Déjà refusé récemment → on n'affiche pas.
    if (isDismissed()) return;

    // Chrome / Edge / Android : capte l'événement d'installation.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      // Petit délai pour ne pas être trop intrusif au chargement.
      setTimeout(() => setShow(true), 4000);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari : pas d'événement, on affiche des instructions après délai.
    if (isIOSSafari()) {
      const t = setTimeout(() => {
        setIosInstructions(true);
        setShow(true);
      }, 6000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      /* ignore */
    }
  };

  const onInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setShow(false);
    }
    setDeferred(null);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-md sm:inset-x-auto sm:right-4 sm:bottom-4"
          role="dialog"
          aria-labelledby="pwa-install-title"
        >
          <div className="relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-2xl ring-1 ring-black/5">
            {/* Accent gradient en haut */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2563EB] to-[#10B981]" />

            <button
              type="button"
              onClick={dismiss}
              aria-label="Fermer"
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F3F4F6]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3 pr-8">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#10B981] text-white shadow-md">
                {iosInstructions ? (
                  <Smartphone className="h-6 w-6" />
                ) : (
                  <Download className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1">
                <h3
                  id="pwa-install-title"
                  className="text-[15px] font-bold text-[#111827]"
                >
                  Installer VerifScan
                </h3>
                <p className="mt-0.5 text-[13px] text-[#4B5563]">
                  {iosInstructions
                    ? "Ajoutez VerifScan à votre écran d'accueil pour un accès rapide et le mode hors ligne."
                    : "Accédez à VerifScan en un tap, même hors ligne, directement depuis votre écran d'accueil."}
                </p>
              </div>
            </div>

            {iosInstructions ? (
              <div className="mt-3 space-y-2 rounded-xl bg-[#F9FAFB] p-3 text-[13px] text-[#374151]">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm">
                    <Share className="h-3.5 w-3.5 text-[#2563EB]" />
                  </span>
                  <span>
                    Touchez l&apos;icône <strong>Partager</strong> en bas de Safari.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm">
                    <PlusSquare className="h-3.5 w-3.5 text-[#10B981]" />
                  </span>
                  <span>
                    Puis <strong>« Sur l&apos;écran d&apos;accueil »</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-1 w-full rounded-lg border border-[#2563EB] bg-white px-4 py-2 text-[13px] font-semibold text-[#2563EB] transition-colors hover:bg-[#EFF6FF]"
                >
                  J&apos;ai compris
                </button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onInstall}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2.5 text-[13px] font-bold text-white shadow-md transition-all hover:bg-[#1D4ED8] active:scale-[0.98]"
                >
                  <Download className="h-4 w-4" />
                  Installer
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-lg px-4 py-2.5 text-[13px] font-medium text-[#6B7280] transition-colors hover:bg-[#F3F4F6]"
                >
                  Plus tard
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
