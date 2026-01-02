'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { getCategories, createCategory } from '@/actions/transactions';
import { toast } from 'sonner';

interface Category {
    id: string;
    name: string;
    type: 'income' | 'expense' | 'savings';
    icon: string | null;
}

interface CategorySelectorProps {
    type: 'income' | 'expense' | 'savings';
    value?: string;
    onSelect: (categoryId: string) => void;
}

export function CategorySelector({ type, value, onSelect }: CategorySelectorProps) {
    const [open, setOpen] = React.useState(false);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

    // Fetch categories when type changes
    React.useEffect(() => {
        const fetchCategories = async () => {
            setLoading(true);
            try {
                if (navigator.onLine) {
                    const data = await getCategories(type);
                    setCategories(data as Category[]);

                    // Cache them
                    const { cacheCategories } = await import('@/lib/local-db');
                    await cacheCategories(data);
                } else {
                    // Offline fallback
                    const { getCachedCategories } = await import('@/lib/local-db');
                    const cached = await getCachedCategories(type);
                    if (cached && cached.length > 0) {
                        setCategories(cached as Category[]);
                        // toast.info('Using offline categories'); // Optional: don't spam toasts
                    } else {
                        toast.warning('No offline categories found');
                    }
                }
            } catch (error) {
                console.error('Failed to fetch categories', error);

                // Try cache on error too
                try {
                    const { getCachedCategories } = await import('@/lib/local-db');
                    const cached = await getCachedCategories(type);
                    if (cached && cached.length > 0) {
                        setCategories(cached as Category[]);
                    }
                } catch (e) { }

                if (!navigator.onLine) {
                    // Already handled above sort of, but if fetch fails despite being "online"
                }
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, [type]);

    const handleCreateSuccess = () => {
        // Refresh list logic would be ideal, for now just simple fetch
        const fetchCategories = async () => {
            setLoading(true);
            try {
                const data = await getCategories(type);
                setCategories(data as Category[]);
            } catch (error) {
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();

        // Better: we could return new category from dialog, but simple refresh works
    };

    const selectedCategory = categories.find((c) => c.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedCategory ? (
                        <span className="flex items-center gap-2">
                            {selectedCategory.icon && <span>{selectedCategory.icon}</span>}
                            {selectedCategory.name}
                        </span>
                    ) : "Select subcategory..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                    <CommandInput
                        placeholder="Search subcategory..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        <CommandEmpty>
                            <div className="p-2 text-center text-sm text-muted-foreground">
                                No category found. Use the Categories page to create new ones with emojis!
                            </div>
                        </CommandEmpty>
                        <CommandGroup>
                            {categories.map((category) => (
                                <CommandItem
                                    key={category.id}
                                    value={category.name}
                                    onSelect={() => {
                                        onSelect(category.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === category.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span className="flex items-center gap-2">
                                        {category.icon && <span>{category.icon}</span>}
                                        {category.name}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
