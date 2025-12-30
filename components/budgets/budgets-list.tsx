'use client';

import { motion } from 'framer-motion';
import {
    Calendar,
    Trash2,
    RefreshCw,
    PiggyBank,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { deleteBudget } from '@/actions/budgets';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Budget, Category } from '@/db/schema';

interface BudgetWithCategory extends Budget {
    category: Category | null;
}

interface BudgetsListProps {
    budgets: BudgetWithCategory[];
}

export function BudgetsList({ budgets }: BudgetsListProps) {
    const router = useRouter();

    const handleDelete = async (id: string) => {
        const result = await deleteBudget(id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Budget deleted');
            router.refresh();
        }
    };

    if (budgets.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <PiggyBank className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No budgets yet</p>
                    <p className="text-sm text-muted-foreground">
                        Create your first budget to start tracking your spending
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget, index) => {
                const now = new Date();
                const startDate = new Date(budget.startDate);
                const endDate = new Date(budget.endDate);
                const isActive = now >= startDate && now <= endDate;
                const isPast = now > endDate;

                // Calculate progress (mock for now - would be calculated from actual spending)
                const spent = 0; // This would come from transaction aggregation
                const limit = parseFloat(budget.amountLimit);
                const percentage = limit > 0 ? (spent / limit) * 100 : 0;

                return (
                    <motion.div
                        key={budget.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                        <Card className={cn(
                            'group relative overflow-hidden',
                            isPast && 'opacity-60'
                        )}>
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">{budget.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={isActive ? 'default' : 'secondary'}
                                                className={cn(
                                                    isActive && 'bg-green-500/10 text-green-500 border-green-500/20'
                                                )}
                                            >
                                                {isActive ? 'Active' : isPast ? 'Ended' : 'Upcoming'}
                                            </Badge>
                                            {budget.rollover && (
                                                <Badge variant="outline" className="gap-1">
                                                    <RefreshCw className="h-3 w-3" />
                                                    Rollover
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete &quot;{budget.name}&quot;? This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDelete(budget.id)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Amount */}
                                <div>
                                    <div className="flex items-baseline justify-between mb-2">
                                        <span className="text-2xl font-bold">
                                            ${spent.toLocaleString()}
                                        </span>
                                        <span className="text-muted-foreground">
                                            / ${limit.toLocaleString()}
                                        </span>
                                    </div>
                                    <Progress
                                        value={percentage}
                                        className={cn(
                                            'h-2',
                                            percentage > 100 && '[&>div]:bg-red-500'
                                        )}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {percentage.toFixed(0)}% used
                                        {percentage > 100 && ' (over budget!)'}
                                    </p>
                                </div>

                                {/* Date Range */}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                        {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        {' - '}
                                        {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>

                                {/* Period Badge */}
                                <Badge variant="outline" className="capitalize">
                                    {budget.period}
                                </Badge>
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}
