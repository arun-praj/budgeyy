'use server';

import { db } from '@/db';
import { trips, tripTransactions } from '@/db/schema';
import * as schema from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function getTrips() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return [];
    }

    const userTrips = await db.query.trips.findMany({
        where: eq(trips.userId, session.user.id),
        orderBy: [desc(trips.startDate)],
    });

    return userTrips;
}

export async function createTrip(data: {
    name: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    destination?: string;
    imageUrl?: string;
    emails?: string[];
}) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const [newTrip] = await db.insert(trips).values({
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        destination: data.destination,
        imageUrl: data.imageUrl,
        userId: session.user.id,
    }).returning({ id: trips.id });

    if (data.emails && data.emails.length > 0) {
        // Import tripInvites dynamically or ensure it's imported at top
        await db.insert(schema.tripInvites).values(
            data.emails.map(email => ({
                tripId: newTrip.id,
                email,
                status: 'pending' as const,
            }))
        );
    }

    // Auto-generate itinerary days
    if (data.startDate && data.endDate) {
        const days = [];
        let currentDate = new Date(data.startDate);
        const end = new Date(data.endDate);
        let dayCount = 1;

        while (currentDate <= end) {
            days.push({
                tripId: newTrip.id,
                dayNumber: dayCount,
                date: new Date(currentDate),
                title: '', // Pending user input
            });
            currentDate.setDate(currentDate.getDate() + 1);
            dayCount++;
        }

        if (days.length > 0) {
            await db.insert(schema.tripItineraries).values(days);
        }
    } else if (data.startDate) {
        // Single day trip if no end date
        await db.insert(schema.tripItineraries).values({
            tripId: newTrip.id,
            dayNumber: 1,
            date: data.startDate,
            title: '',
        });
    }

    revalidatePath('/splitlog');
    return newTrip.id;
}

export async function updateTripNotes(tripId: string, notes: string) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        throw new Error('Unauthorized');
    }

    const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
        with: {
            invites: true
        }
    });

    if (!trip) {
        throw new Error('Trip not found');
    }

    const isCreator = trip.userId === session.user.id;
    const isInvited = trip.invites.some(invite => invite.email === session.user.email);

    if (!isCreator && !isInvited) {
        throw new Error('Unauthorized');
    }

    await db.update(trips)
        .set({ notes, updatedAt: new Date() })
        .where(eq(trips.id, tripId));

    revalidatePath(`/splitlog/${tripId}`);
}

export async function getTrip(tripId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return null;
    }

    const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
        with: {
            user: true, // Fetch creator
            itineraries: {
                orderBy: (itineraries, { asc }) => [asc(itineraries.dayNumber)],
                with: {
                    tripTransactions: {
                        where: (utils, { eq }) => eq(utils.isDeleted, false),
                        with: {
                            paidByUser: true,
                            splits: {
                                with: {
                                    user: true
                                }
                            },
                            payers: { // Fetch payers
                                with: {
                                    user: true
                                }
                            }
                        }
                    },
                    notes: true,
                    checklists: true,
                }
            },
            // Include invites
            invites: true,
        },
    });

    if (!trip) return null;

    // Basic authorization check: passed if user is creator
    // TODO: Add check for invited users
    if (trip.userId !== session.user.id) {
        // Check if user is invited
        const invite = await db.query.tripInvites.findFirst({
            where: (invites, { eq, and }) => and(
                eq(invites.tripId, tripId),
                eq(invites.email, session.user.email)
            )
        });

        if (!invite) return null;
    }

    return trip;
}

export async function updateItineraryDay(itineraryId: string, data: { title?: string; location?: string }) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // TODO: Add strict ownership check here (verify user owns the trip linked to this itinerary)

    await db.update(schema.tripItineraries)
        .set({
            ...data,
            updatedAt: new Date()
        })
        .where(eq(schema.tripItineraries.id, itineraryId));

    revalidatePath('/splitlog/[tripId]'); // Revalidate the trip page
}

export async function createItineraryNote(itineraryId: string, content: string, isHighPriority: boolean = false) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) throw new Error('Unauthorized');

    const [note] = await db.insert(schema.itineraryNotes).values({
        tripItineraryId: itineraryId,
        content,
        isHighPriority,
    }).returning();

    revalidatePath('/splitlog/[tripId]');
    return note;
}

export async function updateItineraryNote(noteId: string, content: string, isHighPriority?: boolean) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) throw new Error('Unauthorized');

    const [note] = await db.update(schema.itineraryNotes)
        .set({
            content,
            ...(isHighPriority !== undefined ? { isHighPriority } : {}),
            updatedAt: new Date()
        })
        .where(eq(schema.itineraryNotes.id, noteId))
        .returning();

    revalidatePath('/splitlog/[tripId]');
    return note;
}

export async function createItineraryChecklist(itineraryId: string, title: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) throw new Error('Unauthorized');

    await db.insert(schema.itineraryChecklists).values({
        tripItineraryId: itineraryId,
        title,
        items: '[]',
    });

    revalidatePath('/splitlog/[tripId]');
}

export async function updateItineraryChecklist(checklistId: string, items: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) throw new Error('Unauthorized');

    await db.update(schema.itineraryChecklists)
        .set({
            items,
            updatedAt: new Date()
        })
        .where(eq(schema.itineraryChecklists.id, checklistId));

    revalidatePath('/splitlog/[tripId]');
}

export async function deleteItineraryNote(noteId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) throw new Error('Unauthorized');

    await db.delete(schema.itineraryNotes)
        .where(eq(schema.itineraryNotes.id, noteId));

    revalidatePath('/splitlog/[tripId]');
}

export async function deleteItineraryChecklist(checklistId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) throw new Error('Unauthorized');

    await db.delete(schema.itineraryChecklists)
        .where(eq(schema.itineraryChecklists.id, checklistId));

    revalidatePath('/splitlog/[tripId]');
}

export async function deleteTripTransaction(transactionId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) throw new Error('Unauthorized');

    await db.update(schema.tripTransactions)
        .set({
            isDeleted: true,
            deletedAt: new Date()
        })
        .where(eq(schema.tripTransactions.id, transactionId));

    revalidatePath('/splitlog/[tripId]');
}

export async function createTripTransaction(data: {
    tripId: string;
    tripItineraryId: string;
    amount: number;
    date: Date;
    type: 'income' | 'expense' | 'savings';
    categoryId?: string;
    description?: string;
    isCredit?: boolean;

    splits?: { userId: string; amount: number }[];
    paidByUserId?: string; // Legacy/Single payer fallback
    payers?: { userId: string; amount: number }[];
}) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user?.id) throw new Error('Unauthorized');

    // Determine payers: prioritize explicit payers array, fallback to paidByUserId (single payer full amount)
    let finalPayers = data.payers || [];
    if (finalPayers.length === 0 && data.paidByUserId) {
        finalPayers = [{ userId: data.paidByUserId, amount: data.amount }];
    }
    // If absolutely no payer data, default to creator? Or let it fail/be handled? 
    // For now, let's assume valid data provided or fallback to creator as single payer if purely empty
    if (finalPayers.length === 0) {
        finalPayers = [{ userId: session.user.id, amount: data.amount }];
    }

    // Use transaction to ensure consistency
    const result = await db.transaction(async (tx) => {
        const [transaction] = await tx.insert(schema.tripTransactions).values({
            ...data,
            amount: data.amount.toString(),
            userId: session.user.id,
            paidByUserId: data.paidByUserId || finalPayers[0]?.userId, // Keep populating for compatibility if needed/easy
        }).returning();

        if (data.splits && data.splits.length > 0) {
            await tx.insert(schema.tripTransactionSplits).values(
                data.splits.map(split => ({
                    tripTransactionId: transaction.id,
                    userId: split.userId,
                    amount: split.amount.toString(),
                }))
            );
        }

        if (finalPayers.length > 0) {
            await tx.insert(schema.tripTransactionPayers).values(
                finalPayers.map(payer => ({
                    tripTransactionId: transaction.id,
                    userId: payer.userId,
                    amount: payer.amount.toString(),
                }))
            );
        }

        return transaction;
    });

    revalidatePath('/splitlog/[tripId]');
    return result;
}

export async function updateTripTransaction(id: string, data: {
    amount?: number;
    date?: Date;
    type?: 'income' | 'expense' | 'savings';
    categoryId?: string;
    description?: string;
    isCredit?: boolean;
    splits?: { userId: string; amount: number }[];
    paidByUserId?: string;
    payers?: { userId: string; amount: number }[];
}) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user?.id) throw new Error('Unauthorized');

    const result = await db.transaction(async (tx) => {
        // Prepare update data
        const updateData: any = {
            ...data,
            amount: data.amount ? data.amount.toString() : undefined,
            updatedAt: new Date(),
        };

        // Update legacy paidByUserId if implicit in single-payer update
        if (data.paidByUserId) {
            updateData.paidByUserId = data.paidByUserId;
        }

        const [transaction] = await tx.update(schema.tripTransactions)
            .set(updateData)
            .where(eq(schema.tripTransactions.id, id))
            .returning();

        if (data.splits) {
            // Simple replace strategy: delete all for this transaction and re-insert
            await tx.delete(schema.tripTransactionSplits)
                .where(eq(schema.tripTransactionSplits.tripTransactionId, id));

            if (data.splits.length > 0) {
                await tx.insert(schema.tripTransactionSplits).values(
                    data.splits.map(split => ({
                        tripTransactionId: id,
                        userId: split.userId,
                        amount: split.amount.toString(),
                    }))
                );
            }
        }

        if (data.payers) {
            // Simple replace strategy for payers too
            await tx.delete(schema.tripTransactionPayers)
                .where(eq(schema.tripTransactionPayers.tripTransactionId, id));

            if (data.payers.length > 0) {
                await tx.insert(schema.tripTransactionPayers).values(
                    data.payers.map(payer => ({
                        tripTransactionId: id,
                        userId: payer.userId,
                        amount: payer.amount.toString(),
                    }))
                );
            }
        }

        return transaction;
    });

    revalidatePath('/splitlog/[tripId]');
    return result;
}
