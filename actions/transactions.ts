'use server';

import { db } from '@/db';
import { transactions, categories } from '@/db/schema';
import { eq, and, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath, revalidateTag, cacheTag, cacheLife } from 'next/cache';
import { getCurrentMonthRange } from '@/lib/date-utils';
import type { NecessityLevel, TransactionType } from '@/types';

// Helper for consistency
const getUserTxTag = (userId: string) => `user-${userId}-transactions`;

export interface CreateTransactionData {
    amount: number;
    date: string;
    description?: string;
    type: TransactionType;
    categoryId?: string;
    isRecurring?: boolean;
    necessityLevel?: NecessityLevel;
    isCredit?: boolean;
    receiptUrl?: string;
    productImageUrl?: string;
    tripId?: string;
    tripItineraryId?: string;
}

export async function createTransaction(data: CreateTransactionData) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        const [transaction] = await db
            .insert(transactions)
            .values({
                ...data,
                amount: data.amount.toString(),
                date: new Date(data.date),
                isCredit: data.isCredit || false,
                receiptUrl: data.receiptUrl,
                productImageUrl: data.productImageUrl,
                tripId: data.tripId,
                tripItineraryId: data.tripItineraryId,
                userId: session.user.id,
            })
            .returning();

        revalidateTag(getUserTxTag(session.user.id), 'max');
        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        return { success: true, data: transaction };
    } catch (error) {
        console.error('Failed to create transaction:', error);
        return { error: 'Failed to create transaction' };
    }
}

export async function updateTransaction(id: string, data: CreateTransactionData) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        const [transaction] = await db
            .update(transactions)
            .set({
                ...data,
                amount: data.amount.toString(),
                date: new Date(data.date),
                isCredit: data.isCredit || false,
                receiptUrl: data.receiptUrl,
                productImageUrl: data.productImageUrl,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(transactions.id, id),
                    eq(transactions.userId, session.user.id)
                )
            )
            .returning();

        if (!transaction) {
            return { error: 'Transaction not found or unauthorized' };
        }

        revalidateTag(getUserTxTag(session.user.id), 'max');
        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        return { success: true, data: transaction };
    } catch (error) {
        console.error('Failed to update transaction:', error);
        return { error: 'Failed to update transaction' };
    }
}

// --- Cached Internal Functions ---

interface CachedTransactionsOptions {
    userId: string;
    page: number;
    pageSize: number;
    startStr?: string; // ISO Date String
    endStr?: string;   // ISO Date String
    categoryId?: string;
    type?: TransactionType;
    search?: string;
    necessityLevel?: NecessityLevel;
}

async function getCachedTransactionsInternal({ userId, page, pageSize, startStr, endStr, categoryId, type, search, necessityLevel }: CachedTransactionsOptions) {
    'use cache';
    cacheTag(getUserTxTag(userId));
    cacheLife('minutes');

    const offset = (page - 1) * pageSize;
    const start = startStr ? new Date(startStr) : undefined;
    const end = endStr ? new Date(endStr) : undefined;

    const conditions = [
        eq(transactions.userId, userId),
        eq(transactions.isDeleted, false),
        isNull(transactions.tripId)
    ];
    if (start) conditions.push(gte(transactions.date, start));
    if (end) conditions.push(lte(transactions.date, end));
    if (categoryId && categoryId !== 'all') conditions.push(eq(transactions.categoryId, categoryId));
    if (type && type !== 'all' as any) conditions.push(eq(transactions.type, type));

    if (search) conditions.push(sql`LOWER(${transactions.description}) LIKE ${'%' + search.toLowerCase() + '%'}`);
    if (necessityLevel && necessityLevel !== 'all' as any) conditions.push(eq(transactions.necessityLevel, necessityLevel));

    const data = await db.query.transactions.findMany({
        where: and(...conditions),
        with: {
            category: true,
            user: true,
        },
        orderBy: [desc(transactions.date)],
        limit: pageSize,
        offset: offset,
    });

    const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(transactions)
        .where(and(...conditions));

    const totalCount = Number(countResult?.count || 0);

    return { data, totalCount };
}

export async function getTransactions(options: {
    page?: number;
    pageSize?: number;
    limit?: number;
    start?: Date;
    end?: Date;
    categoryId?: string;
    type?: TransactionType;
    search?: string;
    necessityLevel?: NecessityLevel;
} = {}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { data: [], totalCount: 0 };
    }

    const page = options.page || 1;
    const pageSize = options.limit || options.pageSize || 20;

    return await getCachedTransactionsInternal({
        userId: session.user.id,
        page,
        pageSize,
        startStr: options.start?.toISOString(),
        endStr: options.end?.toISOString(),
        categoryId: options.categoryId,
        type: options.type,
        search: options.search,
        necessityLevel: options.necessityLevel
    });
}

// --- Dashboard Stats ---

async function getCachedDashboardStatsInternal(userId: string, startStr: string, endStr: string) {
    'use cache';
    cacheTag(getUserTxTag(userId));
    cacheLife('minutes');

    const start = new Date(startStr);
    const end = new Date(endStr);

    const rangeTransactions = await db.query.transactions.findMany({
        where: and(
            eq(transactions.userId, userId),
            eq(transactions.isDeleted, false),
            isNull(transactions.tripId),
            gte(transactions.date, start),
            lte(transactions.date, end)
        ),
    });

    const stats = {
        totalIncome: 0,
        totalExpenses: 0,
        needsSpent: 0,
        wantsSpent: 0,
        savingsAmount: 0,
    };

    for (const tx of rangeTransactions) {
        const amount = parseFloat(tx.amount);

        if (tx.type === 'income') {
            stats.totalIncome += amount;
        } else if (tx.type === 'savings') {
            stats.savingsAmount += amount;
        } else {
            if (!tx.isCredit) {
                stats.totalExpenses += amount;
                switch (tx.necessityLevel) {
                    case 'needs':
                        stats.needsSpent += amount;
                        break;
                    case 'wants':
                        stats.wantsSpent += amount;
                        break;
                    case 'savings':
                        break;
                }
            }
        }
    }

    return stats;
}

export async function getDashboardStats({ start, end }: { start: Date; end: Date }) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return {
            totalIncome: 0,
            totalExpenses: 0,
            needsSpent: 0,
            wantsSpent: 0,
            savingsAmount: 0,
        };
    }

    return await getCachedDashboardStatsInternal(session.user.id, start.toISOString(), end.toISOString());
}

export async function deleteTransaction(id: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        await db
            .update(transactions)
            .set({
                isDeleted: true,
                deletedAt: new Date(),
            })
            .where(
                and(
                    eq(transactions.id, id),
                    eq(transactions.userId, session.user.id)
                )
            );

        revalidateTag(getUserTxTag(session.user.id), 'max');
        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete transaction:', error);
        return { error: 'Failed to delete transaction' };
    }
}

export async function createCategory(data: { name: string; type: TransactionType; icon?: string }) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        const [category] = await db
            .insert(categories)
            .values({
                name: data.name,
                type: data.type,
                icon: data.icon,
                userId: session.user.id,
                isDefault: false,
            })
            .returning();

        revalidatePath('/categories');
        return { success: true, data: category };
    } catch (error) {
        console.error('Failed to create category:', error);
        return { error: 'Failed to create category' };
    }
}

export async function updateCategory(id: string, data: { name: string; type: TransactionType; icon?: string }) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        const [updated] = await db
            .update(categories)
            .set({
                name: data.name,
                type: data.type,
                icon: data.icon,
            })
            .where(
                and(
                    eq(categories.id, id),
                    eq(categories.userId, session.user.id)
                )
            )
            .returning();

        if (!updated) {
            return { error: 'Category not found or unauthorized' };
        }

        revalidatePath('/categories');
        return { success: true, data: updated };
    } catch (error) {
        console.error('Failed to update category:', error);
        return { error: 'Failed to update category' };
    }
}

export async function deleteCategory(id: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        const [deleted] = await db
            .delete(categories)
            .where(
                and(
                    eq(categories.id, id),
                    eq(categories.userId, session.user.id)
                )
            )
            .returning();

        if (!deleted) {
            return { error: 'Category not found or unauthorized' };
        }

        revalidatePath('/categories');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete category:', error);
        return { error: 'Failed to delete category' };
    }
}

export async function getCategories(type?: TransactionType) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return [];
    }

    const conditions = [
        sql`(${categories.isDefault} = true OR ${categories.userId} = ${session.user.id})`
    ];

    if (type) {
        conditions.push(eq(categories.type, type));
    }

    const result = await db.query.categories.findMany({
        where: and(...conditions),
        orderBy: [categories.name],
    });

    return result;
}

// --- Cached Calendar Stats ---

async function getCachedCalendarStatsInternal(userId: string, startStr: string, endStr: string) {
    'use cache';
    cacheTag(getUserTxTag(userId));
    cacheLife('minutes');

    const start = new Date(startStr);
    const end = new Date(endStr);

    const rangeTransactions = await db.query.transactions.findMany({
        where: and(
            eq(transactions.userId, userId),
            eq(transactions.isDeleted, false),
            isNull(transactions.tripId),
            gte(transactions.date, start),
            lte(transactions.date, end)
        ),
    });

    const dailyStats: Record<string, {
        income: number;
        expense: number;
        savings: number;
        incomeCount: number;
        expenseCount: number;
        savingsCount: number
    }> = {};

    for (const tx of rangeTransactions) {
        const dateKey = tx.date.toISOString().split('T')[0];
        if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = {
                income: 0,
                expense: 0,
                savings: 0,
                incomeCount: 0,
                expenseCount: 0,
                savingsCount: 0
            };
        }

        const amount = parseFloat(tx.amount);
        if (tx.type === 'income') {
            dailyStats[dateKey].income += amount;
            dailyStats[dateKey].incomeCount += 1;
        } else if (tx.type === 'savings') {
            dailyStats[dateKey].savings += amount;
            dailyStats[dateKey].savingsCount += 1;
        } else {
            dailyStats[dateKey].expense += amount;
            dailyStats[dateKey].expenseCount += 1;
        }
    }

    return Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats,
    }));
}

export async function getCalendarStats(start: Date, end: Date) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return [];
    }

    return await getCachedCalendarStatsInternal(session.user.id, start.toISOString(), end.toISOString());
}

// --- Cached Budget Report Data ---

async function getCachedBudgetReportDataInternal(userId: string, startStr: string, endStr: string) {
    'use cache';
    cacheTag(getUserTxTag(userId));
    cacheLife('minutes');

    const start = new Date(startStr);
    const end = new Date(endStr);

    const rangeTransactions = await db.query.transactions.findMany({
        where: and(
            eq(transactions.userId, userId),
            eq(transactions.isDeleted, false),
            isNull(transactions.tripId),
            gte(transactions.date, start),
            lte(transactions.date, end)
        ),
        with: {
            category: true,
        }
    });

    const aggregateByCategory = (txs: typeof rangeTransactions) => {
        const map = new Map<string, number>();

        for (const tx of txs) {
            const categoryName = tx.category?.name || 'Uncategorized';
            const amount = parseFloat(tx.amount);
            map.set(categoryName, (map.get(categoryName) || 0) + amount);
        }

        return Array.from(map.entries())
            .map(([description, amount]) => ({
                description,
                amount,
            }))
            .sort((a, b) => b.amount - a.amount);
    };

    const incomeTxs = rangeTransactions.filter(t => t.type === 'income');
    const savingsTxs = rangeTransactions.filter(t => t.type === 'savings');
    const expenseTxs = rangeTransactions.filter(t => t.type !== 'income' && t.type !== 'savings');
    const needsTxs = expenseTxs.filter(t => t.necessityLevel === 'needs');
    const wantsTxs = expenseTxs.filter(t => t.necessityLevel === 'wants');

    const totalIncome = incomeTxs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalSavings = savingsTxs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalNeeds = needsTxs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalWants = wantsTxs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expenses = totalNeeds + totalWants;

    const income = aggregateByCategory(incomeTxs);
    const savings = aggregateByCategory(savingsTxs);
    const needs = aggregateByCategory(needsTxs);
    const wants = aggregateByCategory(wantsTxs);

    const data = {
        income,
        needs,
        wants,
        savings,
        totals: {
            totalIncome,
            totalNeeds,
            totalWants,
            totalSavings,
            expenses,
            balance: totalIncome - expenses - totalSavings,
        }
    };

    // Note: getCalendarStats is also cached, so this internal call is fine but effectively double caching if called here.
    // However, since we are inside a cached function, calling another cached function is supported (RDC).
    const dailyStats = await getCachedCalendarStatsInternal(userId, startStr, endStr);

    const today = new Date();
    const isCurrentMonth = start.getMonth() === today.getMonth() && start.getFullYear() === today.getFullYear();
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const daysPassed = isCurrentMonth ? today.getDate() : daysInMonth;

    return {
        ...data,
        dailyStats,
        insightData: {
            daysPassed,
            daysInMonth,
            isCurrentMonth
        }
    };
}

export async function getBudgetReportData(start: Date, end: Date) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return null;
    }

    return await getCachedBudgetReportDataInternal(session.user.id, start.toISOString(), end.toISOString());
}

export async function restoreTransaction(id: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        await db
            .update(transactions)
            .set({
                isDeleted: false,
                deletedAt: null,
            })
            .where(
                and(
                    eq(transactions.id, id),
                    eq(transactions.userId, session.user.id)
                )
            );

        revalidateTag(getUserTxTag(session.user.id), 'max');
        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Failed to restore transaction:', error);
        return { error: 'Failed to restore transaction' };
    }
}

export async function permanentDeleteTransaction(id: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        await db
            .delete(transactions)
            .where(
                and(
                    eq(transactions.id, id),
                    eq(transactions.userId, session.user.id)
                )
            );

        // No need to invalidate cache for permanent delete if it was already "soft deleted" and excluded from queries?
        // Actually, restore logic suggests soft deletes are excluded.
        // Permanent delete removes soft-deleted.
        // It's safe to revalidate anyway.
        revalidateTag(getUserTxTag(session.user.id), 'max');
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Failed to permanently delete transaction:', error);
        return { error: 'Failed to permanently delete transaction' };
    }
}

export async function getDeletedTransactions() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return [];
    }

    // This is less frequent, maybe skip caching or cache with different tag?
    // Let's keep it dynamic for now (admin/recovery feature).
    // Or cache it too.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.query.transactions.findMany({
        where: and(
            eq(transactions.userId, session.user.id),
            eq(transactions.isDeleted, true),
            gte(transactions.deletedAt, thirtyDaysAgo)
        ),
        with: {
            category: true,
        },
        orderBy: [desc(transactions.deletedAt)],
    });

    return result;
}
