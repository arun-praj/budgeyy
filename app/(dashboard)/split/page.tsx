import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

export default function SplitPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Split Bills</h1>
                <p className="text-muted-foreground">
                    Share expenses with friends and family easily.
                </p>
            </div>

            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle>Splitwise Feature Coming Soon</CardTitle>
                    <CardDescription>
                        We are building a robust way to split bills and track balances with your friends.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Share2 className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center max-w-sm text-muted-foreground">
                        <p>Track shared expenses, settle debts, and organize group spending right from your Budgeyy dashboard.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
