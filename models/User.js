const pool = require('../config/db');

async function findByEmail(email) {
    const result = await pool.query(
        'SELECT user_id, full_name, email, password, role FROM users WHERE email = $1',
        [email]
    );
    return result.rows[0];
}

async function createUser(fullName, email, hashedPassword) {
    const result = await pool.query(
        `INSERT INTO users (full_name, email, password)
         VALUES ($1, $2, $3)
         RETURNING user_id, full_name, email, role`,
        [fullName, email, hashedPassword]
    );
    return result.rows[0];
}

module.exports = { findByEmail, createUser };
