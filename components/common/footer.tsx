"use client"

import { usePathname } from "next/navigation"

export function Footer() {
  const pathname = usePathname()
  const year = new Date().getFullYear()

  if (pathname?.startsWith("/pages/admin")) {
    return null
  }

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-black text-white">
      <div className="confidex-container flex h-10 items-center justify-center text-center text-xs font-semibold sm:h-12 sm:text-sm">
        © {year} Confidex. All rights reserved.
      </div>
    </footer>
  )
}
