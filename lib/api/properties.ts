import { api } from "../api-client";
import type {
  PropertyResponse,
  CreatePropertyRequest,
  UpdatePropertyRequest,
} from "@/lib/api/types";

export const propertiesApi = {
  getAll: (activeOnly = false) =>
    api.get<PropertyResponse[]>(
      `/api/properties${activeOnly ? "?activeOnly=true" : ""}`
    ),

  getById: (id: number) => api.get<PropertyResponse>(`/api/properties/${id}`),

  create: (data: CreatePropertyRequest) =>
    api.post<PropertyResponse>("/api/properties", data),

  update: (id: number, data: UpdatePropertyRequest) =>
    api.put<PropertyResponse>(`/api/properties/${id}`, data),

  archive: (id: number) => api.delete<void>(`/api/properties/${id}`),

  deletePermanent: (id: number) =>
    api.delete<void>(`/api/properties/${id}/permanent`),
};
