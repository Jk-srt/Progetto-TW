-- Aggiungi airline_id alla tabella routes
ALTER TABLE routes ADD COLUMN airline_id INTEGER;

-- Aggiungi la foreign key constraint
ALTER TABLE routes ADD CONSTRAINT fk_routes_airline 
FOREIGN KEY (airline_id) REFERENCES airlines(id);

-- Aggiorna le rotte esistenti con una compagnia aerea di default
-- (modifica questo valore in base alle tue esigenze)
UPDATE routes SET airline_id = 1 WHERE airline_id IS NULL;

-- Rendi la colonna NOT NULL
ALTER TABLE routes ALTER COLUMN airline_id SET NOT NULL;

-- Verifica il risultato
SELECT r.*, a.name as airline_name 
FROM routes r 
LEFT JOIN airlines a ON r.airline_id = a.id 
LIMIT 5;
