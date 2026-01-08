import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { emailOTP } from 'better-auth/plugins';
import { sendEmail, emailTemplates } from './mail';

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || `http://127.0.0.1:${process.env.PORT || 3000}`,
    database: drizzleAdapter(db, {
        provider: 'pg',
        // Map better-auth's expected names to our actual table schemas
        schema: {
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications,
        },
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            scope: ['https://www.googleapis.com/auth/gmail.readonly', 'openid', 'profile', 'email'],
            accessType: 'offline',
            prompt: 'select_account consent',
        },
    },
    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp }) {
                const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}`;
                const { subject, html, text } = emailTemplates.otp(otp, unsubscribeUrl);
                await sendEmail({
                    to: email,
                    subject,
                    html,
                    text,
                    unsubscribeLink: unsubscribeUrl,
                });
            },
        }),
    ],
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // Update session every 24 hours
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // 5 minutes
        },
    },
    user: {
        additionalFields: {
            fullName: {
                type: 'string',
                required: false,
            },
            country: {
                type: 'string',
                required: false,
            },
            calendarPreference: {
                type: 'string',
                required: false,
                defaultValue: 'gregorian',
            },
            pricingTier: {
                type: 'string',
                required: false,
                defaultValue: 'free',
            },
            onboardingCompleted: {
                type: 'boolean',
                required: false,
                defaultValue: false,
            },
            accountStatus: {
                type: 'string',
                required: false,
                defaultValue: 'active',
            },
            scheduledDeletionAt: {
                type: 'date',
                required: false,
            },
        },
    },
    trustedOrigins: [
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'http://192.168.1.73:3000',
        ...(process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(',') : []),
    ],
});

export type Session = typeof auth.$Infer.Session;
