import type {
  CreateExpenseRequest,
  ExpenseResponse,
  UpdateExpenseRequest,
} from "@/lib/api/types";
import { api } from "../api-client";

export const expensesApi = {
  getAll: (params?: {
    propertyId?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.propertyId)
      searchParams.set("propertyId", params.propertyId.toString());
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);

    const query = searchParams.toString();
    return api.get<ExpenseResponse[]>(
      `/api/expenses${query ? `?${query}` : ""}`
    );
  },

  getById: (id: number) => api.get<ExpenseResponse>(`/api/expenses/${id}`),

  create: (data: CreateExpenseRequest) =>
    api.post<ExpenseResponse>("/api/expenses", data),

  update: (id: number, data: UpdateExpenseRequest) =>
    api.put<ExpenseResponse>(`/api/expenses/${id}`, data),

  delete: (id: number) => api.delete<void>(`/api/expenses/${id}`),

  unassign: (id: number) =>
    api.put<ExpenseResponse>(`/api/expenses/${id}/unassign`),

  getTotal: (propertyId: number, startDate: string, endDate: string) => {
    const searchParams = new URLSearchParams({
      propertyId: propertyId.toString(),
      startDate,
      endDate,
    });
    return api.get<number>(`/api/expenses/total?${searchParams}`);
  },
};
