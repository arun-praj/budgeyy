'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';

interface ThemeSyncerProps {
    theme?: 'light' | 'dark' | 'system' | null;
}

export function ThemeSyncer({ theme }: ThemeSyncerProps) {
    const { setTheme } = useTheme();

    useEffect(() => {
        if (theme) {
            setTheme(theme);
        }
    }, [theme, setTheme]);

    return null;
}
