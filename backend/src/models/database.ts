import { Pool, QueryResult } from 'pg';

export interface User {
    id: number;
    first_name: string;
    last_name: string;
    phone?: string;
    date_of_birth?: Date;
    nationality?: string;
    passport_number?: string;
    created_at: Date;
    updated_at: Date;
}

export interface Accesso {
    id: number;
    email: string;
    password_hash: string;
    role: 'user' | 'admin' | 'airline';
    airline_id?: number;
    user_id?: number;
    created_at: Date;
    updated_at: Date;
}

export interface Airline {
    id: number;
    name: string;
    iata_code: string;
    icao_code: string;
    country: string;
    founded_year?: number;
    website?: string;
    logo_url?: string;
    active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface Aircraft {
    id: number;
    airline_id: number;
    registration: string;
    aircraft_type: string;
    manufacturer: string;
    model: string;
    seat_capacity: number;
    business_class_seats: number;
    economy_class_seats: number;
    manufacturing_year?: number;
    last_maintenance?: Date;
    status: 'active' | 'maintenance' | 'retired';
    created_at: Date;
    updated_at: Date;
}

export interface Flight {
    id: number;
    flight_number: string;
    airline_id?: number;
    aircraft_id?: number;
    airline?: string;
    aircraft?: string;
    departure_airport: string;
    departure_city?: string;
    arrival_airport: string;
    arrival_city?: string;
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

    // Utenti (solo dati passeggeri)
    async createUser(user: {
        first_name: string;
        last_name: string;
        phone?: string;
        date_of_birth?: Date;
        nationality?: string;
        passport_number?: string;
    }): Promise<User> {
        const query = `
            INSERT INTO users (first_name, last_name, phone, date_of_birth, nationality, passport_number, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING *
        `;
        const values = [user.first_name, user.last_name, user.phone, user.date_of_birth, user.nationality, user.passport_number];
        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    // Registrazione completa utente (passeggero)
    async registerUser(userData: {
        email: string;
        password: string;
        first_name: string;
        last_name: string;
        phone?: string;
        date_of_birth?: Date;
        nationality?: string;
        passport_number?: string;
    }): Promise<{ user: User; accesso: Accesso }> {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Verifica se l'email esiste già
            const existingAccesso = await client.query('SELECT id FROM accesso WHERE email = $1', [userData.email]);
            if (existingAccesso.rows.length > 0) {
                throw new Error('Email già registrata');
            }
            
            // Hash password
            const bcrypt = require('bcryptjs');
            const password_hash = await bcrypt.hash(userData.password, 10);
            
            // Crea l'utente nella tabella users
            const userQuery = `
                INSERT INTO users (first_name, last_name, phone, date_of_birth, nationality, passport_number, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                RETURNING *
            `;
            const userValues = [userData.first_name, userData.last_name, userData.phone, userData.date_of_birth, userData.nationality, userData.passport_number];
            const userResult = await client.query(userQuery, userValues);
            const user = userResult.rows[0];
            
            // Crea l'accesso nella tabella accesso
            const accessoQuery = `
                INSERT INTO accesso (email, password_hash, role, user_id, created_at, updated_at)
                VALUES ($1, $2, 'user', $3, NOW(), NOW())
                RETURNING *
            `;
            const accessoValues = [userData.email, password_hash, user.id];
            const accessoResult = await client.query(accessoQuery, accessoValues);
            const accesso = accessoResult.rows[0];
            
            await client.query('COMMIT');
            
            return { user, accesso };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Autenticazione - usa tabella accesso
    async getAccessoByEmail(email: string): Promise<Accesso | null> {
        const query = 'SELECT * FROM accesso WHERE email = $1';
        const result = await this.pool.query(query, [email]);
        return result.rows[0] || null;
    }

    async createAccesso(accesso: {
        email: string;
        password_hash: string;
        role: 'admin' | 'airline' | 'user';
        airline_id?: number;
        user_id?: number;
    }): Promise<Accesso> {
        const query = `
            INSERT INTO accesso (email, password_hash, role, airline_id, user_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING *
        `;
        const values = [accesso.email, accesso.password_hash, accesso.role, accesso.airline_id, accesso.user_id];
        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    async getUserById(id: number): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await this.pool.query(query, [id]);
        return result.rows[0] || null;
    }

    // Add method to retrieve all users
    async getAllUsers(): Promise<User[]> {
        const query = 'SELECT * FROM users ORDER BY id ASC';
        const result = await this.pool.query(query);
        return result.rows;
    }

    // Add method to delete a user by ID
    async deleteUserById(id: number): Promise<void> {
        await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
    }

    // Compagnie aeree
    async getAllAirlines(): Promise<Airline[]> {
        const query = 'SELECT * FROM airlines WHERE active = true ORDER BY name ASC';
        const result = await this.pool.query(query);
        return result.rows;
    }

    async getAirlineById(id: number): Promise<Airline | null> {
        const query = 'SELECT * FROM airlines WHERE id = $1';
        const result = await this.pool.query(query, [id]);
        return result.rows[0] || null;
    }

    async createAirline(airline: Omit<Airline, 'id' | 'created_at' | 'updated_at'>): Promise<Airline> {
        const query = `
            INSERT INTO airlines (name, iata_code, icao_code, country, founded_year, website, logo_url, active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const values = [
            airline.name,
            airline.iata_code,
            airline.icao_code,
            airline.country,
            airline.founded_year,
            airline.website,
            airline.logo_url,
            airline.active
        ];
        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    async deleteAirlineById(id: number): Promise<void> {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Prima elimina l'accesso associato
            await client.query('DELETE FROM accesso WHERE airline_id = $1', [id]);
            
            // Poi elimina la compagnia aerea
            await client.query('DELETE FROM airlines WHERE id = $1', [id]);
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Aerei
    async getAllAircrafts(): Promise<Aircraft[]> {
        const query = `
            SELECT a.*, al.name as airline_name
            FROM aircrafts a
            LEFT JOIN airlines al ON a.airline_id = al.id
            ORDER BY a.registration ASC
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    async getAircraftById(id: number): Promise<Aircraft | null> {
        const query = `
            SELECT a.*, al.name as airline_name
            FROM aircrafts a
            LEFT JOIN airlines al ON a.airline_id = al.id
            WHERE a.id = $1
        `;
        const result = await this.pool.query(query, [id]);
        return result.rows[0] || null;
    }

    async getAircraftsByAirline(airlineId: number): Promise<Aircraft[]> {
        const query = `
            SELECT a.*, al.name as airline_name
            FROM aircrafts a
            LEFT JOIN airlines al ON a.airline_id = al.id
            WHERE a.airline_id = $1 AND a.status = 'active'
            ORDER BY a.registration ASC
        `;
        const result = await this.pool.query(query, [airlineId]);
        return result.rows;
    }

    async createAircraft(aircraft: Omit<Aircraft, 'id' | 'created_at' | 'updated_at'>): Promise<Aircraft> {
        const query = `
            INSERT INTO aircrafts (airline_id, registration, aircraft_type, manufacturer, model, 
                                 seat_capacity, business_class_seats, economy_class_seats, 
                                 manufacturing_year, last_maintenance, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        const values = [
            aircraft.airline_id,
            aircraft.registration,
            aircraft.aircraft_type,
            aircraft.manufacturer,
            aircraft.model,
            aircraft.seat_capacity,
            aircraft.business_class_seats,
            aircraft.economy_class_seats,
            aircraft.manufacturing_year,
            aircraft.last_maintenance,
            aircraft.status
        ];
        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    // Voli
    async getAllFlights(): Promise<Flight[]> {
        try {
            const query = `
                SELECT 
                    f.*,
                    da.name as departure_airport_name,
                    da.city as departure_city,
                    aa.name as arrival_airport_name,
                    aa.city as arrival_city,
                    al.name as airline_name,
                    al.iata_code as airline_code,
                    ac.registration as aircraft_registration,
                    ac.model as aircraft_model
                FROM flights f
                LEFT JOIN airports da ON f.departure_airport_id = da.id
                LEFT JOIN airports aa ON f.arrival_airport_id = aa.id
                LEFT JOIN airlines al ON f.airline_id = al.id
                LEFT JOIN aircrafts ac ON f.aircraft_id = ac.id
                ORDER BY f.departure_time ASC
            `;
            const result = await this.pool.query(query);
            
            // Mappiamo i risultati al formato atteso
            return result.rows.map(row => ({
                id: row.id,
                flight_number: row.flight_number,
                airline_id: row.airline_id,
                aircraft_id: row.aircraft_id,
                airline: row.airline_name || row.airline_code || 'N/A',
                aircraft: row.aircraft_registration ? `${row.aircraft_model} (${row.aircraft_registration})` : 'N/A',
                departure_airport: row.departure_airport_name || row.departure_airport || 'N/A',
                departure_city: row.departure_city || 'N/A',
                arrival_airport: row.arrival_airport_name || row.arrival_airport || 'N/A',
                arrival_city: row.arrival_city || 'N/A',
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
