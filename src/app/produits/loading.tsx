import { LoadingSkeleton } from "@/components/catalog/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header placeholder */}
      <div className="sticky top-0 z-50 h-16 border-b border-gray-100 bg-white/90" />

      {/* Hero placeholder */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-12 text-center sm:px-6 lg:px-8">
          <div className="mx-auto h-6 w-40 animate-pulse rounded-full bg-gray-100" />
          <div className="mx-auto mt-4 h-10 w-2/3 animate-pulse rounded-lg bg-gray-100" />
          <div className="mx-auto mt-4 h-5 w-1/2 animate-pulse rounded bg-gray-100" />
          <div className="mx-auto mt-8 h-12 w-full max-w-2xl animate-pulse rounded-full bg-gray-100" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <LoadingSkeleton />
      </main>

      {/* Footer placeholder */}
      <div className="mt-auto h-64 bg-[#0F172A]" />
    </div>
  );
}
