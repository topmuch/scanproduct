import { Skeleton } from "@/components/ui/skeleton";

/**
 * LoadingSkeleton — grid of 6 skeleton product cards shown while the catalog
 * page's data is loading (suspense fallback).
 */
export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Results count skeleton */}
      <Skeleton className="h-5 w-48 rounded-full" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            {/* Image area */}
            <Skeleton className="h-48 w-full rounded-none" />
            {/* Body */}
            <div className="flex flex-col gap-3 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
                <Skeleton className="h-7 w-28 rounded-md" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="mt-1 h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
