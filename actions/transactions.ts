'use server';

import { db } from '@/db';
import { transactions, categories } from '@/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getCurrentMonthRange } from '@/lib/date-utils';
import type { NecessityLevel, TransactionType } from '@/types';

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
                userId: session.user.id,
            })
            .returning();

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

        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        return { success: true, data: transaction };
    } catch (error) {
        console.error('Failed to update transaction:', error);
        return { error: 'Failed to update transaction' };
    }
}

export async function getTransactions(options: {
    page?: number;
    pageSize?: number;
    limit?: number; // Legacy, map to pageSize if provided
    start?: Date;
    end?: Date;
    categoryId?: string;
    type?: TransactionType;
} = {}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { data: [], totalCount: 0 };
    }

    const page = options.page || 1;
    const pageSize = options.limit || options.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const conditions = [
        eq(transactions.userId, session.user.id),
        eq(transactions.isDeleted, false)
    ];
    if (options.start) conditions.push(gte(transactions.date, options.start));
    if (options.end) conditions.push(lte(transactions.date, options.end));
    if (options.categoryId) conditions.push(eq(transactions.categoryId, options.categoryId));
    if (options.type && options.type !== 'all' as any) conditions.push(eq(transactions.type, options.type));

    // Get Data
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

    // Get Total Count
    // Use raw query for count for performance or simpler aggregation
    // Or just fetch ID and count in code if dataset is small, but SQL count is better
    // Drizzle doesn't have a simple count() with query builder conditions easily reuseable
    // So we repeat conditions in a select count() query

    // We can use db.select({ count: count() }).from(transactions)...
    // But we need to reconstruct 'and(...conditions)' with the right table reference
    // The 'conditions' array is already built with imported 'transactions' table reference

    // NOTE: 'count' import needed from drizzle-orm
    const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(transactions)
        .where(and(...conditions));

    const totalCount = Number(countResult?.count || 0);

    return { data, totalCount };
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

    // Get all transactions for the specified range
    const rangeTransactions = await db.query.transactions.findMany({
        where: and(
            eq(transactions.userId, session.user.id),
            eq(transactions.isDeleted, false),
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
            // If new system 'savings' type
        } else if (tx.type === 'savings') {
            stats.savingsAmount += amount;
        } else {
            // Expenses
            // Only count non-credit expenses effectively reducing the balance immediately
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

    // Explicit logic: Savings is only what is explicitly categorized as 'savings'
    // Legacy fallback removed per user request (Net Savings should not be Income - Expenses)

    return stats;
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

export async function deleteCategory(id: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        // Only allow deleting user's own categories
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

    // Get default categories and user's custom categories
    const result = await db.query.categories.findMany({
        where: and(...conditions),
        orderBy: [categories.name],
    });

    return result;
}

export async function getCalendarStats(start: Date, end: Date) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return [];
    }

    const rangeTransactions = await db.query.transactions.findMany({
        where: and(
            eq(transactions.userId, session.user.id),
            eq(transactions.isDeleted, false),
            gte(transactions.date, start),// Use a unique marker if needed, or just match context
            lte(transactions.date, end)
        ),
    });

    // Aggregate by date (YYYY-MM-DD)
    // Aggregate by date (YYYY-MM-DD)
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
            // For calendar, we might want to track savings separately or just counts.
            // Let's add 'savings' count support? 
            // The current CalendarGrid expects income/expense. 
            // Let's treat Savings as a positive flow or separate?
            // User asked for "Expense, income and saving transaction type".
            // Let's update `dailyStats` structure.

            // For now, let's treat savings similarly to income in terms of "good" dots? 
            // Or maybe just add it to 'income' for now to avoid breaking CalendarGrid types immediately?
            // BETTER: Add savings to the stats object.

            // We need to update the `dailyStats` type definition above this loop first.
            // But wait, replace tool works in chunks.
            // I will assume I can update the type definition in a separate chunk or just let TS infer if I initialized it differently.
            // Actually, I need to update the initialization.

            // Checking previous context: The user wants "Expense, income and saving".
            // I should update Calendar logic to return savings too.
            dailyStats[dateKey].savings += amount;
            dailyStats[dateKey].savingsCount += 1;
        } else {
            dailyStats[dateKey].expense += amount;
            dailyStats[dateKey].expenseCount += 1;
        }
    }

    // Convert to array
    return Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats,
    }));
}

export async function getBudgetReportData(start: Date, end: Date) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return null;
    }

    const rangeTransactions = await db.query.transactions.findMany({
        where: and(
            eq(transactions.userId, session.user.id),
            eq(transactions.isDeleted, false),
            gte(transactions.date, start),
            lte(transactions.date, end)
        ),
        with: {
            category: true,
        }
    });

    // Helper to aggregate by category
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
                // We don't really have a single date for aggregated items, 
                // but the PDF might not strictly require it for the summary list.
                // If it does, we can use the end date or null.
                // Looking at budget-pdf.tsx, it uses description and amount.
            }))
            .sort((a, b) => b.amount - a.amount); // Sort by highest amount
    };

    const incomeTxs = rangeTransactions.filter(t => t.type === 'income');
    const savingsTxs = rangeTransactions.filter(t => t.type === 'savings');
    // For expenses, split by necessity
    const expenseTxs = rangeTransactions.filter(t => t.type !== 'income' && t.type !== 'savings');
    const needsTxs = expenseTxs.filter(t => t.necessityLevel === 'needs');
    const wantsTxs = expenseTxs.filter(t => t.necessityLevel === 'wants');

    // Calculate totals
    const totalIncome = incomeTxs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalSavings = savingsTxs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalNeeds = needsTxs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalWants = wantsTxs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expenses = totalNeeds + totalWants; // Or total expenses from all non-income/non-savings

    // Aggregate lists
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

    // Fetch daily stats for insights
    const dailyStats = await getCalendarStats(start, end);

    // Insight Helpers
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

        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        revalidatePath('/settings'); // Restore likely happens here
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

    // Get deleted transactions within last 30 days
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
