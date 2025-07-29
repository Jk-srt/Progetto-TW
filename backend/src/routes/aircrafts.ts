import express from 'express';
import { DatabaseService } from '../models/database';
import { Pool } from 'pg';

const router = express.Router();

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const dbService = new DatabaseService(pool);

// API Aerei
router.get('/', async (_req: express.Request, res: express.Response) => {
  console.log('[DEBUG] Aircrafts GET / route called');
  try {
      const aircrafts = await dbService.getAllAircrafts();
      res.json(aircrafts);
  } catch (error) {
      res.status(500).json({
            error: 'Errore durante il recupero degli aerei',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.get('/:id', async (req: express.Request, res: express.Response) => {
  console.log('[DEBUG] Aircrafts GET /:id route called with id:', req.params.id);
  try {
      const { id } = req.params;
      const aircraft = await dbService.getAircraftById(parseInt(id));
      if (!aircraft) {
          return res.status(404).json({ error: 'Aereo non trovato' });
        }
        res.json(aircraft);
    } catch (error) {
        res.status(500).json({
            error: 'Errore durante il recupero dell\'aereo',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Endpoint per creare un nuovo aereo (richiede autenticazione admin)
router.post('/', async (req: express.Request, res: express.Response) => {
    try {
        const aircraft = await dbService.createAircraft(req.body);
        res.status(201).json(aircraft);
    } catch (error) {
        res.status(500).json({
            error: 'Errore durante la creazione dell\'aereo',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
