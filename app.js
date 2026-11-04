const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = require('./config/db');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'local-development-only-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 3600000 }
}));

function requireLogin(req, res, next) {
    if (!req.session.user) return res.redirect('/login');
    next();
}

function requireRole(role) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.redirect('/login');
        }

        if (req.session.user.role !== role) {
            return res.status(403).send('You are not allowed to open this page.');
        }

        next();
    };
}

app.get('/', (req, res) => res.render('index'));
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Student Carpool System server is running.' });
});
app.get('/test-db', async (req, res) => {
    try {
        await pool.query('SELECT NOW()');
        res.send('Database connected successfully!');
    } catch (error) {
        console.error('Database error:', error.message);
        res.status(500).send('Database connection failed. Check the terminal.');
    }
});

app.get('/register', (req, res) => res.render('auth/register', { error: null }));
app.post('/register', async (req, res) => {
    try {
        const fullName = (req.body.full_name || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();
        const password = req.body.password || '';

        if (!fullName || !email || !password) {
            return res.status(400).render('auth/register', { error: 'Please fill in all fields.' });
        }
        if (password.length < 8) {
            return res.status(400).render('auth/register', { error: 'Password must be at least 8 characters.' });
        }
        const role = req.body.role === 'driver' ? 'driver' : 'student';

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
          'INSERT INTO users (full_name, email, password, role) VALUES ($1, $2, $3, $4)',
          [fullName, email, hashedPassword, role]
        );

        res.redirect('/login?registered=1');
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).render('auth/register', {
                error: 'That email is already registered. Try another email or log in.'
            });
        }
        console.error('Registration error:', error.message);
        res.status(500).render('auth/register', {
            error: 'Registration failed. Check the VS Code terminal.'
        });
    }
});

app.get('/login', (req, res) => res.render('auth/login', {
    error: null, registered: req.query.registered === '1'
}));
app.post('/login', async (req, res) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const password = req.body.password || '';
        const result = await pool.query(
            'SELECT user_id, full_name, email, password, role FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).render('auth/login', {
                error: 'Email or password is incorrect.', registered: false
            });
        }
        const user = result.rows[0];
        const matches = await bcrypt.compare(password, user.password);
        if (!matches) {
          return res.status(401).render('auth/login', {
        error: 'Email or password is incorrect.', registered: false
    });
}

req.session.user = {
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    role: user.role
};

req.session.userId = user.user_id;
req.session.role = user.role;

if (user.role === 'driver') {
    return res.redirect('/driver/dashboard');
}

return res.redirect('/student/dashboard');

    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).render('auth/login', {
            error: 'Login failed. Check the VS Code terminal.', registered: false
        });
    }
});

app.get('/dashboard', requireLogin, (req, res) => {
    res.render('dashboard', { user: req.session.user });
});

app.get('/driver/dashboard',
    requireLogin,
    requireRole('driver'),
    (req, res) => {
        res.render('driver/dashboard');
    }
);

app.get('/student/dashboard',
    requireLogin,
    requireRole('student'),
    (req, res) => {
        res.render('student/dashboard');
    }
);


app.post('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('Logout error:', error.message);
            return res.status(500).send('Could not log out. Please try again.');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// Show vehicle registration form
app.get('/vehicle', requireLogin, (req, res) => {
  res.render('vehicle', { error: null });
});

// Save a vehicle belonging to the logged-in user
app.post('/vehicle', requireLogin, async (req, res) => {
  const vehicleModel = (req.body.vehicle_model || '').trim();
  const vehicleNumber = (req.body.vehicle_number || '').trim().toUpperCase();
  const seatCapacity = Number(req.body.seat_capacity);

  if (!vehicleModel || !vehicleNumber ||
      !Number.isInteger(seatCapacity) || seatCapacity < 1 || seatCapacity > 20) {
    return res.status(400).render('vehicle', {
      error: 'Enter a model, vehicle number, and a seat capacity from 1 to 20.'
    });
  }

  try {
    const driverId = req.session.userId;

await pool.query(
  `INSERT INTO vehicles (driver_id, vehicle_model, vehicle_number, seat_capacity)
   VALUES ($1, $2, $3, $4)`,
  [driverId, vehicleModel, vehicleNumber, seatCapacity]
);

   
    res.redirect('/trips/new?vehicleAdded=1');
  } catch (error) {
    console.error('Vehicle registration error:', error.message);
    if (error.code === '23505') {
      return res.status(409).render('vehicle', {
        error: 'That vehicle number is already registered. Check the number or use another one.'
      });
    }
    res.status(500).render('vehicle', {
      error: 'Could not register the vehicle. Check the VS Code terminal.'
    });
  }
});

// Show trip form and trips created by this user
app.get('/trips/new', requireLogin, async (req, res) => {
  try {
    const id = req.session.user.user_id;
    const vehicles = await pool.query(
      'SELECT vehicle_id, vehicle_model, vehicle_number, seat_capacity FROM vehicles WHERE driver_id = $1 ORDER BY vehicle_id DESC', [id]);
    const trips = await pool.query(
      'SELECT trip_id, starting_point, destination, departure_time, available_seats, fare, status FROM trips WHERE driver_id = $1 ORDER BY departure_time DESC', [id]);
    res.render('trips', { vehicles: vehicles.rows, trips: trips.rows, error: null,
      message: req.query.created === '1' ? 'Trip created successfully.' :
               req.query.vehicleAdded === '1' ? 'Vehicle registered successfully.' : null });
  } catch (e) { console.error(e.message); res.status(500).send('Could not load trips.'); }
});

app.post('/trips', requireLogin, async (req, res) => {
  try {
    const id = req.session.user.user_id;
    const vehicleId = Number(req.body.vehicle_id);
    const from = (req.body.starting_point || '').trim();
    const to = (req.body.destination || '').trim();
    const departure = new Date(req.body.departure_time);
    const seats = Number(req.body.available_seats);
    const fare = Number(req.body.fare);
    if (!Number.isInteger(vehicleId) || !from || !to || Number.isNaN(departure.getTime()) ||
        departure <= new Date() || !Number.isInteger(seats) || seats < 1 ||
        !Number.isFinite(fare) || fare < 0) return res.status(400).send('Enter valid trip details; departure must be in the future.');
    if (from.toLowerCase() === to.toLowerCase()) return res.status(400).send('Start and destination must differ.');
    const vehicle = await pool.query(
    'SELECT vehicle_id, seat_capacity FROM vehicles WHERE vehicle_id = $1 AND driver_id = $2',
    [vehicleId, id]
);

if (!vehicle.rows.length) {
    return res.status(400).send('Choose a vehicle registered to your account.');
}
    if (seats > vehicle.rows[0].seat_capacity) return res.status(400).send('Seats exceed vehicle capacity.');
    await pool.query(
      'INSERT INTO trips (driver_id, vehicle_id, starting_point, destination, departure_time, available_seats, fare) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, vehicleId, from, to, departure.toISOString(), seats, fare]);
    res.redirect('/trips/new?created=1');
  } catch (e) { console.error(e.message); res.status(500).send('Could not create trip. Check terminal and database columns.'); }
});

app.get('/trips/search', requireLogin, async (req, res) => {
  try {
    const from = (req.query.from || '').trim(), to = (req.query.to || '').trim();
    const result = await pool.query(
  `SELECT
      t.trip_id,
      t.starting_point,
      t.destination,
      t.departure_time,
      t.available_seats,
      t.fare,
      u.full_name AS driver_name,
      v.vehicle_model,
      v.vehicle_number
   FROM trips t
   JOIN users u ON u.user_id = t.driver_id
   JOIN vehicles v ON v.vehicle_id = t.vehicle_id
   WHERE t.available_seats > 0
     AND t.departure_time > NOW()
     AND LOWER(t.status) = 'open'
     AND ($1 = '' OR LOWER(t.starting_point) LIKE LOWER('%' || $1 || '%'))
     AND ($2 = '' OR LOWER(t.destination) LIKE LOWER('%' || $2 || '%'))
     AND t.driver_id <> $3
   ORDER BY t.departure_time`,
  [from, to, req.session.user.user_id]
);

    res.render('search-trips', { trips: result.rows, from, to });
  } catch (e) { console.error(e.message); res.status(500).send('Search failed. Check names and status values.'); }
});
app.post('/trips/:id/book', requireLogin, requireRole('student'), async (req, res) => {
const tripId = Number(req.params.id);
const studentId = req.session.userId;
  if (!Number.isInteger(tripId)) return res.status(400).send('Invalid trip.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      'SELECT trip_id, driver_id, available_seats, departure_time, status FROM trips WHERE trip_id = $1 FOR UPDATE', [tripId]);
    const t = r.rows[0];
    if (!t || Number(t.driver_id) === Number(studentId) || new Date(t.departure_time) <= new Date() ||
        Number(t.available_seats) < 1 || String(t.status).toLowerCase() !== 'open') {
      await client.query('ROLLBACK'); return res.status(400).send('This trip cannot be booked.');
    }
    const existing = await client.query(
  "SELECT booking_id FROM bookings WHERE trip_id = $1 AND passenger_id = $2 AND LOWER(status) IN ('pending','accepted')",
  [tripId, studentId]
);
    if (existing.rows.length) { await client.query('ROLLBACK'); return res.status(409).send('You already have an active booking.'); }
    await client.query(
  "INSERT INTO bookings (trip_id, passenger_id, seats_requested, status) VALUES ($1, $2, $3, 'pending')",
  [tripId, studentId, 1]
);
    await client.query('COMMIT');
    res.redirect('/bookings');
  } catch (e) {
    await client.query('ROLLBACK'); console.error(e.message);
    res.status(500).send('Could not create booking. Check bookings table columns.');
  } finally { client.release(); }
});

app.get('/bookings',
  requireLogin,
  requireRole('student'),
  async (req, res) => {
  try {
    const r = await pool.query(
  `SELECT
      b.booking_id,
      b.status,
      b.seats_requested,
      t.starting_point,
      t.destination,
      t.departure_time,
      u.full_name AS driver_name,
      v.vehicle_model,
      v.vehicle_number
   FROM bookings b
   JOIN trips t ON t.trip_id = b.trip_id
   JOIN users u ON u.user_id = t.driver_id
   JOIN vehicles v ON v.vehicle_id = t.vehicle_id
   WHERE b.passenger_id = $1
   ORDER BY b.booking_id DESC`,
   [req.session.userId]
);
    
    res.render('my-bookings', { bookings: r.rows });
  } catch (e) { console.error(e.message); res.status(500).send('Could not load bookings. Check schema.'); }
});

app.get('/driver/bookings',
  requireLogin,
  requireRole('driver'),
  async (req, res) => {
  try {
    const r = await pool.query(
  `SELECT
      b.booking_id,
      b.status,
      b.seats_requested,
      u.full_name AS student_name,
      t.starting_point,
      t.destination,
      t.departure_time
   FROM bookings b
   JOIN trips t ON t.trip_id = b.trip_id
   JOIN users u ON u.user_id = b.passenger_id
   WHERE t.driver_id = $1
   ORDER BY b.booking_id DESC`,
  [req.session.userId]
);
    res.render('driver-bookings', { bookings: r.rows });
  } catch (e) { console.error(e.message); res.status(500).send('Could not load driver requests.'); }
});

app.post(
  '/driver/bookings/:id/reject',
  requireLogin,
  requireRole('driver'),
  async (req, res) => {
    app.post(
  '/driver/bookings/:id/accept',
  requireLogin,
  requireRole('driver'),
  async (req, res) => {
    const bookingId = Number(req.params.id);
    const driverId = req.session.userId;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT
            b.booking_id,
            b.seats_requested,
            b.status,
            t.trip_id,
            t.available_seats
         FROM bookings b
         JOIN trips t ON t.trip_id = b.trip_id
         WHERE b.booking_id = $1
         AND t.driver_id = $2
         FOR UPDATE`,
        [bookingId, driverId]
      );

      if (!result.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).send('Booking not found.');
      }

      const booking = result.rows[0];

      if (booking.status !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(400).send('Booking already processed.');
      }

      if (booking.available_seats < booking.seats_requested) {
        await client.query('ROLLBACK');
        return res.status(400).send('Not enough seats available.');
      }

      await client.query(
        `UPDATE trips
         SET available_seats = available_seats - $1
         WHERE trip_id = $2`,
        [booking.seats_requested, booking.trip_id]
      );

      await client.query(
        `UPDATE bookings
         SET status = 'accepted'
         WHERE booking_id = $1`,
        [bookingId]
      );

      await client.query('COMMIT');

      res.redirect('/driver/bookings');

    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e.message);
      res.status(500).send('Could not accept booking.');
    } finally {
      client.release();
    }
  }
);
  try {
    const r = await pool.query(
      `UPDATE bookings b SET status = 'rejected'
       FROM trips t WHERE b.trip_id = t.trip_id AND b.booking_id = $1
       AND t.driver_id = $2 AND LOWER(b.status) = 'pending'
       RETURNING b.booking_id`,
      [Number(req.params.id), req.session.user_id]);
    if (!r.rowCount) return res.status(404).send('Pending request not found for your trip.');
    res.redirect('/driver/bookings');
  } catch (e) { console.error(e.message); res.status(500).send('Could not reject request.'); }
});

app.get('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('Logout error:', error.message);
            return res.status(500).send('Could not log out.');
        }

        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running at http://localhost:${PORT}`));