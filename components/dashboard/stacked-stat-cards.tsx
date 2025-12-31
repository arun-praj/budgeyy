'use client';

import { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { StatCard } from './stat-card';
import { cn } from '@/lib/utils';

interface StackedStatCardsProps {
    stats: Array<React.ComponentProps<typeof StatCard>>;
    className?: string;
}

export function StackedStatCards({ stats, className }: StackedStatCardsProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [dragging, setDragging] = useState(false);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setDragging(false);
        const threshold = 50;

        // Swipe Up (negative Y) OR Swipe Down (positive Y) -> Next Card
        // Both actions dismiss the current card to reveal the "back" card.
        if (Math.abs(info.offset.y) > threshold) {
            setActiveIndex((prev) => (prev + 1) % stats.length);
        }
    };

    return (
        <div className={cn("relative h-[200px] w-full flex justify-center items-end pb-4 select-none touch-none", className)}>
            {stats.map((stat, index) => {
                const isCurrent = index === activeIndex;

                // Calculate distance from active index in the cycle
                let diff = (index - activeIndex + stats.length) % stats.length;

                // Determine z-index and visuals
                const zIndex = 10 - diff;
                const scale = 1 - (diff * 0.05);
                const yOffset = -diff * 15;

                // Hide cards that are "Behind" by more than 2 steps to avoid clutter
                // But keep them rendered for animation continuity if needed, or just opacity 0
                const isHidden = diff > 2;

                return (
                    <motion.div
                        key={index}
                        drag={isCurrent ? "y" : false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragStart={() => setDragging(true)}
                        onDragEnd={handleDragEnd}
                        animate={{
                            scale: isHidden ? 0.9 : scale,
                            y: isHidden ? yOffset : yOffset, // Keep standard offset logic even if hidden
                            zIndex: zIndex,
                            opacity: isHidden ? 0 : 1
                        }}
                        initial={false}
                        // Use a fast customized transition for hidden items to reduce "fly back" glitch
                        transition={
                            isHidden
                                ? { duration: 0 } // Instant reset if moving to back of stack
                                : { type: "spring", stiffness: 300, damping: 30 }
                        }
                        className={cn(
                            "absolute w-full rounded-xl overflow-hidden bg-background", // Added bg-background to ensure it's not transparent
                            "border border-border", // semantic border
                            isCurrent ? "shadow-xl" : "shadow-sm", // Simplified shadows
                            // Ensure clicks don't register on hidden/back cards just in case
                            isHidden && "pointer-events-none"
                        )}
                        style={{
                            transformOrigin: "bottom center",
                        }}
                    >
                        <StatCard {...stat} className="border-none shadow-none h-full" />
                    </motion.div>
                );
            })}
        </div>
    );
}
