import type { Metadata } from "next";

import Navbar from "../components/common/navbar";
import { ThemeProvider } from "@/components/common/themes-provider";
import { Footer } from "@/components/common/footer";
import { AuthProvider } from "@/components/providers/auth-context";
import AppLiveProvider from "@/components/providers/app-live-providers";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "CONFIDEX",
  description: "Confidex health screening and kit management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-[100dvh] overflow-hidden bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppLiveProvider>
              <div className="grid h-[100dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
                <Navbar />

                <main className="overflow-y-auto overflow-x-hidden bg-background">
                  {children}
                </main>

                <Footer />
              </div>

              <Toaster richColors position="top-right" />
            </AppLiveProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
