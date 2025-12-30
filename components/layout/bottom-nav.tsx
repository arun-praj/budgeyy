'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Calendar, Settings, Plus, Home, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransactionFormSheet } from '@/components/transactions/transaction-form-sheet';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const NotionAvatar = dynamic(() => import('react-notion-avatar').then(mod => mod.default), {
    ssr: false,
    loading: () => <User className="h-6 w-6" />
});

interface BottomNavProps {
    avatarConfig?: string | null;
    calendar?: string;
}

export function BottomNav({ avatarConfig, calendar }: BottomNavProps) {
    const pathname = usePathname();

    const navItems = [
        { href: '/dashboard', label: 'Home', icon: Home },
        { href: '/transactions', label: 'Trans.', icon: Receipt },
        // Middle button placeholder
        { href: 'ADD', label: '', icon: null },
        { href: '/calendar', label: 'Calendar', icon: Calendar },
        { href: '/settings', label: 'Profile', icon: User, isProfile: true },
    ];

    // Parse avatar config safely
    const avatarData = avatarConfig ? JSON.parse(avatarConfig) : null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none">
            {/* 
               SVG Curve Container.
               We use a viewbox that allows us to draw a precise curve.
               The bar height is set, and we subtract the curve area.
            */}
            <div className="relative w-full h-24 flex items-end">
                {/* Visual Background Layer with SVG */}
                <div className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_-5px_10px_rgba(0,0,0,0.05)] text-background backdrop-blur-xl">
                    <svg
                        viewBox="0 0 375 80"
                        className="w-full h-full fill-current opacity-95 backdrop-blur-3xl"
                        preserveAspectRatio="none"
                        style={{ filter: "drop-shadow(0px -2px 10px rgba(0,0,0,0.03))" }}
                    >
                        {/* 
                            Path drawing:
                            Start bottom left (0,80) -> up to top left (0, 20)
                            Line to start of curve (147, 20)
                            Curve down for FAB (cubic bezier)
                            Line to end
                            Close path
                         */}
                        <path d="M0,80 L0,20 L138,20 C138,20 148,20 152,28 C158,40 170,45 187.5,45 C205,45 217,40 223,28 C227,20 237,20 237,20 L375,20 L375,80 Z" />
                    </svg>
                </div>

                {/* Floating Action Button (Center) */}
                <div className="absolute top-[10px] left-1/2 -translate-x-1/2 pointer-events-auto z-20">
                    <TransactionFormSheet
                        calendar={calendar}
                        trigger={
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="h-14 w-14 rounded-full bg-primary shadow-[0_8px_20px_rgba(0,0,0,0.2)] flex items-center justify-center border-[4px] border-transparent relative group"
                            >
                                {/* Inner ring/border effect handled by parent SVG or background matching if needed, 
                                    but here we just float it nicely. */}
                                <Plus className="h-7 w-7 text-primary-foreground" />

                                {/* Pulse Effect */}
                                <div className="absolute inset-0 rounded-full bg-primary opacity-20 animate-ping group-hover:animate-none" />
                            </motion.button>
                        }
                    />
                </div>

                {/* Navigation Items */}
                <div className="relative w-full h-16 pb-safe-bottom flex items-start justify-between px-2 z-10 pointer-events-auto">
                    {navItems.map((item, index) => {
                        if (item.href === 'ADD') return <div key={index} className="w-20" />; // Spacer for center button

                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "relative flex flex-col items-center justify-center w-16 h-14 transition-colors pt-2",
                                    isActive ? "text-primary" : "text-muted-foreground/60"
                                )}
                            >
                                {/* Active Indicator Dot */}
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-pill"
                                        className="absolute -top-1 w-1 h-1 rounded-full bg-primary"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}

                                <motion.div
                                    animate={isActive ? { y: -2 } : { y: 0 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {item.isProfile && avatarData ? (
                                        <div className={cn("h-6 w-6 rounded-full overflow-hidden border border-border/50", isActive && "ring-2 ring-primary/20 scale-110 border-primary")}>
                                            <NotionAvatar config={avatarData} style={{ width: '100%', height: '100%' }} />
                                        </div>
                                    ) : (
                                        Icon && <Icon className={cn("h-6 w-6", isActive && "fill-current/20 stroke-[2.5px]")} />
                                    )}
                                </motion.div>
                            </Link>
                        )
                    })}
                </div>
            </div>

            {/* Safe area filler for bottom */}
            <div className="h-safe-bottom bg-background/95 backdrop-blur-3xl pointer-events-auto w-full" />
        </div>
    );
}
