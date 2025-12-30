import { getBudgets } from '@/actions/budgets';
import { BudgetsList } from '@/components/budgets/budgets-list';
import { BudgetFormDialog } from '@/components/budgets/budget-form-dialog';


export const metadata = {
    title: 'Budgets - Budgeyy',
    description: 'Manage your budgets',
};

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function BudgetsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Budgets</h1>
                    <p className="text-muted-foreground">
                        Set spending limits and track your budgets
                    </p>
                </div>
                <Suspense fallback={<div className="h-10 w-32 bg-muted animate-pulse rounded-md" />}>
                    <BudgetFormDialog />
                </Suspense>
            </div>

            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <BudgetsContent />
            </Suspense>
        </div>
    );
}

async function BudgetsContent() {
    const budgets = await getBudgets();
    return <BudgetsList budgets={budgets} />;
}
