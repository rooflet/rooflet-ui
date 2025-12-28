import type {
  AddPortfolioMemberRequest,
  CreatePortfolioRequest,
  MessageResponse,
  PortfolioMemberResponse,
  PortfolioResponse,
  UpdatePortfolioMemberRoleRequest,
  UpdatePortfolioRequest,
} from "@/lib/api/types";
import { api } from "../api-client";

export const portfoliosApi = {
  getAll: (activeOnly = false) =>
    api.get<PortfolioResponse[]>(
      `/api/portfolios${activeOnly ? "?activeOnly=true" : ""}`
    ),

  getById: (id: number) => api.get<PortfolioResponse>(`/api/portfolios/${id}`),

  create: (data: CreatePortfolioRequest) =>
    api.post<PortfolioResponse>("/api/portfolios", data),

  update: (id: number, data: UpdatePortfolioRequest) =>
    api.put<PortfolioResponse>(`/api/portfolios/${id}`, data),

  archive: (id: number) =>
    api.put<PortfolioResponse>(`/api/portfolios/${id}/archive`),

  unarchive: (id: number) =>
    api.put<PortfolioResponse>(`/api/portfolios/${id}/unarchive`),

  switchPortfolio: (id: number) =>
    api.post<MessageResponse>(`/api/portfolios/${id}/switch`),

  getMembers: (id: number) =>
    api.get<PortfolioMemberResponse[]>(`/api/portfolios/${id}/members`),

  addMember: (id: number, data: AddPortfolioMemberRequest) =>
    api.post<PortfolioMemberResponse>(`/api/portfolios/${id}/members`, data),

  updateMemberRole: (
    portfolioId: number,
    userId: number,
    data: UpdatePortfolioMemberRoleRequest
  ) =>
    api.put<PortfolioMemberResponse>(
      `/api/portfolios/${portfolioId}/members/${userId}`,
      data
    ),

  removeMember: (portfolioId: number, userId: number) =>
    api.delete<MessageResponse>(
      `/api/portfolios/${portfolioId}/members/${userId}`
    ),
};
