import express from 'express';
import { DatabaseService } from '../models/database';
import { Pool } from 'pg';
import crypto from 'crypto';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const dbService = new DatabaseService(pool);

// CREATE: Crea una nuova prenotazione (richiede autenticazione)
router.post('/', authenticateToken, async (req: AuthRequest, res: express.Response) => {
    console.log('📥 POST /bookings - New booking request');
    console.log('Request body:', req.body);
    console.log('User ID:', req.userId);
    
    try {
        console.log('🎫 Creating booking with data:', req.body);
        const userId = req.userId as number;
        const { 
            flight_id, 
            passengers, 
            total_price, 
            payment_method = 'credit_card',
            payment_status = 'completed'
        } = req.body;

        // Validazione dati di input
        if (!flight_id || !passengers || !Array.isArray(passengers) || passengers.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Dati di prenotazione non validi' 
            });
        }

        // Genera codice prenotazione unico (max 10 caratteri)
        const booking_reference = 'BK' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 2).toUpperCase();

        // Verifica che il volo esista
        const flight = await dbService.getFlightById(flight_id);
        if (!flight) {
            return res.status(404).json({ 
                success: false,
                message: 'Volo non trovato' 
            });
        }

        // Verifica disponibilità posti
        const passenger_count = passengers.length;
        if (flight.available_seats < passenger_count) {
            return res.status(400).json({ 
                success: false,
                message: 'Posti insufficienti per questo volo' 
            });
        }

        // Crea le prenotazioni (una per ogni posto, come richiede la struttura DB)
        const createdBookings = [];

        for (const passenger of passengers) {
            if (!passenger.seat_id) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Ogni passeggero deve avere un posto assegnato' 
                });
            }

            // Verifica che il posto non sia già prenotato
            const existingBooking = await pool.query(
                'SELECT id FROM bookings WHERE flight_id = $1 AND seat_id = $2',
                [flight_id, passenger.seat_id]
            );

            if (existingBooking.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Il posto ${passenger.seat_id} è già stato prenotato per questo volo.`
                });
            }

            // Verifica che il posto sia effettivamente disponibile
            const seatCheck = await pool.query(
                'SELECT id, seat_class FROM aircraft_seats WHERE id = $1',
                [passenger.seat_id]
            );

            if (seatCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Il posto ${passenger.seat_id} non esiste.`
                });
            }

            const seat = seatCheck.rows[0];

            // Calcola il prezzo per questo posto usando i nuovi prezzi del route_pricing
            const seatClass = seat.seat_class;
            let seatPrice = 0;

            // Usa i prezzi calcolati dal sistema route_pricing + flight_surcharge
            switch (seatClass) {
                case 'economy':
                    seatPrice = flight.economy_price || flight.price || 0;
                    break;
                case 'business':
                    seatPrice = flight.business_price || flight.price * 1.5 || 0;
                    break;
                case 'first':
                    seatPrice = flight.first_price || flight.price * 2.0 || 0;
                    break;
                default:
                    seatPrice = flight.economy_price || flight.price || 0;
            }

            // Inserisce la prenotazione nella struttura esistente
            const bookingResult = await pool.query(
                `INSERT INTO bookings 
                (user_id, flight_id, seat_id, booking_reference, booking_class, price, booking_status, booking_date, passenger_first_name, passenger_last_name, passenger_email, passenger_phone) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11) 
                RETURNING *`,
                [
                    userId,
                    flight_id,
                    passenger.seat_id,
                    booking_reference,
                    seatClass || 'economy',
                    seatPrice,
                    'confirmed',
                    passenger.firstName || 'N/A',
                    passenger.lastName || 'N/A',
                    passenger.email || '',
                    passenger.phone || ''
                ]
            );

            // IMPORTANTE: Marca il posto come occupato nella tabella aircraft_seats
            await pool.query(
                'UPDATE aircraft_seats SET status = $1 WHERE id = $2',
                ['occupied', passenger.seat_id]
            );

            createdBookings.push(bookingResult.rows[0]);
            
            console.log(`✅ Booking created for seat ${passenger.seat_id}:`, bookingResult.rows[0]);
            console.log(`🪑 Seat ${passenger.seat_id} marked as occupied`);
        }

        // Aggiorna i posti disponibili del volo
        await dbService.updateFlightSeats(flight_id, -passenger_count);

        const totalPrice = createdBookings.reduce((sum, booking) => sum + parseFloat(booking.price), 0);

        res.json({
            success: true,
            message: 'Prenotazione creata con successo',
            booking_reference,
            bookings: createdBookings,
            total_price: totalPrice,
            passenger_count
        });

    } catch (err) {
        console.error('❌ Booking creation error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Errore interno del server durante la creazione della prenotazione',
            error: (err as Error).message 
        });
    }
});

// READ: Ottieni le prenotazioni dell'utente (richiede autenticazione)
router.get('/', authenticateToken, async (req: AuthRequest, res: express.Response) => {
    try {
        const userId = req.userId as number;
        const bookings = await dbService.getBookingsByUserId(userId);
        res.json(bookings);
    } catch (err) {
        console.error('❌ Error fetching bookings:', err);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero delle prenotazioni',
            error: (err as Error).message 
        });
    }
});

// READ: Ottieni prenotazioni specifiche per l'utente con dettagli completi
router.get('/user', authenticateToken, async (req: AuthRequest, res: express.Response) => {
    console.log('📥 GET /bookings/user - User bookings request');
    console.log('User ID:', req.userId);
    
    try {
        const userId = req.userId as number;
        
        const query = `
            SELECT 
                b.id as booking_id,
                b.booking_reference,
                COALESCE(b.booking_status, 'confirmed') as booking_status,
                b.price as total_price,
                1 as passenger_count,
                COALESCE(b.booking_date, b.updated_at) as created_at,
                f.id as flight_id,
                f.flight_number,
                f.departure_time,
                f.arrival_time,
                dep_airport.iata_code as departure_airport,
                arr_airport.iata_code as arrival_airport,
                dep_airport.city as departure_city,
                arr_airport.city as arrival_city,
                al.name as airline_name,
                CONCAT(b.passenger_first_name, ' ', b.passenger_last_name) as passenger_name,
                COALESCE(seats.seat_number, 'Non specificato') as seat_number,
                COALESCE(b.booking_class, 'Economy') as seat_class
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            JOIN routes r ON f.route_id = r.id
            JOIN airports dep_airport ON r.departure_airport_id = dep_airport.id
            JOIN airports arr_airport ON r.arrival_airport_id = arr_airport.id
            JOIN airlines al ON f.airline_id = al.id
            LEFT JOIN aircraft_seats seats ON b.seat_id = seats.id
            WHERE b.user_id = $1
            ORDER BY COALESCE(b.booking_date, b.updated_at) DESC
        `;
        
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
        
    } catch (err) {
        console.error('❌ Error fetching user bookings:', err);
        res.status(500).json({ 
            success: false,
            message: 'Errore nel recupero delle prenotazioni utente',
            error: (err as Error).message 
        });
    }
});

export default router;
