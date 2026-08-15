import { Star, CheckCircle2 } from "lucide-react";
import type { LotWithDetails } from "@/lib/public-data";
import { formatDistanceToNow, formatDate } from "@/lib/utils";
import { ReviewForm } from "@/components/product/ReviewForm";

/**
 * CompactReviews — reviews content for the accordion (no outer card).
 *
 * Server component. Wraps the consumer-facing ReviewForm (client) at the
 * top, followed by the summary + reviews list.
 */

type Review = LotWithDetails["reviews"][number];

type Props = {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  lotId: string;
  productName: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= Math.round(rating)
              ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
              : "h-3.5 w-3.5 text-gray-200"
          }
        />
      ))}
    </div>
  );
}

export function CompactReviews({
  reviews,
  averageRating,
  totalReviews,
  lotId,
  productName,
}: Props) {
  const rating = averageRating ?? 0;
  const count = totalReviews ?? reviews?.length ?? 0;

  return (
    <div className="space-y-3">
      {/* Consumer review form (client component) */}
      <ReviewForm lotId={lotId} productName={productName} />

      {/* Summary */}
      <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 p-3 ring-1 ring-yellow-200">
        <div className="text-center">
          <p className="text-3xl font-extrabold leading-none text-gray-900">
            {rating.toFixed(1)}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
            sur 5
          </p>
        </div>
        <div className="h-10 w-px bg-yellow-200" aria-hidden />
        <div className="flex-1">
          <Stars rating={rating} />
          <p className="mt-1 text-xs text-gray-600">
            Basé sur {count} avis{count > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Reviews list */}
      {reviews && reviews.length > 0 ? (
        <div className="space-y-2">
          {reviews.map((r) => (
            <article
              key={r.id}
              className="rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {(r.authorName ?? "A").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-gray-900">
                        {r.authorName ?? "Avis anonyme"}
                      </p>
                      {r.isVerified && (
                        <CheckCircle2 className="h-2.5 w-2.5 text-green-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500">
                      {formatDistanceToNow(r.createdAt)}
                    </p>
                  </div>
                </div>
                <Stars rating={r.rating} />
              </div>
              {r.comment && (
                <p className="mt-1.5 text-xs leading-relaxed text-gray-700">
                  &ldquo;{r.comment}&rdquo;
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
          <span className="text-2xl" aria-hidden>
            💬
          </span>
          <p className="text-xs font-semibold text-gray-700">
            Aucun avis pour le moment
          </p>
          <p className="text-[10px] text-gray-500">
            Soyez le premier à partager votre expérience.
          </p>
        </div>
      )}
    </div>
  );
}
