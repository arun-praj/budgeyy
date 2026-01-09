'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Calendar, AlertCircle, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getMonthlyInsight } from '@/actions/ai-insights';
import { Button } from '@/components/ui/button';

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
    const [insight, setInsight] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
        loadInsight();
    }, []);

    const loadInsight = async () => {
        setLoading(true);
        try {
            const res = await getMonthlyInsight();
            if (res.insight) {
                setInsight(res.insight);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (daysPassed === 0) return null;

    // 1. Projection
    const dailyAverage = totalSpent / daysPassed;
    const projectedTotal = dailyAverage * daysInMonth;

    // 2. Highest Spend Day
    const maxExpenseDay = dailyStats.reduce((max, day) =>
        day.expense > max.expense ? day : max
        , { expense: 0, date: '' });

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

    return (
        <Card className="h-full shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col">
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
            <CardContent className="space-y-5 pt-4 flex-1 flex flex-col">
                {/* AI Insight Section - Prominent */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3" />
                            Gemini Analysis
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 -mr-2 text-muted-foreground hover:text-blue-600"
                            onClick={loadInsight}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            <div className="h-4 w-full bg-blue-200/50 dark:bg-blue-800/20 rounded animate-pulse" />
                            <div className="h-4 w-3/4 bg-blue-200/50 dark:bg-blue-800/20 rounded animate-pulse" />
                        </div>
                    ) : (
                        <p className="text-sm leading-relaxed text-blue-950 dark:text-blue-100/90 font-medium">
                            {insight || "No specific patterns detected yet. Keep tracking!"}
                        </p>
                    )}
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mt-auto">
                    {/* Projection */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <Calendar className="h-3.5 w-3.5" />
                            Projection
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                            {formatCurrency(projectedTotal, currency)}
                        </p>
                    </div>

                    {/* Highest Spend Day */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <TrendingDown className="h-3.5 w-3.5" />
                            Highest Day
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                            {formatCurrency(maxExpenseDay.expense, currency)}
                            <span className="text-xs text-muted-foreground ml-1 font-normal block">
                                {mounted && maxExpenseDay.date ? new Date(maxExpenseDay.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) : '-'}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Weekend Habit (Conditional) */}
                {spendMoreOnWeekend && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>You spend <strong>{((avgWeekend / avgWeekday - 1) * 100).toFixed(0)}% more</strong> on weekends.</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
