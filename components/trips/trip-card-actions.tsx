'use client';

import { ReactNode } from 'react';

interface TripCardActionsProps {
    children: ReactNode;
}

export function TripCardActions({ children }: TripCardActionsProps) {
    return (
        <div
            className="absolute top-4 right-4 z-20 flex gap-2"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    );
}
