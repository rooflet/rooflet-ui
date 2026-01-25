import { api } from "../api-client";
import type {
  PropertyResponse,
  CreatePropertyRequest,
  UpdatePropertyRequest,
} from "@/lib/api/types";

export const propertiesApi = {
  getAll: (activeOnly = false) =>
    api.get<PropertyResponse[]>(
      `/api/properties${activeOnly ? "?activeOnly=true" : ""}`,
    ),

  getById: (id: string) => api.get<PropertyResponse>(`/api/properties/${id}`),

  create: (data: CreatePropertyRequest) =>
    api.post<PropertyResponse>("/api/properties", data),

  update: (id: string, data: UpdatePropertyRequest) =>
    api.put<PropertyResponse>(`/api/properties/${id}`, data),

  archive: (id: string) => api.delete<void>(`/api/properties/${id}`),

  deletePermanent: (id: string) =>
    api.delete<void>(`/api/properties/${id}/permanent`),
};
