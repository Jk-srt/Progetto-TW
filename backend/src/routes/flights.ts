import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Route per cercare voli con filtri
router.get('/search', async (req, res) => {
  try {
    const { departure_city, arrival_city, departure_date, return_date, passengers } = req.query;
    
    let query = `
      SELECT 
        f.id,
        f.flight_number,
        f.departure_time,
        f.arrival_time,
        f.price,
        f.total_seats,
        f.available_seats,
        f.status,
        dep_airport.name as departure_airport,
        dep_airport.iata_code as departure_code,
        dep_airport.city as departure_city,
        arr_airport.name as arrival_airport,
        arr_airport.iata_code as arrival_code,
        arr_airport.city as arrival_city,
        airlines.name as airline_name,
        airlines.iata_code as airline_code
      FROM flights f
      LEFT JOIN airports dep_airport ON f.departure_airport_id = dep_airport.id
      LEFT JOIN airports arr_airport ON f.arrival_airport_id = arr_airport.id
      LEFT JOIN airlines ON f.airline_id = airlines.id
      WHERE f.status = 'active'
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (departure_city) {
      query += ` AND dep_airport.city ILIKE $${paramIndex}`;
      params.push(`%${departure_city}%`);
      paramIndex++;
    }
    
    if (arrival_city) {
      query += ` AND arr_airport.city ILIKE $${paramIndex}`;
      params.push(`%${arrival_city}%`);
      paramIndex++;
    }
    
    if (departure_date) {
      query += ` AND DATE(f.departure_time) = $${paramIndex}`;
      params.push(departure_date);
      paramIndex++;
    }
    
    if (passengers) {
      query += ` AND f.available_seats >= $${paramIndex}`;
      params.push(parseInt(passengers as string));
      paramIndex++;
    }
    
    query += ` ORDER BY f.departure_time ASC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error searching flights:', err);
    res.status(500).json({ error: 'Errore nella ricerca dei voli' });
  }
});

// Route per ottenere statistiche voli
router.get('/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_flights,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_flights,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_flights,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_flights,
        AVG(price) as average_price,
        SUM(total_seats - available_seats) as total_bookings
      FROM flights
    `;
    
    const result = await pool.query(statsQuery);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching flight stats:', err);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
});

// Visualizza tutti i voli con informazioni dettagliate
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        f.id,
        f.flight_number,
        f.departure_time,
        f.arrival_time,
        f.price,
        f.total_seats,
        f.available_seats,
        f.status,
        f.created_at,
        f.updated_at,
        dep_airport.name as departure_airport,
        dep_airport.iata_code as departure_code,
        dep_airport.city as departure_city,
        arr_airport.name as arrival_airport,
        arr_airport.iata_code as arrival_code,
        arr_airport.city as arrival_city,
        airlines.name as airline_name,
        airlines.iata_code as airline_code,
        aircrafts.registration as aircraft_registration,
        aircrafts.aircraft_type,
        aircrafts.model as aircraft_model
      FROM flights f
      LEFT JOIN airports dep_airport ON f.departure_airport_id = dep_airport.id
      LEFT JOIN airports arr_airport ON f.arrival_airport_id = arr_airport.id
      LEFT JOIN airlines ON f.airline_id = airlines.id
      LEFT JOIN aircrafts ON f.aircraft_id = aircrafts.id
      ORDER BY f.departure_time ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching flights:', err);
    res.status(500).json({ error: 'Errore nel recupero dei voli' });
  }
});

// Ottieni elenco aeroporti per i dropdown
router.get('/data/airports', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, iata_code, city, country FROM airports ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching airports:', err);
    res.status(500).json({ error: 'Errore nel recupero degli aeroporti' });
  }
});

// Ottieni elenco compagnie aeree per i dropdown
router.get('/data/airlines', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, iata_code FROM airlines WHERE active = true ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching airlines:', err);
    res.status(500).json({ error: 'Errore nel recupero delle compagnie aeree' });
  }
});

// Ottieni elenco aerei per i dropdown
router.get('/data/aircrafts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id, 
        a.registration, 
        a.aircraft_type, 
        a.model,
        a.seat_capacity,
        al.name as airline_name
      FROM aircrafts a
      LEFT JOIN airlines al ON a.airline_id = al.id
      WHERE a.status = 'active'
      ORDER BY a.registration
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching aircrafts:', err);
    res.status(500).json({ error: 'Errore nel recupero degli aerei' });
  }
});

// Visualizza singolo volo per ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        f.id,
        f.flight_number,
        f.airline_id,
        f.aircraft_id,
        f.departure_airport_id,
        f.arrival_airport_id,
        f.departure_time,
        f.arrival_time,
        f.price,
        f.total_seats,
        f.available_seats,
        f.status,
        dep_airport.name as departure_airport,
        dep_airport.iata_code as departure_code,
        arr_airport.name as arrival_airport,
        arr_airport.iata_code as arrival_code,
        airlines.name as airline_name,
        aircrafts.registration as aircraft_registration
      FROM flights f
      LEFT JOIN airports dep_airport ON f.departure_airport_id = dep_airport.id
      LEFT JOIN airports arr_airport ON f.arrival_airport_id = arr_airport.id
      LEFT JOIN airlines ON f.airline_id = airlines.id
      LEFT JOIN aircrafts ON f.aircraft_id = aircrafts.id
      WHERE f.id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Volo non trovato' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching flight:', err);
    res.status(500).json({ error: 'Errore nel recupero del volo' });
  }
});

// Aggiungi nuovo volo
router.post('/', async (req, res) => {
  try {
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
      available_seats,
      status = 'scheduled'
    } = req.body;

    const query = `
      INSERT INTO flights (
        flight_number, airline_id, aircraft_id, departure_airport_id, 
        arrival_airport_id, departure_time, arrival_time, price, 
        total_seats, available_seats, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      flight_number, airline_id, aircraft_id, departure_airport_id,
      arrival_airport_id, departure_time, arrival_time, price,
      total_seats, available_seats, status
    ];
    
    const result = await pool.query(query, values);
    res.status(201).json({ 
      message: 'Volo aggiunto con successo', 
      flight: result.rows[0] 
    });
  } catch (err: any) {
    console.error('Error creating flight:', err);
    if (err.code === '23505') { // Violazione vincolo univoco
      res.status(400).json({ error: 'Numero volo già esistente' });
    } else {
      res.status(400).json({ error: 'Errore nella creazione del volo' });
    }
  }
});

// Aggiorna volo esistente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
      available_seats,
      status
    } = req.body;

    const query = `
      UPDATE flights SET 
        flight_number = $1,
        airline_id = $2,
        aircraft_id = $3,
        departure_airport_id = $4,
        arrival_airport_id = $5,
        departure_time = $6,
        arrival_time = $7,
        price = $8,
        total_seats = $9,
        available_seats = $10,
        status = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `;
    
    const values = [
      flight_number, airline_id, aircraft_id, departure_airport_id,
      arrival_airport_id, departure_time, arrival_time, price,
      total_seats, available_seats, status, id
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Volo non trovato' });
    }
    
    res.json({ 
      message: 'Volo aggiornato con successo', 
      flight: result.rows[0] 
    });
  } catch (err) {
    console.error('Error updating flight:', err);
    res.status(400).json({ error: 'Errore nell\'aggiornamento del volo' });
  }
});

// Elimina volo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Controlla se ci sono prenotazioni associate
    const bookingsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM bookings WHERE flight_id = $1',
      [id]
    );
    
    if (parseInt(bookingsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Impossibile eliminare il volo: esistono prenotazioni associate' 
      });
    }
    
    const result = await pool.query('DELETE FROM flights WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Volo non trovato' });
    }
    
    res.json({ 
      message: 'Volo eliminato con successo', 
      flight: result.rows[0] 
    });
  } catch (err) {
    console.error('Error deleting flight:', err);
    res.status(500).json({ error: 'Errore nell\'eliminazione del volo' });
  }
});

export default router;
