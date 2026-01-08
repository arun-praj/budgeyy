'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { accounts, gmailSyncState } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getGmailClient } from '@/lib/gmail';

export async function watchGmail() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return { success: false, error: 'Unauthorized' };
    }

    const userId = session.user.id;
    const topicName = process.env.GOOGLE_PUBSUB_TOPIC;

    if (!topicName) {
        return { success: false, error: 'GOOGLE_PUBSUB_TOPIC not configured' };
    }

    // Get Google Account
    const account = await db.query.accounts.findFirst({
        where: and(
            eq(accounts.userId, userId),
            eq(accounts.providerId, 'google')
        ),
    });

    if (!account || !account.accessToken) {
        return { success: false, error: 'Google account not connected' };
    }

    try {
        const gmail = getGmailClient(account.accessToken);

        const response = await gmail.users.watch({
            userId: 'me',
            requestBody: {
                labelIds: ['INBOX'],
                topicName: topicName,
            },
        });

        const historyId = response.data.historyId;
        const expiration = response.data.expiration; // Epoch timestamp in ms

        // Update Sync State
        await db.insert(gmailSyncState).values({
            userId,
            historyId: historyId || null,
            watchExpiration: expiration ? new Date(parseInt(expiration)) : null,
        }).onConflictDoUpdate({
            target: gmailSyncState.userId,
            set: {
                historyId: historyId || null,
                watchExpiration: expiration ? new Date(parseInt(expiration)) : null,
                updatedAt: new Date(),
            },
        });

        return { success: true, historyId, expiration };

    } catch (error) {
        console.error('Gmail watch error:', error);
        return { success: false, error: 'Failed to start watch' };
    }
}
