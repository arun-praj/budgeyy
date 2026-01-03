'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLast12Months, formatPeriodLabel, CalendarSystem } from '@/lib/date-utils';
import { useEffect, useState } from 'react';
import { getUserSettings } from '@/actions/user';

// Redoing with correct strategy: Update component definition first.
interface DashboardFiltersProps {
    calendar?: CalendarSystem;
}

export function DashboardFilters({ calendar = 'gregorian' }: DashboardFiltersProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const searchParams = useSearchParams();

    useEffect(() => {
        setMounted(true);
    }, []);

    const months = getLast12Months(calendar);

    // Check for "date" param
    const dateParam = searchParams.get('date');

    // Helper to get unique value for select (YYYY-MM for Gregorian, YYYY-MM for Nepali but derived from date)
    // Actually, distinct dates (start of months) allow us to uniquely identify them.
    // We can use the ISO string of the start date as the value.
    const getValue = (d: Date) => d.toISOString();

    const currentValue = mounted && dateParam
        ? dateParam // Assume param is ISO string
        : getValue(months[0]);

    const handleValueChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('date', val);
        router.push(`?${params.toString()}`);
    };

    return (
        <Select
            value={currentValue}
            onValueChange={handleValueChange}
        >
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
                {months.map((date) => (
                    <SelectItem key={getValue(date)} value={getValue(date)}>
                        {formatPeriodLabel(date, calendar)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
