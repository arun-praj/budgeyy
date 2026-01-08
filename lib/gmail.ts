import { google } from 'googleapis';

export const getGmailClient = (accessToken: string) => {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.gmail({ version: 'v1', auth });
};

export async function fetchRecentEmails(accessToken: string, maxResults = 20) {
    const gmail = getGmailClient(accessToken);

    try {
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults,
            q: 'category:primary', // Filter mainly primary inbox to avoid spam/social
        });

        const messages = response.data.messages || [];

        if (messages.length === 0) return [];

        const emailDetails = await Promise.all(
            messages.map(async (msg) => {
                const detail = await gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id!,
                    format: 'full',
                });
                return detail.data;
            })
        );

        return emailDetails;
    } catch (error) {
        console.error('Error fetching Gmail messages:', error);
        throw error;
    }
}
