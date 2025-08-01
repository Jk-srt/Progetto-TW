import express, { Request, Response } from 'express';
import { DatabaseService } from '../models/database';
import { Pool } from 'pg';
import { authenticateToken, verifyAirlineAdmin, verifyAirlineAccess, verifyAdminOrAirlineAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const dbService = new DatabaseService(pool);

// API Aerei - Lista tutti gli aerei (admin generale) o della propria compagnia (admin airline)
router.get('/', authenticateToken, verifyAdminOrAirlineAdmin, async (req: AuthRequest, res: Response) => {
  console.log('[DEBUG] Aircrafts GET / route called');
  try {
      let aircrafts;

      if (req.userRole === 'admin') {
          // Super admin vede tutti gli aerei
          aircrafts = await dbService.getAllAircrafts();
          console.log('[DEBUG] Super admin - showing all aircrafts');
      } else if (req.userRole === 'airline_admin' && req.airlineId) {
          // Admin compagnia vede solo i suoi aerei
          aircrafts = await dbService.getAircraftsByAirline(req.airlineId);
          console.log('[DEBUG] Airline admin - showing aircrafts for airline:', req.airlineId);
      } else {
          return res.status(403).json({ error: 'Accesso non autorizzato' });
      }

      res.json(aircrafts);
  } catch (error) {
      console.error('[ERROR] Error fetching aircrafts:', error);
      res.status(500).json({
            error: 'Errore durante il recupero degli aerei',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Ottieni aerei della mia compagnia (solo admin compagnie)
router.get('/my-aircrafts', authenticateToken, verifyAirlineAdmin, async (req: AuthRequest, res: Response) => {
    console.log('[DEBUG] GET /my-aircrafts called for airline:', req.airlineId);
    try {
        if (!req.airlineId) {
            return res.status(400).json({ error: 'ID compagnia mancante' });
        }

        const aircrafts = await dbService.getAircraftsByAirline(req.airlineId);

        // Aggiungi statistiche per ogni aereo
        const aircraftsWithStats = await Promise.all(aircrafts.map(async (aircraft) => {
            const flightsQuery = `
                SELECT COUNT(*) as total_flights,
                       COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_flights,
                       MAX(departure_time) as last_flight
                FROM flights 
                WHERE aircraft_id = $1
            `;
            const flightStats = await pool.query(flightsQuery, [aircraft.id]);

            return {
                ...aircraft,
                stats: {
                    total_flights: parseInt(flightStats.rows[0].total_flights),
                    scheduled_flights: parseInt(flightStats.rows[0].scheduled_flights),
                    last_flight: flightStats.rows[0].last_flight
                }
            };
        }));

        res.json({
            airline: {
                id: req.airlineId,
                name: req.airlineName
            },
            aircrafts: aircraftsWithStats,
            total: aircraftsWithStats.length
        });
    } catch (error) {
        console.error('[ERROR] Error fetching my aircrafts:', error);
        res.status(500).json({
            error: 'Errore durante il recupero degli aerei della compagnia',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Ottieni dettagli aereo specifico
router.get('/:id', authenticateToken, verifyAdminOrAirlineAdmin, async (req: AuthRequest, res: Response) => {
  console.log('[DEBUG] Aircrafts GET /:id route called with id:', req.params.id);
  try {
      const { id } = req.params;
      const aircraft = await dbService.getAircraftById(parseInt(id));

      if (!aircraft) {
          return res.status(404).json({ error: 'Aereo non trovato' });
      }

      // Verifica che l'admin della compagnia possa accedere solo ai suoi aerei
      if (req.userRole === 'airline_admin' && aircraft.airline_id !== req.airlineId) {
          return res.status(403).json({ error: 'Non puoi accedere a questo aereo' });
      }

      // Aggiungi statistiche dell'aereo
      const flightsQuery = `
          SELECT COUNT(*) as total_flights,
                 COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_flights,
                 COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_flights,
                 AVG(CASE WHEN status = 'completed' THEN (total_seats - available_seats) END) as avg_passengers
          FROM flights 
          WHERE aircraft_id = $1
      `;
      const flightStats = await pool.query(flightsQuery, [id]);

      const recentFlightsQuery = `
          SELECT f.flight_number, f.departure_time, f.arrival_time, f.status,
                 da.name as departure_airport, aa.name as arrival_airport
          FROM flights f
          JOIN airports da ON f.departure_airport_id = da.id
          JOIN airports aa ON f.arrival_airport_id = aa.id
          WHERE f.aircraft_id = $1
          ORDER BY f.departure_time DESC
          LIMIT 5
      `;
      const recentFlights = await pool.query(recentFlightsQuery, [id]);

      res.json({
          ...aircraft,
          stats: {
              total_flights: parseInt(flightStats.rows[0].total_flights),
              scheduled_flights: parseInt(flightStats.rows[0].scheduled_flights),
              completed_flights: parseInt(flightStats.rows[0].completed_flights),
              avg_passengers: parseFloat(flightStats.rows[0].avg_passengers) || 0
          },
          recent_flights: recentFlights.rows
      });
    } catch (error) {
        console.error('[ERROR] Error fetching aircraft:', error);
        res.status(500).json({
            error: 'Errore durante il recupero dell\'aereo',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Crea nuovo aereo (solo admin compagnie per la propria compagnia)
router.post('/', authenticateToken, verifyAirlineAdmin, async (req: AuthRequest, res: Response) => {
    console.log('[DEBUG] POST /aircrafts called for airline:', req.airlineId);
    try {
        const { registration, aircraft_type, manufacturer, model, seat_capacity, business_class_seats, economy_class_seats, manufacturing_year } = req.body;

        // Validazioni
        if (!registration || !aircraft_type || !manufacturer || !model || !seat_capacity) {
            return res.status(400).json({
                error: 'Campi obbligatori mancanti: registration, aircraft_type, manufacturer, model, seat_capacity'
            });
        }

        if (business_class_seats + economy_class_seats !== seat_capacity) {
            return res.status(400).json({
                error: 'La somma dei posti business e economy deve essere uguale alla capacità totale'
            });
        }

        // Verifica che la registrazione sia unica
        const existingAircraft = await pool.query(
            'SELECT id FROM aircrafts WHERE registration = $1',
            [registration]
        );

        if (existingAircraft.rows.length > 0) {
            return res.status(400).json({ error: 'Registrazione aereo già esistente' });
        }

        const aircraftData = {
            airline_id: req.airlineId!, // Automaticamente della compagnia dell'admin
            registration,
            aircraft_type,
            manufacturer,
            model,
            seat_capacity: parseInt(seat_capacity),
            business_class_seats: parseInt(business_class_seats) || 0,
            economy_class_seats: parseInt(economy_class_seats),
            manufacturing_year: manufacturing_year ? parseInt(manufacturing_year) : undefined,
            last_maintenance: undefined,
            status: 'active' as const,
            created_at: new Date(),
            updated_at: new Date()
        };

        const aircraft = await dbService.createAircraft(aircraftData);

        console.log('[INFO] Aircraft created:', {
            id: aircraft.id,
            registration: aircraft.registration,
            airline_id: req.airlineId,
            airline_name: req.airlineName
        });

        res.status(201).json({
            message: 'Aereo creato con successo',
            aircraft: {
                ...aircraft,
                airline_name: req.airlineName
            }
        });
    } catch (error) {
        console.error('[ERROR] Error creating aircraft:', error);
        res.status(500).json({
            error: 'Errore durante la creazione dell\'aereo',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Aggiorna aereo esistente
router.put('/:id', authenticateToken, verifyAirlineAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { registration, aircraft_type, manufacturer, model, seat_capacity, business_class_seats, economy_class_seats, manufacturing_year, status } = req.body;

        // Verifica che l'aereo appartenga alla compagnia dell'admin
        const aircraft = await dbService.getAircraftById(parseInt(id));
        if (!aircraft) {
            return res.status(404).json({ error: 'Aereo non trovato' });
        }

        if (aircraft.airline_id !== req.airlineId) {
            return res.status(403).json({ error: 'Non puoi modificare questo aereo' });
        }

        // Validazioni se i campi sono forniti
        if (business_class_seats !== undefined && economy_class_seats !== undefined && seat_capacity !== undefined) {
            if (business_class_seats + economy_class_seats !== seat_capacity) {
                return res.status(400).json({
                    error: 'La somma dei posti business e economy deve essere uguale alla capacità totale'
                });
            }
        }

        const updateQuery = `
            UPDATE aircrafts 
            SET registration = COALESCE($1, registration),
                aircraft_type = COALESCE($2, aircraft_type),
                manufacturer = COALESCE($3, manufacturer),
                model = COALESCE($4, model),
                seat_capacity = COALESCE($5, seat_capacity),
                business_class_seats = COALESCE($6, business_class_seats),
                economy_class_seats = COALESCE($7, economy_class_seats),
                manufacturing_year = COALESCE($8, manufacturing_year),
                status = COALESCE($9, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `;

        const values = [
            registration, aircraft_type, manufacturer, model,
            seat_capacity, business_class_seats, economy_class_seats,
            manufacturing_year, status, id
        ];

        const result = await pool.query(updateQuery, values);

        res.json({
            message: 'Aereo aggiornato con successo',
            aircraft: result.rows[0]
        });
    } catch (error) {
        console.error('[ERROR] Error updating aircraft:', error);
        res.status(500).json({
            error: 'Errore durante l\'aggiornamento dell\'aereo',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Elimina aereo
router.delete('/:id', authenticateToken, verifyAirlineAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Verifica che l'aereo appartenga alla compagnia dell'admin
        const aircraft = await dbService.getAircraftById(parseInt(id));
        if (!aircraft) {
            return res.status(404).json({ error: 'Aereo non trovato' });
        }

        if (aircraft.airline_id !== req.airlineId) {
            return res.status(403).json({ error: 'Non puoi eliminare questo aereo' });
        }

        // Controlla se ci sono voli associati
        const flightsCheck = await pool.query(
            'SELECT COUNT(*) as count FROM flights WHERE aircraft_id = $1',
            [id]
        );

        if (parseInt(flightsCheck.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Impossibile eliminare: esistono voli associati a questo aereo'
            });
        }

        const result = await pool.query('DELETE FROM aircrafts WHERE id = $1 RETURNING *', [id]);

        res.json({
            message: 'Aereo eliminato con successo',
            aircraft: result.rows[0]
        });
    } catch (error) {
        console.error('[ERROR] Error deleting aircraft:', error);
        res.status(500).json({
            error: 'Errore nell\'eliminazione dell\'aereo',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
