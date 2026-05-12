"use client";

import Link from "next/link";
import { AuthDialog } from "@/components/common/auth-dialog";
import { useState, useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-context";
import { Loader2, Menu, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { isAdminRole } from "@/lib/rbac";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMobileOpen(false);
    setNavigatingTo(null);
  }, [pathname, user]);

  if (!pathname) return null;

  if (pathname.startsWith("/pages/admin/dashboard")) {
    return null;
  }

  const links = [
    { href: "/", label: "Home" },
    { href: "/pages/about", label: "About" },
    { href: "/pages/contact", label: "Contact" },
  ];

  const handleNavClick = (href: string) => {
    if (href === pathname) return;

    setNavigatingTo(href);

    startTransition(() => {
      router.push(href);
    });
  };

  const renderAction = (mobile = false) => {
    const baseClass = mobile ? "w-full cursor-pointer" : "cursor-pointer";

    if (!user) {
      return (
        <Button onClick={() => setOpen(true)} className={baseClass}>
          Sign In
        </Button>
      );
    }

    if (isAdminRole(user.role)) {
      return pathname === "/pages/admin/dashboard" ? (
        <Button onClick={logout} variant="destructive" className={baseClass}>
          Logout
        </Button>
      ) : (
        <Button
          onClick={() => router.push("/pages/admin/dashboard")}
          className={baseClass}
        >
          Admin
        </Button>
      );
    }

    if (user._id) {
      return pathname === `/pages/users/${user._id}` ? (
        <Button onClick={logout} variant="destructive" className={baseClass}>
          Logout
        </Button>
      ) : (
        <Button asChild className={baseClass}>
          <Link
            href={`/pages/users/${user._id}`}
            prefetch={false}
            className="cursor-pointer"
          >
            Profile
          </Link>
        </Button>
      );
    }

    return (
      <span className="flex items-center gap-2 px-2 py-2 text-sm text-white/80">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </span>
    );
  };

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="fixed inset-x-0 top-0 z-50 border-b-2 border-border bg-black text-white"
      >
        <AnimatePresence>
          {(isPending || navigatingTo) && (
            <motion.div
              key="route-progress"
              className="absolute bottom-0 left-0 h-[2px] bg-primary"
              initial={{ width: "0%", opacity: 0.85 }}
              animate={{ width: "100%", opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        <div className="confidex-container flex h-20 items-center justify-between gap-4 md:h-24">
          <Link href="/" prefetch={false} className="flex cursor-pointer items-center">
            <Image
              src="/confidex_logo_v2.svg"
              alt="Confidex Logo"
              width={500}
              height={100}
              className="h-auto w-[150px] text-white sm:w-[180px] md:w-[220px]"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {links.map((link) => {
              const isActive = pathname === link.href;

              return (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => handleNavClick(link.href)}
                  className={`relative cursor-pointer px-1 py-1 text-sm font-semibold transition hover:text-primary ${
                    isActive ? "text-white" : "text-white/80"
                  }`}
                >
                  {link.label}

                  {isActive && (
                    <motion.span
                      layoutId="navbar-active-pill"
                      className="absolute -bottom-2 left-0 h-1 w-full rounded-full bg-primary"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 40,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {renderAction(false)}
          </div>

          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded-full border-2 border-white/25 p-2 text-white md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t-2 border-border bg-black md:hidden">
            <div className="confidex-container flex flex-col gap-4 py-4">
              <nav className="flex flex-col gap-2">
                {links.map((link) => {
                  const isActive = pathname === link.href;

                  return (
                    <button
                      key={link.href}
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        handleNavClick(link.href);
                      }}
                      className={`cursor-pointer rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        isActive
                          ? "border-primary bg-primary text-white"
                          : "border-white/15 bg-white/5 text-white"
                      }`}
                    >
                      {link.label}
                    </button>
                  );
                })}
              </nav>

              <div>{renderAction(true)}</div>
            </div>
          </div>
        )}
      </motion.header>

      <AuthDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
