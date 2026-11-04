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
5. Update the database password and session secret in `.env`.
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

## Important

This is a starter scaffold, not a complete production-ready application. The registration/login routes, session setup, trip creation, booking actions, admin permissions, and transaction-safe seat management still need to be implemented. Do not use real student or vehicle information until appropriate security and safety measures have been added.
