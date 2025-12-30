import { getCalendarStats } from '@/actions/transactions';
import { getUserSettings } from '@/actions/user';
import { CalendarGrid } from '@/components/calendar/calendar-grid';
import { CalendarHeader } from '@/components/calendar/calendar-header';



export const metadata = {
    title: 'Calendar - Budgeyy',
    description: 'View your expenses and income in a calendar view',
};

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function CalendarPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] space-y-4">
            <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <CalendarContent searchParams={props.searchParams} />
            </Suspense>
        </div>
    );
}

async function CalendarContent({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await searchParams;
    const dateParam = params.date as string;
    const currentDate = dateParam ? new Date(dateParam) : new Date();

    const [stats, userSettings] = await Promise.all([
        // reusing logic below for stats fetch, but need to move date calc up or dup it
        // actually easier to just wait for date calc
        Promise.resolve(null), // placeholder
        getUserSettings(),
    ]);

    // Calculate range for the calendar fetch (full month + buffers)
    const d = new Date(currentDate);
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);

    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start on Sunday buffer

    const endDate = new Date(endOfMonth);
    const daysToAdd = 6 - endDate.getDay(); // End on Saturday buffer
    endDate.setDate(endDate.getDate() + daysToAdd);
    endDate.setHours(23, 59, 59, 999);

    const realStats = await getCalendarStats(startDate, endDate);

    const currency = userSettings?.currency || 'USD';
    const calendar = userSettings?.calendarPreference || 'gregorian';

    return (
        <>
            <Suspense fallback={null}>
                <CalendarHeader date={currentDate} calendar={calendar} />
            </Suspense>
            <div className="flex-1 min-h-0 border rounded-lg shadow-sm overflow-auto">
                <CalendarGrid date={currentDate} data={realStats} currency={currency} calendar={calendar} />
            </div>
        </>
    );
}
