'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Mail, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { TransactionalEmailsList } from './transactional-emails-list';
import { syncGmail } from '@/actions/gmail-sync';
import { toast } from "sonner";
import { useRouter } from 'next/navigation';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRecentTransactionalEmails } from "@/actions/gmail-sync";
import { useEffect, useState } from "react";

interface GmailIntegrationProps {
    accountStatus: {
        isConnected: boolean;
        hasRefreshToken: boolean;
    };
    initialEmails: any[];
}

export function GmailIntegration({ accountStatus, initialEmails }: GmailIntegrationProps) {
    const [isSyncing, setIsSyncing] = useState(false);
    const router = useRouter();
    const { isConnected, hasRefreshToken } = accountStatus;

    // We use state because we fetch other tabs client-side for simplicity
    const [pendingEmails, setPendingEmails] = useState(initialEmails);
    const [rejectedEmails, setRejectedEmails] = useState<any[]>([]);
    const [clearedEmails, setClearedEmails] = useState<any[]>([]);

    useEffect(() => {
        setPendingEmails(initialEmails);
        const fetchOthers = async () => {
            const rejected = await getRecentTransactionalEmails('rejected');
            const cleared = await getRecentTransactionalEmails('cleared');
            setRejectedEmails(rejected);
            setClearedEmails(cleared);
        };
        fetchOthers();
    }, [initialEmails]);

    const handleConnect = async () => {
        await authClient.linkSocial({
            provider: "google",
            callbackURL: "/settings", // Redirect back to settings
        });
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncGmail();
            if (result.success) {
                toast.success(`Synced ${result.syncedCount} new emails!`);
                router.refresh(); // Refresh to show new emails
            } else {
                toast.error(result.error || 'Failed to sync');
            }
        } catch (error) {
            toast.error('An error occurred during sync');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Gmail Integration
                    </CardTitle>
                    <CardDescription>
                        Connect your Gmail account to automatically scan for transactional emails (receipts, invoices) using AI.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                <Mail className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium">Google Account</h4>
                                    {isConnected && !hasRefreshToken && (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            Reconnect Required
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {isConnected
                                        ? (hasRefreshToken ? 'Connected & Ready' : 'Connection Expired')
                                        : 'Not connected'}
                                </p>
                            </div>
                        </div>
                        {isConnected && hasRefreshToken ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                    variant="outline"
                                >
                                    {isSyncing ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                    )}
                                    Sync Now
                                </Button>
                                <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 pointer-events-none">
                                    <CheckCircle className="h-5 w-5" />
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={handleConnect} variant={isConnected ? "default" : "outline"}>
                                {isConnected ? 'Reconnect Gmail' : 'Connect Gmail'}
                            </Button>
                        )}
                    </div>

                    {!isConnected && (
                        <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground flex gap-2 items-start">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>
                                Connecting will grant read-only access to your emails. We use Gemini AI to strictly process metadata
                                and identify financial transactions. Your emails are not stored; only extracted transaction details are saved.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
            import {getRecentTransactionalEmails} from "@/actions/gmail-sync";
            import {useEffect, useState} from "react";

            // ... previous imports ...

            export function GmailIntegration({accountStatus, initialEmails}: GmailIntegrationProps) {
    const [isSyncing, setIsSyncing] = useState(false);
            const [pendingEmails, setPendingEmails] = useState(initialEmails);
            const [rejectedEmails, setRejectedEmails] = useState<any[]>([]);
            const [clearedEmails, setClearedEmails] = useState<any[]>([]);

    // Fetch other tabs on mount or tab change could be better, but simple fetch effect for now
    useEffect(() => {
        const fetchOthers = async () => {
            const rejected = await getRecentTransactionalEmails('rejected');
            const cleared = await getRecentTransactionalEmails('cleared');
            setRejectedEmails(rejected);
            setClearedEmails(cleared);
        };
            fetchOthers();
    }, [initialEmails]); // Re-fetch when initial (pending) changes via sync/refresh

            // ... existing handlers ...

            return (
            <div className="space-y-6">
                <Card>
                    {/* ... existing header and connection UI ... */}
                    <CardContent className="space-y-4">
                        {/* ... existing connection status UI ... */}
                    </CardContent>
                </Card>

                {isConnected && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Emails</CardTitle>
                            <CardDescription>
                                Transactional emails identified by AI.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="pending">
                                <TabsList>
                                    <TabsTrigger value="pending">Inbox ({pendingEmails.length})</TabsTrigger>
                                    <TabsTrigger value="rejected">Rejected ({rejectedEmails.length})</TabsTrigger>
                                    <TabsTrigger value="cleared">Cleared ({clearedEmails.length})</TabsTrigger>
                                </TabsList>
                                <TabsContent value="pending" className="mt-4">
                                    <TransactionalEmailsList emails={pendingEmails} type="pending" />
                                </TabsContent>
                                <TabsContent value="rejected" className="mt-4">
                                    <TransactionalEmailsList emails={rejectedEmails} type="rejected" />
                                </TabsContent>
                                <TabsContent value="cleared" className="mt-4">
                                    <TransactionalEmailsList emails={clearedEmails} type="cleared" />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                )}
            </div>
            );
}
