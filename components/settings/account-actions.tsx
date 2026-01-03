'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Trash2, PowerOff, Loader2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { deleteAccount, deactivateAccount } from '@/actions/user';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export function AccountActions() {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const router = useRouter();

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteAccount();
            if (result.success) {
                toast.success('Account scheduled for deletion. You will be logged out.');
                await signOut({
                    fetchOptions: {
                        onSuccess: () => router.push('/'),
                    },
                });
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeactivate = async () => {
        setIsDeactivating(true);
        try {
            const result = await deactivateAccount();
            if (result.success) {
                toast.success('Account deactivated. You will be logged out.');
                await signOut({
                    fetchOptions: {
                        onSuccess: () => router.push('/'),
                    },
                });
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setIsDeactivating(false);
        }
    };

    return (
        <Card className="border-red-100 dark:border-red-900/30">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    Danger Zone
                </CardTitle>
                <CardDescription>
                    Irreversible and destructive actions. Please proceed with caution.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Deactivate Account */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium">
                            <PowerOff className="h-4 w-4 text-orange-500" />
                            Deactivate Account
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Temporarily disable your account. Your data will be hidden but preserved.
                            Log in anytime to reactivate.
                        </p>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900/50 dark:hover:bg-red-900/20">
                                Deactivate
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate Account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will log you out and hide your profile and data from other users.
                                    You can reactivate your account simply by logging in again.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleDeactivate();
                                    }}
                                    className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
                                    disabled={isDeactivating}
                                >
                                    {isDeactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deactivate Account'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                {/* Delete Account */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium">
                            <Trash2 className="h-4 w-4 text-red-600" />
                            Delete Account
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Permanently delete your account and all data.
                            <br />
                            <span className="font-semibold text-red-600/80">You have a 30-day grace period to restore your account by logging in.</span>
                        </p>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                Delete Account
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription className="space-y-2">
                                    <p>
                                        This action will schedule your account for permanent deletion in 30 days.
                                    </p>
                                    <p>
                                        To confirm, please type <span className="font-bold text-foreground">DELETE</span> below.
                                    </p>
                                    <Input
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                        placeholder="Type DELETE to confirm"
                                        className="mt-2"
                                    />
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleDelete();
                                    }}
                                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                    disabled={isDeleting || deleteConfirmation !== 'DELETE'}
                                >
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule Deletion'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

            </CardContent>
        </Card>
    );
}
