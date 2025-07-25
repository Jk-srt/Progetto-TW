import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { DatabaseService } from './models/database';

dotenv.config();

const app = express();

// Converti PORT in number e assicurati sia valido
const PORT = parseInt(process.env.PORT || '3000', 10);

// Configurazione PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Istanza del servizio database
const dbService = new DatabaseService(pool);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

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

// Connessione PostgreSQL
async function connectToDatabase() {
    try {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL non definita nelle variabili d\'ambiente');
        }

        // Test della connessione
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        console.log('✅ Connesso a PostgreSQL (Neon)');
    } catch (error) {
        console.error('❌ Errore connessione database:', error);
        process.exit(1);
    }
}

// Avvio server - CORREZIONE: usa PORT come number e '0.0.0.0' come string
async function startServer() {
    await connectToDatabase();

    // Corretto: PORT è number, '0.0.0.0' è string
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server in ascolto su http://0.0.0.0:${PORT}`);
        console.log(`🌐 Health check: http://0.0.0.0:${PORT}/api/health`);
    });
}

startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
