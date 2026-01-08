import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function classifyEmail(subject: string, sender: string, snippet: string) {
    const prompt = `
    Analyze the following email metadata and determine if it is a **confirmed transactional email** (receipt, invoice, bank alert, bill payment, or successful transfer).

    CONTEXT:
    - Nepal Market: Esewa, Khalti, Fonepay, ConnectIPS, Siddhartha Bank, NMB, NIMB, Global IME, NIC Asia, Everest Bank.
    - Global Market: PayPal, Stripe, Wise, Remitly, Revolut, Apple Pay, Google Pay, Amazon.
    - Currencies: NPR, USD, EUR, GBP, AUD, CAD, INR.

    INPUT DATA:
    - Sender: ${sender}
    - Subject: ${subject}
    - Snippet: ${snippet}

    CLASSIFICATION RULES:

    1. **SIGNS OF A TRANSACTION (High Probability):**
       - **Explicit Success:** "Payment successful", "Transaction completed", "You sent", "You received", "Paid", "Transfer successful".
       - **Financials:** Contains specific currency symbols/codes (Rs., NPR, $, USD) closer to numbers.
       - **Identifiers:** "Order #", "Receipt #", "Invoice #", "Ref ID", "Transaction ID".
       - **Bank Alerts:** "Acct XX1234 Debited", "Credited", "Balance Deducted".
    
    2. **SIGNS OF NON-TRANSACTION (False Positives - IGNORE THESE):**
       - **Intent/Abandoned:** "Complete your purchase", "Item left in cart", "Checkout now".
       - **Promotional:** "Offer", "Discount", "Sale", "Coupon", "Upgrade now".
       - **Pre-Transaction:** "Payment due", "Bill is ready", "Statement available", "OTP", "Verification code", "Login alert".
       - **Requests:** "Request for payment", "Invoice received" (if it's just a notification of an incoming invoice, not proof of payment, unless context implies auto-deduction).
       - **Social/News:** Newsletters, privacy policy updates, terms of service.

    3. **DECISION LOGIC:**
       - Only return 'isTransactional: true' if the event represents a **completed financial movement** (money left or entered an account).
       - **CRITICAL:** If you cannot extract a specific numeric **Amount**, it is NOT a valid transaction for our purpose. Return 'isTransactional: false'.

    OUTPUT FORMAT:
    If transactional, return JSON:
    {
        "isTransactional": true,
        "amount": number, // MUST be a number, e.g. 500.50
        "currency": "NPR" | "USD" | string, // Default to 'NPR' if inferred from context
        "category": "purchase" | "bill" | "transfer" | "salary" | "other",
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
