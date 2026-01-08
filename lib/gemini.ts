import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function classifyEmail(subject: string, sender: string, snippet: string) {
    const prompt = `
    Analyze the following email metadata and determine if it is a transactional email (receipt, invoice, bank alert, bill, etc.).
    
    Sender: ${sender}
    Subject: ${subject}
    Snippet: ${snippet}
    
    If it IS transactional, extract the following details in JSON format:
    {
        "isTransactional": true,
        "amount": number | null,
        "currency": "USD" | "NPR" | string | null,
        "category": "purchase" | "bill" | "transfer" | "salary" | "other",
        "summary": "Brief summary of the transaction",
        "merchant": "Name of merchant or entity"
    }

    If it is NOT transactional, return:
    {
        "isTransactional": false
    }

    Return ONLY the JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
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
