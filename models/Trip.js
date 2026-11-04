const pool = require('../config/db');

async function findOpenTrips() {
    const result = await pool.query(
        `SELECT t.trip_id, t.starting_point, t.destination, t.departure_time,
                t.available_seats, t.fare, u.full_name AS driver_name
         FROM trips t
         JOIN users u ON u.user_id = t.driver_id
         WHERE t.status = 'open'
           AND t.departure_time > CURRENT_TIMESTAMP
           AND t.available_seats > 0
         ORDER BY t.departure_time`
    );
    return result.rows;
}

module.exports = { findOpenTrips };
