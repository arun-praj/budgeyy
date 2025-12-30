import { getBudgets } from '@/actions/budgets';
import { BudgetsList } from '@/components/budgets/budgets-list';
import { BudgetFormDialog } from '@/components/budgets/budget-form-dialog';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Budgets - Budgeyy',
    description: 'Manage your budgets',
};

export default async function BudgetsPage() {
    const budgets = await getBudgets();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Budgets</h1>
                    <p className="text-muted-foreground">
                        Set spending limits and track your budgets
                    </p>
                </div>
                <BudgetFormDialog />
            </div>

            <BudgetsList budgets={budgets} />
        </div>
    );
}
