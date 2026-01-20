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

  getById: (id: string) => api.get<PortfolioResponse>(`/api/portfolios/${id}`),

  create: (data: CreatePortfolioRequest) =>
    api.post<PortfolioResponse>("/api/portfolios", data),

  update: (id: string, data: UpdatePortfolioRequest) =>
    api.put<PortfolioResponse>(`/api/portfolios/${id}`, data),

  archive: (id: string) =>
    api.put<PortfolioResponse>(`/api/portfolios/${id}/archive`),

  unarchive: (id: string) =>
    api.put<PortfolioResponse>(`/api/portfolios/${id}/unarchive`),

  switchPortfolio: (id: string) =>
    api.post<MessageResponse>(`/api/portfolios/${id}/switch`),

  getMembers: (id: string) =>
    api.get<PortfolioMemberResponse[]>(`/api/portfolios/${id}/members`),

  addMember: (id: string, data: AddPortfolioMemberRequest) =>
    api.post<PortfolioMemberResponse>(`/api/portfolios/${id}/members`, data),

  updateMemberRole: (
    portfolioId: string,
    userId: string,
    data: UpdatePortfolioMemberRoleRequest
  ) =>
    api.put<PortfolioMemberResponse>(
      `/api/portfolios/${portfolioId}/members/${userId}`,
      data
    ),

  removeMember: (portfolioId: string, userId: string) =>
    api.delete<MessageResponse>(
      `/api/portfolios/${portfolioId}/members/${userId}`
    ),
};
