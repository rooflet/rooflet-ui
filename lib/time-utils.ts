/**
 * Calculate relative time from a date string
 * Handles timezone issues by treating date-only strings (YYYY-MM-DD) as local dates
 * rather than UTC dates to avoid off-by-one-day errors
 */
export function getRelativeTime(dateString: string): string {
  const now = new Date();

  // If the date string is in YYYY-MM-DD format (date only, no time),
  // parse it as a local date to avoid timezone issues
  let targetDate: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // Date-only format: treat as local date
    const [year, month, day] = dateString.split("-").map(Number);
    targetDate = new Date(year, month - 1, day);
  } else {
    // Has time component: use standard parsing
    targetDate = new Date(dateString);
  }

  // Calculate the difference in milliseconds
  const diffInMs = now.getTime() - targetDate.getTime();

  // Convert to different time units
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // Return appropriate relative time string
  if (diffInDays > 0) {
    return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
  } else if (diffInHours > 0) {
    return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
  } else if (diffInMinutes > 0) {
    return diffInMinutes === 1
      ? "1 minute ago"
      : `${diffInMinutes} minutes ago`;
  } else {
    return "Just now";
  }
}
