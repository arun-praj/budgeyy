'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth'; // Assuming auth is available here similar to trips.ts
import { headers } from 'next/headers';

export async function reorderItineraryItems(
    items: { type: 'transaction' | 'note' | 'checklist', id: string, order: number, tripItineraryId: string }[],
    tripId: string // For revalidation
) {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) throw new Error('Unauthorized');

    try {
        if (items.length === 0) return;

        await db.transaction(async (tx) => {
            for (const item of items) {
                if (item.type === 'transaction') {
                    await tx.update(schema.tripTransactions)
                        .set({
                            order: item.order,
                            tripItineraryId: item.tripItineraryId
                        })
                        .where(eq(schema.tripTransactions.id, item.id));
                } else if (item.type === 'note') {
                    await tx.update(schema.itineraryNotes)
                        .set({
                            order: item.order,
                            tripItineraryId: item.tripItineraryId
                        })
                        .where(eq(schema.itineraryNotes.id, item.id));
                } else if (item.type === 'checklist') {
                    await tx.update(schema.itineraryChecklists)
                        .set({
                            order: item.order,
                            tripItineraryId: item.tripItineraryId
                        })
                        .where(eq(schema.itineraryChecklists.id, item.id));
                }
            }
        });

        revalidatePath(`/splitlog/[tripId]`); // Revalidate the trip page
    } catch (error) {
        console.error('Failed to reorder items:', error);
        throw new Error('Failed to save order');
    }
}
