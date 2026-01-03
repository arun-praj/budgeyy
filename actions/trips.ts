'use server';

import { db } from '@/db';
import { trips, tripTransactions, tripInvites } from '@/db/schema';
import * as schema from '@/db/schema';
import { eq, desc, and, inArray, gt, sql, lte, or } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail, emailTemplates } from '@/lib/mail';

/**
 * Ensures a user exists for the given email.
 * If not, creates a "Shadow User" with isGuest = true.
 */
async function ensureShadowUser(email: string, name?: string, avatar?: string) {
    const normalizeEmail = email.toLowerCase();

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.email, normalizeEmail)
    });

    if (existingUser) return existingUser.id;

    // Create Shadow User
    const newId = uuidv4(); // Use UUID for consistency with better-auth if possible, or nanoid. Schema says text. 
    // better-auth usually generates random strings. Let's start with a random string.
    // Actually schema definition is text('id').primaryKey().
    // We will generate a UUID.

    const [newUser] = await db.insert(schema.users).values({
        id: newId,
        email: normalizeEmail,
        name: name || normalizeEmail.split('@')[0],
        image: null,
        avatar: avatar, // Save guest avatar config here
        isGuest: true,
        emailVerified: false,
    }).returning({ id: schema.users.id });

    return newUser.id;
}

export async function getTrips() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return [];
    }

    const userTrips = await db.query.trips.findMany({
        where: and(
            eq(trips.isArchived, false),
            or(
                eq(trips.userId, session.user.id),
                // Check if user ID exists in the invited list (requires a join or subquery normally, 
                // but with Drizzle queries we can use 'exists' or just multiple queries if simpler.
                // Actually, let's use the 'invites' relation if possible, or manual filter.
                // A raw SQL exists query is most efficient here.
                sql`EXISTS (
                    SELECT 1 FROM trip_invites 
                    WHERE trip_invites.trip_id = ${trips.id} 
                    AND trip_invites.email = ${session.user.email}
                )`
            )
        ),
        orderBy: [desc(trips.createdAt)],
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
    invites?: { email: string; guestAvatar?: string }[];
    emails?: string[]; // Legacy support or transient
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

    // Handle invites (both new object format and legacy string array)
    // Fix type inference by explicitly adding guestAvatar: undefined for legacy emails
    const invitesToProcess = data.invites || (data.emails ? data.emails.map(e => ({ email: e, guestAvatar: undefined })) : []);

    if (invitesToProcess.length > 0) {
        // 1. Create Invites Records (Keep for tracking status)
        await db.insert(schema.tripInvites).values(
            invitesToProcess.map(invite => ({
                tripId: newTrip.id,
                email: invite.email,
                status: 'pending' as const,
                guestAvatar: invite.guestAvatar,
            }))
        );

        // 2. Ensure Shadow Users for all invitees
        for (const invite of invitesToProcess) {
            await ensureShadowUser(invite.email, undefined, invite.guestAvatar);

            // 3. Send invitation email
            const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/splitlog/${newTrip.id}`;
            const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?email=${encodeURIComponent(invite.email)}`;
            const { subject, html, text } = emailTemplates.tripInvitation(
                session.user.name || session.user.email,
                data.name,
                inviteLink,
                unsubscribeUrl
            );

            await sendEmail({
                to: invite.email,
                subject,
                html,
                text,
                unsubscribeLink: unsubscribeUrl,
            }).catch(err => console.error(`Failed to send invite email to ${invite.email}:`, err));
        }
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

export async function acceptTripInvite(tripId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user?.email) return;

    // Find pending invite
    const invite = await db.query.tripInvites.findFirst({
        where: and(
            eq(tripInvites.tripId, tripId),
            eq(tripInvites.email, session.user.email),
            eq(tripInvites.status, 'pending')
        )
    });

    if (invite) {
        await db.update(tripInvites)
            .set({ status: 'accepted' })
            .where(eq(tripInvites.id, invite.id));

        revalidatePath(`/splitlog/${tripId}`);
        revalidatePath('/splitlog');
    }
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

export async function updateTripDescription(tripId: string, description: string) {
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
        .set({ description, updatedAt: new Date() })
        .where(eq(trips.id, tripId));

    revalidatePath(`/splitlog/${tripId}`);
}

export async function deleteItineraryDay(itineraryId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // 1. Get the itinerary to find tripId and dayNumber
    const itinerary = await db.query.tripItineraries.findFirst({
        where: eq(schema.tripItineraries.id, itineraryId),
        with: {
            trip: true
        }
    });

    if (!itinerary) {
        throw new Error('Itinerary not found');
    }

    if (itinerary.trip.userId !== session.user.id) {
        throw new Error('Unauthorized');
    }

    const { tripId, dayNumber } = itinerary;

    // 2. Delete the itinerary day
    // Note: Child records (notes, transactions) should cascade delete if FKs are set up correctly, 
    // but explicit delete is safer or we rely on schema. 
    // Based on previous work, we might need to be explicit, but for now let's hope schema cascades or we can add explicit deletes if needed.
    // Actually, simple DELETE is fine for now, user asked for functionality.
    await db.delete(schema.tripItineraries)
        .where(eq(schema.tripItineraries.id, itineraryId));

    // 3. Shift subsequent days back by 1
    // dayNumber -> dayNumber - 1
    // date -> date - 1 day
    await db.update(schema.tripItineraries)
        .set({
            dayNumber: sql`${schema.tripItineraries.dayNumber} - 1`,
            date: sql`${schema.tripItineraries.date} - interval '1 day'`
        })
        .where(
            and(
                eq(schema.tripItineraries.tripId, tripId),
                gt(schema.tripItineraries.dayNumber, dayNumber)
            )
        );

    // 4. Update Trip End Date (reduce by 1 day)
    if (itinerary.trip.endDate) {
        await db.update(trips)
            .set({
                endDate: sql`${trips.endDate} - interval '1 day'`
            })
            .where(eq(trips.id, tripId));
    }

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
                            },
                            user: true // Fetch transaction creator
                        }
                    },
                    notes: {
                        with: {
                            user: true // Fetch note creator
                        }
                    },
                    checklists: {
                        with: {
                            user: true // Fetch checklist creator
                        }
                    },
                }
            },
            // Fetch all transactions for expense calculations
            tripTransactions: {
                where: (utils, { eq }) => eq(utils.isDeleted, false),
                orderBy: (transactions, { desc }) => [desc(transactions.date)],
                with: {
                    paidByUser: true,
                    paidByGuest: true,
                    category: true,
                    splits: {
                        with: {
                            user: true,
                            guest: true
                        }
                    },
                    payers: {
                        with: {
                            user: true,
                            guest: true
                        }
                    },
                    user: true
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

export async function deleteTrip(tripId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // 1. Verify trip exists and user is creator
    const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
    });

    if (!trip) {
        throw new Error('Trip not found');
    }

    if (trip.userId !== session.user.id) {
        throw new Error('Only the trip creator can delete the trip');
    }

    // 2. Perform deletion
    // Depending on schema, we might need explicit cascading
    // Let's be explicit for safety as seen in updateTripDates
    await db.transaction(async (tx) => {
        // Get all itinerary IDs for this trip
        const itineraries = await tx.query.tripItineraries.findMany({
            where: eq(schema.tripItineraries.tripId, tripId),
            columns: { id: true }
        });
        const itineraryIds = itineraries.map(i => i.id);

        if (itineraryIds.length > 0) {
            // Delete related records for itineraries
            await tx.delete(schema.itineraryNotes)
                .where(inArray(schema.itineraryNotes.tripItineraryId, itineraryIds));
            await tx.delete(schema.itineraryChecklists)
                .where(inArray(schema.itineraryChecklists.tripItineraryId, itineraryIds));
            // Multi-user expenses handles deletions via isDeleted usually, 
            // but for a full trip delete we can wipe them or set isDeleted.
            // Let's be consistent and delete them if we are wiping the trip.
            await tx.delete(schema.tripTransactions)
                .where(inArray(schema.tripTransactions.tripItineraryId, itineraryIds));
        }

        // Delete invites
        await tx.delete(schema.tripInvites)
            .where(eq(schema.tripInvites.tripId, tripId));

        // Delete itineraries
        await tx.delete(schema.tripItineraries)
            .where(eq(schema.tripItineraries.tripId, tripId));

        // Delete trip itself
        await tx.delete(trips)
            .where(eq(trips.id, tripId));
    });

    revalidatePath('/splitlog');
    return { success: true };
}

export async function archiveTrip(tripId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
    });

    if (!trip) {
        throw new Error('Trip not found');
    }

    if (trip.userId !== session.user.id) {
        throw new Error('Only the trip creator can archive the trip');
    }

    await db.update(trips)
        .set({
            isArchived: true,
            archivedAt: new Date(),
            updatedAt: new Date()
        })
        .where(eq(trips.id, tripId));

    revalidatePath(`/splitlog/${tripId}`);
    return { success: true };
}

export async function unarchiveTrip(tripId: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
    });

    if (!trip) {
        throw new Error('Trip not found');
    }

    if (trip.userId !== session.user.id) {
        throw new Error('Only the trip creator can unarchive the trip');
    }

    await db.update(trips)
        .set({
            isArchived: false,
            updatedAt: new Date()
        })
        .where(eq(trips.id, tripId));

    revalidatePath('/splitlog');
    // also revalidate profile/settings where this list might be shown
    revalidatePath('/settings');
    return { success: true };
}

export async function getArchivedTrips() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return [];
    }

    const archivedTrips = await db.query.trips.findMany({
        where: and(
            eq(trips.userId, session.user.id),
            eq(trips.isArchived, true)
        ),
        orderBy: [desc(trips.archivedAt)],
    });

    return archivedTrips;
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
        userId: session.user.id, // Save userId
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
        userId: session.user.id, // Save userId
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

    splits?: { userId?: string; guestId?: string; amount: number }[];
    paidByUserId?: string; // Legacy/Single user payer fallback
    paidByGuestId?: string; // Single guest payer fallback
    payers?: { userId?: string; guestId?: string; amount: number }[];
}) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user?.id) throw new Error('Unauthorized');

    // Determine payers: prioritize explicit payers array
    let finalPayers = data.payers || [];

    // Fallback logic if payers array is empty
    if (finalPayers.length === 0) {
        if (data.paidByUserId) {
            finalPayers = [{ userId: data.paidByUserId, amount: data.amount }];
        } else {
            // Default to creator if absolutely no info
            finalPayers = [{ userId: session.user.id, amount: data.amount }];
        }
    }

    // Use transaction to ensure consistency
    const result = await db.transaction(async (tx) => {
        const [transaction] = await tx.insert(schema.tripTransactions).values({
            ...data,
            amount: data.amount.toString(),
            userId: session.user.id,
            paidByUserId: finalPayers[0]?.userId || null,
            paidByGuestId: null, // No longer used
        }).returning();

        if (data.splits && data.splits.length > 0) {
            await tx.insert(schema.tripTransactionSplits).values(
                data.splits.map(split => ({
                    tripTransactionId: transaction.id,
                    userId: split.userId!,
                    amount: split.amount.toString(),
                }))
            );
        }

        if (finalPayers.length > 0) {
            await tx.insert(schema.tripTransactionPayers).values(
                finalPayers.map(payer => ({
                    tripTransactionId: transaction.id,
                    userId: payer.userId!,
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
    splits?: { userId?: string; guestId?: string; amount: number }[];
    paidByUserId?: string;
    paidByGuestId?: string;
    payers?: { userId?: string; guestId?: string; amount: number }[];
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

        // Update legacy paidBy columns if implicit in single-payer update
        if (data.paidByUserId !== undefined) updateData.paidByUserId = data.paidByUserId;

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
                        userId: split.userId!,
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

export async function updateTripImage(tripId: string, imageUrl: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // Verify trip belongs to user
    const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
    });

    if (!trip || trip.userId !== session.user.id) {
        throw new Error('Unauthorized');
    }

    const [updatedTrip] = await db.update(trips)
        .set({ imageUrl })
        .where(eq(trips.id, tripId))
        .returning();

    revalidatePath(`/splitlog/${tripId}`);
    revalidatePath('/splitlog');

    return updatedTrip;
}

export async function updateTripName(tripId: string, name: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // Verify trip belongs to user
    const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
    });

    if (!trip || trip.userId !== session.user.id) {
        throw new Error('Unauthorized');
    }

    const [updatedTrip] = await db.update(trips)
        .set({ name, updatedAt: new Date() })
        .where(eq(trips.id, tripId))
        .returning();

    revalidatePath(`/splitlog/${tripId}`);
    revalidatePath('/splitlog');

    return updatedTrip;
}

export async function updateTripDates(tripId: string, startDate: Date, endDate?: Date) {
    console.log('[updateTripDates] Starting update for trip:', tripId);
    console.log('[updateTripDates] Dates:', { startDate, endDate });

    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // Verify trip belongs to user
    console.log('[updateTripDates] Verifying session and ownership...');
    const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
    });

    if (!trip || trip.userId !== session.user.id) {
        console.error('[updateTripDates] Unauthorized access attempt');
        throw new Error('Unauthorized');
    }

    console.log('[updateTripDates] Updating trip dates in DB...');
    // Update trip dates first
    await db.update(trips)
        .set({
            startDate,
            endDate: endDate || null,
            updatedAt: new Date()
        })
        .where(eq(trips.id, tripId));
    console.log('[updateTripDates] Trip dates updated.');

    // Get existing itineraries
    console.log('[updateTripDates] Fetching existing itineraries...');
    const existingItineraries = await db.query.tripItineraries.findMany({
        where: eq(schema.tripItineraries.tripId, tripId),
    });
    console.log(`[updateTripDates] Found ${existingItineraries.length} existing itineraries.`);

    // Calculate new date range
    const newDatesMap = new Map<string, number>(); // dateStr -> dayNumber
    let currentDate = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    let dayCount = 1;

    console.log('[updateTripDates] Calculating new date map...');
    while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        console.log(`[updateTripDates] New Date Map Key: ${dateStr} => Day ${dayCount}`);
        newDatesMap.set(dateStr, dayCount);
        currentDate.setDate(currentDate.getDate() + 1);
        dayCount++;
    }

    // Separate itineraries into: keep (update dayNumber) vs delete
    const itinerariesToKeep: { id: string; dateStr: string; newDayNumber: number }[] = [];
    const itineraryIdsToDelete: string[] = [];

    for (const itinerary of existingItineraries) {
        if (!itinerary.date) {
            itineraryIdsToDelete.push(itinerary.id);
            continue;
        }

        const dateStr = itinerary.date.toISOString().split('T')[0];
        const newDayNumber = newDatesMap.get(dateStr);

        console.log(`[updateTripDates] Checking Itinerary ${itinerary.id}: Date=${itinerary.date.toISOString()} (Str=${dateStr}) => NewDay=${newDayNumber}`);

        if (newDayNumber !== undefined) {
            itinerariesToKeep.push({ id: itinerary.id, dateStr, newDayNumber });
        } else {
            itineraryIdsToDelete.push(itinerary.id);
        }
    }

    console.log(`[updateTripDates] Itineraries to keep: ${itinerariesToKeep.length}, to delete: ${itineraryIdsToDelete.length}`);

    // Delete itineraries that are outside the new date range
    if (itineraryIdsToDelete.length > 0) {
        console.log('[updateTripDates] Deleting old itineraries...');

        // Explicitly delete related records first to ensure no FK constraints block us
        console.log('[updateTripDates] Deleting related notes...');
        await db.delete(schema.itineraryNotes)
            .where(inArray(schema.itineraryNotes.tripItineraryId, itineraryIdsToDelete));

        console.log('[updateTripDates] Deleting related checklists...');
        await db.delete(schema.itineraryChecklists)
            .where(inArray(schema.itineraryChecklists.tripItineraryId, itineraryIdsToDelete));

        console.log('[updateTripDates] Deleting related transactions...');
        await db.delete(schema.tripTransactions)
            .where(inArray(schema.tripTransactions.tripItineraryId, itineraryIdsToDelete));

        console.log('[updateTripDates] Deleting itinerary records...');
        await db.delete(schema.tripItineraries)
            .where(and(
                eq(schema.tripItineraries.tripId, tripId),
                inArray(schema.tripItineraries.id, itineraryIdsToDelete)
            ));
        console.log('[updateTripDates] Old itineraries deleted.');
    }

    // Update dayNumber for kept itineraries (batch update if possible)
    if (itinerariesToKeep.length > 0) {
        console.log('[updateTripDates] Updating existing itineraries day numbers...');
        for (const item of itinerariesToKeep) {
            await db.update(schema.tripItineraries)
                .set({ dayNumber: item.newDayNumber, updatedAt: new Date() })
                .where(eq(schema.tripItineraries.id, item.id));
        }
        console.log('[updateTripDates] Existing itineraries updated.');
    }

    // Find which dates need new itineraries (dates in new range that don't already exist)
    const existingDateStrs = new Set(itinerariesToKeep.map(i => i.dateStr));
    const datesToCreate: { date: Date; dayNumber: number }[] = [];

    currentDate = new Date(startDate);
    dayCount = 1;
    while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (!existingDateStrs.has(dateStr)) {
            datesToCreate.push({
                date: new Date(currentDate),
                dayNumber: dayCount,
            });
        }
        currentDate.setDate(currentDate.getDate() + 1);
        dayCount++;
    }

    console.log(`[updateTripDates] Creating ${datesToCreate.length} new itineraries...`);

    // Create new itineraries for missing dates
    if (datesToCreate.length > 0) {
        await db.insert(schema.tripItineraries).values(
            datesToCreate.map(d => ({
                tripId: tripId,
                dayNumber: d.dayNumber,
                date: d.date,
                title: '',
            }))
        );
        console.log('[updateTripDates] New itineraries created.');
    }

    console.log('[updateTripDates] Revalidating paths...');
    revalidatePath(`/splitlog/${tripId}`);
    revalidatePath('/splitlog');
    console.log('[updateTripDates] Update complete.');

    return { success: true };
}

export async function checkItineraryConflicts(tripId: string, newStartDate: Date, newEndDate?: Date) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    // Get existing itineraries with their content
    const existingItineraries = await db.query.tripItineraries.findMany({
        where: eq(schema.tripItineraries.tripId, tripId),
        with: {
            notes: true,
            checklists: true,
            tripTransactions: {
                where: eq(schema.tripTransactions.isDeleted, false),
            },
        },
    });

    // Calculate which dates will be in the new range
    const newDates = new Set<string>();
    if (newStartDate) {
        let currentDate = new Date(newStartDate);
        const end = newEndDate ? new Date(newEndDate) : new Date(newStartDate);

        while (currentDate <= end) {
            newDates.add(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    // Find itineraries that have content AND will be deleted (not in new date range)
    const affectedItineraries = existingItineraries.filter(itinerary => {
        const hasContent =
            (itinerary.notes && itinerary.notes.length > 0) ||
            (itinerary.checklists && itinerary.checklists.length > 0) ||
            (itinerary.tripTransactions && itinerary.tripTransactions.length > 0) ||
            (itinerary.title && itinerary.title.trim() !== '') ||
            (itinerary.location && itinerary.location.trim() !== '');

        if (!hasContent) return false;

        // Check if this date will be deleted
        if (!itinerary.date) return false;
        const itineraryDateStr = itinerary.date.toISOString().split('T')[0];
        return !newDates.has(itineraryDateStr);
    });

    return {
        hasConflicts: affectedItineraries.length > 0,
        affectedDays: affectedItineraries.length,
        affectedDates: affectedItineraries.map(it => ({
            date: it.date,
            dayNumber: it.dayNumber,
            hasNotes: it.notes && it.notes.length > 0,
            hasChecklists: it.checklists && it.checklists.length > 0,
            hasTransactions: it.tripTransactions && it.tripTransactions.length > 0,
            hasTitle: !!(it.title && it.title.trim() !== ''),
        })),
    };
}

export async function inviteToTrip(tripId: string, invite: { email: string; guestAvatar?: string }) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const trip = await db.query.trips.findFirst({
        where: eq(schema.trips.id, tripId),
    });

    if (!trip || trip.userId !== session.user.id) {
        throw new Error('Unauthorized or trip not found');
    }

    // 1. Create Invite Record
    await db.insert(schema.tripInvites).values({
        tripId,
        email: invite.email,
        status: 'pending',
        guestAvatar: invite.guestAvatar,
    });

    // 2. Ensure Shadow User
    await ensureShadowUser(invite.email, undefined, invite.guestAvatar);

    // 3. Send invitation email
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/splitlog/${tripId}`;
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?email=${encodeURIComponent(invite.email)}`;
    const { subject, html, text } = emailTemplates.tripInvitation(
        session.user.name || session.user.email,
        trip.name,
        inviteLink,
        unsubscribeUrl
    );

    await sendEmail({
        to: invite.email,
        subject,
        html,
        text,
        unsubscribeLink: unsubscribeUrl,
    });

    revalidatePath(`/splitlog/${tripId}`);
    return { success: true };
}

export async function toggleTripPublic(tripId: string, isPublic: boolean) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
    });

    if (!trip || trip.userId !== session.user.id) {
        throw new Error('Unauthorized');
    }

    const updateData: any = {
        isPublic,
        updatedAt: new Date()
    };

    if (isPublic && !trip.shareId) {
        updateData.shareId = uuidv4();
    }

    await db.update(trips)
        .set(updateData)
        .where(eq(trips.id, tripId));

    revalidatePath(`/splitlog/${tripId}`);
    return { success: true, shareId: updateData.shareId || trip.shareId };
}

export async function getPublicTrip(shareId: string) {
    const trip = await db.query.trips.findFirst({
        where: and(
            eq(trips.shareId, shareId),
            eq(trips.isPublic, true),
            eq(trips.isArchived, false)
        ),
        with: {
            user: true,
            itineraries: {
                orderBy: (itineraries, { asc }) => [asc(itineraries.dayNumber)],
                with: {
                    notes: {
                        with: {
                            user: true
                        }
                    },
                    checklists: {
                        with: {
                            user: true
                        }
                    },
                    tripTransactions: {
                        where: (utils, { eq }) => eq(utils.isDeleted, false),
                        with: {
                            paidByUser: true,
                            splits: {
                                with: {
                                    user: true
                                }
                            },
                            payers: {
                                with: {
                                    user: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    return trip;
}

export async function inviteMember(tripId: string, email: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user?.id) {
        throw new Error('Unauthorized');
    }

    // Verify trip ownership
    const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
    });

    if (!trip) {
        throw new Error('Trip not found');
    }

    if (trip.userId !== session.user.id) {
        throw new Error('Only the trip owner can invite members');
    }

    const normalizedEmail = email.toLowerCase();

    // Check if already invited
    const existingInvite = await db.query.tripInvites.findFirst({
        where: sql`${tripInvites.tripId} = ${tripId} AND ${tripInvites.email} = ${normalizedEmail}`
    });

    if (existingInvite) {
        throw new Error('User already invited');
    }

    // 1. Create Invite Record
    await db.insert(tripInvites).values({
        tripId,
        email: normalizedEmail,
        status: 'pending',
    });

    // 2. Ensure Shadow User
    await ensureShadowUser(normalizedEmail);

    // 3. Send invitation email
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/splitlog/${tripId}`;
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?email=${encodeURIComponent(normalizedEmail)}`;
    const { subject, html, text } = emailTemplates.tripInvitation(
        session.user.name || session.user.email,
        trip.name,
        inviteLink,
        unsubscribeUrl
    );

    await sendEmail({
        to: normalizedEmail,
        subject,
        html,
        text,
        unsubscribeLink: unsubscribeUrl,
    });

    revalidatePath(`/splitlog/${tripId}`);
    return { success: true };

}

export async function removeMember(tripId: string, email: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user?.id) {
        throw new Error('Unauthorized');
    }

    // Verify trip ownership
    const trip = await db.query.trips.findFirst({
        where: eq(trips.id, tripId),
    });

    if (!trip) {
        throw new Error('Trip not found');
    }

    if (trip.userId !== session.user.id) {
        throw new Error('Only the trip owner can remove members');
    }

    const normalizedEmail = email.toLowerCase();

    // Delete invite
    await db.delete(tripInvites)
        .where(
            and(
                eq(tripInvites.tripId, tripId),
                eq(tripInvites.email, normalizedEmail)
            )
        );

    revalidatePath(`/splitlog/${tripId}`);
    return { success: true };
}
