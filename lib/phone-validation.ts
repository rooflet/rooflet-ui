/**
 * Phone number validation and formatting utilities
 */

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  formatted?: string;
  numbersOnly?: string;
}

/**
 * Validates and formats a phone number
 * Accepts various formats and standardizes to 1-222-333-4444
 */
export function validateAndFormatPhone(input: string): PhoneValidationResult {
  if (!input || input.trim() === "") {
    return { isValid: true }; // Empty phone numbers are allowed for optional fields
  }

  // Remove all non-digit characters
  const digitsOnly = input.replace(/\D/g, "");

  // Check for valid US phone number lengths
  if (digitsOnly.length < 10) {
    return {
      isValid: false,
      error: "Phone number must be at least 10 digits",
    };
  }

  if (digitsOnly.length > 11) {
    return {
      isValid: false,
      error: "Phone number cannot exceed 11 digits",
    };
  }

  // Handle 11-digit numbers (must start with 1)
  if (digitsOnly.length === 11) {
    if (!digitsOnly.startsWith("1")) {
      return {
        isValid: false,
        error: "11-digit phone numbers must start with 1",
      };
    }
  }

  // Extract the phone number components
  let phoneNumber: string;
  let countryCode = "";

  if (digitsOnly.length === 11) {
    countryCode = "1";
    phoneNumber = digitsOnly.slice(1);
  } else {
    phoneNumber = digitsOnly;
  }

  // Validate area code (first 3 digits)
  const areaCode = phoneNumber.slice(0, 3);
  if (areaCode[0] === "0" || areaCode[0] === "1") {
    return {
      isValid: false,
      error: "Area code cannot start with 0 or 1",
    };
  }

  // Validate exchange code (next 3 digits)
  const exchangeCode = phoneNumber.slice(3, 6);
  if (exchangeCode[0] === "0" || exchangeCode[0] === "1") {
    return {
      isValid: false,
      error: "Exchange code cannot start with 0 or 1",
    };
  }

  // Format the phone number
  const formatted = countryCode
    ? `1-${areaCode}-${exchangeCode}-${phoneNumber.slice(6)}`
    : `${areaCode}-${exchangeCode}-${phoneNumber.slice(6)}`;

  return {
    isValid: true,
    formatted,
    numbersOnly: digitsOnly,
  };
}

/**
 * Format phone number as user types (for real-time formatting)
 */
export function formatPhoneAsYouType(input: string): string {
  // Remove all non-digit characters
  const digitsOnly = input.replace(/\D/g, "");

  // Don't format if empty
  if (!digitsOnly) return "";

  // Format based on length
  if (digitsOnly.length <= 3) {
    return digitsOnly;
  } else if (digitsOnly.length <= 6) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
  } else if (digitsOnly.length <= 10) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(
      3,
      6
    )}-${digitsOnly.slice(6)}`;
  } else if (digitsOnly.length === 11 && digitsOnly[0] === "1") {
    return `1-${digitsOnly.slice(1, 4)}-${digitsOnly.slice(
      4,
      7
    )}-${digitsOnly.slice(7)}`;
  } else {
    // Truncate if too long
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(
      3,
      6
    )}-${digitsOnly.slice(6, 10)}`;
  }
}

/**
 * Extract only numbers from a formatted phone number for backend submission
 */
export function extractPhoneNumbers(formattedPhone: string): string {
  return formattedPhone.replace(/\D/g, "");
}

/**
 * Format a phone number from backend (numbers only) to display format
 */
export function formatPhoneForDisplay(numbersOnly: string): string {
  if (!numbersOnly) return "";

  const validation = validateAndFormatPhone(numbersOnly);
  return validation.formatted || numbersOnly;
}
