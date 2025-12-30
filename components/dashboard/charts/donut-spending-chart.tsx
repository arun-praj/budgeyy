"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"

interface DonutChartProps {
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
} satisfies ChartConfig

export function DonutSpendingChart({
    needsSpent,
    wantsSpent,
    savingsAmount,
    currency = 'USD'
}: DonutChartProps) {

    const chartData = [
        { category: "needs", amount: needsSpent, fill: "var(--color-needs)" },
        { category: "wants", amount: wantsSpent, fill: "var(--color-wants)" },
        { category: "savings", amount: savingsAmount, fill: "var(--color-savings)" },
    ]

    const total = needsSpent + wantsSpent + savingsAmount;

    if (total === 0) {
        return (
            <Card className="flex flex-col h-full">
                <CardHeader className="items-center pb-0">
                    <CardTitle>Spending Breakdown</CardTitle>
                    <CardDescription>No data available</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                        No transactions yet
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="items-center pb-0">
                <CardTitle>Spending Breakdown</CardTitle>
                <CardDescription>Overview of your budget usage</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[300px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="amount"
                            nameKey="category"
                            innerRadius={70}
                            strokeWidth={5}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-3xl font-bold"
                                                >
                                                    {formatCurrency(total, currency, 'compact')}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-muted-foreground"
                                                >
                                                    Total
                                                </tspan>
                                            </text>
                                        )
                                    }
                                }}
                            />
                        </Pie>
                        <ChartLegend
                            content={<ChartLegendContent nameKey="category" />}
                            className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                        />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
