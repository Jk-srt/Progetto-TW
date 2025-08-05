import express from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

interface JWTPayload {
  id: number;
  email: string;
  role: string;
  type: string;
  airlineId?: number;
  airlineName?: string;
  iataCode?: string;
}

// Estendi l'interfaccia Request per includere user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Middleware per verificare il token JWT
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token di accesso richiesto' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Token non valido' });
    }
    req.user = user;
    next();
  });
};

// Middleware per verificare i ruoli
const verifyRole = (roles: string[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permessi insufficienti' });
    }
    next();
  };
};

// Route per cercare voli con filtri
router.get('/search', async (req, res) => {
  try {
    const { departure_city, arrival_city, departure_date, return_date, passengers } = req.query;
    
    let query = `
      SELECT 
        fwa.id,
        fwa.flight_number,
        fwa.departure_time,
        fwa.arrival_time,
        fwa.price as flight_surcharge,
        fwa.total_seats,
        fwa.available_seats,
        fwa.status,
        fwa.departure_airport_name as departure_airport,
        fwa.departure_code,
        fwa.departure_city,
        fwa.arrival_airport_name as arrival_airport,
        fwa.arrival_code,
        fwa.arrival_city,
        airlines.name as airline_name,
        airlines.iata_code as airline_code,
        fwa.route_name,
        fwa.route_id,
        -- Calcola prezzi finali per ogni classe
        COALESCE(rp_economy.base_price, 0) + COALESCE(fwa.price, 0) as economy_price,
        COALESCE(rp_business.base_price, 0) + COALESCE(fwa.price, 0) as business_price,
        CASE 
          WHEN rp_first.base_price IS NULL THEN 0 
          ELSE rp_first.base_price + COALESCE(fwa.price, 0) 
        END as first_price,
        -- Include anche i prezzi base per riferimento
        rp_economy.base_price as economy_base_price,
        rp_business.base_price as business_base_price,
        rp_first.base_price as first_base_price
      FROM flights_with_airports fwa
      LEFT JOIN airlines ON fwa.airline_id = airlines.id
      LEFT JOIN route_pricing rp_economy ON fwa.route_id = rp_economy.route_id AND rp_economy.seat_class = 'economy'
      LEFT JOIN route_pricing rp_business ON fwa.route_id = rp_business.route_id AND rp_business.seat_class = 'business'  
      LEFT JOIN route_pricing rp_first ON fwa.route_id = rp_first.route_id AND rp_first.seat_class = 'first'
      WHERE fwa.status = 'scheduled'
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (departure_city) {
      query += ` AND fwa.departure_city ILIKE $${paramIndex}`;
      params.push(`%${departure_city}%`);
      paramIndex++;
    }
    
    if (arrival_city) {
      query += ` AND fwa.arrival_city ILIKE $${paramIndex}`;
      params.push(`%${arrival_city}%`);
      paramIndex++;
    }
    
    if (departure_date) {
      query += ` AND DATE(fwa.departure_time) = $${paramIndex}`;
      params.push(departure_date);
      paramIndex++;
    }
    
    if (passengers) {
      query += ` AND fwa.available_seats >= $${paramIndex}`;
      params.push(parseInt(passengers as string));
      paramIndex++;
    }
    
    query += ` ORDER BY fwa.departure_time ASC`;
    
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
        fwa.id,
        fwa.flight_number,
        fwa.airline_id,
        fwa.aircraft_id,
        fwa.route_id,
        fwa.departure_time,
        fwa.arrival_time,
        fwa.price as flight_surcharge,
        fwa.total_seats,
        fwa.available_seats,
        fwa.status,
        fwa.created_at,
        fwa.updated_at,
        fwa.departure_airport_name as departure_airport,
        fwa.departure_code,
        fwa.departure_city,
        fwa.arrival_airport_name as arrival_airport,
        fwa.arrival_code,
        fwa.arrival_city,
        fwa.route_name,
        fwa.distance_km,
        fwa.route_duration,
        airlines.name as airline_name,
        airlines.iata_code as airline_code,
        aircrafts.registration as aircraft_registration,
        aircrafts.aircraft_type,
        aircrafts.model as aircraft_model,
        -- Calcola prezzi finali per ogni classe
        COALESCE(rp_economy.base_price, 0) + COALESCE(fwa.price, 0) as economy_price,
        COALESCE(rp_business.base_price, 0) + COALESCE(fwa.price, 0) as business_price,
        CASE 
          WHEN rp_first.base_price IS NULL THEN 0 
          ELSE rp_first.base_price + COALESCE(fwa.price, 0) 
        END as first_price,
        -- Include anche i prezzi base per riferimento
        rp_economy.base_price as economy_base_price,
        rp_business.base_price as business_base_price,
        rp_first.base_price as first_base_price
      FROM flights_with_airports fwa
      LEFT JOIN airlines ON fwa.airline_id = airlines.id
      LEFT JOIN aircrafts ON fwa.aircraft_id = aircrafts.id
      LEFT JOIN route_pricing rp_economy ON fwa.route_id = rp_economy.route_id AND rp_economy.seat_class = 'economy'
      LEFT JOIN route_pricing rp_business ON fwa.route_id = rp_business.route_id AND rp_business.seat_class = 'business'  
      LEFT JOIN route_pricing rp_first ON fwa.route_id = rp_first.route_id AND rp_first.seat_class = 'first'
      ORDER BY fwa.departure_time ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching flights:', err);
    res.status(500).json({ error: 'Errore nel recupero dei voli' });
  }
});

// Ottieni elenco rotte per i dropdown
router.get('/data/routes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id, 
        r.route_name,
        r.departure_airport_id,
        r.arrival_airport_id,
        r.distance_km,
        r.estimated_duration,
        r.default_price,
        dep.name as departure_airport_name,
        dep.iata_code as departure_code,
        dep.city as departure_city,
        arr.name as arrival_airport_name,
        arr.iata_code as arrival_code,
        arr.city as arrival_city
      FROM routes r
      JOIN airports dep ON r.departure_airport_id = dep.id
      JOIN airports arr ON r.arrival_airport_id = arr.id
      WHERE r.status = 'active'
      ORDER BY r.route_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching routes:', err);
    res.status(500).json({ error: 'Errore nel recupero delle rotte' });
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

// Aggiungi nuovo volo (solo admin e compagnie aeree)
router.post('/', authenticateToken, verifyRole(['admin', 'airline']), async (req, res) => {
  try {
    const {
      flight_number,
      airline_id,
      aircraft_id,
      route_id,
      departure_time,
      arrival_time,
      price,
      total_seats,
      available_seats,
      status = 'scheduled'
    } = req.body;

    // Validazione campi obbligatori
    if (!flight_number || !airline_id || !aircraft_id || !route_id || 
        !departure_time || !arrival_time || !price || 
        !total_seats || available_seats === undefined) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    // Per le compagnie aeree, verifica che stiano creando voli solo per la loro compagnia
    if (req.user!.role === 'airline' && req.user!.airlineId && 
        parseInt(airline_id) !== req.user!.airlineId) {
      return res.status(403).json({ error: 'Non puoi creare voli per altre compagnie' });
    }

    // Verifica che la rotta esista
    const routeCheck = await pool.query('SELECT id FROM routes WHERE id = $1 AND status = $2', [route_id, 'active']);
    if (routeCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Rotta non trovata o non attiva' });
    }

    // Verifica che l'aereo appartenga alla compagnia aerea specificata
    const aircraftCheck = await pool.query(
      'SELECT airline_id, seat_capacity FROM aircrafts WHERE id = $1',
      [aircraft_id]
    );

    if (aircraftCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Aereo non trovato' });
    }

    if (aircraftCheck.rows[0].airline_id !== parseInt(airline_id)) {
      return res.status(400).json({ error: 'L\'aereo non appartiene alla compagnia aerea selezionata' });
    }

    // Se total_seats non è specificato o è 0, usa la capacità dell'aereo
    const aircraftCapacity = aircraftCheck.rows[0].seat_capacity;
    const finalTotalSeats = total_seats || aircraftCapacity;
    const finalAvailableSeats = available_seats !== undefined ? available_seats : finalTotalSeats;

    const query = `
      INSERT INTO flights (
        flight_number, airline_id, aircraft_id, route_id, 
        departure_time, arrival_time, price, 
        total_seats, available_seats, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      flight_number, airline_id, aircraft_id, route_id,
      departure_time, arrival_time, price,
      finalTotalSeats, finalAvailableSeats, status
    ];
    
    const result = await pool.query(query, values);
    console.log(`[INFO] Flight created by user ${req.user!.email} (${req.user!.role}):`, result.rows[0]);
    
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

// Aggiorna volo esistente (solo admin e compagnie aeree autorizzate)
router.put('/:id', authenticateToken, verifyRole(['admin', 'airline']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      flight_number,
      airline_id,
      aircraft_id,
      route_id,
      departure_time,
      arrival_time,
      price,
      total_seats,
      available_seats,
      status
    } = req.body;

    // Verifica che il volo esista e che l'utente possa modificarlo
    const checkQuery = `
      SELECT f.*, a.name as airline_name 
      FROM flights f
      LEFT JOIN airlines a ON f.airline_id = a.id
      WHERE f.id = $1
    `;
    
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Volo non trovato' });
    }

    const existingFlight = checkResult.rows[0];

    // Per le compagnie aeree, verifica che possano modificare solo i loro voli
    if (req.user!.role === 'airline' && req.user!.airlineId && 
        existingFlight.airline_id !== req.user!.airlineId) {
      return res.status(403).json({ error: 'Non puoi modificare voli di altre compagnie' });
    }

    // Se viene cambiata la rotta, verifica che esista
    if (route_id && route_id !== existingFlight.route_id) {
      const routeCheck = await pool.query('SELECT id FROM routes WHERE id = $1 AND status = $2', [route_id, 'active']);
      if (routeCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Rotta non trovata o non attiva' });
      }
    }

    // Se viene cambiato l'aereo, verifica che appartenga alla compagnia
    if (aircraft_id && aircraft_id !== existingFlight.aircraft_id) {
      const aircraftCheck = await pool.query(
        'SELECT airline_id, seat_capacity FROM aircrafts WHERE id = $1',
        [aircraft_id]
      );

      if (aircraftCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Aereo non trovato' });
      }

      const targetAirlineId = airline_id || existingFlight.airline_id;
      if (aircraftCheck.rows[0].airline_id !== parseInt(targetAirlineId)) {
        return res.status(400).json({ error: 'L\'aereo non appartiene alla compagnia aerea' });
      }
    }

    const query = `
      UPDATE flights SET 
        flight_number = $1,
        airline_id = $2,
        aircraft_id = $3,
        route_id = $4,
        departure_time = $5,
        arrival_time = $6,
        price = $7,
        total_seats = $8,
        available_seats = $9,
        status = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;
    
    const values = [
      flight_number || existingFlight.flight_number,
      airline_id || existingFlight.airline_id,
      aircraft_id || existingFlight.aircraft_id,
      route_id || existingFlight.route_id,
      departure_time || existingFlight.departure_time,
      arrival_time || existingFlight.arrival_time,
      price !== undefined ? price : existingFlight.price,
      total_seats !== undefined ? total_seats : existingFlight.total_seats,
      available_seats !== undefined ? available_seats : existingFlight.available_seats,
      status || existingFlight.status,
      id
    ];
    
    const result = await pool.query(query, values);
    
    console.log(`[INFO] Flight updated by user ${req.user!.email} (${req.user!.role}):`, result.rows[0]);
    
    res.json({ 
      message: 'Volo aggiornato con successo', 
      flight: result.rows[0] 
    });
  } catch (err) {
    console.error('Error updating flight:', err);
    res.status(400).json({ error: 'Errore nell\'aggiornamento del volo' });
  }
});

// Elimina volo (solo admin e compagnie aeree autorizzate)
router.delete('/:id', authenticateToken, verifyRole(['admin', 'airline']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica che il volo esista e che l'utente possa eliminarlo
    const checkQuery = 'SELECT * FROM flights WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Volo non trovato' });
    }

    const flight = checkResult.rows[0];

    // Per le compagnie aeree, verifica che possano eliminare solo i loro voli
    if (req.user!.role === 'airline' && req.user!.airlineId && 
        flight.airline_id !== req.user!.airlineId) {
      return res.status(403).json({ error: 'Non puoi eliminare voli di altre compagnie' });
    }
    
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
    
    console.log(`[INFO] Flight deleted by user ${req.user!.email} (${req.user!.role}):`, result.rows[0]);
    
    res.json({ 
      message: 'Volo eliminato con successo', 
      flight: result.rows[0] 
    });
  } catch (err) {
    console.error('Error deleting flight:', err);
    res.status(500).json({ error: 'Errore nell\'eliminazione del volo' });
  }
});

// Visualizza singolo volo per ID (deve essere alla fine per non interferire con altre route)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        fwa.id,
        fwa.flight_number,
        fwa.airline_id,
        fwa.aircraft_id,
        fwa.route_id,
        fwa.departure_time,
        fwa.arrival_time,
        fwa.price,
        fwa.total_seats,
        fwa.available_seats,
        fwa.status,
        fwa.departure_airport_name as departure_airport,
        fwa.departure_code,
        fwa.departure_city,
        fwa.arrival_airport_name as arrival_airport,
        fwa.arrival_code,
        fwa.arrival_city,
        fwa.route_name,
        fwa.distance_km,
        fwa.route_duration,
        airlines.name as airline_name,
        aircrafts.registration as aircraft_registration,
        -- Calcola prezzi finali per ogni classe
        COALESCE(rp_economy.base_price, 0) + COALESCE(fwa.price, 0) as economy_price,
        COALESCE(rp_business.base_price, 0) + COALESCE(fwa.price, 0) as business_price,
        CASE 
          WHEN rp_first.base_price IS NULL THEN 0 
          ELSE rp_first.base_price + COALESCE(fwa.price, 0) 
        END as first_price,
        -- Include anche i prezzi base per riferimento
        rp_economy.base_price as economy_base_price,
        rp_business.base_price as business_base_price,
        rp_first.base_price as first_base_price,
        fwa.price as flight_surcharge
      FROM flights_with_airports fwa
      LEFT JOIN airlines ON fwa.airline_id = airlines.id
      LEFT JOIN aircrafts ON fwa.aircraft_id = aircrafts.id
      LEFT JOIN route_pricing rp_economy ON fwa.route_id = rp_economy.route_id AND rp_economy.seat_class = 'economy'
      LEFT JOIN route_pricing rp_business ON fwa.route_id = rp_business.route_id AND rp_business.seat_class = 'business'  
      LEFT JOIN route_pricing rp_first ON fwa.route_id = rp_first.route_id AND rp_first.seat_class = 'first'
      WHERE fwa.id = $1
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

// Endpoint per ottenere i prezzi dettagliati di un volo
router.get('/:id/pricing', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        f.id as flight_id,
        f.flight_number,
        f.price as flight_surcharge,
        r.route_name,
        -- Prezzi per classe con sovrapprezzo
        json_build_object(
          'economy', COALESCE(rp_economy.base_price, 0) + COALESCE(f.price, 0),
          'business', COALESCE(rp_business.base_price, 0) + COALESCE(f.price, 0),
          'first', CASE 
            WHEN rp_first.base_price IS NULL THEN 0 
            ELSE rp_first.base_price + COALESCE(f.price, 0) 
          END
        ) as final_prices,
        -- Prezzi base della rotta
        json_build_object(
          'economy', rp_economy.base_price,
          'business', rp_business.base_price,
          'first', rp_first.base_price
        ) as base_prices
      FROM flights f
      JOIN routes r ON f.route_id = r.id
      LEFT JOIN route_pricing rp_economy ON f.route_id = rp_economy.route_id AND rp_economy.seat_class = 'economy'
      LEFT JOIN route_pricing rp_business ON f.route_id = rp_business.route_id AND rp_business.seat_class = 'business'  
      LEFT JOIN route_pricing rp_first ON f.route_id = rp_first.route_id AND rp_first.seat_class = 'first'
      WHERE f.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Volo non trovato' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching flight pricing:', err);
    res.status(500).json({ error: 'Errore nel recupero dei prezzi del volo' });
  }
});


export default router;
