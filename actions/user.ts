'use server';

import { db } from '@/db';
import { users, userSurveys, accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { CalendarPreference, PricingTier } from '@/types';

export interface UpdateProfileData {
    fullName?: string;
    country?: string;
    calendarPreference?: CalendarPreference;
    pricingTier?: PricingTier;
    theme?: 'light' | 'dark' | 'system';
    avatar?: string;
    onboardingCompleted?: boolean;
}

export async function updateUserProfile(data: UpdateProfileData) {
    console.log('updateUserProfile called with:', data);

    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        console.log('Session:', session?.user?.id);

        if (!session?.user?.id) {
            console.log('No session found');
            return { error: 'Unauthorized' };
        }

        console.log('Updating user:', session.user.id);

        await db
            .update(users)
            .set({
                fullName: data.fullName,
                country: data.country,
                calendarPreference: data.calendarPreference,
                pricingTier: data.pricingTier,
                theme: data.theme,
                avatar: data.avatar,
                onboardingCompleted: data.onboardingCompleted,
                updatedAt: new Date(),
            })
            .where(eq(users.id, session.user.id));

        console.log('User updated successfully');

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to update profile:', error);
        return { error: 'Failed to update profile' };
    }
}

export async function completeOnboarding(data: Omit<UpdateProfileData, 'onboardingCompleted'>) {
    console.log('completeOnboarding called with:', data);
    return updateUserProfile({
        ...data,
        onboardingCompleted: true,
    });
}

export async function getCurrentUser() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return null;
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
    });

    return user;
}

export async function updateSettings(data: {
    currency?: string;
    calendarPreference?: CalendarPreference;
    theme?: 'light' | 'dark' | 'system';
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        const updateData: any = { updatedAt: new Date() };
        if (data.currency) updateData.currency = data.currency;
        if (data.calendarPreference) updateData.calendarPreference = data.calendarPreference;
        if (data.theme) updateData.theme = data.theme;

        await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, session.user.id));

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to update settings:', error);
        return { error: 'Failed to update settings' };
    }
}

export async function getUserSettings() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return null;
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: {
            currency: true,
            calendarPreference: true,
            theme: true,
            avatar: true,
            fullName: true,
            email: true,
            country: true,
            createdAt: true,
            updatedAt: true,
            accountStatus: true,
            scheduledDeletionAt: true,
        }
    });

    return user;
}

interface OnboardingSurveyData {
    source: string;
    financialGoal: string;
    experienceLevel: string;
    spendingHabits: string[];
}

export async function submitOnboardingSurvey(data: OnboardingSurveyData) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        await db.insert(userSurveys).values({
            userId: session.user.id,
            source: data.source,
            financialGoal: data.financialGoal,
            experienceLevel: data.experienceLevel,
            spendingHabits: JSON.stringify(data.spendingHabits),
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to submit onboarding survey:', error);
        return { error: 'Failed to submit survey' };
    }
}

export async function checkUserForInvite(email: string) {
    const user = await db.query.users.findFirst({
        where: eq(users.email, email),
    });

    if (user) {
        return { exists: true, avatar: user.avatar, name: user.name };
    }

    return { exists: false, avatar: null, name: null };
}

export async function deleteAccount() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 30); // 30 days from now

        await db
            .update(users)
            .set({
                accountStatus: 'scheduled_for_deletion',
                scheduledDeletionAt: scheduledDate,
                updatedAt: new Date(),
            })
            .where(eq(users.id, session.user.id));

        return { success: true };
    } catch (error) {
        console.error('Failed to schedule account deletion:', error);
        return { error: 'Failed to delete account' };
    }
}

export async function deactivateAccount() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        await db
            .update(users)
            .set({
                accountStatus: 'deactivated',
                updatedAt: new Date(),
            })
            .where(eq(users.id, session.user.id));

        return { success: true };
    } catch (error) {
        console.error('Failed to deactivate account:', error);
        return { error: 'Failed to deactivate account' };
    }
}

export async function reactivateAccount() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    try {
        await db
            .update(users)
            .set({
                accountStatus: 'active',
                scheduledDeletionAt: null,
                updatedAt: new Date(),
            })
            .where(eq(users.id, session.user.id));

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to reactivate account:', error);
        return { error: 'Failed to reactivate account' };
    }
}

export async function getConnectedAccounts() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user?.id) {
        return [];
    }

    const connected = await db.query.accounts.findMany({
        where: eq(accounts.userId, session.user.id),
        columns: {
            providerId: true,
            createdAt: true,
            refreshToken: true, // Fetch it to check existence
        },
    });

    return connected.map(acc => ({
        providerId: acc.providerId,
        createdAt: acc.createdAt,
        hasRefreshToken: !!acc.refreshToken, // Return boolean status
    }));
}
