import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text: string;
    unsubscribeLink?: string;
}

export async function sendEmail({ to, subject, html, text, unsubscribeLink }: SendEmailOptions) {
    const info = await transporter.sendMail({
        from: `"Budgeyy" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
        headers: unsubscribeLink ? {
            'List-Unsubscribe': `<${unsubscribeLink}>`,
        } : undefined,
    });

    console.log('Message sent: %s', info.messageId);
    return info;
}

export const emailTemplates = {
    otp: (otp: string, unsubscribeUrl: string) => ({
        subject: `${otp} is your Budgeyy verification code`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a; line-height: 1.6;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="background-color: #7c3aed; width: 50px; height: 50px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                    </div>
                    <h1 style="font-size: 24px; margin: 0; color: #7c3aed;">Budgeyy</h1>
                </div>
                
                <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Verify your email</h2>
                <p style="margin-bottom: 24px;">Please use the following code to complete your registration or login. This code will expire in 10 minutes.</p>
                
                <div style="background-color: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <span style="font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 4px; color: #7c3aed;">${otp}</span>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin-bottom: 32px;">If you didn't request this code, you can safely ignore this email.</p>
                
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 24px;" />
                
                <div style="text-align: center; font-size: 12px; color: #9ca3af;">
                    <p>&copy; ${new Date().getFullYear()} Budgeyy. All rights reserved.</p>
                    <p>
                        <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> from these emails.
                    </p>
                </div>
            </div>
        `,
        text: `Your Budgeyy verification code is: ${otp}. This code expires in 10 minutes. If you didn't request this, ignore this email. Unsubscribe at: ${unsubscribeUrl}`
    }),

    tripInvitation: (inviterName: string, tripName: string, inviteLink: string, unsubscribeUrl: string) => ({
        subject: `You've been invited to joint the trip "${tripName}" on Budgeyy`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a; line-height: 1.6;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="background-color: #7c3aed; width: 50px; height: 50px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                    </div>
                    <h1 style="font-size: 24px; margin: 0; color: #7c3aed;">Budgeyy</h1>
                </div>
                
                <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Pack your bags!</h2>
                <p style="margin-bottom: 24px;"><strong>${inviterName}</strong> has invited you to join their trip <strong>"${tripName}"</strong>. Use Budgeyy to track expenses, manage the itinerary, and split costs with ease.</p>
                
                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${inviteLink}" style="background-color: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">View Trip Invitation</a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin-bottom: 32px;">If you have any questions, just reply to this email.</p>
                
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-bottom: 24px;" />
                
                <div style="text-align: center; font-size: 12px; color: #9ca3af;">
                    <p>&copy; ${new Date().getFullYear()} Budgeyy. All rights reserved.</p>
                    <p>
                        <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> from these emails.
                    </p>
                </div>
            </div>
        `,
        text: `${inviterName} invited you to the trip "${tripName}" on Budgeyy. Join here: ${inviteLink}. Unsubscribe at: ${unsubscribeUrl}`
    })
};
