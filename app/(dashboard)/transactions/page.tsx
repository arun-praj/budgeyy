import { getTransactions, getCategories } from '@/actions/transactions';
import { getUserSettings } from '@/actions/user';
import { TransactionFormSheet } from '@/components/transactions/transaction-form-sheet';
import { TransactionsList } from '@/components/transactions/transactions-list';
import { TransactionFilters } from '@/components/transactions/transaction-filters';
import type { TransactionType } from '@/types';


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

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function TransactionsPage(props: TransactionsPageProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Transactions</h1>
                    <p className="text-muted-foreground">
                        View and manage all your transactions
                    </p>
                </div>
                {/* We need calendar pref for form, but it's loaded async. 
                    We can either suspend the form or pass null initially/handle undefined in form. 
                    The form is client interactive. 
                    Let's wrap the form in a separate Suspense or include it in content.
                    Ideally, header shell is static. Form button needs calendar.
                    Strategies:
                    1. Fetch lightweight settings separately?
                    2. Let form be inside suspended content?
                    3. Suspense just the form button?
                    Let's put the whole list content in Suspense. The header form might need to wait or use default.
                    The TransactionFormSheet takes 'calendar'.
                    Let's move everything that depends on data into TransactionsContent.
                */}
                <Suspense fallback={<div className="h-10 w-32 bg-muted animate-pulse rounded-md" />}>
                    <TransactionsHeaderButton />
                </Suspense>
            </div>

            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <TransactionsContent searchParams={props.searchParams} />
            </Suspense>
        </div>
    );
}

async function TransactionsHeaderButton() {
    const userSettings = await getUserSettings();
    const calendar = userSettings?.calendarPreference || 'gregorian';
    return <TransactionFormSheet calendar={calendar} />;
}

async function TransactionsContent({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await searchParams;
    const type = typeof params.type === 'string' ? params.type : undefined;
    const categoryId = typeof params.categoryId === 'string' ? params.categoryId : undefined;

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
        <>
            <div className="flex justify-start">
                <TransactionFilters categories={categories} />
            </div>

            <TransactionsList transactions={transactions} currency={currency} calendar={calendar} />
        </>
    );
}
