'use server';

import { db } from '@/db';
import { transactionalEmails } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function rejectEmailTransaction(emailId: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        await db.update(transactionalEmails)
            .set({ isRejected: true })
            .where(and(
                eq(transactionalEmails.id, emailId),
                eq(transactionalEmails.userId, session.user.id)
            ));

        revalidatePath('/dashboard');
        revalidatePath('/settings');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to reject transaction:', error);
        return { error: error.message || 'Failed to reject transaction' };
    }
}
