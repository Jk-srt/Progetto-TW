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
        console.log('🔍 Validating input data...');
        console.log('flight_id:', flight_id);
        console.log('passengers:', passengers);
        console.log('passengers.length:', passengers?.length);
        console.log('total_price:', total_price);
        
        if (!flight_id || !passengers || !Array.isArray(passengers) || passengers.length === 0) {
            console.log('❌ Input validation failed');
            return res.status(400).json({ 
                success: false,
                message: 'Dati di prenotazione non validi' 
            });
        }

        console.log('✅ Input validation passed');

        // Funzione per generare codice prenotazione unico (max 10 caratteri per DB)
        let bookingCounter = 0;
        const generateBookingReference = () => {
            const timestamp = Date.now().toString().slice(-4); // Solo 4 cifre
            const randomPart = Math.random().toString(36).substr(2, 2).toUpperCase(); // Solo 2 caratteri
            const counter = (++bookingCounter).toString().padStart(2, '0'); // 2 cifre
            const bookingRef = `BK${timestamp}${randomPart}${counter}`; // BK + 4 + 2 + 2 = 10 caratteri esatti
            console.log(`🔖 Generated booking reference: ${bookingRef} (length: ${bookingRef.length})`);
            return bookingRef;
        };

        // Verifica che il volo esista
        console.log('🔍 Checking if flight exists...');
        const flight = await dbService.getFlightById(flight_id);
        if (!flight) {
            console.log('❌ Flight not found');
            return res.status(404).json({ 
                success: false,
                message: 'Volo non trovato' 
            });
        }
        console.log('✅ Flight found:', flight.flight_number);

        // Verifica disponibilità posti
        const passenger_count = passengers.length;
        if (flight.available_seats < passenger_count) {
            return res.status(400).json({ 
                success: false,
                message: 'Posti insufficienti per questo volo' 
            });
        }

        // Crea le prenotazioni (una per ogni posto, come richiede la struttura DB)
        console.log('🔄 Starting booking creation loop...');
        const createdBookings = [];

        for (const [index, passenger] of passengers.entries()) {
            console.log(`\n🎫 Processing passenger ${index + 1}/${passengers.length}:`, {
                seat_id: passenger.seat_id,
                firstName: passenger.firstName,
                lastName: passenger.lastName
            });
            
            if (!passenger.seat_id) {
                console.log('❌ Missing seat_id for passenger');
                return res.status(400).json({ 
                    success: false,
                    message: 'Ogni passeggero deve avere un posto assegnato' 
                });
            }

            // Verifica che il posto non sia già prenotato
            console.log('🔍 Checking if seat is already booked...');
            const existingBooking = await pool.query(
                'SELECT id FROM bookings WHERE flight_id = $1 AND seat_id = $2',
                [flight_id, passenger.seat_id]
            );

            if (existingBooking.rows.length > 0) {
                console.log('❌ Seat already booked');
                return res.status(400).json({
                    success: false,
                    message: `Il posto ${passenger.seat_id} è già stato prenotato per questo volo.`
                });
            }
            console.log('✅ Seat is available');

            // Verifica che l'utente abbia una riserva temporanea valida per questo posto
            console.log('🔍 Checking temporary reservation...');
            console.log('🔍 Looking for reservation with:', { userId, flight_id, seat_id: passenger.seat_id });
            
            const tempReservation = await pool.query(
                'SELECT id, user_id, expires_at FROM temporary_seat_reservations WHERE user_id = $1 AND flight_id = $2 AND seat_id = $3 AND expires_at > NOW()',
                [userId, flight_id, passenger.seat_id]
            );
            
            console.log('🔍 Found reservations:', tempReservation.rows.length);
            if (tempReservation.rows.length > 0) {
                console.log('🔍 Reservation details:', tempReservation.rows[0]);
            }

            // Verifica anche tutte le prenotazioni per questo utente e volo
            const allUserReservations = await pool.query(
                'SELECT seat_id, expires_at FROM temporary_seat_reservations WHERE user_id = $1 AND flight_id = $2',
                [userId, flight_id]
            );
            console.log('🔍 All user reservations for this flight:', allUserReservations.rows);

            if (tempReservation.rows.length === 0) {
                console.log('❌ No valid temporary reservation found');
                return res.status(400).json({
                    success: false,
                    message: `Il posto ${passenger.seat_id} non è più riservato per te. La riserva potrebbe essere scaduta.`
                });
            }
            console.log('✅ Valid temporary reservation found');

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
                    seatPrice = (flight as any).business_price || (flight as any).price * 1.5 || 0;
                    break;
                case 'first':
                    seatPrice = (flight as any).first_price || (flight as any).price * 2.0 || 0;
                    break;
                default:
                    seatPrice = (flight as any).economy_price || (flight as any).price || 0;
            }

            // Genera codice prenotazione unico per questa specifica prenotazione
            const uniqueBookingReference = generateBookingReference();

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
                    uniqueBookingReference,
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

            // Rimuovi la riserva temporanea ora che la prenotazione è confermata
            await pool.query(
                'DELETE FROM temporary_seat_reservations WHERE user_id = $1 AND flight_id = $2 AND seat_id = $3',
                [userId, flight_id, passenger.seat_id]
            );

            createdBookings.push(bookingResult.rows[0]);
            
            console.log(`✅ Booking created for seat ${passenger.seat_id}:`, bookingResult.rows[0]);
            console.log(`🪑 Seat ${passenger.seat_id} marked as occupied`);
        }

        // Aggiorna i posti disponibili del volo
        await dbService.updateFlightSeats(flight_id, -passenger_count);

        const totalPrice = createdBookings.reduce((sum, booking) => sum + parseFloat(booking.price), 0);
        const bookingReferences = createdBookings.map(booking => booking.booking_reference);

        res.json({
            success: true,
            message: 'Prenotazione creata con successo',
            booking_references: bookingReferences,
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
        const userRole = req.userRole as string;
        const airlineId = req.airlineId as number;
        
        let query: string;
        let queryParams: any[];
        
        if (userRole === 'airline') {
            // Per compagnie aeree: mostra tutte le prenotazioni sui voli della compagnia
            query = `
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
                    CONCAT(dep_airport.city, ' → ', arr_airport.city) as flight_route_name,
                    CONCAT(f.flight_number, ' - ', dep_airport.city, ' to ', arr_airport.city) as flight_name,
                    CONCAT(b.passenger_first_name, ' ', b.passenger_last_name) as passenger_name,
                    COALESCE(seats.seat_number, 'Non specificato') as seat_number,
                    COALESCE(b.booking_class, 'Economy') as seat_class,
                    u.first_name as customer_first_name,
                    u.last_name as customer_last_name,
                    u.phone as customer_phone
                FROM bookings b
                JOIN flights f ON b.flight_id = f.id
                JOIN routes r ON f.route_id = r.id
                JOIN airports dep_airport ON r.departure_airport_id = dep_airport.id
                JOIN airports arr_airport ON r.arrival_airport_id = arr_airport.id
                JOIN airlines al ON f.airline_id = al.id
                LEFT JOIN aircraft_seats seats ON b.seat_id = seats.id
                LEFT JOIN users u ON b.user_id = u.id
                WHERE f.airline_id = $1
                ORDER BY COALESCE(b.booking_date, b.updated_at) DESC
            `;
            queryParams = [airlineId];
            console.log('🏢 Fetching bookings for airline ID:', airlineId);
        } else {
            // Per utenti normali: mostra solo le proprie prenotazioni
            query = `
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
                    CONCAT(dep_airport.city, ' → ', arr_airport.city) as flight_route_name,
                    CONCAT(f.flight_number, ' - ', dep_airport.city, ' to ', arr_airport.city) as flight_name,
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
            queryParams = [userId];
            console.log('👤 Fetching bookings for user ID:', userId);
        }
        
        const result = await pool.query(query, queryParams);
        console.log(`✅ Found ${result.rows.length} bookings`);
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

// DELETE: Cancella una prenotazione (richiede autenticazione)
router.delete('/:bookingId', authenticateToken, async (req: AuthRequest, res: express.Response) => {
    console.log('🗑️ DELETE /bookings/:bookingId - Cancel booking request');
    console.log('Booking ID:', req.params.bookingId);
    console.log('User ID:', req.userId);
    
    try {
        const userId = req.userId as number;
        const bookingId = parseInt(req.params.bookingId);

        if (isNaN(bookingId)) {
            return res.status(400).json({ 
                success: false,
                message: 'ID prenotazione non valido' 
            });
        }

        // Verifica che la prenotazione appartenga all'utente e sia cancellabile
        const checkQuery = `
            SELECT 
                b.id,
                b.booking_reference,
                b.booking_status,
                f.departure_time
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            WHERE b.id = $1 AND b.user_id = $2
        `;
        
        const checkResult = await pool.query(checkQuery, [bookingId, userId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Prenotazione non trovata o non autorizzata' 
            });
        }

        const booking = checkResult.rows[0];
        
        // Verifica se la prenotazione è già cancellata
        if (booking.booking_status === 'cancelled') {
            return res.status(400).json({ 
                success: false,
                message: 'La prenotazione è già stata cancellata' 
            });
        }

        // Verifica se è possibile cancellare (almeno 24 ore prima della partenza)
        const departureTime = new Date(booking.departure_time);
        const now = new Date();
        const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursUntilDeparture <= 24) {
            return res.status(400).json({ 
                success: false,
                message: 'Impossibile cancellare: rimangono meno di 24 ore alla partenza' 
            });
        }

        // Aggiorna lo status della prenotazione a 'cancelled'
        const updateQuery = `
            UPDATE bookings 
            SET booking_status = 'cancelled',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2
        `;
        
        await pool.query(updateQuery, [bookingId, userId]);

        // Libera il posto se era riservato
        const releaseSeatQuery = `
            UPDATE aircraft_seats 
            SET seat_status = 'available'
            WHERE id = (
                SELECT seat_id FROM bookings 
                WHERE id = $1 AND user_id = $2
            )
            AND seat_status = 'booked'
        `;
        
        await pool.query(releaseSeatQuery, [bookingId, userId]);

        console.log('✅ Booking cancelled successfully:', booking.booking_reference);
        
        res.json({ 
            success: true,
            message: `Prenotazione ${booking.booking_reference} cancellata con successo`,
            data: {
                booking_id: bookingId,
                booking_reference: booking.booking_reference,
                status: 'cancelled'
            }
        });
        
    } catch (err) {
        console.error('❌ Error cancelling booking:', err);
        res.status(500).json({ 
            success: false,
            message: 'Errore nella cancellazione della prenotazione',
            error: (err as Error).message 
        });
    }
});

// ADMIN: Ottieni le prenotazioni per compagnia aerea (per admin)
router.get('/admin/airline-bookings', authenticateToken, async (req: AuthRequest, res: express.Response) => {
    try {
        const userId = req.userId as number;
        
        // Verifica che l'utente sia un admin di compagnia aerea
        const userResult = await pool.query('SELECT role, airline_id FROM accesso WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || userResult.rows[0].role !== 'airline') {
            return res.status(403).json({ 
                success: false,
                message: 'Accesso non autorizzato. Solo gli amministratori delle compagnie aeree possono accedere a queste informazioni.' 
            });
        }

        const airlineId = userResult.rows[0].airline_id;
        
        // Query per ottenere tutte le prenotazioni della compagnia aerea con dettagli completi
        const query = `
            SELECT 
                b.id as booking_id,
                b.booking_reference,
                b.booking_status,
                b.price as booking_price,
                b.booking_date,
                b.passenger_first_name,
                b.passenger_last_name,
                b.passenger_email,
                b.passenger_phone,
                b.booking_class,
                f.flight_number,
                f.departure_time,
                f.arrival_time,
                f.status as flight_status,
                dep_airport.name as departure_airport_name,
                dep_airport.iata_code as departure_airport_code,
                dep_airport.city as departure_city,
                arr_airport.name as arrival_airport_name,
                arr_airport.iata_code as arrival_airport_code,
                arr_airport.city as arrival_city,
                a.registration as aircraft_registration,
                a.aircraft_type,
                a.model as aircraft_model,
                al.name as airline_name,
                al.iata_code as airline_code,
                CASE 
                    WHEN b.seat_id IS NOT NULL THEN (
                        SELECT seat_number FROM aircraft_seats WHERE id = b.seat_id
                    )
                    ELSE 'N/A'
                END as seat_number
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            JOIN airlines al ON f.airline_id = al.id
            JOIN aircrafts a ON f.aircraft_id = a.id
            JOIN routes r ON f.route_id = r.id
            JOIN airports dep_airport ON r.departure_airport_id = dep_airport.id
            JOIN airports arr_airport ON r.arrival_airport_id = arr_airport.id
            WHERE f.airline_id = $1
            ORDER BY b.booking_date DESC, f.departure_time ASC
        `;

        const result = await pool.query(query, [airlineId]);

        // Raggruppa le prenotazioni per volo
        const bookingsByFlight = result.rows.reduce((acc: any, booking: any) => {
            const flightKey = booking.flight_number;
            
            if (!acc[flightKey]) {
                acc[flightKey] = {
                    flight_number: booking.flight_number,
                    departure_time: booking.departure_time,
                    arrival_time: booking.arrival_time,
                    flight_status: booking.flight_status,
                    route: {
                        departure: {
                            airport_name: booking.departure_airport_name,
                            airport_code: booking.departure_airport_code,
                            city: booking.departure_city
                        },
                        arrival: {
                            airport_name: booking.arrival_airport_name,
                            airport_code: booking.arrival_airport_code,
                            city: booking.arrival_city
                        }
                    },
                    aircraft: {
                        registration: booking.aircraft_registration,
                        type: booking.aircraft_type,
                        model: booking.aircraft_model
                    },
                    airline: {
                        name: booking.airline_name,
                        code: booking.airline_code
                    },
                    bookings: [],
                    total_bookings: 0,
                    total_revenue: 0,
                    seats_by_class: {
                        economy: 0,
                        business: 0,
                        first: 0
                    }
                };
            }

            acc[flightKey].bookings.push({
                booking_id: booking.booking_id,
                booking_reference: booking.booking_reference,
                booking_status: booking.booking_status,
                booking_price: parseFloat(booking.booking_price),
                booking_date: booking.booking_date,
                passenger: {
                    first_name: booking.passenger_first_name,
                    last_name: booking.passenger_last_name,
                    email: booking.passenger_email,
                    phone: booking.passenger_phone
                },
                seat_number: booking.seat_number,
                booking_class: booking.booking_class
            });

            acc[flightKey].total_bookings++;
            acc[flightKey].total_revenue += parseFloat(booking.booking_price);
            
            // Conta i posti per classe
            const seatClass = booking.booking_class || 'economy';
            if (acc[flightKey].seats_by_class[seatClass] !== undefined) {
                acc[flightKey].seats_by_class[seatClass]++;
            }

            return acc;
        }, {});

        // Converti l'oggetto in array
        const flightsArray = Object.values(bookingsByFlight);

        // Calcola statistiche generali
        const totalBookings = result.rows.length;
        const totalRevenue = result.rows.reduce((sum: number, booking: any) => sum + parseFloat(booking.booking_price), 0);
        const activeBookings = result.rows.filter(b => b.booking_status === 'confirmed').length;
        const cancelledBookings = result.rows.filter(b => b.booking_status === 'cancelled').length;

        res.json({
            success: true,
            data: {
                airline: {
                    id: airlineId,
                    name: result.rows.length > 0 ? result.rows[0].airline_name : '',
                    code: result.rows.length > 0 ? result.rows[0].airline_code : ''
                },
                flights: flightsArray,
                statistics: {
                    total_bookings: totalBookings,
                    active_bookings: activeBookings,
                    cancelled_bookings: cancelledBookings,
                    total_revenue: totalRevenue,
                    average_booking_value: totalBookings > 0 ? totalRevenue / totalBookings : 0
                }
            }
        });

    } catch (err) {
        console.error('❌ Error fetching airline bookings:', err);
        res.status(500).json({ 
            success: false,
            message: 'Errore interno del server durante il recupero delle prenotazioni',
            error: (err as Error).message 
        });
    }
});

export default router;
