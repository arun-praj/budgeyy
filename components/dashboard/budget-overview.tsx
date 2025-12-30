'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Progress } from '@/components/ui/progress';
import { cn, formatCurrency } from '@/lib/utils';
import { DEFAULT_BUDGET_RULE } from '@/types';

interface BudgetCategoryProps {
    label: string;
    spent: number;
    budget: number;
    percentage: number;
    targetPercentage: number;
    color: 'needs' | 'wants' | 'savings';
    delay?: number;
    currency?: string;
}

const colorClasses = {
    needs: {
        text: 'text-blue-500',
        bg: 'bg-blue-500',
        bgLight: 'bg-blue-500/20',
    },
    wants: {
        text: 'text-purple-500',
        bg: 'bg-purple-500',
        bgLight: 'bg-purple-500/20',
    },
    savings: {
        text: 'text-emerald-500',
        bg: 'bg-emerald-500',
        bgLight: 'bg-emerald-500/20',
    },
};

function BudgetCategory({
    label,
    spent,
    budget,
    percentage,
    targetPercentage,
    color,
    delay = 0,
    currency = 'USD',
}: BudgetCategoryProps) {
    const isOver = percentage > targetPercentage;
    const colors = colorClasses[color];

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay }}
            className="space-y-2"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn('h-3 w-3 rounded-full', colors.bg)} />
                    <HoverCard openDelay={0} closeDelay={100}>
                        <HoverCardTrigger asChild>
                            <button className="font-medium cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-4 focus:outline-none text-left">
                                {label}
                            </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 z-50">
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">{targetPercentage}% - {label}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {color === 'needs' && "Essential expenses you can't live without. Includes rent, groceries, utilities, and transport. Aim to keep this under 50% of your income."}
                                    {color === 'wants' && "Discretionary spending for things you enjoy. Includes dining out, entertainment, and hobbies. Try to limit this to 30% of your take-home pay."}
                                    {color === 'savings' && "Financial goals and future security. Includes emergency funds, retirement contributions, and debt repayment. Aim to save at least 20%."}
                                </p>
                                <div className="flex items-center pt-2">
                                    <span className="text-xs text-muted-foreground">Khan Academy Guideline</span>
                                </div>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                    <span className="text-xs text-muted-foreground">({targetPercentage}%)</span>
                </div>
                <div className="text-right">
                    <span className={cn('font-semibold', isOver && 'text-red-500')}>
                        {formatCurrency(spent, currency)}
                    </span>
                    <span className="text-muted-foreground"> / {formatCurrency(budget, currency)}</span>
                </div>
            </div>
            <div className="relative">
                <Progress
                    value={Math.min(percentage, 100)}
                    className={cn('h-3', colors.bgLight)}
                />
                {/* Target marker */}
                <div
                    className="absolute top-0 h-3 w-0.5 bg-foreground/50"
                    style={{ left: `${targetPercentage}%` }}
                />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{percentage.toFixed(1)}% used</span>
                {isOver ? (
                    <span className="text-red-500">
                        {formatCurrency(spent - budget, currency)} over budget
                    </span>
                ) : (
                    <span className="text-green-500">
                        {formatCurrency(budget - spent, currency)} remaining
                    </span>
                )}
            </div>
        </motion.div>
    );
}

interface BudgetOverviewProps {
    income: number;
    needsSpent: number;
    wantsSpent: number;
    savingsAmount: number;
    currency?: string;
}

export function BudgetOverview({
    income,
    needsSpent,
    wantsSpent,
    savingsAmount,
    currency = 'USD',
}: BudgetOverviewProps) {
    // Calculate budgets based on 50/30/20 rule
    const needsBudget = income * (DEFAULT_BUDGET_RULE.needs / 100);
    const wantsBudget = income * (DEFAULT_BUDGET_RULE.wants / 100);
    const savingsBudget = income * (DEFAULT_BUDGET_RULE.savings / 100);

    // Calculate percentages
    const needsPercentage = income > 0 ? (needsSpent / needsBudget) * 100 : 0;
    const wantsPercentage = income > 0 ? (wantsSpent / wantsBudget) * 100 : 0;
    const savingsPercentage = income > 0 ? (savingsAmount / savingsBudget) * 100 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        50/30/20 Budget Rule
                    </CardTitle>
                    <CardDescription>
                        Based on monthly income of {formatCurrency(income, currency)}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <BudgetCategory
                        label="Needs"
                        spent={needsSpent}
                        budget={needsBudget}
                        percentage={needsPercentage}
                        targetPercentage={DEFAULT_BUDGET_RULE.needs}
                        color="needs"
                        delay={0.1}
                        currency={currency}
                    />
                    <BudgetCategory
                        label="Wants"
                        spent={wantsSpent}
                        budget={wantsBudget}
                        percentage={wantsPercentage}
                        targetPercentage={DEFAULT_BUDGET_RULE.wants}
                        color="wants"
                        delay={0.2}
                        currency={currency}
                    />
                    <BudgetCategory
                        label="Savings"
                        spent={savingsAmount}
                        budget={savingsBudget}
                        percentage={savingsPercentage}
                        targetPercentage={DEFAULT_BUDGET_RULE.savings}
                        color="savings"
                        delay={0.3}
                        currency={currency}
                    />

                    {/* Summary */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="pt-4 border-t"
                    >
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-blue-500">
                                    {income > 0 ? ((needsSpent / income) * 100).toFixed(0) : 0}%
                                </p>
                                <p className="text-xs text-muted-foreground">Needs</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-purple-500">
                                    {income > 0 ? ((wantsSpent / income) * 100).toFixed(0) : 0}%
                                </p>
                                <p className="text-xs text-muted-foreground">Wants</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-500">
                                    {income > 0 ? ((savingsAmount / income) * 100).toFixed(0) : 0}%
                                </p>
                                <p className="text-xs text-muted-foreground">Savings</p>
                            </div>
                        </div>
                    </motion.div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
