/**
 * US State validation and utilities
 */

export interface USState {
  code: string;
  name: string;
}

// Complete list of US states, territories, and DC
export const US_STATES: USState[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

// Valid state codes for validation (matches the backend pattern)
export const VALID_STATE_CODES = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
]);

/**
 * Validates if a state code is a valid US state abbreviation
 */
export function validateStateCode(stateCode: string): boolean {
  if (!stateCode || typeof stateCode !== "string") {
    return false;
  }

  return VALID_STATE_CODES.has(stateCode.toUpperCase());
}

/**
 * Gets the full state name from a state code
 */
export function getStateName(stateCode: string): string | null {
  if (!stateCode) return null;

  const state = US_STATES.find((s) => s.code === stateCode.toUpperCase());
  return state ? state.name : null;
}

/**
 * Normalizes state input to uppercase 2-letter code
 */
export function normalizeStateCode(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  const normalized = input.trim().toUpperCase();

  // If it's already a valid 2-letter code, return it
  if (validateStateCode(normalized)) {
    return normalized;
  }

  // Try to find by full state name
  const stateByName = US_STATES.find(
    (s) => s.name.toUpperCase() === normalized
  );

  return stateByName ? stateByName.code : "";
}

export interface StateValidationResult {
  isValid: boolean;
  error?: string;
  normalizedCode?: string;
}

/**
 * Comprehensive state validation with error messaging
 */
export function validateState(stateInput: string): StateValidationResult {
  if (!stateInput || stateInput.trim() === "") {
    return {
      isValid: false,
      error: "State is required",
    };
  }

  const normalized = normalizeStateCode(stateInput);

  if (!normalized) {
    return {
      isValid: false,
      error: "State must be a valid US state abbreviation",
    };
  }

  return {
    isValid: true,
    normalizedCode: normalized,
  };
}
