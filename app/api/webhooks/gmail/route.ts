
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { gmailSyncState, accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { syncGmail } from '@/actions/gmail-sync'; // We might need a modified version that accepts userId/historyId

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const message = body.message;

        if (!message || !message.data) {
            return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
        }

        const dataStart = Buffer.from(message.data, 'base64').toString('utf-8');
        const data = JSON.parse(dataStart);

        // data looks like: { emailAddress: 'user@gmail.com', historyId: 12345 }
        const { emailAddress, historyId } = data;

        if (!emailAddress) {
            return NextResponse.json({ error: 'Missing email address' }, { status: 400 });
        }

        console.log(`Received Gmail push for ${emailAddress}, historyId: ${historyId}`);

        // Find user by email (we need to join accounts or just search user)
        // Since `transactionalEmails` table uses userId, we need to map email -> userId.
        // Assuming emailAddress matches the Google Account email.

        // Strategy: Find account with this email. But `accounts` table usually has `providerAccountId` (Google ID) not email.
        // `users` table has email, but user might have a different google account linked.
        // Best bet: Check `users.email` first.

        const user = await db.query.users.findFirst({
            where: eq(users.email, emailAddress),
        });

        // If not found in users, check if we stored it in sync state (not currently).
        // For now assume user.email matches gmail.

        if (!user) {
            console.log(`User not found for email ${emailAddress}`);
            return NextResponse.json({ message: 'User ignored' }, { status: 200 });
        }

        // Trigger Sync
        // Ideally we pass historyId to sync only new messages.
        // For now, let's just trigger the existing sync function (it fetches last few emails).
        // Update: syncGmail is a server action that expects Headers/Session. We can't use it directly here.
        // We need an internal sync function.

        // For this iteration, acknowledgment is key.
        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
