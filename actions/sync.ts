'use server';

import { db } from '@/db';
import { transactions } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { LocalTransaction } from '@/lib/local-db';

export async function syncTransactions(localTransactions: LocalTransaction[]) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    if (!localTransactions.length) {
        return { success: true, count: 0 };
    }

    try {
        // Map local transactions to DB schema
        // Note: we ignore local ID
        const values = localTransactions.map(tx => ({
            amount: tx.amount.toString(),
            date: new Date(tx.date),
            description: tx.description,
            type: tx.type,
            categoryId: tx.categoryId,
            isRecurring: tx.isRecurring || false,
            necessityLevel: tx.necessityLevel,
            userId: session.user.id,
            createdAt: new Date(tx.createdAt), // Preserve original creation time if needed, or default
            updatedAt: new Date(),
            // Set defaults for required fields if missing
            isCredit: false,
        }));

        await db.insert(transactions).values(values);

        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        return { success: true, count: values.length };
    } catch (error) {
        console.error('Sync failed:', error);
        return { error: 'Sync failed' };
    }
}
