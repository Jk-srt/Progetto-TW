-- Script di inizializzazione del database PostgreSQL per TAW Flights
-- Eseguire questo script per creare le tabelle necessarie

-- Tabella utenti
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella voli
CREATE TABLE IF NOT EXISTS flights (
    id SERIAL PRIMARY KEY,
    flight_number VARCHAR(10) UNIQUE NOT NULL,
    airline VARCHAR(100) NOT NULL,
    departure_airport VARCHAR(10) NOT NULL,
    arrival_airport VARCHAR(10) NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    available_seats INTEGER NOT NULL DEFAULT 0,
    total_seats INTEGER NOT NULL DEFAULT 0,
    aircraft_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, delayed, cancelled, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella prenotazioni
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    flight_id INTEGER REFERENCES flights(id) ON DELETE CASCADE,
    booking_reference VARCHAR(10) UNIQUE NOT NULL,
    passenger_count INTEGER NOT NULL DEFAULT 1,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, cancelled, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella passeggeri
CREATE TABLE IF NOT EXISTS passengers (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    passport_number VARCHAR(20),
    nationality VARCHAR(3), -- ISO 3-letter country code
    seat_number VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_flights_departure_time ON flights(departure_time);
CREATE INDEX IF NOT EXISTS idx_flights_airports ON flights(departure_airport, arrival_airport);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_flight_id ON bookings(flight_id);
CREATE INDEX IF NOT EXISTS idx_passengers_booking_id ON passengers(booking_id);

-- Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flights_updated_at BEFORE UPDATE ON flights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Dati di esempio (opzionale)
INSERT INTO flights (flight_number, airline, departure_airport, arrival_airport, departure_time, arrival_time, price, available_seats, total_seats, aircraft_type)
VALUES 
    ('IT123', 'ITA Airways', 'FCO', 'CDG', '2025-08-01 08:00:00', '2025-08-01 10:30:00', 149.99, 150, 180, 'A320'),
    ('LH456', 'Lufthansa', 'MXP', 'FRA', '2025-08-01 14:15:00', '2025-08-01 16:45:00', 199.99, 120, 160, 'A321'),
    ('AF789', 'Air France', 'FCO', 'CDG', '2025-08-01 18:30:00', '2025-08-01 21:00:00', 189.99, 90, 140, 'B737')
ON CONFLICT (flight_number) DO NOTHING;

COMMIT;
