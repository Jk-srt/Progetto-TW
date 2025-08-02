import express from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

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
        r.default_price,
        r.status,
        r.created_at,
        r.updated_at,
        r.airline_id,
        dep_airport.name as departure_airport,
        dep_airport.iata_code as departure_code,
        dep_airport.city as departure_city,
        arr_airport.name as arrival_airport,
        arr_airport.iata_code as arrival_code,
        arr_airport.city as arrival_city,
        airlines.name as airline_name,
        airlines.iata_code as airline_code
      FROM routes r
      LEFT JOIN airports dep_airport ON r.departure_airport_id = dep_airport.id
      LEFT JOIN airports arr_airport ON r.arrival_airport_id = arr_airport.id
      LEFT JOIN airlines ON r.airline_id = airlines.id
      ORDER BY r.route_name ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching routes:', err);
    res.status(500).json({ error: 'Errore nel recupero delle rotte' });
  }
});

// Visualizza tutte le rotte di una specifica compagnia aerea
router.get('/airline/:airlineId', async (req, res) => {
  try {
    const { airlineId } = req.params;
    const query = `
      SELECT 
        r.id,
        r.route_name,
        r.distance_km,
        r.estimated_duration,
        r.default_price,
        r.status,
        r.created_at,
        r.updated_at,
        r.airline_id,
        dep_airport.name as departure_airport,
        dep_airport.iata_code as departure_code,
        dep_airport.city as departure_city,
        arr_airport.name as arrival_airport,
        arr_airport.iata_code as arrival_code,
        arr_airport.city as arrival_city,
        airlines.name as airline_name,
        airlines.iata_code as airline_code
      FROM routes r
      LEFT JOIN airports dep_airport ON r.departure_airport_id = dep_airport.id
      LEFT JOIN airports arr_airport ON r.arrival_airport_id = arr_airport.id
      LEFT JOIN airlines ON r.airline_id = airlines.id
      WHERE r.airline_id = $1
      ORDER BY r.route_name ASC
    `;
    const result = await pool.query(query, [airlineId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nessuna rotta trovata per questa compagnia aerea' });
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching routes by airline:', err);
    res.status(500).json({ error: 'Errore nel recupero delle rotte della compagnia' });
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
        r.default_price,
        r.status,
        r.created_at,
        r.updated_at,
        r.airline_id,
        dep_airport.name as departure_airport,
        dep_airport.iata_code as departure_code,
        dep_airport.city as departure_city,
        arr_airport.name as arrival_airport,
        arr_airport.iata_code as arrival_code,
        arr_airport.city as arrival_city,
        airlines.name as airline_name,
        airlines.iata_code as airline_code
      FROM routes r
      LEFT JOIN airports dep_airport ON r.departure_airport_id = dep_airport.id
      LEFT JOIN airports arr_airport ON r.arrival_airport_id = arr_airport.id
      LEFT JOIN airlines ON r.airline_id = airlines.id
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

// JWT secret for auth
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
// Aggiungi nuova rotta (autenticazione richiesta)
router.post('/', async (req, res) => {
  // Autenticazione e autorizzazione
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  let payload: any;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.sendStatus(403);
  }
  // Solo admin o airline possono creare rotte
  if (!['admin', 'airline'].includes(payload.role)) {
    return res.status(403).json({ error: 'Accesso negato: ruolo non autorizzato' });
  }
  try {
    const {
      route_name,
      departure_airport_id,
      arrival_airport_id,
      airline_id,
      distance_km,
      estimated_duration,
      default_price = 0,
      status = 'active'
    } = req.body;

    // Validazione campi obbligatori
    if (!route_name || !departure_airport_id || !arrival_airport_id || !airline_id) {
      return res.status(400).json({ error: 'Nome rotta, aeroporti di partenza e arrivo, e compagnia aerea sono obbligatori' });
    }

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

    // Verifica che la compagnia aerea esista
    const airlineCheck = await pool.query('SELECT id FROM airlines WHERE id = $1', [airline_id]);
    if (airlineCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Compagnia aerea non esistente' });
    }

    const query = `
      INSERT INTO routes (
        route_name, departure_airport_id, arrival_airport_id, airline_id,
        distance_km, estimated_duration, default_price, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      route_name, departure_airport_id, arrival_airport_id, airline_id,
      distance_km, estimated_duration, default_price, status
    ];
    
    const result = await pool.query(query, values);
    res.status(201).json({ 
      message: 'Rotta aggiunta con successo', 
      route: result.rows[0] 
    });
  } catch (err: any) {
    console.error('Error creating route:', err);
    if (err.code === '23505') { // Violazione vincolo univoco
      if (err.constraint === 'routes_departure_airport_id_arrival_airport_id_key') {
        res.status(400).json({ 
          error: 'Rotta già esistente tra questi aeroporti',
          detail: 'Esiste già una rotta tra l\'aeroporto di partenza e quello di arrivo selezionati'
        });
      } else {
        res.status(400).json({ error: 'Rotta già esistente' });
      }
    } else {
      res.status(400).json({ error: 'Errore nella creazione della rotta' });
    }
  }
});

// Aggiorna rotta esistente
router.put('/:id', async (req, res) => {
  try {
    // Autenticazione e autorizzazione
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    let payload: any;
    try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.sendStatus(403); }
    if (!['admin', 'airline'].includes(payload.role)) {
      return res.status(403).json({ error: 'Accesso negato: ruolo non autorizzato' });
    }
    const { id } = req.params;
    const {
      route_name,
      departure_airport_id,
      arrival_airport_id,
      airline_id,
      distance_km,
      estimated_duration,
      default_price,
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

    // Verifica che la compagnia aerea esista se è stata fornita
    if (airline_id) {
      const airlineCheck = await pool.query('SELECT id FROM airlines WHERE id = $1', [airline_id]);
      if (airlineCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Compagnia aerea non esistente' });
      }
    }

    const query = `
      UPDATE routes SET 
        route_name = $1,
        departure_airport_id = $2,
        arrival_airport_id = $3,
        airline_id = $4,
        distance_km = $5,
        estimated_duration = $6,
        default_price = $7,
        status = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;
    
    const values = [
      route_name, departure_airport_id, arrival_airport_id, airline_id,
      distance_km, estimated_duration, default_price, status, id
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
    // Autenticazione e autorizzazione
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    let payload: any;
    try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.sendStatus(403); }
    if (!['admin', 'airline'].includes(payload.role)) {
      return res.status(403).json({ error: 'Accesso negato: ruolo non autorizzato' });
    }
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
        airlines.name as airline_name,
        airlines.iata_code as airline_code,
        COUNT(f.id) as flight_count
      FROM routes r
      LEFT JOIN airports dep_airport ON r.departure_airport_id = dep_airport.id
      LEFT JOIN airports arr_airport ON r.arrival_airport_id = arr_airport.id
      LEFT JOIN airlines ON r.airline_id = airlines.id
      LEFT JOIN flights f ON f.departure_airport_id = r.departure_airport_id 
        AND f.arrival_airport_id = r.arrival_airport_id
      WHERE r.status = 'active'
      GROUP BY r.id, r.route_name, dep_airport.name, dep_airport.iata_code, 
               arr_airport.name, arr_airport.iata_code, airlines.name, airlines.iata_code
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
