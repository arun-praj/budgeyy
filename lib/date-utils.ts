import NepaliDate from 'nepali-date-converter';

// Define the type here if not imported from @/types to avoid circular deps or if it doesn't exist
export type CalendarSystem = 'gregorian' | 'nepali';

/**
 * Format a date based on user's calendar preference
 * Dates are always stored as UTC ISO strings in the database
 */
export function formatDate(
    date: Date | string,
    calendar: CalendarSystem = 'gregorian',
    format: 'short' | 'long' | 'medium' = 'short'
): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (calendar === 'nepali') {
        try {
            const nepaliDate = new NepaliDate(d);
            if (format === 'long') {
                return nepaliDate.format('DD MMMM, YYYY');
            }
            if (format === 'medium') {
                return nepaliDate.format('DD MMMM');
            }
            return nepaliDate.format('YYYY-MM-DD');
        } catch (e) {
            console.error('Nepali date conversion failed', e);
            // Fallback to Gregorian
        }
    }

    // Gregorian formatting
    if (format === 'long') {
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }
    if (format === 'medium') {
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    }
    return d.toISOString().split('T')[0];
}

/**
 * Format a period label (e.g. "January 2024" or "Poush 2081")
 */
export function formatPeriodLabel(date: Date, calendar: CalendarSystem = 'gregorian'): string {
    if (calendar === 'nepali') {
        try {
            const nd = new NepaliDate(date);
            return nd.format('MMMM, YYYY');
        } catch {
            return formatPeriodLabel(date, 'gregorian');
        }
    }
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Format a date based on user's calendar preference
 * Dates are always stored as UTC ISO strings in the database
 */

/**
 * Format a Gregorian date
 */

/**
 * Get the current date in the user's preferred calendar
 */
export function getCurrentDate(calendar: CalendarSystem = 'gregorian'): string {
    return formatDate(new Date(), calendar);
}

/**
 * Get the start and end of the current month
 */
export function getCurrentMonthRange(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
}

/**
 * Get the start and end of the current year
 */
export function getCurrentYearRange(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { start, end };
}

/**
 * Parse a date string to Date object
 * Always treats input as UTC
 */
export function parseDate(dateString: string): Date {
    return new Date(dateString);
}

/**
 * Convert date to UTC ISO string for database storage
 */
export function toUTCString(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString();
}

/**
 * Get start and end of a specific month
 * Handles both Gregorian and Nepali calendars
 */
export function getMonthRange(date: Date, calendar: CalendarSystem = 'gregorian'): { start: Date; end: Date } {
    if (calendar === 'nepali') {
        try {
            // Get the Nepali date for the input
            const nd = new NepaliDate(date);
            const year = nd.getYear();
            const month = nd.getMonth();

            // Start of month: 1st day of current Nepali month
            const startNd = new NepaliDate(year, month, 1);
            const start = startNd.toJsDate();
            start.setHours(0, 0, 0, 0);

            // End of month: 0th day of next month (which gives last day of current month)
            const endNd = new NepaliDate(year, month + 1, 0);
            const end = endNd.toJsDate();
            end.setHours(23, 59, 59, 999);

            return { start, end };
        } catch (e) {
            console.error('Error calculating Nepali month range', e);
            // Fallback to Gregorian
        }
    }

    const d = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
}

/**
 * Get list of last 12 months for dropdown
 * Returns a list of Dates, where each date represents the start of a month
 * in the selected calendar system.
 */
export function getLast12Months(calendar: CalendarSystem = 'gregorian'): Date[] {
    const dates: Date[] = [];
    const now = new Date();

    if (calendar === 'nepali') {
        try {
            const currentNd = new NepaliDate(now);
            let year = currentNd.getYear();
            let month = currentNd.getMonth();

            for (let i = 0; i < 12; i++) {
                // creating new NepaliDate(year, month, 1) automatically parses correct month/year even if month is negative
                // But let's handle decrement manually to be safe and clear
                const nd = new NepaliDate(year, month, 1);
                dates.push(nd.toJsDate());

                month--;
                if (month < 0) {
                    month = 11;
                    year--;
                }
            }
            return dates;
        } catch (e) {
            console.error('Error generating Nepali months', e);
        }
    }

    // Gregorian fallback
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        dates.push(d);
    }
    return dates;
}

/**
 * Get days in a specific Nepali month
 */
export function getNepaliDaysInMonth(year: number, month: number): number {
    // month is 0-indexed (0 = Baisakh, 11 = Chaitra)
    // Create date for next month day 0, which is last day of this month
    const nd = new NepaliDate(year, month + 1, 0);
    return nd.getDate();
}

/**
 * Get Nepali Year and Month from a JS Date
 */
export function toNepaliParts(date: Date): { year: number; month: number; day: number } {
    const nd = new NepaliDate(date);
    return {
        year: nd.getYear(),
        month: nd.getMonth(),
        day: nd.getDate()
    };
}
