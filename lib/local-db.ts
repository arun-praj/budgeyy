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

export class LocalDatabase extends Dexie {
    transactions!: Table<LocalTransaction>;

    constructor() {
        super('BudgeyyOfflineDB');
        this.version(1).stores({
            transactions: '++id, synced, createdAt'
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
