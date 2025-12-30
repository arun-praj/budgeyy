import type { Transaction, Category, User } from '@/db/schema';

// Transaction types
export type TransactionType = 'income' | 'expense' | 'savings';

export interface TransactionWithUserAndCategory extends Transaction {
    category: Category | null;
    user: User | null;
}
export type NecessityLevel = 'needs' | 'wants' | 'savings';

// Calendar preference
export type CalendarPreference = 'gregorian' | 'nepali';

// Budget period
export type BudgetPeriod = 'monthly' | 'yearly';

// Pricing tier
export type PricingTier = 'free' | 'pro' | 'enterprise';

// User profile for onboarding
export interface UserProfile {
    fullName?: string;
    country?: string;
    calendarPreference?: CalendarPreference;
    pricingTier?: PricingTier;
    onboardingCompleted?: boolean;
}

// 50/30/20 Budget Rule
export interface BudgetRule {
    needs: number;    // 50% - Essential expenses
    wants: number;    // 30% - Discretionary spending
    savings: number;  // 20% - Savings/investments
}

export const DEFAULT_BUDGET_RULE: BudgetRule = {
    needs: 50,
    wants: 30,
    savings: 20,
};

// Dashboard statistics
export interface DashboardStats {
    totalIncome: number;
    totalExpenses: number;
    needsSpent: number;
    wantsSpent: number;
    savingsAmount: number;
    needsPercentage: number;
    wantsPercentage: number;
    savingsPercentage: number;
}

// Country list for onboarding
export const COUNTRIES = [
    { code: 'NP', name: 'Nepal' },
    { code: 'IN', name: 'India' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'CA', name: 'Canada' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'JP', name: 'Japan' },
    { code: 'SG', name: 'Singapore' },
] as const;

// Category icons mapping
export const CATEGORY_ICONS = {
    // Income
    salary: '💰',
    freelance: '💻',
    investment: '📈',
    gift: '🎁',
    other_income: '💵',
    // Expenses - Needs
    rent: '🏠',
    utilities: '💡',
    groceries: '🛒',
    transportation: '🚗',
    healthcare: '🏥',
    insurance: '🛡️',
    // Expenses - Wants
    dining: '🍽️',
    entertainment: '🎬',
    shopping: '🛍️',
    travel: '✈️',
    subscriptions: '📱',
    // Savings
    emergency_fund: '🆘',
    retirement: '👴',
    other_savings: '🏦',
} as const;
