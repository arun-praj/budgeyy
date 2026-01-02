'use client';

import { useState, useRef, useEffect } from 'react';
import { updateTripName } from '@/actions/trips';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';

interface EditableTitleProps {
    tripId: string;
    initialName: string;
    className?: string;
}

export function EditableTitle({ tripId, initialName, className }: EditableTitleProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(initialName);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = async () => {
        const trimmedName = name.trim();

        if (!trimmedName) {
            setName(initialName);
            setIsEditing(false);
            return;
        }

        if (trimmedName === initialName) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            await updateTripName(tripId, trimmedName);
            toast.success('Trip name updated');
            setIsEditing(false);
        } catch (error) {
            toast.error('Failed to update trip name');
            setName(initialName);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setName(initialName);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                className={cn(
                    "bg-transparent border-b-2 border-primary outline-none",
                    "text-3xl md:text-4xl font-bold",
                    "w-full max-w-md",
                    isSaving && "opacity-50",
                    className
                )}
            />
        );
    }

    return (
        <h1
            onClick={() => setIsEditing(true)}
            className={cn(
                "text-3xl md:text-4xl font-bold cursor-pointer group inline-flex items-center gap-2",
                "hover:text-primary/80 transition-colors",
                className
            )}
            title="Click to edit"
        >
            {name}
            <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
        </h1>
    );
}
