import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function classifyEmail(subject: string, sender: string, snippet: string) {
    const prompt = `
    Analyze the following email metadata and determine if it is a **confirmed transactional email** (receipt, invoice, bank alert, bill payment, successful transfer, OR salary/income).

    CONTEXT:
    - Nepal Market: Esewa, Khalti, Fonepay, ConnectIPS, Siddhartha Bank, NMB, NIMB, Global IME, NIC Asia, Everest Bank.
    - Global Market: PayPal, Stripe, Wise, Remitly, Revolut, Apple Pay, Google Pay, Amazon.
    - Currencies: NPR, NRs, Rs., USD, EUR, GBP, AUD, CAD, INR.

    INPUT DATA:
    - Sender: ${sender}
    - Subject: ${subject}
    - Snippet: ${snippet}

    CLASSIFICATION RULES:

    1. **SIGNS OF A TRANSACTION (High Probability):**
       - **Explicit Success:** "Payment successful", "Transaction completed", "You sent", "You received", "Paid", "Transfer successful", "Credit alert", "Debited", "You have received".
       - **Income/Salary:** "Salary for month", "Salary credited", "Payment received", "Bonus received", "This is the salary", "You have been paid".
       - **Financials:** Contains specific currency symbols/codes (Rs., NRs, NPR, $, USD) closer to numbers.
       - **Identifiers:** "Order #", "Receipt #", "Invoice #", "Ref ID", "Transaction ID".
       - **Bank Alerts:** "Acct XX1234 Debited", "Credited", "Balance Deducted", "Deposited".
    
    2. **SIGNS OF NON-TRANSACTION (False Positives - IGNORE THESE):**
       - **Intent/Abandoned:** "Complete your purchase", "Item left in cart", "Checkout now".
       - **Promotional:** "Offer", "Discount", "Sale", "Coupon", "Upgrade now".
       - **Pre-Transaction:** "Payment due", "Bill is ready", "Statement available", "OTP", "Verification code", "Login alert" (UNLESS it says "Salary for..." or "You have received..." which implies the act of paying).
       - **Requests:** "Request for payment", "Invoice received" (if it's just a notification of an incoming invoice, not proof of payment, unless context implies auto-deduction).
       - **Social/News:** Newsletters, privacy policy updates, terms of service.

    3. **DECISION LOGIC:**
       - Only return 'isTransactional: true' if the event represents a **completed financial movement** (money left or entered an account).
       - **CRITICAL:** If you cannot extract a specific numeric **Amount**, it is NOT a valid transaction for our purpose. Return 'isTransactional: false'.
       - **TYPE INFERENCE:**
         - Money LEAVING account (Payment, Purchase, Debit, Bill) -> 'expense'
         - Money ENTERING account (Salary, Refund, Deposit, Receive) -> 'income'

    OUTPUT FORMAT:
    If transactional, return JSON:
    {
        "isTransactional": true,
        "amount": number, // MUST be a number, e.g. 500.50
        "currency": "NPR" | "USD" | string, // Default to 'NPR' if inferred from context. "NRs" should be normalized to "NPR".
        "category": "purchase" | "bill" | "transfer" | "salary" | "other",
        "type": "income" | "expense", // CRITICAL: Infer based on direction of money
        "description": "Sender - Product/Summary (e.g. 'Esewa - Electricity Bill')",
        "merchant": "Merchant/Bank Name"
    }

    If NOT transactional, return JSON:
    {
        "isTransactional": false
    }

    Return ONLY the JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            }
        });

        const text = response.text;
        if (!text) return { isTransactional: false };

        // Clean up markdown code blocks if present (even with JSON mode, some models might wrap it)
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Gemini classification error:', error);
        return { isTransactional: false };
    }
}

export async function generateMonthlyInsight(
    transactions: { date: string; amount: number; category: string; type: string; description: string }[],
    currency: string
) {
    if (transactions.length === 0) return "No transactions found for this month.";

    // 1. Pre-process data to save tokens
    const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

    // Group by category
    const categorySpend: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        const cat = t.category || 'Uncategorized';
        categorySpend[cat] = (categorySpend[cat] || 0) + t.amount;
    });

    // Top 3 categories
    const topCategories = Object.entries(categorySpend)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([cat, amount]) => `${cat}: ${amount}`)
        .join(', ');

    const prompt = `
    You are a friendly, witty, and highly intelligent personal finance assistant.
    Analyze the user's spending data for this month and provide a **single, personalized insight**.

    DATA CONTEXT:
    - Currency: ${currency}
    - Total Spent: ${totalSpent}
    - Total Income: ${totalIncome}
    - Top Categories: ${topCategories}
    - Transaction Count: ${transactions.length}
    - Raw Data: ${JSON.stringify(transactions.slice(0, 20))} ... (truncated for brevity)

    GOAL:
    Provide a unique, actionable, or interesting observation. Do NOT just summarize the totals (they can see that).
    
    PATTERNS TO LOOK FOR:
    - High frequency spending (e.g., "Latte factor").
    - Unusual spikes in specific categories.
    - Good savings habits (if income > spending).
    - Weekend vs Weekday spending (if visible in dates).
    - Encouragement if they are under budget.

    TONE:
    - Concisely worded (max 2-3 sentences).
    - Friendly, slightly conversational but professional.
    - Use emoji where appropriate.

    OUTPUT:
    Return ONLY the raw text of the insight. No markdown formatting like bold/italic unless necessary for emphasis.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp', // Fast model for insights
            contents: prompt,
        });

        const text = response.text;
        return text || "Spending looks normal this month. Keep tracking!";
    } catch (error) {
        console.error('Gemini insight error:', error);
        return "Unable to generate insights right now.";
    }
}
