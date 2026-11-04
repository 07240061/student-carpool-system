
require('dotenv').config();

const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
const useSsl = databaseUrl || process.env.DB_SSL === 'true';
const pool = new Pool(databaseUrl
    ? {
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'student_carpool',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined
    });

pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message);
});

module.exports = pool;
