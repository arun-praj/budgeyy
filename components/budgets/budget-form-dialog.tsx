'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus, CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createBudget } from '@/actions/budgets';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const budgetSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    amountLimit: z.coerce.number().positive('Amount must be positive'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    period: z.enum(['monthly', 'yearly']),
    rollover: z.boolean(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

export function BudgetFormDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Default to current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const form = useForm({
        resolver: zodResolver(budgetSchema),
        defaultValues: {
            name: '',
            amountLimit: 0,
            startDate: startOfMonth.toISOString().split('T')[0],
            endDate: endOfMonth.toISOString().split('T')[0],
            period: 'monthly',
            rollover: false,
        },
    });

    async function onSubmit(data: BudgetFormValues) {
        setIsLoading(true);

        const result = await createBudget(data);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Budget created successfully');
            form.reset();
            setOpen(false);
            router.refresh();
        }

        setIsLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Budget
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Budget</DialogTitle>
                    <DialogDescription>
                        Set a spending limit for a specific period
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Budget Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Monthly Groceries" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="amountLimit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount Limit</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                $
                                            </span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="500.00"
                                                className="pl-8"
                                                {...field}
                                                value={field.value as number | string}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Start Date</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input type="date" className="pl-10" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="endDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>End Date</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input type="date" className="pl-10" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="period"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Period</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select period" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="yearly">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="rollover"
                            render={({ field }) => (
                                <FormItem>
                                    <div
                                        className={cn(
                                            'flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors',
                                            field.value ? 'border-primary bg-primary/5' : 'border-border'
                                        )}
                                        onClick={() => field.onChange(!field.value)}
                                    >
                                        <div>
                                            <p className="font-medium text-sm">Rollover</p>
                                            <p className="text-xs text-muted-foreground">
                                                Unused budget carries to next period
                                            </p>
                                        </div>
                                        <div
                                            className={cn(
                                                'h-5 w-9 rounded-full transition-colors relative',
                                                field.value ? 'bg-primary' : 'bg-muted'
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform',
                                                    field.value ? 'translate-x-4' : 'translate-x-0.5'
                                                )}
                                            />
                                        </div>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Budget'
                            )}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
