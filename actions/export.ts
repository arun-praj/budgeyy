'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function exportUserDataJSON() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    // Fetch all user data
    // 1. Categories
    const categories = await db.query.categories.findMany({
        where: eq(schema.categories.userId, userId)
    });

    // 2. Budgets
    const budgets = await db.query.budgets.findMany({
        where: eq(schema.budgets.userId, userId),
        with: {
            category: true
        }
    });

    // 3. Personal Transactions
    const transactions = await db.query.transactions.findMany({
        where: eq(schema.transactions.userId, userId),
        with: {
            category: true
        }
    });

    // 4. Trips
    const trips = await db.query.trips.findMany({
        where: eq(schema.trips.userId, userId),
        with: {
            itineraries: {
                with: {
                    tripTransactions: {
                        with: {
                            payers: true,
                            splits: true
                        }
                    },
                    notes: true,
                    checklists: true
                }
            },
            // Legacy/Direct transactions
            tripTransactions: {
                with: {
                    payers: true,
                    splits: true
                }
            },
            invites: true
        }
    });

    const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        user: {
            name: session.user.name,
            email: session.user.email
        },
        data: {
            categories,
            budgets,
            transactions,
            trips
        }
    };

    return JSON.stringify(exportData, null, 2);
}

export async function exportUserDataCSV() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    // Fetch transactions (Personal + Trip Expenses if possible, but structure differs)
    // For CSV, usually people want a unified list of spending.

    // 1. Personal Transactions
    const transactions = await db.query.transactions.findMany({
        where: eq(schema.transactions.userId, userId),
        with: {
            category: true
        },
        orderBy: [desc(schema.transactions.date)]
    });

    // 2. Trip Transactions (where user paid)
    // This is trickier as it involves splits. 
    // For simple CSV export, let's export "What I Paid" or "My Share"?
    // "What I Paid" is easier to verify against bank statements.

    // Let's stick to the main Transactions table + Trip Transactions where user is payer for now.

    const tripTransactions = await db.query.tripTransactions.findMany({
        where: eq(schema.tripTransactions.paidByUserId, userId),
        with: {
            category: true,
            trip: true
        },
        orderBy: [desc(schema.tripTransactions.date)]
    });

    // CSV Header
    const header = ['Date', 'Type', 'Description', 'Amount', 'Category', 'Trip Name', 'Notes/Tags'];
    const rows = [];

    // Format Personal Transactions
    for (const txn of transactions) {
        rows.push([
            txn.date ? new Date(txn.date).toISOString().split('T')[0] : '',
            txn.type,
            `"${(txn.description || '').replace(/"/g, '""')}"`, // Escape quotes
            txn.amount,
            `"${(txn.category?.name || '').replace(/"/g, '""')}"`,
            '', // No Trip
            `"${txn.isRecurring ? 'Recurring' : ''} ${txn.necessityLevel || ''}"`
        ]);
    }

    // Format Trip Transactions
    for (const txn of tripTransactions) {
        rows.push([
            txn.date ? new Date(txn.date).toISOString().split('T')[0] : '',
            txn.type,
            `"${(txn.description || '').replace(/"/g, '""')}"`,
            txn.amount,
            `"${(txn.category?.name || '').replace(/"/g, '""')}"`,
            `"${(txn.trip?.name || '').replace(/"/g, '""')}"`,
            'Trip Expense'
        ]);
    }

    // Combine and Sort by Date (Descending)
    rows.sort((a, b) => {
        const dateA = a[0];
        const dateB = b[0];
        return dateB.localeCompare(dateA);
    });

    const csvContent = [
        header.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
}
