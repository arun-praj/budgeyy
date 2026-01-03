'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Mail, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

const verifySchema = z.object({
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');

    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [mounted, setMounted] = useState(false);
    const hasSentInitial = useRef(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const form = useForm<VerifyFormValues>({
        resolver: zodResolver(verifySchema),
        defaultValues: {
            otp: '',
        },
    });

    // Automatically send OTP on mount if email is present
    useEffect(() => {
        if (email && !hasSentInitial.current && !isSuccess) {
            hasSentInitial.current = true;
            handleResend();
        }
    }, [email, isSuccess]);

    async function onSubmit(data: VerifyFormValues) {
        setIsLoading(true);
        setError(null);

        try {
            const { error: verifyError } = await authClient.emailOtp.verifyEmail({
                email: email || '',
                otp: data.otp,
            });

            if (verifyError) {
                setError(verifyError.message || 'Verification failed. Please check your code.');
            } else {
                setIsSuccess(true);
                toast.success('Email verified successfully!');

                // Force session refresh to flush the 'emailVerified' status to the cookie
                await authClient.getSession({
                    fetchOptions: {
                        headers: {
                            'Cache-Control': 'no-store'
                        }
                    }
                });

                setTimeout(() => {
                    const callbackUrl = searchParams.get('callbackUrl');
                    const onboardingUrl = `/onboarding${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;
                    router.push(onboardingUrl);
                    router.refresh();
                }, 2000);
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleResend() {
        if (!email) {
            toast.error('Email address not found. Please try logging in again.');
            return;
        }

        setIsResending(true);
        try {
            const { error: resendError } = await authClient.emailOtp.sendVerificationOtp({
                email,
                type: 'email-verification',
            });

            if (resendError) {
                toast.error(resendError.message || 'Failed to resend code');
            } else {
                toast.success('A new verification code has been sent!');
            }
        } catch (err) {
            toast.error('Failed to resend code. Please try again later.');
        } finally {
            setIsResending(false);
        }
    }

    if (isSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center space-y-4 text-center p-8"
            >
                <div className="rounded-full bg-green-100 p-3 text-green-600">
                    <CheckCircle2 className="h-12 w-12" />
                </div>
                <h2 className="text-2xl font-bold">Email Verified!</h2>
                <p className="text-muted-foreground text-lg">Redirecting you to onboarding...</p>
                <Loader2 className="h-8 w-8 animate-spin text-primary mt-4" />
            </motion.div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-md"
            >
                <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
                    <CardHeader className="space-y-2 text-center">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                            className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
                        >
                            <Mail className="h-8 w-8 text-primary" />
                        </motion.div>
                        <CardTitle className="text-3xl font-bold tracking-tight">Check your email</CardTitle>
                        <CardDescription className="text-base text-center">
                            We&apos;ve sent a 6-digit verification code to
                            <br />
                            <span className="font-semibold text-primary/80">{mounted ? (email || 'your email') : 'your email'}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 rounded-xl"
                                        >
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            {error}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <FormField
                                    control={form.control}
                                    name="otp"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-center block text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Verification Code</FormLabel>
                                            <FormControl>
                                                <div className="relative flex justify-center group">
                                                    <Input
                                                        {...field}
                                                        id="otp-input"
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={6}
                                                        autoComplete="one-time-code"
                                                        className="absolute inset-0 opacity-0 cursor-default"
                                                        autoFocus
                                                        disabled={isLoading}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                                                            field.onChange(val);
                                                        }}
                                                    />
                                                    <div className="flex gap-2 sm:gap-3 pointer-events-none">
                                                        {[0, 1, 2, 3, 4, 5].map((index) => {
                                                            const digit = field.value?.[index];
                                                            const isActive = field.value?.length === index || (index === 5 && field.value?.length === 6);
                                                            return (
                                                                <motion.div
                                                                    key={index}
                                                                    initial={false}
                                                                    animate={{
                                                                        scale: isActive ? 1.05 : 1,
                                                                        borderColor: isActive ? 'var(--primary)' : 'var(--muted)',
                                                                        backgroundColor: isActive ? 'var(--background)' : 'var(--muted)',
                                                                    }}
                                                                    className={`w-10 h-14 sm:w-11 sm:h-15 flex items-center justify-center text-2xl font-bold rounded-xl border-2 shadow-sm transition-colors ${digit ? 'text-foreground' : 'text-muted-foreground/30'
                                                                        } ${isActive ? 'ring-4 ring-primary/10' : ''}`}
                                                                >
                                                                    {digit || ''}
                                                                    {isActive && !isLoading && (
                                                                        <motion.div
                                                                            animate={{ opacity: [1, 0] }}
                                                                            transition={{ duration: 0.8, repeat: Infinity }}
                                                                            className="absolute w-0.5 h-6 bg-primary rounded-full"
                                                                        />
                                                                    )}
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-center text-sm font-medium mt-4" />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        'Verify Account'
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-6 pt-2 pb-8">
                        <div className="flex items-center justify-center flex-col gap-3">
                            <p className="text-sm text-muted-foreground font-medium">
                                Didn&apos;t receive the code?
                            </p>
                            <Button
                                variant="outline"
                                size="lg"
                                className="text-primary border-primary/20 hover:bg-primary/5 font-semibold rounded-xl px-8"
                                onClick={handleResend}
                                disabled={isResending}
                            >
                                {isResending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                Resend Verification Code
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
