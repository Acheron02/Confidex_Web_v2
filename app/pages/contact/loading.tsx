import { Skeleton } from "@/components/common/skeleton";

export default function Loading() {
  return (
    <section className="bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <div className="space-y-3 pt-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-11 w-32 rounded-xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
