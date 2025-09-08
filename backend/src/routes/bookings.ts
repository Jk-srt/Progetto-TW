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

// Ensure table for storing booking extras exists
let extrasTableEnsured = false;
async function ensureExtrasTable() {
    if (extrasTableEnsured) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS booking_extras (
            id SERIAL PRIMARY KEY,
            booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            extra_type VARCHAR(50) NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            details JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_booking_extras_booking_id ON booking_extras(booking_id);
        CREATE INDEX IF NOT EXISTS idx_booking_extras_type ON booking_extras(extra_type);
    `);
    extrasTableEnsured = true;
}

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

        // Pricing support: recupera pricing della rotta per derivare prezzi classe quando flight.price è 0
        let routePricingMap: Record<string, number> = {};
        let routeDefaultPrice = 0;
        try {
            const rpRes = await pool.query(
                `SELECT r.default_price, rp.seat_class, rp.base_price
                 FROM routes r
                 LEFT JOIN route_pricing rp ON r.id = rp.route_id
                 WHERE r.id = $1`,
                [flight.route_id]
            );
            for (const row of rpRes.rows) {
                routeDefaultPrice = Number(row.default_price) || routeDefaultPrice;
                if (row.seat_class) {
                    routePricingMap[row.seat_class] = Number(row.base_price) || 0;
                }
            }
            console.log('[PRICING] Loaded route pricing', { route_id: flight.route_id, routeDefaultPrice, routePricingMap });
        } catch (e) {
            console.warn('⚠️ Failed to load route pricing:', (e as Error).message);
        }

        // Verifica disponibilità posti
        const passenger_count = passengers.length;
        if (flight.available_seats < passenger_count) {
            return res.status(400).json({ 
                success: false,
                message: 'Posti insufficienti per questo volo' 
            });
        }

    // Assicura tabella extras e crea le prenotazioni (una per ogni posto)
    await ensureExtrasTable();
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

            // Calcolo prezzo base robusto (include fallback route_pricing / default_price)
            const seatClass = seat.seat_class;
                        // Interpreta flight.price come possibile sovrapprezzo (surcharge) ma sanifica se incoerente
                        let flightSurcharge = Number(flight.price) || 0; // nel modello è surcharge
            const flightEconomy = (flight as any).economy_price ? Number((flight as any).economy_price) : 0;
            const flightBusiness = (flight as any).business_price ? Number((flight as any).business_price) : 0;
            const flightFirst = (flight as any).first_price ? Number((flight as any).first_price) : 0;

                        // Determina un valore base minimo noto tra le classi per validare il surcharge
                        const knownMinClass = [flightEconomy, flightBusiness, flightFirst]
                            .filter(v => v > 0)
                            .reduce((min, v) => Math.min(min, v), Number.POSITIVE_INFINITY);
                        if (Number.isFinite(knownMinClass) && flightSurcharge >= knownMinClass) {
                                console.warn('[PRICING] Surcharge >= min class price; treating flight.price as already included. Resetting surcharge to 0', {
                                    flight_id,
                                    flight_price_raw: flight.price,
                                    flightSurcharge_before: flightSurcharge,
                                    knownMinClass
                                });
                                flightSurcharge = 0;
                        }

            const deriveClassBase = (): { value: number; source: string } => {
                // 1. Usa campi del flight se valorizzati (>0)
                if (seatClass === 'economy' && flightEconomy > 0) return { value: flightEconomy, source: 'flight.economy_price' };
                if (seatClass === 'business' && flightBusiness > 0) return { value: flightBusiness, source: 'flight.business_price' };
                if (seatClass === 'first' && flightFirst > 0) return { value: flightFirst, source: 'flight.first_price' };
                // 2. Usa route_pricing base + surcharge (anche se surcharge = 0)
                if (routePricingMap[seatClass] && routePricingMap[seatClass] > 0) {
                    return { value: routePricingMap[seatClass] + flightSurcharge, source: 'route_pricing+flight_surcharge' };
                }
                // 3. Se economy mancante, fallback default route + surcharge
                if (seatClass === 'economy' && routeDefaultPrice > 0) {
                    return { value: routeDefaultPrice + flightSurcharge, source: 'route_default_price+flight_surcharge' };
                }
                // 4. Moltiplicatori se abbiamo un valore base economy noto
                if (seatClass !== 'economy') {
                    const baseEco = flightEconomy || routePricingMap['economy'] || routeDefaultPrice;
                    if (baseEco > 0) {
                        if (seatClass === 'business') return { value: baseEco * 1.5, source: 'multiplier_from_economy' };
                        if (seatClass === 'first') return { value: baseEco * 2, source: 'multiplier_from_economy' };
                    }
                }
                // 5. Ultimo fallback: flightSurcharge * multiplier (se >0) altrimenti 0
                if (flightSurcharge > 0) {
                    if (seatClass === 'business') return { value: flightSurcharge * 1.5, source: 'surcharge_multiplier' };
                    if (seatClass === 'first') return { value: flightSurcharge * 2, source: 'surcharge_multiplier' };
                    return { value: flightSurcharge, source: 'surcharge_raw' };
                }
                return { value: 0, source: 'none' };
            };

            const derived = deriveClassBase();
            let seatPrice = derived.value;
            let extrasValue = 0;
            const basePrice = seatPrice; // sarà aggiornato dopo extras
            const surcharge = flightSurcharge; // informativo
            if (seatPrice === 0) {
                console.warn(`[PRICING] Base price = 0 for seat ${passenger.seat_id} class=${seatClass}`, {
                    flight_id,
                    route_id: flight.route_id,
                    flightEconomy,
                    flightBusiness,
                    flightFirst,
                    flightSurcharge,
                    routeDefaultPrice,
                    routePricingMap,
                    derivation: derived
                });
            } else {
                console.log(`[PRICING] Derived base for seat ${passenger.seat_id}:`, {
                    class: seatClass,
                    value: seatPrice,
                    source: derived.source
                });
            }

            // Aggiungi costi extra (baggagli, legroom, posto preferito, priority boarding, pasto) e prepara breakdown per persistenza
            let extrasBreakdown: Array<{ extra_type: string; quantity: number; unit_price: number; total_price: number; details?: any }> = [];
            try {
                const extras = (passenger as any).extras || {};
                // Baggage (count + type)
                const baggage = extras.baggage || { count: 0, type: 'standard23' };
                const baggageUnitTable: any = {
                    economy: { light15: 20, standard23: 30, heavy32: 45 },
                    business: { light15: 15, standard23: 25, heavy32: 35 },
                    first: { light15: 0, standard23: 0, heavy32: 0 }
                };
                const baggageUnit = baggageUnitTable[seatClass]?.[baggage.type] ?? 30;
                const baggageQty = Math.max(0, Number(baggage.count) || 0);
                const baggageTotal = baggageQty * baggageUnit;
                if (baggageQty > 0 && baggageTotal > 0) {
                    extrasBreakdown.push({
                        extra_type: 'baggage',
                        quantity: baggageQty,
                        unit_price: baggageUnit,
                        total_price: baggageTotal,
                        details: { type: baggage.type }
                    });
                }

                // Legroom only if eligible (exit row) and not first class
                const legroomSelected = !!extras.legroom;
                const legroomEligible = !!(seat as any).is_emergency_exit && seatClass !== 'first';
                const legroomPrice = seatClass === 'economy' ? 18 : seatClass === 'business' ? 12 : 0;
                const legroomTotal = (legroomSelected && legroomEligible) ? legroomPrice : 0;
                if (legroomTotal > 0) {
                    extrasBreakdown.push({
                        extra_type: 'extra_legroom',
                        quantity: 1,
                        unit_price: legroomPrice,
                        total_price: legroomTotal
                    });
                }

                // Preferred seat only if window/aisle and not first
                const preferredSelected = !!extras.preferred_seat;
                const preferredEligible = ((seat as any).is_window || (seat as any).is_aisle) && seatClass !== 'first';
                const preferredPrice = seatClass === 'economy' ? 6 : seatClass === 'business' ? 4 : 0;
                const preferredTotal = (preferredSelected && preferredEligible) ? preferredPrice : 0;
                if (preferredTotal > 0) {
                    extrasBreakdown.push({
                        extra_type: 'preferred_seat',
                        quantity: 1,
                        unit_price: preferredPrice,
                        total_price: preferredTotal
                    });
                }

                // Priority boarding
                const prioritySelected = !!extras.priority_boarding;
                const priorityPrice = seatClass === 'economy' ? 12 : seatClass === 'business' ? 6 : 0;
                const priorityTotal = prioritySelected ? priorityPrice : 0;
                if (priorityTotal > 0) {
                    extrasBreakdown.push({
                        extra_type: 'priority_boarding',
                        quantity: 1,
                        unit_price: priorityPrice,
                        total_price: priorityTotal
                    });
                }

                // Premium meal
                const mealSelected = !!extras.premium_meal;
                const mealPrice = seatClass === 'economy' ? 14 : seatClass === 'business' ? 9 : 0;
                const mealTotal = mealSelected ? mealPrice : 0;
                if (mealTotal > 0) {
                    extrasBreakdown.push({
                        extra_type: 'premium_meal',
                        quantity: 1,
                        unit_price: mealPrice,
                        total_price: mealTotal
                    });
                }

                const extrasTotal = extrasBreakdown.reduce((sum, e) => sum + e.total_price, 0);
                seatPrice += extrasTotal;
                extrasValue = extrasTotal;
                console.log(`➕ Extras applied for passenger ${index + 1}:`, extrasBreakdown, '→ total=', extrasTotal);
            } catch (e) {
                console.warn('⚠️ Failed to apply extras pricing, proceeding without extras:', (e as Error).message);
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

            // Persist extras breakdown items, if any
            try {
                if (extrasBreakdown.length > 0) {
                    const bookingId = bookingResult.rows[0].id;
                    for (const item of extrasBreakdown) {
                        const insertRes = await pool.query(
                            `INSERT INTO booking_extras (booking_id, extra_type, quantity, unit_price, total_price, details)
                             VALUES ($1, $2, $3, $4, $5, $6)
                             RETURNING id`,
                            [
                                bookingId,
                                item.extra_type,
                                item.quantity,
                                item.unit_price,
                                item.total_price,
                                item.details ? JSON.stringify(item.details) : null
                            ]
                        );
                        console.log(`🧾 Extra persisted (booking_id=${bookingId}) ->`, {
                            id: insertRes.rows[0].id,
                            type: item.extra_type,
                            qty: item.quantity,
                            unit: item.unit_price,
                            total: item.total_price,
                            details: item.details || null
                        });
                    }
                }
            } catch (extrasErr) {
                console.warn('⚠️ Failed to persist booking extras:', (extrasErr as Error).message);
            }

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

            createdBookings.push({
                ...bookingResult.rows[0],
                pricing_breakdown: {
                    base_price: basePrice,
                    surcharge,
                    extras: extrasValue,
                    final_price: seatPrice,
                    derivation_source: derived.source
                }
            });
            
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
                    pricing_aggregate: {
                        total_base: createdBookings.reduce((s: number, b: any) => s + (b.pricing_breakdown?.base_price || 0), 0),
                        total_surcharge: createdBookings.reduce((s: number, b: any) => s + (b.pricing_breakdown?.surcharge || 0), 0),
                        total_extras: createdBookings.reduce((s: number, b: any) => s + (b.pricing_breakdown?.extras || 0), 0),
                        total_final: totalPrice
                    },
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
                                        CASE 
                                            WHEN f.price IS NULL OR f.price <= 0 THEN 0
                                            WHEN f.price >= b.price THEN 0 -- evita surcharge maggiore o uguale al totale
                                            ELSE f.price 
                                        END AS flight_surcharge,
                                        COALESCE((SELECT SUM(be.total_price) FROM booking_extras be WHERE be.booking_id = b.id),0) as extras_total,
                                        GREATEST(0, b.price 
                                            - COALESCE((SELECT SUM(be.total_price) FROM booking_extras be WHERE be.booking_id = b.id),0)
                                            - CASE 
                                                    WHEN f.price IS NULL OR f.price <= 0 THEN 0
                                                    WHEN f.price >= b.price THEN 0
                                                    ELSE f.price 
                                                END
                                        ) as base_price_derived,
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
                    COALESCE((
                        SELECT json_agg(json_build_object(
                            'type', be.extra_type,
                            'quantity', be.quantity,
                            'unit_price', be.unit_price,
                            'total_price', be.total_price,
                            'details', be.details
                        )) FROM booking_extras be WHERE be.booking_id = b.id
                    ), '[]'::json) as extras,
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
                                        CASE 
                                            WHEN f.price IS NULL OR f.price <= 0 THEN 0
                                            WHEN f.price >= b.price THEN 0
                                            ELSE f.price 
                                        END AS flight_surcharge,
                                        COALESCE((SELECT SUM(be.total_price) FROM booking_extras be WHERE be.booking_id = b.id),0) as extras_total,
                                        GREATEST(0, b.price 
                                            - COALESCE((SELECT SUM(be.total_price) FROM booking_extras be WHERE be.booking_id = b.id),0)
                                            - CASE 
                                                    WHEN f.price IS NULL OR f.price <= 0 THEN 0
                                                    WHEN f.price >= b.price THEN 0
                                                    ELSE f.price 
                                                END
                                        ) as base_price_derived,
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
                    COALESCE((
                        SELECT json_agg(json_build_object(
                            'type', be.extra_type,
                            'quantity', be.quantity,
                            'unit_price', be.unit_price,
                            'total_price', be.total_price,
                            'details', be.details
                        )) FROM booking_extras be WHERE be.booking_id = b.id
                    ), '[]'::json) as extras
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

// DELETE: Cancella una prenotazione (richiede autenticazione) - HARD DELETE
router.delete('/:bookingId', authenticateToken, async (req: AuthRequest, res: express.Response) => {
    console.log('🗑️ DELETE /bookings/:bookingId - Hard cancel booking request');
    console.log('Booking ID:', req.params.bookingId);
    console.log('User ID:', req.userId);

    const client = await pool.connect(); // Usa una transazione per garantire l'atomicità
    console.log('[DEBUG] Client connected and transaction will start.');

    try {
        const userId = req.userId as number;
        const bookingId = parseInt(req.params.bookingId);

        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'ID prenotazione non valido'
            });
        }

        await client.query('BEGIN');
        console.log('[DEBUG] BEGIN transaction.');

        // Step 1: Verifica che la prenotazione esista, appartenga all'utente e sia cancellabile. Ottieni i dati necessari.
        console.log(`[DEBUG] Step 1: Fetching details for booking ID ${bookingId}`);
        const getBookingDetailsQuery = `
            SELECT
                b.id,
                b.booking_reference,
                b.booking_status,
                b.seat_id,
                b.flight_id,
                f.departure_time
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            WHERE b.id = $1 AND b.user_id = $2
        `;

        const bookingResult = await client.query(getBookingDetailsQuery, [bookingId, userId]);

        if (bookingResult.rows.length === 0) {
            console.log(`[DEBUG] Booking not found or not owned by user. Rolling back.`);
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Prenotazione non trovata o non autorizzata'
            });
        }

        const booking = bookingResult.rows[0];
        const { seat_id: seatId, flight_id: flightId, booking_reference: bookingReference } = booking;
        console.log(`[DEBUG] Booking found: Ref ${bookingReference}, SeatID ${seatId}, FlightID ${flightId}`);

        // Step 2: Verifica se è possibile cancellare (almeno 24 ore prima della partenza)
        console.log('[DEBUG] Step 2: Verifying cancellation window.');
        const departureTime = new Date(booking.departure_time);
        const now = new Date();
        const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDeparture <= 24) {
            console.log(`[DEBUG] Cancellation window closed (${hoursUntilDeparture.toFixed(2)} hours left). Rolling back.`);
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Impossibile cancellare: rimangono meno di 24 ore alla partenza'
            });
        }
        console.log(`[DEBUG] Cancellation window is valid.`);

        // Step 3: Elimina la prenotazione. Grazie a ON DELETE CASCADE, anche gli extra verranno eliminati.
        console.log(`[DEBUG] Step 3: Deleting booking row with ID ${bookingId}.`);
        const deleteQuery = 'DELETE FROM bookings WHERE id = $1';
        const deleteResult = await client.query(deleteQuery, [bookingId]);

        if (deleteResult.rowCount === 0) {
            // Questo non dovrebbe accadere se il controllo precedente ha funzionato, ma è una sicurezza in più.
            throw new Error('La prenotazione non è stata trovata durante l\'eliminazione.');
        }
        console.log(`✅ Booking row deleted for reference: ${bookingReference}`);

        // Step 4: Libera il posto nella tabella aircraft_seats
        if (seatId) {
            console.log(`[DEBUG] Step 4: Releasing seat ID ${seatId}.`);
            const releaseSeatQuery = `
                UPDATE aircraft_seats
                SET status = 'available'
                WHERE id = $1 AND status = 'occupied'
            `;
            const seatUpdateResult = await client.query(releaseSeatQuery, [seatId]);
            console.log(`🪑 Seat ${seatId} marked as available. Rows affected: ${seatUpdateResult.rowCount}`);
        } else {
            console.log('[DEBUG] No seat ID associated with this booking, skipping seat release.');
        }

        // Step 5: Incrementa i posti disponibili per il volo
        if (flightId) {
            console.log(`[DEBUG] Step 5: Incrementing available seats for flight ID ${flightId}.`);
            await client.query('UPDATE flights SET available_seats = available_seats + 1 WHERE id = $1', [flightId]);
            console.log(`✈️ Available seats incremented for flight ${flightId}`);
        } else {
            console.log('[DEBUG] No flight ID associated, skipping seat count increment.');
        }

        await client.query('COMMIT');
        console.log('[DEBUG] COMMIT transaction successful.');

        res.json({
            success: true,
            message: `Prenotazione ${bookingReference} cancellata con successo (eliminazione definitiva).`,
            data: {
                booking_id: bookingId,
                booking_reference: bookingReference,
                status: 'deleted'
            }
        });

    } catch (err) {
        console.error('[DEBUG] An error occurred. Rolling back transaction.');
        await client.query('ROLLBACK');
        console.error('❌ Error during hard delete of booking:', err);
        res.status(500).json({
            success: false,
            message: 'Errore nella cancellazione della prenotazione',
            error: (err as Error).message
        });
    } finally {
        client.release();
        console.log('[DEBUG] Client released.');
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
