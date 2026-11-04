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

    if (provider === 'google-apps-script') {
        const appsScriptSettings = ['APPS_SCRIPT_URL', 'APPS_SCRIPT_SECRET'];
        const missingAppsScriptSettings = appsScriptSettings.filter((setting) => !process.env[setting]);
        if (missingAppsScriptSettings.length > 0) {
            throw new Error(`Missing email configuration: ${missingAppsScriptSettings.join(', ')}`);
        }

        const scriptUrl = new URL(process.env.APPS_SCRIPT_URL);
        if (
            scriptUrl.protocol !== 'https:' ||
            scriptUrl.hostname !== 'script.google.com' ||
            !scriptUrl.pathname.startsWith('/macros/s/') ||
            !scriptUrl.pathname.endsWith('/exec')
        ) {
            throw new Error('APPS_SCRIPT_URL must be the HTTPS deployment URL ending in /exec.');
        }

        const senderName = process.env.MAIL_FROM.split('<')[0].trim() || 'Student Carpool';
        const response = await fetch(scriptUrl, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: process.env.APPS_SCRIPT_SECRET,
                to,
                subject: email.subject,
                text: email.text,
                senderName
            })
        });
        const responseText = await response.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch {
            throw new Error(`Google Apps Script returned an invalid response (${response.status}).`);
        }

        if (!response.ok || result.ok !== true) {
            const detail = typeof result.error === 'string' ? result.error : `HTTP ${response.status}`;
            throw new Error(`Google Apps Script email error: ${detail}`);
        }

        return;
    }

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
