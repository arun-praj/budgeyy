'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { updateUserProfile } from '@/actions/user';
import { toast } from 'sonner';
import { Loader2, RefreshCcw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { AvatarConfig } from 'react-notion-avatar';
// @ts-ignore - library types mismatch
import { getRandomConfig as genConfig } from 'react-notion-avatar';

const NotionAvatar = dynamic(() => import('react-notion-avatar').then(mod => mod.default), {
    ssr: false,
    loading: () => <div className="h-24 w-24 rounded-full bg-muted animate-pulse" />
});

const accountFormSchema = z.object({
    fullName: z.string().min(2, {
        message: 'Name must be at least 2 characters.',
    }),
    email: z.string().email().optional(), // Read only mostly
    avatar: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountFormProps {
    defaultValues: Partial<AccountFormValues>;
}

export function AccountForm({ defaultValues }: AccountFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(
        defaultValues.avatar ? JSON.parse(defaultValues.avatar) : genConfig()
    );

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues: {
            fullName: defaultValues.fullName || '',
            email: defaultValues.email || '',
            avatar: defaultValues.avatar || JSON.stringify(avatarConfig),
        },
    });

    const refreshAvatar = () => {
        const newConfig = genConfig();
        setAvatarConfig(newConfig);
        form.setValue('avatar', JSON.stringify(newConfig), { shouldDirty: true });
    };

    async function onSubmit(data: AccountFormValues) {
        setIsLoading(true);

        try {
            const result = await updateUserProfile({
                fullName: data.fullName,
                avatar: data.avatar,
            });

            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success('Profile updated successfully');
            form.reset(data); // Reset dirty state
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                        <CardDescription>
                            Update your profile details and public avatar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        <FormField
                            control={form.control}
                            name="avatar"
                            render={({ field }) => (
                                <FormItem className="flex flex-col items-center sm:items-start space-y-4">
                                    <FormLabel>Avatar</FormLabel>
                                    <div className="flex items-center gap-6">
                                        <div className="relative h-24 w-24 rounded-full border-2 border-border overflow-hidden bg-background shadow-sm">
                                            <NotionAvatar config={avatarConfig} style={{ width: '100%', height: '100%' }} />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={refreshAvatar}
                                            className="gap-2"
                                        >
                                            <RefreshCcw className="h-4 w-4" />
                                            Randomize Avatar
                                        </Button>
                                    </div>
                                    <FormControl>
                                        <Input type="hidden" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Click randomize to generate a new unique avatar.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="fullName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Your name" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            This is the name that will be displayed on your profile.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled />
                                        </FormControl>
                                        <FormDescription>
                                            Email cannot be changed securely at this time.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </Form>
    );
}
