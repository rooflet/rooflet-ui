/**
 * Format a number as currency with commas and 2 decimal places for display
 * @param value - The numeric value to format
 * @returns Formatted string (e.g., "1,234.56")
 */
export function formatCurrencyForDisplay(value: number | string): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "";
  return numValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse a currency string (with commas and $ symbol) to a number for backend submission
 * @param value - The string value to parse (e.g., "$1,234.56" or "1,234.56")
 * @returns Numeric value (e.g., 1234.56)
 */
export function parseCurrencyToNumber(value: string): number {
  // Remove dollar sign, commas, and parse as float
  const cleaned = value.replace(/[$,]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format user input as they type - adds $ prefix, commas, and limits to 2 decimal places
 * Prevents negative values
 * @param value - The current input value
 * @returns Formatted value for display in input field (e.g., "$1,234.56")
 */
export function formatCurrencyInput(value: string): string {
  // Remove all non-digit and non-decimal characters except the first decimal point
  let cleaned = value.replace(/[^\d.]/g, "");

  // Prevent negative values by removing any minus signs
  cleaned = cleaned.replace(/-/g, "");

  // Only allow one decimal point
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }

  // Limit to 2 decimal places
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + "." + parts[1].substring(0, 2);
  }

  // Return empty string if there's no valid input
  if (!cleaned || cleaned === ".") {
    return "";
  }

  // Split into integer and decimal parts
  const [integerPart, decimalPart] = cleaned.split(".");

  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Reconstruct with $ prefix and decimal if it exists
  const formatted =
    decimalPart !== undefined
      ? `$${formattedInteger}.${decimalPart}`
      : `$${formattedInteger}`;

  return formatted;
}

/**
 * Ensure currency value has .00 decimal padding for display with $ prefix
 * Use on blur to finalize the format
 * @param value - The current input value
 * @returns Formatted value with $ prefix and .00 padding (e.g., "$1,234.56")
 */
export function ensureDecimalPadding(value: string): string {
  if (!value || value === "") return "";

  // Remove dollar sign and commas for parsing
  const cleaned = value.replace(/[$,]/g, "");
  const numValue = parseFloat(cleaned);

  if (isNaN(numValue) || numValue < 0) return "";

  // Format with exactly 2 decimal places and add commas with $ prefix
  return (
    "$" +
    numValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Parse a percentage string (with % symbol) to a number for backend submission
 * @param value - The string value to parse (e.g., "6.125%" or "6.125")
 * @returns Numeric value (e.g., 6.125)
 */
export function parsePercentageToNumber(value: string): number {
  // Remove percent sign and parse as float
  const cleaned = value.replace(/%/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format user input as they type - adds % suffix and limits to 3 decimal places
 * Prevents negative values and values over 100%
 * @param value - The current input value
 * @returns Formatted value for display in input field (e.g., "6.125%")
 */
export function formatPercentageInput(value: string): string {
  // Remove all non-digit and non-decimal characters except the first decimal point
  let cleaned = value.replace(/[^\d.]/g, "");

  // Prevent negative values by removing any minus signs
  cleaned = cleaned.replace(/-/g, "");

  // Only allow one decimal point
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }

  // Limit to 3 decimal places
  if (parts.length === 2 && parts[1].length > 3) {
    cleaned = parts[0] + "." + parts[1].substring(0, 3);
  }

  // Return empty string if there's no valid input
  if (!cleaned || cleaned === ".") {
    return "";
  }

  // Check if value exceeds 100
  const numValue = parseFloat(cleaned);
  if (!isNaN(numValue) && numValue > 100) {
    return "100%";
  }

  // Add % suffix
  return `${cleaned}%`;
}

/**
 * Ensure percentage value has proper decimal places for display with % suffix
 * Use on blur to finalize the format (up to 3 decimal places, trailing zeros removed)
 * Limits value to 0-100% range
 * @param value - The current input value
 * @returns Formatted value with % suffix (e.g., "6.125%")
 */
export function ensurePercentagePadding(value: string): string {
  if (!value || value === "") return "";

  // Remove percent sign for parsing
  const cleaned = value.replace(/%/g, "");
  const numValue = parseFloat(cleaned);

  if (isNaN(numValue) || numValue < 0) return "";

  // Cap at 100%
  const cappedValue = Math.min(numValue, 100);

  // Format with up to 3 decimal places, removing trailing zeros
  const formatted = cappedValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

  return `${formatted}%`;
}
