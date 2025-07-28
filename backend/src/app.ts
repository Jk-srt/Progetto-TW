import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import { DatabaseService } from './models/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {readFile} from "node:fs/promises";


// Load environment variables from workspace root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
console.debug('[DEBUG] Loaded .env from', path.resolve(__dirname, '../../.env'));
console.debug('[DEBUG] DATABASE_URL:', process.env.DATABASE_URL);

// Debug global errors
if (process.env.NODE_ENV === 'development') {
    process.on('unhandledRejection', (reason, promise) => console.error('[UNHANDLED REJECTION]', reason, promise));
}
process.on('uncaughtException', err => console.error('[UNCAUGHT EXCEPTION]', err));

const app = express();

app.use(express.json());

// Debug request middleware
app.use((req, res, next) => {
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Converti PORT in number e assicurati sia valido
const PORT = parseInt(process.env.PORT || '3000', 10);

// Configurazione PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function runInitSql() {
    const sqlPath = path.join(__dirname, '../database-init/init.sql');
    console.debug('[DEBUG] Running init.sql from', sqlPath);
    const sql = await readFile(sqlPath, 'utf-8');
    try {
        await pool.query(sql);
        console.log('✅ Script init.sql eseguito');
    } catch (err: any) {
        if (err.code === '23505') {
            console.warn('[WARN] init.sql: duplicate key violation, skipping initialization');
        } else {
            throw err;
        }
    }
}

// Istanza del servizio database
const dbService = new DatabaseService(pool);

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// Middleware per autenticazione JWT
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    try {
        const payload = jwt.verify(token, JWT_SECRET) as {
            userId: number;
            role: string};
        (req as any).userId = payload.userId;
        (req as any).userRole = payload.role;
        console.debug('[DEBUG] Token verified for userId:', payload.userId, 'with role:', payload.role);
        // Aggiungi il ruolo al request object
        next();
    } catch (err) {
        return res.sendStatus(403);
    }
}

function verifyRole(requiredRole: string) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const role = (req as any).userRole;
        if (role !== requiredRole) {
            return res.status(403).json({error: 'Accesso negato: ruolo non autorizzato'});
        }
        next();
    };
}

// Health check endpoint
app.get('/api/health', (_req: express.Request, res: express.Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        port: PORT,
        database: 'PostgreSQL'
    });
});

// Test connessione database endpoint
app.get('/api/db-test', async (_req: express.Request, res: express.Response) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as db_version');
        client.release();
        res.json({
            status: 'connected',
            time: result.rows[0].current_time,
            version: result.rows[0].db_version,
            database: 'PostgreSQL'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Errore connessione database',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// API test endpoint
app.get('/api/test', (_req: express.Request, res: express.Response) => {
    res.json({
        message: 'API funzionante',
        data: {
            utenti: ['admin', 'compagnia1', 'passeggero1'],
            voli: [
                { id: 1, partenza: 'Roma', arrivo: 'Milano', costo: 120 },
                { id: 2, partenza: 'Milano', arrivo: 'Parigi', costo: 180 }
            ]
        }
    });
});

// Endpoint per ottenere tutti i voli
app.get('/api/flights', async (_req: express.Request, res: express.Response) => {
    try {
        const flights = await dbService.getAllFlights();
        res.json(flights);
    } catch (error) {
        res.status(500).json({
            error: 'Errore durante il recupero dei voli',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Endpoint per cercare voli
app.get('/api/flights/search', async (req: express.Request, res: express.Response) => {
    try {
        const { departure, arrival, date } = req.query;
        
        if (!departure || !arrival || !date) {
            return res.status(400).json({
                error: 'Parametri mancanti: departure, arrival, date sono richiesti'
            });
        }
        
        const flights = await dbService.searchFlights(
            departure as string,
            arrival as string,
            date as string
        );
        res.json(flights);
    } catch (error) {
        res.status(500).json({
            error: 'Errore durante la ricerca voli',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Rotte utenti: registrazione e login
app.post('/api/users/register', async (req, res) => {
    console.debug('[DEBUG] /api/users/register called with body:', req.body);
    try {
        const { email, password, first_name, last_name, phone, role } = req.body;
        console.debug('[DEBUG] Registration details:', { email, first_name, last_name, phone, role, password });

        const existing = await dbService.getUserByEmail(email);
        console.debug('[DEBUG] Existing user check result:', existing);

        if (existing) return res.status(400).json({ error: 'Utente già esistente' });
        const password_hash = await bcrypt.hash(password, 10);
        const user = await dbService.createUser({ email, password_hash, first_name, last_name, phone, role, temporary_password: false, created_at: new Date(), updated_at: new Date() });
        console.debug('[DEBUG] New user created:', { id: user.id, email: user.email });

        res.json({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name });
    } catch (err) {
        console.error('[ERROR] Registration failed:', err);
        res.status(500).json({ error: (err as Error).message });
    }
});

app.post('/api/users/login', async (req, res) => {
    console.debug('[DEBUG] /api/users/login called with body:', req.body);
    try {
        const { email, password } = req.body;
        console.debug('[DEBUG] Login attempt for email:', email);
        const user = await dbService.getUserByEmail(email);
        console.debug('[DEBUG] User lookup result:', user);
        if (!user) return res.status(400).json({ error: 'Credenziali non valide' });
        const match = await bcrypt.compare(password, user.password_hash);
        console.debug('[DEBUG] Password match result:', match);
        if (!match) return res.status(400).json({ error: 'Credenziali non valide' });
        console.debug('[DEBUG] Generating JWT for userId:', user.id);
        const token = jwt.sign({ userId: user.id, role : user.role }, JWT_SECRET, { expiresIn: '2h' });
        
        // Restituisci il token insieme ai dati dell'utente (senza password)
        res.json({ 
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role : user.role
            }
        });
    } catch (err) {
        console.error('[ERROR] Login failed:', err);
        res.status(500).json({ error: (err as Error).message });
    }
});

// Rotte prenotazioni
app.post('/api/bookings', authenticateToken, async (req, res) => {
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

app.get('/api/bookings', authenticateToken, async (req, res) => {
    try {
        const userId = (req as any).userId as number;
        const bookings = await dbService.getBookingsByUserId(userId);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// Connessione PostgreSQL
async function connectToDatabase() {
    try {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL non definita nelle variabili d\'ambiente');
        }

        // Test della connessione
        console.debug('[DEBUG] Connecting to database using', databaseUrl);
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        console.log('✅ Connesso a PostgreSQL (Neon)');
    } catch (error) {
        console.error('❌ Errore connessione database:', error);
        process.exit(1);
    }
}

async function ensureAdminExists() {
    console.log('[DEBUG] ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
    console.log('[DEBUG] ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '***' : 'undefined');
    
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
        console.log('[WARN] Admin credentials not configured, skipping admin creation');
        return;
    }
    
    const existing = await dbService.getUserByEmail(process.env.ADMIN_EMAIL!);
    if (!existing) {
        const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 10);
        await dbService.createUser({
            email: process.env.ADMIN_EMAIL!,
            password_hash: hash,
            first_name: 'Super',
            last_name: 'Admin',
            phone: '',
            role: 'admin',
            temporary_password: false,
            created_at: new Date(),
            updated_at: new Date()
        });
        console.log('✅ Admin user created:', process.env.ADMIN_EMAIL);
    }
}

// Avvio server - CORREZIONE: usa PORT come number e '0.0.0.0' come string
async function startServer() {
    await connectToDatabase();
    await runInitSql();
    await ensureAdminExists();

    // Corretto: PORT è number, '0.0.0.0' è string
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server in ascolto su http://0.0.0.0:${PORT}`);
        console.log(`🌐 Health check: http://0.0.0.0:${PORT}/api/health`);
    });

    await ensureAdminExists();
}

startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
