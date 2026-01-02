import { getCalendarStats } from '@/actions/transactions';
import { getUserSettings } from '@/actions/user';
import { getCalendarPageRange } from '@/lib/date-utils';

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

    const [userSettings] = await Promise.all([
        getUserSettings(),
    ]);

    const currency = userSettings?.currency || 'USD';
    const calendar = userSettings?.calendarPreference || 'gregorian';

    // Calculate range for the calendar fetch (full month + buffers)
    const { start: startDate, end: endDate } = getCalendarPageRange(currentDate, calendar);

    const realStats = await getCalendarStats(startDate, endDate);



    return (
        <>
            <Suspense fallback={null}>
                <CalendarHeader date={currentDate} calendar={calendar} />
            </Suspense>
            <div className="flex-1 min-h-0 border rounded-lg shadow-sm overflow-auto">
                <CalendarGrid
                    key={currentDate.toISOString()}
                    date={currentDate}
                    data={realStats}
                    currency={currency}
                    calendar={calendar}
                />
            </div>
        </>
    );
}
