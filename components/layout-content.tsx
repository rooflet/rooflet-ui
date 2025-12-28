"use client";

import type React from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { FeedbackButton } from "@/components/feedback-button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAppSelector } from "@/store/hooks";
import { usePathname } from "next/navigation";

const publicRoutes = ["/login", "/signup", "/forgot-password"];

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Don't render sidebar/layout until authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 w-full">
        {children}
        <FeedbackButton />
      </main>
    </SidebarProvider>
  );
}
