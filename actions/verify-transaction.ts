'use server';

import { db } from '@/db';
import { transactions, transactionalEmails } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

interface VerifyTransactionData {
    emailId: string; // The ID of the transactional email record (UUID)
    amount: number;
    date: Date;
    description: string;
    categoryId: string;
    type: 'income' | 'expense' | 'savings';
    isRecurring?: boolean;
    necessityLevel?: 'needs' | 'wants' | 'savings';
    isCredit?: boolean;
    receiptUrl?: string; // Optional: user might want to attach a receipt image here too?
}

export async function verifyEmailTransaction(data: VerifyTransactionData) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        // 1. Create the new transaction
        const newTransaction = await db.insert(transactions).values({
            userId: session.user.id,
            amount: String(data.amount), // decimal in DB
            date: data.date,
            description: data.description,
            categoryId: data.categoryId,
            type: data.type,
            isRecurring: data.isRecurring || false,
            necessityLevel: data.necessityLevel,
            isCredit: data.isCredit || false,
            // receiptUrl: data.receiptUrl, // Optional if we want to carry over images (future)
        }).returning();

        // 2. Mark the email as Cleared
        await db.update(transactionalEmails)
            .set({ isCleared: true })
            .where(eq(transactionalEmails.id, data.emailId));

        revalidatePath('/dashboard');
        revalidatePath('/transactions');
        revalidatePath('/settings');

        return { success: true, transactionId: newTransaction[0].id };

    } catch (error: any) {
        console.error('Failed to verify transaction:', error);
        return { error: error.message || 'Failed to verify transaction' };
    }
}
