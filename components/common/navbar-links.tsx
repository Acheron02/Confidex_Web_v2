"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/pages/about", label: "About" },
  { href: "/pages/contact", label: "Contact" },
];

type NavbarLinksProps = {
  variant: "desktop" | "mobile";
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavbarLinks({ variant }: NavbarLinksProps) {
  const pathname = usePathname() || "/";
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const activeHref = useMemo(() => {
    return LINKS.find((link) => isActivePath(pathname, link.href))?.href ?? "/";
  }, [pathname]);

  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const updateIndicator = () => {
    const nav = navRef.current;
    const activeLink = linkRefs.current[activeHref];

    if (!nav || !activeLink) return;

    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();

    setIndicatorStyle({
      left: linkRect.left - navRect.left,
      width: linkRect.width,
      opacity: 1,
    });
  };

  useLayoutEffect(() => {
    updateIndicator();
  }, [activeHref]);

  useEffect(() => {
    updateIndicator();

    window.addEventListener("resize", updateIndicator);

    return () => {
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeHref]);

  if (variant === "mobile") {
    return (
      <nav className="flex flex-col gap-2">
        {LINKS.map((link) => {
          const isActive = isActivePath(pathname, link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
              className={[
                "relative cursor-pointer overflow-hidden rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
                isActive
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-white/15 bg-white/5 text-white hover:border-primary hover:text-primary",
              ].join(" ")}
            >
              {isActive ? (
                <span className="absolute inset-y-2 left-2 w-1 rounded-full bg-white" />
              ) : null}

              <span className="relative z-10 pl-2">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav ref={navRef} className="relative hidden items-center gap-6 md:flex">
      {LINKS.map((link) => {
        const isActive = isActivePath(pathname, link.href);

        return (
          <Link
            key={link.href}
            ref={(node) => {
              linkRefs.current[link.href] = node;
            }}
            href={link.href}
            prefetch={false}
            aria-current={isActive ? "page" : undefined}
            className={[
              "relative cursor-pointer px-1 py-1 text-sm font-semibold transition hover:text-primary",
              isActive ? "text-white" : "text-white/80",
            ].join(" ")}
          >
            {link.label}
          </Link>
        );
      })}

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-2 h-1 rounded-full bg-primary transition-all duration-300 ease-out"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          opacity: indicatorStyle.opacity,
        }}
      />
    </nav>
  );
}
