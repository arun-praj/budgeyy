import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Toaster } from '@/components/ui/sonner';
import { getUserSettings } from '@/actions/user';

export const metadata = {
    title: 'Dashboard - Budgeyy',
    description: 'Manage your finances with the 50/30/20 rule',
};

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const userSettings = await getUserSettings();

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main className="flex-1 overflow-auto md:ml-64">
                <div className="container mx-auto p-4 md:p-6 lg:p-8 pt-6 pb-24 md:pb-6">
                    {children}
                </div>
            </main>
            <BottomNav avatarConfig={userSettings?.avatar} calendar={userSettings?.calendarPreference} />
            <Toaster />
        </div>
    );
}
