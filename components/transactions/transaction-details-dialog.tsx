'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';
import type { TransactionWithUserAndCategory, CalendarPreference } from '@/types';
import { ArrowDownLeft, ArrowUpRight, CalendarIcon, Clock, Edit2, User } from 'lucide-react';
import dynamic from 'next/dynamic';

const NotionAvatar = dynamic(() => import('react-notion-avatar').then(mod => mod.default), {
    ssr: false,
    loading: () => <User className="h-6 w-6" />
});

interface TransactionDetailsDialogProps {
    transaction: TransactionWithUserAndCategory | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit: (transaction: TransactionWithUserAndCategory) => void;
    currency?: string;
    calendar?: CalendarPreference | string | null;
}

const necessityColors = {
    needs: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    wants: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    savings: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

export function TransactionDetailsDialog({
    transaction,
    open,
    onOpenChange,
    onEdit,
    currency = 'USD',
    calendar = 'gregorian',
}: TransactionDetailsDialogProps) {
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // Reset zoomed image when dialog closes
    if (!open && zoomedImage) {
        setZoomedImage(null);
    }

    if (!transaction) return null;

    const avatarData = transaction.user?.avatar ? JSON.parse(transaction.user.avatar) : null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between pb-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(transaction)}
                                className="gap-2"
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit
                            </Button>
                            <DialogTitle className="sr-only">Transaction Details</DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="space-y-8">
                        {/* Amount Section */}
                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                            <div className={cn(
                                "flex items-center justify-center p-4 rounded-full bg-opacity-10",
                                transaction.type === 'income' ? "bg-green-500 text-green-500" :
                                    transaction.type === 'savings' ? "bg-blue-500 text-blue-500" :
                                        "bg-red-500 text-red-500"
                            )}>
                                {transaction.type === 'income' ? <ArrowUpRight className="h-8 w-8" /> :
                                    transaction.type === 'savings' ? <div className="h-8 w-8 rounded-full bg-current" /> :
                                        <ArrowDownLeft className="h-8 w-8" />}
                            </div>
                            <h2 className={cn(
                                "text-4xl font-bold",
                                transaction.type === 'income' ? "text-green-500" :
                                    transaction.type === 'savings' ? "text-blue-500" :
                                        "text-red-500"
                            )}>
                                {transaction.type === 'income' ? '+' : transaction.type === 'savings' ? '' : '-'}
                                {formatCurrency(parseFloat(transaction.amount), currency)}
                            </h2>
                            <p className="text-muted-foreground text-center text-lg font-medium">
                                {transaction.description || "Untitled Transaction"}
                                {transaction.isRecurring && (
                                    <Badge variant="secondary" className="ml-2 align-middle">
                                        Recurring
                                    </Badge>
                                )}
                            </p>
                        </div>

                        {/* Meta Grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs uppercase tracking-wider">Date</span>
                                <div className="flex items-center gap-2 font-medium">
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    {formatDate(transaction.date, calendar as any || 'gregorian')}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs uppercase tracking-wider">Category</span>
                                <div className="flex items-center gap-2 font-medium">
                                    <span className="text-lg leading-none">{transaction.category?.icon || '📂'}</span>
                                    {transaction.category?.name || 'Uncategorized'}
                                </div>
                            </div>
                            {transaction.necessityLevel && (
                                <div className="space-y-1">
                                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Necessity</span>
                                    <div>
                                        <Badge variant="outline" className={cn("capitalize", necessityColors[transaction.necessityLevel])}>
                                            {transaction.necessityLevel}
                                        </Badge>
                                    </div>
                                </div>
                            )}
                            {transaction.isCredit && (
                                <div className="space-y-1">
                                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Payment Method</span>
                                    <div>
                                        <Badge variant="secondary">Credit Card</Badge>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Images */}
                        {(transaction.receiptUrl || transaction.productImageUrl) && (
                            <div className="space-y-2">
                                <span className="text-muted-foreground text-xs uppercase tracking-wider block">Attachments</span>
                                <div className="grid grid-cols-2 gap-4">
                                    {transaction.productImageUrl && (
                                        <div
                                            className="relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-zoom-in hover:opacity-90 transition-opacity"
                                            onClick={() => setZoomedImage(transaction.productImageUrl)}
                                        >
                                            <img
                                                src={transaction.productImageUrl}
                                                alt="Product"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                Product
                                            </div>
                                        </div>
                                    )}
                                    {transaction.receiptUrl && (
                                        <div
                                            className="relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-zoom-in hover:opacity-90 transition-opacity"
                                            onClick={() => setZoomedImage(transaction.receiptUrl)}
                                        >
                                            <img
                                                src={transaction.receiptUrl}
                                                alt="Receipt"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                Receipt
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Metadata Footer */}
                        <div className="border-t pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full overflow-hidden border border-border/50 bg-muted">
                                        {avatarData ? (
                                            <NotionAvatar config={avatarData} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                                                <User className="h-5 w-5" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Added by</span>
                                        <span className="font-medium text-sm">{transaction.user?.name || transaction.user?.fullName || 'Unknown User'}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-3 w-3" />
                                        Created {new Date(transaction.createdAt).toLocaleDateString()}
                                    </div>
                                    {/* Show updated if different from created (ignoring seconds) */}
                                    {Math.abs(new Date(transaction.updatedAt).getTime() - new Date(transaction.createdAt).getTime()) > 60000 && (
                                        <div>
                                            Updated {new Date(transaction.updatedAt).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Lightbox Dialog using same Dialog component but different content style */}
            <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none text-white">
                    <DialogTitle className="sr-only">Zoomed Image</DialogTitle>
                    <DialogDescription className="sr-only">Full size view of the attached image</DialogDescription>
                    {zoomedImage && (
                        <div className="relative w-full h-full flex flex-col items-center justify-center" onClick={() => setZoomedImage(null)}>
                            <img
                                src={zoomedImage}
                                alt="Zoomed View"
                                className="w-auto h-auto max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            />
                            <p className="mt-2 text-sm text-white/70 bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
                                Click anywhere to close
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
