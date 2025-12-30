'use client';

import { motion } from 'framer-motion';
import {
    DollarSign,
    TrendingDown,
    TrendingUp,
    Wallet,
    PiggyBank,
    CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const iconMap = {
    dollarSign: DollarSign,
    trendingDown: TrendingDown,
    trendingUp: TrendingUp,
    wallet: Wallet,
    piggyBank: PiggyBank,
    creditCard: CreditCard,
} as const;

type IconName = keyof typeof iconMap;

interface StatCardProps {
    title: string;
    value: string;
    description?: string;
    iconName: IconName;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
    delay?: number;
}

export function StatCard({
    title,
    value,
    description,
    iconName,
    trend,
    className,
    delay = 0,
}: StatCardProps) {
    const Icon = iconMap[iconName];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
        >
            <Card className={cn('overflow-hidden', className)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                    </CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{value}</div>
                    {(description || trend) && (
                        <div className="flex items-center gap-2 mt-1">
                            {trend && (
                                <span
                                    className={cn(
                                        'text-xs font-medium',
                                        trend.isPositive ? 'text-green-500' : 'text-red-500'
                                    )}
                                >
                                    {trend.isPositive ? '+' : ''}
                                    {trend.value}%
                                </span>
                            )}
                            {description && (
                                <p className="text-xs text-muted-foreground">{description}</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
