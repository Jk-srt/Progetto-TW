import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { FlightSeatMap, SeatReservationRequest, SeatBookingRequest } from '../models/seat';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import dotenv from 'dotenv';
import path from 'path';

// Carica le variabili d'ambiente
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Import WebSocket service (lazy import to avoid circular dependency)
let seatWebSocketService: any;

const router = Router();

// Inizializza pool di connessioni database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon') ? {
    rejectUnauthorized: false
  } : false
});

// Middleware di autenticazione (opzionale per alcune rotte)
function authenticateOptional(req: Request, res: Response, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, process.env.JWT_SECRET) as {
        userId: number;
        role: string;
      };
      (req as any).userId = payload.userId;
      (req as any).userRole = payload.role;
    } catch (err) {
      // Token non valido, ma continuiamo come utente ospite
    }
  }
  
  next();
}

// Middleware per impedire alle compagnie aeree di prenotare posti
function preventAirlineBooking(req: Request, res: Response, next: any) {
  const userRole = (req as any).userRole;
  
  if (userRole === 'airline') {
    return res.status(403).json({
      success: false,
      message: 'Le compagnie aeree non possono effettuare prenotazioni di posti',
      error_code: 'AIRLINE_BOOKING_FORBIDDEN'
    });
  }
  
  next();
}

// Genera session ID se non presente
function generateSessionId(): string {
  return 'session_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
}

// GET /api/seats/flight/:flightId - Ottieni mappa posti per un volo
router.get('/flight/:flightId', authenticateOptional, async (req: Request, res: Response) => {
  try {
    const { flightId } = req.params;
    const sessionId = req.headers['x-session-id'] as string || generateSessionId();
    const userId = (req as any).userId;

    // Pulisci prenotazioni scadute prima di restituire la mappa
    await pool.query('DELETE FROM temporary_seat_reservations WHERE expires_at < NOW()');

    // Query aggiornata per includere riserve temporanee (anche per ospiti con session_id)
    const result = await pool.query(`
      SELECT 
        s.*,
        CASE 
          WHEN b.id IS NOT NULL THEN 'occupied'
          WHEN tr.id IS NOT NULL AND (tr.user_id != $2 OR (tr.user_id IS NULL AND tr.session_id != $3)) THEN 'temporarily_reserved'
          WHEN tr.id IS NOT NULL AND (tr.user_id = $2 OR (tr.user_id IS NULL AND tr.session_id = $3)) THEN 'my_reservation'
          ELSE s.seat_status
        END as actual_status,
        tr.expires_at as reservation_expires,
        (tr.user_id = $2 OR (tr.user_id IS NULL AND tr.session_id = $3)) as is_my_reservation,
        tr.session_id as reservation_session
      FROM flight_seat_map s
      LEFT JOIN bookings b ON s.flight_id = b.flight_id AND s.seat_id = b.seat_id
      LEFT JOIN temporary_seat_reservations tr ON s.flight_id = tr.flight_id AND s.seat_id = tr.seat_id AND tr.expires_at > NOW()
      WHERE s.flight_id = $1 
      ORDER BY s.seat_row, s.seat_column
    `, [flightId, userId || 0, sessionId]);

    const seatMap: FlightSeatMap[] = result.rows;

    res.json({
      success: true,
      sessionId,
      flightId: parseInt(flightId),
      seats: seatMap
    });

  } catch (error) {
    console.error('Errore nel recupero mappa posti:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero della mappa posti'
    });
  }
});

// POST /api/seats/reserve - Riserva temporaneamente un posto
router.post('/reserve', authenticateToken, preventAirlineBooking, async (req: AuthRequest, res: Response) => {
  console.log('🔥🔥🔥 OLD SEATS RESERVE API CALLED - /seats/reserve 🔥🔥🔥');
  console.log('🔍 Request body:', req.body);
  console.log('🔍 req.user:', (req as any).user);
  console.log('🔍 req.userId:', (req as any).userId);
  
  try {
    const { flight_id, seat_id, session_id, user_id }: SeatReservationRequest = req.body;

    if (!flight_id || !seat_id || !session_id) {
      return res.status(400).json({
        success: false,
        message: 'Parametri mancanti: flight_id, seat_id, session_id sono richiesti'
      });
    }

    const result = await pool.query(
      'SELECT reserve_seat_temporarily($1, $2, $3, $4) as success',
      [flight_id, seat_id, session_id, user_id || null]
    );

    const success = result.rows[0].success;

    if (success) {
      // Calcola scadenza (15 minuti da ora)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      
      res.json({
        success: true,
        message: 'Posto riservato temporaneamente',
        reservation_expires: expiresAt,
        seat_id,
        flight_id
      });
    } else {
      res.status(409).json({
        success: false,
        message: 'Posto non disponibile per la prenotazione'
      });
    }

  } catch (error) {
    console.error('Errore nella prenotazione temporanea:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella prenotazione temporanea del posto'
    });
  }
});

// POST /api/seats/release - Rilascia una prenotazione temporanea
router.post('/release', authenticateOptional, async (req: Request, res: Response) => {
  try {
    const { flight_id, seat_id, session_id } = req.body;

    if (!flight_id || !seat_id || !session_id) {
      return res.status(400).json({
        success: false,
        message: 'Parametri mancanti: flight_id, seat_id, session_id sono richiesti'
      });
    }

    const result = await pool.query(
      'SELECT release_seat_reservation($1, $2, $3) as success',
      [flight_id, seat_id, session_id]
    );

    const success = result.rows[0].success;

    res.json({
      success,
      message: success ? 'Prenotazione rilasciata' : 'Prenotazione non trovata',
      seat_id,
      flight_id
    });

  } catch (error) {
    console.error('Errore nel rilascio prenotazione:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel rilascio della prenotazione'
    });
  }
});

// POST /api/seats/release-session - Rilascia tutte le prenotazioni di una sessione
router.post('/release-session', authenticateOptional, async (req: Request, res: Response) => {
  try {
    console.log('🔍 POST /release-session - Headers:', req.headers);
    console.log('🔍 POST /release-session - Body:', req.body);
    console.log('🔍 POST /release-session - Raw body type:', typeof req.body);
    
    const { session_id } = req.body || {};

    if (!session_id) {
      console.log('❌ Missing session_id in body:', req.body);
      return res.status(400).json({
        success: false,
        message: 'session_id è richiesto'
      });
    }

    const result = await pool.query(
      'SELECT release_session_reservations($1) as released_count',
      [session_id]
    );

    const releasedCount = result.rows[0].released_count;

    res.json({
      success: true,
      message: `${releasedCount} prenotazioni rilasciate`,
      released_count: releasedCount
    });

  } catch (error) {
    console.error('Errore nel rilascio prenotazioni sessione:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel rilascio delle prenotazioni della sessione'
    });
  }
});

// POST /api/seats/confirm-booking - Conferma prenotazione definitiva
router.post('/confirm-booking', authenticateOptional, preventAirlineBooking, async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { booking_id, flight_id, seat_ids, passengers, session_id }: SeatBookingRequest = req.body;

    if (!booking_id || !flight_id || !seat_ids || !passengers || !session_id) {
      throw new Error('Parametri mancanti per la conferma della prenotazione');
    }

    if (seat_ids.length !== passengers.length) {
      throw new Error('Il numero di posti deve corrispondere al numero di passeggeri');
    }

    const confirmedSeats = [];

    // Conferma ogni posto con il rispettivo passeggero
    for (let i = 0; i < seat_ids.length; i++) {
      const seat_id = seat_ids[i];
      const passenger = passengers[i];

      const result = await client.query(`
        SELECT confirm_seat_booking($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) as success
      `, [
        booking_id,
        flight_id,
        seat_id,
        session_id,
        passenger.name,
        passenger.email || null,
        passenger.phone || null,
        passenger.document_type || 'passport',
        passenger.document_number || null,
        passenger.date_of_birth || null,
        passenger.nationality || null
      ]);

      const success = result.rows[0].success;
      
      if (!success) {
        throw new Error(`Impossibile confermare la prenotazione per il posto ${seat_id}`);
      }

      confirmedSeats.push({
        seat_id,
        passenger_name: passenger.name
      });
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Prenotazione confermata con successo',
      booking_id,
      confirmed_seats: confirmedSeats
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Errore nella conferma prenotazione:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Errore nella conferma della prenotazione'
    });
  } finally {
    client.release();
  }
});

// GET /api/seats/my-reservations/:sessionId - Ottieni prenotazioni temporanee di una sessione
router.get('/my-reservations/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(`
      SELECT 
        tr.*,
        s.seat_number,
        s.seat_class,
        f.flight_number,
        f.departure_time
      FROM temporary_seat_reservations tr
      JOIN aircraft_seats s ON tr.seat_id = s.id
      JOIN flights f ON tr.flight_id = f.id
      WHERE tr.session_id = $1 AND tr.expires_at > NOW()
      ORDER BY tr.created_at DESC
    `, [sessionId]);

    res.json({
      success: true,
      reservations: result.rows
    });

  } catch (error) {
    console.error('Errore nel recupero prenotazioni:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle prenotazioni'
    });
  }
});

// GET /api/seats/booking/:bookingId - Ottieni posti di una prenotazione confermata
router.get('/booking/:bookingId', async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    const result = await pool.query(`
      SELECT 
        sb.*,
        s.seat_number,
        s.seat_class,
        f.flight_number,
        f.departure_time
      FROM seat_bookings sb
      JOIN aircraft_seats s ON sb.seat_id = s.id
      JOIN flights f ON sb.flight_id = f.id
      WHERE sb.booking_id = $1
      ORDER BY s.seat_row, s.seat_column
    `, [bookingId]);

    res.json({
      success: true,
      seats: result.rows
    });

  } catch (error) {
    console.error('Errore nel recupero posti prenotati:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero dei posti prenotati'
    });
  }
});

// Endpoint per rinnovare prenotazione temporanea
router.post('/renew-reservation', authenticateOptional, preventAirlineBooking, async (req: Request, res: Response) => {
  try {
    const { seat_ids, session_id } = req.body;
    const userId = (req as any).userId;

    if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs dei posti obbligatori'
      });
    }

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID obbligatorio'
      });
    }

    console.log(`🔄 Renewing reservation for seats: ${seat_ids}, session: ${session_id}`);

    // Verifica che tutti i posti siano ancora riservati dalla stessa sessione
    const checkQuery = `
      SELECT id, status, temporary_reservation_expires, reserved_by_session 
      FROM aircraft_seats 
      WHERE id = ANY($1)
    `;
    
    const checkResult = await pool.query(checkQuery, [seat_ids]);
    
    // Controlla che tutti i posti siano ancora riservati dalla stessa sessione
    for (const seat of checkResult.rows) {
      if (seat.status !== 'temporarily_reserved' || seat.reserved_by_session !== session_id) {
        return res.status(400).json({
          success: false,
          message: `Il posto ${seat.id} non è più riservato per la tua sessione`
        });
      }
    }

    // Rinnova la prenotazione per altri 15 minuti
    const newExpiry = new Date(Date.now() + 15 * 60 * 1000); // +15 minuti
    
    const renewQuery = `
      UPDATE aircraft_seats 
      SET temporary_reservation_expires = $1
      WHERE id = ANY($2) AND reserved_by_session = $3
    `;
    
    const renewResult = await pool.query(renewQuery, [newExpiry, seat_ids, session_id]);
    
    if (renewResult.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nessun posto è stato rinnovato'
      });
    }

    console.log(`✅ Renewed ${renewResult.rowCount} seat reservations until ${newExpiry}`);

    // Notify clients about reservation renewal via WebSocket
    try {
      if (!seatWebSocketService) {
        seatWebSocketService = require('../app').seatWebSocketService;
      }
      if (seatWebSocketService) {
        // Get flight ID for the seats
        const flightQuery = `
          SELECT DISTINCT f.id as flight_id
          FROM aircraft_seats s
          JOIN aircrafts a ON s.aircraft_id = a.id
          JOIN flights f ON a.id = f.aircraft_id
          WHERE s.id = ANY($1)
        `;
        const flightResult = await pool.query(flightQuery, [seat_ids]);
        
        if (flightResult.rows.length > 0) {
          const flightId = flightResult.rows[0].flight_id;
          seatWebSocketService.broadcastReservationUpdate(flightId, session_id, seat_ids, newExpiry);
        }
      }
    } catch (wsError) {
      console.error('WebSocket notification error:', wsError);
      // Don't fail the request for WebSocket errors
    }

    res.json({
      success: true,
      message: `Prenotazione rinnovata per ${renewResult.rowCount} posti`,
      expires_at: newExpiry,
      renewed_seats: renewResult.rowCount
    });

  } catch (error) {
    console.error('Errore nel rinnovo prenotazione:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel rinnovo della prenotazione'
    });
  }
});

// Endpoint per rilasciare prenotazioni scadute
router.post('/release-expired', authenticateOptional, async (req: Request, res: Response) => {
  try {
    const { seat_ids, session_id } = req.body;

    if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs dei posti obbligatori'
      });
    }

    console.log(`🗑️ Releasing expired reservations for seats: ${seat_ids}, session: ${session_id}`);

    // Rilascia i posti scaduti
    const releaseQuery = `
      UPDATE aircraft_seats 
      SET 
        status = 'available',
        temporary_reservation_expires = NULL,
        reserved_by_session = NULL,
        reserved_by_user = NULL
      WHERE id = ANY($1) 
        AND status = 'temporarily_reserved'
        AND (
          temporary_reservation_expires < NOW() 
          OR (reserved_by_session = $2 AND temporary_reservation_expires IS NOT NULL)
        )
    `;
    
    const releaseResult = await pool.query(releaseQuery, [seat_ids, session_id]);
    
    console.log(`✅ Released ${releaseResult.rowCount} expired seat reservations`);

    // Notify clients about seat release via WebSocket
    try {
      if (!seatWebSocketService) {
        seatWebSocketService = require('../app').seatWebSocketService;
      }
      if (seatWebSocketService) {
        // Get flight ID for the seats
        const flightQuery = `
          SELECT DISTINCT f.id as flight_id
          FROM aircraft_seats s
          JOIN aircrafts a ON s.aircraft_id = a.id
          JOIN flights f ON a.id = f.aircraft_id
          WHERE s.id = ANY($1)
        `;
        const flightResult = await pool.query(flightQuery, [seat_ids]);
        
        if (flightResult.rows.length > 0) {
          const flightId = flightResult.rows[0].flight_id;
          // Broadcast seat updates for each released seat
          seat_ids.forEach((seatId: number) => {
            seatWebSocketService.broadcastSeatUpdate(flightId, {
              type: 'seat_update',
              flightId,
              seatId,
              status: 'available'
            });
          });
        }
      }
    } catch (wsError) {
      console.error('WebSocket notification error:', wsError);
      // Don't fail the request for WebSocket errors
    }

    res.json({
      success: true,
      message: `Rilasciati ${releaseResult.rowCount} posti scaduti`,
      released_seats: releaseResult.rowCount
    });

  } catch (error) {
    console.error('Errore nel rilascio prenotazioni scadute:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel rilascio delle prenotazioni scadute'
    });
  }
});

// Endpoint per ottenere aggiornamenti sui posti in tempo reale
router.get('/flight/:flightId/updates', async (req: Request, res: Response) => {
  try {
    const flightId = parseInt(req.params.flightId);
    
    if (!flightId) {
      return res.status(400).json({
        success: false,
        message: 'ID volo obbligatorio'
      });
    }

    // Ottieni gli aggiornamenti recenti sui posti (ultimi 30 secondi)
    const updatesQuery = `
      SELECT 
        s.id as seat_id,
        s.status,
        s.reserved_by_session,
        s.temporary_reservation_expires,
        s.updated_at
      FROM aircraft_seats s
      JOIN aircrafts a ON s.aircraft_id = a.id
      JOIN flights f ON a.id = f.aircraft_id
      WHERE f.id = $1 
        AND s.updated_at > NOW() - INTERVAL '30 seconds'
      ORDER BY s.updated_at DESC
    `;
    
    const result = await pool.query(updatesQuery, [flightId]);
    
    res.json({
      success: true,
      updates: result.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Errore nel recupero aggiornamenti posti:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero degli aggiornamenti'
    });
  }
});

export default router;
