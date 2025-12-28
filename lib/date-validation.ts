/**
 * Date validation utilities for consistent date handling across the application
 */

export interface DateValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a date string to ensure it's in the correct format (YYYY-MM-DD)
 * and represents a valid, reasonable date
 */
export function validateDate(dateString: string): DateValidationResult {
  if (!dateString) {
    return { isValid: true }; // Empty dates are allowed for optional fields
  }

  // Check if the date string matches the expected format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return {
      isValid: false,
      error: "Date must be in format YYYY-MM-DD",
    };
  }

  // Parse the date string manually to avoid timezone issues
  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Validate basic ranges
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      error: "Invalid month (must be 1-12)",
    };
  }

  if (day < 1 || day > 31) {
    return {
      isValid: false,
      error: "Invalid day (must be 1-31)",
    };
  }

  // Create date object using local time to avoid timezone issues
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: "Invalid date",
    };
  }

  // Check if the date was adjusted (e.g., Feb 30 becomes Mar 2)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return {
      isValid: false,
      error: "Invalid date (e.g., February 30th doesn't exist)",
    };
  }

  // Reasonable year range validation (1900-2100)
  if (year < 1900 || year > 2100) {
    return {
      isValid: false,
      error: "Year must be between 1900 and 2100",
    };
  }

  return { isValid: true };
}

/**
 * Validates purchase dates - should not be in the future
 */
export function validatePurchaseDate(dateString: string): DateValidationResult {
  const basicValidation = validateDate(dateString);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  if (!dateString) {
    return { isValid: true }; // Optional field
  }

  // Parse date manually to avoid timezone issues
  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const date = new Date(
    parseInt(yearStr, 10),
    parseInt(monthStr, 10) - 1,
    parseInt(dayStr, 10)
  );

  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  if (date > today) {
    return {
      isValid: false,
      error: "Purchase date cannot be in the future",
    };
  }

  return { isValid: true };
}

/**
 * Validates lease dates with logical constraints
 */
export function validateLeaseDates(
  startDate: string,
  endDate: string
): {
  startDateValidation: DateValidationResult;
  endDateValidation: DateValidationResult;
  dateRangeValidation: DateValidationResult;
} {
  const startValidation = validateDate(startDate);
  const endValidation = validateDate(endDate);

  let dateRangeValidation: DateValidationResult = { isValid: true };

  // Only validate date range if both dates are valid and present
  if (
    startValidation.isValid &&
    endValidation.isValid &&
    startDate &&
    endDate
  ) {
    // Parse dates manually to avoid timezone issues
    const [startYear, startMonth, startDay] = startDate.split("-");
    const [endYear, endMonth, endDay] = endDate.split("-");
    const start = new Date(
      parseInt(startYear, 10),
      parseInt(startMonth, 10) - 1,
      parseInt(startDay, 10)
    );
    const end = new Date(
      parseInt(endYear, 10),
      parseInt(endMonth, 10) - 1,
      parseInt(endDay, 10)
    );

    if (start >= end) {
      dateRangeValidation = {
        isValid: false,
        error: "Lease end date must be after start date",
      };
    }

    // Check if lease duration is reasonable (not more than 10 years)
    const maxLeaseDuration = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years in milliseconds
    if (end.getTime() - start.getTime() > maxLeaseDuration) {
      dateRangeValidation = {
        isValid: false,
        error: "Lease duration cannot exceed 10 years",
      };
    }
  }

  return {
    startDateValidation: startValidation,
    endDateValidation: endValidation,
    dateRangeValidation,
  };
}

/**
 * Format a date string for display (convert YYYY-MM-DD to MM/DD/YYYY)
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Return original if invalid

  return date.toLocaleDateString("en-US");
}

/**
 * Format a date for input field (convert from any format to YYYY-MM-DD)
 */
export function formatDateForInput(dateString: string): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return ""; // Return empty if invalid

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in local timezone as YYYY-MM-DD format
 * Use this instead of new Date().toISOString().split("T")[0] to avoid timezone issues
 */
export function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convert a Date object to local date string in YYYY-MM-DD format
 * Use this instead of date.toISOString().split("T")[0] to avoid timezone issues
 * @param date - The Date object to convert
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the first day of a specific month in local timezone as YYYY-MM-DD format
 * @param year - The year
 * @param month - The month (0-11, JavaScript convention)
 */
export function getFirstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

/**
 * Get the last day of a specific month in local timezone as YYYY-MM-DD format
 * @param year - The year
 * @param month - The month (0-11, JavaScript convention)
 */
export function getLastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(
    lastDay
  ).padStart(2, "0")}`;
}
