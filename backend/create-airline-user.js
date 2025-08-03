const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createAirlineUser() {
  try {
    const query = `
      INSERT INTO accesso (email, password_hash, role, airline_id) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        airline_id = EXCLUDED.airline_id;
    `;
    
    const result = await pool.query(query, [
      'airline@example.com',
      '$2b$10$gMnIB7lBD43X230AluVog.DpVqutMb8RPDzDC5Co33u3m7WT24B0e',
      'airline',
      1 // Altair airline ID
    ]);
    
    console.log('Utente airline creato/aggiornato con successo!');
    console.log('Email: airline@example.com');
    console.log('Password: airline123');
    console.log('Role: airline');
    console.log('Airline ID: 1 (Altair)');
    
  } catch (error) {
    console.error('Errore nella creazione dell\'utente:', error);
  } finally {
    await pool.end();
  }
}

createAirlineUser();
