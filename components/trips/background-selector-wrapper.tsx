'use client';

import { useState } from 'react';
import { BackgroundSelector } from './background-selector';
import { Pencil } from 'lucide-react';

interface BackgroundSelectorWrapperProps {
    tripId: string;
    currentImage?: string | null;
}

export function BackgroundSelectorWrapper({ tripId, currentImage }: BackgroundSelectorWrapperProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors backdrop-blur-sm"
                aria-label="Change background"
            >
                <Pencil className="h-5 w-5" />
            </button>

            <BackgroundSelector
                open={isOpen}
                onOpenChange={setIsOpen}
                tripId={tripId}
                currentImage={currentImage}
            />
        </>
    );
}
