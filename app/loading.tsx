import { Skeleton } from "@/components/common/skeleton";

const PAGE_HEIGHT =
  "min-h-[calc(100svh-var(--navbar-height,5rem)-var(--footer-height,0rem))]";

export default function Loading() {
  return (
    <section className={`${PAGE_HEIGHT} bg-background`}>
      <div
        className={`mx-auto flex ${PAGE_HEIGHT} w-full max-w-7xl items-center px-4 py-4 md:px-6`}
      >
        <div className="w-full space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary sm:text-sm">
              Loading Confidex
            </p>

            <h1 className="text-xl font-black leading-tight text-foreground sm:text-2xl md:text-3xl">
              Preparing the page.
            </h1>

            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Please wait while the layout and secure login interface are being
              prepared.
            </p>

            <p className="rounded-xl border border-border bg-background px-4 py-3 text-xs font-semibold leading-5 text-muted-foreground sm:hidden">
              On mobile, the login form may take a moment to appear.
            </p>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-full max-w-3xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
