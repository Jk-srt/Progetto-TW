-- Migration per la nuova struttura del database
-- Creazione tabella accesso e ristrutturazione users

-- 1. Creare la nuova tabella accesso
CREATE TABLE IF NOT EXISTS accesso (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    airline_id INTEGER REFERENCES airlines(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_role_references CHECK (
        (role = 'admin' AND airline_id IS NULL AND user_id IS NULL) OR
        (role = 'airline' AND airline_id IS NOT NULL AND user_id IS NULL) OR
        (role = 'user' AND user_id IS NOT NULL AND airline_id IS NULL)
    )
);

-- 2. Backup dei dati esistenti
CREATE TEMP TABLE temp_users_backup AS 
SELECT * FROM users;

-- 3. Modificare la tabella users per rimuovere i campi di autenticazione
ALTER TABLE users DROP COLUMN IF EXISTS email;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE users DROP COLUMN IF EXISTS tempporary_password;

-- 4. Aggiungere i campi mancanti alla tabella users se non esistono
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50);

-- 5. Migrare i dati esistenti dalla tabella users alla tabella accesso
-- Prima migra gli admin
INSERT INTO accesso (email, password_hash, role)
SELECT email, password_hash, role
FROM temp_users_backup 
WHERE role = 'admin'
ON CONFLICT (email) DO NOTHING;

-- Poi migra le compagnie aeree
INSERT INTO accesso (email, password_hash, role, airline_id)
SELECT email, password_hash, role, airline_id
FROM temp_users_backup 
WHERE role = 'airline' AND airline_id IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Inserire l'admin di default se non esiste
INSERT INTO accesso (email, password_hash, role) VALUES
('admin@taw-flights.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 6. Creare indici per performance
CREATE INDEX IF NOT EXISTS idx_accesso_email ON accesso(email);
CREATE INDEX IF NOT EXISTS idx_accesso_role ON accesso(role);
CREATE INDEX IF NOT EXISTS idx_accesso_airline_id ON accesso(airline_id);
CREATE INDEX IF NOT EXISTS idx_accesso_user_id ON accesso(user_id);

-- 7. Output di conferma
SELECT 'Migration completata con successo!' as status;

-- 8. Aggiungi tabella per gli extra delle prenotazioni (itemized)
CREATE TABLE IF NOT EXISTS booking_extras (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    extra_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_extras_booking_id ON booking_extras(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_extras_type ON booking_extras(extra_type);
