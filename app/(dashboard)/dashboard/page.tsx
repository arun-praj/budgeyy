import { StatCard } from '@/components/dashboard/stat-card';
import { StackedStatCards } from '@/components/dashboard/stacked-stat-cards';
import { BudgetOverview } from '@/components/dashboard/budget-overview';
import { CategoryBarChart } from '@/components/dashboard/charts/category-bar-chart';
import { DailyTrendChart } from '@/components/dashboard/charts/daily-trend-chart';

import { SmartInsights } from '@/components/dashboard/smart-insights';
import { TransactionFormSheet } from '@/components/transactions/transaction-form-sheet';
import { RecentTransactions } from '@/components/transactions/recent-transactions';
import { getDashboardStats, getTransactions, getBudgetReportData, getCalendarStats } from '@/actions/transactions';
import { getUserSettings } from '@/actions/user';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import { DownloadBudgetButton } from '@/components/reports/download-button';
import { Button } from '@/components/ui/button';
import { getMonthRange, formatDate, formatPeriodLabel } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import { Suspense } from 'react';


export default function DashboardPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 pt-6 pb-24 md:pb-6 space-y-6">
            {/* Header */}
            <Suspense fallback={<DashboardHeaderSkeleton />}>
                <DashboardHeader searchParams={props.searchParams} />
            </Suspense>

            {/* Stats Grid */}
            <Suspense fallback={<StatsGridSkeleton />}>
                <DashboardContent searchParams={props.searchParams} />
            </Suspense>
        </div>
    );
}

function DashboardHeaderSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            <div className="h-10 w-full md:w-1/3 bg-muted animate-pulse rounded-md" />
        </div>
    );
}

function StatsGridSkeleton() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
            ))}
        </div>
    );
}

async function DashboardHeader({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await searchParams;
    const dateParam = params.date as string;
    const currentDate = dateParam ? new Date(dateParam) : new Date();

    // We need user settings for calendar pref to format date in header? 
    // Yes: formatDate(..., calendar).
    // So Header needs async data too.
    const userSettings = await getUserSettings();
    const calendar = userSettings?.calendarPreference || 'gregorian';
    const currency = userSettings?.currency || 'USD';

    const formattedMonth = formatPeriodLabel(currentDate, calendar);
    const today = formatDate(new Date(), calendar, 'long');

    // Report data for download button
    const { start, end } = getMonthRange(currentDate, calendar);
    // Optimization: Parallel fetch report data with user settings?
    // Let's just fetch report data here or pass it?
    // DownloadButton needs report data.
    const reportData = await getBudgetReportData(start, end);
    if (reportData) {
        (reportData as any).monthLabel = formattedMonth;
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <div className="flex flex-col gap-1 text-muted-foreground">
                        <p>Overview for {formattedMonth}</p>
                        <p className="text-sm font-medium text-foreground/80">Today is {today}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <DownloadBudgetButton data={reportData} currency={currency} />
                    <DashboardFilters calendar={calendar} />
                    <div className="hidden sm:flex items-center gap-2">
                        <TransactionFormSheet
                            calendar={calendar}
                            trigger={
                                <Button variant="outline">
                                    Pay Credit Bill
                                </Button>
                            }
                            initialData={{
                                type: 'expense',
                                description: 'Credit Card Bill Payment',
                                necessityLevel: 'needs', // Usually a need
                            }}
                        />
                        <TransactionFormSheet calendar={calendar} />
                    </div>
                </div>
            </div>
        </div>
    );
}

async function DashboardContent({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await searchParams;
    const dateParam = params.date as string;
    const currentDate = dateParam ? new Date(dateParam) : new Date(); // Re-parsing is cheap/fine

    // Fetch user settings first to get calendar preference
    const userSettings = await getUserSettings();
    const currency = userSettings?.currency || 'USD';
    const calendar = userSettings?.calendarPreference || 'gregorian';

    const { start, end } = getMonthRange(currentDate, calendar);

    // Run fetches in parallel
    const [stats, recentTransactions, dailyStats, reportData] = await Promise.all([
        getDashboardStats({ start, end }),
        getTransactions({ limit: 5, start, end }),
        getCalendarStats(start, end),
        getBudgetReportData(start, end),
    ]);
    // Net Savings = Explicit Savings Transaction Amount Only
    const netSavings = stats.savingsAmount;
    // Balance = Income - Expenses - Savings (Remaining spendable)
    const balance = stats.totalIncome - stats.totalExpenses - netSavings;
    const formattedMonth = formatPeriodLabel(currentDate, calendar);

    // Prepare DIRECT 2-COLUMN Sankey Data: Income -> Destinations
    const sankeyData = {
        nodes: [] as { name: string }[],
        links: [] as { source: number; target: number; value: number }[],
    };

    if (reportData && stats.totalIncome > 0) {
        const nodeMap = new Map<string, number>();
        const getOrCreateNode = (name: string) => {
            const key = name.trim();
            if (nodeMap.has(key)) return nodeMap.get(key)!;
            const index = sankeyData.nodes.length;
            sankeyData.nodes.push({ name: key });
            nodeMap.set(key, index);
            return index;
        };

        // 1. Collect all income sources (Left side)
        const incomeSources = reportData.income
            .filter(inc => Number(inc.amount) > 0)
            .map(inc => ({
                name: inc.description || 'Other Income',
                amount: Math.round((Number(inc.amount) || 0) * 100) / 100,
                remaining: Math.round((Number(inc.amount) || 0) * 100) / 100
            }));

        // 2. Collect all destinations (Right side)
        const destinations: { name: string, needed: number }[] = [];
        [...reportData.needs, ...reportData.wants].forEach(cat => {
            const val = Math.round((Number(cat.amount) || 0) * 100) / 100;
            if (val > 0) destinations.push({ name: cat.description, needed: val });
        });

        if (stats.savingsAmount > 0) {
            destinations.push({ name: 'Savings 🐖', needed: Math.round(stats.savingsAmount * 100) / 100 });
        }

        const totalIncome = Math.round(stats.totalIncome * 100) / 100;
        const totalOutflow = destinations.reduce((acc, d) => acc + d.needed, 0);
        
        if (totalIncome > totalOutflow) {
            destinations.push({ name: 'Unspent Balance', needed: Math.round((totalIncome - totalOutflow) * 100) / 100 });
        }

        // 3. Map Sources to Destinations directly (Greedy distribution)
        let sourceIdx = 0;
        let sinkIdx = 0;

        while (sourceIdx < incomeSources.length && sinkIdx < destinations.length) {
            const source = incomeSources[sourceIdx];
            const sink = destinations[sinkIdx];
            const amountToFlow = Math.min(source.remaining, sink.needed);

            if (amountToFlow > 0.009) {
                const sNodeIdx = getOrCreateNode(source.name);
                const dNodeIdx = getOrCreateNode(sink.name);
                sankeyData.links.push({
                    source: sNodeIdx,
                    target: dNodeIdx,
                    value: amountToFlow
                });
            }

            source.remaining -= amountToFlow;
            sink.needed -= amountToFlow;

            if (source.remaining < 0.01) sourceIdx++;
            if (sink.needed < 0.01) sinkIdx++;
        }
    }


    return (
        <>
            <div className="block sm:hidden">
                <StackedStatCards
                    stats={[
                        {
                            title: "Total Income",
                            value: formatCurrency(stats.totalIncome, currency),
                            iconName: "trendingUp",
                            description: formattedMonth,
                            delay: 0,
                        },
                        {
                            title: "Total Expenses",
                            value: formatCurrency(stats.totalExpenses, currency),
                            iconName: "trendingDown",
                            description: formattedMonth,
                            delay: 0.1,
                        },
                        {
                            title: "Net Savings",
                            value: formatCurrency(netSavings, currency),
                            iconName: "wallet",
                            trend: {
                                value: stats.totalIncome > 0
                                    ? Math.round((netSavings / stats.totalIncome) * 100)
                                    : 0,
                                isPositive: true,
                            },
                            delay: 0.2,
                        },
                        {
                            title: "Balance",
                            value: formatCurrency(balance, currency),
                            iconName: "dollarSign",
                            description: balance >= 0 ? 'On track' : 'Over budget',
                            delay: 0.3,
                        }
                    ]}
                />
            </div>

            <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Income"
                    value={formatCurrency(stats.totalIncome, currency)}
                    iconName="trendingUp"
                    description={formattedMonth}
                    delay={0}
                />
                <StatCard
                    title="Total Expenses"
                    value={formatCurrency(stats.totalExpenses, currency)}
                    iconName="trendingDown"
                    description={formattedMonth}
                    delay={0.1}
                />
                <StatCard
                    title="Net Savings"
                    value={formatCurrency(netSavings, currency)}
                    iconName="wallet"
                    trend={{
                        value: stats.totalIncome > 0
                            ? Math.round((netSavings / stats.totalIncome) * 100)
                            : 0,
                        isPositive: true, // Savings is always positive or zero
                    }}
                    delay={0.2}
                />
                <StatCard
                    title="Balance"
                    value={formatCurrency(balance, currency)}
                    iconName="dollarSign"
                    description={balance >= 0 ? 'On track' : 'Over budget'}
                    delay={0.3}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* 50/30/20 Budget Overview */}
                <BudgetOverview
                    income={stats.totalIncome}
                    needsSpent={stats.needsSpent}
                    wantsSpent={stats.wantsSpent}
                    savingsAmount={stats.savingsAmount}
                    currency={currency}
                />

                {/* Smart Insights (Filling the gap) */}
                <SmartInsights
                    totalSpent={stats.totalExpenses}
                    dailyStats={dailyStats}
                    currency={currency}
                    daysPassed={Math.max(1, new Date().getDate())} // Approximation
                    daysInMonth={new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()}
                    income={stats.totalIncome}
                    savingsAmount={stats.savingsAmount}
                />

                {/* Spending Chart */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:col-span-2">
                    <div className="lg:col-span-2">
                        <DailyTrendChart
                            data={dailyStats}
                            currency={currency}
                            calendar={calendar}
                        />
                    </div>
                    <CategoryBarChart
                        needsSpent={stats.needsSpent}
                        wantsSpent={stats.wantsSpent}
                        savingsAmount={stats.savingsAmount}
                        currency={currency}
                    />

                </div>
            </div>

            {/* Recent Transactions */}
            <RecentTransactions transactions={recentTransactions.data} currency={currency} calendar={calendar} />
        </>
    );
}
