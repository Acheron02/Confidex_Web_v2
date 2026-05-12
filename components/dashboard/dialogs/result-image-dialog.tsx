"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ResultImageDialogProps = {
  open: boolean;

  /**
   * The displayed image.
   * Usually this is annotated.png/result_image.
   */
  selectedImageUrl: string | null;

  /**
   * The original captured photo.
   * Usually this is original.png/raw.png.
   */
  selectedOriginalImageUrl?: string | null;

  selectedImageResult?: string | null;
  onClose: () => void;
};

export default function ResultImageDialog({
  open,
  selectedImageUrl,
  selectedOriginalImageUrl,
  selectedImageResult,
  onClose,
}: ResultImageDialogProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const originalUrl = useMemo(() => {
    return selectedOriginalImageUrl || selectedImageUrl || "";
  }, [selectedOriginalImageUrl, selectedImageUrl]);

  useEffect(() => {
    setIsLoaded(false);
  }, [selectedImageUrl]);

  if (!open || !selectedImageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[92dvh] w-full max-w-[96vw] flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border bg-muted/35 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
              Result Image
            </p>

            <h2 className="mt-0.5 truncate text-base font-black text-foreground sm:text-lg">
              {selectedImageResult || "Captured test result"}
            </h2>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 rounded-full hover:cursor-pointer"
            aria-label="Close result image"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 bg-black">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            {!isLoaded ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white">
                  Loading image...
                </div>
              </div>
            ) : null}

            <img
              src={selectedImageUrl}
              alt={selectedImageResult || "Captured result image"}
              onLoad={() => setIsLoaded(true)}
              onError={() => setIsLoaded(true)}
              className={[
                "h-full w-full object-contain transition duration-200",
                isLoaded ? "opacity-100" : "opacity-0",
              ].join(" ")}
              draggable={false}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border bg-muted/35 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            <Maximize2 className="size-4 shrink-0" />
            <span>Image automatically fits the available screen space.</span>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
            <a
              href={selectedImageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-primary underline-offset-4 hover:underline"
            >
              Open result image
              <ExternalLink className="size-3.5" />
            </a>

            <a
              href={originalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-primary underline-offset-4 hover:underline"
            >
              Open original
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
