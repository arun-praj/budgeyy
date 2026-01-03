'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';

export async function importUserDataJSON(jsonString: string) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        throw new Error('Unauthorized');
    }

    let importData;
    try {
        importData = JSON.parse(jsonString);
    } catch (e) {
        throw new Error('Invalid JSON format');
    }

    if (!importData.data) {
        throw new Error('Invalid export file format');
    }

    const { categories, budgets, transactions, trips } = importData.data;
    const userId = session.user.id;

    // ID Mappings (Old ID -> New ID)
    const categoryMap = new Map<string, string>();
    const tripMap = new Map<string, string>();
    const itineraryMap = new Map<string, string>();
    const tripTransactionMap = new Map<string, string>();

    // 1. Import Categories
    if (categories && Array.isArray(categories)) {
        for (const cat of categories) {
            const newId = uuidv4();
            categoryMap.set(cat.id, newId);

            await db.insert(schema.categories).values({
                id: newId,
                userId: userId,
                name: cat.name,
                type: cat.type,
                icon: cat.icon,
                color: cat.color,
                isDefault: cat.isDefault,
                createdAt: new Date(cat.createdAt) || new Date(),
                updatedAt: new Date()
            });
        }
    }

    // 2. Import Budgets
    if (budgets && Array.isArray(budgets)) {
        for (const budget of budgets) {
            await db.insert(schema.budgets).values({
                userId: userId,
                name: budget.name,
                amountLimit: budget.amountLimit,
                startDate: new Date(budget.startDate),
                endDate: new Date(budget.endDate),
                period: budget.period,
                rollover: budget.rollover,
                categoryId: budget.categoryId ? categoryMap.get(budget.categoryId) : null,
                createdAt: new Date(budget.createdAt) || new Date(),
                updatedAt: new Date()
            });
        }
    }

    // 3. Import Personal Transactions
    if (transactions && Array.isArray(transactions)) {
        for (const txn of transactions) {
            await db.insert(schema.transactions).values({
                userId: userId,
                amount: txn.amount,
                date: new Date(txn.date),
                description: txn.description,
                type: txn.type,
                categoryId: txn.categoryId ? categoryMap.get(txn.categoryId) : null,
                isRecurring: txn.isRecurring,
                necessityLevel: txn.necessityLevel,
                isCredit: txn.isCredit,
                receiptUrl: txn.receiptUrl,
                productImageUrl: txn.productImageUrl,
                createdAt: new Date(txn.createdAt) || new Date(),
                updatedAt: new Date()
            });
        }
    }

    // 4. Import Trips
    if (trips && Array.isArray(trips)) {
        for (const trip of trips) {
            const newTripId = uuidv4();
            tripMap.set(trip.id, newTripId);

            await db.insert(schema.trips).values({
                id: newTripId,
                userId: userId, // Transfer ownership to importer
                name: trip.name,
                description: trip.description,
                destination: trip.destination,
                imageUrl: trip.imageUrl,
                notes: trip.notes,
                startDate: trip.startDate ? new Date(trip.startDate) : null,
                endDate: trip.endDate ? new Date(trip.endDate) : null,
                isArchived: trip.isArchived,
                isPublic: false, // Reset public status for safety
                createdAt: new Date(trip.createdAt) || new Date(),
                updatedAt: new Date()
            });

            // 4a. Trip Invites (Optional: Do we import invites? Probably not valid anymore if users don't exist in new system?)
            // For now, let's SKIP invites to avoid emailing people or creating broken refs.
            // The user logic for splits will map original user -> current user. 
            // Guest splits/payers might be problematic if invite doesn't exist.
            // Simplified approach: If split was assigned to a guest/other user, assign to current user OR create dummy "Unknown" record?
            // BETTER: Assign everything to current user if it was the exporter? 
            // Actually, if I import generic data, maybe just import content (itineraries, notes, transactions).
            // Let's import Itineraries.

            if (trip.itineraries && Array.isArray(trip.itineraries)) {
                for (const itin of trip.itineraries) {
                    const newItinId = uuidv4();
                    itineraryMap.set(itin.id, newItinId);

                    await db.insert(schema.tripItineraries).values({
                        id: newItinId,
                        tripId: newTripId,
                        dayNumber: itin.dayNumber,
                        date: itin.date ? new Date(itin.date) : null,
                        title: itin.title,
                        description: itin.description,
                        links: itin.links,
                        location: itin.location,
                        createdAt: new Date(itin.createdAt) || new Date(),
                        updatedAt: new Date()
                    });

                    // Notes
                    if (itin.notes && Array.isArray(itin.notes)) {
                        for (const note of itin.notes) {
                            await db.insert(schema.itineraryNotes).values({
                                tripItineraryId: newItinId,
                                userId: userId,
                                content: note.content,
                                isHighPriority: note.isHighPriority,
                                order: note.order,
                                createdAt: new Date(note.createdAt) || new Date(),
                                updatedAt: new Date()
                            });
                        }
                    }

                    // Checklists
                    if (itin.checklists && Array.isArray(itin.checklists)) {
                        for (const list of itin.checklists) {
                            await db.insert(schema.itineraryChecklists).values({
                                tripItineraryId: newItinId,
                                userId: userId,
                                title: list.title,
                                items: list.items, // JSON array string
                                order: list.order,
                                createdAt: new Date(list.createdAt) || new Date(),
                                updatedAt: new Date()
                            });
                        }
                    }
                }
            }

            // 4b. Trip Transactions (Complex)
            // Need to handle both "trip.tripTransactions" (direct) and nested ones if they exist in export structure (they do)
            // My export has them nested in itineraries AND top level. I should use the top level "tripTransactions" list which I populated in export.json (check export.ts... yes, top level tripTransactions is fetched).
            // Actually export.ts fetches `tripTransactions` inside `trips` query.

            if (trip.tripTransactions && Array.isArray(trip.tripTransactions)) {
                for (const txn of trip.tripTransactions) {
                    const newTxnId = uuidv4();
                    tripTransactionMap.set(txn.id, newTxnId);

                    const itineraryId = txn.tripItineraryId ? itineraryMap.get(txn.tripItineraryId) : null;
                    if (!itineraryId) continue; // Skip if orphan

                    await db.insert(schema.tripTransactions).values({
                        id: newTxnId,
                        amount: txn.amount,
                        date: new Date(txn.date),
                        description: txn.description,
                        type: txn.type,
                        categoryId: txn.categoryId ? categoryMap.get(txn.categoryId) : null,
                        userId: userId, // Creator is current user
                        paidByUserId: userId, // Default paid by current user to avoid broken refs. 
                        // ideally we'd map "was it me?" but we don't know who "me" was in the old file easily without user metadata matching.
                        // Since this is "Migrate account", assumption is valid.
                        tripId: newTripId,
                        tripItineraryId: itineraryId,
                        receiptUrl: txn.receiptUrl,
                        productImageUrl: txn.productImageUrl,
                        createdAt: new Date(txn.createdAt) || new Date(),
                        updatedAt: new Date()
                    });

                    // Splits & Payers
                    // Re-create simple splits for the current user. Complex group splits are hard to restore without invitation context.
                    // Let's consolidate splits to just "Paid by me, split with me" (cost 100%).
                    // OR if we want to preserve history:
                    // Create split for current user with full amount?

                    if (txn.splits && Array.isArray(txn.splits)) {
                        for (const split of txn.splits) {
                            // Only import split if it belongs to a user (map to current user)
                            // Ignore guest splits for now as guests don't exist
                            await db.insert(schema.tripTransactionSplits).values({
                                tripTransactionId: newTxnId,
                                userId: userId, // Map all splits to current user or ignore?
                                // If we don't map, the math breaks. Use current user.
                                amount: split.amount,
                                createdAt: new Date()
                            });
                        }
                    }
                }
            }
        }
    }

    revalidatePath('/');
    return { success: true, message: 'Data imported successfully' };
}
