'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
// We need to dinamically import the component because it might use window/svg logic not suitable for SSR
// But react-notion-avatar is usually fine. Let's try direct import first, if fails use dynamic.
// Actually, let's look at how to use it. Usually it is `import Avatar from 'react-notion-avatar'`.

// @ts-ignore
import Avatar, { getRandomConfig } from 'react-notion-avatar';

interface NotionAvatarProps {
    className?: string;
    config?: any; // We'll improve this type
}

export function NotionAvatar({ className, config }: NotionAvatarProps) {
    // If no config provided, generate a random one
    const avatarConfig = config || getRandomConfig();

    return (
        <div className={cn("w-full h-full", className)}>
            <Avatar style={{ width: '100%', height: '100%' }} config={avatarConfig} />
        </div>
    );
}

export const genConfig = getRandomConfig;
