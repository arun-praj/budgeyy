'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { updateTripNotes } from '@/actions/trips';
import { toast } from 'sonner';
import { Loader2, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TripNotesProps {
    tripId: string;
    initialNotes?: string | null;
}

export function TripNotes({ tripId, initialNotes }: TripNotesProps) {
    const [notes, setNotes] = useState(initialNotes || '');
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setNotes(newValue);
        setIsSaving(true);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(async () => {
            try {
                await updateTripNotes(tripId, newValue);
                setIsSaving(false);
            } catch (error) {
                toast.error('Failed to save notes');
                setIsSaving(false);
            }
        }, 1000);
    };
    return (
        <div className={cn(
            "relative w-full rounded-lg border flex items-start gap-3 p-3 transition-all duration-200",
            "bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200/50 dark:border-yellow-900/30",
            "hover:shadow-sm"
        )}>
            {/* Icon - Left Side */}
            <div className="shrink-0 mt-0.5 text-yellow-600/80">
                <StickyNote className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
                {/* Header: Title */}
                <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold flex items-center gap-1.5 text-yellow-700 dark:text-yellow-500">
                            Note
                        </span>
                    </div>

                    {/* Status Indicator */}
                    {isSaving && (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/40" />
                        </div>
                    )}
                </div>

                <div className="relative">
                    <Textarea
                        value={notes}
                        onChange={handleChange}
                        placeholder="Add trip details..."
                        className={cn(
                            "bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none p-0 text-sm resize-none leading-relaxed w-full placeholder:text-muted-foreground/60 focus:placeholder:text-muted-foreground/30 min-h-[22px]",
                            "text-foreground/90"
                        )}
                        rows={1}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = target.scrollHeight + 'px';
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
