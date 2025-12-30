'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { updateSettings } from '@/actions/user';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const settingsSchema = z.object({
    currency: z.string().min(1, 'Currency is required'),
    calendarPreference: z.enum(['gregorian', 'nepali']),
    theme: z.enum(['light', 'dark', 'system']),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const currencies = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'INR', label: 'INR (₹)' },
    { value: 'NPR', label: 'NPR (Rs)' },
    { value: 'JPY', label: 'JPY (¥)' },
    { value: 'AUD', label: 'AUD ($)' },
    { value: 'CAD', label: 'CAD ($)' },
];

interface SettingsFormProps {
    defaultValues: Partial<SettingsFormValues>;
}

import { useTheme } from 'next-themes';
import { Moon, Sun, Laptop } from 'lucide-react';


export function SettingsForm({ defaultValues }: SettingsFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { setTheme } = useTheme();

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            currency: defaultValues.currency || 'USD',
            calendarPreference: defaultValues.calendarPreference || 'gregorian',
            theme: defaultValues.theme || 'system',
        },
    });

    async function onSubmit(data: SettingsFormValues) {
        setIsLoading(true);
        // Force theme update in case it wasn't triggered by click (e.g. initial save)
        if (data.theme) setTheme(data.theme);

        const result = await updateSettings(data);
        setIsLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Settings updated successfully');
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                    Manage your regional settings and display preferences.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* ... (Currency and Calendar fields remain same) ... */}
                        <FormField
                            control={form.control}
                            name="currency"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Currency</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select currency" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {currencies.map((currency) => (
                                                <SelectItem key={currency.value} value={currency.value}>
                                                    {currency.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        This will be used for all amount displays.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="calendarPreference"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Calendar System</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select calendar" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="gregorian">Gregorian (AD)</SelectItem>
                                            <SelectItem value="nepali">Nepali (BS)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Choose between the standard Gregorian calendar or the Nepali Bikram Sambat calendar.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="theme"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Appearance</FormLabel>
                                    <FormDescription>
                                        Customize how Budgeyy looks on your device.
                                    </FormDescription>
                                    <div className="grid max-w-md grid-cols-3 gap-4">
                                        {[
                                            { value: 'light', label: 'Light', icon: Sun },
                                            { value: 'dark', label: 'Dark', icon: Moon },
                                            { value: 'system', label: 'System', icon: Laptop },
                                        ].map((option) => (
                                            <Button
                                                key={option.value}
                                                type="button"
                                                variant="outline"
                                                size="lg"
                                                className={cn(
                                                    "flex flex-col items-center justify-between h-24 p-4 hover:bg-accent border-2",
                                                    field.value === option.value ? "border-primary bg-accent" : "border-muted"
                                                )}
                                                onClick={() => {
                                                    const newTheme = option.value;
                                                    field.onChange(newTheme);
                                                    setTheme(newTheme);
                                                    // Auto-save theme preference
                                                    updateSettings({ theme: newTheme as 'light' | 'dark' | 'system' });
                                                    toast.success('Theme updated');
                                                }}
                                            >
                                                <option.icon className="h-6 w-6 mb-2" />
                                                <span className="text-xs font-semibold">{option.label}</span>
                                            </Button>
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Preferences
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
