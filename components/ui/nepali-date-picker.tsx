'use client';

import { useState, useEffect } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { getNepaliDaysInMonth } from '@/lib/date-utils';
import NepaliDate from 'nepali-date-converter';

interface NepaliDatePickerProps {
    value?: Date;
    onChange: (date: Date) => void;
}

const NEPALI_MONTHS = [
    'Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

// Generate years from 2070 to 2090 (can be adjusted)
const YEARS = Array.from({ length: 21 }, (_, i) => 2070 + i);

export function NepaliDatePicker({ value, onChange }: NepaliDatePickerProps) {
    // Determine initial Nepali date parts
    const initialNd = value ? new NepaliDate(value) : new NepaliDate();

    // State stores Nepali year, month (0-11), day
    const [year, setYear] = useState(initialNd.getYear());
    const [month, setMonth] = useState(initialNd.getMonth());
    const [day, setDay] = useState(initialNd.getDate());

    // Update state if value prop changes externally (e.g. form reset)
    useEffect(() => {
        if (value) {
            const nd = new NepaliDate(value);
            setYear(nd.getYear());
            setMonth(nd.getMonth());
            setDay(nd.getDate());
        }
    }, [value]);

    // Derived: Max days in current selected month
    const maxDays = getNepaliDaysInMonth(year, month);

    // Ensure day is valid when month/year changes
    useEffect(() => {
        if (day > maxDays) {
            handleDateChange(year, month, maxDays);
        }
    }, [year, month, maxDays]);

    const handleDateChange = (newYear: number, newMonth: number, newDay: number) => {
        setYear(newYear);
        setMonth(newMonth);
        setDay(newDay);

        // Convert back to JS Date and notify parent
        try {
            const nd = new NepaliDate(newYear, newMonth, newDay);
            onChange(nd.toJsDate());
        } catch (e) {
            console.error('Invalid Nepali date', e);
        }
    };

    return (
        <div className="flex gap-2">
            {/* Year */}
            <Select
                value={year.toString()}
                onValueChange={(val) => handleDateChange(parseInt(val), month, day)}
            >
                <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                    {YEARS.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                            {y}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Month */}
            <Select
                value={month.toString()}
                onValueChange={(val) => handleDateChange(year, parseInt(val), day)}
            >
                <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                    {NEPALI_MONTHS.map((m, idx) => (
                        <SelectItem key={m} value={idx.toString()}>
                            {m}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Day */}
            <Select
                value={day.toString()}
                onValueChange={(val) => handleDateChange(year, month, parseInt(val))}
            >
                <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                    {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                            {d}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
