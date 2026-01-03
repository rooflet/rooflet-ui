import { getApiUrl } from "./api-config";

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: any) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(endpoint);

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    ...options,
    credentials: "include", // Include cookies (Spring Session) in all requests
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Dispatch custom event for auth-wrapper to handle
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("api-auth-error", {
              detail: { status: response.status },
            })
          );
        }
        throw new ApiError("Unauthorized", response.status);
      }

      const errorData = await response.json().catch(() => null);

      console.error("API Error Response:", {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        errorData,
      });

      throw new ApiError(
        errorData?.message || errorData?.error || response.statusText,
        response.status,
        errorData
      );
    }

    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return null as T;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    // If no JSON content, return null
    return null as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error",
      0
    );
  }
}

async function apiGet<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: "GET" });
}

async function apiPost<T>(
  endpoint: string,
  data?: any,
  options?: RequestInit
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

async function apiPut<T>(
  endpoint: string,
  data?: any,
  options?: RequestInit
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

async function apiDelete<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: "DELETE" });
}

export const api = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
};
