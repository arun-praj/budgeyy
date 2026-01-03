'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Calendar, AlertCircle, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SmartInsightsProps {
    totalSpent: number;
    dailyStats: { date: string; income: number; expense: number }[];
    currency?: string;
    daysPassed: number;
    daysInMonth: number;
    income?: number;
    needsSpent?: number;
    wantsSpent?: number;
    savingsAmount?: number;
}

export function SmartInsights({
    totalSpent,
    dailyStats,
    currency = 'USD',
    daysPassed,
    daysInMonth,
    income = 0,
    savingsAmount = 0
}: SmartInsightsProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (daysPassed === 0) return null;

    // 1. Projection
    const dailyAverage = totalSpent / daysPassed;
    const projectedTotal = dailyAverage * daysInMonth;
    const projectedSavings = income - projectedTotal;

    // 2. Highest Spend Day
    const maxExpenseDay = dailyStats.reduce((max, day) =>
        day.expense > max.expense ? day : max
        , { expense: 0, date: '' });

    // 3. Zero-Spend Days
    // Count days in the past that had 0 expense
    // Filter dailyStats to only include days <= today
    const zeroSpendDays = dailyStats.filter(day => {
        const dayDate = new Date(day.date);
        const today = new Date();
        return dayDate <= today && day.expense === 0 && day.income === 0; // Assuming strict zero spend/income means no activity
    }).length; // This might be tricky if dailyStats only returns days WITH activity. 
    // If dailyStats is sparse, we need to count total days passed - days with expense > 0.
    // Let's assume dailyStats comes from 'getCalendarStats' which usually fills all days? 
    // Actually getCalendarStats usually fills all days in range. Let's verify. 
    // Re-reading getCalendarStats in actions/transactions.ts might be needed if unsure, 
    // but for now let's assume it returns all days or use a safer metric:
    const daysWithExpense = dailyStats.filter(d => d.expense > 0).length;
    const zeroSpendDaysEstimated = Math.max(0, daysPassed - daysWithExpense);


    // 4. Weekend vs Weekday
    const weekdays = dailyStats.filter(d => {
        const day = new Date(d.date).getDay();
        return day !== 0 && day !== 6;
    });
    const weekends = dailyStats.filter(d => {
        const day = new Date(d.date).getDay();
        return day === 0 || day === 6;
    });

    const avgWeekday = weekdays.reduce((acc, curr) => acc + curr.expense, 0) / (weekdays.length || 1);
    const avgWeekend = weekends.reduce((acc, curr) => acc + curr.expense, 0) / (weekends.length || 1);

    const spendMoreOnWeekend = avgWeekend > avgWeekday * 1.2; // 20% more

    // 5. Savings Health
    const savingsRate = income > 0 ? (savingsAmount / income) * 100 : 0;
    const isSavingsHealthy = savingsRate >= 20;

    return (
        <Card className="h-full shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2.5 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 rounded-bl-xl border-b border-l border-blue-100 dark:border-blue-900/20 backdrop-blur-[2px]">
                <Sparkles className="h-4 w-4" />
            </div>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Smart Insights
                </CardTitle>
                <CardDescription>AI-powered analysis of your spending</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {/* Projection */}
                <div className="flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mt-1">
                        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Monthly Projection</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Projected spend: <span className="font-semibold text-foreground">{formatCurrency(projectedTotal, currency)}</span>.
                            {income > 0 && (
                                <> Check: You are on track to save <span className={projectedSavings > 0 ? "text-green-600 dark:text-green-400 font-bold" : "text-red-600 dark:text-red-400 font-bold"}>
                                    {formatCurrency(projectedSavings, currency)}
                                </span>.</>
                            )}
                        </p>
                    </div>
                </div>

                {/* Savings Insight */}
                <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full mt-1 ${isSavingsHealthy ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                        {isSavingsHealthy ? (
                            <TrendingUp className={`h-4 w-4 ${isSavingsHealthy ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium">Savings Health</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Current savings rate: <span className="font-semibold text-foreground">{savingsRate.toFixed(1)}%</span>.
                            {isSavingsHealthy
                                ? " Great job! You're hitting the 20% goal."
                                : " Try to reduce 'Wants' to boost this to 20%."}
                        </p>
                    </div>
                </div>

                {/* Spending Pattern */}
                <div className="flex items-start gap-3">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full mt-1">
                        <TrendingDown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Spending Habits</p>
                        <ul className="text-xs text-muted-foreground mt-1 list-disc pl-3 space-y-1">
                            <li>Highest spend: <span className="font-semibold text-foreground">{formatCurrency(maxExpenseDay.expense, currency)}</span> on {mounted ? new Date(maxExpenseDay.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) : '...'}.</li>
                            {spendMoreOnWeekend && <li>You tend to spend <span className="font-semibold text-foreground">{((avgWeekend / avgWeekday - 1) * 100).toFixed(0)}% more</span> on weekends.</li>}
                            {zeroSpendDaysEstimated > 0 && <li>You've had <span className="font-semibold text-foreground">{zeroSpendDaysEstimated} zero-spend days</span> this month! 🎉</li>}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
