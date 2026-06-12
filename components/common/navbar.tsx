import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

import NavbarClientActions from "@/components/common/navbar-client-actions";
import NavbarLinks from "@/components/common/navbar-links";

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b-2 border-border bg-black text-white">
      <div className="confidex-container flex h-20 items-center justify-between gap-3 md:h-24 md:gap-4">
        <Link
          href="/"
          prefetch={false}
          className="flex shrink-0 cursor-pointer items-center"
        >
          <Image
            src="/confidex_logo_v2.svg"
            alt="Confidex Logo"
            width={220}
            height={44}
            sizes="(max-width: 640px) 140px, (max-width: 768px) 170px, 220px"
            className="h-auto w-[140px] text-white sm:w-[170px] md:w-[220px]"
            priority
          />
        </Link>

        <NavbarLinks variant="desktop" />

        <div className="flex items-center gap-2 md:gap-3">
          <NavbarClientActions />

          <details className="group relative md:hidden">
            <summary className="list-none">
              <span className="inline-flex cursor-pointer items-center justify-center rounded-full border-2 border-white/25 p-2 text-white transition hover:border-primary hover:text-primary">
                <Menu className="size-5 group-open:hidden" />
                <X className="hidden size-5 group-open:block" />
              </span>
            </summary>

            <div className="fixed inset-x-0 top-20 z-40 border-t-2 border-border bg-black md:hidden">
              <div className="confidex-container flex flex-col gap-4 py-4">
                <NavbarLinks variant="mobile" />
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
