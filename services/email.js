const nodemailer = require('nodemailer');

async function sendVerificationEmail(to, token, requestBaseUrl) {
    const appUrlValue = process.env.APP_URL || requestBaseUrl;
    if (!appUrlValue) {
        throw new Error('Unable to determine the app URL for the verification link.');
    }

    const appUrl = new URL(appUrlValue);
    if (appUrl.protocol !== 'http:' && appUrl.protocol !== 'https:') {
        throw new Error('The app URL must start with http:// or https://.');
    }

    const verificationUrl = new URL('/verify-email', appUrl);
    verificationUrl.searchParams.set('token', token);

    const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
    const sender = process.env.MAIL_FROM ||
        (provider === 'gmail-api' ? process.env.GMAIL_USER : process.env.SMTP_USER);

    if (!sender) {
        throw new Error('Set the sender email account for the selected email provider.');
    }

    const email = {
        from: sender,
        to,
        subject: 'Verify your Student Carpool account',
        text: `Welcome to Student Carpool!\n\nVerify your email within 24 hours by opening this link:\n${verificationUrl}\n\nIf you did not create this account, you can ignore this email.`
    };

    if (provider === 'gmail-api') {
        const gmailSettings = [
            'GMAIL_USER',
            'GMAIL_CLIENT_ID',
            'GMAIL_CLIENT_SECRET',
            'GMAIL_REFRESH_TOKEN'
        ];
        const missingGmailSettings = gmailSettings.filter((setting) => !process.env[setting]);
        if (missingGmailSettings.length > 0) {
            throw new Error(`Missing email configuration: ${missingGmailSettings.join(', ')}`);
        }
        if (/[\r\n]/.test(email.from)) {
            throw new Error('MAIL_FROM must not contain line breaks.');
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GMAIL_CLIENT_ID,
                client_secret: process.env.GMAIL_CLIENT_SECRET,
                refresh_token: process.env.GMAIL_REFRESH_TOKEN,
                grant_type: 'refresh_token'
            })
        });
        const tokenResponseText = await tokenResponse.text();
        let tokenResult;

        try {
            tokenResult = JSON.parse(tokenResponseText);
        } catch {
            throw new Error(`Google OAuth returned an invalid response (${tokenResponse.status}).`);
        }

        if (!tokenResponse.ok || !tokenResult || typeof tokenResult.access_token !== 'string') {
            const detail = tokenResult && typeof tokenResult.error_description === 'string'
                ? tokenResult.error_description
                : tokenResult && typeof tokenResult.error === 'string'
                    ? tokenResult.error
                    : `HTTP ${tokenResponse.status}`;
            throw new Error(`Google OAuth token error: ${detail}`);
        }

        const message = [
            `From: ${email.from}`,
            `To: ${email.to}`,
            `Subject: =?UTF-8?B?${Buffer.from(email.subject, 'utf8').toString('base64')}?=`,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            Buffer.from(email.text, 'utf8').toString('base64').match(/.{1,76}/g).join('\r\n')
        ].join('\r\n');
        const rawMessage = Buffer.from(message, 'utf8')
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        const sendResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(process.env.GMAIL_USER)}/messages/send`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${tokenResult.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ raw: rawMessage })
            }
        );

        if (!sendResponse.ok) {
            const responseText = await sendResponse.text();
            throw new Error(`Gmail API error (${sendResponse.status}): ${responseText.slice(0, 500)}`);
        }

        return;
    }

    if (provider === 'resend') {
        if (!process.env.RESEND_API_KEY) {
            throw new Error('Missing email configuration: RESEND_API_KEY');
        }
        if (!process.env.MAIL_FROM) {
            throw new Error('Resend requires MAIL_FROM to be set to a verified sender address.');
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
        throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}. Use gmail-api, resend, or smtp.`);
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
