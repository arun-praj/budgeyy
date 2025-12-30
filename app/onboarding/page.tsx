import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { Toaster } from '@/components/ui/sonner';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const metadata = {
    title: 'Get Started - Budgeyy',
    description: 'Complete your profile setup',
};

export default async function OnboardingPage() {
    // Check if user is authenticated
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    // Redirect to login if not authenticated
    if (!session) {
        redirect('/login');
    }

    // Redirect to dashboard if onboarding is complete
    const user = session.user as { onboardingCompleted?: boolean };
    if (user?.onboardingCompleted) {
        redirect('/dashboard');
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
            <OnboardingWizard />
            <Toaster />
        </div>
    );
}
