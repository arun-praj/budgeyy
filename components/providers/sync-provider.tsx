'use client';

import { useEffect, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status'; // We might need to create this hook or just use event listeners
import { getUnsyncedTransactions, markAsSynced, deleteLocalTransaction } from '@/lib/local-db';
import { syncTransactions } from '@/actions/sync';
import { toast } from 'sonner';

export function SyncProvider({ children }: { children: React.ReactNode }) {
    // Basic online check
    // Create a simple hook logic inline or separate? Inline is fine for now.

    const sync = useCallback(async () => {
        if (!navigator.onLine) return;

        const unsynced = await getUnsyncedTransactions();
        if (unsynced.length === 0) return;

        toast.loading('Syncing offline transactions...', { id: 'sync-toast' });

        try {
            const result = await syncTransactions(unsynced);

            if (result.success) {
                // If success, we can delete them from local DB or just mark as synced
                // For this MVP, let's delete them to keep local DB clean, 
                // OR mark as synced if we want to support offline viewing of history (hybrid approach).
                // Given the requirement "auto sync... maintain consistency", 
                // deleting them locally and letting the main main queries fetch them from server is safe 
                // IF we trust the server connection.
                // However, user might immediately go offline again.
                // Hybrid approach is complex. 
                // Let's delete synced items from "offline queue" (which is what local-db is right now).

                await Promise.all(unsynced.map(tx => deleteLocalTransaction(tx.id!)));

                toast.success(`Synced ${unsynced.length} transactions`, { id: 'sync-toast' });
            } else {
                toast.error('Sync failed. Will retry later.', { id: 'sync-toast' });
            }
        } catch (e) {
            console.error('Sync error', e);
            toast.error('Sync error', { id: 'sync-toast' });
        }
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            console.log('Online! Syncing...');
            sync();
        };

        window.addEventListener('online', handleOnline);

        // Initial check on mount
        if (navigator.onLine) {
            sync();
        }

        return () => window.removeEventListener('online', handleOnline);
    }, [sync]);

    return <>{children}</>;
}
