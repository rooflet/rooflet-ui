"use client";

import type React from "react";

import { LoadingScreen } from "@/components/loading-screen";
import { ROUTES } from "@/lib/constants/routes";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { checkAuth, clearAuth } from "@/store/slices/authSlice";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const publicRoutes = ["/login", "/signup", "/forgot-password"];

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [isChecking, setIsChecking] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Listen for API authentication errors
  useEffect(() => {
    const handleAuthError = (event: Event) => {
      const customEvent = event as CustomEvent<{ status: number }>;
      if (
        customEvent.detail.status === 401 ||
        customEvent.detail.status === 403
      ) {
        // Clear auth state and redirect to login
        dispatch(clearAuth());
        router.push(ROUTES.LOGIN);
      }
    };

    window.addEventListener("api-auth-error", handleAuthError);
    return () => {
      window.removeEventListener("api-auth-error", handleAuthError);
    };
  }, [dispatch, router]);

  useEffect(() => {
    const checkAuthentication = async () => {
      const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
      );

      // Only check auth once on initial load if not already authenticated
      if (!hasCheckedAuth && !isAuthenticated && !isPublicRoute) {
        await dispatch(checkAuth());
        setHasCheckedAuth(true);
      }

      setIsChecking(false);
    };

    checkAuthentication();
  }, [pathname, isAuthenticated, dispatch, hasCheckedAuth]);

  useEffect(() => {
    // Only handle redirects after initial auth check is complete
    if (isChecking) return;

    const isPublicRoute = publicRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // Redirect to login if not authenticated and trying to access protected route
    if (!isPublicRoute && !isAuthenticated) {
      router.push(ROUTES.LOGIN);
      return;
    }

    // Redirect to home if authenticated and on login page
    if (isPublicRoute && isAuthenticated && pathname === "/login") {
      router.push(ROUTES.HOME);
    }
  }, [pathname, router, isAuthenticated, isChecking]);

  // Show loading screen while checking auth or during auth loading
  if (isChecking || isLoading) {
    return <LoadingScreen />;
  }

  // Check if current route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Show loading screen if not authenticated and not on public route (during redirect)
  if (!isAuthenticated && !isPublicRoute) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
