-- Estensione per gestire prezzi per classe nelle rotte

-- Tabella per i prezzi per classe delle rotte
CREATE TABLE IF NOT EXISTS route_pricing (
    id SERIAL PRIMARY KEY,
    route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
    seat_class VARCHAR(20) NOT NULL CHECK (seat_class IN ('economy', 'business', 'first')),
    base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(route_id, seat_class)
);

-- Aggiorna la tabella flights per includere la classe
ALTER TABLE flights ADD COLUMN IF NOT EXISTS seat_class VARCHAR(20) DEFAULT 'economy' CHECK (seat_class IN ('economy', 'business', 'first'));

-- Inserimento dati di test per i prezzi delle classi
INSERT INTO route_pricing (route_id, seat_class, base_price) VALUES
-- Roma-Milano
(1, 'economy', 89.99),
(1, 'business', 189.99),
-- Milano-Roma  
(2, 'economy', 94.99),
(2, 'business', 199.99),
-- Roma-Londra
(3, 'economy', 159.99),
(3, 'business', 359.99),
(3, 'first', 699.99),
-- Roma-Parigi
(4, 'economy', 139.99),
(4, 'business', 319.99),
-- Milano-Barcelona
(5, 'economy', 79.99),
(5, 'business', 169.99),
-- Milano-Amsterdam
(6, 'economy', 119.99),
(6, 'business', 259.99),
-- Roma-Barcelona
(7, 'economy', 169.99),
(7, 'business', 379.99),
-- Londra-Roma
(8, 'economy', 149.99),
(8, 'business', 349.99),
(8, 'first', 719.99);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_route_pricing_route_id ON route_pricing(route_id);
CREATE INDEX IF NOT EXISTS idx_route_pricing_class ON route_pricing(seat_class);
CREATE INDEX IF NOT EXISTS idx_flights_seat_class ON flights(seat_class);

-- View per facilità di query
CREATE OR REPLACE VIEW route_pricing_view AS
SELECT 
    r.id as route_id,
    r.route_name,
    r.departure_airport_id,
    r.arrival_airport_id,
    dep.name as departure_airport,
    dep.iata_code as departure_code,
    arr.name as arrival_airport,
    arr.iata_code as arrival_code,
    rp.seat_class,
    rp.base_price,
    r.distance_km,
    r.estimated_duration,
    r.status
FROM routes r
LEFT JOIN route_pricing rp ON r.id = rp.route_id
LEFT JOIN airports dep ON r.departure_airport_id = dep.id
LEFT JOIN airports arr ON r.arrival_airport_id = arr.id
ORDER BY r.id, rp.seat_class;
