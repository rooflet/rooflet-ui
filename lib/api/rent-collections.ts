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
    propertyId?: number;
    tenantId?: number;
    startPeriod?: string;
    endPeriod?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.propertyId)
      searchParams.set("propertyId", params.propertyId.toString());
    if (params?.tenantId)
      searchParams.set("tenantId", params.tenantId.toString());
    if (params?.startPeriod)
      searchParams.set("startPeriod", params.startPeriod);
    if (params?.endPeriod) searchParams.set("endPeriod", params.endPeriod);

    const query = searchParams.toString();
    return api.get<RentCollectionResponse[]>(
      `/api/rent-collections${query ? `?${query}` : ""}`
    );
  },

  create: (data: CreateRentCollectionRequest) =>
    api.post<RentCollectionResponse>("/api/rent-collections", data),

  bulkCreate: (data: BulkCreateRentCollectionsRequest) =>
    api.post<RentCollectionResponse[]>("/api/rent-collections/bulk", data),

  update: (id: number, data: UpdateRentCollectionRequest) =>
    api.put<RentCollectionResponse>(`/api/rent-collections/${id}`, data),

  addPayment: (id: number, data: AddPaymentRequest) =>
    api.post<RentCollectionResponse>(
      `/api/rent-collections/${id}/payments`,
      data
    ),

  delete: (id: number) => api.delete<void>(`/api/rent-collections/${id}`),
};
