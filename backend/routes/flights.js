const express = require('express');
const router = express.Router();
const { Client } = require('pg');

// Funzione per creare una nuova connessione al database
const createDbClient = () => {
  return new Client({
    connectionString: process.env.DATABASE_URL
  });
};

// Visualizza tutti i voli
router.get('/', async (req, res) => {
  const client = createDbClient();
  try {
    await client.connect();
    const query = `
      SELECT 
        f.id,
        f.flight_number,
        f.departure_time,
        f.arrival_time,
        f.price,
        f.available_seats,
        f.total_seats,
        f.status,
        dep_airport.name as departure_airport,
        dep_airport.iata_code as departure_iata,
        dep_airport.city as departure_city,
        arr_airport.name as arrival_airport,
        arr_airport.iata_code as arrival_iata,
        arr_airport.city as arrival_city,
        airlines.name as airline_name,
        airlines.iata_code as airline_iata
      FROM flights f
      JOIN airports dep_airport ON f.departure_airport_id = dep_airport.id
      JOIN airports arr_airport ON f.arrival_airport_id = arr_airport.id
      LEFT JOIN airlines ON f.airline_id = airlines.id
      ORDER BY f.departure_time
    `;
    
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Errore nel recupero dei voli:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  } finally {
    await client.end();
  }
});

// Cerca voli per data e aeroporti
router.get('/search', async (req, res) => {
  const client = createDbClient();
  try {
    await client.connect();
    const { date, departure_airport, arrival_airport } = req.query;
    
    if (!date || !departure_airport || !arrival_airport) {
      return res.status(400).json({ 
        error: 'Parametri obbligatori: date, departure_airport, arrival_airportadawd',
        esempio: '/api/flights/search?date=2025-12-01&departure_airport=FCO&arrival_airport=MXP'
      });
    }

    const query = `
      SELECT 
        f.id,
        f.flight_number,
        f.departure_time,
        f.arrival_time,
        f.price,
        f.available_seats,
        f.total_seats,
        f.status,
        dep_airport.name as departure_airport,
        dep_airport.iata_code as departure_iata,
        dep_airport.city as departure_city,
        arr_airport.name as arrival_airport,
        arr_airport.iata_code as arrival_iata,
        arr_airport.city as arrival_city,
        airlines.name as airline_name,
        airlines.iata_code as airline_iata,
        aircrafts.aircraft_type,
        aircrafts.manufacturer,
        aircrafts.model
      FROM flights f
      JOIN airports dep_airport ON f.departure_airport_id = dep_airport.id
      JOIN airports arr_airport ON f.arrival_airport_id = arr_airport.id
      LEFT JOIN airlines ON f.airline_id = airlines.id
      LEFT JOIN aircrafts ON f.aircraft_id = aircrafts.id
      WHERE 
        DATE(f.departure_time) = $1
        AND (dep_airport.iata_code = $2 OR dep_airport.city ILIKE $2 OR dep_airport.name ILIKE $2)
        AND (arr_airport.iata_code = $3 OR arr_airport.city ILIKE $3 OR arr_airport.name ILIKE $3)
        AND f.status = 'scheduled'
        AND f.available_seats > 0
      ORDER BY f.departure_time
    `;

    const values = [
      date,
      departure_airport.toUpperCase(),
      arrival_airport.toUpperCase()
    ];

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.json({ 
        message: 'Nessun volo trovato per i criteri specificati',
        flights: [] 
      });
    }

    res.json({
      message: `Trovati ${result.rows.length} voli`,
      flights: result.rows
    });

  } catch (err) {
    console.error('Errore nella ricerca voli:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  } finally {
    await client.end();
  }
});


// Aggiungi nuovo volo
router.post('/', async (req, res) => {
  const client = createDbClient();
  try {
    await client.connect();
    const {
      flight_number,
      airline_id,
      aircraft_id,
      departure_airport_id,
      arrival_airport_id,
      departure_time,
      arrival_time,
      price,
      total_seats,
      available_seats
    } = req.body;

    const query = `
      INSERT INTO flights (
        flight_number, airline_id, aircraft_id, departure_airport_id, 
        arrival_airport_id, departure_time, arrival_time, price, 
        total_seats, available_seats
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      flight_number, airline_id, aircraft_id, departure_airport_id,
      arrival_airport_id, departure_time, arrival_time, price,
      total_seats, available_seats || total_seats
    ];
    
    const result = await client.query(query, values);
    res.status(201).json({ 
      message: 'Volo aggiunto con successo', 
      volo: result.rows[0] 
    });
  } catch (err) {
    console.error('Errore nell\'aggiunta del volo:', err);
    if (err.code === '23505') { // Violazione di vincolo unico
      res.status(400).json({ error: 'Numero di volo già esistente' });
    } else {
      res.status(500).json({ error: 'Errore interno del server' });
    }
  } finally {
    await client.end();
  }
});

module.exports = router;

