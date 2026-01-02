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
    isGuest: boolean('is_guest').default(false),
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

// Trips table
export const trips = pgTable('trips', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    destination: text('destination'),
    imageUrl: text('image_url'),
    notes: text('notes'),
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Trip Itineraries (Days)
export const tripItineraries = pgTable('trip_itineraries', {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
    dayNumber: integer('day_number').notNull(),
    date: timestamp('date'),
    title: text('title'),
    description: text('description'),
    links: text('links'),
    location: text('location'),
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
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'set null' }),
    tripItineraryId: uuid('trip_itinerary_id').references(() => tripItineraries.id, { onDelete: 'set null' }),
    // Images
    receiptUrl: text('receipt_url'),
    productImageUrl: text('product_image_url'),
    // Soft Delete
    isDeleted: boolean('is_delete').default(false).notNull(),
    deletedAt: timestamp('deleted_at'),
    order: integer('order').default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Trip Transactions table (Splitlog)
export const tripTransactions = pgTable('trip_transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    date: timestamp('date').notNull(),
    description: text('description'),
    type: transactionTypeEnum('type').notNull(),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    paidByUserId: text('paid_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    paidByGuestId: uuid('paid_by_guest_id').references(() => tripInvites.id, { onDelete: 'set null' }),
    tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
    tripItineraryId: uuid('trip_itinerary_id').notNull().references(() => tripItineraries.id, { onDelete: 'cascade' }),
    // Images
    receiptUrl: text('receipt_url'),
    productImageUrl: text('product_image_url'),
    // Soft Delete
    isDeleted: boolean('is_delete').default(false).notNull(),
    deletedAt: timestamp('deleted_at'),
    order: integer('order').default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Trip Transaction Splits
export const tripTransactionSplits = pgTable('trip_transaction_splits', {
    id: uuid('id').primaryKey().defaultRandom(),
    tripTransactionId: uuid('trip_transaction_id').notNull().references(() => tripTransactions.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    guestId: uuid('guest_id').references(() => tripInvites.id, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Trip Transaction Payers
export const tripTransactionPayers = pgTable('trip_transaction_payers', {
    id: uuid('id').primaryKey().defaultRandom(),
    tripTransactionId: uuid('trip_transaction_id').notNull().references(() => tripTransactions.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    guestId: uuid('guest_id').references(() => tripInvites.id, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
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

// ... (existing relations code) ...

// Itinerary Notes
export const itineraryNotes = pgTable('itinerary_notes', {
    id: uuid('id').primaryKey().defaultRandom(),
    tripItineraryId: uuid('trip_itinerary_id').notNull().references(() => tripItineraries.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }), // Added userId
    content: text('content').notNull(),
    isHighPriority: boolean('is_high_priority').default(false),
    order: integer('order').default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Itinerary Checklists
export const itineraryChecklists = pgTable('itinerary_checklists', {
    id: uuid('id').primaryKey().defaultRandom(),
    tripItineraryId: uuid('trip_itinerary_id').notNull().references(() => tripItineraries.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }), // Added userId
    title: text('title').notNull(),
    items: text('items').default('[]'), // JSON array of checklist items
    order: integer('order').default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Friends table
export const friends = pgTable('friends', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    friendId: text('friend_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['pending', 'accepted'] }).default('pending'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Trip Invites
export const tripInvites = pgTable('trip_invites', {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).default('pending'),
    guestAvatar: text('guest_avatar'), // JSON string for guest avatar config
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Add relations exports
export const friendsRelations = relations(friends, ({ one }) => ({
    user: one(users, {
        fields: [friends.userId],
        references: [users.id],
    }),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
    user: one(users, {
        fields: [trips.userId],
        references: [users.id],
    }),
    itineraries: many(tripItineraries),
    // transactions: many(transactions), // Legacy, migrated to tripTransactions
    tripTransactions: many(tripTransactions),
    invites: many(tripInvites),
}));

export const tripItinerariesRelations = relations(tripItineraries, ({ one, many }) => ({
    trip: one(trips, {
        fields: [tripItineraries.tripId],
        references: [trips.id],
    }),
    notes: many(itineraryNotes),
    checklists: many(itineraryChecklists),
    // transactions: many(transactions), // Legacy
    tripTransactions: many(tripTransactions),
}));

export const itineraryNotesRelations = relations(itineraryNotes, ({ one }) => ({
    itinerary: one(tripItineraries, {
        fields: [itineraryNotes.tripItineraryId],
        references: [tripItineraries.id],
    }),
    user: one(users, { // Added user relation
        fields: [itineraryNotes.userId],
        references: [users.id],
    }),
}));

export const itineraryChecklistsRelations = relations(itineraryChecklists, ({ one }) => ({
    itinerary: one(tripItineraries, {
        fields: [itineraryChecklists.tripItineraryId],
        references: [tripItineraries.id],
    }),
    user: one(users, { // Added user relation
        fields: [itineraryChecklists.userId],
        references: [users.id],
    }),
}));

export const tripInvitesRelations = relations(tripInvites, ({ one }) => ({
    trip: one(trips, {
        fields: [tripInvites.tripId],
        references: [trips.id],
    }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
    category: one(categories, {
        fields: [budgets.categoryId],
        references: [categories.id],
    }),
    user: one(users, {
        fields: [budgets.userId],
        references: [users.id],
    }),
}));

// Update transactions relations in existing code to include trip
export const transactionsRelations = relations(transactions, ({ one }) => ({
    user: one(users, {
        fields: [transactions.userId],
        references: [users.id],
    }),
    category: one(categories, {
        fields: [transactions.categoryId],
        references: [categories.id],
    }),
    trip: one(trips, {
        fields: [transactions.tripId],
        references: [trips.id],
    }),
    itinerary: one(tripItineraries, {
        fields: [transactions.tripItineraryId],
        references: [tripItineraries.id],
    }),
}));

export const tripTransactionsRelations = relations(tripTransactions, ({ one, many }) => ({
    user: one(users, {
        fields: [tripTransactions.userId],
        references: [users.id],
    }),
    category: one(categories, {
        fields: [tripTransactions.categoryId],
        references: [categories.id],
    }),
    trip: one(trips, {
        fields: [tripTransactions.tripId],
        references: [trips.id],
    }),
    itinerary: one(tripItineraries, {
        fields: [tripTransactions.tripItineraryId],
        references: [tripItineraries.id],
    }),
    paidByUser: one(users, {
        fields: [tripTransactions.paidByUserId],
        references: [users.id],
    }),
    paidByGuest: one(tripInvites, {
        fields: [tripTransactions.paidByGuestId],
        references: [tripInvites.id],
    }),
    splits: many(tripTransactionSplits),
    payers: many(tripTransactionPayers),
}));

export const tripTransactionSplitsRelations = relations(tripTransactionSplits, ({ one }) => ({
    transaction: one(tripTransactions, {
        fields: [tripTransactionSplits.tripTransactionId],
        references: [tripTransactions.id],
    }),
    user: one(users, {
        fields: [tripTransactionSplits.userId],
        references: [users.id],
    }),
    guest: one(tripInvites, {
        fields: [tripTransactionSplits.guestId],
        references: [tripInvites.id],
    }),
}));

export const tripTransactionPayersRelations = relations(tripTransactionPayers, ({ one }) => ({
    transaction: one(tripTransactions, {
        fields: [tripTransactionPayers.tripTransactionId],
        references: [tripTransactions.id],
    }),
    user: one(users, {
        fields: [tripTransactionPayers.userId],
        references: [users.id],
    }),
    guest: one(tripInvites, {
        fields: [tripTransactionPayers.guestId],
        references: [tripInvites.id],
    }),
}));


export type Transaction = typeof transactions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type User = typeof users.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type TripItinerary = typeof tripItineraries.$inferSelect;
export type TripTransaction = typeof tripTransactions.$inferSelect;
export type TripTransactionSplit = typeof tripTransactionSplits.$inferSelect;
export type TripTransactionPayer = typeof tripTransactionPayers.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
