'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { transactions, categories } from '@/db/schema';
import { and, eq, gte, lte, isNull, desc } from 'drizzle-orm';
import { getMonthRange } from '@/lib/date-utils';
import { generateMonthlyInsight } from '@/lib/gemini';
import { getUserSettings } from '@/actions/user';

export async function getMonthlyInsight() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        // 1. Get User Settings (for currency/calendar)
        const userSettings = await getUserSettings();
        const currency = userSettings?.currency || 'USD';
        const calendar = userSettings?.calendarPreference || 'gregorian';

        // 2. Get Current Month Transactions
        const { start, end } = getMonthRange(new Date(), calendar);

        const monthlyTransactions = await db.query.transactions.findMany({
            where: and(
                eq(transactions.userId, session.user.id),
                eq(transactions.isDeleted, false),
                isNull(transactions.tripId),
                gte(transactions.date, start),
                lte(transactions.date, end)
            ),
            with: {
                category: true,
            },
            orderBy: [desc(transactions.date)],
            limit: 100 // Limit to last 100 for token efficiency
        });

        if (monthlyTransactions.length === 0) {
            return { insight: "No transactions found for this month yet. Start adding some to see insights!" };
        }

        // 3. Prepare Data for AI
        // Minimize payload: Date, Amount, Category Name, Type, Description
        const simplifiedData = monthlyTransactions.map(t => ({
            date: t.date.toISOString().split('T')[0],
            amount: parseFloat(t.amount),
            category: t.category?.name || 'Uncategorized',
            type: t.type,
            description: t.description || ''
        }));

        // 4. Call Gemini
        const insight = await generateMonthlyInsight(simplifiedData, currency);

        return { insight };
    } catch (error) {
        console.error('Failed to get monthly insight:', error);
        return { error: 'Failed to generate insight.' };
    }
}
