"use client";

import { useAuth } from "@/components/providers/auth-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function PaymentFailedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(5);

  const dashboardHref = useMemo(() => {
    if (!user?._id) return "/";
    return `/pages/users/${user._id}`;
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;

    const countdown = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          router.replace(dashboardHref);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [user?._id, router, dashboardHref]);

  const handleGoNow = () => {
    router.replace(dashboardHref);
  };

  if (!user?._id) {
    return (
      <section className="bg-background pt-20 md:pt-24">
        <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 md:px-6">
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Transaction Failed
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Returning to your dashboard...
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background pt-20 md:pt-24">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 md:px-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.5fr_0.85fr]">
          <div className="rounded-2xl border border-border bg-card p-4" />

          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-red-200 bg-red-50 text-4xl">
                !
              </div>

              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                Transaction Failed
              </h1>

              <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
                Your payment was not completed successfully. You will be
                redirected to your dashboard shortly, where you can try again.
              </p>

              <div className="mt-6 w-full max-w-md rounded-2xl border border-border bg-background p-4">
                <div className="text-sm text-muted-foreground">
                  Redirecting in
                </div>
                <div className="mt-1 text-3xl font-bold text-foreground">
                  {secondsLeft}s
                </div>
              </div>

              <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  onClick={handleGoNow}
                  variant="outline"
                  className="w-full hover:cursor-pointer sm:w-auto"
                >
                  Go to Dashboard Now
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4" />
        </div>
      </div>
    </section>
  );
}
