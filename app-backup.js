const express = require('express');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Student Carpool System server is running.' });
});

app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.send('Database connected successfully!');
    } catch (error) {
        console.error('Database error:', error.message);
        res.status(500).send('Database connection failed. Check the terminal.');
    }
});

app.get('/register', (req, res) => {
    res.render('register');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
