import { getTransactions, getCategories } from '@/actions/transactions';
import { getUserSettings } from '@/actions/user';
import { TransactionFormSheet } from '@/components/transactions/transaction-form-sheet';
import { TransactionsList } from '@/components/transactions/transactions-list';
import { TransactionFilters } from '@/components/transactions/transaction-filters';
import type { TransactionType } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Transactions - Budgeyy',
    description: 'Manage your income and expenses',
};

interface TransactionsPageProps {
    searchParams: Promise<{
        type?: string;
        categoryId?: string;
    }>;
}

export default async function TransactionsPage(props: TransactionsPageProps) {
    const searchParams = await props.searchParams;
    const { type, categoryId } = searchParams;

    // Cast type string to TransactionType if valid
    const validType = type && ['income', 'expense', 'savings'].includes(type)
        ? type as TransactionType
        : undefined;

    const [transactions, userSettings, categories] = await Promise.all([
        getTransactions({
            categoryId: categoryId === 'all' ? undefined : categoryId,
            type: validType
        }),
        getUserSettings(),
        getCategories(),
    ]);

    const currency = userSettings?.currency || 'USD';
    const calendar = userSettings?.calendarPreference || 'gregorian';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Transactions</h1>
                    <p className="text-muted-foreground">
                        View and manage all your transactions
                    </p>
                </div>
                <TransactionFormSheet calendar={calendar} />
            </div>

            <div className="flex justify-start">
                <TransactionFilters categories={categories} />
            </div>

            <TransactionsList transactions={transactions} currency={currency} calendar={calendar} />
        </div>
    );
}
