import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { FlightSeatMap, SeatReservationRequest, SeatBookingRequest } from '../models/seat';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import dotenv from 'dotenv';
import path from 'path';

// Carica le variabili d'ambiente
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

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

    // Query aggiornata per includere riserve temporanee
    const result = await pool.query(`
      SELECT 
        s.*,
        CASE 
          WHEN b.id IS NOT NULL THEN 'occupied'
          WHEN tr.id IS NOT NULL AND tr.user_id != $2 THEN 'temporarily_reserved'
          WHEN tr.id IS NOT NULL AND tr.user_id = $2 THEN 'my_reservation'
          ELSE s.seat_status
        END as actual_status,
        tr.expires_at as reservation_expires,
        tr.user_id = $2 as is_my_reservation
      FROM flight_seat_map s
      LEFT JOIN bookings b ON s.flight_id = b.flight_id AND s.seat_id = b.seat_id
      LEFT JOIN temporary_seat_reservations tr ON s.flight_id = tr.flight_id AND s.seat_id = tr.seat_id AND tr.expires_at > NOW()
      WHERE s.flight_id = $1 
      ORDER BY s.seat_row, s.seat_column
    `, [flightId, userId || 0]);

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

export default router;
