'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { NotionAvatar } from '@/components/avatars/notion-avatar';
import { AvatarConfig } from '@/components/avatars/notion-avatar/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Types (simplified representations of what we get from getTrip)
// In a real app we might share these types via a separate file or infer them.
interface Member {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
    isGuest?: boolean;
}

interface Split {
    userId?: string | null;
    guestId?: string | null;
    amount: string; // Decimal string from DB
}

interface Payer {
    userId?: string | null;
    guestId?: string | null;
    amount: string;
}

interface Transaction {
    id: string;
    date: Date;
    description: string | null;
    amount: string;
    category?: { name: string; color: string | null; icon: string | null } | null;
    paidByUserId?: string | null;
    paidByGuestId?: string | null;
    paidByUser?: { name: string | null }; // Simplified relation
    paidByGuest?: { email: string };
    splits: Split[];
    payers: Payer[];
}

interface TripExpensesProps {
    transactions: any[]; // Using any to avoid complex nested Drizzle types for now, will cast or structure safely
    members: Member[];
    currency?: string;
}

export function TripExpenses({ transactions, members, currency = 'USD' }: TripExpensesProps) {

    // 1. Math Engineering: Calculate Balances
    const { balances, totalTripCost } = useMemo(() => {
        const balances = new Map<string, { paid: number; share: number; balance: number; member: Member }>();

        // Initialize balances for all members
        members.forEach(m => {
            balances.set(m.email.toLowerCase(), { paid: 0, share: 0, balance: 0, member: m });
        });

        let totalTripCost = 0;

        transactions.forEach(txn => {
            const amount = parseFloat(txn.amount);
            totalTripCost += amount;

            // Process Payers
            // If payers array exists and is not empty, use it. Otherwise fallback to paidByUserId/GuestId
            if (txn.payers && txn.payers.length > 0) {
                txn.payers.forEach((payer: any) => {
                    const payerEmail = payer.user?.email || payer.guest?.email;
                    if (payerEmail) {
                        const entry = balances.get(payerEmail.toLowerCase());
                        if (entry) {
                            entry.paid += parseFloat(payer.amount);
                        }
                    }
                });
            } else {
                // Legacy/Simple fallback
                const payerEmail = txn.paidByUser?.email || txn.paidByGuest?.email;
                if (payerEmail) {
                    const entry = balances.get(payerEmail.toLowerCase());
                    if (entry) {
                        entry.paid += amount;
                    }
                }
            }

            // Process Splits
            txn.splits.forEach((split: any) => {
                const splitEmail = split.user?.email || split.guest?.email;
                if (splitEmail) {
                    const entry = balances.get(splitEmail.toLowerCase());
                    if (entry) {
                        entry.share += parseFloat(split.amount);
                    }
                }
            });
        });

        // Calculate final balance (Paid - Share)
        // Positive = You are owed
        // Negative = You owe
        balances.forEach(b => {
            b.balance = b.paid - b.share;
        });

        return { balances: Array.from(balances.values()), totalTripCost };
    }, [transactions, members]);

    // Format currency helper
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const getAvatarConfig = (avatarJson: string | null): AvatarConfig => {
        if (!avatarJson) return {} as AvatarConfig;
        try { return JSON.parse(avatarJson); } catch { return {} as AvatarConfig; }
    };

    return (
        <div className="space-y-8">
            {/* 1. Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalTripCost)}</div>
                    </CardContent>
                </Card>

                {/* Spending Breakdown */}
                <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Spending Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {balances.map(({ member, paid }) => (
                                <div key={member.id} className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full border bg-muted overflow-hidden shrink-0">
                                        <NotionAvatar config={getAvatarConfig(member.image || null)} className="h-full w-full" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium line-clamp-1">{member.name || member.email}</span>
                                        <span className="text-xs text-muted-foreground">Paid: {formatCurrency(paid)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 2. Balances / "Who owes who" simplified */}
            <Card>
                <CardHeader>
                    <CardTitle>Balances</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {balances.map(({ member, balance }) => (
                            <div key={member.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full border bg-muted overflow-hidden">
                                        <NotionAvatar config={getAvatarConfig(member.image || null)} className="h-full w-full" />
                                    </div>
                                    <span className="font-medium">{member.name || member.email}</span>
                                </div>
                                <div className={cn(
                                    "font-medium",
                                    balance > 0 ? "text-green-600" : balance < 0 ? "text-red-600" : "text-muted-foreground"
                                )}>
                                    {balance === 0 ? "Settled up" : (
                                        balance > 0 ? `gets back ${formatCurrency(balance)}` : `owes ${formatCurrency(Math.abs(balance))}`
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* 3. Detailed Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Paid By</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="text-right">Split</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No transactions yet. Add expenses in your itinerary!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((txn) => {
                                    // Determine payer name
                                    let payerName = "Unknown";
                                    if (txn.payers && txn.payers.length > 0) {
                                        if (txn.payers.length > 1) {
                                            payerName = `${txn.payers.length} people`;
                                        } else {
                                            const p = txn.payers[0];
                                            payerName = p.user?.name || p.guest?.email || 'Unknown';
                                        }
                                    } else {
                                        payerName = txn.paidByUser?.name || txn.paidByGuest?.email || 'Unknown';
                                    }

                                    return (
                                        <TableRow key={txn.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{format(new Date(txn.date), 'MMM d')}</span>
                                                    <span className="text-xs text-muted-foreground">{format(new Date(txn.date), 'yyyy')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium">{txn.description || 'Untitled Expense'}</span>
                                                    {txn.category && (
                                                        <Badge variant="secondary" className="w-fit text-[10px] h-5 px-1.5" style={{
                                                            backgroundColor: txn.category.color ? `${txn.category.color}20` : undefined,
                                                            color: txn.category.color || undefined
                                                        }}>
                                                            {txn.category.icon} {txn.category.name}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {/* We could add avatar here too */}
                                                    <span>{payerName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {formatCurrency(parseFloat(txn.amount))}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                {txn.splits.length === members.length
                                                    ? "Split equally"
                                                    : `${txn.splits.length} people`}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div >
    );
}
