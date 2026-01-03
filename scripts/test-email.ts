import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testEmail() {
    console.log('--- SMTP Configuration Test ---');
    console.log('Host:', process.env.SMTP_HOST);
    console.log('Port:', process.env.SMTP_PORT);
    console.log('User:', process.env.SMTP_USER);
    console.log('Secure:', process.env.SMTP_SECURE);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('Error: SMTP_USER or SMTP_PASS not found in .env.local');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('Connection verified successfully!');

        console.log('Sending test email to', process.env.SMTP_USER);
        const info = await transporter.sendMail({
            from: `"Budgeyy Test" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER,
            subject: 'Budgeyy SMTP Test',
            text: 'This is a test email from Budgeyy to verify SMTP configuration.',
            html: '<h1>SMTP Test Successful</h1><p>This is a test email from Budgeyy to verify SMTP configuration.</p>',
        });

        console.log('Test email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testEmail();
