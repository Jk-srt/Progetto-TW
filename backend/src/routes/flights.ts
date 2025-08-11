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
    
    // Mappatura per gestire nomi città in italiano/inglese e nomi aeroporti
    const cityMapping: { [key: string]: string[] } = {
      'Roma': ['Roma', 'Rome'],
      'Rome': ['Roma', 'Rome'],
      'Roma Fiumicino': ['Roma', 'Rome'],
      'Leonardo da Vinci International Airport': ['Roma', 'Rome'],
      'Milano': ['Milano', 'Milan'],
      'Milan': ['Milano', 'Milan'],
      'Milano Malpensa': ['Milano', 'Milan'],
      'Parigi': ['Paris', 'Parigi'],
      'Paris': ['Paris', 'Parigi'],
      'Parigi CDG': ['Paris', 'Parigi'],
      'Charles de Gaulle Airport': ['Paris', 'Parigi'],
      'Londra': ['London', 'Londra'],
      'London': ['London', 'Londra'],
      'Londra Heathrow': ['London', 'Londra'],
      'Heathrow Airport': ['London', 'Londra'],
      'Amsterdam': ['Amsterdam'],
      'Amsterdam Schiphol': ['Amsterdam'],
      'Francoforte': ['Frankfurt', 'Francoforte'],
      'Frankfurt': ['Frankfurt', 'Francoforte'],
      'Barcellona': ['Barcelona', 'Barcellona'],
      'Barcelona': ['Barcelona', 'Barcellona'],
      'Barcellona El Prat': ['Barcelona', 'Barcellona']
    };
    
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
    
    if (departure_city && typeof departure_city === 'string') {
      const departureCities = cityMapping[departure_city] || [departure_city];
      const cityConditions = departureCities.map((city: string, index: number) => {
        params.push(`%${city}%`);
        return `fwa.departure_city ILIKE $${paramIndex + index}`;
      }).join(' OR ');
      query += ` AND (${cityConditions})`;
      paramIndex += departureCities.length;
    }
    
    if (arrival_city && typeof arrival_city === 'string') {
      const arrivalCities = cityMapping[arrival_city] || [arrival_city];
      const cityConditions = arrivalCities.map((city: string, index: number) => {
        params.push(`%${city}%`);
        return `fwa.arrival_city ILIKE $${paramIndex + index}`;
      }).join(' OR ');
      query += ` AND (${cityConditions})`;
      paramIndex += arrivalCities.length;
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

// Nuovo endpoint per ricerca avanzata con connessioni/scali
router.get('/connections', async (req, res) => {
  try {
    const { departure_city, arrival_city, departure_date, max_connections = 1 } = req.query;
    
    if (!departure_city || !arrival_city) {
      return res.status(400).json({ 
        error: 'departure_city e arrival_city sono obbligatori' 
      });
    }

    // Usa la stessa mappatura dell'endpoint /search
    const cityMapping: { [key: string]: string[] } = {
      'Roma': ['Roma', 'Rome'],
      'Rome': ['Roma', 'Rome'],
      'Roma Fiumicino': ['Roma', 'Rome'],
      'Leonardo da Vinci International Airport': ['Roma', 'Rome'],
      'Milano': ['Milano', 'Milan'],
      'Milan': ['Milano', 'Milan'],
      'Milano Malpensa': ['Milano', 'Milan'],
      'Parigi': ['Paris', 'Parigi'],
      'Paris': ['Paris', 'Parigi'],
      'Parigi CDG': ['Paris', 'Parigi'],
      'Charles de Gaulle Airport': ['Paris', 'Parigi'],
      'Londra': ['London', 'Londra'],
      'London': ['London', 'Londra'],
      'Londra Heathrow': ['London', 'Londra'],
      'Heathrow Airport': ['London', 'Londra'],
      'Amsterdam': ['Amsterdam'],
      'Amsterdam Schiphol': ['Amsterdam'],
      'Francoforte': ['Frankfurt', 'Francoforte'],
      'Frankfurt': ['Frankfurt', 'Francoforte'],
      'Barcellona': ['Barcelona', 'Barcellona'],
      'Barcelona': ['Barcelona', 'Barcellona'],
      'Barcellona El Prat': ['Barcelona', 'Barcellona']
    };

    const connections = [];
    
    // 1. Cerca voli diretti utilizzando la mappatura delle città
    let directQuery = `
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
        -- Calcola prezzi finali per ogni classe
        COALESCE(rp_economy.base_price, 0) + COALESCE(fwa.price, 0) as economy_price,
        COALESCE(rp_business.base_price, 0) + COALESCE(fwa.price, 0) as business_price,
        CASE 
          WHEN rp_first.base_price IS NULL THEN 0 
          ELSE rp_first.base_price + COALESCE(fwa.price, 0) 
        END as first_price,
        'direct' as connection_type
      FROM flights_with_airports fwa
      LEFT JOIN airlines ON fwa.airline_id = airlines.id
      LEFT JOIN route_pricing rp_economy ON fwa.route_id = rp_economy.route_id AND rp_economy.seat_class = 'economy'
      LEFT JOIN route_pricing rp_business ON fwa.route_id = rp_business.route_id AND rp_business.seat_class = 'business'  
      LEFT JOIN route_pricing rp_first ON fwa.route_id = rp_first.route_id AND rp_first.seat_class = 'first'
      WHERE fwa.status = 'scheduled'
    `;

    const directParams: any[] = [];
    let directParamIndex = 1;

    // Applica mappatura città di partenza
    const departureCities = cityMapping[departure_city as string] || [departure_city as string];
    const departureCityConditions = departureCities.map((city: string, index: number) => {
      directParams.push(`%${city}%`);
      return `fwa.departure_city ILIKE $${directParamIndex + index}`;
    }).join(' OR ');
    directQuery += ` AND (${departureCityConditions})`;
    directParamIndex += departureCities.length;

    // Applica mappatura città di arrivo
    const arrivalCities = cityMapping[arrival_city as string] || [arrival_city as string];
    const arrivalCityConditions = arrivalCities.map((city: string, index: number) => {
      directParams.push(`%${city}%`);
      return `fwa.arrival_city ILIKE $${directParamIndex + index}`;
    }).join(' OR ');
    directQuery += ` AND (${arrivalCityConditions})`;
    directParamIndex += arrivalCities.length;
    
    // Aggiungi filtro per data solo se fornita
    if (departure_date) {
      directQuery += ` AND DATE(fwa.departure_time) = $${directParamIndex}`;
      directParams.push(departure_date as string);
    }
    
    directQuery += ` ORDER BY fwa.departure_time ASC`;
    
    const directResult = await pool.query(directQuery, directParams);
    
    // Aggiungi voli diretti ai risultati
    connections.push(...directResult.rows);

    // 2. Se richiesto, cerca voli con 1 scalo (supporta anche ricerche senza data)
    if (parseInt(max_connections as string) >= 1 && directResult.rows.length < 10) {
      // Quando la data non è fornita, limitiamo la ricerca alle prossime 48 ore
      const useDateParam = !!departure_date;
      const dateFilter = useDateParam 
        ? `AND DATE(f1.departure_time) = DATE($3::date)`
        : `AND DATE(f1.departure_time) BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '2 days')`;

      const connectionQuery = `
        WITH connection_flights AS (
          -- Prima tratta
          SELECT 
            f1.id as first_flight_id,
            f1.flight_number as first_flight_number,
            f1.departure_time as first_departure_time,
            f1.arrival_time as first_arrival_time,
            f1.departure_city as origin_city,
            f1.departure_code as origin_code,
            f1.departure_airport_name as origin_airport,
            f1.arrival_city as connection_city,
            f1.arrival_code as connection_code,
            f1.arrival_airport_name as connection_airport,
            f1.airline_id as first_airline_id,
            airlines1.name as first_airline_name,
            COALESCE(rp1_economy.base_price, 0) + COALESCE(f1.price, 0) as first_economy_price,
            COALESCE(rp1_business.base_price, 0) + COALESCE(f1.price, 0) as first_business_price,
            CASE 
              WHEN rp1_first.base_price IS NULL THEN 0 
              ELSE rp1_first.base_price + COALESCE(f1.price, 0) 
            END as first_first_price,
            f1.available_seats as first_available_seats,
            -- Seconda tratta
            f2.id as second_flight_id,
            f2.flight_number as second_flight_number,
            f2.departure_time as second_departure_time,
            f2.arrival_time as second_arrival_time,
            f2.arrival_city as destination_city,
            f2.arrival_code as destination_code,
            f2.arrival_airport_name as destination_airport,
            f2.airline_id as second_airline_id,
            airlines2.name as second_airline_name,
            COALESCE(rp2_economy.base_price, 0) + COALESCE(f2.price, 0) as second_economy_price,
            COALESCE(rp2_business.base_price, 0) + COALESCE(f2.price, 0) as second_business_price,
            CASE 
              WHEN rp2_first.base_price IS NULL THEN 0 
              ELSE rp2_first.base_price + COALESCE(f2.price, 0) 
            END as second_first_price,
            f2.available_seats as second_available_seats,
            -- Calcolo tempi di connessione
            EXTRACT(EPOCH FROM (f2.departure_time - f1.arrival_time)) / 60 as connection_minutes
          FROM flights_with_airports f1
          JOIN flights_with_airports f2 ON (
            -- Stesso aeroporto di connessione
            f1.arrival_city = f2.departure_city
            -- Connessione valida: almeno 2 ore ma meno di 24 ore
            AND f2.departure_time > f1.arrival_time + INTERVAL '2 hours'
            AND f2.departure_time < f1.arrival_time + INTERVAL '24 hours'
            -- Finestra temporale
            ${dateFilter}
          )
          LEFT JOIN airlines airlines1 ON f1.airline_id = airlines1.id
          LEFT JOIN airlines airlines2 ON f2.airline_id = airlines2.id
          LEFT JOIN route_pricing rp1_economy ON f1.route_id = rp1_economy.route_id AND rp1_economy.seat_class = 'economy'
          LEFT JOIN route_pricing rp1_business ON f1.route_id = rp1_business.route_id AND rp1_business.seat_class = 'business'
          LEFT JOIN route_pricing rp1_first ON f1.route_id = rp1_first.route_id AND rp1_first.seat_class = 'first'
          LEFT JOIN route_pricing rp2_economy ON f2.route_id = rp2_economy.route_id AND rp2_economy.seat_class = 'economy'
          LEFT JOIN route_pricing rp2_business ON f2.route_id = rp2_business.route_id AND rp2_business.seat_class = 'business'
          LEFT JOIN route_pricing rp2_first ON f2.route_id = rp2_first.route_id AND rp2_first.seat_class = 'first'
          WHERE f1.status = 'scheduled' 
            AND f2.status = 'scheduled'
            AND f1.departure_city ILIKE $1
            AND f2.arrival_city ILIKE $2
            AND f1.arrival_city != $1  -- Il punto di connessione non può essere uguale alla partenza
            AND f2.departure_city != $2 -- Il punto di connessione non può essere uguale alla destinazione
        )
        SELECT 
          first_flight_id,
          first_flight_number,
          first_departure_time,
          first_arrival_time,
          origin_city as departure_city,
          origin_code as departure_code,
          origin_airport as departure_airport,
          first_airline_name as first_airline_name,
          first_economy_price,
          first_business_price,
          first_first_price,
          first_available_seats,
          
          second_flight_id,
          second_flight_number,
          second_departure_time,
          second_arrival_time,
          destination_city as arrival_city,
          destination_code as arrival_code,
          destination_airport as arrival_airport,
          second_airline_name as second_airline_name,
          second_economy_price,
          second_business_price,
          second_first_price,
          second_available_seats,
          
          connection_city,
          connection_code,
          connection_airport,
          connection_minutes,
          
          -- Calcoli totali
          (first_economy_price + second_economy_price) as total_economy_price,
          (first_business_price + second_business_price) as total_business_price,
          (first_first_price + second_first_price) as total_first_price,
          EXTRACT(EPOCH FROM (second_arrival_time - first_departure_time)) / 60 as total_duration_minutes,
          'connection' as connection_type
          
        FROM connection_flights
        WHERE connection_minutes >= 120  -- Minimo 2 ore di scalo
          AND connection_minutes <= 1440 -- Massimo 24 ore di scalo
        ORDER BY total_economy_price ASC, total_duration_minutes ASC
        LIMIT 20
      `;
      
      const connectionParams: any[] = [
        `%${departureCities[0]}%`,  // Usa la prima città mappata per la partenza
        `%${arrivalCities[0]}%`     // Usa la prima città mappata per l'arrivo
      ];
      if (useDateParam) {
        connectionParams.push(departure_date);
      }
      const connectionResult = await pool.query(connectionQuery, connectionParams);
      
      // Trasforma i risultati delle connessioni nel formato corretto
      const formattedConnections = connectionResult.rows.map(row => ({
        connection_type: 'connection',
        first_flight: {
          id: row.first_flight_id,
          flight_number: row.first_flight_number,
          departure_time: row.first_departure_time,
          arrival_time: row.first_arrival_time,
          departure_city: row.departure_city,
          departure_code: row.departure_code,
          departure_airport: row.departure_airport,
          arrival_city: row.connection_city,
          arrival_code: row.connection_code,
          arrival_airport: row.connection_airport,
          airline_name: row.first_airline_name,
          economy_price: row.first_economy_price,
          business_price: row.first_business_price,
          first_price: row.first_first_price,
          available_seats: row.first_available_seats
        },
        second_flight: {
          id: row.second_flight_id,
          flight_number: row.second_flight_number,
          departure_time: row.second_departure_time,
          arrival_time: row.second_arrival_time,
          departure_city: row.connection_city,
          departure_code: row.connection_code,
          departure_airport: row.connection_airport,
          arrival_city: row.arrival_city,
          arrival_code: row.arrival_code,
          arrival_airport: row.arrival_airport,
          airline_name: row.second_airline_name,
          economy_price: row.second_economy_price,
          business_price: row.second_business_price,
          first_price: row.second_first_price,
          available_seats: row.second_available_seats
        },
        connection_info: {
          city: row.connection_city,
          code: row.connection_code,
          airport: row.connection_airport,
          connection_minutes: row.connection_minutes
        },
        totals: {
          economy_price: row.total_economy_price,
          business_price: row.total_business_price,
          first_price: row.total_first_price,
          duration_minutes: row.total_duration_minutes,
          available_seats: Math.min(row.first_available_seats, row.second_available_seats)
        }
      }));
      
      connections.push(...formattedConnections);
    }

    // Ordina tutti i risultati per prezzo
    connections.sort((a, b) => {
      const priceA = a.connection_type === 'direct' ? (a.economy_price || 0) : (a.totals?.economy_price || 0);
      const priceB = b.connection_type === 'direct' ? (b.economy_price || 0) : (b.totals?.economy_price || 0);
      return priceA - priceB;
    });

    res.json({
      departure_city,
      arrival_city,
      departure_date,
      total_options: connections.length,
      direct_flights: connections.filter(c => c.connection_type === 'direct').length,
      connection_flights: connections.filter(c => c.connection_type === 'connection').length,
      flights: connections
    });

  } catch (err) {
    console.error('Error searching flight connections:', err);
    res.status(500).json({ error: 'Errore nella ricerca delle connessioni voli' });
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
