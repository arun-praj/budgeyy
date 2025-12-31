import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Map } from 'lucide-react';

export default function SplitlogPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Splitlog</h1>
                <p className="text-muted-foreground">
                    Log and split expenses with friends.
                </p>
            </div>

            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle>Splitlog Feature Coming Soon</CardTitle>
                    <CardDescription>
                        We are building a robust way to track shared expenses and settle debts.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Map className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center max-w-sm text-muted-foreground">
                        <p>Track shared expenses, settle debts, and organize group spending right from your Budgeyy dashboard.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
