import Dexie, { Table } from 'dexie';
import type { TransactionType, NecessityLevel } from '@/types';

export interface LocalTransaction {
    id?: number; // Auto-increment for local
    amount: number;
    date: string; // ISO string
    description: string;
    type: TransactionType;
    categoryId?: string;
    categoryName?: string; // Cache for display
    isRecurring?: boolean;
    necessityLevel?: NecessityLevel;
    synced: 0 | 1;
    createdAt: number;
}

export interface CachedTransaction {
    id: string; // Server UUID
    amount: string;
    date: string;
    description: string | null;
    type: string;
    categoryId: string | null;
    categoryName?: string;
    isRecurring: boolean | null;
    necessityLevel: string | null;
    userId: string;
    createdAt: string;
}

export interface CachedUserProfile {
    id: string; // 'custom-user-id' usually or just key 'profile'
    fullName: string | null;
    email: string;
    currency: string | null;
    calendarPreference: string | null;
    theme: string | null;
    country: string | null;
}

export class LocalDatabase extends Dexie {
    transactions!: Table<LocalTransaction>;
    cachedTransactions!: Table<CachedTransaction>;
    userProfile!: Table<CachedUserProfile>;

    constructor() {
        super('BudgeyyOfflineDB');
        this.version(2).stores({
            transactions: '++id, synced, createdAt',
            cachedTransactions: 'id, date', // Key by ID
            userProfile: 'id' // Singleton basically
        }).upgrade(tx => {
            // Migration not strictly needed as new stores are independent
        });
    }
}

export const db = new LocalDatabase();

export async function addOfflineTransaction(data: Omit<LocalTransaction, 'id' | 'synced' | 'createdAt'>) {
    return await db.transactions.add({
        ...data,
        synced: 0,
        createdAt: Date.now()
    });
}

export async function getUnsyncedTransactions() {
    return await db.transactions.where('synced').equals(0).toArray();
}

export async function markAsSynced(id: number) {
    return await db.transactions.update(id, { synced: 1 });
}

export async function deleteLocalTransaction(id: number) {
    return await db.transactions.delete(id);
}

export async function cacheTransactions(transactions: any[]) {
    await db.cachedTransactions.clear();
    return await db.cachedTransactions.bulkPut(transactions);
}

export async function getCachedTransactions() {
    return await db.cachedTransactions.toArray();
}

export async function cacheUserProfile(profile: any) {
    if (!profile) return;
    return await db.userProfile.put({ ...profile, id: 'profile' });
}

export async function getCachedUserProfile() {
    return await db.userProfile.get('profile');
}
