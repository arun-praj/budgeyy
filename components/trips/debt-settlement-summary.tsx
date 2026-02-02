'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, Wallet, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotionAvatar } from '@/components/avatars/notion-avatar';

interface DebtSettlementSummaryProps {
    transactions: any[];
    members: { id: string; name: string | null; email: string; image?: string | null; isGuest?: boolean; avatar?: string | null }[];
    currency?: string | null;
}

interface Settlement {
    from: string; // userId
    to: string; // userId
    amount: number;
}

export function DebtSettlementSummary({ transactions, members, currency = 'USD' }: DebtSettlementSummaryProps) {

    // 1. Calculate Balances
    const balances = useMemo(() => {
        const bal: Record<string, number> = {};

        // Initialize 0 for all members
        members.forEach(m => { bal[m.id] = 0; });

        transactions.forEach(t => {
            const amount = parseFloat(t.amount);
            if (isNaN(amount)) return;

            // Handle Payers (Creditors - they PAID, so they are owed positive amount vs the group pot)
            // If multiple payers
            if (t.payers && t.payers.length > 0) {
                t.payers.forEach((p: any) => {
                    const pid = p.userId || p.paidByUserId; // Fallback
                    if (pid) {
                        bal[pid] = (bal[pid] || 0) + parseFloat(p.amount);
                    }
                });
            } else if (t.paidByUserId) {
                // Legacy single payer
                bal[t.paidByUserId] = (bal[t.paidByUserId] || 0) + amount;
            }

            // Handle Splits (Debtors - they CONSUMED, so they owe money to the pot)
            if (t.splits && t.splits.length > 0) {
                t.splits.forEach((s: any) => {
                    if (s.userId) {
                        bal[s.userId] = (bal[s.userId] || 0) - parseFloat(s.amount);
                    }
                });
            } else {
                // Implicit split (e.g. if no splits defined but it's an expense? standard legacy logic usually assumes equal split if missing, but let's stick to explicit splits if available. 
                // If splits are empty in this system, it usually means "Did not split" (Personal expense) or data issue.
                // If "Did not split", then payer pays full and consumer consumes full.
                // If payer == consumer, net effect 0. 
                // If payer != consumer (unlikely for "did not split"), handle accordingly.
                // In our system, "Did not split" usually implies personal expense -> Payer consumed it.
                // So we should verify if we need to deduct. 
                // Actually, if splits array is empty, we generally assume the payer consumes it? 
                // Let's check `itinerary-timeline` logic: 
                // "Case: Did not split... return 'and did not split'" 
                // This implies it's personal. So we should Debit the payer.
                // But wait, if we credit payer (+Amount) and debit payer (-Amount), net is 0. 
                // So ignoring empty splits is correct for personal expenses effectively.
            }
        });

        return bal;
    }, [transactions, members]);

    // 2. Simplify Debts (Greedy Algorithm)
    const settlements = useMemo(() => {
        const debtors: { id: string; amount: number }[] = [];
        const creditors: { id: string; amount: number }[] = [];

        Object.entries(balances).forEach(([id, amount]) => {
            // Fix floating point issues
            const val = Math.round(amount * 100) / 100;
            if (val < -0.01) debtors.push({ id, amount: -val }); // Store positive debt magnitude
            if (val > 0.01) creditors.push({ id, amount: val });
        });

        // Sort by magnitude (optional but helps greedy approach be more stable/optimal usually)
        debtors.sort((a, b) => b.amount - a.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        const result: Settlement[] = [];
        let i = 0; // debtor index
        let j = 0; // creditor index

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];

            const amount = Math.min(debtor.amount, creditor.amount);

            if (amount > 0.01) {
                result.push({
                    from: debtor.id,
                    to: creditor.id,
                    amount: amount
                });
            }

            // Adjust remaining
            debtor.amount -= amount;
            creditor.amount -= amount;

            // Move indices if exhausted
            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        return result;
    }, [balances]);

    if (settlements.length === 0) {
        return null;
    }

    const getMember = (id: string) => members.find(m => m.id === id);

    // Helper to get avatar config safely
    const getAvatarConfig = (avatarJson: string | null | undefined) => {
        if (!avatarJson) return undefined;
        try { return JSON.parse(avatarJson); } catch { return undefined; }
    };

    return (
        <Card className="mb-6 border-blue-200/40 bg-blue-50/10 dark:bg-blue-900/5 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Wallet className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-semibold text-foreground">
                        Settlements
                    </CardTitle>
                    <div className="ml-auto text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-full border">
                        {settlements.length} transfer{settlements.length !== 1 ? 's' : ''} needed
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <div className="space-y-3">
                    {settlements.map((s, idx) => {
                        const fromUser = getMember(s.from);
                        const toUser = getMember(s.to);

                        return (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/50 hover:bg-background transition-colors">
                                <div className="flex items-center gap-3">
                                    {/* From User */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                                                {(fromUser?.avatar || fromUser?.image) ? (
                                                    <div className="h-full w-full bg-muted flex items-center justify-center overflow-hidden bg-white">
                                                        <NotionAvatar className="h-full w-full" config={getAvatarConfig(fromUser.avatar || fromUser.image)} />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <AvatarImage src={fromUser?.image || ''} />
                                                        <AvatarFallback>{fromUser?.name?.[0] || '?'}</AvatarFallback>
                                                    </>
                                                )}
                                            </Avatar>
                                            <div className="absolute -bottom-1 -right-1 bg-red-100 dark:bg-red-900/60 rounded-full p-0.5 border border-background">
                                                <ArrowRight className="h-2.5 w-2.5 text-red-600 dark:text-red-400 -rotate-45" />
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium">
                                            {fromUser?.name || fromUser?.email?.split('@')[0]}
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <div className="flex flex-col items-center px-1">
                                        <div className="text-[10px] text-muted-foreground mb-0.5">pays</div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                                    </div>

                                    {/* To User */}
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-medium text-right">
                                            {toUser?.name || toUser?.email?.split('@')[0]}
                                        </div>
                                        <div className="relative">
                                            <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                                                {(toUser?.avatar || toUser?.image) ? (
                                                    <div className="h-full w-full bg-muted flex items-center justify-center overflow-hidden bg-white">
                                                        <NotionAvatar className="h-full w-full" config={getAvatarConfig(toUser.avatar || toUser.image)} />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <AvatarImage src={toUser?.image || ''} />
                                                        <AvatarFallback>{toUser?.name?.[0] || '?'}</AvatarFallback>
                                                    </>
                                                )}
                                            </Avatar>
                                            <div className="absolute -bottom-1 -left-1 bg-emerald-100 dark:bg-emerald-900/60 rounded-full p-0.5 border border-background">
                                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className="font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap pl-2">
                                    {currency} {s.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
