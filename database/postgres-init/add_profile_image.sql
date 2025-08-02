-- Aggiunta campo profile_image_url alla tabella accesso
ALTER TABLE accesso ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);

-- Aggiorna il commento della tabella
COMMENT ON COLUMN accesso.profile_image_url IS 'URL dell''immagine profilo dell''utente';
