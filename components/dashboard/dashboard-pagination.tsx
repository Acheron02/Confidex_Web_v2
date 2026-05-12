"use client";

import { Button } from "@/components/ui/button";

type Props = {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function DashboardPagination({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: Props) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <Button
        onClick={onPrev}
        disabled={currentPage === 1}
        className="min-w-[88px] hover:cursor-pointer"
      >
        Prev
      </Button>
      <Button
        onClick={onNext}
        disabled={currentPage === totalPages}
        className="min-w-[88px] hover:cursor-pointer"
      >
        Next
      </Button>
    </div>
  );
}
