'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Repeat,
    Trash2,
    Filter,
    Search,
    CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { cn, formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';
import { deleteTransaction } from '@/actions/transactions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { TransactionWithUserAndCategory } from '@/types';
import { TransactionDetailsDialog } from './transaction-details-dialog';
import { TransactionFormSheet } from './transaction-form-sheet';

interface TransactionsListProps {
    transactions: TransactionWithUserAndCategory[];
    currency?: string;
    calendar?: string;
}

const necessityColors = {
    needs: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    wants: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    savings: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

export function TransactionsList({ transactions, currency = 'USD', calendar = 'gregorian' }: TransactionsListProps) {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [necessityFilter, setNecessityFilter] = useState<string>('all');
    const [editingTransaction, setEditingTransaction] = useState<TransactionWithUserAndCategory | null>(null);
    const [viewingTransaction, setViewingTransaction] = useState<TransactionWithUserAndCategory | null>(null);

    const filteredTransactions = transactions.filter((tx) => {
        const matchesSearch = tx.description?.toLowerCase().includes(search.toLowerCase()) ?? true;
        const matchesType = typeFilter === 'all' || tx.type === typeFilter;
        const matchesNecessity = necessityFilter === 'all' || tx.necessityLevel === necessityFilter;
        return matchesSearch && matchesType && matchesNecessity;
    });

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent opening the edit sheet
        const result = await deleteTransaction(id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Transaction deleted');
            router.refresh();
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>All Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search transactions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex flex-row gap-3 w-full sm:w-auto">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="flex-1 sm:w-[150px]">
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={necessityFilter} onValueChange={setNecessityFilter}>
                            <SelectTrigger className="flex-1 sm:w-[150px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="needs">Needs</SelectItem>
                                <SelectItem value="wants">Wants</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Transactions List */}
                <div className="space-y-2">
                    <AnimatePresence>
                        {filteredTransactions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No transactions found
                            </div>
                        ) : (
                            filteredTransactions.map((transaction, index) => (
                                <motion.div
                                    key={transaction.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2, delay: index * 0.02 }}
                                    onClick={() => setViewingTransaction(transaction)}
                                    className="flex items-start justify-between gap-3 p-4 rounded-lg border hover:bg-muted/30 transition-colors group cursor-pointer"
                                >

                                    <div
                                        className={cn(
                                            'flex h-10 w-10 items-center justify-center rounded-full shrink-0',
                                            transaction.type === 'income'
                                                ? 'bg-green-500/10'
                                                : transaction.type === 'savings'
                                                    ? 'bg-blue-500/10'
                                                    : 'bg-red-500/10'
                                        )}
                                    >
                                        {transaction.category?.icon ? (
                                            <span className="text-xl leading-none">
                                                {transaction.category.icon}
                                            </span>
                                        ) : transaction.type === 'income' ? (
                                            <ArrowUpRight className="h-5 w-5 text-green-500" />
                                        ) : transaction.type === 'savings' ? (
                                            <div className="h-5 w-5 rounded-full bg-blue-500" />
                                        ) : (
                                            <ArrowDownLeft className="h-5 w-5 text-red-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-medium text-sm sm:text-base break-words leading-tight">
                                                    {transaction.description ||
                                                        (transaction.type === 'income' ? 'Income' :
                                                            transaction.type === 'savings' ? 'Savings' : 'Expense')}
                                                </p>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="h-6 w-6 -mt-1 -mr-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete this transaction? This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={(e) => handleDelete(e as any, transaction.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>

                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-xs text-muted-foreground shrink-0">
                                                        {formatDate(transaction.date, calendar as any, 'medium')}
                                                    </p>
                                                    {transaction.category?.name && (
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-normal shrink-0">
                                                            {transaction.category.name}
                                                        </Badge>
                                                    )}
                                                    {transaction.isRecurring && (
                                                        <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />
                                                    )}
                                                    {transaction.necessityLevel && (
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                'text-[10px] px-1.5 h-5 capitalize shrink-0',
                                                                necessityColors[transaction.necessityLevel]
                                                            )}
                                                        >
                                                            {transaction.necessityLevel}
                                                        </Badge>
                                                    )}
                                                    {transaction.isCredit && (
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5 gap-1 shrink-0 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-200">
                                                            <CreditCard className="w-3 h-3" />
                                                            Credit
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p
                                                    className={cn(
                                                        'font-semibold text-base sm:text-lg whitespace-nowrap',
                                                        transaction.type === 'income'
                                                            ? 'text-green-500'
                                                            : transaction.type === 'savings'
                                                                ? 'text-blue-500'
                                                                : 'text-red-500'
                                                    )}
                                                >
                                                    {transaction.type === 'income' ? '+' : transaction.type === 'savings' ? '=' : '-'}
                                                    {formatCurrency(parseFloat(transaction.amount), currency)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>


                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>

            <TransactionDetailsDialog
                transaction={viewingTransaction}
                open={!!viewingTransaction}
                onOpenChange={(open) => !open && setViewingTransaction(null)}
                onEdit={(tx) => {
                    setViewingTransaction(null);
                    setEditingTransaction(tx);
                }}
                currency={currency}
                calendar={calendar}
            />

            <TransactionFormSheet
                transaction={editingTransaction}
                open={!!editingTransaction}
                onOpenChange={(open) => !open && setEditingTransaction(null)}
                calendar={calendar}
            />
        </Card>
    );
}
