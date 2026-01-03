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
    const [necessityLevel, setNecessityLevel] = useState<string>(searchParams.get('necessity') || 'all');
    const [search, setSearch] = useState<string>(searchParams.get('search') || '');
    const [range, setRange] = useState<string>(searchParams.get('range') || 'this-month');

    // Sync state with URL params when they change externally or on load
    useEffect(() => {
        const typeParam = searchParams.get('type') || 'all';
        const categoryIdParam = searchParams.get('categoryId') || 'all';
        const necessityParam = searchParams.get('necessity') || 'all';
        const searchParam = searchParams.get('search') || '';
        const rangeParam = searchParams.get('range') || 'this-month';

        setType(typeParam);
        setCategoryId(categoryIdParam);
        setNecessityLevel(necessityParam);
        setSearch(searchParam);
        setRange(rangeParam);
    }, [searchParams]);

    // Cleanup: Debounce search effect to avoid URL spamming
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (searchParams.get('search') || '')) {
                updateFilters(type, categoryId, necessityLevel, search, range);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search]); // Only run when search string changes

    const updateFilters = useCallback((newType: string, newCategoryId: string, newNecessity: string, newSearch: string, newRange: string) => {
        const params = new URLSearchParams(searchParams);

        if (newType && newType !== 'all') params.set('type', newType);
        else params.delete('type');

        if (newCategoryId && newCategoryId !== 'all') params.set('categoryId', newCategoryId);
        else params.delete('categoryId');

        if (newNecessity && newNecessity !== 'all') params.set('necessity', newNecessity);
        else params.delete('necessity');

        if (newSearch) params.set('search', newSearch);
        else params.delete('search');

        if (newRange && newRange !== 'this-month') params.set('range', newRange);
        else params.delete('range');

        // Always reset page when filters change
        params.delete('page');

        router.push(`?${params.toString()}`);
    }, [router, searchParams]);

    const handleTypeChange = (value: string) => {
        setType(value);
        if (value !== 'all' && categoryId !== 'all') {
            const selectedCategory = categories.find(c => c.id === categoryId);
            if (selectedCategory && selectedCategory.type !== value) {
                setCategoryId('all');
                updateFilters(value, 'all', necessityLevel, search, range);
                return;
            }
        }
        updateFilters(value, categoryId, necessityLevel, search, range);
    };

    const handleCategoryChange = (value: string) => {
        setCategoryId(value);
        updateFilters(type, value, necessityLevel, search, range);
    };

    const handleNecessityChange = (value: string) => {
        setNecessityLevel(value);
        updateFilters(type, categoryId, value, search, range);
    };

    const handleRangeChange = (value: string) => {
        setRange(value);
        updateFilters(type, categoryId, necessityLevel, search, value);
    };

    const clearFilters = () => {
        setType('all');
        setCategoryId('all');
        setNecessityLevel('all');
        setSearch('');
        setRange('this-month');
        router.push('?');
    };

    const filteredCategories = type === 'all'
        ? categories
        : categories.filter(c => c.type === type);

    const hasFilters = type !== 'all' || categoryId !== 'all' || necessityLevel !== 'all' || search !== '' || range !== 'this-month';

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

            <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center">

                {/* Search Input */}
                <div className="relative w-full xl:w-64">
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium hidden sm:inline">Filter by:</span>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <Select value={type} onValueChange={handleTypeChange}>
                        <SelectTrigger className="w-[130px] h-9">
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
                        <SelectTrigger className="w-[160px] h-9">
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

                    <Select value={necessityLevel} onValueChange={handleNecessityChange}>
                        <SelectTrigger className="w-[140px] h-9">
                            <SelectValue placeholder="Subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Subcategories</SelectItem>
                            <SelectItem value="needs">Needs</SelectItem>
                            <SelectItem value="wants">Wants</SelectItem>
                            <SelectItem value="savings">Savings</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

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
