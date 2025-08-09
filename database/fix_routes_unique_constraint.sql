-- Fix del vincolo UNIQUE per permettere la stessa rotta a compagnie aeree diverse
-- Problema: il vincolo UNIQUE(departure_airport_id, arrival_airport_id) impedisce a più compagnie
-- di avere la stessa rotta (es. Roma-Parigi)

-- Rimuovi il vecchio vincolo UNIQUE che non considera la compagnia aerea
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_departure_airport_id_arrival_airport_id_key;

-- Aggiungi nuovo vincolo UNIQUE che include la compagnia aerea
-- Ora la stessa rotta può essere utilizzata da compagnie diverse, ma una singola compagnia
-- non può avere duplicati della stessa rotta
ALTER TABLE routes ADD CONSTRAINT routes_airline_departure_arrival_unique 
    UNIQUE(airline_id, departure_airport_id, arrival_airport_id);

-- Verifica le rotte esistenti
SELECT 
    r.id,
    r.route_name,
    a.name as airline_name,
    dep.city as departure_city,
    arr.city as arrival_city
FROM routes r
JOIN airlines a ON r.airline_id = a.id
JOIN airports dep ON r.departure_airport_id = dep.id
JOIN airports arr ON r.arrival_airport_id = arr.id
ORDER BY dep.city, arr.city, a.name;
