import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
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
        },
    },
    trustedOrigins: [
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', 'http://192.168.1.73:3000',
    ],
});

export type Session = typeof auth.$Infer.Session;
