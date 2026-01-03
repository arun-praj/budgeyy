import { db } from '@/db';
import { users, tripInvites } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
        return new NextResponse('Email is required', { status: 400 });
    }

    try {
        // 1. Try to unsubscribe from users table
        const userUpdate = await db.update(users)
            .set({ emailNotificationsEnabled: false })
            .where(eq(users.email, email.toLowerCase()))
            .returning();

        // 2. Try to unsubscribe from tripInvites table
        const inviteUpdate = await db.update(tripInvites)
            .set({ emailNotificationsEnabled: false })
            .where(eq(tripInvites.email, email.toLowerCase()))
            .returning();

        if (userUpdate.length === 0 && inviteUpdate.length === 0) {
            // Not found in either, but we should still show success to avoid email harvesting
            console.log(`Unsubscribe requested for ${email} but no record found.`);
        }

        return new NextResponse(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Unsubscribed - Budgeyy</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #111827; }
                    .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 400px; }
                    h1 { color: #7c3aed; margin-bottom: 1rem; }
                    p { color: #4b5563; line-height: 1.5; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Unsubscribed</h1>
                    <p>You have been successfully unsubscribed from Budgeyy email notifications for <strong>${email}</strong>.</p>
                    <p>You can close this window now.</p>
                </div>
            </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html' }
        });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
