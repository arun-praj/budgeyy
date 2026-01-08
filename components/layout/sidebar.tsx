'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    PiggyBank,
    Settings,
    LogOut,
    Wallet,
    Calendar,
    Receipt,
    Tags,
    Upload,
    User,
    Map as MapIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NotificationBell } from '@/components/layout/notification-bell';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/transactions', label: 'Transactions', icon: Receipt },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/categories', label: 'Categories', icon: Tags },
    { href: '/budgets', label: 'Budgets', icon: PiggyBank },
    { separator: true },
    { href: '/splitlog', label: 'Splitlog', icon: MapIcon },
    { separator: true },
    { href: '/settings', label: 'Profile', icon: User },
];

// @ts-ignore - library types mismatch
import { getRandomConfig as genConfig } from 'react-notion-avatar';
import dynamic from 'next/dynamic';
import { AvatarConfig } from 'react-notion-avatar';

const NotionAvatar = dynamic(() => import('react-notion-avatar').then(mod => mod.default), {
    ssr: false,
    loading: () => <User className="h-5 w-5" />, // Fallback to User icon
});

interface SidebarProps {
    avatarConfig?: AvatarConfig | string | null;
}

export function Sidebar({ avatarConfig: initialAvatarConfig }: SidebarProps) {
    const pathname = usePathname();
    // Parse avatar config if it's a string, or use default
    const avatarConfig = typeof initialAvatarConfig === 'string'
        ? JSON.parse(initialAvatarConfig)
        : initialAvatarConfig;

    const SidebarContent = () => (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center justify-between border-b px-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                        <Wallet className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-xl">Budgeyy</span>
                </div>
                <div className="flex items-center">
                    <NotificationBell />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item, index) => {
                    if ((item as any).separator) {
                        return <div key={`sep-${index}`} className="my-2 border-t border-border/50" />;
                    }

                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                    const isProfile = item.href === '/settings';
                    const Icon = item.icon as any;

                    return (
                        <Link
                            key={item.href}
                            href={item.href!}
                            className={cn(
                                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeNav"
                                    className="absolute inset-0 rounded-lg bg-primary/10"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            {isProfile && avatarConfig ? (
                                <div className="relative z-10 h-6 w-6 rounded-full border border-border overflow-hidden bg-background">
                                    <NotionAvatar config={avatarConfig} style={{ width: '100%', height: '100%' }} />
                                </div>
                            ) : (
                                <Icon className="relative z-10 h-5 w-5" />
                            )}
                            <span className="relative z-10">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Theme</span>
                    <ThemeToggle />
                </div>
            </div>
        </div>
    );

    return (
        <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-card fixed left-0 top-0">
            <SidebarContent />
        </aside>
    );
}
