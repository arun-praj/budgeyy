import { DeletedTransactionsList } from '@/components/settings/deleted-transactions-list';
import { SettingsForm } from '@/components/settings/settings-form';
import { AccountForm } from '@/components/settings/account-form';
import { DataExport } from '@/components/settings/data-export';
import { DataImport } from '@/components/settings/data-import';
import { AccountActions } from '@/components/settings/account-actions';
import { getUserSettings } from '@/actions/user';
import { getDeletedTransactions } from '@/actions/transactions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Tags, PiggyBank, Trash2, User, Settings as SettingsIcon } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="container mx-auto px-4 pt-6 pb-32 md:p-6 lg:p-8 md:pb-6 space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
            </div>

            <div className="space-y-4">
                {/* Mobile Management Links - Keeping these for easy access */}
                <div className="grid gap-4 grid-cols-2 md:hidden">
                    <Link href="/categories" className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card text-card-foreground shadow-sm hover:bg-accent/50 transition-colors">
                        <Tags className="h-6 w-6 mb-2 text-primary" />
                        <span className="font-medium text-sm">Categories</span>
                    </Link>
                    <Link href="/budgets" className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card text-card-foreground shadow-sm hover:bg-accent/50 transition-colors">
                        <PiggyBank className="h-6 w-6 mb-2 text-primary" />
                        <span className="font-medium text-sm">Budgets</span>
                    </Link>
                </div>

                <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                    <SettingsContent />
                </Suspense>
            </div>
        </div>
    );
}

async function SettingsContent() {
    const [user, deletedTransactions] = await Promise.all([
        getUserSettings(),
        getDeletedTransactions()
    ]);

    if (!user) {
        redirect('/login');
    }

    return (
        <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="deleted">Trash</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
                <SettingsForm
                    defaultValues={{
                        currency: user.currency || 'USD',
                        calendarPreference: user.calendarPreference || 'gregorian',
                        theme: user.theme as 'light' | 'dark' | 'system' || 'system',
                    }}
                />
            </TabsContent>

            <TabsContent value="account" className="space-y-4">
                <AccountForm
                    defaultValues={{
                        fullName: user.fullName || '',
                        email: user.email || '',
                        avatar: user.avatar || undefined,
                    }}
                />
                <DataExport />
                <DataImport />
                <AccountActions />
            </TabsContent>

            <TabsContent value="deleted" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Deleted Transactions
                        </CardTitle>
                        <CardDescription>
                            Transactions deleted in the last 30 days. You can restore them or delete them permanently.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DeletedTransactionsList
                            initialData={deletedTransactions}
                            currency={user.currency || 'USD'}
                        />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
