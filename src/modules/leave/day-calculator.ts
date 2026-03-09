/**
 * Working day calculator.
 * Excludes weekends (Saturday, Sunday) and Nigerian public holidays.
 * Must be called server-side (needs access to the publicHolidays table).
 */

/**
 * Count working days between startDate and endDate (inclusive).
 * @param startDate - ISO date string "YYYY-MM-DD"
 * @param endDate   - ISO date string "YYYY-MM-DD"
 * @param publicHolidays - Array of ISO date strings to exclude (from DB)
 */
export function calculateWorkingDays(
  startDate: string,
  endDate: string,
  publicHolidays: string[],
): number {
  const holidaySet = new Set(publicHolidays);

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  if (start > end) return 0;

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
    const isoDate = current.toISOString().split("T")[0];

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaySet.has(isoDate);

    if (!isWeekend && !isHoliday) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get all ISO date strings in the range [startDate, endDate].
 * Useful for checking calendar conflicts.
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
