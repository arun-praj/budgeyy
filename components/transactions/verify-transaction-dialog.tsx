'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Check, ArrowDownLeft, ArrowUpRight, Repeat, CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CategorySelector } from '@/components/transactions/category-selector';
import { verifyEmailTransaction } from '@/actions/verify-transaction';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { format } from 'date-fns';

// Simplified schema reuse (adapted from transaction-form-sheet)
const transactionSchema = z.object({
    type: z.enum(['income', 'expense', 'savings']),
    amount: z.coerce.number().positive('Amount must be positive'),
    date: z.string().min(1, 'Date is required'),
    description: z.string().optional(),
    categoryId: z.string().min(1, 'Category is required'),
    necessityLevel: z.enum(['needs', 'wants', 'savings']).optional(),
    isRecurring: z.boolean(),
    isCredit: z.boolean().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface VerifyTransactionDialogProps {
    email: {
        id: string; // The transactional_email ID
        sender: string;
        subject: string;
        amount: string | null;
        currency: string | null;
        date: Date;
        category: string | null; // AI string suggestion
        description: string;
    };
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

const necessityOptions = [
    { value: 'needs', label: 'Needs', color: 'bg-blue-500', description: 'Essential' },
    { value: 'wants', label: 'Wants', color: 'bg-purple-500', description: 'Discretionary' },
] as const;

export function VerifyTransactionDialog({ email, trigger, onSuccess }: VerifyTransactionDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Default values derived from email
    const defaultValues: Partial<TransactionFormValues> = {
        type: 'expense', // Default to expense, user can change
        amount: email.amount ? parseFloat(email.amount) : 0,
        date: new Date(email.date).toISOString().split('T')[0],
        description: email.description || `${email.sender} - ${email.subject}`,
        categoryId: '', // User MUST select
        necessityLevel: 'needs',
        isRecurring: false,
        isCredit: false,
    };

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema) as any, // Cast to any to bypass strict type mismatch with RHF
        defaultValues: defaultValues as any,
    });

    const transactionType = form.watch('type');

    async function onSubmit(data: TransactionFormValues) {
        setIsLoading(true);
        try {
            const result = await verifyEmailTransaction({
                emailId: email.id,
                amount: data.amount,
                date: new Date(data.date),
                description: data.description || '',
                categoryId: data.categoryId,
                type: data.type,
                isRecurring: data.isRecurring,
                necessityLevel: data.necessityLevel,
                isCredit: data.isCredit,
            });

            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success('Transaction Verified and Added!');
            setOpen(false);
            router.refresh();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" variant="outline" className="gap-2">
                        <Check className="h-4 w-4" />
                        Verify
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Verify Transaction</DialogTitle>
                    <DialogDescription>
                        Confirm details from the email before adding to your ledger.
                    </DialogDescription>
                </DialogHeader>

                {/* Email Snippet for Reference */}
                <div className="bg-muted/50 p-3 rounded-md text-sm mb-2 border border-border/50">
                    <p className="font-medium text-foreground">{email.sender}</p>
                    <p className="text-muted-foreground line-clamp-2">{email.subject}</p>
                    <div className="flex justify-between items-center mt-2 text-xs">
                        <span className="font-mono bg-background px-1 rounded">{email.currency || '$'} {email.amount}</span>
                        <span className="text-muted-foreground">{format(new Date(email.date), 'MMM d, yyyy')}</span>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <Tabs
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        className="w-full"
                                    >
                                        <TabsList className="grid w-full grid-cols-3">
                                            <TabsTrigger value="expense" className="flex items-center gap-2 text-xs"><ArrowDownLeft className="h-3 w-3" /> Expense</TabsTrigger>
                                            <TabsTrigger value="income" className="flex items-center gap-2 text-xs"><ArrowUpRight className="h-3 w-3" /> Income</TabsTrigger>
                                            <TabsTrigger value="savings" className="flex items-center gap-2 text-xs">Savings</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                                <Input type="number" step="0.01" className="pl-6" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type="date" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Category <span className="text-xs font-normal text-muted-foreground">(AI Suggestion: {email.category || 'None'})</span></FormLabel>
                                    <CategorySelector
                                        type={transactionType}
                                        value={field.value}
                                        onSelect={field.onChange}
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {transactionType === 'expense' && (
                            <div className="grid grid-cols-2 gap-3">
                                {necessityOptions.map((option) => (
                                    <div
                                        key={option.value}
                                        onClick={() => form.setValue('necessityLevel', option.value as any)}
                                        className={cn(
                                            'cursor-pointer rounded-lg border p-2 flex items-center gap-2 transition-all',
                                            form.watch('necessityLevel') === option.value
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border'
                                        )}
                                    >
                                        <div className={cn('h-2 w-2 rounded-full', option.color)} />
                                        <span className="text-sm font-medium">{option.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm & Add'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
