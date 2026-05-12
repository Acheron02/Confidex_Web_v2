import { Skeleton } from "@/components/common/skeleton";

export default function Loading() {
  return (
    <section className="bg-background">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 md:px-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.4fr_0.9fr]">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="space-y-3">
                <Skeleton className="h-8 w-52" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-xl sm:w-40" />
                <Skeleton className="mx-auto h-4 w-48" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3 md:p-4">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-4 w-20" />
            </div>

            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>

            <div className="mt-4 flex justify-center gap-2">
              <Skeleton className="h-10 w-24 rounded-xl" />
              <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
