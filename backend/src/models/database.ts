import { Pool, QueryResult } from 'pg';

export interface User {
    id: number;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: 'user' | 'admin' | 'airlines';
    temporary_password: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface Flight {
    id: number;
    flight_number: string;
    airline?: string;
    departure_airport: string;
    arrival_airport: string;
    departure_time: Date;
    arrival_time: Date;
    price: number;
    available_seats: number;
    total_seats: number;
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
    async createUser(user: {
        email: any;
        password_hash: string;
        first_name: any;
        last_name: any;
        phone: any;
        role: any;
        temporary_password: boolean;
        created_at: Date;
        updated_at: Date
    }): Promise<User> {
        const query = `
            INSERT INTO users (email, password_hash, first_name, last_name, phone, role, temporary_password, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const values = [user.email, user.password_hash, user.first_name, user.last_name, user.phone, user.role, user.temporary_password, user.created_at, user.updated_at ];
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
        try {
            // Prima verifichiamo la struttura della tabella
            const checkQuery = `
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'flights'
                ORDER BY ordinal_position
            `;
            const checkResult = await this.pool.query(checkQuery);
            console.log('Columns in flights table:', checkResult.rows);

            // Facciamo una query semplice prima
            const simpleQuery = `SELECT * FROM flights LIMIT 1`;
            const simpleResult = await this.pool.query(simpleQuery);
            console.log('Sample flight data:', simpleResult.rows[0]);

            const query = `
                SELECT 
                    f.*,
                    da.name as departure_airport_name,
                    aa.name as arrival_airport_name
                FROM flights f
                LEFT JOIN airports da ON f.departure_airport_id = da.id
                LEFT JOIN airports aa ON f.arrival_airport_id = aa.id
                ORDER BY f.departure_time ASC
            `;
            const result = await this.pool.query(query);
            
            // Mappiamo i risultati al formato atteso
            return result.rows.map(row => ({
                id: row.id,
                flight_number: row.flight_number,
                airline: row.flight_number ? row.flight_number.substring(0, 2) : 'N/A',
                departure_airport: row.departure_airport_name || row.departure_airport || 'N/A',
                arrival_airport: row.arrival_airport_name || row.arrival_airport || 'N/A',
                departure_time: row.departure_time,
                arrival_time: row.arrival_time,
                price: row.price,
                available_seats: row.available_seats || 0,
                total_seats: row.total_seats || 0,
                status: row.status,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
        } catch (error) {
            console.error('Error in getAllFlights:', error);
            throw error;
        }
    }

    async getFlightById(id: number): Promise<Flight | null> {
        const query = `
            SELECT 
                f.id,
                f.flight_number,
                SUBSTRING(f.flight_number, 1, 2) as airline,
                da.name as departure_airport,
                aa.name as arrival_airport,
                f.departure_time,
                f.arrival_time,
                f.price,
                f.available_seats,
                f.total_seats,
                f.status,
                f.created_at,
                f.updated_at
            FROM flights f
            JOIN airports da ON f.departure_airport_id = da.id
            JOIN airports aa ON f.arrival_airport_id = aa.id
            WHERE f.id = $1
        `;
        const result = await this.pool.query(query, [id]);
        return result.rows[0] || null;
    }

    async searchFlights(departureAirport: string, arrivalAirport: string, departureDate: string): Promise<Flight[]> {
        const query = `
            SELECT 
                f.id,
                f.flight_number,
                SUBSTRING(f.flight_number, 1, 2) as airline,
                da.name as departure_airport,
                aa.name as arrival_airport,
                f.departure_time,
                f.arrival_time,
                f.price,
                f.available_seats,
                f.total_seats,
                f.status,
                f.created_at,
                f.updated_at
            FROM flights f
            JOIN airports da ON f.departure_airport_id = da.id
            JOIN airports aa ON f.arrival_airport_id = aa.id
            WHERE da.name = $1 
            AND aa.name = $2 
            AND DATE(f.departure_time) = $3
            AND f.status = 'scheduled'
            AND f.available_seats > 0
            ORDER BY f.departure_time ASC
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

    // Metodi per supportare i filtri del frontend
    async getActiveFlights(): Promise<Flight[]> {
        const query = `
            SELECT 
                f.id,
                f.flight_number,
                SUBSTRING(f.flight_number, 1, 2) as airline,
                da.name as departure_airport,
                aa.name as arrival_airport,
                f.departure_time,
                f.arrival_time,
                f.price,
                f.available_seats,
                f.total_seats,
                f.status,
                f.created_at,
                f.updated_at
            FROM flights f
            JOIN airports da ON f.departure_airport_id = da.id
            JOIN airports aa ON f.arrival_airport_id = aa.id
            WHERE f.status IN ('scheduled', 'delayed') 
            ORDER BY f.departure_time ASC
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async getOnTimeFlights(): Promise<Flight[]> {
        const query = `
            SELECT 
                f.id,
                f.flight_number,
                SUBSTRING(f.flight_number, 1, 2) as airline,
                da.name as departure_airport,
                aa.name as arrival_airport,
                f.departure_time,
                f.arrival_time,
                f.price,
                f.available_seats,
                f.total_seats,
                f.status,
                f.created_at,
                f.updated_at
            FROM flights f
            JOIN airports da ON f.departure_airport_id = da.id
            JOIN airports aa ON f.arrival_airport_id = aa.id
            WHERE f.status = 'scheduled'
            ORDER BY f.departure_time ASC
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async filterFlights(filterType: 'all' | 'departures' | 'arrivals'): Promise<Flight[]> {
        let query: string;
        
        const baseQuery = `
            SELECT 
                f.id,
                f.flight_number,
                SUBSTRING(f.flight_number, 1, 2) as airline,
                da.name as departure_airport,
                aa.name as arrival_airport,
                f.departure_time,
                f.arrival_time,
                f.price,
                f.available_seats,
                f.total_seats,
                f.status,
                f.created_at,
                f.updated_at
            FROM flights f
            JOIN airports da ON f.departure_airport_id = da.id
            JOIN airports aa ON f.arrival_airport_id = aa.id
        `;
        
        switch (filterType) {
            case 'departures':
                query = baseQuery + `
                    WHERE f.departure_time::date = CURRENT_DATE
                    ORDER BY f.departure_time ASC
                `;
                break;
            case 'arrivals':
                query = baseQuery + `
                    WHERE f.arrival_time::date = CURRENT_DATE
                    ORDER BY f.arrival_time ASC
                `;
                break;
            default: // 'all'
                query = baseQuery + ' ORDER BY f.departure_time ASC';
        }
        
        const result = await this.pool.query(query);
        return result.rows;
    }

    // Query personalizzate
    async executeQuery(query: string, values?: any[]): Promise<QueryResult> {
        return await this.pool.query(query, values);
    }
}
