import { Skeleton } from "@/components/common/skeleton";

export default function Loading() {
  return (
    <section className="bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-4 w-full max-w-3xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-[260px] w-full rounded-2xl" />
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[85%]" />
              <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
