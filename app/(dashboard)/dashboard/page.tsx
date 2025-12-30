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
import { getMonthRange, formatDate, formatPeriodLabel } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;
    const dateParam = params.date as string;
    // Default to current date if no param
    const currentDate = dateParam ? new Date(dateParam) : new Date();

    const { start, end } = getMonthRange(currentDate);

    // Run fetches in parallel
    const [stats, recentTransactions, reportData, userSettings, dailyStats] = await Promise.all([
        getDashboardStats({ start, end }),
        getTransactions({ limit: 5, start, end }),
        getBudgetReportData(start, end),
        getUserSettings(),
        getCalendarStats(start, end),
    ]);

    const currency = userSettings?.currency || 'USD';
    const calendar = userSettings?.calendarPreference || 'gregorian';
    // Net Savings = Explicit Savings Transaction Amount Only
    const netSavings = stats.savingsAmount;
    // Balance = Income - Expenses - Savings (Remaining spendable)
    const balance = stats.totalIncome - stats.totalExpenses - netSavings;

    const formattedMonth = formatPeriodLabel(currentDate, calendar);
    const today = formatDate(new Date(), calendar, 'long');

    // Enhance report data with label
    if (reportData) {
        (reportData as any).monthLabel = formattedMonth;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
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
                        <div className="hidden sm:block">
                            <TransactionFormSheet calendar={calendar} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            {/* Stats Grid */}
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
            <RecentTransactions transactions={recentTransactions} currency={currency} calendar={calendar} />
        </div>
    );
}
