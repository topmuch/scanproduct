"use client";

import { useState } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ReviewFormProps = {
  lotId: string;
  productName: string;
};

/**
 * ReviewForm — client component embedded at the top of CompactReviews.
 *
 * Initially renders as a single CTA button ("⭐ Laisser un avis"). When
 * clicked, expands into a small form with:
 *   - 1..5 star rating (interactive, with hover preview)
 *   - optional author name (max 100 chars)
 *   - optional comment (max 1000 chars)
 *
 * On submit, POSTs to `/api/reviews` (public endpoint). The API auto-
 * approves the review, recomputes the product's averageRating/totalReviews,
 * and calls revalidatePath so the new review appears immediately. We then
 * reload the page after a short delay so the consumer sees their review
 * in the list.
 */
export function ReviewForm({ lotId, productName }: ReviewFormProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Veuillez sélectionner une note");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId,
          rating,
          comment: comment.trim() || undefined,
          authorName: authorName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Erreur");
      }
      toast.success("Merci ! Votre avis a été publié.");
      // Reset form
      setRating(0);
      setComment("");
      setAuthorName("");
      setOpen(false);
      // Recharger la page pour voir le nouvel avis (la page est
      // force-dynamic côté serveur + revalidatePath a déjà été appelé).
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-amber-600 hover:to-yellow-600"
      >
        ⭐ Laisser un avis
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-900">
          Votre avis sur « {productName} »
        </h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Annuler
        </button>
      </div>

      {/* Star rating */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Note <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(i)}
              className="rounded p-0.5"
              aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
            >
              <Star
                className={
                  i <= (hover || rating)
                    ? "h-7 w-7 fill-amber-400 text-amber-400"
                    : "h-7 w-7 text-gray-300 hover:text-amber-200"
                }
              />
            </button>
          ))}
        </div>
      </div>

      {/* Author name (optional) */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Votre nom <span className="text-gray-400">(optionnel)</span>
        </label>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Anonyme"
          maxLength={100}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      {/* Comment */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Commentaire <span className="text-gray-400">(optionnel)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Partagez votre expérience..."
          rows={3}
          maxLength={1000}
          className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {submitting ? "Publication..." : "Publier mon avis"}
      </button>
    </form>
  );
}
