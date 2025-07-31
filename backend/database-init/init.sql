-- Creazione database TAW Flights
-- Script di inizializzazione PostgreSQL

-- Creazione delle tabelle
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    airline_id INTEGER REFERENCES airlines(id),
    temporary_password BOOLEAN NOT NULL DEFAULT FALSE,
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

-- Tabella delle compagnie aeree
CREATE TABLE IF NOT EXISTS airlines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    iata_code VARCHAR(2) UNIQUE NOT NULL,
    icao_code VARCHAR(3) UNIQUE NOT NULL,
    country VARCHAR(100) NOT NULL,
    founded_year INTEGER,
    website VARCHAR(255),
    logo_url VARCHAR(500),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella degli aerei
CREATE TABLE IF NOT EXISTS aircrafts (
    id SERIAL PRIMARY KEY,
    airline_id INTEGER REFERENCES airlines(id),
    registration VARCHAR(10) UNIQUE NOT NULL,
    aircraft_type VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    seat_capacity INTEGER NOT NULL,
    business_class_seats INTEGER DEFAULT 0,
    economy_class_seats INTEGER NOT NULL,
    manufacturing_year INTEGER,
    last_maintenance DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flights (
    id SERIAL PRIMARY KEY,
    flight_number VARCHAR(10) UNIQUE NOT NULL,
    airline_id INTEGER REFERENCES airlines(id),
    aircraft_id INTEGER REFERENCES aircrafts(id),
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

-- Inserimento dati di test per compagnie aeree
INSERT INTO airlines (name, iata_code, icao_code, country, founded_year, website, active) VALUES
('Alitalia', 'AZ', 'AZA', 'Italy', 1946, 'https://www.alitalia.com', true),
('British Airways', 'BA', 'BAW', 'United Kingdom', 1974, 'https://www.britishairways.com', true),
('Air France', 'AF', 'AFR', 'France', 1933, 'https://www.airfrance.com', true),
('Vueling', 'VY', 'VLG', 'Spain', 2004, 'https://www.vueling.com', true),
('KLM', 'KL', 'KLM', 'Netherlands', 1919, 'https://www.klm.com', true),
('Ryanair', 'FR', 'RYR', 'Ireland', 1984, 'https://www.ryanair.com', true);

-- Inserimento dati di test per aerei
INSERT INTO aircrafts (airline_id, registration, aircraft_type, manufacturer, model, seat_capacity, business_class_seats, economy_class_seats, manufacturing_year, status) VALUES
(1, 'I-BIXM', 'Narrow-body', 'Airbus', 'A321', 200, 20, 180, 2019, 'active'),
(1, 'I-BIXN', 'Narrow-body', 'Airbus', 'A320', 180, 12, 168, 2020, 'active'),
(2, 'G-EUUU', 'Narrow-body', 'Airbus', 'A320', 180, 24, 156, 2018, 'active'),
(2, 'G-EUYY', 'Wide-body', 'Boeing', '777-300ER', 350, 56, 294, 2017, 'active'),
(3, 'F-HEPG', 'Narrow-body', 'Airbus', 'A320', 174, 12, 162, 2019, 'active'),
(3, 'F-GRHZ', 'Wide-body', 'Boeing', '787-9', 276, 30, 246, 2020, 'active'),
(4, 'EC-MBT', 'Narrow-body', 'Airbus', 'A320', 180, 0, 180, 2016, 'active'),
(5, 'PH-BXA', 'Wide-body', 'Boeing', '737-800', 186, 20, 166, 2015, 'active'),
(6, 'EI-DWF', 'Narrow-body', 'Boeing', '737-800', 189, 0, 189, 2014, 'active');

-- Inserimento dati di test per voli
INSERT INTO flights (flight_number, airline_id, aircraft_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, total_seats, available_seats, status) VALUES
('AZ101', 1, 1, 1, 2, '2024-12-01 08:00:00', '2024-12-01 09:30:00', 89.99, 200, 156, 'scheduled'),
('AZ102', 1, 2, 2, 1, '2024-12-01 10:30:00', '2024-12-01 12:00:00', 94.99, 180, 143, 'scheduled'),
('BA205', 2, 3, 1, 3, '2024-12-01 14:15:00', '2024-12-01 16:45:00', 159.99, 180, 178, 'scheduled'),
('AF301', 3, 5, 1, 4, '2024-12-01 11:20:00', '2024-12-01 13:30:00', 139.99, 174, 145, 'scheduled'),
('VY402', 4, 7, 2, 5, '2024-12-01 07:45:00', '2024-12-01 09:15:00', 79.99, 180, 128, 'scheduled'),
('KL503', 5, 8, 2, 6, '2024-12-01 16:00:00', '2024-12-01 17:20:00', 119.99, 186, 162, 'scheduled'),
('AZ201', 1, 1, 1, 5, '2024-12-01 19:30:00', '2024-12-01 21:45:00', 169.99, 200, 141, 'scheduled'),
('BA301', 2, 4, 3, 1, '2024-12-01 09:15:00', '2024-12-01 13:45:00', 149.99, 350, 289, 'scheduled');

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
CREATE INDEX IF NOT EXISTS idx_flights_airline ON flights(airline_id);
CREATE INDEX IF NOT EXISTS idx_flights_aircraft ON flights(aircraft_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_flight_id ON bookings(flight_id);
CREATE INDEX IF NOT EXISTS idx_aircrafts_airline ON aircrafts(airline_id);
CREATE INDEX IF NOT EXISTS idx_aircrafts_status ON aircrafts(status);
CREATE INDEX IF NOT EXISTS idx_airlines_active ON airlines(active);

-- Output di conferma
SELECT 'Database TAW Flights inizializzato con successo!' as status;
