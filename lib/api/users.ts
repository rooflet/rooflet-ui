import type {
  CreateUserRequest,
  LoginRequest,
  LoginResponse,
  UpdatePasswordRequest,
  UpdateUserRequest,
  User,
  UserResponse,
} from "@/lib/api/types";
import { api } from "../api-client";

export async function createUser(
  userData: CreateUserRequest
): Promise<UserResponse> {
  return api.post<UserResponse>("/api/users", userData);
}

export async function loginUser(
  credentials: LoginRequest
): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/users/login", credentials);
}

export async function logoutUser(): Promise<void> {
  try {
    await api.post<void>("/api/users/logout");
  } catch (error) {
    console.warn("Server logout failed:", error);
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem("isAuthenticated") === "true" &&
    !!localStorage.getItem("authToken")
  );
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;

  const userStr = localStorage.getItem("user");
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

export async function getCurrentUserFromApi(): Promise<UserResponse> {
  return api.get<UserResponse>("/api/users/me");
}

export async function updateCurrentUser(
  userData: UpdateUserRequest
): Promise<UserResponse> {
  return api.put<UserResponse>("/api/users/me", userData);
}

export async function updateCurrentUserPassword(
  passwordData: UpdatePasswordRequest
): Promise<UserResponse> {
  return api.put<UserResponse>("/api/users/me/password", passwordData);
}
