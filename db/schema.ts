import { pgTable, text, timestamp, boolean, pgEnum, uuid, decimal, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const calendarPreferenceEnum = pgEnum('calendar_preference', ['gregorian', 'nepali']);
export const pricingTierEnum = pgEnum('pricing_tier', ['free', 'pro', 'enterprise']);
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense', 'savings']);
export const necessityLevelEnum = pgEnum('necessity_level', ['needs', 'wants', 'savings']);
export const budgetPeriodEnum = pgEnum('budget_period', ['monthly', 'yearly']);

export const themeEnum = pgEnum('theme', ['light', 'dark', 'system']);

// Users table - extends better-auth user with profile fields
export const users = pgTable('users', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    name: text('name'),
    image: text('image'),

    // Extended profile fields
    fullName: text('full_name'),
    country: text('country'),
    calendarPreference: calendarPreferenceEnum('calendar_preference').default('gregorian'),
    pricingTier: pricingTierEnum('pricing_tier').default('free'),
    currency: text('currency').default('USD'),
    theme: themeEnum('theme').default('system'),
    avatar: text('avatar'), // Storing JSON string of avatar config
    onboardingCompleted: boolean('onboarding_completed').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// User Surveys table
export const userSurveys = pgTable('user_surveys', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    source: text('source'), // How did you hear about us?
    financialGoal: text('financial_goal'), // What is your main financial goal?
    experienceLevel: text('experience_level'), // Budgeting experience level
    spendingHabits: text('spending_habits'), // JSON array of regularly spent categories
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Sessions table for better-auth
export const sessions = pgTable('sessions', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Accounts table for better-auth (OAuth providers)
export const accounts = pgTable('accounts', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Verification tokens for better-auth
export const verifications = pgTable('verifications', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Categories table
export const categories = pgTable('categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    type: transactionTypeEnum('type').notNull(),
    icon: text('icon'),
    color: text('color'),
    isDefault: boolean('is_default').default(false),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Transactions table
export const transactions = pgTable('transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    date: timestamp('date').notNull(),
    description: text('description'),
    type: transactionTypeEnum('type').notNull(),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    isRecurring: boolean('is_recurring').default(false),
    necessityLevel: necessityLevelEnum('necessity_level'),
    isCredit: boolean('is_credit').default(false),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    // Images
    receiptUrl: text('receipt_url'),
    productImageUrl: text('product_image_url'),
    // Soft Delete
    isDeleted: boolean('is_delete').default(false).notNull(),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Budgets table
export const budgets = pgTable('budgets', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    amountLimit: decimal('amount_limit', { precision: 12, scale: 2 }).notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    period: budgetPeriodEnum('period').notNull().default('monthly'),
    rollover: boolean('rollover').default(false),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
    sessions: many(sessions),
    accounts: many(accounts),
    categories: many(categories),
    transactions: many(transactions),
    budgets: many(budgets),
    survey: one(userSurveys, {
        fields: [users.id],
        references: [userSurveys.userId],
    }),
}));

export const userSurveysRelations = relations(userSurveys, ({ one }) => ({
    user: one(users, {
        fields: [userSurveys.userId],
        references: [users.id],
    }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id],
    }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
    user: one(users, {
        fields: [categories.userId],
        references: [users.id],
    }),
    transactions: many(transactions),
    budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
    user: one(users, {
        fields: [transactions.userId],
        references: [users.id],
    }),
    category: one(categories, {
        fields: [transactions.categoryId],
        references: [categories.id],
    }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
    user: one(users, {
        fields: [budgets.userId],
        references: [users.id],
    }),
    category: one(categories, {
        fields: [budgets.categoryId],
        references: [categories.id],
    }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type UserSurvey = typeof userSurveys.$inferSelect;
export type NewUserSurvey = typeof userSurveys.$inferInsert;
