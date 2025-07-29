import express from 'express';
import { DatabaseService } from '../models/database';
import { Pool } from 'pg';

const router = express.Router();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const dbService = new DatabaseService(pool);

console.log('[DEBUG] Airports router loading...');

// Test endpoint per debug
router.get('/test', async (_req: express.Request, res: express.Response) => {
  console.log('[DEBUG] Airports test endpoint called');
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM airports');
    res.json({
      status: 'ok',
      airports_count: result.rows[0].count,
      message: 'Database connection working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search airports - DEVE ESSERE PRIMA di /:id
router.get('/search/:query', async (req: express.Request, res: express.Response) => {
  try {
    const { query } = req.params;
    const searchQuery = `
      SELECT 
        id,
        name,
        iata_code,
        city,
        country,
        latitude,
        longitude
      FROM airports
      WHERE 
        LOWER(name) LIKE LOWER($1) OR 
        LOWER(city) LIKE LOWER($1) OR
        LOWER(iata_code) LIKE LOWER($1) OR
        LOWER(country) LIKE LOWER($1)
      ORDER BY name ASC
      LIMIT 20
    `;
    const result = await pool.query(searchQuery, [`%${query}%`]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching airports:', error);
    res.status(500).json({
      error: 'Errore nella ricerca degli aeroporti',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all airports
router.get('/', async (_req: express.Request, res: express.Response) => {
  console.log('[DEBUG] Airports GET / route called');
  try {
    const query = `
      SELECT 
        id,
        name,
        iata_code,
        city,
        country,
        latitude,
        longitude,
        created_at
      FROM airports
      ORDER BY name ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching airports:', error);
    res.status(500).json({
      error: 'Errore nel recupero degli aeroporti',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get airport by ID
router.get('/:id', async (req: express.Request, res: express.Response) => {
  console.log('[DEBUG] Airports GET /:id route called with id:', req.params.id);
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        id,
        name,
        iata_code,
        city,
        country,
        latitude,
        longitude,
        created_at
      FROM airports
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aeroporto non trovato' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching airport:', error);
    res.status(500).json({
      error: 'Errore nel recupero dell\'aeroporto',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new airport (solo colonne esistenti)
router.post('/', async (req: express.Request, res: express.Response) => {
  try {
    const { name, iata_code, city, country, latitude, longitude } = req.body;
    
    const query = `
      INSERT INTO airports (name, iata_code, city, country, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name, iata_code, city, country, latitude, longitude
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating airport:', error);
    res.status(500).json({
      error: 'Errore nella creazione dell\'aeroporto',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
