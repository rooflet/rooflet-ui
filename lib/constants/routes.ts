/**
 * Centralized route constants for the application
 * Use these constants instead of hardcoded strings in router.push() calls
 */
export const ROUTES = {
  // Public routes
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  ONBOARDING: "/onboarding",

  // Operations routes
  OPERATIONS: {
    PROPERTIES: "/operations/properties",
    TENANTS: "/operations/tenants",
    RENT_COLLECTION: "/operations/rent-collection",
    EXPENSES: "/operations/expenses",
  },

  // Portfolio routes
  PORTFOLIOS: {
    LIST: "/portfolios",
    NEW: "/portfolios/new",
    DETAIL: (id: string | number) => `/portfolios/${id}`,
  },

  // Business Development routes
  BUSINESS_DEVELOPMENT: {
    PORTFOLIO: "/business-development/portfolio",
  },

  // Reports routes
  REPORTS: {
    PROPERTY: "/reports/property",
    TENANT: "/reports/tenant",
    EXPENSES: "/reports/expenses",
  },

  // Settings
  SETTINGS: "/settings",
} as const;

/**
 * Helper function to build a route with query parameters
 * @param route - The base route path
 * @param params - Query parameters as key-value pairs
 * @returns The route with query string appended
 *
 * @example
 * buildRoute(ROUTES.OPERATIONS.RENT_COLLECTION, { year: 2024, month: 1 })
 * // Returns: "/operations/rent-collection?year=2024&month=1"
 */
export function buildRoute(
  route: string,
  params?: Record<string, string | number | boolean>
): string {
  if (!params || Object.keys(params).length === 0) {
    return route;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });

  return `${route}?${searchParams.toString()}`;
}
