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
  return (
    <html lang="en">
      <Script
        defer
        src="https://tracking.quincywebdev.com/script.js"
        data-website-id="c4d24cd2-ee6e-4f9f-84e6-83ca4a7d5bcc"
      />
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
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
