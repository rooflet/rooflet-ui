import { api } from "../api-client";
import type {
  TenantResponse,
  CreateTenantRequest,
  UpdateTenantRequest,
} from "@/lib/api/types";

export const tenantsApi = {
  getAll: (params?: {
    propertyId?: number;
    activeOnly?: boolean;
    unassignedOnly?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.propertyId)
      searchParams.set("propertyId", params.propertyId.toString());
    if (params?.activeOnly) searchParams.set("activeOnly", "true");
    if (params?.unassignedOnly) searchParams.set("unassignedOnly", "true");

    const query = searchParams.toString();
    return api.get<TenantResponse[]>(`/api/tenants${query ? `?${query}` : ""}`);
  },

  getById: (id: number) => api.get<TenantResponse>(`/api/tenants/${id}`),

  create: (data: CreateTenantRequest) =>
    api.post<TenantResponse>("/api/tenants", data),

  update: (id: number, data: UpdateTenantRequest) =>
    api.put<TenantResponse>(`/api/tenants/${id}`, data),

  archive: (id: number) => api.delete<void>(`/api/tenants/${id}`),

  unassign: (id: number) =>
    api.put<TenantResponse>(`/api/tenants/${id}/unassign`),

  deletePermanent: (id: number) =>
    api.delete<void>(`/api/tenants/${id}/permanent`),
};
