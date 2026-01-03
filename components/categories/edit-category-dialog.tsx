'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Smile, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { updateCategory } from '@/actions/transactions';
import { toast } from 'sonner';

const categorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    icon: z.string().max(2, 'Only one emoji allowed').optional(),
    type: z.enum(['income', 'expense', 'savings']),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface EditCategoryDialogProps {
    category: {
        id: string;
        name: string;
        type: 'income' | 'expense' | 'savings';
        icon: string | null;
    };
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function EditCategoryDialog({ category, onSuccess, trigger }: EditCategoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: category.name,
            icon: category.icon || '',
            type: category.type,
        },
    });

    // Update form when category prop changes
    useEffect(() => {
        if (open) {
            form.reset({
                name: category.name,
                icon: category.icon || '',
                type: category.type,
            });
        }
    }, [category, form, open]);

    async function onSubmit(data: CategoryFormValues) {
        setIsLoading(true);
        const result = await updateCategory(category.id, data);
        setIsLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Category updated successfully');
            setOpen(false);
            onSuccess?.();
        }
    }

    // Categorized emojis (simplified for brevity, can share this constant later if needed)
    const emojiCategories = {
        "Food & Drink": ['🍳', '🍔', '🍕', '🍣', '🍱', '🍦', '🍩', '🍪', '☕', '🍹', '🍺', '🍎', '🥕', '🍽️', '🥗', '🍖', '🍇', '🍉'],
        "Transport": ['🚗', '🚕', '🚌', '🚅', '🚲', '🛴', '✈️', '⚓', '⛽', '🚦', '🎫', '🗺️', '🚁', '⛴️'],
        "Housing & Utilities": ['🏠', '🏢', '🛏️', '🛋️', '💡', '🔌', '💧', '🚽', '🗑️', '🔨', '🧹', '📦', '🔑', '🚪'],
        "Personal & Health": ['💊', '🩺', '🦷', '👓', '💇', '💅', '🏋️', '🧖', '🧴', '👗', '👟', '👶', '👕', '👖', '👘', '🩴', '🕶️'],
        "Entertainment": ['🎬', '🎵', '🎮', '🎲', '🎳', '🎨', '🎪', '🎫', '🎟️', '📚', '📺', '🎧', '🎸', '🎹', '🎤'],
        "Shopping & Tech": ['🛒', '🛍️', '📱', '💻', '📷', '⌚', '🎁', '💎', '💳', '🕶️', '👒', '🎒', '👢', '🧢', '🔌', '🖱️', '⌨️', '🖨️'],
        "Finance & Income": ['💰', '💵', '🪙', '🏦', '💹', '💼', '📈', '📉', '🧾', '💸', '🤑', '💎', '🏧', '📝'],
        "Education & Work": ['🎓', '🎒', '📚', '✏️', '📝', '📎', '💼', '🤝', '📅', '📊', '💻', '🧠', '🗂️', '📌'],
        "Travel & Nature": ['🌍', '🏖️', '⛰️', '🏕️', '⛺', '🌲', '☀️', '🌧️', '❄️', '🔥', '🌴', '🏨', '🌵', '🌺', '🌻', '🌼', '🌷', '🪴', '🍁'],
        "Plants & Garden": ['🪴', '🌵', '🌴', '🌲', '🌳', '🌱', '🌿', '☘️', '🍀', '🎍', '🎋', '🍃', '🍂', '🍁', '🍄', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻'],
        "Clothing & Accessories": ['👗', '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👔', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👚', '👛', '👜', '👝', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡', '👢'],
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <Pencil className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Category</DialogTitle>
                    <DialogDescription>
                        Update the details of your category.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Groceries" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="income">Income</SelectItem>
                                            <SelectItem value="expense">Expense</SelectItem>
                                            <SelectItem value="savings">Savings</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Emoji Icon</FormLabel>
                                    <div className="flex gap-2 mb-2">
                                        <FormControl>
                                            <div className="relative w-full">
                                                <Input
                                                    className="pl-8"
                                                    maxLength={2}
                                                    placeholder="Select or type an emoji..."
                                                    {...field}
                                                />
                                                <Smile className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </FormControl>
                                    </div>

                                    <div className="h-[200px] overflow-y-auto border rounded-md p-2 space-y-4">
                                        {Object.entries(emojiCategories).map(([category, emojis]) => (
                                            <div key={category}>
                                                <h4 className="text-xs font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                                                    {category}
                                                </h4>
                                                <div className="flex flex-wrap gap-1">
                                                    {emojis.map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            type="button"
                                                            onClick={() => field.onChange(emoji)}
                                                            className="h-8 w-8 text-lg hover:bg-muted rounded-md transition-colors flex items-center justify-center"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
