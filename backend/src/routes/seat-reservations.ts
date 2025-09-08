import express from 'express';
import { Pool } from 'pg';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Funzione per pulire le riserve scadute
async function cleanupExpiredReservations() {
    try {
        const result = await pool.query(
            'DELETE FROM temporary_seat_reservations WHERE expires_at < NOW() RETURNING *'
        );
        if (result.rows.length > 0) {
            console.log(`🧹 Cleaned up ${result.rows.length} expired seat reservations`);
        }
        return result.rows.length;
    } catch (error) {
        console.error('❌ Error cleaning up expired reservations:', error);
        throw error;
    }
}

// Crea una riserva temporanea per i posti selezionati (supporta utenti autenticati e ospiti)
router.post('/reserve', async (req: express.Request, res: express.Response) => {
    console.log('🚨🚨 SEAT RESERVATION API CALLED - /seat-reservations/reserve 🚨🚨🚨');
    console.log('📥 POST /seat-reservations/reserve - Temporary seat reservation');
    console.log('🔍 Request body:', req.body);
    
    // Prova ad autenticare, ma continua anche se fallisce (per ospiti)
    let userId: number | null = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const payload = jwt.verify(token, process.env.JWT_SECRET) as {
                userId: number;
                role: string;
            };
            userId = payload.userId;
            console.log('🔍 User ID from token:', userId);
        } catch (err) {
            console.log('🔍 No valid token - proceeding as guest');
        }
    }
    
    try {
        // Prima pulisci le riserve scadute
        await cleanupExpiredReservations();
        
        const { flight_id, seat_ids, session_id } = req.body;

        if (!flight_id || !seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Dati di riserva non validi'
            });
        }

        if (!session_id && !userId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID richiesto per utenti ospiti'
            });
        }

        // NON rimuovere le prenotazioni esistenti - aggiungi solo quelle nuove
        // Le prenotazioni esistenti dello stesso utente verranno gestite nel ciclo

        const reservedSeats = [];
        const conflictSeats = [];

        for (const seat_id of seat_ids) {
            try {
                // Verifica che il posto non sia già prenotato definitivamente
                const existingBooking = await pool.query(
                    'SELECT id FROM bookings WHERE flight_id = $1 AND seat_id = $2',
                    [flight_id, seat_id]
                );

                if (existingBooking.rows.length > 0) {
                    conflictSeats.push({ seat_id, reason: 'already_booked' });
                    continue;
                }

                // Verifica che il posto non sia già riservato temporaneamente da altri
                const existingReservation = await pool.query(
                    `SELECT user_id, session_id, expires_at FROM temporary_seat_reservations 
                     WHERE flight_id = $1 AND seat_id = $2 AND expires_at > NOW()`,
                    [flight_id, seat_id]
                );

                if (existingReservation.rows.length > 0) {
                    const reservation = existingReservation.rows[0];
                    // Se è riservato da un altro utente o sessione, segnala conflitto
                    if ((userId && reservation.user_id !== userId) || 
                        (!userId && reservation.session_id !== session_id)) {
                        conflictSeats.push({ 
                            seat_id, 
                            reason: 'temporarily_reserved',
                            expires_at: reservation.expires_at
                        });
                        continue;
                    } else {
                        // È già riservato dallo stesso utente/sessione, considera come successo
                        reservedSeats.push(reservation);
                        console.log(`✅ Seat ${seat_id} already reserved by same ${userId ? `user ${userId}` : `session ${session_id}`}`);
                        continue;
                    }
                }

                // Crea la riserva temporanea con durata molto lunga (24 ore)
                const reservationResult = await pool.query(
                    `INSERT INTO temporary_seat_reservations 
                    (user_id, flight_id, seat_id, session_id, expires_at) 
                    VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours') 
                    RETURNING *`,
                    [userId, flight_id, seat_id, session_id || '']
                );

                reservedSeats.push(reservationResult.rows[0]);
                console.log(`⏰ Seat ${seat_id} reserved temporarily for ${userId ? `user ${userId}` : `guest session ${session_id}`}`);

            } catch (seatError) {
                console.error(`❌ Error reserving seat ${seat_id}:`, seatError);
                conflictSeats.push({ seat_id, reason: 'error', error: (seatError as Error).message });
            }
        }

        if (reservedSeats.length === 0) {
            return res.status(409).json({
                success: false,
                message: 'Nessun posto è stato riservato',
                conflicts: conflictSeats
            });
        }

        res.json({
            success: true,
            message: `${reservedSeats.length} posti riservati temporaneamente per 15 minuti`,
            reserved_seats: reservedSeats,
            conflicts: conflictSeats,
            expires_at: reservedSeats[0]?.expires_at,
            user_type: userId ? 'authenticated' : 'guest'
        });

    } catch (error) {
        console.error('❌ Seat reservation error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella riserva temporanea dei posti',
            error: (error as Error).message
        });
    }
});

// Estendi la riserva temporanea (max 1 volta per 5 minuti aggiuntivi)
router.patch('/extend', authenticateToken, async (req: AuthRequest, res: express.Response) => {
    console.log('📥 PATCH /seat-reservations/extend - Extend reservation');
    
    try {
        const userId = req.userId as number;
        const { flight_id } = req.body;

        if (!flight_id) {
            return res.status(400).json({
                success: false,
                message: 'ID volo richiesto'
            });
        }

        // Verifica che l'utente abbia riserve attive per questo volo
        const activeReservations = await pool.query(
            `SELECT * FROM temporary_seat_reservations 
             WHERE user_id = $1 AND flight_id = $2 AND expires_at > NOW()`,
            [userId, flight_id]
        );

        if (activeReservations.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Nessuna riserva attiva trovata'
            });
        }

        // Estendi di 5 minuti senza limiti
        const extendResult = await pool.query(
            `UPDATE temporary_seat_reservations 
             SET expires_at = expires_at + INTERVAL '5 minutes'
             WHERE user_id = $1 AND flight_id = $2 AND expires_at > NOW()
             RETURNING *`,
            [userId, flight_id]
        );

        res.json({
            success: true,
            message: 'Riserva estesa di 5 minuti',
            reservations: extendResult.rows,
            new_expires_at: extendResult.rows[0]?.expires_at
        });

    } catch (error) {
        console.error('❌ Extend reservation error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'estensione della riserva',
            error: (error as Error).message
        });
    }
});

// Rilascia le riserve temporanee (quando l'utente cambia selezione o esce)
router.delete('/release', async (req: express.Request, res: express.Response) => {
    console.log('📥 DELETE /seat-reservations/release - Release reservations');
    
    // Supporta sia utenti autenticati che ospiti
    let userId: number | null = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const payload = jwt.verify(token, process.env.JWT_SECRET) as {
                userId: number;
                role: string;
            };
            userId = payload.userId;
        } catch (err) {
            // Token non valido, continua come ospite
        }
    }
    
    try {
        const { flight_id, seat_ids, session_id } = req.body;

        let query = '';
        let params: any[] = [];

        if (userId) {
            // Utente autenticato
            query = 'DELETE FROM temporary_seat_reservations WHERE user_id = $1';
            params = [userId];
        } else if (session_id) {
            // Ospite con session_id
            query = 'DELETE FROM temporary_seat_reservations WHERE session_id = $1 AND user_id IS NULL';
            params = [session_id];
        } else {
            return res.status(400).json({
                success: false,
                message: 'User ID o Session ID richiesto'
            });
        }

        if (flight_id) {
            query += ` AND flight_id = $${params.length + 1}`;
            params.push(flight_id);
        }

        if (seat_ids && Array.isArray(seat_ids) && seat_ids.length > 0) {
            const placeholders = seat_ids.map((_, index) => `$${params.length + index + 1}`).join(',');
            query += ` AND seat_id IN (${placeholders})`;
            params.push(...seat_ids);
        }

        query += ' RETURNING *';

        const result = await pool.query(query, params);

        console.log(`🗑️ Released ${result.rows.length} seat reservations for ${userId ? `user ${userId}` : `guest ${session_id}`}`);

        res.json({
            success: true,
            message: `${result.rows.length} riserve rilasciate`,
            released_reservations: result.rows
        });

    } catch (error) {
        console.error('❌ Release reservations error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel rilascio delle riserve',
            error: (error as Error).message
        });
    }
});

// Ottieni lo stato delle riserve dell'utente
router.get('/status/:flight_id', async (req: express.Request, res: express.Response) => {
    try {
        // Pulisci le riserve scadute prima di restituire lo status
        await cleanupExpiredReservations();
        
        // Supporta sia utenti autenticati che ospiti
        let userId: number | null = null;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const sessionId = req.headers['x-session-id'] as string;
        
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const payload = jwt.verify(token, process.env.JWT_SECRET) as {
                    userId: number;
                    role: string;
                };
                userId = payload.userId;
            } catch (err) {
                // Token non valido, continua come ospite
            }
        }

        const flight_id = parseInt(req.params.flight_id);

        let query = '';
        let params: any[] = [];

        if (userId) {
            query = `SELECT r.*, s.seat_number, s.seat_class 
                     FROM temporary_seat_reservations r
                     LEFT JOIN aircraft_seats s ON r.seat_id = s.id
                     WHERE r.user_id = $1 AND r.flight_id = $2 AND r.expires_at > NOW()
                     ORDER BY r.created_at`;
            params = [userId, flight_id];
        } else if (sessionId) {
            query = `SELECT r.*, s.seat_number, s.seat_class 
                     FROM temporary_seat_reservations r
                     LEFT JOIN aircraft_seats s ON r.seat_id = s.id
                     WHERE r.session_id = $1 AND r.flight_id = $2 AND r.expires_at > NOW() AND r.user_id IS NULL
                     ORDER BY r.created_at`;
            params = [sessionId, flight_id];
        } else {
            return res.status(400).json({
                success: false,
                message: 'Token di autenticazione o Session ID richiesto'
            });
        }

        const reservations = await pool.query(query, params);

        res.json({
            success: true,
            reservations: reservations.rows,
            has_active_reservations: reservations.rows.length > 0,
            user_type: userId ? 'authenticated' : 'guest'
        });

    } catch (error) {
        console.error('❌ Get reservation status error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero dello stato delle riserve',
            error: (error as Error).message
        });
    }
});

// Cleanup automatico (da chiamare periodicamente)
router.post('/cleanup', async (req: express.Request, res: express.Response) => {
    try {
        const cleaned = await cleanupExpiredReservations();
        res.json({
            success: true,
            message: `Cleanup completato: ${cleaned} riserve scadute rimosse`
        });
    } catch (error) {
        console.error('❌ Cleanup error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel cleanup',
            error: (error as Error).message
        });
    }
});

// Claim delle prenotazioni temporanee guest dopo login
router.post('/claim', authenticateToken, async (req: AuthRequest, res: express.Response) => {
    try {
        const userId = req.userId;
        const { session_id } = req.body || {};
        if (!session_id) {
            return res.status(400).json({
                success: false,
                message: 'session_id richiesto'
            });
        }

        // Trasferisce le prenotazioni (ancora valide) alla user_id
        const claimResult = await pool.query(
            `UPDATE temporary_seat_reservations
             SET user_id = $1
             WHERE session_id = $2 AND user_id IS NULL AND expires_at > NOW()
             RETURNING id, flight_id, seat_id, expires_at`,
            [userId, session_id]
        );

        if (claimResult.rows.length === 0) {
            return res.json({
                success: true,
                message: 'Nessuna prenotazione guest da associare (forse scadute o già reclamate)',
                claimed: 0
            });
        }

        res.json({
            success: true,
            message: `Associate ${claimResult.rows.length} prenotazioni temporanee all\'utente`,
            claimed: claimResult.rows.length,
            reservations: claimResult.rows
        });
    } catch (error) {
        console.error('❌ Claim reservations error:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'associazione delle prenotazioni guest',
            error: (error as Error).message
        });
    }
});

export default router;
