"use client";

import { Button } from "@/components/ui/button";

type Props = {
  isQrLoading: boolean;
  onGenerateQr: () => void;
};

export default function DashboardQrCard({ isQrLoading, onGenerateQr }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex h-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:justify-center">
        <Button
          variant="outline"
          className="w-full whitespace-nowrap hover:cursor-pointer sm:w-auto lg:w-full xl:w-auto"
          onClick={onGenerateQr}
          disabled={isQrLoading}
        >
          {isQrLoading ? "Generating QR..." : "Show QR Code"}
        </Button>

        <p className="text-center text-sm text-muted-foreground sm:text-left lg:text-center">
          Generate a fresh QR code for logging in.
        </p>
      </div>
    </div>
  );
}
