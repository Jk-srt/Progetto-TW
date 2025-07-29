import express from 'express';
import { DatabaseService } from '../models/database';
import { Pool } from 'pg';
import crypto from 'crypto';

const router = express.Router();

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const dbService = new DatabaseService(pool);

// Rotte prenotazioni (tutte richiedono autenticazione)
router.post('/', async (req: express.Request, res: express.Response) => {
    try {
        const userId = (req as any).userId as number;
        const { flight_id, passenger_count } = req.body;
        const booking_reference = crypto.randomBytes(8).toString('hex');
        const flight = await dbService.getFlightById(flight_id);
        if (!flight) return res.status(404).json({ error: 'Volo non trovato' });
        if (flight.available_seats < passenger_count) return res.status(400).json({ error: 'Posti insufficienti' });
        const total_price = flight.price * passenger_count;
        const booking = await dbService.createBooking({ user_id: userId, flight_id, booking_reference, passenger_count, total_price, status: 'confirmed' });
        await dbService.updateFlightSeats(flight_id, -passenger_count);
        res.json(booking);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

router.get('/', async (req: express.Request, res: express.Response) => {
    try {
        const userId = (req as any).userId as number;
        const bookings = await dbService.getBookingsByUserId(userId);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

export default router;
