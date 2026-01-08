'use server';

import { db } from '@/db';
import { transactionalEmails } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function getUnreadTransactionCount() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return 0;
    }

    const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(transactionalEmails)
        .where(and(
            eq(transactionalEmails.userId, session.user.id),
            eq(transactionalEmails.isCleared, false),
            eq(transactionalEmails.isRejected, false)
        ));

    return Number(result[0]?.count || 0);
}

export async function getRecentUnreadTransactions(limit = 10) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return [];
    }

    return await db.query.transactionalEmails.findMany({
        where: and(
            eq(transactionalEmails.userId, session.user.id),
            eq(transactionalEmails.isCleared, false),
            eq(transactionalEmails.isRejected, false)
        ),
        orderBy: [desc(transactionalEmails.date)],
        limit: limit,
    });
}

export async function markAllTransactionsAsRead() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    await db
        .update(transactionalEmails)
        .set({ isRead: true })
        .where(eq(transactionalEmails.userId, session.user.id));

    revalidatePath('/');
    return { success: true };
}

export async function markTransactionAsRead(id: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    await db
        .update(transactionalEmails)
        .set({ isRead: true })
        .where(and(
            eq(transactionalEmails.id, id),
            eq(transactionalEmails.userId, session.user.id)
        ));

    revalidatePath('/');
    return { success: true };
}
