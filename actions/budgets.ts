'use server';

import { db } from '@/db';
import { budgets } from '@/db/schema';
import { eq, and, or, lte, gte, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { BudgetPeriod } from '@/types';

export interface CreateBudgetData {
    name: string;
    amountLimit: number;
    startDate: string;
    endDate: string;
    period: BudgetPeriod;
    rollover?: boolean;
    categoryId?: string;
}

export async function createBudget(data: CreateBudgetData) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    // Check for overlapping budgets with the same category
    if (data.categoryId) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);

        const overlapping = await db.query.budgets.findFirst({
            where: and(
                eq(budgets.userId, session.user.id),
                eq(budgets.categoryId, data.categoryId),
                or(
                    and(
                        lte(budgets.startDate, endDate),
                        gte(budgets.endDate, startDate)
                    )
                )
            ),
        });

        if (overlapping) {
            return { error: 'A budget already exists for this category in the selected date range' };
        }
    }

    try {
        const [budget] = await db
            .insert(budgets)
            .values({
                name: data.name,
                amountLimit: data.amountLimit.toString(),
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                period: data.period,
                rollover: data.rollover ?? false,
                categoryId: data.categoryId,
                userId: session.user.id,
            })
            .returning();

        revalidatePath('/budgets');
        return { success: true, data: budget };
    } catch (error) {
        console.error('Failed to create budget:', error);
        return { error: 'Failed to create budget' };
    }
}

export async function getBudgets() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return [];
    }

    const result = await db.query.budgets.findMany({
        where: eq(budgets.userId, session.user.id),
        with: {
            category: true,
        },
        orderBy: [desc(budgets.startDate)],
    });

    return result;
}

export async function deleteBudget(id: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        await db
            .delete(budgets)
            .where(
                and(
                    eq(budgets.id, id),
                    eq(budgets.userId, session.user.id)
                )
            );

        revalidatePath('/budgets');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete budget:', error);
        return { error: 'Failed to delete budget' };
    }
}
