import express from 'express';
import { DatabaseService } from '../models/database';
import { Pool } from 'pg';

const router = express.Router();

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const dbService = new DatabaseService(pool);

// API Compagnie aeree
router.get('/', async (_req: express.Request, res: express.Response) => {
    try {
        const airlines = await dbService.getAllAirlines();
        res.json(airlines);
    } catch (error) {
        res.status(500).json({
            error: 'Errore durante il recupero delle compagnie aeree',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.get('/:id', async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.params;
        const airline = await dbService.getAirlineById(parseInt(id));
        if (!airline) {
            return res.status(404).json({ error: 'Compagnia aerea non trovata' });
        }
        res.json(airline);
    } catch (error) {
        res.status(500).json({
            error: 'Errore durante il recupero della compagnia aerea',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Endpoint per ottenere gli aerei di una compagnia specifica
router.get('/:id/aircrafts', async (req: express.Request, res: express.Response) => {
    try {
        const { id } = req.params;
        const aircrafts = await dbService.getAircraftsByAirline(parseInt(id));
        res.json(aircrafts);
    } catch (error) {
        res.status(500).json({
            error: 'Errore durante il recupero degli aerei della compagnia',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Endpoint per creare una nuova compagnia aerea (richiede autenticazione admin)
router.post('/', async (req: express.Request, res: express.Response) => {
    try {
        const airline = await dbService.createAirline(req.body);
        res.status(201).json(airline);
    } catch (error) {
        res.status(500).json({
            error: 'Errore durante la creazione della compagnia aerea',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
