'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatPeriodLabel } from '@/lib/date-utils';

interface CalendarHeaderProps {
    date: Date;
    calendar?: string;
}

export function CalendarHeader({ date, calendar = 'gregorian' }: CalendarHeaderProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const navigateMonth = (direction: 'prev' | 'next' | 'today') => {
        const newDate = new Date(date);
        if (direction === 'today') {
            const today = new Date();
            updateDate(today);
            return;
        }

        if (direction === 'prev') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        updateDate(newDate);
    };

    const updateDate = (date: Date) => {
        const params = new URLSearchParams(searchParams.toString());
        // Use YYYY-MM-01 format for consistency
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = '01'; // Always start at 1st
        params.set('date', `${year}-${month}-${day}`);
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 lg:px-6 border-b bg-card">
            <h1 className="text-2xl font-bold">
                {formatPeriodLabel(date, calendar as any)}
            </h1>

            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button variant="outline" onClick={() => navigateMonth('today')}>
                    Today
                </Button>

                <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
