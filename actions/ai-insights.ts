'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { transactions, aiInsights } from '@/db/schema';
import { and, eq, gte, lte, isNull, desc } from 'drizzle-orm';
import { getMonthRange } from '@/lib/date-utils';
import { generateMonthlyInsight } from '@/lib/gemini';
import { getUserSettings } from '@/actions/user';
import { cacheTag, cacheLife } from 'next/cache';

/**
 * Generates and stores a new insight in the database.
 */
async function generateAndStoreInsight(userId: string, currency: string, calendar: string = 'gregorian') {
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

    let insight = "";

    if (monthlyTransactions.length === 0) {
        insight = "No transactions found for this month yet. Start adding some to see insights!";
    } else {
        // 2. Prepare Data for AI
        const simplifiedData = monthlyTransactions.map(t => ({
            date: t.date.toISOString().split('T')[0],
            amount: parseFloat(t.amount),
            category: t.category?.name || 'Uncategorized',
            type: t.type,
            description: t.description || ''
        }));

        // 3. Call Gemini
        insight = await generateMonthlyInsight(simplifiedData, currency);
    }

    // 4. Store in DB
    try {
        await db.insert(aiInsights).values({
            userId,
            insight,
            type: 'monthly_summary',
        });
    } catch (e) {
        console.error('Failed to store AI insight in DB:', e);
    }

    return insight;
}

export async function getMonthlyInsight() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    const userId = session.user.id;

    try {
        // 1. Check if we already have an insight for today in the DB
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const existingInsight = await db.query.aiInsights.findFirst({
            where: and(
                eq(aiInsights.userId, userId),
                eq(aiInsights.type, 'monthly_summary'),
                gte(aiInsights.createdAt, startOfToday)
            ),
            orderBy: [desc(aiInsights.createdAt)]
        });

        if (existingInsight) {
            return { insight: existingInsight.insight };
        }

        // 2. If not found, get User Settings and generate new one
        const userSettings = await getUserSettings();
        const currency = userSettings?.currency || 'USD';
        const calendar = userSettings?.calendarPreference || 'gregorian';

        const insight = await generateAndStoreInsight(userId, currency, calendar);

        return { insight };
    } catch (error) {
        console.error('Failed to get monthly insight:', error);
        return { error: 'Failed to generate insight.' };
    }
}
