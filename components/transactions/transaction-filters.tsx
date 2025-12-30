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
    const [range, setRange] = useState<string>(searchParams.get('range') || 'this-month');

    // Sync state with URL params when they change externally or on load
    useEffect(() => {
        const typeParam = searchParams.get('type') || 'all';
        const categoryIdParam = searchParams.get('categoryId') || 'all';
        const rangeParam = searchParams.get('range') || 'this-month';

        setType(typeParam);
        setCategoryId(categoryIdParam);
        setRange(rangeParam);
    }, [searchParams]);

    const updateFilters = useCallback((newType: string, newCategoryId: string, newRange: string) => {
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

        if (newRange && newRange !== 'this-month') {
            params.set('range', newRange);
        } else {
            params.delete('range');
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
                updateFilters(value, 'all', range);
                return;
            }
        }
        updateFilters(value, categoryId, range);
    };

    const handleCategoryChange = (value: string) => {
        setCategoryId(value);
        updateFilters(type, value, range);
    };

    const handleRangeChange = (value: string) => {
        setRange(value);
        updateFilters(type, categoryId, value);
    };

    const clearFilters = () => {
        setType('all');
        setCategoryId('all');
        setRange('this-month');
        router.push('?');
    };

    const filteredCategories = type === 'all'
        ? categories
        : categories.filter(c => c.type === type);

    const hasFilters = type !== 'all' || categoryId !== 'all' || range !== 'this-month';

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Date Range Buttons */}
            <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg w-fit">
                {['this-month', '3m', '6m', '1y'].map((option) => (
                    <Button
                        key={option}
                        variant={range === option ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => handleRangeChange(option)}
                        className={`h-8 px-3 text-xs font-medium transition-all ${range === option
                            ? 'bg-background shadow-sm text-foreground hover:bg-background'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {option === 'this-month' ? 'This Month' : option.toUpperCase()}
                    </Button>
                ))}
            </div>

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
        </div>
    );
}
