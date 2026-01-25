import type {
  CreateExpenseRequest,
  ExpenseResponse,
  UpdateExpenseRequest,
} from "@/lib/api/types";
import { api } from "../api-client";

export const expensesApi = {
  getAll: (params?: {
    propertyId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.propertyId) searchParams.set("propertyId", params.propertyId);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);

    const query = searchParams.toString();
    return api.get<ExpenseResponse[]>(
      `/api/expenses${query ? `?${query}` : ""}`,
    );
  },

  getById: (id: string) => api.get<ExpenseResponse>(`/api/expenses/${id}`),

  create: (data: CreateExpenseRequest) =>
    api.post<ExpenseResponse>("/api/expenses", data),

  update: (id: string, data: UpdateExpenseRequest) =>
    api.put<ExpenseResponse>(`/api/expenses/${id}`, data),

  delete: (id: string) => api.delete<void>(`/api/expenses/${id}`),

  unassign: (id: string) =>
    api.put<ExpenseResponse>(`/api/expenses/${id}/unassign`),

  getTotal: (propertyId: string, startDate: string, endDate: string) => {
    const searchParams = new URLSearchParams({
      propertyId: propertyId,
      startDate,
      endDate,
    });
    return api.get<number>(`/api/expenses/total?${searchParams}`);
  },
};
