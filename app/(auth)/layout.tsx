import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sign In - Budgeyy',
    description: 'Sign in to your Budgeyy account',
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
            <div className="w-full max-w-md">
                {children}
            </div>
        </div>
    );
}
