import { api } from "../api-client";
import type {
  TenantResponse,
  CreateTenantRequest,
  UpdateTenantRequest,
} from "@/lib/api/types";

export const tenantsApi = {
  getAll: (params?: {
    propertyId?: string;
    activeOnly?: boolean;
    unassignedOnly?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.propertyId) searchParams.set("propertyId", params.propertyId);
    if (params?.activeOnly) searchParams.set("activeOnly", "true");
    if (params?.unassignedOnly) searchParams.set("unassignedOnly", "true");

    const query = searchParams.toString();
    return api.get<TenantResponse[]>(`/api/tenants${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => api.get<TenantResponse>(`/api/tenants/${id}`),

  create: (data: CreateTenantRequest) =>
    api.post<TenantResponse>("/api/tenants", data),

  update: (id: string, data: UpdateTenantRequest) =>
    api.put<TenantResponse>(`/api/tenants/${id}`, data),

  archive: (id: string) => api.delete<void>(`/api/tenants/${id}`),

  unassign: (id: string) =>
    api.put<TenantResponse>(`/api/tenants/${id}/unassign`),

  deletePermanent: (id: string) =>
    api.delete<void>(`/api/tenants/${id}/permanent`),
};
