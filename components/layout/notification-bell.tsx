'use client';

import { useState, useEffect } from 'react';
import { Inbox, Check, Loader2, X } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getUnreadTransactionCount, getRecentUnreadTransactions, markAllTransactionsAsRead } from '@/actions/notifications';
import { rejectEmailTransaction } from '@/actions/reject-transaction';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { VerifyTransactionDialog } from '@/components/transactions/verify-transaction-dialog';

export function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const count = await getUnreadTransactionCount();
            setUnreadCount(count);
            // Even if count 0, fetching recent to clear legacy cache/state if needed, but mainly optimization
            if (count > 0) {
                const recent = await getRecentUnreadTransactions();
                setRecentNotifications(recent);
            } else {
                setRecentNotifications([]);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    // Poll every 30 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleReject = async (emailId: string) => {
        try {
            await rejectEmailTransaction(emailId);
            setRecentNotifications(prev => prev.filter(n => n.id !== emailId));
            setUnreadCount(prev => Math.max(0, prev - 1));
            toast.success('Transaction rejected');
            if (unreadCount <= 1) setIsOpen(false);
            router.refresh(); // Sync other lists
        } catch (error) {
            toast.error('Failed to reject');
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Inbox className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h4 className="font-semibold">Transaction Inbox</h4>
                    <span className="text-xs text-muted-foreground">{unreadCount} pending</span>
                </div>
                <ScrollArea className="h-[300px]">
                    {unreadCount === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                            <Inbox className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">All caught up!</p>
                        </div>
                    ) : (
                        <div className="grid gap-1">
                            {recentNotifications.map((notification) => (
                                <div key={notification.id} className="w-full border-b last:border-0 hover:bg-muted/50 transition-colors group relative">
                                    <VerifyTransactionDialog
                                        email={{
                                            ...notification,
                                            date: new Date(notification.date)
                                        }}
                                        trigger={
                                            <button
                                                className="flex flex-col items-start gap-1 p-4 text-left w-full"
                                            >
                                                <div className="flex w-full items-center justify-between gap-2">
                                                    <span className="font-medium text-sm line-clamp-1">{notification.description || notification.subject}</span>
                                                    <span className="text-xs font-mono text-muted-foreground whitespace-nowrap bg-muted px-1 rounded">
                                                        {notification.amount ? `${notification.currency || '$'} ${notification.amount}` : '-'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-1 pr-6">
                                                    {notification.sender}
                                                </p>
                                                <span className="text-[10px] text-muted-foreground mt-1 block">
                                                    {new Date(notification.date).toLocaleDateString()}
                                                </span>
                                            </button>
                                        }
                                        onSuccess={() => {
                                            setRecentNotifications(prev => prev.filter(n => n.id !== notification.id));
                                            setUnreadCount(prev => Math.max(0, prev - 1));
                                            if (unreadCount <= 1) setIsOpen(false);
                                        }}
                                    />
                                    {/* Reject Button - Absolute positioned, visible on hover */}
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:bg-red-100 hover:text-red-600 z-10"
                                        title="Reject (Not a transaction)"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReject(notification.id);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                {unreadCount > 0 && (
                    <div className="border-t p-2">
                        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => router.push('/settings')}>
                            Manage All in Settings
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
