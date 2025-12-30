'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { getTransactions } from '@/actions/transactions';
import { RecentTransactions } from '@/components/transactions/recent-transactions';
import { formatDate } from '@/lib/date-utils';
import { Loader2 } from 'lucide-react';
import type { Transaction, Category } from '@/db/schema';

import type { TransactionWithUserAndCategory } from '@/types';

interface DayTransactionsDialogProps {
    date: Date | null;
    isOpen: boolean;
    onClose: () => void;
    currency?: string;
    calendar?: string;
}

export function DayTransactionsDialog({
    date,
    isOpen,
    onClose,
    currency = 'USD',
    calendar = 'gregorian',
}: DayTransactionsDialogProps) {
    const [transactions, setTransactions] = useState<TransactionWithUserAndCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchTransactions = async () => {
            if (!date || !isOpen) return;

            setIsLoading(true);
            try {
                // Set range for the entire day (00:00:00 to 23:59:59)
                const start = new Date(date);
                start.setHours(0, 0, 0, 0);

                const end = new Date(date);
                end.setHours(23, 59, 59, 999);

                const { data } = await getTransactions({ start, end, limit: 100 });
                setTransactions(data);
            } catch (error) {
                console.error('Failed to fetch transactions for day:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransactions();
    }, [date, isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>
                        {date ? formatDate(date, calendar as any, 'long') : 'Transactions'}
                    </DialogTitle>
                    <DialogDescription>
                        Daily transaction history
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p className="text-sm">Loading transactions...</p>
                        </div>
                    ) : (
                        <RecentTransactions
                            transactions={transactions}
                            currency={currency}
                            calendar={calendar}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
