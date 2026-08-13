import { Star, CheckCircle2 } from "lucide-react";
import { formatDate, formatDistanceToNow } from "@/lib/utils";
import type { LotWithDetails } from "@/lib/public-data";

type Review = LotWithDetails["reviews"][number];

type Props = {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
};

function Stars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= Math.round(rating)
              ? `${size} fill-yellow-400 text-yellow-400`
              : `${size} text-gray-300`
          }
        />
      ))}
    </div>
  );
}

/**
 * ReviewsSection — card with rating summary + list of reviews.
 * Server component.
 */
export function ReviewsSection({ reviews, averageRating, totalReviews }: Props) {
  const rating = averageRating ?? 0;
  const count = totalReviews ?? reviews?.length ?? 0;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
        ⭐ Avis & notes
      </h2>

      {/* Summary */}
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 p-4 ring-1 ring-yellow-200">
        <div className="text-center">
          <p className="text-4xl font-extrabold leading-none text-gray-900">
            {rating.toFixed(1)}
          </p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            sur 5
          </p>
        </div>
        <div className="h-12 w-px bg-yellow-200" aria-hidden />
        <div className="flex-1">
          <Stars rating={rating} size="h-5 w-5" />
          <p className="mt-1.5 text-xs text-gray-600">
            Basé sur {count} avis{count > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="mt-4 space-y-3">
        {reviews && reviews.length > 0 ? (
          reviews.map((r) => (
            <article
              key={r.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {(r.authorName ?? "A").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {r.authorName ?? "Avis anonyme"}
                      </p>
                      {r.isVerified && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Vérifié
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {formatDistanceToNow(r.createdAt)} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                </div>
                <Stars rating={r.rating} />
              </div>
              {r.comment && (
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  &ldquo;{r.comment}&rdquo;
                </p>
              )}
            </article>
          ))
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <span className="text-3xl" aria-hidden>
              💬
            </span>
            <p className="text-sm font-semibold text-gray-700">
              Aucun avis pour le moment
            </p>
            <p className="text-xs text-gray-500">
              Soyez le premier à partager votre expérience avec ce produit.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
