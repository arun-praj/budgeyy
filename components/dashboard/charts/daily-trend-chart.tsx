'use client';

import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';

interface DailyStats {
    date: string;
    income: number;
    expense: number;
}

interface DailyTrendChartProps {
    data: DailyStats[];
    currency?: string;
    calendar?: string;
}

const chartConfig = {
    income: {
        label: "Income",
        color: "var(--chart-2)", // Using theme variables
    },
    expense: {
        label: "Expense",
        color: "var(--chart-1)",
    },
} satisfies ChartConfig;

export function DailyTrendChart({
    data,
    currency = 'USD',
    calendar = 'gregorian',
}: DailyTrendChartProps) {
    // Format date for XAxis
    const formatXAxis = (dateStr: string) => {
        const date = new Date(dateStr);
        return formatDate(date, calendar as any, 'medium').split(',')[0];
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="h-full"
        >
            <Card className="h-full flex flex-col">
                <CardHeader className="pb-2">
                    <CardTitle>Daily Trends</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-[250px] pb-4">
                    {(!data || data.length === 0) ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            No transactions yet
                        </div>
                    ) : (
                        <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
                            <BarChart accessibilityLayer data={data}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={formatXAxis}
                                    minTickGap={32}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            labelFormatter={(value) => formatDate(new Date(value), calendar as any, 'long')}
                                            indicator="dot"
                                        />
                                    }
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar
                                    dataKey="income"
                                    fill="var(--color-income)"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={50}
                                />
                                <Bar
                                    dataKey="expense"
                                    fill="var(--color-expense)"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={50}
                                />
                            </BarChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
