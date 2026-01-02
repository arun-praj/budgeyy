'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon, Pencil, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import { updateTripDates, checkItineraryConflicts } from '@/actions/trips';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EditableDateRangeProps {
    tripId: string;
    startDate: Date | null;
    endDate: Date | null;
}

interface ConflictInfo {
    hasConflicts: boolean;
    affectedDays: number;
    affectedDates: {
        date: Date | null;
        dayNumber: number;
        hasNotes: boolean;
        hasChecklists: boolean;
        hasTransactions: boolean;
        hasTitle: boolean;
    }[];
}

export function EditableDateRange({ tripId, startDate, endDate }: EditableDateRangeProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
    const [countdown, setCountdown] = useState(5);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startDate || undefined,
        to: endDate || undefined,
    });
    const [originalDateRange, setOriginalDateRange] = useState<DateRange | undefined>({
        from: startDate || undefined,
        to: endDate || undefined,
    });

    // Update state when props change (e.g. after router.refresh)
    useEffect(() => {
        const newRange = {
            from: startDate || undefined,
            to: endDate || undefined,
        };
        setDateRange(newRange);
        setOriginalDateRange(newRange);
    }, [startDate, endDate]);

    // Start countdown when dialog opens
    useEffect(() => {
        if (showConfirmDialog) {
            setCountdown(5);
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [showConfirmDialog]);

    const handleSelect = (range: DateRange | undefined) => {
        setDateRange(range);
    };

    const handleConfirm = async () => {
        if (!dateRange?.from) {
            toast.error('Please select a start date');
            return;
        }

        setIsChecking(true);
        try {
            // Check for conflicts first
            const conflicts = await checkItineraryConflicts(tripId, dateRange.from, dateRange.to || undefined);

            if (conflicts.hasConflicts) {
                // Show confirmation dialog
                setConflictInfo(conflicts);
                setShowConfirmDialog(true);
                setIsChecking(false);
                return;
            }

            // No conflicts, proceed with save
            await saveChanges();
            setIsChecking(false);
        } catch (error) {
            toast.error('Failed to check for conflicts');
            console.error(error);
            setIsChecking(false);
        }
    };

    const saveChanges = async () => {
        if (!dateRange?.from) return;

        setIsSaving(true);
        setIsChecking(false); // Reset checking state
        try {
            await updateTripDates(tripId, dateRange.from, dateRange.to || undefined);
            toast.success('Trip dates and itinerary updated');
            setIsOpen(false);
            setShowConfirmDialog(false);
            router.refresh(); // Refresh server components to update data
        } catch (error) {
            toast.error('Failed to update dates');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setDateRange(originalDateRange);
        setIsOpen(false);
    };

    const handleConfirmDelete = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent AlertDialogAction from auto-closing
        await saveChanges();
    };

    const handleCancelDelete = () => {
        setShowConfirmDialog(false);
        setConflictInfo(null);
    };

    const formatDateDisplay = () => {
        const displayRange = dateRange || originalDateRange;
        if (!displayRange?.from) return 'No Date';

        if (displayRange.to) {
            return `${format(displayRange.from, 'MMM d')} - ${format(displayRange.to, 'MMM d, yyyy')}`;
        }
        return format(displayRange.from, 'MMM d, yyyy');
    };

    const formatAffectedDates = () => {
        if (!conflictInfo?.affectedDates) return '';
        return conflictInfo.affectedDates
            .filter(d => d.date !== null)
            .map(d => format(new Date(d.date!), 'MMM d'))
            .join(' and ');
    };

    const getContentTypes = () => {
        if (!conflictInfo?.affectedDates) return [];
        const types = new Set<string>();
        conflictInfo.affectedDates.forEach(d => {
            if (d.hasNotes) types.add('notes');
            if (d.hasChecklists) types.add('checklists');
            if (d.hasTransactions) types.add('expenses');
            if (d.hasTitle) types.add('itinerary details');
        });
        return Array.from(types);
    };

    const formatContentTypes = () => {
        const types = getContentTypes();
        if (types.length === 0) return 'content';
        if (types.length === 1) return types[0];
        if (types.length === 2) return `${types[0]} and ${types[1]}`;
        return types.slice(0, -1).join(', ') + ', and ' + types[types.length - 1];
    };

    return (
        <>
            <Popover open={isOpen} onOpenChange={(open) => {
                // Only reset if we are NOT saving, NOT checking, and NOT showing confirm dialog
                if (!open && !isSaving && !isChecking && !showConfirmDialog) {
                    setDateRange(originalDateRange);
                }
                setIsOpen(open);
            }}>
                <PopoverTrigger asChild>
                    <button
                        className={cn(
                            "flex items-center text-muted-foreground hover:text-foreground transition-colors group cursor-pointer",
                            isSaving && "opacity-50"
                        )}
                        disabled={isSaving}
                    >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <span>{formatDateDisplay()}</span>
                        <Pencil className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={handleSelect}
                        numberOfMonths={2}
                        disabled={(date) => date < new Date('1900-01-01')}
                    />
                    <div className="flex items-center justify-end gap-2 p-3 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            disabled={isSaving || isChecking}
                        >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirm}
                            disabled={isSaving || isChecking || !dateRange?.from}
                        >
                            {(isSaving || isChecking) ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4 mr-1" />
                            )}
                            {isChecking ? 'Checking...' : 'Confirm'}
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Confirm Date Change
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>
                                    Hey, to change the dates, we need to delete <strong>{formatContentTypes()}</strong> you&apos;d added to{' '}
                                    <strong>{conflictInfo?.affectedDays} day{conflictInfo?.affectedDays !== 1 ? 's' : ''}</strong>{' '}
                                    in your itinerary.
                                </p>
                                <p>
                                    Specifically, we&apos;ll delete content on <strong>{formatAffectedDates()}</strong>.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    If you don&apos;t want us to delete your {formatContentTypes()}, you should first move them to other days.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelDelete} disabled={isSaving}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isSaving || countdown > 0}
                            className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 disabled:text-white/80"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            {countdown > 0 ? `Wait ${countdown}s...` : 'Yes, delete all records'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
