'use client';

import { useState, useMemo } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { getMonthRange, formatDate } from '@/lib/date-utils';
import NepaliDate from 'nepali-date-converter';
import { DayTransactionsDialog } from './day-transactions-dialog';

interface DayStats {
    income: number;
    expense: number;
    savings: number;
    incomeCount?: number;
    expenseCount?: number;
    savingsCount?: number;
}

interface CalendarGridProps {
    date: Date;
    data: { date: string; income: number; expense: number; savings: number; incomeCount?: number; expenseCount?: number; savingsCount?: number }[];
    currency?: string;
    calendar?: string;
}

export function CalendarGrid({ date, data, currency = 'USD', calendar = 'gregorian' }: CalendarGridProps) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const calendarDays = useMemo(() => {
        const { start, end } = getMonthRange(date, calendar as any);

        // Find the start date of the first week (could be in previous month)
        const startDate = new Date(start);
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Start on Sunday

        // Find the end date of the last week (could be in next month)
        const endDate = new Date(end);
        const daysToAdd = 6 - endDate.getDay(); // End on Saturday
        endDate.setDate(endDate.getDate() + daysToAdd);

        const days = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return days;
    }, [date, calendar]);

    // Map data for quick lookup
    const statsMap = useMemo(() => {
        const map: Record<string, DayStats> = {};
        data.forEach(item => {
            // Ensure we match YYYY-MM-DD
            const d = new Date(item.date).toISOString().split('T')[0];
            map[d] = {
                income: item.income,
                expense: item.expense,
                savings: item.savings,
                incomeCount: item.incomeCount || 0,
                expenseCount: item.expenseCount || 0,
                savingsCount: item.savingsCount || 0
            };
        });
        return map;
    }, [data]);

    const isSameMonth = (d1: Date, d2: Date) => {
        if (calendar === 'nepali') {
            const nd1 = new NepaliDate(d1);
            const nd2 = new NepaliDate(d2);
            return nd1.getMonth() === nd2.getMonth() && nd1.getYear() === nd2.getYear();
        }
        return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    };

    const isToday = (d: Date) => {
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    const getDayLabel = (d: Date) => {
        if (calendar === 'nepali') {
            try {
                const nd = new NepaliDate(d);
                return nd.getDate();
            } catch {
                return d.getDate();
            }
        }
        return d.getDate();
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className={cn(
                "grid grid-cols-7",
                "sm:flex-1 sm:auto-rows-fr" // Only auto-expand rows on desktop
            )}>
                {calendarDays.map((day, index) => {
                    const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                    const stats = statsMap[dateKey];
                    const isCurrentMonth = isSameMonth(day, date);
                    const isCurrentDay = isToday(day);

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => setSelectedDate(day)}
                            className={cn(
                                "relative flex flex-col items-center sm:items-stretch gap-1 transition-colors cursor-pointer",
                                // Mobile: square aspect ratio, no borders, minimal padding
                                "aspect-square p-0.5 border-none",
                                // Desktop: auto aspect, min height, borders
                                "sm:aspect-auto sm:min-h-[100px] sm:p-2 sm:border-b sm:border-r sm:last:border-r-0",
                                // Hover only on desktop
                                "sm:hover:bg-muted/50",
                                // Previous/Next month fading
                                !isCurrentMonth && "opacity-40 bg-muted/10",
                                // Current day highlight
                                isCurrentDay && "bg-primary/5 sm:ring-1 sm:ring-inset sm:ring-primary"
                            )}
                        >
                            <span className={cn(
                                "text-xs sm:text-sm w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full sm:mb-1",
                                // User Request: "this month date should be bold and dark"
                                isCurrentMonth ? "font-bold" : "font-normal",
                                isCurrentDay
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : isCurrentMonth
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                            )}>
                                {getDayLabel(day)}
                            </span>

                            {stats && (
                                <>
                                    {/* Desktop View: Money Text */}
                                    <div className="hidden sm:flex flex-col gap-1 text-xs">
                                        {stats.income > 0 && (
                                            <div className="flex justify-between items-center text-green-600 bg-green-50 px-1 py-0.5 rounded">
                                                <span>Inc</span>
                                                <span className="font-semibold">{formatCurrency(stats.income, currency)}</span>
                                            </div>
                                        )}
                                        {stats.expense > 0 && (
                                            <div className="flex justify-between items-center text-red-600 bg-red-50 px-1 py-0.5 rounded">
                                                <span>Exp</span>
                                                <span className="font-semibold">{formatCurrency(stats.expense, currency)}</span>
                                            </div>
                                        )}
                                        {stats.savings > 0 && (
                                            <div className="flex justify-between items-center text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                                                <span>Sav</span>
                                                <span className="font-semibold">{formatCurrency(stats.savings, currency)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile View: Dots */}
                                    <div className="flex sm:hidden flex-wrap gap-0.5 justify-center content-start mt-1">
                                        {/* Render Green Dots for Income Count */}
                                        {Array.from({ length: Math.min(stats.incomeCount || 0, 5) }).map((_, i) => (
                                            <div key={`inc-${i}`} className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        ))}
                                        {/* Render Red Dots for Expense Count */}
                                        {Array.from({ length: Math.min(stats.expenseCount || 0, 5) }).map((_, i) => (
                                            <div key={`exp-${i}`} className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        ))}
                                        {/* Render Blue Dots for Savings Count */}
                                        {Array.from({ length: Math.min(stats.savingsCount || 0, 5) }).map((_, i) => (
                                            <div key={`sav-${i}`} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        ))}
                                        {/* Overflow indicator if needed? User asked for "corresponding number" but let's cap at visual limit or just wrap */}
                                        {/* Just wrapping with flex-wrap should work for reasonable counts */}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <DayTransactionsDialog
                date={selectedDate}
                isOpen={!!selectedDate}
                onClose={() => setSelectedDate(null)}
                currency={currency}
                calendar={calendar}
            />
        </div>
    );
}
