'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { updateTripNotes } from '@/actions/trips';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">Notes</h3>
                {isSaving && (
                    <div className="flex items-center text-xs text-muted-foreground animate-pulse">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Saving...
                    </div>
                )}
            </div>
            <Textarea
                value={notes}
                onChange={handleChange}
                placeholder="Write or paste anything here: how to get around, tips and tricks..."
                className="min-h-[200px] resize-none bg-muted/30 border-dashed focus:border-solid transition-all"
            />
        </div>
    );
}
