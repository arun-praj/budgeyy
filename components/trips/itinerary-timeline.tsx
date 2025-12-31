'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { MapPin, StickyNote, CheckSquare, MoreHorizontal, Pencil, Plus, DollarSign, X, Trash2, Check, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateItineraryDay, createItineraryNote, updateItineraryNote, createItineraryChecklist, deleteItineraryNote, deleteItineraryChecklist, deleteTripTransaction } from '@/actions/trips';
import { createTransaction } from '@/actions/transactions';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useDebounce } from 'use-debounce';

interface ItineraryItem {
    id: string;
    dayNumber: number;
    date: Date | null;
    title: string | null;
    location: string | null;
    transactions: any[];
    notes: any[];
    checklists: any[];
    tripId: string;
}

interface ItineraryTimelineProps {
    items: ItineraryItem[];
    categories?: any[];
}

export function ItineraryTimeline({ items, categories = [] }: ItineraryTimelineProps) {
    // Add Item State
    const [activeDayId, setActiveDayId] = useState<string | null>(null);
    const [dialogType, setDialogType] = useState<'checklist' | 'expense' | null>(null);
    const [activeTripId, setActiveTripId] = useState<string | null>(null);

    // Inline Note Creation State
    const [pendingNoteDayId, setPendingNoteDayId] = useState<string | null>(null);

    // Form States
    const [checklistTitle, setChecklistTitle] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDesc, setExpenseDesc] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);


    const handleOpenDialog = (type: 'checklist' | 'expense', dayId: string, tripId: string) => {
        setDialogType(type);
        setActiveDayId(dayId);
        setActiveTripId(tripId);
        // Reset forms
        setChecklistTitle('');
        setExpenseAmount('');
        setExpenseDesc('');
        setExpenseCategory('');
    };

    const handleCreateNote = (dayId: string) => {
        setPendingNoteDayId(dayId);
    };

    const handleCloseDialog = () => {
        setDialogType(null);
        setActiveDayId(null);
        setActiveTripId(null);
        setIsSubmitting(false);
    };

    const handleClosePendingNote = () => {
        setPendingNoteDayId(null);
    }

    const activeItem = items.find(i => i.id === activeDayId);

    const handleSubmitChecklist = async () => {
        if (!activeDayId || !checklistTitle.trim()) return;
        setIsSubmitting(true);
        try {
            await createItineraryChecklist(activeDayId, checklistTitle);
            toast.success('Checklist added');
            handleCloseDialog();
        } catch (error) {
            toast.error('Failed to add checklist');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitExpense = async () => {
        if (!activeDayId || !expenseAmount || !activeTripId) return;
        setIsSubmitting(true);
        try {
            await createTransaction({
                amount: parseFloat(expenseAmount),
                date: activeItem?.date ? activeItem.date.toISOString() : new Date().toISOString(),
                description: expenseDesc || 'Trip Expense',
                type: 'expense',
                categoryId: expenseCategory || undefined,
                tripId: activeTripId,
                tripItineraryId: activeDayId,
                isCredit: false,
            });
            toast.success('Expense added');
            handleCloseDialog();
        } catch (error) {
            toast.error('Failed to add expense');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteNote = async (id: string) => {
        try {
            await deleteItineraryNote(id);
            toast.success('Note deleted');
        } catch (error) {
            toast.error('Failed to delete note');
        }
    };

    const handleDeleteChecklist = async (id: string) => {
        try {
            await deleteItineraryChecklist(id);
            toast.success('Checklist deleted');
        } catch (error) {
            toast.error('Failed to delete checklist');
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        try {
            await deleteTripTransaction(id);
            toast.success('Transaction deleted');
        } catch (error) {
            toast.error('Failed to delete transaction');
        }
    };

    if (!items?.length) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No itinerary items yet. Start adding days to your trip!
            </div>
        );
    }

    const sortedItems = [...items].sort((a, b) => a.dayNumber - b.dayNumber);

    return (
        <div className="relative w-full space-y-0 pb-12">
            {sortedItems.map((item, index) => {
                const isLast = index === sortedItems.length - 1;

                return (
                    <div key={item.id} className="relative flex group">
                        {/* Timeline Line (Left) */}
                        <div className="flex flex-col items-center mr-6">
                            {/* Day Icon/Dot */}
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 border-2 border-background z-10 relative">
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    {item.dayNumber}
                                </span>
                            </div>
                            {/* Vertical Line */}
                            {!isLast && (
                                <div className="w-0.5 bg-gray-200 dark:bg-gray-800 flex-1 my-1" />
                            )}
                        </div>

                        {/* Content (Right) */}
                        <div className="flex-1 pb-10 relative">



                            {/* Header */}
                            <div className="mb-0 pt-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-foreground leading-none">
                                        {item.date ? format(new Date(item.date), 'EEEE, MMMM do') : `Day ${item.dayNumber}`}
                                    </h3>
                                </div>

                                {/* Editable Title & Location */}
                                <ItineraryTitleEditor id={item.id} initialTitle={item.title} initialLocation={item.location} />

                            </div>

                            {/* Timeline Content Nodes */}
                            <div className="space-y-4 mt-4">
                                {/* Transactions Node */}
                                {item.transactions?.length > 0 && (
                                    <div className="relative">
                                        {item.transactions.map((txn: any) => (
                                            <div key={txn.id} className="flex items-start gap-3 mb-3 relative pl-6 group/item">
                                                {/* Branch Line style */}
                                                {/* Curved Branch Line */}
                                                <div className="absolute -left-10 top-0 h-[14px] w-16 border-b-2 border-l-2 border-gray-200 dark:border-gray-800 rounded-bl-xl" />

                                                <div className="h-6 w-6 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                                                    $
                                                </div>
                                                <div className="flex-1 text-sm flex justify-between items-start">
                                                    <div>
                                                        <div className="font-medium">{txn.description || 'Expense'}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {txn.amount}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDeleteTransaction(txn.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Notes Node */}
                                {(item.notes?.length > 0 || pendingNoteDayId === item.id) && (
                                    <div className="relative">
                                        {item.notes.map((note: any) => (
                                            <ItineraryNoteEditor
                                                key={note.id}
                                                id={note.id}
                                                initialContent={note.content}
                                                initialPriority={note.isHighPriority}
                                                onDelete={() => handleDeleteNote(note.id)}
                                            />
                                        ))}
                                        {/* Pending Note Input */}
                                        {pendingNoteDayId === item.id && (
                                            <ItineraryNoteEditor
                                                isNew
                                                itineraryId={item.id}
                                                initialPriority={false}
                                                onCancel={handleClosePendingNote}
                                                onNoteCreated={handleClosePendingNote}
                                            />
                                        )}
                                    </div>
                                )}


                                {/* Checklists Node */}
                                {item.checklists?.length > 0 && item.checklists.map((list: any) => (
                                    <div key={list.id} className="relative pl-6 group/item">
                                        <div className="absolute -left-10 top-0 h-[14px] w-16 border-b-2 border-l-2 border-gray-200 dark:border-gray-800 rounded-bl-xl" />

                                        <div className="flex gap-3">
                                            <div className="h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                                                <CheckSquare className="h-3 w-3" />
                                            </div>
                                            <div className="w-full">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-sm font-medium">{list.title}</div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDeleteChecklist(list.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <div className="space-y-1">
                                                    {JSON.parse(list.items || '[]').map((checkItem: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <div className={`h-3 w-3 rounded-full border ${checkItem.checked ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground'} flex items-center justify-center`}>
                                                                {checkItem.checked && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                                                            </div>
                                                            <span className={checkItem.checked ? 'line-through opacity-70' : ''}>{checkItem.text}</span>
                                                        </div>
                                                    ))}
                                                    <div className="text-xs text-muted-foreground italic pl-6 pt-1 opacity-50">
                                                        Add items coming soon...
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {/* Quick Add Toolbar - Permanent Branch */}
                                <div className="relative pl-6 group/item mt-4 opacity-50 hover:opacity-100 transition-opacity focus-within:opacity-100">
                                    {/* Connector */}
                                    <div className="absolute -left-10 top-0 h-[14px] w-16 border-b-2 border-l-2 border-gray-200 dark:border-gray-800 rounded-bl-xl" />

                                    <div className="flex items-center gap-3">
                                        {/* Dot/Icon */}
                                        <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center shrink-0">
                                            <div className="h-2 w-2 rounded-full bg-current" />
                                        </div>

                                        {/* Input & Actions Container */}
                                        <div className="relative flex-1 flex items-center gap-2">
                                            <div className="relative w-full">
                                                <Input
                                                    placeholder="Add a place..."
                                                    className="pl-3 pr-24 h-9 bg-transparent border-transparent hover:bg-muted/30 focus:bg-muted/30 focus:border-input transition-colors rounded-lg shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                                                    onKeyDown={async (e) => {
                                                        if (e.key === 'Enter') {
                                                            const val = e.currentTarget.value.trim();
                                                            if (val) {
                                                                await createItineraryNote(item.id, val);
                                                                e.currentTarget.value = '';
                                                                toast.success('Added');
                                                            }
                                                        }
                                                    }}
                                                />
                                                {/* Action Icons Overlay */}
                                                <div className="absolute right-1 top-1 flex items-center gap-0.5 h-7 bg-background/50 backdrop-blur-[1px] rounded-md px-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground/60 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                        onClick={() => handleCreateNote(item.id)}
                                                        title="Add Note"
                                                    >
                                                        <StickyNote className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground/60 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                        onClick={() => handleOpenDialog('checklist', item.id, item.tripId)}
                                                        title="Add Checklist"
                                                    >
                                                        <CheckSquare className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground/60 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                        onClick={() => handleOpenDialog('expense', item.id, item.tripId)}
                                                        title="Add Expense"
                                                    >
                                                        <DollarSign className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Dialogs */}

            <Dialog open={dialogType === 'checklist'} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Checklist</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Checklist Title</Label>
                        <Input
                            value={checklistTitle}
                            onChange={(e) => setChecklistTitle(e.target.value)}
                            placeholder="Packing List, Places to Eat..."
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                        <Button onClick={handleSubmitChecklist} disabled={isSubmitting}>Create Checklist</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={dialogType === 'expense'} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Expense</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                value={expenseAmount}
                                onChange={(e) => setExpenseAmount(e.target.value)}
                                placeholder="0.00"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Input
                                value={expenseDesc}
                                onChange={(e) => setExpenseDesc(e.target.value)}
                                placeholder="What was this for?"
                                className="mt-1.5"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                        <Button onClick={handleSubmitExpense} disabled={isSubmitting}>Add Expense</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

// ... ItineraryTitleEditor remains the same ...
function ItineraryTitleEditor({ id, initialTitle, initialLocation }: { id: string; initialTitle: string | null, initialLocation: string | null }) {
    const [title, setTitle] = useState(initialTitle || '');
    const [location, setLocation] = useState(initialLocation || '');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (title === initialTitle && location === initialLocation) {
            setIsEditing(false);
            return;
        }

        setIsLoading(true);
        try {
            await updateItineraryDay(id, { title, location });
            toast.success('Updated successfully');
            setIsEditing(false);
        } catch (error) {
            toast.error('Failed to update');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    if (isEditing) {
        return (
            <div className="flex flex-col gap-2 p-2 bg-muted/20 rounded-md border mt-1 w-full max-w-md z-20 relative">
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title (e.g. Shopping Day)"
                    className="h-8 text-sm font-medium"
                    autoFocus
                    disabled={isLoading}
                    onKeyDown={handleKeyDown}
                />
                <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Location (e.g. Kathmandu -> Pokhara)"
                        className="h-8 text-sm"
                        disabled={isLoading}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                <div className="flex justify-end gap-2 mt-1">
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 px-2">Cancel</Button>
                    <Button size="sm" onClick={handleSave} className="h-7 px-2">Save</Button>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="group/title flex items-center flex-wrap gap-2 mt-0 cursor-pointer hover:bg-muted/30 p-0.5 -ml-1 rounded px-1 w-fit transition-colors max-w-full"
        >
            {title ? (
                <span className="font-medium text-foreground">{title}</span>
            ) : (
                <span className="text-muted-foreground/50 text-sm italic">
                    Add title...
                </span>
            )}

            {(location || title) && (
                <span className="text-muted-foreground mx-1">•</span>
            )}

            {location ? (
                <span className="text-muted-foreground flex items-center text-sm">
                    <MapPin className="h-3 w-3 mr-1" />
                    {location}
                </span>
            ) : (
                <span className="text-muted-foreground/40 text-sm italic group-hover/title:opacity-100 opacity-0 transition-opacity flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    Add location
                </span>
            )}

            <Pencil className="h-3 w-3 text-muted-foreground/0 group-hover/title:text-muted-foreground/50 transition-colors ml-2" />
        </div>
    );
}

// Inline Note Editor Component
function ItineraryNoteEditor({
    id,
    initialContent = '',
    initialPriority = false,
    isNew = false,
    itineraryId,
    onCancel,
    onNoteCreated,
    onDelete
}: {
    id?: string;
    initialContent?: string;
    initialPriority?: boolean;
    isNew?: boolean;
    itineraryId?: string; // Required if isNew
    onCancel?: () => void;
    onNoteCreated?: () => void;
    onDelete?: () => void;
}) {
    const [content, setContent] = useState(initialContent);
    const [isPriority, setIsPriority] = useState(initialPriority);
    const [noteId, setNoteId] = useState(id);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [debouncedContent] = useDebounce(content, 1000);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    useEffect(() => {
        const save = async () => {
            if (debouncedContent === initialContent && isPriority === initialPriority && !isNew) return;
            if (!debouncedContent.trim()) return;

            setStatus('saving');
            try {
                if (isNew && !noteId && itineraryId) {
                    const newNote = await createItineraryNote(itineraryId, debouncedContent, isPriority);
                    setNoteId(newNote?.id);
                    if (onNoteCreated) onNoteCreated();
                    setStatus('saved');
                } else if (noteId) {
                    await updateItineraryNote(noteId, debouncedContent, isPriority);
                    setStatus('saved');
                }
            } catch (error) {
                setStatus('error');
            }
        };

        if (debouncedContent || isNew || isPriority !== initialPriority) {
            save();
        }

        const timer = setTimeout(() => {
            if (status === 'saved') setStatus('idle');
        }, 2000);
        return () => clearTimeout(timer);

    }, [debouncedContent, isPriority, isNew, itineraryId, noteId, initialContent, initialPriority, onNoteCreated]);


    const togglePriority = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPriority(!isPriority);
    };

    return (
        <div className="relative pl-6 group/item mb-3">
            {/* Connector */}
            <div className="absolute -left-10 top-0 h-[14px] w-16 border-b-2 border-l-2 border-gray-200 dark:border-gray-800 rounded-bl-xl" />

            <div className="relative group/note">
                {/* Note Card */}
                <div className={cn(
                    "relative w-full rounded-lg border flex items-start gap-3 p-3 transition-all duration-200",
                    isPriority
                        ? "bg-red-50/50 dark:bg-red-900/10 border-red-200/60 dark:border-red-900/30"
                        : "bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200/50 dark:border-yellow-900/30",
                    "hover:shadow-sm"
                )}>
                    {/* Icon - Flex Item, not absolute */}
                    <div
                        onClick={togglePriority}
                        className={cn(
                            "shrink-0 mt-0.5 cursor-pointer transition-transform active:scale-95 hover:scale-110",
                            isPriority ? "text-red-500" : "text-yellow-600/80"
                        )}
                        title="Toggle Priority"
                    >
                        {isPriority ? <AlertCircle className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
                    </div>

                    <Textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write a note..."
                        className={cn(
                            "bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none p-0 text-sm h-auto resize-none leading-relaxed w-full placeholder:text-muted-foreground/60 focus:placeholder:text-muted-foreground/30 min-h-[22px]",
                            "text-foreground/90" // Always normal weight
                        )}
                        rows={1}
                        autoFocus={isNew}
                        onBlur={() => {
                            if (isNew && !content.trim() && onCancel) onCancel();
                        }}
                    />

                    {/* Status/Actions Absolute Top-Right */}
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                        {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/40" />}
                        {status === 'saved' && <Check className="h-3 w-3 text-emerald-500/60" />}

                        {!isNew && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover/note:opacity-100 transition-all text-muted-foreground/40 hover:text-destructive hover:bg-transparent -mr-1"
                                onClick={onDelete}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
