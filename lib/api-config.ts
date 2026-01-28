const API_BASE_URL = process.env.NEXT_PUBLIC_ROOFLET_BACKEND_URL;

export const apiConfig = {
  baseUrl: API_BASE_URL,
  endpoints: {
    properties: "/api/properties",
    tenants: "/api/tenants",
    rentCollections: "/api/rent-collections",
    expenses: "/api/expenses",
    users: "/api/users",
  },
};

export function getApiUrl(endpoint: string): string {
  return `${apiConfig.baseUrl}${endpoint}`;
}
