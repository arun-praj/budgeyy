'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, RefreshCcw, Trash2, PiggyBank, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { restoreTransaction, permanentDeleteTransaction } from '@/actions/transactions';
import { getDeletedTransactions } from '@/actions/transactions';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";

interface DeletedTransactionsListProps {
    initialData: Awaited<ReturnType<typeof getDeletedTransactions>>;
    currency: string;
}

export function DeletedTransactionsList({ initialData, currency }: DeletedTransactionsListProps) {
    const [transactions, setTransactions] = useState(initialData);
    const [isPending, startTransition] = useTransition();

    const handleRestore = async (id: string) => {
        startTransition(async () => {
            const result = await restoreTransaction(id);
            if (result.success) {
                setTransactions((prev) => prev.filter((t) => t.id !== id));
                toast.success("Transaction restored", {
                    description: "The transaction has been moved back to your active list.",
                });
            } else {
                toast.error("Error", {
                    description: "Failed to restore transaction. Please try again.",
                });
            }
        });
    };

    const handleDeleteForever = async (id: string) => {
        startTransition(async () => {
            const result = await permanentDeleteTransaction(id);
            if (result.success) {
                setTransactions((prev) => prev.filter((t) => t.id !== id));
                toast.success("Transaction deleted forever", {
                    description: "This action cannot be undone.",
                });
            } else {
                toast.error("Error", {
                    description: "Failed to permanently delete transaction.",
                });
            }
        });
    };

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-card/50">
                <Trash2 className="h-10 w-10 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">No deleted transactions</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    Transactions deleted within the last 30 days will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((transaction) => {
                        const isIncome = transaction.type === 'income';
                        const isSavings = transaction.type === 'savings';
                        const amount = parseFloat(transaction.amount);

                        return (
                            <TableRow key={transaction.id}>
                                <TableCell className="whitespace-nowrap text-muted-foreground">
                                    <div className="flex flex-col">
                                        <span>{format(new Date(transaction.date), 'MMM d, yyyy')}</span>
                                        <span className="text-xs text-muted-foreground/50">
                                            Deleted: {transaction.deletedAt ? format(new Date(transaction.deletedAt), 'MMM d') : '-'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-full ${isIncome ? 'bg-emerald-500/10 text-emerald-500' :
                                            isSavings ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-rose-500/10 text-rose-500'
                                            }`}>
                                            {isIncome ? <ArrowUpRight className="h-4 w-4" /> :
                                                isSavings ? <PiggyBank className="h-4 w-4" /> :
                                                    <ArrowDownRight className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <p className="font-medium">{transaction.description || "Untitled"}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{transaction.category?.name || "Uncategorized"}</span>
                                                {transaction.isCredit && (
                                                    <Badge variant="outline" className="h-5 px-1 gap-1 text-[10px] font-normal">
                                                        <CreditCard className="h-3 w-3" />
                                                        Credit
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className={`font-medium ${isIncome ? 'text-emerald-500' :
                                        isSavings ? 'text-blue-500' :
                                            'text-rose-500'
                                        }`}>
                                        {isIncome || isSavings ? '+' : '-'}{currency} {amount.toFixed(2)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRestore(transaction.id)}
                                            disabled={isPending}
                                        >
                                            <RefreshCcw className="h-4 w-4 mr-1" />
                                            Restore
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    disabled={isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete forever?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. The transaction will be permanently removed from our servers.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDeleteForever(transaction.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Delete Forever
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
