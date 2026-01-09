'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { and, eq, gte, lte, isNull, desc } from 'drizzle-orm';
import { getMonthRange } from '@/lib/date-utils';
import { generateMonthlyInsight } from '@/lib/gemini';
import { getUserSettings } from '@/actions/user';
import { cacheTag, cacheLife } from 'next/cache';

/**
 * Cached function to fetch data and generate insight.
 * Using 'use cache' to cache the result based on arguments (userId, currency, calendar).
 */
async function generateUserMonthlyInsight(userId: string, currency: string, calendar: string = 'gregorian') {
    'use cache';
    cacheTag(`insights-${userId}`);
    cacheLife('hours'); // Keep fresh for hours, revalidate if needed

    // 1. Get Current Month Transactions
    const { start, end } = getMonthRange(new Date(), calendar as any);

    const monthlyTransactions = await db.query.transactions.findMany({
        where: and(
            eq(transactions.userId, userId),
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
        return "No transactions found for this month yet. Start adding some to see insights!";
    }

    // 2. Prepare Data for AI
    const simplifiedData = monthlyTransactions.map(t => ({
        date: t.date.toISOString().split('T')[0],
        amount: parseFloat(t.amount),
        category: t.category?.name || 'Uncategorized',
        type: t.type,
        description: t.description || ''
    }));

    // 3. Call Gemini
    return await generateMonthlyInsight(simplifiedData, currency);
}

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

        // 2. Call cached function
        const insight = await generateUserMonthlyInsight(session.user.id, currency, calendar);

        return { insight };
    } catch (error) {
        console.error('Failed to get monthly insight:', error);
        return { error: 'Failed to generate insight.' };
    }
}
