import express from 'express';
import { Pool } from 'pg';
import { getPool } from './db/pool';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {readFile} from "node:fs/promises";
import { DatabaseService } from './models/database';
import { createServer } from 'http';
import SeatWebSocketService from './websocket/seatSocket';
import { initFlightStatusJob } from './jobs/flightStatusJob';

// Load environment variables from workspace root .env FIRST
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
console.debug('[DEBUG] Loaded .env from', path.resolve(__dirname, '../../.env'));
console.debug('[DEBUG] DATABASE_URL:', process.env.DATABASE_URL);

// Import routers AFTER dotenv is loaded
import adminRouter from './routes/admin';
import flightsRouter from './routes/flights';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import routesRouter from './routes/routes';
import airportsRouter from './routes/airports';
import airlinesRouter from './routes/airlines';
import aircraftsRouter from './routes/aircrafts';
import bookingsRouter from './routes/bookings';
import routePricingRouter from './routes/route-pricing';
import seatsRouter from './routes/seats';
import seatReservationsRouter from './routes/seat-reservations';

console.debug('[DEBUG] Routes imported successfully');

// Debug global errors
if (process.env.NODE_ENV === 'development') {
    process.on('unhandledRejection', (reason, promise) => console.error('[UNHANDLED REJECTION]', reason, promise));
}
process.on('uncaughtException', err => console.error('[UNCAUGHT EXCEPTION]', err));

const app = express();
const server = createServer(app);

// Initialize WebSocket service
export const seatWebSocketService = new SeatWebSocketService(server);

// Constants
const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

// Database connection centralizzata (pool singleton)
const pool = getPool();

// Database service instance
const dbService = new DatabaseService(pool);

async function runInitSql() {
    try {
        console.log('[INFO] Skipping SQL initialization - database already configured');
        return;
    } catch (error: any) {
        console.error('[ERROR] Failed to run SQL initialization:', error);
        throw error;
        if (error.code === '23505') {
            console.warn('[WARN] init.sql: duplicate key violation, skipping initialization');
        } else {
            console.error('[ERROR] Failed to run SQL initialization:', error);
            throw error;
        }
    }
}

// Funzione per creare l'admin automaticamente se non esiste
async function createAdminIfNotExists() {
    try {
        console.log('[INFO] Skipping admin creation - using existing Neon database structure');
        return; // Disabilita temporaneamente per Neon

        /* COMENTATO PER NEON - Riabilitare quando la struttura è corretta
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            console.warn('[WARN] ADMIN_EMAIL or ADMIN_PASSWORD not found in environment variables');
            return;
        }

        // Controlla se esiste già un admin
        const existingAdmin = await pool.query(
            'SELECT id FROM users WHERE role = $1 LIMIT 1',
            ['admin']
        );

        if (existingAdmin.rows.length > 0) {
            console.debug('[DEBUG] Admin user already exists, skipping creation');
            return;
        }

        // Hash della password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

        // Crea l'admin
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role, temporary_password)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, role`,
            [adminEmail, passwordHash, 'Admin', 'User', 'admin', false]
        );

        console.log('[INFO] Admin user created successfully:', {
            id: result.rows[0].id,
            email: result.rows[0].email,
            role: result.rows[0].role
        });
        */

    } catch (error) {
        console.error('[ERROR] Admin creation disabled for Neon database');
    }
}

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-session-id']
}));
app.use(helmet());
app.use(morgan('combined'));

// Debug request middleware
app.use((req, res, next) => {
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Backend API only - no static file serving

// Health check endpoint
app.get('/api/health', (req, res) => {
    console.log('[DEBUG] Health check endpoint called');
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        port: PORT,
        database: 'PostgreSQL'
    });
});

// Authentication middleware
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    try {
        const payload = jwt.verify(token, JWT_SECRET) as {
            userId: number;
            role: string;
        };
        (req as any).userId = payload.userId;
        (req as any).userRole = payload.role;
        console.debug('[DEBUG] Token verified for userId:', payload.userId, 'with role:', payload.role);
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

// Test database connection endpoint
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

// Mount routers
app.use('/api/admin', adminRouter);
app.use('/api/flights', flightsRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/routes', routesRouter);
app.use('/api/airports', airportsRouter);
app.use('/api/airlines', airlinesRouter);
app.use('/api/aircrafts', aircraftsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/route-pricing', routePricingRouter);
app.use('/api/seats', seatsRouter);
app.use('/api/seat-reservations', seatReservationsRouter);

// API info route (moved after frontend routes)
app.get('/api', (req, res) => {
    console.log('[DEBUG] ***** HIT /api ROUTE ***** Serving API info JSON');
    console.log('[DEBUG] Request path:', req.path);
    console.log('[DEBUG] Request original URL:', req.originalUrl);
    res.json({
        message: 'Flight Management API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            dbTest: '/api/db-test',
            flights: '/api/flights',
            auth: '/api/auth',
            users: '/api/users',
            routes: '/api/routes',
            airports: '/api/airports',
            airlines: '/api/airlines',
            aircrafts: '/api/aircrafts',
            bookings: '/api/bookings',
            admin: '/api/admin'
        }
    });
});

// 404 handler for unmatched API routes
app.use((req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    // For non-API routes, return 404 since this is backend only
    res.status(404).json({ error: 'Backend API only - use frontend container for web interface' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[ERROR]', err.stack);
    res.status(500).json({
        error: 'Errore interno del server',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

async function connectToDatabase() {
    try {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL non definita nelle variabili d\'ambiente');
        }

        // Test database connection
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
    
    const existing = await dbService.getAccessoByEmail(process.env.ADMIN_EMAIL!);
    if (!existing) {
        const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 10);
        await dbService.createAccesso({
            email: process.env.ADMIN_EMAIL!,
            password_hash: hash,
            role: 'admin'
        });
        console.log('✅ Admin user created:', process.env.ADMIN_EMAIL);
    }
}

// Server startup
async function startServer() {
    try {
        console.log('[INFO] Initializing database...');
        await connectToDatabase();
        await runInitSql();
        await createAdminIfNotExists();
        await ensureAdminExists();
    // Avvio job aggiornamento stato voli (configurabile via env)
    initFlightStatusJob(pool);
        
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server in ascolto su http://0.0.0.0:${PORT}`);
            console.log(`🔌 WebSocket server su ws://0.0.0.0:${PORT}/ws`);
            console.log(`🌐 Health check: http://0.0.0.0:${PORT}/api/health`);
            console.log(`📋 API documentation: http://0.0.0.0:${PORT}/`);
        });
    } catch (error) {
        console.error('[ERROR] Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app;
