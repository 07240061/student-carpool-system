const nodemailer = require('nodemailer');

async function sendVerificationEmail(to, token) {
    const requiredSettings = ['APP_URL', 'MAIL_FROM'];
    const missingSettings = requiredSettings.filter((setting) => !process.env[setting]);

    if (missingSettings.length > 0) {
        throw new Error(`Missing email configuration: ${missingSettings.join(', ')}`);
    }

    const appUrl = new URL(process.env.APP_URL);
    if (appUrl.protocol !== 'http:' && appUrl.protocol !== 'https:') {
        throw new Error('APP_URL must start with http:// or https://.');
    }

    const verificationUrl = new URL('/verify-email', appUrl);
    verificationUrl.searchParams.set('token', token);

    const email = {
        from: process.env.MAIL_FROM,
        to,
        subject: 'Verify your Student Carpool account',
        text: `Welcome to Student Carpool!\n\nVerify your email within 24 hours by opening this link:\n${verificationUrl}\n\nIf you did not create this account, you can ignore this email.`
    };
    const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();

    if (provider === 'resend') {
        if (!process.env.RESEND_API_KEY) {
            throw new Error('Missing email configuration: RESEND_API_KEY');
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(email)
        });
        const responseText = await response.text();

        if (!response.ok) {
            throw new Error(`Resend API error (${response.status}): ${responseText.slice(0, 500)}`);
        }

        return;
    }

    if (provider !== 'smtp') {
        throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
    }

    const smtpSettings = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'];
    const missingSmtpSettings = smtpSettings.filter((setting) => !process.env[setting]);
    if (missingSmtpSettings.length > 0) {
        throw new Error(`Missing email configuration: ${missingSmtpSettings.join(', ')}`);
    }

    const port = Number(process.env.SMTP_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('SMTP_PORT must be a valid port number.');
    }

    const smtpHost = process.env.SMTP_HOST.toLowerCase();
    const smtpPassword = smtpHost === 'smtp.gmail.com'
        ? process.env.SMTP_PASSWORD.replace(/\s+/g, '')
        : process.env.SMTP_PASSWORD;
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: process.env.SMTP_SECURE
            ? process.env.SMTP_SECURE.toLowerCase() === 'true'
            : port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: smtpPassword
        }
    });

    await transporter.sendMail(email);
}

module.exports = { sendVerificationEmail };
