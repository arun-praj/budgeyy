'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const SyncProvider = dynamic(
    () => import('./sync-provider').then((mod) => mod.SyncProvider),
    {
        ssr: false,
    }
);

export function SyncWrapper({ children }: { children: React.ReactNode }) {
    return <SyncProvider>{children}</SyncProvider>;
}
