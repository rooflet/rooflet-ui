import type {
  AddPaymentRequest,
  BulkCreateRentCollectionsRequest,
  CreateRentCollectionRequest,
  RentCollectionResponse,
  UpdateRentCollectionRequest,
} from "@/lib/api/types";
import { api } from "../api-client";

export const rentCollectionsApi = {
  getAll: (params?: {
    propertyId?: string;
    tenantId?: string;
    startPeriod?: string;
    endPeriod?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.propertyId) searchParams.set("propertyId", params.propertyId);
    if (params?.tenantId) searchParams.set("tenantId", params.tenantId);
    if (params?.startPeriod)
      searchParams.set("startPeriod", params.startPeriod);
    if (params?.endPeriod) searchParams.set("endPeriod", params.endPeriod);

    const query = searchParams.toString();
    return api.get<RentCollectionResponse[]>(
      `/api/rent-collections${query ? `?${query}` : ""}`,
    );
  },

  create: (data: CreateRentCollectionRequest) =>
    api.post<RentCollectionResponse>("/api/rent-collections", data),

  bulkCreate: (data: BulkCreateRentCollectionsRequest) =>
    api.post<RentCollectionResponse[]>("/api/rent-collections/bulk", data),

  update: (id: string, data: UpdateRentCollectionRequest) =>
    api.put<RentCollectionResponse>(`/api/rent-collections/${id}`, data),

  addPayment: (id: string, data: AddPaymentRequest) =>
    api.post<RentCollectionResponse>(
      `/api/rent-collections/${id}/payments`,
      data,
    ),

  delete: (id: string) => api.delete<void>(`/api/rent-collections/${id}`),
};
