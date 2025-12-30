'use client';

import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';

interface CategoryBarChartProps {
    needsSpent: number;
    wantsSpent: number;
    savingsAmount: number;
    currency?: string;
}

const chartConfig = {
    amount: {
        label: "Amount",
    },
    needs: {
        label: "Needs",
        color: "var(--chart-1)",
    },
    wants: {
        label: "Wants",
        color: "var(--chart-2)",
    },
    savings: {
        label: "Savings",
        color: "var(--chart-3)",
    },
} satisfies ChartConfig;

export function CategoryBarChart({
    needsSpent,
    wantsSpent,
    savingsAmount,
    currency = 'USD',
}: CategoryBarChartProps) {
    const data = [
        { category: 'needs', amount: needsSpent, fill: "var(--color-needs)" },
        { category: 'wants', amount: wantsSpent, fill: "var(--color-wants)" },
        { category: 'savings', amount: savingsAmount, fill: "var(--color-savings)" },
    ];

    const total = needsSpent + wantsSpent + savingsAmount;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="h-full"
        >
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>Spending by Category</CardTitle>
                    <CardDescription>Breakdown of your budget usage</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                    {total === 0 ? (
                        <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                            No transactions yet
                        </div>
                    ) : (
                        <ChartContainer config={chartConfig} className="h-full w-full min-h-[200px] aspect-auto">
                            <BarChart
                                accessibilityLayer
                                data={data}
                                layout="vertical"
                                margin={{
                                    left: 0,
                                    right: 50, // space for value labels
                                }}
                            >
                                <CartesianGrid horizontal={false} />
                                <YAxis
                                    dataKey="category"
                                    type="category"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) =>
                                        chartConfig[value as keyof typeof chartConfig]?.label
                                    }
                                    hide
                                />
                                <XAxis dataKey="amount" type="number" hide />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                <Bar dataKey="amount" radius={5} barSize={40}>
                                    <LabelList
                                        dataKey="category"
                                        position="insideLeft"
                                        offset={8}
                                        className="fill-[--color-label] font-medium text-white mix-blend-difference"
                                        formatter={(value: any) => chartConfig[value as keyof typeof chartConfig]?.label}
                                    />
                                    <LabelList
                                        dataKey="amount"
                                        position="right"
                                        offset={8}
                                        className="fill-foreground font-medium"
                                        formatter={(value: any) => formatCurrency(value, currency, 'compact')}
                                    />
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
