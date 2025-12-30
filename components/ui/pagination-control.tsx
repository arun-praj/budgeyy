'use client';

import {
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface PaginationControlProps {
    currentPage: number;
    totalCount: number;
    pageSize: number;
    siblingCount?: number;
    className?: string;
}

export function PaginationControl({
    currentPage,
    totalCount,
    pageSize,
    siblingCount = 1,
    className,
}: PaginationControlProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const totalPages = Math.ceil(totalCount / pageSize);

    const paginationRange = useMemo(() => {
        // Pages count is determined as siblingCount + firstPage + lastPage + currentPage + 2*dots
        const totalPageNumbers = siblingCount + 5;

        // Case 1: If the number of pages is less than the page numbers we want to show in our
        // paginationComponent, we return the range [1..totalPages]
        if (totalPages <= totalPageNumbers) {
            return range(1, totalPages);
        }

        const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
        const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

        const shouldShowLeftDots = leftSiblingIndex > 2;
        const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

        const firstPageIndex = 1;
        const lastPageIndex = totalPages;

        // Case 2: No left dots to show, but rights dots to be shown
        if (!shouldShowLeftDots && shouldShowRightDots) {
            let leftItemCount = 3 + 2 * siblingCount;
            let leftRange = range(1, leftItemCount);

            return [...leftRange, 'dots', totalPages];
        }

        // Case 3: No right dots to show, but left dots to be shown
        if (shouldShowLeftDots && !shouldShowRightDots) {
            let rightItemCount = 3 + 2 * siblingCount;
            let rightRange = range(totalPages - rightItemCount + 1, totalPages);
            return [firstPageIndex, 'dots', ...rightRange];
        }

        // Case 4: Both left and right dots to be shown
        if (shouldShowLeftDots && shouldShowRightDots) {
            let middleRange = range(leftSiblingIndex, rightSiblingIndex);
            return [firstPageIndex, 'dots', ...middleRange, 'dots', lastPageIndex];
        }
    }, [totalCount, pageSize, siblingCount, currentPage]);

    const onPageChange = (page: number | string) => {
        if (typeof page === 'string') return;

        const params = new URLSearchParams(searchParams);
        params.set('page', page.toString());
        router.push(`?${params.toString()}`);
    };

    if (currentPage === 0 || totalPages < 2) {
        return null;
    }

    return (
        <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8"
            >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
            </Button>

            {paginationRange?.map((pageNumber, idx) => {
                if (pageNumber === 'dots') {
                    return (
                        <div key={idx} className="flex h-8 w-8 items-center justify-center">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </div>
                    );
                }

                return (
                    <Button
                        key={idx}
                        variant={pageNumber === currentPage ? "default" : "outline"}
                        size="icon"
                        onClick={() => onPageChange(pageNumber)}
                        className="h-8 w-8"
                    >
                        {pageNumber}
                    </Button>
                );
            })}

            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8"
            >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
            </Button>
        </div>
    );
}

function range(start: number, end: number) {
    let length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
}
