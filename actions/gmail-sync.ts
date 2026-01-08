'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { accounts, transactionalEmails } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { fetchRecentEmails } from '@/lib/gmail';
import { classifyEmail } from '@/lib/gemini';
import { revalidatePath } from 'next/cache';

// Core Sync Logic (Separated for Webhook Reuse)
export async function performGmailSync(userId: string) {
    // Get Google Account
    const account = await db.query.accounts.findFirst({
        where: and(
            eq(accounts.userId, userId),
            eq(accounts.providerId, 'google')
        ),
    });

    if (!account || !account.accessToken) {
        throw new Error('Google account not connected or missing access token');
    }

    console.log('DEBUG: Account found:', {
        hasAccessToken: !!account.accessToken,
        accessTokenLength: account.accessToken?.length,
        hasRefreshToken: !!account.refreshToken,
        refreshTokenLength: account.refreshToken?.length,
        expiresAt: account.accessTokenExpiresAt,
        provider: account.providerId
    });

    // Helper to refresh token
    const refreshAndSaveToken = async (refreshToken: string) => {
        console.log('Refreshing expired/invalid access token...');
        const { refreshAccessToken } = await import('@/lib/gmail'); // Dynamic import to avoid cycles if any
        const newTokens = await refreshAccessToken(refreshToken);

        if (!newTokens.accessToken) throw new Error('Failed to retrieve new access token');

        // Update DB
        await db.update(accounts)
            .set({
                accessToken: newTokens.accessToken,
                accessTokenExpiresAt: newTokens.expiryDate ? new Date(newTokens.expiryDate) : undefined,
                refreshToken: newTokens.refreshToken || refreshToken, // Update if rotated
                updatedAt: new Date(),
            })
            .where(and(
                eq(accounts.userId, userId),
                eq(accounts.providerId, 'google')
            ));

        console.log('Token refreshed successfully.');
        return newTokens.accessToken;
    };

    let currentAccessToken = account.accessToken;
    let emails: any[] = [];

    // 1. Check time-based expiry first (optimization)
    const now = new Date();
    const expiry = account.accessTokenExpiresAt;
    const isTimeExpired = !expiry || now.getTime() > (expiry.getTime() - 5 * 60 * 1000);

    if (isTimeExpired && account.refreshToken) {
        try {
            currentAccessToken = await refreshAndSaveToken(account.refreshToken);
        } catch (e) {
            console.error('Time-based refresh failed:', e);
            // Verify if we can continue? Probably not, but let's try the old token or fail.
            // Throwing here is safer.
            throw new Error('Failed to refresh expired token.');
        }
    }

    // 3. Explicit Re-login Check (User Request)
    if (!currentAccessToken && !account.refreshToken) {
        throw new Error('No valid tokens found. Please reconnect Gmail in Settings.');
    }

    // 2. Try Fetching - with 401 Retry
    try {
        if (!currentAccessToken) throw new Error('Missing access token'); // Should be caught by refresh logic usually
        emails = await fetchRecentEmails(currentAccessToken, 4);
    } catch (error: any) {
        // Check for 401 or "invalid authentication credentials"
        const isAuthError =
            error.code === 401 ||
            (error?.message && error.message.includes('invalid authentication credentials'));

        if (isAuthError) {
            console.log('Encountered 401 Invalid Credentials.');

            if (!account.refreshToken) {
                throw new Error('Session expired and no recovery token available. Please reconnect Gmail in Settings.');
            }

            console.log('Attempting recovery refresh...');
            try {
                // Force refresh
                const freshAccessToken = await refreshAndSaveToken(account.refreshToken);
                // Retry fetch with new token
                emails = await fetchRecentEmails(freshAccessToken, 4);
            } catch (retryError) {
                console.error('Retry after refresh failed:', retryError);
                throw new Error('Gmail session expired. Please reconnect your account in Settings.');
            }
        } else {
            throw error; // Re-throw non-auth errors
        }
    }

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
        // Extract metadata
        const headers = email.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const sender = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
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
    return syncedCount;
}

export async function syncGmail() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const count = await performGmailSync(session.user.id);
        revalidatePath('/dashboard');
        return { success: true, syncedCount: count };

    } catch (error) {
        console.error('Gmail sync error:', error);
        return { success: false, error: 'Failed to sync emails.' };
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

