import { redirect } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { Toaster } from '@/components/ui/sonner';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const metadata = {
    title: 'Get Started - Budgeyy',
    description: 'Complete your profile setup',
};

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
                <OnboardingContent searchParams={props.searchParams} />
            </Suspense>
            <Toaster />
        </div>
    );
}

async function OnboardingContent({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
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
        const params = await searchParams;
        const callbackUrl = params?.callbackUrl as string;
        redirect(callbackUrl || '/dashboard');
    }

    return <OnboardingWizard />;
}
