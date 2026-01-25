import { AuthWrapper } from "@/components/auth-wrapper";
import { LayoutContent } from "@/components/layout-content";
import { LoadingScreen } from "@/components/loading-screen";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ReduxProvider } from "@/store/provider";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import Script from "next/script";
import type React from "react";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rooflet - Property Management Platform",
  description:
    "Manage your properties, tenants, and rent collection with precision and ease",
  generator: "v0.app",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // During build time for error pages, provide a simpler layout
  const isServerSide = typeof window === "undefined";

  return (
    <html lang="en" suppressHydrationWarning>
      {process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL &&
        process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID && (
          <Script
            defer
            src={process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL}
            data-website-id={process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID}
          />
        )}
      <body
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}
        suppressHydrationWarning
      >
        <ReduxProvider>
          <ThemeProvider defaultTheme="dark">
            <Suspense fallback={<LoadingScreen />}>
              <AuthWrapper>
                <LayoutContent>{children}</LayoutContent>
              </AuthWrapper>
            </Suspense>
            <Toaster />
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
