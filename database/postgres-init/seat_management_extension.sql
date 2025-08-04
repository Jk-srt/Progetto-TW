-- Estensione per la gestione dei posti e prenotazioni temporanee
-- Aggiunta al sistema esistente

-- Tabella per la configurazione dei posti degli aerei
CREATE TABLE IF NOT EXISTS aircraft_seats (
    id SERIAL PRIMARY KEY,
    aircraft_id INTEGER REFERENCES aircrafts(id) ON DELETE CASCADE,
    seat_number VARCHAR(4) NOT NULL, -- Es: 1A, 12F, 23C
    seat_class VARCHAR(20) NOT NULL DEFAULT 'economy', -- economy, business, first
    seat_type VARCHAR(20) NOT NULL DEFAULT 'window', -- window, middle, aisle
    row_number INTEGER NOT NULL,
    seat_letter CHAR(1) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(aircraft_id, seat_number),
    CONSTRAINT check_seat_class CHECK (seat_class IN ('economy', 'business', 'first')),
    CONSTRAINT check_seat_type CHECK (seat_type IN ('window', 'middle', 'aisle'))
);

-- Tabella per le prenotazioni temporanee (15 minuti)
CREATE TABLE IF NOT EXISTS temporary_seat_reservations (
    id SERIAL PRIMARY KEY,
    flight_id INTEGER REFERENCES flights(id) ON DELETE CASCADE,
    seat_id INTEGER REFERENCES aircraft_seats(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL, -- ID sessione per tracciare l'utente
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL se utente ospite
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(flight_id, seat_id),
    CONSTRAINT check_expiry CHECK (expires_at > created_at)
);

-- Tabella per le prenotazioni definitive dei posti
CREATE TABLE IF NOT EXISTS seat_bookings (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    flight_id INTEGER REFERENCES flights(id) ON DELETE CASCADE,
    seat_id INTEGER REFERENCES aircraft_seats(id) ON DELETE CASCADE,
    passenger_name VARCHAR(200) NOT NULL,
    passenger_email VARCHAR(255),
    passenger_phone VARCHAR(20),
    passenger_document_type VARCHAR(20) DEFAULT 'passport', -- passport, id_card
    passenger_document_number VARCHAR(50),
    passenger_date_of_birth DATE,
    passenger_nationality VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(flight_id, seat_id),
    UNIQUE(booking_id, seat_id),
    CONSTRAINT check_document_type CHECK (passenger_document_type IN ('passport', 'id_card', 'driving_license'))
);

-- Aggiunta di una colonna alla tabella bookings per il tracking dello stato
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_status VARCHAR(20) DEFAULT 'pending';
UPDATE bookings SET booking_status = 'confirmed' WHERE booking_status IS NULL;
ALTER TABLE bookings ADD CONSTRAINT check_booking_status 
    CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'expired'));

-- Funzione per pulire automaticamente le prenotazioni scadute
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void AS $$
BEGIN
    DELETE FROM temporary_seat_reservations 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger per pulizia automatica (eseguito ogni volta che viene inserita una nuova prenotazione temporanea)
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_reservations()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM cleanup_expired_reservations();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_trigger
    AFTER INSERT ON temporary_seat_reservations
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_expired_reservations();

-- Vista per ottenere la mappa completa dei posti con stato
CREATE OR REPLACE VIEW flight_seat_map AS
SELECT 
    f.id as flight_id,
    f.flight_number,
    a.id as aircraft_id,
    a.aircraft_type,
    a.seat_capacity,
    s.id as seat_id,
    s.seat_number,
    s.seat_class,
    s.seat_type,
    s.row_number,
    s.seat_letter,
    s.is_available as seat_physically_available,
    CASE 
        WHEN sb.id IS NOT NULL THEN 'booked'
        WHEN tr.id IS NOT NULL AND tr.expires_at > NOW() THEN 'temporarily_reserved'
        WHEN s.is_available = FALSE THEN 'unavailable'
        ELSE 'available'
    END as seat_status,
    tr.session_id as reserved_by_session,
    tr.expires_at as reservation_expires,
    sb.passenger_name as booked_by_passenger
FROM flights f
JOIN aircrafts a ON f.aircraft_id = a.id
JOIN aircraft_seats s ON a.id = s.aircraft_id
LEFT JOIN temporary_seat_reservations tr ON (f.id = tr.flight_id AND s.id = tr.seat_id)
LEFT JOIN seat_bookings sb ON (f.id = sb.flight_id AND s.id = sb.seat_id);

-- Populazione iniziale dei posti per gli aerei esistenti
INSERT INTO aircraft_seats (aircraft_id, seat_number, seat_class, seat_type, row_number, seat_letter)
SELECT 
    a.id as aircraft_id,
    CONCAT(row_num, seat_letter) as seat_number,
    CASE 
        WHEN row_num <= (a.business_class_seats::float / 6)::int THEN 'business'
        ELSE 'economy'
    END as seat_class,
    CASE 
        WHEN seat_letter IN ('A', 'F') THEN 'window'
        WHEN seat_letter IN ('B', 'E') THEN 'middle'
        ELSE 'aisle'
    END as seat_type,
    row_num,
    seat_letter
FROM aircrafts a
CROSS JOIN generate_series(1, CEIL(a.seat_capacity::float / 6)::int) as row_num
CROSS JOIN (VALUES ('A'), ('B'), ('C'), ('D'), ('E'), ('F')) as seats(seat_letter)
WHERE a.seat_capacity >= (row_num - 1) * 6 + 
    CASE 
        WHEN seat_letter = 'A' THEN 1
        WHEN seat_letter = 'B' THEN 2
        WHEN seat_letter = 'C' THEN 3
        WHEN seat_letter = 'D' THEN 4
        WHEN seat_letter = 'E' THEN 5
        WHEN seat_letter = 'F' THEN 6
    END
ON CONFLICT (aircraft_id, seat_number) DO NOTHING;

-- Indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_aircraft_seats_aircraft_id ON aircraft_seats(aircraft_id);
CREATE INDEX IF NOT EXISTS idx_aircraft_seats_class ON aircraft_seats(seat_class);
CREATE INDEX IF NOT EXISTS idx_temp_reservations_flight_seat ON temporary_seat_reservations(flight_id, seat_id);
CREATE INDEX IF NOT EXISTS idx_temp_reservations_session ON temporary_seat_reservations(session_id);
CREATE INDEX IF NOT EXISTS idx_temp_reservations_expires ON temporary_seat_reservations(expires_at);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_flight_seat ON seat_bookings(flight_id, seat_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_booking ON seat_bookings(booking_id);

-- Funzioni di utilità per la gestione delle prenotazioni

-- Funzione per riservare temporaneamente un posto
CREATE OR REPLACE FUNCTION reserve_seat_temporarily(
    p_flight_id INTEGER,
    p_seat_id INTEGER,
    p_session_id VARCHAR(255),
    p_user_id INTEGER DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
    existing_reservation INTEGER;
    seat_available BOOLEAN;
BEGIN
    -- Pulisci prenotazioni scadute
    PERFORM cleanup_expired_reservations();
    
    -- Controlla se il posto è già prenotato definitivamente
    SELECT COUNT(*) INTO existing_reservation
    FROM seat_bookings 
    WHERE flight_id = p_flight_id AND seat_id = p_seat_id;
    
    IF existing_reservation > 0 THEN
        RETURN FALSE; -- Posto già prenotato definitivamente
    END IF;
    
    -- Controlla se il posto è disponibile fisicamente
    SELECT is_available INTO seat_available
    FROM aircraft_seats 
    WHERE id = p_seat_id;
    
    IF NOT seat_available THEN
        RETURN FALSE; -- Posto non disponibile fisicamente
    END IF;
    
    -- Inserisci o aggiorna la prenotazione temporanea
    INSERT INTO temporary_seat_reservations (flight_id, seat_id, session_id, user_id, expires_at)
    VALUES (p_flight_id, p_seat_id, p_session_id, p_user_id, NOW() + INTERVAL '15 minutes')
    ON CONFLICT (flight_id, seat_id) 
    DO UPDATE SET 
        session_id = p_session_id,
        user_id = p_user_id,
        expires_at = NOW() + INTERVAL '15 minutes',
        created_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Funzione per rilasciare una prenotazione temporanea
CREATE OR REPLACE FUNCTION release_seat_reservation(
    p_flight_id INTEGER,
    p_seat_id INTEGER,
    p_session_id VARCHAR(255)
) RETURNS boolean AS $$
BEGIN
    DELETE FROM temporary_seat_reservations 
    WHERE flight_id = p_flight_id 
        AND seat_id = p_seat_id 
        AND session_id = p_session_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Funzione per confermare una prenotazione (da temporanea a definitiva)
CREATE OR REPLACE FUNCTION confirm_seat_booking(
    p_booking_id INTEGER,
    p_flight_id INTEGER,
    p_seat_id INTEGER,
    p_session_id VARCHAR(255),
    p_passenger_name VARCHAR(200),
    p_passenger_email VARCHAR(255) DEFAULT NULL,
    p_passenger_phone VARCHAR(20) DEFAULT NULL,
    p_passenger_document_type VARCHAR(20) DEFAULT 'passport',
    p_passenger_document_number VARCHAR(50) DEFAULT NULL,
    p_passenger_date_of_birth DATE DEFAULT NULL,
    p_passenger_nationality VARCHAR(100) DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
    temp_reservation_exists BOOLEAN;
BEGIN
    -- Verifica che esista una prenotazione temporanea valida
    SELECT EXISTS(
        SELECT 1 FROM temporary_seat_reservations 
        WHERE flight_id = p_flight_id 
            AND seat_id = p_seat_id 
            AND session_id = p_session_id 
            AND expires_at > NOW()
    ) INTO temp_reservation_exists;
    
    IF NOT temp_reservation_exists THEN
        RETURN FALSE; -- Prenotazione temporanea non valida o scaduta
    END IF;
    
    -- Inserisci la prenotazione definitiva
    INSERT INTO seat_bookings (
        booking_id, flight_id, seat_id, passenger_name, passenger_email, 
        passenger_phone, passenger_document_type, passenger_document_number,
        passenger_date_of_birth, passenger_nationality
    ) VALUES (
        p_booking_id, p_flight_id, p_seat_id, p_passenger_name, p_passenger_email,
        p_passenger_phone, p_passenger_document_type, p_passenger_document_number,
        p_passenger_date_of_birth, p_passenger_nationality
    );
    
    -- Rimuovi la prenotazione temporanea
    DELETE FROM temporary_seat_reservations 
    WHERE flight_id = p_flight_id 
        AND seat_id = p_seat_id 
        AND session_id = p_session_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

SELECT 'Estensione gestione posti installata con successo!' as status;
