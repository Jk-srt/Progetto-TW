-- Migrazione per aggiungere route_id e rimuovere aeroporti dalla tabella flights
-- Imposta route_id = 1 per tutti i voli esistenti

-- Aggiungi la colonna route_id se non esiste
ALTER TABLE flights ADD COLUMN IF NOT EXISTS route_id INTEGER;

-- Imposta route_id = 1 per tutti i voli esistenti
UPDATE flights SET route_id = 1 WHERE route_id IS NULL;

-- Rendi route_id obbligatorio
ALTER TABLE flights ALTER COLUMN route_id SET NOT NULL;

-- Aggiungi il vincolo di foreign key per route_id
ALTER TABLE flights ADD CONSTRAINT flights_route_id_fkey 
FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE RESTRICT;

-- Rimuovi gli indici sui campi che stiamo per eliminare
DROP INDEX IF EXISTS idx_flights_departure_airport;
DROP INDEX IF EXISTS idx_flights_arrival_airport;

-- Rimuovi i vincoli di foreign key degli aeroporti
ALTER TABLE flights DROP CONSTRAINT IF EXISTS flights_departure_airport_id_fkey;
ALTER TABLE flights DROP CONSTRAINT IF EXISTS flights_arrival_airport_id_fkey;

-- Rimuovi le colonne degli aeroporti
ALTER TABLE flights DROP COLUMN IF EXISTS departure_airport_id;
ALTER TABLE flights DROP COLUMN IF EXISTS arrival_airport_id;

-- Creazione di una vista per mantenere compatibilità con le query esistenti
CREATE OR REPLACE VIEW flights_with_airports AS
SELECT 
    f.*,
    r.departure_airport_id,
    r.arrival_airport_id,
    dep_airport.name as departure_airport_name,
    dep_airport.iata_code as departure_code,
    dep_airport.city as departure_city,
    arr_airport.name as arrival_airport_name,
    arr_airport.iata_code as arrival_code,
    arr_airport.city as arrival_city,
    r.route_name,
    r.distance_km,
    r.estimated_duration as route_duration
FROM flights f
JOIN routes r ON f.route_id = r.id
JOIN airports dep_airport ON r.departure_airport_id = dep_airport.id
JOIN airports arr_airport ON r.arrival_airport_id = arr_airport.id;

-- Output di conferma
SELECT 'Migrazione completata: aggiunta route_id e rimossi campi aeroporto da flights' as status;
