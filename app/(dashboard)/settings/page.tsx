import { DeletedTransactionsList } from '@/components/settings/deleted-transactions-list';
import { SettingsForm } from '@/components/settings/settings-form';
import { getUserSettings } from '@/actions/user';
import { getDeletedTransactions } from '@/actions/transactions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Tags, PiggyBank, Trash2 } from 'lucide-react';
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

export default async function SettingsPage() {
    const [user, deletedTransactions] = await Promise.all([
        getUserSettings(),
        getDeletedTransactions()
    ]);

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            </div>

            <div className="grid gap-6">
                {/* Mobile Management Links */}
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

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    <div className="col-span-full md:col-span-2">
                        <Tabs defaultValue="general" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="deleted">Deleted Items</TabsTrigger>
                            </TabsList>
                            <TabsContent value="general">
                                <SettingsForm
                                    defaultValues={{
                                        currency: user.currency || 'USD',
                                        calendarPreference: user.calendarPreference || 'gregorian',
                                        theme: user.theme as 'light' | 'dark' | 'system' || 'system',
                                    }}
                                />
                            </TabsContent>
                            <TabsContent value="deleted">
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
                    </div>
                </div>
            </div>
        </div>
    );
}
