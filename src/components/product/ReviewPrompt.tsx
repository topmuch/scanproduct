"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, MessageSquareHeart } from "lucide-react";

type ReviewPromptProps = {
  productName: string;
  /**
   * Anchor selector or id of the review section to scroll to when the user
   * clicks "Laisser un avis". The scan page's review accordion is the target.
   */
  reviewSectionId?: string;
};

/**
 * ReviewPrompt — a floating notification that appears after the consumer
 * has spent 10 seconds on the scan page, inviting them to leave a review.
 *
 * Behavior:
 *   - Waits 10 seconds after mount (only counts active tab time, pauses on
 *     visibilitychange to avoid pestering users who backgrounded the tab)
 *   - Shows a slide-in card from the bottom-right with a star icon + CTA
 *   - Two actions: "Laisser un avis" (scrolls to review section + expands it)
 *     or "Plus tard" (dismisses; remembered in sessionStorage so it doesn't
 *     reappear on the same lot during the same session)
 *   - Auto-dismisses after 20s if the user does nothing
 *   - Never shows if the user has already dismissed it for this lot
 *     (sessionStorage key: `review-prompt-dismissed:<key>`)
 *
 * Why a floating notification instead of a modal:
 *   - Less intrusive — the consumer can keep reading the product info
 *   - Still highly visible (animated entrance, bottom-right near thumb zone)
 *   - Standard UX pattern for review prompts on e-commerce pages
 */
export function ReviewPrompt({ productName, reviewSectionId }: ReviewPromptProps) {
  // Use the product name as a rough session key (the lotId isn't available
  // here without an extra prop — productName is unique enough for the
  // "don't pester me again this session" use case).
  const storageKey = `review-prompt-dismissed:${productName.slice(0, 40)}`;

  // Lazy-init the dismissed state from sessionStorage (avoids calling
  // setState inside useEffect, which would trigger a cascading render).
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Don't schedule the timer if already dismissed
    if (dismissed) return;

    // Wait 10 seconds before showing. We use a real timer (not just
    // visibility-based) because the consumer is likely actively reading.
    const startTimer = () => {
      timerRef.current = setTimeout(() => {
        setVisible(true);
        // Auto-hide after 20s if no interaction
        autoHideRef.current = setTimeout(() => {
          setVisible(false);
        }, 20000);
      }, 10000);
    };

    // Pause the timer when the tab is hidden (don't count background time)
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else if (!timerRef.current && !visible && !dismissed) {
        startTimer();
      }
    };

    startTimer();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (autoHideRef.current) clearTimeout(autoHideRef.current);
    };
  }, [storageKey, dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
  };

  const handleLeaveReview = () => {
    setVisible(false);
    // Scroll to the review section
    if (reviewSectionId) {
      const el = document.getElementById(reviewSectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Try to click the accordion header to expand it (WowAccordion
        // uses a <button> inside the header). We attempt a best-effort
        // click after the scroll animation completes.
        setTimeout(() => {
          const btn = el.querySelector("button");
          if (btn) btn.click();
        }, 600);
        return;
      }
    }
    // Fallback: scroll to the bottom of the page where reviews usually are
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] sm:max-w-sm"
          role="dialog"
          aria-label="Laisser un avis"
          aria-live="polite"
        >
          <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl shadow-amber-500/10">
            {/* Gradient accent strip */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />

            {/* Close button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-4 pr-10">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-md shadow-amber-500/30">
                  <MessageSquareHeart className="h-5 w-5 text-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-gray-900">
                    Votre avis nous intéresse !
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">
                    Vous avez scanné «&nbsp;{productName}&nbsp;». Partagez votre
                    expérience en 30 secondes.
                  </p>

                  {/* Stars preview */}
                  <div className="mt-2 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-amber-300 text-amber-300"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLeaveReview}
                  className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:from-amber-600 hover:to-yellow-600 hover:shadow-lg"
                >
                  ⭐ Laisser un avis
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
