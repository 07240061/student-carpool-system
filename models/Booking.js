const pool = require('../config/db');

// Booking actions should use database transactions when accepting requests
// and updating available seats, to avoid overbooking.
async function findBookingsForPassenger(passengerId) {
    const result = await pool.query(
        `SELECT b.booking_id, b.seats_requested, b.status,
                t.starting_point, t.destination, t.departure_time
         FROM bookings b
         JOIN trips t ON t.trip_id = b.trip_id
         WHERE b.passenger_id = $1
         ORDER BY b.created_at DESC`,
        [passengerId]
    );
    return result.rows;
}

module.exports = { findBookingsForPassenger };
