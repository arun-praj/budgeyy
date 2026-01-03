'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Loader2,
    User,
    Globe,
    Calendar,
    CreditCard,
    ChevronRight,
    ChevronLeft,
    Check,
    Wallet,
    Moon,
    Sun,
    Laptop,
    HelpCircle,
    Target,
    ShoppingBag,
    Utensils,
    Plane,
    Car,
    Gamepad2,
    Coffee,
    Dumbbell,
    Music,
    Film,
    BookOpen,
    Gift
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { AvatarConfig } from 'react-notion-avatar';
// @ts-ignore - library types mismatch
import { getRandomConfig as genConfig } from 'react-notion-avatar';
import { cn } from '@/lib/utils';

const NotionAvatar = dynamic(() => import('react-notion-avatar').then(mod => mod.default), {
    ssr: false,
    loading: () => <div className="h-24 w-24 rounded-full bg-muted animate-pulse" />
});

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { completeOnboarding, submitOnboardingSurvey } from '@/actions/user';
import { authClient } from '@/lib/auth-client';
import { COUNTRIES } from '@/types';
import { toast } from 'sonner';

const steps = [
    { id: 1, title: 'Your Details', icon: User },
    { id: 2, title: 'About You', icon: HelpCircle },
    { id: 3, title: 'Calendar', icon: Calendar },
    { id: 4, title: 'Pricing', icon: CreditCard },
];

const step1Schema = z.object({
    country: z.string().min(1, 'Please select a country'),
    theme: z.enum(['light', 'dark', 'system']),
    avatar: z.string().optional(), // JSON string
});

const step2Schema = z.object({
    source: z.string().min(1, 'Please select an option'),
    financialGoal: z.string().min(1, 'Please select a goal'),
    experienceLevel: z.string().min(1, 'Please select your experience'),
    spendingHabits: z.array(z.string()).min(1, 'Select at least one habit'),
});

const step3Schema = z.object({
    calendarPreference: z.enum(['gregorian', 'nepali']),
});

const step4Schema = z.object({
    pricingTier: z.enum(['free', 'pro', 'enterprise']),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type Step3Values = z.infer<typeof step3Schema>;
type Step4Values = z.infer<typeof step4Schema>;

const SPENDING_HABITS = [
    { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
    { id: 'dining', label: 'Dining', icon: Utensils },
    { id: 'travel', label: 'Travel', icon: Plane },
    { id: 'transport', label: 'Transport', icon: Car },
    { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
    { id: 'coffee', label: 'Coffee', icon: Coffee },
    { id: 'fitness', label: 'Fitness', icon: Dumbbell },
    { id: 'entertainment', label: 'Entertainment', icon: Film },
];

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 300 : -300,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 300 : -300,
        opacity: 0,
    }),
};

export function OnboardingWizard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setTheme } = useTheme();
    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Combined form state
    const [formData, setFormData] = useState<{
        country: string;
        calendarPreference: 'gregorian' | 'nepali';
        pricingTier: 'free' | 'pro' | 'enterprise';
        theme: 'light' | 'dark' | 'system';
        avatar: string;
        source: string;
        financialGoal: string;
        experienceLevel: string;
        spendingHabits: string[];
    }>({
        country: '',
        calendarPreference: 'gregorian',
        pricingTier: 'free',
        theme: 'system',
        avatar: JSON.stringify(genConfig()),
        source: '',
        financialGoal: '',
        experienceLevel: '',
        spendingHabits: [],
    });

    const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(
        formData.avatar ? JSON.parse(formData.avatar) : genConfig()
    );

    const refreshAvatar = () => {
        const newConfig = genConfig();
        setAvatarConfig(newConfig);
        step1Form.setValue('avatar', JSON.stringify(newConfig));
    };

    const step1Form = useForm<Step1Values>({
        resolver: zodResolver(step1Schema),
        defaultValues: {
            country: formData.country,
            theme: formData.theme as 'light' | 'dark' | 'system',
            avatar: formData.avatar,
        },
    });

    const step2Form = useForm<Step2Values>({
        resolver: zodResolver(step2Schema),
        defaultValues: {
            source: formData.source,
            financialGoal: formData.financialGoal,
            experienceLevel: formData.experienceLevel,
            spendingHabits: formData.spendingHabits,
        },
    });

    const step3Form = useForm<Step3Values>({
        resolver: zodResolver(step3Schema),
        defaultValues: {
            calendarPreference: formData.calendarPreference,
        },
    });

    const step4Form = useForm<Step4Values>({
        resolver: zodResolver(step4Schema),
        defaultValues: {
            pricingTier: formData.pricingTier,
        },
    });

    const progress = (currentStep / steps.length) * 100;

    const goNext = () => {
        setDirection(1);
        setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    };

    const goBack = () => {
        setDirection(-1);
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleStep1Submit = (data: Step1Values) => {
        setFormData((prev) => ({ ...prev, ...data }));
        goNext();
    };

    const handleStep2Submit = (data: Step2Values) => {
        setFormData((prev) => ({ ...prev, ...data }));
        goNext();
    };

    const handleStep3Submit = (data: Step3Values) => {
        setFormData((prev) => ({ ...prev, ...data }));
        goNext();
    };

    const handleStep4Submit = async (data: Step4Values) => {
        setIsLoading(true);
        const finalData = { ...formData, ...data };

        try {
            console.log('Submitting onboarding data:', finalData);

            // 1. Submit Profile Data & Complete Onboarding
            const profileResult = await completeOnboarding({
                country: finalData.country,
                theme: finalData.theme,
                avatar: finalData.avatar,
                calendarPreference: finalData.calendarPreference,
                pricingTier: finalData.pricingTier
            });

            if (profileResult.error) {
                throw new Error(profileResult.error);
            }

            // 2. Submit Survey Data
            const surveyResult = await submitOnboardingSurvey({
                source: finalData.source,
                financialGoal: finalData.financialGoal,
                experienceLevel: finalData.experienceLevel,
                spendingHabits: finalData.spendingHabits
            });

            if (surveyResult.error) {
                console.error("Survey submission failed but proceeding:", surveyResult.error);
                // We don't block the user if survey fails, just log it
            }

            toast.success('Setup complete!');

            // Force session refresh so middleware sees updated user state
            await authClient.getSession({
                fetchOptions: {
                    headers: {
                        'Cache-Control': 'no-store'
                    }
                }
            });

            // Use hard redirect to ensure session is refreshed
            const callbackUrl = searchParams.get('callbackUrl');
            window.location.href = callbackUrl || '/dashboard';
        } catch (error: any) {
            console.error('Onboarding error:', error);
            toast.error(error.message || 'Something went wrong. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-lg shadow-xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
                >
                    <Wallet className="h-7 w-7 text-primary" />
                </motion.div>
                <div className="text-center">
                    <CardTitle className="text-2xl font-bold">Welcome to Budgeyy</CardTitle>
                    <CardDescription>Let&apos;s get you set up in just a few steps</CardDescription>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between px-2">
                        {steps.map((step) => (
                            <div
                                key={step.id}
                                className={`flex items-center gap-1.5 text-[10px] sm:text-xs ${currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                                    }`}
                            >
                                <step.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                <span className="hidden sm:inline">{step.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                    {/* STEP 1: Details */}
                    {currentStep === 1 && (
                        <motion.div
                            key="step1"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: 'tween', duration: 0.3 }}
                        >
                            <Form {...step1Form}>
                                <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-4">
                                    <FormField
                                        control={step1Form.control}
                                        name="avatar"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col items-center">
                                                <FormLabel className="text-center mb-4">Choose Your Avatar</FormLabel>
                                                <div className="relative group cursor-pointer" onClick={refreshAvatar}>
                                                    <div className="h-32 w-32 rounded-full border-4 border-background shadow-xl overflow-hidden bg-white">
                                                        <NotionAvatar config={avatarConfig} style={{ width: '100%', height: '100%' }} />
                                                    </div>
                                                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white text-xs font-medium">Click to Randomize</span>
                                                    </div>
                                                </div>
                                                <FormControl>
                                                    <Input type="hidden" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={step1Form.control}
                                        name="country"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Where are you based?</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select your country" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {COUNTRIES.map((country) => (
                                                            <SelectItem key={country.code} value={country.code}>
                                                                {country.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={step1Form.control}
                                        name="theme"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Appearance</FormLabel>
                                                <div className="grid grid-cols-3 gap-4 pt-2">
                                                    {[
                                                        { value: 'light', label: 'Light', icon: Sun },
                                                        { value: 'dark', label: 'Dark', icon: Moon },
                                                        { value: 'system', label: 'System', icon: Laptop },
                                                    ].map((option) => (
                                                        <div
                                                            key={option.value}
                                                            onClick={() => {
                                                                field.onChange(option.value);
                                                                setTheme(option.value);
                                                            }}
                                                            className={`cursor-pointer rounded-lg border-2 p-3 transition-all hover:border-primary/50 flex flex-col items-center gap-2 ${field.value === option.value
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-border'
                                                                }`}
                                                        >
                                                            <option.icon className="h-5 w-5" />
                                                            <span className="text-xs font-medium">{option.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex justify-end pt-4">
                                        <Button type="submit">
                                            Continue
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </motion.div>
                    )}

                    {/* STEP 2: Survey */}
                    {currentStep === 2 && (
                        <motion.div
                            key="step2"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: 'tween', duration: 0.3 }}
                        >
                            <Form {...step2Form}>
                                <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-4">
                                    <FormField
                                        control={step2Form.control}
                                        name="source"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>How did you hear about us?</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select an option" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {['Friends/Family', 'YouTube/Online Video', 'Search Engine', 'News/Blog Article', 'Social Media', 'Other'].map((opt) => (
                                                            <SelectItem key={opt} value={opt}>
                                                                {opt}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={step2Form.control}
                                            name="financialGoal"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Main Goal?</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select goal" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {['Save Money', 'Track Expenses', 'Reduce Debt', 'Better Budgeting', 'Invest More'].map((opt) => (
                                                                <SelectItem key={opt} value={opt}>
                                                                    {opt}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={step2Form.control}
                                            name="experienceLevel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Budgeting Exp.</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select level" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {['Beginner', 'Intermediate', 'Expert'].map((opt) => (
                                                                <SelectItem key={opt} value={opt}>
                                                                    {opt}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={step2Form.control}
                                        name="spendingHabits"
                                        render={() => (
                                            <FormItem>
                                                <div className="mb-4">
                                                    <FormLabel className="text-base">What do you regularly spend on?</FormLabel>
                                                    <FormDescription>
                                                        Select all that apply
                                                    </FormDescription>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {SPENDING_HABITS.map((item) => {
                                                        const isSelected = step2Form.watch('spendingHabits')?.includes(item.id);
                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className={cn(
                                                                    "cursor-pointer rounded-md border-2 p-2 flex flex-col items-center justify-center gap-1 transition-all hover:bg-accent",
                                                                    isSelected ? "border-primary bg-primary/10" : "border-muted"
                                                                )}
                                                                onClick={() => {
                                                                    const current = step2Form.getValues('spendingHabits') || [];
                                                                    const updated = current.includes(item.id)
                                                                        ? current.filter(id => id !== item.id)
                                                                        : [...current, item.id];
                                                                    step2Form.setValue('spendingHabits', updated);
                                                                }}
                                                            >
                                                                <item.icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                                                                <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex justify-between pt-4">
                                        <Button type="button" variant="ghost" onClick={goBack}>
                                            <ChevronLeft className="mr-2 h-4 w-4" />
                                            Back
                                        </Button>
                                        <Button type="submit">
                                            Continue
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </motion.div>
                    )}

                    {/* STEP 3: Calendar */}
                    {currentStep === 3 && (
                        <motion.div
                            key="step3"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: 'tween', duration: 0.3 }}
                        >
                            <Form {...step3Form}>
                                <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-4">
                                    <FormField
                                        control={step3Form.control}
                                        name="calendarPreference"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Calendar Preference</FormLabel>
                                                <FormDescription>
                                                    Choose how dates will be displayed in the app
                                                </FormDescription>
                                                <div className="grid grid-cols-2 gap-4 pt-2">
                                                    {[
                                                        { value: 'gregorian', label: 'Gregorian', desc: 'Jan 1, 2024' },
                                                        { value: 'nepali', label: 'Nepali (बि.सं.)', desc: 'पौष १७, २०८०' },
                                                    ].map((option) => (
                                                        <div
                                                            key={option.value}
                                                            onClick={() => field.onChange(option.value)}
                                                            className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50 ${field.value === option.value
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-border'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium">{option.label}</span>
                                                                {field.value === option.value && (
                                                                    <Check className="h-4 w-4 text-primary" />
                                                                )}
                                                            </div>
                                                            <p className="mt-1 text-xs text-muted-foreground">{option.desc}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex justify-between pt-4">
                                        <Button type="button" variant="ghost" onClick={goBack}>
                                            <ChevronLeft className="mr-2 h-4 w-4" />
                                            Back
                                        </Button>
                                        <Button type="submit">
                                            Continue
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </motion.div>
                    )}

                    {/* STEP 4: Pricing */}
                    {currentStep === 4 && (
                        <motion.div
                            key="step4"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: 'tween', duration: 0.3 }}
                        >
                            <Form {...step4Form}>
                                <form onSubmit={step4Form.handleSubmit(handleStep4Submit)} className="space-y-4">
                                    <FormField
                                        control={step4Form.control}
                                        name="pricingTier"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Choose Your Plan</FormLabel>
                                                <FormDescription>
                                                    You can upgrade anytime
                                                </FormDescription>
                                                <div className="grid gap-3 pt-2">
                                                    {[
                                                        { value: 'free', label: 'Free', price: '$0', desc: 'Basic budgeting features' },
                                                        { value: 'pro', label: 'Pro', price: '$9/mo', desc: 'Advanced analytics & insights' },
                                                        { value: 'enterprise', label: 'Enterprise', price: 'Contact', desc: 'Custom solutions for teams' },
                                                    ].map((option) => (
                                                        <div
                                                            key={option.value}
                                                            onClick={() => field.onChange(option.value)}
                                                            className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50 ${field.value === option.value
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-border'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <span className="font-medium">{option.label}</span>
                                                                    <p className="text-xs text-muted-foreground">{option.desc}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold">{option.price}</span>
                                                                    {field.value === option.value && (
                                                                        <Check className="h-4 w-4 text-primary" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex justify-between pt-4">
                                        <Button type="button" variant="ghost" onClick={goBack}>
                                            <ChevronLeft className="mr-2 h-4 w-4" />
                                            Back
                                        </Button>
                                        <Button type="submit" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Setting up...
                                                </>
                                            ) : (
                                                <>
                                                    Complete Setup
                                                    <Check className="ml-2 h-4 w-4" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
