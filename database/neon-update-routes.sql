-- Script SQL per aggiornare il database Neon con tabella routes e pricing per classe
-- Eseguire nell'ordine indicato

-- 1. Creare la tabella routes
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    departure_airport_id INTEGER REFERENCES airports(id) NOT NULL,
    arrival_airport_id INTEGER REFERENCES airports(id) NOT NULL,
    distance_km INTEGER NOT NULL,
    estimated_duration VARCHAR(10) NOT NULL, -- formato HH:MM
    default_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_different_airports CHECK (departure_airport_id != arrival_airport_id),
    CONSTRAINT check_positive_distance CHECK (distance_km > 0),
    CONSTRAINT check_positive_price CHECK (default_price >= 0),
    UNIQUE(departure_airport_id, arrival_airport_id)
);

-- 2. Creare la tabella route_pricing per gestire prezzi per classe
CREATE TABLE IF NOT EXISTS route_pricing (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
    seat_class VARCHAR(20) NOT NULL CHECK (seat_class IN ('economy', 'business', 'first')),
    base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(route_id, seat_class)
);

-- 3. Aggiungere colonna route_id alla tabella flights (se non esiste)
ALTER TABLE flights ADD COLUMN IF NOT EXISTS route_id INTEGER REFERENCES routes(id);

-- 4. Aggiungere colonna seat_class alla tabella flights (se non esiste)
ALTER TABLE flights ADD COLUMN IF NOT EXISTS seat_class VARCHAR(20) DEFAULT 'economy' CHECK (seat_class IN ('economy', 'business', 'first'));

-- 5. Inserire dati di test per le rotte
INSERT INTO routes (route_name, departure_airport_id, arrival_airport_id, distance_km, estimated_duration, default_price, status) VALUES
('Roma-Milano', 1, 2, 580, '01:30', 89.99, 'active'),
('Milano-Roma', 2, 1, 580, '01:30', 94.99, 'active'),
('Roma-Londra', 1, 3, 1435, '02:30', 159.99, 'active'),
('Roma-Parigi', 1, 4, 1105, '02:10', 139.99, 'active'),
('Milano-Barcelona', 2, 5, 725, '01:30', 79.99, 'active'),
('Milano-Amsterdam', 2, 6, 840, '01:20', 119.99, 'active'),
('Roma-Barcelona', 1, 5, 860, '02:15', 169.99, 'active'),
('Londra-Roma', 3, 1, 1435, '04:30', 149.99, 'active')
ON CONFLICT (departure_airport_id, arrival_airport_id) DO NOTHING;

-- 6. Inserire prezzi per classe per le rotte
INSERT INTO route_pricing (route_id, seat_class, base_price) VALUES
-- Roma-Milano (route_id = 1)
(1, 'economy', 89.99),
(1, 'business', 189.99),
-- Milano-Roma (route_id = 2)
(2, 'economy', 94.99),
(2, 'business', 199.99),
-- Roma-Londra (route_id = 3)
(3, 'economy', 159.99),
(3, 'business', 359.99),
(3, 'first', 699.99),
-- Roma-Parigi (route_id = 4)
(4, 'economy', 139.99),
(4, 'business', 319.99),
-- Milano-Barcelona (route_id = 5)
(5, 'economy', 79.99),
(5, 'business', 169.99),
-- Milano-Amsterdam (route_id = 6)
(6, 'economy', 119.99),
(6, 'business', 259.99),
-- Roma-Barcelona (route_id = 7)
(7, 'economy', 169.99),
(7, 'business', 379.99),
-- Londra-Roma (route_id = 8)
(8, 'economy', 149.99),
(8, 'business', 349.99),
(8, 'first', 719.99)
ON CONFLICT (route_id, seat_class) DO NOTHING;

-- 7. Aggiornare i voli esistenti per collegarli alle rotte (opzionale)
UPDATE flights SET route_id = 1 WHERE departure_airport_id = 1 AND arrival_airport_id = 2;
UPDATE flights SET route_id = 2 WHERE departure_airport_id = 2 AND arrival_airport_id = 1;
UPDATE flights SET route_id = 3 WHERE departure_airport_id = 1 AND arrival_airport_id = 3;
UPDATE flights SET route_id = 4 WHERE departure_airport_id = 1 AND arrival_airport_id = 4;
UPDATE flights SET route_id = 5 WHERE departure_airport_id = 2 AND arrival_airport_id = 5;
UPDATE flights SET route_id = 6 WHERE departure_airport_id = 2 AND arrival_airport_id = 6;
UPDATE flights SET route_id = 7 WHERE departure_airport_id = 1 AND arrival_airport_id = 5;
UPDATE flights SET route_id = 8 WHERE departure_airport_id = 3 AND arrival_airport_id = 1;

-- 8. Creare indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_routes_departure_airport ON routes(departure_airport_id);
CREATE INDEX IF NOT EXISTS idx_routes_arrival_airport ON routes(arrival_airport_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_route_pricing_route_id ON route_pricing(route_id);
CREATE INDEX IF NOT EXISTS idx_route_pricing_class ON route_pricing(seat_class);
CREATE INDEX IF NOT EXISTS idx_flights_route_id ON flights(route_id);
CREATE INDEX IF NOT EXISTS idx_flights_seat_class ON flights(seat_class);

-- 9. Creare una view per facilitare le query
CREATE OR REPLACE VIEW route_pricing_view AS
SELECT 
    r.id as route_id,
    r.route_name,
    r.departure_airport_id,
    r.arrival_airport_id,
    dep.name as departure_airport,
    dep.iata_code as departure_code,
    dep.city as departure_city,
    arr.name as arrival_airport,
    arr.iata_code as arrival_code,
    arr.city as arrival_city,
    rp.seat_class,
    rp.base_price,
    r.distance_km,
    r.estimated_duration,
    r.status
FROM routes r
LEFT JOIN route_pricing rp ON r.id = rp.route_id
LEFT JOIN airports dep ON r.departure_airport_id = dep.id
LEFT JOIN airports arr ON r.arrival_airport_id = arr.id
ORDER BY r.id, 
    CASE rp.seat_class 
        WHEN 'economy' THEN 1 
        WHEN 'business' THEN 2 
        WHEN 'first' THEN 3 
    END;

-- 10. Query di verifica (opzionale - per testare)
SELECT 'Rotte create:', COUNT(*) FROM routes;
SELECT 'Prezzi per classe creati:', COUNT(*) FROM route_pricing;

-- Mostra le rotte con tutti i prezzi
SELECT 
    r.route_name,
    dep.iata_code || '-' || arr.iata_code as route_code,
    r.distance_km || ' km' as distance,
    r.estimated_duration,
    string_agg(rp.seat_class || ': €' || rp.base_price, ', ' ORDER BY 
        CASE rp.seat_class 
            WHEN 'economy' THEN 1 
            WHEN 'business' THEN 2 
            WHEN 'first' THEN 3 
        END
    ) as pricing
FROM routes r
LEFT JOIN airports dep ON r.departure_airport_id = dep.id
LEFT JOIN airports arr ON r.arrival_airport_id = arr.id
LEFT JOIN route_pricing rp ON r.id = rp.route_id
GROUP BY r.id, r.route_name, dep.iata_code, arr.iata_code, r.distance_km, r.estimated_duration
ORDER BY r.route_name;
