'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { accounts, transactionalEmails } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { fetchRecentEmails } from '@/lib/gmail';
import { classifyEmail } from '@/lib/gemini';
import { revalidatePath } from 'next/cache';

export async function syncGmail() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return { success: false, error: 'Unauthorized' };
    }

    const userId = session.user.id;

    // Get Google Account
    const account = await db.query.accounts.findFirst({
        where: and(
            eq(accounts.userId, userId),
            eq(accounts.providerId, 'google')
        ),
    });

    if (!account || !account.accessToken) {
        return { success: false, error: 'Google account not connected or missing access token' };
    }

    try {
        // TODO: Handle token refresh if expired (check account.expiresAt)
        // For now, assuming token is valid or recently refreshed by better-auth login

        const emails = await fetchRecentEmails(account.accessToken, 4); // Sync last 10 for now

        let syncedCount = 0;

        for (const email of emails) {
            const emailId = email.id;
            if (!emailId) continue;

            // Check if already exists
            const existing = await db.query.transactionalEmails.findFirst({
                where: eq(transactionalEmails.emailId, emailId),
            });

            if (existing) continue;

            // Extract metadata
            const headers = email.payload?.headers || [];
            const subject = headers.find((h) => h.name === 'Subject')?.value || 'No Subject';
            const sender = headers.find((h) => h.name === 'From')?.value || 'Unknown Sender';
            const snippet = email.snippet || '';
            const internalDate = email.internalDate ? new Date(parseInt(email.internalDate)) : new Date();

            // Classify with Gemini
            const classification = await classifyEmail(subject, sender, snippet);

            if (classification.isTransactional && classification.amount != null) {
                await db.insert(transactionalEmails).values({
                    userId,
                    emailId,
                    sender,
                    subject,
                    description: classification.description || `${sender} - ${subject}`,
                    // Ensure amount is stored as string for decimal column
                    amount: String(classification.amount),
                    currency: classification.currency || 'NPR',
                    date: internalDate,
                    category: classification.category,
                    type: 'expense',
                    isCleared: false,
                });
                syncedCount++;
            }
        }

        revalidatePath('/dashboard'); // Update dashboard or wherever we show this
        return { success: true, syncedCount };

    } catch (error) {
        console.error('Gmail sync error:', error);
        return { success: false, error: 'Failed to sync emails. Token might be expired.' };
    }
}

export async function getRecentTransactionalEmails() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return [];
    }

    const emails = await db.query.transactionalEmails.findMany({
        where: eq(transactionalEmails.userId, session.user.id),
        orderBy: [desc(transactionalEmails.date)],
        limit: 20,
    });

    return emails;
}

