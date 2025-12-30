'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface Category {
    id: string;
    name: string;
    icon?: string | null;
    type: string;
}

interface TransactionFiltersProps {
    categories: Category[];
}

export function TransactionFilters({ categories }: TransactionFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [type, setType] = useState<string>(searchParams.get('type') || 'all');
    const [categoryId, setCategoryId] = useState<string>(searchParams.get('categoryId') || 'all');

    const updateFilters = useCallback((newType: string, newCategoryId: string) => {
        const params = new URLSearchParams(searchParams);

        if (newType && newType !== 'all') {
            params.set('type', newType);
        } else {
            params.delete('type');
        }

        if (newCategoryId && newCategoryId !== 'all') {
            params.set('categoryId', newCategoryId);
        } else {
            params.delete('categoryId');
        }

        router.push(`?${params.toString()}`);
    }, [router, searchParams]);

    const handleTypeChange = (value: string) => {
        setType(value);
        // Reset category if it doesn't match the new type (unless switching to all)
        if (value !== 'all' && categoryId !== 'all') {
            const selectedCategory = categories.find(c => c.id === categoryId);
            if (selectedCategory && selectedCategory.type !== value) {
                setCategoryId('all');
                updateFilters(value, 'all');
                return;
            }
        }
        updateFilters(value, categoryId);
    };

    const handleCategoryChange = (value: string) => {
        setCategoryId(value);
        updateFilters(type, value);
    };

    const clearFilters = () => {
        setType('all');
        setCategoryId('all');
        router.push('?');
    };

    const filteredCategories = type === 'all'
        ? categories
        : categories.filter(c => c.type === type);

    const hasFilters = type !== 'all' || categoryId !== 'all';

    return (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by:</span>
            </div>

            <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
            </Select>

            <Select value={categoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                            <span className="flex items-center gap-2">
                                <span>{category.icon || '🏷️'}</span>
                                <span>{category.name}</span>
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {hasFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 px-2 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-4 w-4 mr-1" />
                    Reset
                </Button>
            )}
        </div>
    );
}
