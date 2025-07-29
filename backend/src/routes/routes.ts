import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Visualizza tutte le rotte
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id,
        r.route_name,
        r.distance_km,
        r.estimated_duration,
        r.status,
        r.created_at,
        r.updated_at,
        dep_airport.name as departure_airport,
        dep_airport.iata_code as departure_code,
        dep_airport.city as departure_city,
        arr_airport.name as arrival_airport,
        arr_airport.iata_code as arrival_code,
        arr_airport.city as arrival_city
      FROM routes r
      LEFT JOIN airports dep_airport ON r.departure_airport_id = dep_airport.id
      LEFT JOIN airports arr_airport ON r.arrival_airport_id = arr_airport.id
      ORDER BY r.route_name ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching routes:', err);
    res.status(500).json({ error: 'Errore nel recupero delle rotte' });
  }
});

// Visualizza singola rotta per ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        r.id,
        r.route_name,
        r.departure_airport_id,
        r.arrival_airport_id,
        r.distance_km,
        r.estimated_duration,
        r.status,
        r.created_at,
        r.updated_at,
        dep_airport.name as departure_airport,
        dep_airport.iata_code as departure_code,
        dep_airport.city as departure_city,
        arr_airport.name as arrival_airport,
        arr_airport.iata_code as arrival_code,
        arr_airport.city as arrival_city
      FROM routes r
      LEFT JOIN airports dep_airport ON r.departure_airport_id = dep_airport.id
      LEFT JOIN airports arr_airport ON r.arrival_airport_id = arr_airport.id
      WHERE r.id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rotta non trovata' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching route:', err);
    res.status(500).json({ error: 'Errore nel recupero della rotta' });
  }
});

// Aggiungi nuova rotta
router.post('/', async (req, res) => {
  try {
    const {
      route_name,
      departure_airport_id,
      arrival_airport_id,
      distance_km,
      estimated_duration,
      status = 'active'
    } = req.body;

    // Verifica che gli aeroporti esistano
    const airportsCheck = await pool.query(
      'SELECT id FROM airports WHERE id IN ($1, $2)',
      [departure_airport_id, arrival_airport_id]
    );
    
    if (airportsCheck.rows.length !== 2) {
      return res.status(400).json({ error: 'Uno o entrambi gli aeroporti non esistono' });
    }

    if (departure_airport_id === arrival_airport_id) {
      return res.status(400).json({ error: 'Aeroporto di partenza e arrivo non possono essere uguali' });
    }

    const query = `
      INSERT INTO routes (
        route_name, departure_airport_id, arrival_airport_id, 
        distance_km, estimated_duration, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      route_name, departure_airport_id, arrival_airport_id,
      distance_km, estimated_duration, status
    ];
    
    const result = await pool.query(query, values);
    res.status(201).json({ 
      message: 'Rotta aggiunta con successo', 
      route: result.rows[0] 
    });
  } catch (err: any) {
    console.error('Error creating route:', err);
    if (err.code === '23505') { // Violazione vincolo univoco
      res.status(400).json({ error: 'Rotta già esistente' });
    } else {
      res.status(400).json({ error: 'Errore nella creazione della rotta' });
    }
  }
});

// Aggiorna rotta esistente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      route_name,
      departure_airport_id,
      arrival_airport_id,
      distance_km,
      estimated_duration,
      status
    } = req.body;

    // Verifica che gli aeroporti esistano se sono stati forniti
    if (departure_airport_id && arrival_airport_id) {
      const airportsCheck = await pool.query(
        'SELECT id FROM airports WHERE id IN ($1, $2)',
        [departure_airport_id, arrival_airport_id]
      );
      
      if (airportsCheck.rows.length !== 2) {
        return res.status(400).json({ error: 'Uno o entrambi gli aeroporti non esistono' });
      }

      if (departure_airport_id === arrival_airport_id) {
        return res.status(400).json({ error: 'Aeroporto di partenza e arrivo non possono essere uguali' });
      }
    }

    const query = `
      UPDATE routes SET 
        route_name = $1,
        departure_airport_id = $2,
        arrival_airport_id = $3,
        distance_km = $4,
        estimated_duration = $5,
        status = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const values = [
      route_name, departure_airport_id, arrival_airport_id,
      distance_km, estimated_duration, status, id
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rotta non trovata' });
    }
    
    res.json({ 
      message: 'Rotta aggiornata con successo', 
      route: result.rows[0] 
    });
  } catch (err) {
    console.error('Error updating route:', err);
    res.status(400).json({ error: 'Errore nell\'aggiornamento della rotta' });
  }
});

// Elimina rotta
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Controlla se ci sono voli che utilizzano questa rotta
    const flightsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM flights WHERE departure_airport_id = (SELECT departure_airport_id FROM routes WHERE id = $1) AND arrival_airport_id = (SELECT arrival_airport_id FROM routes WHERE id = $1)',
      [id]
    );
    
    if (parseInt(flightsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Impossibile eliminare la rotta: esistono voli che la utilizzano' 
      });
    }
    
    const result = await pool.query('DELETE FROM routes WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rotta non trovata' });
    }
    
    res.json({ 
      message: 'Rotta eliminata con successo', 
      route: result.rows[0] 
    });
  } catch (err) {
    console.error('Error deleting route:', err);
    res.status(500).json({ error: 'Errore nell\'eliminazione della rotta' });
  }
});

// Ottieni rotte popolari (con più voli)
router.get('/analytics/popular', async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id,
        r.route_name,
        dep_airport.name as departure_airport,
        dep_airport.iata_code as departure_code,
        arr_airport.name as arrival_airport,
        arr_airport.iata_code as arrival_code,
        COUNT(f.id) as flight_count
      FROM routes r
      LEFT JOIN airports dep_airport ON r.departure_airport_id = dep_airport.id
      LEFT JOIN airports arr_airport ON r.arrival_airport_id = arr_airport.id
      LEFT JOIN flights f ON f.departure_airport_id = r.departure_airport_id 
        AND f.arrival_airport_id = r.arrival_airport_id
      WHERE r.status = 'active'
      GROUP BY r.id, r.route_name, dep_airport.name, dep_airport.iata_code, 
               arr_airport.name, arr_airport.iata_code
      ORDER BY flight_count DESC
      LIMIT 10
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching popular routes:', err);
    res.status(500).json({ error: 'Errore nel recupero delle rotte popolari' });
  }
});

export default router;
