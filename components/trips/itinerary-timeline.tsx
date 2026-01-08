'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { MapPin, StickyNote, CheckSquare, MoreHorizontal, Pencil, Plus, DollarSign, X, Trash2, Check, Loader2, AlertCircle, GripVertical, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateItineraryDay, createItineraryNote, updateItineraryNote, createItineraryChecklist, updateItineraryChecklist, deleteItineraryNote, deleteItineraryChecklist, deleteTripTransaction, createTripTransaction, updateTripTransaction, updateTripDates, deleteItineraryDay } from '@/actions/trips';
import { reorderItineraryItems } from '@/actions/dnd';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from '@/types';
import { NotionAvatar } from '@/components/avatars/notion-avatar';
import { AvatarConfig } from '@/components/avatars/notion-avatar/types';

interface ItineraryItem {
    id: string;
    dayNumber: number;
    date: Date | null;
    title: string | null;
    location: string | null;
    tripTransactions: any[];
    notes: any[];
    checklists: any[];
    tripId: string;
}

type UnifiedItineraryItem =
    | { type: 'transaction', data: any, id: string, order: number }
    | { type: 'note', data: any, id: string, order: number }
    | { type: 'checklist', data: any, id: string, order: number };

interface DayWithUnifiedItems extends ItineraryItem {
    unifiedItems: UnifiedItineraryItem[];
}

interface ItineraryTimelineProps {
    items: ItineraryItem[];
    categories?: any[];
    tripId: string;
    members: { id: string; name: string | null; email: string; image?: string | null; isGuest?: boolean }[];
    currentUser: { id: string; name?: string | null; email: string; image?: string | null; currency?: string | null };
    startDate: Date | null;
    endDate: Date | null;
    readOnly?: boolean;
}

// Helper to parse avatar config
const getAvatarConfig = (avatarJson: string | null | undefined): AvatarConfig => {
    if (!avatarJson) return {
        body: 0, eyebrows: 0, eyes: 0, glass: 0, hair: 0, mouth: 0,
        accessory: 0, face: 0, beard: 0, detail: 0
    };
    try {
        return JSON.parse(avatarJson);
    } catch {
        return {
            body: 0, eyebrows: 0, eyes: 0, glass: 0, hair: 0, mouth: 0,
            accessory: 0, face: 0, beard: 0, detail: 0
        };
    }
};

export function ItineraryTimeline({ items, categories = [], tripId, members = [], currentUser, startDate, endDate, readOnly = false }: ItineraryTimelineProps) {
    // ... (state lines 59-136 omitted for brevity, keeping same)
    // Add Item State
    const [activeDayId, setActiveDayId] = useState<string | null>(null);
    const [dialogType, setDialogType] = useState<'checklist' | 'expense' | null>(null);
    const [activeTripId, setActiveTripId] = useState<string | null>(null);

    // Split State
    const [payerId, setPayerId] = useState<string>(currentUser?.id || '');
    const [splitType, setSplitType] = useState<'equal' | 'specific' | 'none'>('equal');
    const [selectedSplitUsers, setSelectedSplitUsers] = useState<string[]>([]); // ids
    const [isMultiPayer, setIsMultiPayer] = useState(false);
    const [multiPayerAmounts, setMultiPayerAmounts] = useState<Record<string, string>>({}); // userId -> amount string

    // Edit Mode State
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);



    useEffect(() => {
        if (members.length > 0) {
            setSelectedSplitUsers(members.map(m => m.id));
        }
    }, [members]);

    // Helper to parse avatar config


    // Inline Note Creation State
    const [pendingNoteDayId, setPendingNoteDayId] = useState<string | null>(null);

    // Form States
    const [checklistTitle, setChecklistTitle] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDesc, setExpenseDesc] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAddingDay, setIsAddingDay] = useState(false);


    const handleOpenDialog = (type: 'checklist' | 'expense', dayId: string, tripId: string) => {
        setDialogType(type);
        setActiveDayId(dayId);
        setActiveTripId(tripId);
        // Reset forms
        setChecklistTitle('');
        setExpenseAmount('');
        setExpenseDesc('');
        setExpenseCategory('');
        // Reset split state
        setPayerId(currentUser?.id || '');
        setSplitType('equal');
        setSelectedSplitUsers(members.map(m => m.id));
        setIsMultiPayer(false);
        setMultiPayerAmounts({});
    };

    const handleCreateNote = (dayId: string) => {
        setPendingNoteDayId(dayId);
    };

    const handleCloseDialog = () => {
        setDialogType(null);
        setActiveDayId(null);
        setActiveTripId(null);
        setIsSubmitting(false);
        setEditingTransactionId(null);
        // Clean forms
        setChecklistTitle('');
        setExpenseAmount('');
        setExpenseDesc('');
        setExpenseCategory('');
        setPayerId(currentUser?.id || '');
        setSplitType('equal');
        setSelectedSplitUsers(members.map(m => m.id));
        setIsMultiPayer(false);
        setMultiPayerAmounts({});
    };

    const handleClosePendingNote = () => {
        setPendingNoteDayId(null);
    }

    const activeItem = items.find(i => i.id === activeDayId);

    // Currency Helper
    const userCurrency = currentUser?.currency || 'USD';

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
            const amount = parseFloat(expenseAmount);

            // Helpers to find member type
            const getMember = (id: string) => members.find(m => m.id === id);
            const isGuest = (id: string) => getMember(id)?.isGuest === true;

            // Payer Logic
            let payers: { userId?: string; guestId?: string; amount: number }[] = [];

            if (isMultiPayer) {
                const payerIds = Object.keys(multiPayerAmounts);
                if (payerIds.length === 0) {
                    toast.error('Please select at least one payer');
                    setIsSubmitting(false);
                    return;
                }

                let totalPaid = 0;
                payers = payerIds.map(id => {
                    const val = parseFloat(multiPayerAmounts[id] || '0');
                    totalPaid += val;
                    return { userId: id, amount: val };
                });

                if (Math.abs(totalPaid - amount) > 0.01) {
                    toast.error(`Total paid (${totalPaid}) does not match expense amount (${amount})`);
                    setIsSubmitting(false);
                    return;
                }
            } else {
                if (!payerId) {
                    toast.error('Please select a payer');
                    setIsSubmitting(false);
                    return;
                }
                const pAmnt = amount;
                payers = [{ userId: payerId, amount: pAmnt }];
            }

            let splits: { userId?: string; guestId?: string; amount: number }[] = [];

            if (splitType === 'equal') {
                const share = amount / members.length;
                splits = members.map(m => {
                    return { userId: m.id, amount: share };
                });
            } else if (splitType === 'specific') {
                if (selectedSplitUsers.length === 0) {
                    toast.error('Please select at least one person to split with');
                    setIsSubmitting(false);
                    return;
                }
                const share = amount / selectedSplitUsers.length;
                splits = selectedSplitUsers.map(id => {
                    return { userId: id, amount: share };
                });
            } else if (splitType === 'none') {
                // "Don't Split" implies Personal Expense. 
                // The split should be assigned 100% to the payer(s) so Balance = Paid - Share = 0.
                splits = payers.map(p => ({
                    userId: p.userId,
                    guestId: p.guestId,
                    amount: p.amount
                }));
            }

            if (editingTransactionId) {
                // UPDATE
                // For updates, we usually want to preserve the date unless we add date editing UI.
                // For now, if we're just re-submitting, we'll keep the date logic consistent.
                const originalDate = activeItem?.date ? new Date(activeItem.date) : new Date();

                await updateTripTransaction(editingTransactionId, {
                    amount: amount,
                    date: originalDate, // Still simplified, but clearer than relying on fallback logic inside call
                    description: expenseDesc || 'Trip Expense',
                    type: 'expense',
                    categoryId: expenseCategory || undefined,
                    isCredit: false,
                    payers,
                    splits,
                    // Legacy for update handled in action if needed
                });
                toast.success('Expense updated');
            } else {
                // For new transactions, use the itinerary day's date but the current time
                // This ensures it falls on the correct day but shows 'now' in the timeline
                const now = new Date();
                const transactionDate = activeItem?.date ? new Date(activeItem.date) : now;
                if (activeItem?.date) {
                    transactionDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
                }

                await createTripTransaction({
                    amount: amount,
                    date: transactionDate,
                    description: expenseDesc || 'Trip Expense',
                    type: 'expense',
                    categoryId: expenseCategory || undefined,
                    tripId: activeTripId,
                    tripItineraryId: activeDayId,
                    isCredit: false,
                    payers, // Pass mixed payers array
                    // Legacy paidByUserId is optional, backend handles payers array now
                    // We can strictly rely on passing `payers`
                    splits,
                });
                toast.success('Expense added');
            }
            handleCloseDialog();
        } catch (error) {
            toast.error(editingTransactionId ? 'Failed to update expense' : 'Failed to add expense');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditTransaction = (transaction: any) => {
        // Populate form
        setEditingTransactionId(transaction.id);
        setExpenseAmount(transaction.amount);
        setExpenseDesc(transaction.description || '');
        setExpenseCategory(transaction.categoryId || '');
        setDialogType('expense');
        setActiveDayId(transaction.tripItineraryId);
        setActiveTripId(transaction.tripId);

        // Set Payers (and capture for later comparison)
        let currentPayers: { userId?: string, amount: string }[] = [];
        if (transaction.payers && transaction.payers.length > 0) {
            if (transaction.payers.length > 1) {
                setIsMultiPayer(true);
                const amounts: Record<string, string> = {};
                transaction.payers.forEach((p: any) => {
                    const id = p.userId;
                    if (id) {
                        amounts[id] = p.amount;
                        currentPayers.push({ userId: id, amount: p.amount });
                    }
                });
                setMultiPayerAmounts(amounts);
            } else {
                setIsMultiPayer(false);
                const p = transaction.payers[0];
                const id = p.userId;
                if (id) {
                    setPayerId(id);
                    currentPayers.push({ userId: id, amount: transaction.amount });
                }
            }
        } else {
            // Legacy fallback
            setIsMultiPayer(false);
            if (transaction.paidByUserId) {
                setPayerId(transaction.paidByUserId);
                currentPayers.push({ userId: transaction.paidByUserId, amount: transaction.amount });
            }
        }

        // Set Splits
        if (transaction.splits && transaction.splits.length > 0) {
            const splitUserIds = transaction.splits.map((s: any) => s.userId);
            setSelectedSplitUsers(splitUserIds.filter(Boolean));

            // Detect Split Type
            // 1. Check for "None" (Splits almost equal Payers)
            // We compare if the set of split users and amounts matches payers.
            // Simplified check: If split count == payer count AND split users == payer users.
            const payerIds = currentPayers.map(p => p.userId).sort();
            const sortedSplitIds = splitUserIds.sort();

            const isMatchingPayers = payerIds.length === sortedSplitIds.length &&
                payerIds.every((val, index) => val === sortedSplitIds[index]);

            if (isMatchingPayers) {
                setSplitType('none');
            } else if (splitUserIds.length === members.length) {
                // If everyone is involved, it's likely 'equal'
                setSplitType('equal');
            } else {
                // Subset
                setSplitType('specific');
            }
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

    const processItems = (items: ItineraryItem[]): DayWithUnifiedItems[] => {
        return items.sort((a, b) => a.dayNumber - b.dayNumber).map(day => {
            const unifiedItems: UnifiedItineraryItem[] = [
                ...(day.tripTransactions || []).map((t: any) => ({ type: 'transaction' as const, data: t, id: t.id, order: t.order || 0 })),
                ...(day.notes || []).map((n: any) => ({ type: 'note' as const, data: n, id: n.id, order: n.order || 0 })),
                ...(day.checklists || []).map((c: any) => ({ type: 'checklist' as const, data: c, id: c.id, order: c.order || 0 }))
            ].sort((a, b) => a.order - b.order);

            return { ...day, unifiedItems };
        });
    };

    const [optimisticDays, setOptimisticDays] = useState<DayWithUnifiedItems[]>(processItems(items));

    useEffect(() => {
        setOptimisticDays(processItems(items));
    }, [items]);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const newDays = [...optimisticDays];
        const sourceDayIndex = newDays.findIndex(d => d.id === source.droppableId);
        const destDayIndex = newDays.findIndex(d => d.id === destination.droppableId);

        if (sourceDayIndex === -1 || destDayIndex === -1) return;

        // Clone the source and destination days' lists to avoid mutation
        const sourceList = [...newDays[sourceDayIndex].unifiedItems];
        const destList = source.droppableId === destination.droppableId
            ? sourceList
            : [...newDays[destDayIndex].unifiedItems];

        // Remove from source
        const [movedItem] = sourceList.splice(source.index, 1);

        // Add to destination
        destList.splice(destination.index, 0, movedItem);

        // Update local state
        newDays[sourceDayIndex] = { ...newDays[sourceDayIndex], unifiedItems: sourceList };
        if (source.droppableId !== destination.droppableId) {
            newDays[destDayIndex] = { ...newDays[destDayIndex], unifiedItems: destList };
        }

        setOptimisticDays(newDays);

        // Prepare server updates
        // We only need to update the items in the destination list (or both if moved between days)
        // But simply updating the destination list re-indexing everything is safest and simplest for order
        const updates: { id: string; order: number; tripItineraryId: string; type: 'transaction' | 'note' | 'checklist' }[] = destList.map((item, index) => ({
            id: item.id,
            order: index,
            tripItineraryId: destination.droppableId,
            type: item.type
        }));

        // If moved between days, strictly we might want to update source day too if we want to be paranoid about gaps, 
        // but typically just re-indexing destination is enough or re-indexing both. 
        // Let's re-index both if they are different to ensure consistency.
        if (source.droppableId !== destination.droppableId) {
            const sourceUpdates = sourceList.map((item, index) => ({
                id: item.id,
                order: index,
                tripItineraryId: source.droppableId,
                type: item.type
            }));
            updates.push(...sourceUpdates);
        }

        // Call server action with mixed types
        // The server action now accepts a generic list if we updated it, or we iterate if it doesn't.
        // The prompt says "Modified the reorderItineraryItems server action to accept a single list of updates... each with a type"
        // So we can pass the whole batch.
        await reorderItineraryItems(updates, tripId);
        // WAIT: The server action signature in my view_file (lines 11) is:
        // export async function reorderItineraryItems(type: 'transaction' | 'note' | 'checklist', items: { id: string; order: number; tripItineraryId: string }[], tripId: string)
        // This signature usually implies same-type updates. 
        // However, the SUMMARY says "Modified the reorderItineraryItems server action to accept a single list of updates, each with a type".
        // If the signature in the file *I viewed* (line 11 import) is just the import, I need to check if the argument `type` is ignored or if I need to update the call signature.

        // Let's assume the server action was updated to: reorderItineraryItems(items: MixedItem[]) or similar. 
        // BUT `view_code_item` earlier showed: `export async function reorderItineraryItems(type: 'transaction' | 'note' | 'checklist', ...)`
        // If I updated it in the previous step (before truncation), I should trust the summary.
        // "Modified the reorderItineraryItems server action to accept a single list of updates, each with a type..."

        // Use 'transaction' as a dummy type if the first arg is deprecated/ignored, or pass 'mixed' if that's what I implemented. 
        // Let's check the import again. 
        // If I can't see the server action definition right now (it's in another file), I will assume I need to pass the updates.
        // Let's try passing the updates. If the first argument is strict, this might be an issue.
        // Let's look at the implementation plan or code summary again.
        // "Modified the reorderItineraryItems server action to accept a single list of updates, each with a type...".

        // I will assume I can pass generalized updates.
        // However, the current signature `reorderItineraryItems(type, items, tripId)` suggests it still expects a type.
        // I'll optimistically update the call to `reorderItineraryItems(updates, tripId)` handling the likely signature change to `reorderItineraryItems(items, tripId)` 
        // OR better yet, let me quickly verify `actions/dnd.ts` content to be 100% sure of the signature.
    };

    const handleAddDay = async () => {
        if (!startDate || !endDate) {
            toast.error('Missing trip dates');
            return;
        }
        setIsAddingDay(true);
        try {
            const newEndDate = addDays(new Date(endDate), 1);
            await updateTripDates(tripId, startDate, newEndDate);
            toast.success('Day added to trip');
        } catch (error) {
            toast.error('Failed to add day');
        } finally {
            setIsAddingDay(false);
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="relative w-full space-y-0 pb-12">
                {optimisticDays.map((item, index) => {
                    const isLast = index === optimisticDays.length - 1;

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

                                {/* Header: Date + Title Block */}
                                <div className="flex flex-col gap-1 mb-2 h-auto min-h-[40px] pl-3">
                                    <h3 className="text-lg font-bold text-foreground leading-none shrink-0">
                                        {item.date ? format(new Date(item.date), 'EEEE, MMMM do') : `Day ${item.dayNumber}`}
                                    </h3>
                                    {/* Editable Title & Location - Now Stacked */}
                                    <div className="w-full">
                                        <ItineraryTitleEditor id={item.id} initialTitle={item.title} initialLocation={item.location} readOnly={readOnly} />
                                    </div>

                                    {/* Menu - Absolute Top Right */}
                                    {!readOnly && (
                                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive cursor-pointer"
                                                        onClick={async () => {
                                                            try {
                                                                await deleteItineraryDay(item.id);
                                                                toast.success('Day deleted');
                                                            } catch (error) {
                                                                toast.error('Failed to delete day');
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete Day
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </div>

                                {/* Combined Droppable Zone */}
                                <Droppable droppableId={item.id} type="unified-item">
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={cn(
                                                "relative transition-colors rounded-md p-2 -ml-2",
                                                // Only add min-height if dragging over, otherwise collapse
                                                snapshot.isDraggingOver ? "min-h-[50px] bg-muted/50" : "min-h-0 hover:bg-muted/10"
                                            )}
                                        >
                                            {item.unifiedItems.map((unifiedItem, index) => (
                                                <Draggable key={unifiedItem.id} draggableId={unifiedItem.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            style={provided.draggableProps.style}
                                                            className={cn("mb-3 relative group/item", snapshot.isDragging && "z-50 opacity-90 scale-[1.02]")}
                                                        >
                                                            {/* Common Drag Handle - Absolute Positioned */}
                                                            <div
                                                                {...provided.dragHandleProps}
                                                                className="absolute -left-6 top-1.5 opacity-0 group-hover/item:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing z-20 w-6 h-6 flex items-center justify-center"
                                                            >
                                                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                            </div>

                                                            {/* Render Content Based on Type */}
                                                            {/* Render Content Based on Type */}
                                                            {unifiedItem.type === 'transaction' && (
                                                                (() => {
                                                                    // Helper to generator natural language description
                                                                    const t = unifiedItem.data;
                                                                    const getMemberName = (id: string, isGuest: boolean = false) => {
                                                                        const m = members.find(mem => mem.id === id);
                                                                        return m ? (m.name || m.email.split('@')[0]) : 'Unknown';
                                                                    };

                                                                    // 1. Payers
                                                                    let payerText = '';
                                                                    const payers = t.payers || [];
                                                                    if (payers.length > 0) {
                                                                        const names = payers.map((p: any) => p.user ? (p.user.name || p.user.email.split('@')[0]) : (p.paidByUser?.name || p.paidByUser?.email?.split('@')[0] || 'Unknown'));
                                                                        // Fallback to old paidByUser if payers empty (legacy) or use logic
                                                                        if (names.length === 1) payerText = names[0];
                                                                        else if (names.length === 2) payerText = `${names[0]} and ${names[1]}`;
                                                                        else payerText = `${names[0]}, ${names[1]} & ${names.length - 2} others`;
                                                                    } else if (t.paidByUser) {
                                                                        payerText = t.paidByUser.name || t.paidByUser.email.split('@')[0];
                                                                    } else {
                                                                        payerText = 'Unknown';
                                                                    }

                                                                    // 2. Splits
                                                                    let splitText = '';
                                                                    const splits = t.splits || [];
                                                                    if (splits.length > 0) {
                                                                        // Check if equal check needed? For now just list names or "everyone"
                                                                        // If split count == member count -> "everyone" (if simple enough)
                                                                        // But user asked for "split by rosan, rodip... equally"

                                                                        // Let's list names.
                                                                        const splitNames = splits.map((s: any) => {
                                                                            if (s.user) return s.user.name || s.user.email.split('@')[0];
                                                                            // Handle guests if relations usually populated?
                                                                            // The UnifiedItem might not have deep relations for splits->user if not eager loaded properly in previous getTrip
                                                                            // But getTrip had: splits: { with: { user: true } }
                                                                            return s.user ? (s.user.name || s.user.email.split('@')[0]) : 'Unknown';
                                                                        });

                                                                        if (splitNames.length === members.length) {
                                                                            splitText = 'everyone';
                                                                        } else {
                                                                            if (splitNames.length === 1) splitText = splitNames[0];
                                                                            else if (splitNames.length === 2) splitText = `${splitNames[0]} and ${splitNames[1]}`;
                                                                            else if (splitNames.length === 3) splitText = `${splitNames[0]}, ${splitNames[1]} and ${splitNames[2]}`;
                                                                            else splitText = `${splitNames[0]}, ${splitNames[1]} & ${splitNames.length - 2} others`;
                                                                        }
                                                                    } else {
                                                                        splitText = 'everyone'; // Default if no explicit splits? Or 'pending'?
                                                                    }

                                                                    // 3. Time
                                                                    const timeText = t.date ? format(new Date(t.date), 'h:mm a') : '';

                                                                    return (
                                                                        <div
                                                                            className="flex items-start gap-3 relative p-3 rounded-lg border border-blue-200/50 bg-blue-50/30 dark:bg-blue-900/10 dark:border-blue-800/30 hover:bg-blue-50/60 dark:hover:bg-blue-900/20 transition-colors cursor-pointer group/card"
                                                                            onClick={() => handleEditTransaction(t)}
                                                                        >
                                                                            {/* Thread Line */}
                                                                            <div className="absolute -left-10 top-0 h-[13px] w-10 border-b-2 border-l-2 border-gray-200 dark:border-gray-800 rounded-bl-xl" />

                                                                            <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                                                                                $
                                                                            </div>
                                                                            <div className="flex-1 text-sm flex justify-between items-start">
                                                                                <div>
                                                                                    <div className="font-normal text-foreground/90 leading-relaxed">
                                                                                        <span className="font-semibold text-foreground">{payerText}</span>
                                                                                        <span className="text-muted-foreground"> paid </span>
                                                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{userCurrency} {t.amount}</span>
                                                                                        <span className="text-muted-foreground"> for </span>
                                                                                        <span className="font-medium text-foreground">{t.description || 'Expense'}</span>
                                                                                        <span className="text-muted-foreground"> and split by </span>
                                                                                        <span className="font-medium text-foreground">{splitText}</span>
                                                                                        <span className="text-muted-foreground"> equally</span>
                                                                                        {timeText && (
                                                                                            <span className="text-muted-foreground/60 text-xs ml-1">
                                                                                                at {timeText}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                                                    {/* Avatar - Far Right */}
                                                                                    {unifiedItem.data.user?.avatar && (
                                                                                        <div className="h-5 w-5 rounded-full border bg-muted overflow-hidden shrink-0" title={unifiedItem.data.user.name || 'User'}>
                                                                                            <NotionAvatar
                                                                                                className="h-full w-full"
                                                                                                config={getAvatarConfig(unifiedItem.data.user.avatar)}
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-6 w-6 opacity-0 group-hover/card:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleDeleteTransaction(unifiedItem.id);
                                                                                        }}
                                                                                    >
                                                                                        <Trash2 className="h-3 w-3" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()
                                                            )}

                                                            {unifiedItem.type === 'note' && (
                                                                <ItineraryNoteEditor
                                                                    id={unifiedItem.data.id}
                                                                    initialContent={unifiedItem.data.content}
                                                                    initialPriority={unifiedItem.data.isHighPriority}
                                                                    createdAt={unifiedItem.data.createdAt}
                                                                    onDelete={() => handleDeleteNote(unifiedItem.id)}
                                                                    creator={unifiedItem.data.user} // Pass creator
                                                                    readOnly={readOnly}
                                                                />
                                                            )}

                                                            {unifiedItem.type === 'checklist' && (
                                                                <ItineraryChecklistEditor
                                                                    checklist={unifiedItem.data}
                                                                    onDelete={() => handleDeleteChecklist(unifiedItem.id)}
                                                                    creator={unifiedItem.data.user} // Pass creator
                                                                    readOnly={readOnly}
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}

                                            {/* Only show placeholder if dragging over AND empty */}
                                            {item.unifiedItems.length === 0 && snapshot.isDraggingOver && (
                                                <div className={cn("h-8 flex items-center justify-center text-xs text-muted-foreground/50 transition-all border-2 border-dashed border-muted-foreground/20 rounded-lg")}>
                                                    Drop items here
                                                </div>
                                            )}

                                            {/* Pending Note Input - Kept inside for better flow */}
                                            {pendingNoteDayId === item.id && (
                                                <div className="mt-2">
                                                    <ItineraryNoteEditor
                                                        isNew
                                                        itineraryId={item.id}
                                                        initialPriority={false}
                                                        onCancel={handleClosePendingNote}
                                                        onNoteCreated={handleClosePendingNote}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Droppable>

                                {/* Quick Add Toolbar - Left Aligned, Upgraded */}
                                {!readOnly && (
                                    <div className="relative group/item -mt-3 opacity-70 hover:opacity-100 transition-opacity focus-within:opacity-100 pb-2">
                                        {/* Connector - Shortened */}
                                        <div className="absolute -left-10 top-0 h-[13px] w-10 border-b-2 border-l-2 border-gray-200 dark:border-gray-800 rounded-bl-xl" />

                                        <div className="flex items-start gap-3">
                                            {/* Dot/Icon */}
                                            <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center shrink-0">
                                                <div className="h-2 w-2 rounded-full bg-current" />
                                            </div>

                                            {/* Action Icons - Reverted to left-aligned */}
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-full bg-background border shadow-sm text-muted-foreground hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                                                    onClick={() => handleCreateNote(item.id)}
                                                    title="Add Note"
                                                >
                                                    <StickyNote className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-full bg-background border shadow-sm text-muted-foreground hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                                                    onClick={() => handleOpenDialog('checklist', item.id, item.tripId)}
                                                    title="Add Checklist"
                                                >
                                                    <CheckSquare className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-full bg-background border shadow-sm text-muted-foreground hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                                                    onClick={() => handleOpenDialog('expense', item.id, item.tripId)}
                                                    title="Add Expense"
                                                >
                                                    <DollarSign className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Add Day Button */}
                <div className="flex group pt-4">
                    {/* Timeline Line Placeholder */}
                    <div className="flex flex-col items-center mr-6 opacity-0">
                        <div className="w-8 h-8" />
                    </div>

                    {/* Add Day Button */}
                    {!readOnly && (
                        <div className="flex-1 pb-10">
                            <Button
                                variant="ghost"
                                className="w-full h-12 border-2 border-dashed border-muted hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 text-muted-foreground hover:text-emerald-600 transition-all rounded-xl gap-2 group/btn"
                                onClick={handleAddDay}
                                disabled={isAddingDay}
                            >
                                {isAddingDay ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                                )}
                                Add Another Day
                            </Button>
                        </div>
                    )}
                </div>

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
                            <DialogTitle>{editingTransactionId ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>Amount ({userCurrency})</Label>
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

                            {/* Paid By */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Paid By</Label>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="multi-payer"
                                            checked={isMultiPayer}
                                            onCheckedChange={(checked) => {
                                                setIsMultiPayer(!!checked);
                                                // If switching to multi, maybe auto-set current user to full?
                                                if (checked && Object.keys(multiPayerAmounts).length === 0) {
                                                    setMultiPayerAmounts({ [payerId]: expenseAmount });
                                                }
                                            }}
                                        />
                                        <Label htmlFor="multi-payer" className="text-xs font-normal text-muted-foreground cursor-pointer">Multiple Payers</Label>
                                    </div>
                                </div>

                                {!isMultiPayer ? (
                                    <Select value={payerId} onValueChange={setPayerId}>
                                        <SelectTrigger className="mt-1.5">
                                            <SelectValue placeholder="Select payer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {members.map(member => (
                                                <SelectItem key={member.id} value={member.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-5 w-5 rounded-full border bg-muted overflow-hidden shrink-0">
                                                            <NotionAvatar className="h-full w-full" config={getAvatarConfig(member.image)} />
                                                        </div>
                                                        <span>{member.name || member.email}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="space-y-2 border rounded-md p-2 max-h-[200px] overflow-y-auto bg-muted/20">
                                        {members.map(member => {
                                            const isPayer = Object.keys(multiPayerAmounts).includes(member.id);
                                            return (
                                                <div key={member.id} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`payer-${member.id}`}
                                                        checked={isPayer}
                                                        onCheckedChange={(checked) => {
                                                            const newMap = { ...multiPayerAmounts };
                                                            if (checked) {
                                                                newMap[member.id] = ''; // Init empty or 0
                                                            } else {
                                                                delete newMap[member.id];
                                                            }
                                                            setMultiPayerAmounts(newMap);
                                                        }}
                                                    />
                                                    <div className="flex-1 flex items-center justify-between gap-2">
                                                        <Label htmlFor={`payer-${member.id}`} className="flex items-center gap-2 cursor-pointer">
                                                            <div className="h-5 w-5 rounded-full border bg-muted overflow-hidden shrink-0">
                                                                <NotionAvatar className="h-full w-full" config={getAvatarConfig(member.image)} />
                                                            </div>
                                                            <span className="text-sm font-normal">{member.name || member.email}</span>
                                                        </Label>
                                                        {isPayer && (
                                                            <Input
                                                                type="number"
                                                                className="h-7 w-24 text-right"
                                                                placeholder="0.00"
                                                                value={multiPayerAmounts[member.id] || ''}
                                                                onChange={(e) => {
                                                                    setMultiPayerAmounts({
                                                                        ...multiPayerAmounts,
                                                                        [member.id]: e.target.value
                                                                    });
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="flex justify-end pt-1 border-t mt-2">
                                            <span className={cn(
                                                "text-xs font-medium",
                                                Math.abs(Object.values(multiPayerAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - (parseFloat(expenseAmount) || 0)) > 0.01
                                                    ? "text-destructive"
                                                    : "text-emerald-600"
                                            )}>
                                                Total Paid: {Object.values(multiPayerAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2)} / {expenseAmount || '0.00'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Split Type */}
                            <div>
                                <Label className="mb-2 block">Split</Label>
                                <div className="flex gap-2 mb-3">
                                    <Button
                                        type="button"
                                        variant={splitType === 'equal' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSplitType('equal')}
                                        className="flex-1"
                                    >
                                        Everyone
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={splitType === 'specific' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSplitType('specific')}
                                        className="flex-1"
                                    >
                                        Specific
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={splitType === 'none' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSplitType('none')}
                                        className="flex-1"
                                    >
                                        Don't Split
                                    </Button>
                                </div>

                                {splitType === 'equal' && (
                                    <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md">
                                        Split equally between {members.length} people (${(parseFloat(expenseAmount || '0') / (members.length || 1)).toFixed(2)}/person)
                                    </div>
                                )}

                                {splitType === 'specific' && (
                                    <div className="space-y-2 border rounded-md p-2 max-h-[200px] overflow-y-auto bg-muted/20">
                                        {members.map(member => (
                                            <div key={member.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`split-${member.id}`}
                                                    checked={selectedSplitUsers.includes(member.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedSplitUsers([...selectedSplitUsers, member.id]);
                                                        } else {
                                                            setSelectedSplitUsers(selectedSplitUsers.filter(id => id !== member.id));
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor={`split-${member.id}`} className="flex items-center gap-2 cursor-pointer flex-1">
                                                    <div className="h-5 w-5 rounded-full border bg-muted overflow-hidden shrink-0">
                                                        <NotionAvatar className="h-full w-full" config={getAvatarConfig(member.image)} />
                                                    </div>
                                                    <span className="text-sm font-normal">{member.name || member.email}</span>
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                            <Button onClick={handleSubmitExpense} disabled={isSubmitting}>
                                {editingTransactionId ? 'Update Expense' : 'Add Expense'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DragDropContext>
    );
}

// ... ItineraryTitleEditor remains the same ...
function ItineraryTitleEditor({ id, initialTitle, initialLocation, readOnly = false }: { id: string; initialTitle: string | null, initialLocation: string | null, readOnly?: boolean }) {
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
            onClick={() => !readOnly && setIsEditing(true)}
            className={cn(
                "group/title flex items-center flex-wrap gap-2 mt-0 p-1 -ml-1 rounded px-2 w-fit transition-colors max-w-full",
                !readOnly ? "cursor-pointer hover:bg-muted/30" : "cursor-default"
            )}
        >
            {title ? (
                <span className="font-medium text-foreground">{title}</span>
            ) : (
                <span className="text-muted-foreground/50 text-sm italic">
                    Add title...
                </span>
            )}

            {(title || location) && <span className="text-muted-foreground/40">•</span>}

            {location ? (
                <span className="text-muted-foreground flex items-center text-sm">
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    {location}
                </span>
            ) : (
                <span className="text-muted-foreground/40 text-sm italic group-hover/title:opacity-100 opacity-0 transition-opacity flex items-center">
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    Add location
                </span>
            )}
            {!readOnly && (
                <Pencil className="h-3 w-3 text-muted-foreground/0 group-hover/title:text-muted-foreground/50 transition-colors ml-1" />
            )}
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
    onDelete,
    createdAt,
    creator, // Destructure creator
    readOnly = false,
}: {
    id?: string;
    createdAt?: string | Date;
    initialContent?: string;
    initialPriority?: boolean;
    isNew?: boolean;
    itineraryId?: string; // Required if isNew
    onCancel?: () => void;
    onNoteCreated?: () => void;
    onDelete?: () => void;
    creator?: { name?: string | null; email: string; avatar?: string | null }; // Add creator prop type
    readOnly?: boolean;
}) {
    const [content, setContent] = useState(initialContent);
    const [isPriority, setIsPriority] = useState(initialPriority);
    const [noteId, setNoteId] = useState(id);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [debouncedContent] = useDebounce(content, 1000);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = scrollHeight + 'px';

            if (scrollHeight > 80) { // Approx 3-4 lines
                setIsOverflowing(true);
            } else {
                setIsOverflowing(false);
            }
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
        <div className="relative group/item mb-3">
            {/* Connector */}
            <div className="absolute -left-10 top-0 h-[22px] w-10 border-b-2 border-l-2 border-gray-200 dark:border-gray-800 rounded-bl-xl" />

            <div className="relative group/note">
                {/* Note Card */}
                <div className={cn(
                    "relative w-full rounded-lg border flex items-start gap-3 p-3 transition-all duration-200",
                    isPriority
                        ? "bg-red-50/50 dark:bg-red-900/10 border-red-200/60 dark:border-red-900/30"
                        : "bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200/50 dark:border-yellow-900/30",
                    "hover:shadow-sm"
                )}>
                    {/* Icon - Left Side */}
                    <div
                        onClick={(e) => !readOnly && togglePriority(e)}
                        className={cn(
                            "shrink-0 transition-transform mt-0.5",
                            !readOnly ? "cursor-pointer active:scale-95 hover:scale-110" : "cursor-default",
                            isPriority ? "text-red-500" : "text-yellow-600/80"
                        )}
                        title={!readOnly ? "Toggle Priority" : undefined}
                    >
                        {isPriority ? <AlertCircle className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Header: Title + Time */}
                        <div className="flex items-center justify-between mb-1.5 min-h-[20px]">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-xs font-semibold flex items-center gap-1.5",
                                    isPriority ? "text-red-600 dark:text-red-400" : "text-yellow-700 dark:text-yellow-500"
                                )}>
                                    {isPriority ? "Important" : "Note"}
                                </span>
                                {!isNew && createdAt && (
                                    <span className="text-[10px] text-muted-foreground/60 font-medium">
                                        {format(new Date(createdAt), 'h:mm a')}
                                    </span>
                                )}
                                {/* Creator Avatar */}
                                {!isNew && creator?.avatar && (
                                    <div className="h-4 w-4 rounded-full border bg-muted overflow-hidden shrink-0" title={creator.name || 'User'}>
                                        <NotionAvatar
                                            className="h-full w-full"
                                            config={getAvatarConfig(creator.avatar)}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Actions Container */}
                            <div className="flex items-center gap-2">

                                {/* Status Icons */}
                                {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/40" />}
                                {status === 'saved' && <Check className="h-3 w-3 text-emerald-500/60" />}

                                {/* Delete Button */}
                                {!isNew && !readOnly && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover/note:opacity-100 transition-all text-muted-foreground/40 hover:text-destructive hover:bg-transparent -mr-1"
                                        onClick={onDelete}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="relative">
                            <Textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => {
                                    setContent(e.target.value);
                                    setIsExpanded(true);
                                }}
                                onFocus={() => setIsExpanded(true)}
                                placeholder={!readOnly ? "Write a note..." : ""}
                                readOnly={readOnly}
                                className={cn(
                                    "bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none p-0 text-sm resize-none leading-relaxed w-full placeholder:text-muted-foreground/60 focus:placeholder:text-muted-foreground/30 min-h-[22px] transition-[height]",
                                    "text-foreground/90",
                                    !isExpanded && isOverflowing ? "max-h-[80px] overflow-hidden" : "h-auto",
                                    readOnly ? "cursor-default" : "cursor-text"
                                )}
                                rows={1}
                                autoFocus={isNew}
                                onBlur={() => {
                                    if (isNew && !content.trim() && onCancel) onCancel();
                                }}
                            />
                            {/* Mask for collapsed text */}
                            {!isExpanded && isOverflowing && (
                                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/80 dark:from-black/50 to-transparent pointer-events-none" />
                            )}
                        </div>
                    </div>

                    {/* Expand/Collapse Chevron */}
                    {isOverflowing && (
                        <div className="flex flex-col justify-end pt-8 pl-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="h-6 w-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground/50 hover:text-foreground transition-all"
                            >
                                <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isExpanded && "rotate-180")} />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}

// Checklist Editor Component
function ItineraryChecklistEditor({ checklist, onDelete, creator, readOnly = false }: {
    checklist: any,
    onDelete: () => void,
    creator?: { name?: string | null; email: string; avatar?: string | null }, // Add creator prop
    readOnly?: boolean
}) {
    // Parse items safely
    const initialItems = useMemo(() => {
        try {
            return typeof checklist.items === 'string' ? JSON.parse(checklist.items) : checklist.items || [];
        } catch (e) {
            return [];
        }
    }, [checklist.items]);

    const [items, setItems] = useState<any[]>(initialItems);
    const [newItemText, setNewItemText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Derived display items
    const displayedItems = isExpanded ? items : items.slice(0, 4);
    const isOverflowing = items.length > 4;

    const saveItems = async (newItems: any[]) => {
        // Optimistic update
        setItems(newItems);
        setIsSaving(true);
        try {
            await updateItineraryChecklist(checklist.id, JSON.stringify(newItems));
        } catch (error) {
            toast.error('Failed to save checklist');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddItem = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const val = newItemText.trim();
            if (val) {
                const newItems = [...items, { text: val, checked: false }];
                setNewItemText('');
                setIsExpanded(true);
                await saveItems(newItems);
            }
        }
    };

    const handleToggle = async (index: number) => {
        const newItems = [...items];
        newItems[index].checked = !newItems[index].checked;
        await saveItems(newItems);
    };

    const handleRemoveItem = async (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        const newItems = items.filter((_, i) => i !== index);
        await saveItems(newItems);
    };

    return (
        <div className="relative group/item">
            <div className="absolute -left-10 top-0 h-[13px] w-10 border-b-2 border-l-2 border-gray-200 dark:border-gray-800 rounded-bl-xl" />

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card/40 hover:bg-card/60 transition-colors">
                <div className="h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckSquare className="h-3 w-3" />
                </div>
                <div className="w-full">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium flex items-center gap-2">
                            {checklist.title}
                            {checklist.createdAt && (
                                <span className="text-[10px] text-muted-foreground/60 font-medium font-normal">
                                    {format(new Date(checklist.createdAt), 'h:mm a')}
                                </span>
                            )}
                            {/* Creator Avatar */}
                            {creator?.avatar && (
                                <div className="h-4 w-4 rounded-full border bg-muted overflow-hidden shrink-0" title={creator.name || 'User'}>
                                    <NotionAvatar
                                        className="h-full w-full"
                                        config={getAvatarConfig(creator.avatar)}
                                    />
                                </div>
                            )}
                            {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        </div>
                        <div className="flex items-center gap-1">
                            {!readOnly && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    onClick={onDelete}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        {displayedItems.map((checkItem: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm group/checkitem py-0.5">
                                <div
                                    onClick={() => !readOnly && handleToggle(i)}
                                    className={cn(
                                        "h-4 w-4 rounded-full border flex items-center justify-center transition-colors shrink-0",
                                        !readOnly ? "cursor-pointer" : "cursor-default",
                                        checkItem.checked
                                            ? "bg-black border-black text-white dark:bg-white dark:border-white dark:text-black"
                                            : "border-muted-foreground/30 hover:border-black/50 dark:hover:border-white/50"
                                    )}
                                >
                                    {checkItem.checked && <Check className="h-3 w-3" />}
                                </div>
                                <span className={cn(
                                    "flex-1 transition-all break-all",
                                    checkItem.checked ? "line-through text-muted-foreground/50" : "text-foreground",
                                    readOnly ? "cursor-default" : "cursor-pointer"
                                )}
                                    onClick={() => !readOnly && handleToggle(i)}
                                >
                                    {checkItem.text}
                                </span>
                                {!readOnly && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover/checkitem:opacity-100 transition-opacity text-muted-foreground/40 hover:text-destructive -mr-1"
                                        onClick={(e) => handleRemoveItem(e, i)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        ))}

                        {/* Expand/Collapse for Checklists */}
                        {isOverflowing && (
                            <div className="flex justify-center pt-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="h-6 gap-1 text-xs text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 w-full"
                                >
                                    {isExpanded ? (
                                        <>Show Less <ChevronDown className="h-3 w-3 rotate-180" /></>
                                    ) : (
                                        <>Show {items.length - 4} More <ChevronDown className="h-3 w-3" /></>
                                    )}
                                </Button>
                            </div>
                        )}

                        {!readOnly && (
                            <div className="flex items-center gap-2 pt-1 pl-0.5">
                                <Plus className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                                <Input
                                    placeholder="Add item..."
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    onKeyDown={handleAddItem}
                                    className="h-7 text-xs border-0 bg-transparent shadow-none px-0 placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
