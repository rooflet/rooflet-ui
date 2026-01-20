/**
 * API client for user zip code preferences
 */

import { api } from "../api-client";
import type {
  ZipCodePreferenceResponse,
  AddZipCodePreferenceRequest,
  AvailableZipCodeResponse,
} from "./types";

export const MAX_ZIP_CODES = 10;

export const zipCodePreferencesApi = {
  /**
   * Get all zip code preferences for the current user
   */
  getAll: async (): Promise<ZipCodePreferenceResponse[]> => {
    return api.get<ZipCodePreferenceResponse[]>(
      "/api/user-preferences/zip-codes"
    );
  },

  /**
   * Add a new zip code preference for the current user
   */
  add: async (
    data: AddZipCodePreferenceRequest
  ): Promise<ZipCodePreferenceResponse> => {
    return api.post<ZipCodePreferenceResponse>(
      "/api/user-preferences/zip-codes",
      data
    );
  },

  /**
   * Delete a zip code preference for the current user
   */
  delete: async (zipCode: string): Promise<void> => {
    return api.delete<void>(`/api/user-preferences/zip-codes/${zipCode}`);
  },

  /**
   * Get all available zip codes with metadata
   */
  getAvailable: async (): Promise<AvailableZipCodeResponse[]> => {
    return api.get<AvailableZipCodeResponse[]>(
      "/api/user-preferences/zip-codes/available"
    );
  },
};
