# Student Carpool System

A beginner-friendly Node.js, Express, EJS, and PostgreSQL starter project.

## Requirements

- Node.js and npm
- PostgreSQL
- VS Code

## Setup

1. Open this folder in VS Code.
2. Open the terminal in VS Code.
3. Install packages:

   ```bash
   npm install
   ```

4. Copy `.env.example` to a new file named `.env`.
5. Set either `DATABASE_URL` for a hosted PostgreSQL service, or configure
   `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` for a local
   PostgreSQL server. Also update the session secret and SMTP settings.
6. In PostgreSQL, create the database:

   ```sql
   CREATE DATABASE student_carpool;
   ```

7. Connect to `student_carpool` and run the commands in `database.sql`.
8. Start the server:

   ```bash
   npm run dev
   ```

9. Open `http://localhost:3000` in your browser.
10. Check `http://localhost:3000/health` to verify the server responds.

## Email verification

New accounts must verify their email before they can log in. Configure the SMTP
settings in `.env` (never commit that file). For Gmail, enable 2-Step
Verification and create an App Password; use that app password for
`SMTP_PASSWORD`, not your regular Google password. Spaces in Gmail's
space-grouped App Password are removed automatically. Set `SMTP_USER` to the
Gmail account and `MAIL_FROM` to that account or a sender alias configured in
Gmail. Other email providers can be used by setting their SMTP host, port,
secure mode, and credentials. `APP_URL` must be the URL
where this app is reachable; use your deployed HTTPS URL outside local
development.

For Render, use an HTTPS email API instead of direct Gmail SMTP if SMTP delivery
fails. For Resend, verify a sending domain with Resend, then set
`EMAIL_PROVIDER=resend`, `RESEND_API_KEY` to the API key, `MAIL_FROM` to a
sender on the verified domain, and `APP_URL` to the deployed HTTPS address in
the Render environment settings. Keep the API key private. The default
`EMAIL_PROVIDER=smtp` continues to use SMTP for local development.

Alternatively, Google Apps Script can send verification emails using a Google
account's mail quota. Copy `scripts/google-apps-script.gs` into a new project at
`script.google.com`. In **Project Settings → Script Properties**, add
`CARPOOL_EMAIL_SECRET` with a new long random secret. Deploy the project as a
Web app that executes as your account and is accessible to anyone; the shared
secret protects the endpoint. Copy the deployed URL ending in `/exec`, then set
these variables in Render (and `.env` for local use):

```text
EMAIL_PROVIDER=google-apps-script
APPS_SCRIPT_URL=https://script.google.com/macros/s/your-deployment-id/exec
APPS_SCRIPT_SECRET=the-same-secret-set-in-script-properties
APP_URL=https://your-public-app-url
MAIL_FROM=Student Carpool
```

Use your actual deployment and app URLs, keep the shared secret private, and
redeploy the Apps Script whenever its code changes. Google may ask you to
authorize the script to send email when you first deploy or run it.

Verification links expire after 24 hours. If delivery fails, check the SMTP
settings in `.env` and submit the registration form again with the same
unverified email to send a fresh link. The registration page also has a
"Resend verification email" form for requesting a new link.

To open a local verification link on a phone connected to the same Wi-Fi, set
`APP_URL` to the computer's Wi-Fi IPv4 address and port (for example,
`http://192.168.1.20:3000`), then restart the server and register again to send
a fresh link. The computer and phone must stay on the same trusted Wi-Fi. If
the phone cannot connect, check Windows Firewall and allow Node.js on private
networks only; do not expose the development server to public networks.

For a deployed site, configure `APP_URL`, database credentials, and SMTP
settings in the hosting provider's environment settings. `APP_URL` must be the
public HTTPS URL used on the phone, not `localhost` or a private Wi-Fi address.
Restart or redeploy the app after changing environment settings.

## Database troubleshooting

If login or registration reports `relation "users" does not exist`, connect to
the same database configured by `DATABASE_URL` and run the complete
`database.sql` file. In pgAdmin, select that database, open its Query Tool,
load `database.sql`, and execute it. This also adds the email verification
columns to an existing `users` table. Then retry the request. The schema script
is safe to run again and creates the required tables and indexes if missing.

## Important

This is a starter scaffold, not a complete production-ready application. Trip creation, booking actions, admin permissions, and transaction-safe seat management still need to be implemented. Do not use real student or vehicle information until appropriate security and safety measures have been added.
