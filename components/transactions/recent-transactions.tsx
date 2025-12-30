'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Repeat, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';
import type { TransactionWithUserAndCategory } from '@/types';
import { TransactionFormSheet } from './transaction-form-sheet';
import { TransactionDetailsDialog } from './transaction-details-dialog';

interface RecentTransactionsProps {
    transactions: TransactionWithUserAndCategory[];
    currency?: string;
    calendar?: string;
}

const necessityColors = {
    needs: 'bg-blue-500/10 text-blue-500',
    wants: 'bg-purple-500/10 text-purple-500',
    savings: 'bg-emerald-500/10 text-emerald-500',
};

export function RecentTransactions({ transactions, currency = 'USD', calendar = 'gregorian' }: RecentTransactionsProps) {
    const [editingTransaction, setEditingTransaction] = useState<TransactionWithUserAndCategory | null>(null);
    const [viewingTransaction, setViewingTransaction] = useState<TransactionWithUserAndCategory | null>(null);

    if (transactions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-muted-foreground">No transactions yet</p>
                        <p className="text-sm text-muted-foreground">
                            Add your first transaction to get started
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
        >
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Transactions</CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/transactions">
                            View all
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {transactions.map((transaction, index) => (
                            <motion.div
                                key={transaction.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                onClick={() => setViewingTransaction(transaction)}
                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                            >
                                <div
                                    className={cn(
                                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                                        transaction.type === 'income'
                                            ? 'bg-green-500/10'
                                            : transaction.type === 'savings'
                                                ? 'bg-blue-500/10'
                                                : 'bg-red-500/10'
                                    )}
                                >
                                    {transaction.type === 'income' ? (
                                        <ArrowUpRight className="h-5 w-5 text-green-500" />
                                    ) : transaction.type === 'savings' ? (
                                        <div className="h-5 w-5 rounded-full bg-blue-500" />
                                    ) : (
                                        <ArrowDownLeft className="h-5 w-5 text-red-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col gap-1">
                                        <p className="font-medium text-sm sm:text-base break-words leading-tight">
                                            {transaction.description ||
                                                (transaction.type === 'income' ? 'Income' :
                                                    transaction.type === 'savings' ? 'Savings' : 'Expense')}
                                        </p>
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
                                            </div>
                                            <p
                                                className={cn(
                                                    'font-semibold whitespace-nowrap text-base sm:text-lg',
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
                        ))}
                    </div>
                </CardContent >
            </Card >

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
        </motion.div >
    );
}
