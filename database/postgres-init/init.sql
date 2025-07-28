-- Creazione database TAW Flights
-- Script di inizializzazione PostgreSQL

-- Creazione delle tabelle
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    tempporary_password BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS airports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    iata_code VARCHAR(3) UNIQUE NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flights (
    id SERIAL PRIMARY KEY,
    flight_number VARCHAR(10) UNIQUE NOT NULL,
    departure_airport_id INTEGER REFERENCES airports(id),
    arrival_airport_id INTEGER REFERENCES airports(id),
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    flight_id INTEGER REFERENCES flights(id),
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    passenger_count INTEGER NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserimento dati di test per aeroporti
INSERT INTO airports (name, iata_code, city, country, latitude, longitude) VALUES
('Leonardo da Vinci International Airport', 'FCO', 'Roma', 'Italy', 41.8003, 12.2389),
('Milano Malpensa', 'MXP', 'Milano', 'Italy', 45.6306, 8.7281),
('Heathrow Airport', 'LHR', 'London', 'United Kingdom', 51.4700, -0.4543),
('Charles de Gaulle Airport', 'CDG', 'Paris', 'France', 49.0097, 2.5479),
('Barcellona El Prat', 'BCN', 'Barcelona', 'Spain', 41.2971, 2.0785),
('Amsterdam Schiphol', 'AMS', 'Amsterdam', 'Netherlands', 52.3086, 4.7639);

-- Inserimento dati di test per voli
INSERT INTO flights (flight_number, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, total_seats, available_seats, status) VALUES
('AZ101', 1, 2, '2024-12-01 08:00:00', '2024-12-01 09:30:00', 89.99, 180, 156, 'scheduled'),
('AZ102', 2, 1, '2024-12-01 10:30:00', '2024-12-01 12:00:00', 94.99, 180, 143, 'scheduled'),
('BA205', 1, 3, '2024-12-01 14:15:00', '2024-12-01 16:45:00', 159.99, 200, 178, 'scheduled'),
('AF301', 1, 4, '2024-12-01 11:20:00', '2024-12-01 13:30:00', 139.99, 220, 195, 'scheduled'),
('VY402', 2, 5, '2024-12-01 07:45:00', '2024-12-01 09:15:00', 79.99, 150, 128, 'scheduled'),
('KL503', 2, 6, '2024-12-01 16:00:00', '2024-12-01 17:20:00', 119.99, 170, 162, 'scheduled'),
('AZ201', 1, 5, '2024-12-01 19:30:00', '2024-12-01 21:45:00', 169.99, 180, 141, 'scheduled'),
('BA301', 3, 1, '2024-12-01 09:15:00', '2024-12-01 13:45:00', 149.99, 200, 189, 'scheduled');

-- Creazione di un utente di test
INSERT INTO users (email, password_hash, first_name, last_name, phone) VALUES
('test@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mario', 'Rossi', '+39 123 456 7890', 'user');

-- Creazione di prenotazioni di test
INSERT INTO bookings (user_id, flight_id, booking_reference, passenger_count, total_price, status) VALUES
(1, 1, 'TW001ABC', 2, 179.98, 'confirmed'),
(1, 3, 'TW002DEF', 1, 159.99, 'confirmed');

-- Creazione degli indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_flights_departure_time ON flights(departure_time);
CREATE INDEX IF NOT EXISTS idx_flights_departure_airport ON flights(departure_airport_id);
CREATE INDEX IF NOT EXISTS idx_flights_arrival_airport ON flights(arrival_airport_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_flight_id ON bookings(flight_id);

-- Output di conferma
SELECT 'Database TAW Flights inizializzato con successo!' as status;
