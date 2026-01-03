/**
 * Zip code validation utilities for US zip codes
 */

export interface ValidationResult {
  isValid: boolean;
  formatted?: string;
  error?: string;
}

/**
 * Validates a US zip code (5-digit format)
 * Accepts formats: XXXXX or XXXXX-XXXX
 * Returns normalized 5-digit format
 */
export function validateZipCode(input: string): ValidationResult {
  if (!input) {
    return {
      isValid: false,
      error: "Zip code is required",
    };
  }

  // Remove all whitespace
  const cleaned = input.replace(/\s/g, "");

  // Check for valid 5-digit or 9-digit (with hyphen) format
  const zipPattern = /^(\d{5})(-\d{4})?$/;
  const match = cleaned.match(zipPattern);

  if (!match) {
    return {
      isValid: false,
      error: "Invalid zip code format. Use 5-digit format (e.g., 12345)",
    };
  }

  // Extract the 5-digit zip code (normalize to 5-digit format)
  const normalized = match[1];

  return {
    isValid: true,
    formatted: normalized,
  };
}

/**
 * Checks if a zip code is already in a list of zip codes
 */
export function isDuplicateZipCode(
  zipCode: string,
  existingZipCodes: string[]
): boolean {
  const validation = validateZipCode(zipCode);
  if (!validation.isValid || !validation.formatted) {
    return false;
  }

  return existingZipCodes.includes(validation.formatted);
}

/**
 * Formats a zip code for display (adds hyphen for 9-digit codes)
 */
export function formatZipCodeForDisplay(zipCode: string): string {
  const validation = validateZipCode(zipCode);
  return validation.formatted || zipCode;
}
