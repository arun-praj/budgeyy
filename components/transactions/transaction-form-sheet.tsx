'use client';

import type { CalendarPreference } from '@/types';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2,
    Plus,
    CalendarIcon,
    ArrowDownLeft,
    ArrowUpRight,
    Repeat,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { updateTransaction, createTransaction } from '@/actions/transactions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/ui/image-upload';
import { CategorySelector } from './category-selector';
import type { Transaction, Category } from '@/db/schema';
import { NepaliDatePicker } from '../ui/nepali-date-picker';

interface TransactionWithCategory extends Transaction {
    category: Category | null;
}

const transactionSchema = z.object({
    type: z.enum(['income', 'expense', 'savings']),
    amount: z.coerce.number().positive('Amount must be positive'),
    date: z.string().min(1, 'Date is required'),
    description: z.string().optional(),
    categoryId: z.string().min(1, 'Category is required'),
    necessityLevel: z.enum(['needs', 'wants', 'savings']).optional(), // Keep schema permissive for legacy/migration safety
    isRecurring: z.boolean(),
    isCredit: z.boolean().optional(),
    receiptUrl: z.string().optional(),
    productImageUrl: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const necessityOptions = [
    { value: 'needs', label: 'Needs', color: 'bg-blue-500', description: 'Essential expenses (Rent, Utilities, Groceries)' },
    { value: 'wants', label: 'Wants', color: 'bg-purple-500', description: 'Discretionary spending (Dining, Entertainment)' },
] as const;


interface TransactionFormSheetProps {
    transaction?: TransactionWithCategory | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    calendar?: CalendarPreference | string | null;
    trigger?: React.ReactNode;
}

export function TransactionFormSheet({
    transaction,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    calendar = 'gregorian',
    trigger,
}: TransactionFormSheetProps = {}) {
    const router = useRouter();
    const [internalOpen, setInternalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen! : setInternalOpen;


    // Force Gregorian calendar for adding text, respect preference for editing ("All other remains same")
    const formCalendar = transaction ? calendar : 'gregorian';

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema) as any,
        defaultValues: {
            type: 'expense',
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            description: '',
            categoryId: '',
            necessityLevel: 'needs',
            isRecurring: false,
            isCredit: false,
            receiptUrl: '',
            productImageUrl: '',
        },
    });

    // Update form when transaction prop changes
    useEffect(() => {
        if (transaction) {
            form.reset({
                type: transaction.type,
                amount: parseFloat(transaction.amount),
                date: new Date(transaction.date).toISOString().split('T')[0],
                description: transaction.description || '',
                categoryId: transaction.categoryId || '',
                necessityLevel: transaction.necessityLevel || 'needs',
                isRecurring: transaction.isRecurring || false,
                isCredit: transaction.isCredit || false,
                receiptUrl: transaction.receiptUrl || '',
                productImageUrl: transaction.productImageUrl || '',
            });
        } else if (!open) {
            form.reset({
                type: 'expense',
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                description: '',
                categoryId: '',
                necessityLevel: 'needs',
                isRecurring: false,
                isCredit: false,
                receiptUrl: '',
                productImageUrl: '',
            });
        }
    }, [transaction, form, open]);

    const transactionType = form.watch('type');

    async function onSubmit(data: TransactionFormValues) {
        setIsLoading(true);

        let result;
        if (transaction) {
            result = await updateTransaction(transaction.id, {
                ...data,
                necessityLevel: data.type === 'expense' ? data.necessityLevel : undefined,
            });
        } else {
            result = await createTransaction({
                ...data,
                necessityLevel: data.type === 'expense' ? data.necessityLevel : undefined,
            });
        }

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(`${transaction ? 'Updated' : 'Added'} ${data.type === 'income' ? 'Income' : data.type === 'savings' ? 'Savings' : 'Expense'} successfully`);
            if (!transaction) form.reset();
            setOpen(false);
            router.refresh();
        }

        setIsLoading(false);
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <SheetTrigger asChild>
                    {trigger || (
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Transaction
                        </Button>
                    )}
                </SheetTrigger>
            )}
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{transaction ? 'Edit Transaction' : 'Add Transaction'}</SheetTitle>
                    <SheetDescription>
                        {transaction ? 'Make changes to your transaction' : 'Record a new income or expense'}
                    </SheetDescription>
                </SheetHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6 px-4 pb-6">
                        {/* Transaction Type Tabs */}
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
                                            <TabsTrigger value="expense" className="flex items-center gap-2">
                                                <ArrowDownLeft className="h-4 w-4" />
                                                Expense
                                            </TabsTrigger>
                                            <TabsTrigger value="income" className="flex items-center gap-2">
                                                <ArrowUpRight className="h-4 w-4" />
                                                Income
                                            </TabsTrigger>
                                            <TabsTrigger value="savings" className="flex items-center gap-2">
                                                <div className="h-4 w-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                </div>
                                                Savings
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </FormItem>
                            )}
                        />

                        {/* Amount */}
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                $
                                            </span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
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

                        {/* Date */}
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            {formCalendar === 'nepali' ? (
                                                <NepaliDatePicker
                                                    value={field.value ? new Date(field.value) : undefined}
                                                    onChange={(date) => {
                                                        const year = date.getFullYear();
                                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                                        const day = String(date.getDate()).padStart(2, '0');
                                                        field.onChange(`${year}-${month}-${day}`);
                                                    }}
                                                />
                                            ) : (
                                                <>
                                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="date"
                                                        className="pl-10"
                                                        {...field}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Grocery shopping..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Subcategory Selector */}
                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Subcategory</FormLabel>
                                    <CategorySelector
                                        type={transactionType}
                                        value={field.value}
                                        onSelect={field.onChange}
                                    />
                                    <FormDescription>
                                        Select or create a subcategory (e.g. {
                                            transactionType === 'income' ? 'Salary, Freelance' :
                                                transactionType === 'savings' ? 'Emergency Fund, Investments' :
                                                    'Groceries, Rent'
                                        })
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Necessity Level - Only for expenses */}
                        <AnimatePresence>
                            {transactionType === 'expense' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <FormField
                                        control={form.control}
                                        name="necessityLevel"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Category (50/30/20 Rule)</FormLabel>
                                                <FormDescription>
                                                    Categorize this expense for budget tracking
                                                </FormDescription>
                                                <div className="grid grid-cols-2 gap-3 pt-2">
                                                    {necessityOptions.map((option) => (
                                                        <div
                                                            key={option.value}
                                                            onClick={() => field.onChange(option.value)}
                                                            className={cn(
                                                                'cursor-pointer rounded-lg border-2 p-3 transition-all hover:border-primary/50 relative',
                                                                field.value === option.value
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'border-border'
                                                            )}
                                                        >
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={cn('h-3 w-3 rounded-full shrink-0', option.color)} />
                                                                    <span className="font-medium">{option.label}</span>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground leading-tight">
                                                                    {option.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Credit Card Toggle */}
                                    <FormField
                                        control={form.control}
                                        name="isCredit"
                                        render={({ field }) => (
                                            <FormItem className="pt-4">
                                                <div
                                                    className={cn(
                                                        'flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors',
                                                        field.value ? 'border-primary bg-primary/5' : 'border-border'
                                                    )}
                                                    onClick={() => field.onChange(!field.value)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            'flex items-center justify-center bg-background border p-2 rounded-md',
                                                            field.value ? 'border-primary' : 'border-muted'
                                                        )}>
                                                            💳
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm">Paid with Credit Card</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Deducted from salary on 10th
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {field.value && (
                                                        <Badge variant="secondary">
                                                            Credit
                                                        </Badge>
                                                    )}
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Recurring */}
                        <FormField
                            control={form.control}
                            name="isRecurring"
                            render={({ field }) => (
                                <FormItem className="pt-2">
                                    <div
                                        className={cn(
                                            'flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors',
                                            field.value ? 'border-primary bg-primary/5' : 'border-border'
                                        )}
                                        onClick={() => field.onChange(!field.value)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                'flex items-center justify-center bg-background border p-2 rounded-md',
                                                field.value ? 'border-primary text-primary' : 'border-muted text-muted-foreground'
                                            )}>
                                                <Repeat className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Recurring Transaction</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Repeats monthly
                                                </p>
                                            </div>
                                        </div>
                                        {field.value && (
                                            <Badge variant="secondary">
                                                Active
                                            </Badge>
                                        )}
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Image Uploads */}
                        <div className="pt-2">
                            {transactionType === 'expense' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Product Image */}
                                    <FormField
                                        control={form.control}
                                        name="productImageUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <ImageUpload
                                                        label="Product"
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        onRemove={() => field.onChange('')}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Receipt/Invoice */}
                                    <FormField
                                        control={form.control}
                                        name="receiptUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <ImageUpload
                                                        label="Receipt"
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        onRemove={() => field.onChange('')}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            ) : (
                                /* Receipt/Invoice - For Income/Savings */
                                <FormField
                                    control={form.control}
                                    name="receiptUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <ImageUpload
                                                    label="Proof / Receipt"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onRemove={() => field.onChange('')}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                `${transaction ? 'Save Changes' : 'Add ' + (transactionType === 'income' ? 'Income' : transactionType === 'savings' ? 'Savings' : 'Expense')}`
                            )}
                        </Button>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
