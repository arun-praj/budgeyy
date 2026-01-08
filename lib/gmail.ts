import { google } from 'googleapis';

export const getGmailClient = (accessToken: string, refreshToken?: string) => {
    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
    });
    return google.gmail({ version: 'v1', auth });
};

export async function refreshAccessToken(refreshToken: string) {
    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await auth.refreshAccessToken();
    return {
        accessToken: credentials.access_token,
        expiryDate: credentials.expiry_date,
        refreshToken: credentials.refresh_token // Sometimes it rotates
    };
}

export async function fetchRecentEmails(accessToken: string, maxResults = 20) {
    // Note: If calling this independently, ensure accessToken is valid.
    // Use the sync action wrapper to handle refresh.
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
