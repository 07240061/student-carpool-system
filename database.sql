-- Create the database separately first:
-- CREATE DATABASE student_carpool;
-- Then connect to student_carpool and run this file.

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'driver', 'admin')),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token_hash CHAR(64),
    email_verification_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS email_verification_token_hash CHAR(64),
    ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP;
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT FALSE;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('student', 'driver', 'admin'));

CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vehicle_model VARCHAR(100) NOT NULL,
    vehicle_number VARCHAR(30) UNIQUE NOT NULL,
    seat_capacity INTEGER NOT NULL CHECK (seat_capacity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
    trip_id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(vehicle_id),
    starting_point VARCHAR(150) NOT NULL,
    destination VARCHAR(150) NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
    fare NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (fare >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    booking_id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
    passenger_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    seats_requested INTEGER NOT NULL DEFAULT 1 CHECK (seats_requested > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (trip_id, passenger_id)
);

CREATE INDEX IF NOT EXISTS idx_trips_route_time
    ON trips (starting_point, destination, departure_time);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_status
    ON bookings (trip_id, status);
