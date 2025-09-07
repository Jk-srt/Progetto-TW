import express from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

// Middleware di autenticazione
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).userId = payload.userId;
    (req as any).userRole = payload.role;
    next();
  } catch {
    return res.sendStatus(403);
  }
}

// GET: Ottieni prezzi per una rotta specifica
router.get('/route/:routeId', async (req: express.Request, res: express.Response) => {
  try {
    const { routeId } = req.params;
    
    const query = `
      SELECT 
        rp.id,
        rp.route_id,
        rp.seat_class,
        rp.base_price,
        r.route_name
      FROM route_pricing rp
      JOIN routes r ON rp.route_id = r.id
      WHERE rp.route_id = $1
      ORDER BY 
        CASE rp.seat_class 
          WHEN 'economy' THEN 1 
          WHEN 'business' THEN 2 
          WHEN 'first' THEN 3 
        END
    `;
    
    const result = await pool.query(query, [routeId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching route pricing:', error);
    res.status(500).json({ error: 'Errore nel recupero dei prezzi' });
  }
});

// GET: Ottieni tutte le rotte con prezzi
router.get('/routes-with-pricing', async (req: express.Request, res: express.Response) => {
  try {
    const query = `
      SELECT 
        r.id,
        r.route_name,
        r.departure_airport_id,
        r.arrival_airport_id,
        r.distance_km,
        r.estimated_duration,
        r.status,
        dep.name as departure_airport,
        dep.iata_code as departure_code,
        dep.city as departure_city,
        arr.name as arrival_airport,
        arr.iata_code as arrival_code,
        arr.city as arrival_city,
        json_agg(
          CASE WHEN rp.id IS NOT NULL THEN
            json_build_object(
              'seat_class', rp.seat_class,
              'base_price', rp.base_price
            )
          END
        ) FILTER (WHERE rp.id IS NOT NULL) as pricing
      FROM routes r
      LEFT JOIN airports dep ON r.departure_airport_id = dep.id
      LEFT JOIN airports arr ON r.arrival_airport_id = arr.id
      LEFT JOIN route_pricing rp ON r.id = rp.route_id
      GROUP BY r.id, r.route_name, r.departure_airport_id, r.arrival_airport_id,
               r.distance_km, r.estimated_duration, r.status,
               dep.name, dep.iata_code, dep.city,
               arr.name, arr.iata_code, arr.city
      ORDER BY r.route_name
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching routes with pricing:', error);
    res.status(500).json({ error: 'Errore nel recupero delle rotte con prezzi' });
  }
});

// POST: Crea/aggiorna prezzi per una rotta
router.post('/route/:routeId', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { routeId } = req.params;
    let { pricing } = req.body; // Array di { seat_class, base_price }

    if (!Array.isArray(pricing)) {
      return res.status(400).json({ error: 'Formato pricing non valido: atteso array' });
    }

    // Normalizzazione: rimuovi duplicati per seat_class mantenendo l'ultimo
    const map = new Map<string, number>();
    for (const p of pricing) {
      if (!p || !p.seat_class) continue;
      map.set(p.seat_class, Number(p.base_price));
    }
    // Se manca first class, aggiungi con base_price = 0
    if (!map.has('first')) {
      map.set('first', 0);
    }
    // Opzionale: assicura presenza economy (obbligatoria) e business se fornita
    if (!map.has('economy')) {
      return res.status(400).json({ error: 'Prezzo economy obbligatorio' });
    }
    pricing = Array.from(map.entries()).map(([seat_class, base_price]) => ({ seat_class, base_price }));

    // Verifica autorizzazioni
    const userRole = (req as any).userRole;
    if (!['admin', 'airline'].includes(userRole)) {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM route_pricing WHERE route_id = $1', [routeId]);

      for (const price of pricing) {
        await client.query(
          'INSERT INTO route_pricing (route_id, seat_class, base_price) VALUES ($1, $2, $3)',
          [routeId, price.seat_class, price.base_price]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Prezzi aggiornati con successo', pricing });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating route pricing:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento dei prezzi' });
  }
});

// PUT: Aggiorna un singolo prezzo
router.put('/:pricingId', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { pricingId } = req.params;
    const { base_price } = req.body;
    
    const userRole = (req as any).userRole;
    if (!['admin', 'airline'].includes(userRole)) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    const query = `
      UPDATE route_pricing 
      SET base_price = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [base_price, pricingId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prezzo non trovato' });
    }
    
    res.json({ message: 'Prezzo aggiornato', pricing: result.rows[0] });
  } catch (error) {
    console.error('Error updating pricing:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del prezzo' });
  }
});

// DELETE: Elimina un prezzo
router.delete('/:pricingId', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { pricingId } = req.params;
    
    const userRole = (req as any).userRole;
    if (!['admin', 'airline'].includes(userRole)) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    
    const result = await pool.query('DELETE FROM route_pricing WHERE id = $1 RETURNING *', [pricingId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prezzo non trovato' });
    }
    
    res.json({ message: 'Prezzo eliminato' });
  } catch (error) {
    console.error('Error deleting pricing:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del prezzo' });
  }
});

export default router;
