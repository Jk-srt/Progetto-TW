import { Pool, QueryResult } from 'pg';

export interface User {
    id: number;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    phone?: string;
    created_at: Date;
    updated_at: Date;
}

export interface Flight {
    id: number;
    flight_number: string;
    airline: string;
    departure_airport: string;
    arrival_airport: string;
    departure_time: Date;
    arrival_time: Date;
    price: number;
    available_seats: number;
    total_seats: number;
    aircraft_type?: string;
    status: 'scheduled' | 'delayed' | 'cancelled' | 'completed';
    created_at: Date;
    updated_at: Date;
}

export interface Booking {
    id: number;
    user_id: number;
    flight_id: number;
    booking_reference: string;
    passenger_count: number;
    total_price: number;
    status: 'confirmed' | 'cancelled' | 'completed';
    created_at: Date;
    updated_at: Date;
}

export interface Passenger {
    id: number;
    booking_id: number;
    first_name: string;
    last_name: string;
    date_of_birth?: Date;
    passport_number?: string;
    nationality?: string;
    seat_number?: string;
    created_at: Date;
}

export class DatabaseService {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    // Utenti
    async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
        const query = `
            INSERT INTO users (email, password_hash, first_name, last_name, phone)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [user.email, user.password_hash, user.first_name, user.last_name, user.phone];
        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await this.pool.query(query, [email]);
        return result.rows[0] || null;
    }

    async getUserById(id: number): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await this.pool.query(query, [id]);
        return result.rows[0] || null;
    }

    // Voli
    async getAllFlights(): Promise<Flight[]> {
        const query = 'SELECT * FROM flights ORDER BY departure_time ASC';
        const result = await this.pool.query(query);
        return result.rows;
    }

    async getFlightById(id: number): Promise<Flight | null> {
        const query = 'SELECT * FROM flights WHERE id = $1';
        const result = await this.pool.query(query, [id]);
        return result.rows[0] || null;
    }

    async searchFlights(departureAirport: string, arrivalAirport: string, departureDate: string): Promise<Flight[]> {
        const query = `
            SELECT * FROM flights 
            WHERE departure_airport = $1 
            AND arrival_airport = $2 
            AND DATE(departure_time) = $3
            AND status = 'scheduled'
            AND available_seats > 0
            ORDER BY departure_time ASC
        `;
        const result = await this.pool.query(query, [departureAirport, arrivalAirport, departureDate]);
        return result.rows;
    }

    // Prenotazioni
    async createBooking(booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>): Promise<Booking> {
        const query = `
            INSERT INTO bookings (user_id, flight_id, booking_reference, passenger_count, total_price, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [
            booking.user_id,
            booking.flight_id,
            booking.booking_reference,
            booking.passenger_count,
            booking.total_price,
            booking.status
        ];
        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    async getBookingsByUserId(userId: number): Promise<Booking[]> {
        const query = `
            SELECT b.*, f.flight_number, f.airline, f.departure_airport, f.arrival_airport, 
                   f.departure_time, f.arrival_time
            FROM bookings b
            JOIN flights f ON b.flight_id = f.id
            WHERE b.user_id = $1
            ORDER BY b.created_at DESC
        `;
        const result = await this.pool.query(query, [userId]);
        return result.rows;
    }

    async getBookingByReference(reference: string): Promise<Booking | null> {
        const query = 'SELECT * FROM bookings WHERE booking_reference = $1';
        const result = await this.pool.query(query, [reference]);
        return result.rows[0] || null;
    }

    // Utility per aggiornare i posti disponibili
    async updateFlightSeats(flightId: number, seatChange: number): Promise<void> {
        const query = `
            UPDATE flights 
            SET available_seats = available_seats + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `;
        await this.pool.query(query, [seatChange, flightId]);
    }

    // Query personalizzate
    async executeQuery(query: string, values?: any[]): Promise<QueryResult> {
        return await this.pool.query(query, values);
    }
}
