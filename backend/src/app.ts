import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {readFile} from "node:fs/promises";
import { DatabaseService } from './models/database';

// Import routers
import adminRouter from './routes/admin';
import flightsRouter from './routes/flights';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import routesRouter from './routes/routes';
import airportsRouter from './routes/airports';
import airlinesRouter from './routes/airlines';
import aircraftsRouter from './routes/aircrafts';
import bookingsRouter from './routes/bookings';

// Load environment variables from workspace root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
console.debug('[DEBUG] Loaded .env from', path.resolve(__dirname, '../../.env'));
console.debug('[DEBUG] DATABASE_URL:', process.env.DATABASE_URL);
console.debug('[DEBUG] Routes imported successfully');

// Debug global errors
if (process.env.NODE_ENV === 'development') {
    process.on('unhandledRejection', (reason, promise) => console.error('[UNHANDLED REJECTION]', reason, promise));
}
process.on('uncaughtException', err => console.error('[UNCAUGHT EXCEPTION]', err));

const app = express();

// Constants
const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Database service instance
const dbService = new DatabaseService(pool);

async function runInitSql() {
    try {
        const initSqlPath = path.resolve(__dirname, '../database-init/init.sql');
        const sqlContent = await readFile(initSqlPath, 'utf-8');
        
        console.debug('[DEBUG] Running SQL initialization from:', initSqlPath);
        await pool.query(sqlContent);
        console.debug('[DEBUG] SQL initialization completed successfully');
    } catch (error: any) {
        if (error.code === '23505') {
            console.warn('[WARN] init.sql: duplicate key violation, skipping initialization');
        } else {
            console.error('[ERROR] Failed to run SQL initialization:', error);
            throw error;
        }
    }
}

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(helmet());
app.use(morgan('combined'));

// Debug request middleware
app.use((req, res, next) => {
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
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

// Default route
app.get('/', (req, res) => {
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

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[ERROR]', err.stack);
    res.status(500).json({
        error: 'Errore interno del server',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({
        error: 'Endpoint non trovato',
        path: req.originalUrl,
        method: req.method
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

// Server startup
async function startServer() {
    try {
        console.log('[INFO] Initializing database...');
        await connectToDatabase();
        await runInitSql();
        await ensureAdminExists();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server in ascolto su http://0.0.0.0:${PORT}`);
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
