import { apiRequest } from "../api-client";
import type {
  ExpectedRentResponse,
  MarketListingResponse,
  MarketListingWithPreferenceResponse,
} from "./types";

export const marketListingsApi = {
  // Get all market listings
  getAll: async (): Promise<MarketListingResponse[]> => {
    return apiRequest<MarketListingResponse[]>("/api/market-listings", {
      method: "GET",
    });
  },

  // Get market listing by ID
  getById: async (id: string): Promise<MarketListingResponse> => {
    return apiRequest<MarketListingResponse>(`/api/market-listings/${id}`, {
      method: "GET",
    });
  },

  // Get listings by status
  getByStatus: async (status: string): Promise<MarketListingResponse[]> => {
    return apiRequest<MarketListingResponse[]>(
      `/api/market-listings/status/${encodeURIComponent(status)}`,
      {
        method: "GET",
      }
    );
  },

  // Get listings by source
  getBySource: async (source: string): Promise<MarketListingResponse[]> => {
    return apiRequest<MarketListingResponse[]>(
      `/api/market-listings/source/${encodeURIComponent(source)}`,
      {
        method: "GET",
      }
    );
  },

  // Get listings by property type
  getByPropertyType: async (
    propertyType: string
  ): Promise<MarketListingResponse[]> => {
    return apiRequest<MarketListingResponse[]>(
      `/api/market-listings/property-type/${encodeURIComponent(propertyType)}`,
      {
        method: "GET",
      }
    );
  },

  // Get listings by price range
  getByPriceRange: async (
    minPrice: number,
    maxPrice: number
  ): Promise<MarketListingResponse[]> => {
    return apiRequest<MarketListingResponse[]>(
      `/api/market-listings/price-range?minPrice=${minPrice}&maxPrice=${maxPrice}`,
      {
        method: "GET",
      }
    );
  },

  // Get listings by location
  getByLocation: async (
    city: string,
    state: string
  ): Promise<MarketListingResponse[]> => {
    return apiRequest<MarketListingResponse[]>(
      `/api/market-listings/location?city=${encodeURIComponent(
        city
      )}&state=${encodeURIComponent(state)}`,
      {
        method: "GET",
      }
    );
  },

  // Get listings by bedrooms and bathrooms
  getByBedsAndBaths: async (
    minBedrooms: number,
    minBathrooms: number
  ): Promise<MarketListingResponse[]> => {
    return apiRequest<MarketListingResponse[]>(
      `/api/market-listings/beds-baths?minBedrooms=${minBedrooms}&minBathrooms=${minBathrooms}`,
      {
        method: "GET",
      }
    );
  },

  // Get all interested listings
  getInterested: async (): Promise<MarketListingWithPreferenceResponse[]> => {
    return apiRequest<MarketListingWithPreferenceResponse[]>(
      "/api/market-listings/interested",
      {
        method: "GET",
      }
    );
  },

  // Toggle interested status
  toggleInterested: async (
    id: string
  ): Promise<MarketListingWithPreferenceResponse> => {
    return apiRequest<MarketListingWithPreferenceResponse>(
      `/api/market-listings/${id}/interested/toggle`,
      {
        method: "POST",
      }
    );
  },

  // Set interested status
  setInterested: async (
    id: string,
    isInterested: boolean
  ): Promise<MarketListingWithPreferenceResponse> => {
    return apiRequest<MarketListingWithPreferenceResponse>(
      `/api/market-listings/${id}/interested?isInterested=${isInterested}`,
      {
        method: "PUT",
      }
    );
  },

  // Get expected rent by ZIP code
  getExpectedRent: async (
    zipCode: string
  ): Promise<ExpectedRentResponse[] | null> => {
    try {
      return apiRequest<ExpectedRentResponse[]>(
        `/api/expected-rent/zip/${encodeURIComponent(zipCode)}`,
        {
          method: "GET",
        }
      );
    } catch (error) {
      // Return null if no expected rent data is available
      console.warn(`No expected rent data for ${zipCode}`);
      return null;
    }
  },
};
