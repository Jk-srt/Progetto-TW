import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const router = express.Router();

// Configurazione pool PostgreSQL Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

interface JWTPayload {
  id: number;
  email: string;
  role: string;
  type: string;
  airlineId?: number;
  airlineName?: string;
  iataCode?: string;
}

// Estendi l'interfaccia Request per includere user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Middleware per verificare il token JWT
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token di accesso richiesto' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Token non valido' });
    }
    req.user = user;
    next();
  });
};

// Middleware per verificare che l'utente sia admin
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Accesso riservato agli amministratori' });
  }
  next();
};

// Login universale (utenti e admin)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e password sono obbligatori'
      });
    }

    // Cerca l'utente nella tabella accesso
    const accessQuery = `
      SELECT a.*, al.name as airline_name, al.iata_code, al.active as airline_active, u.first_name, u.last_name
      FROM accesso a
      LEFT JOIN airlines al ON a.airline_id = al.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.email = $1
    `;
    
    const result = await pool.query(accessQuery, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }

    const accessUser = result.rows[0];
    
    // Verifica password
    const isValidPassword = await bcrypt.compare(password, accessUser.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }

    // Se è un admin
    if (accessUser.role === 'admin') {
      const token = jwt.sign(
        {
          id: accessUser.id,
          email: accessUser.email,
          role: accessUser.role,
          type: 'admin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: accessUser.id,
          email: accessUser.email,
          role: accessUser.role,
          type: 'admin'
        }
      });
    }

    // Se è una compagnia aerea
    if (accessUser.role === 'airline' && accessUser.airline_id) {
      // Se la compagnia è inactive (airline_active = false) forziamo cambio password
      const mustChangePassword = accessUser.airline_active === false;

      const token = jwt.sign(
        {
          id: accessUser.id,
          email: accessUser.email,
          role: accessUser.role,
          airlineId: accessUser.airline_id,
          airlineName: accessUser.airline_name,
          iataCode: accessUser.iata_code,
          type: 'airline'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: accessUser.id,
          email: accessUser.email,
          role: accessUser.role,
          airlineId: accessUser.airline_id,
          airlineName: accessUser.airline_name,
          iataCode: accessUser.iata_code,
          type: 'airline',
          must_change_password: mustChangePassword,
          airline_active: accessUser.airline_active
        }
      });
    }

    // Utente normale
    if (accessUser.role === 'user' && accessUser.user_id) {
      const token = jwt.sign(
        {
          id: accessUser.id,
          email: accessUser.email,
          role: accessUser.role,
          userId: accessUser.user_id,
          type: 'user'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: accessUser.id,
          email: accessUser.email,
          role: accessUser.role,
          userId: accessUser.user_id,
          first_name: accessUser.first_name,
          last_name: accessUser.last_name,
          type: 'user'
        }
      });
    }

    // Se non corrisponde a nessun ruolo valido
    return res.status(401).json({
      success: false,
      message: 'Accesso non configurato correttamente'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore del server'
    });
  }
});

// Cambio password forzato (solo primo accesso airline)
router.post('/force-change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user; // dal middleware
    const { newPassword } = req.body;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Non autenticato' });
    }
    if (user.role !== 'airline') {
      return res.status(403).json({ success: false, message: 'Solo compagnie aeree' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Nuova password troppo corta (min 6)' });
    }

    // Recupera record accesso per verificare se effettivamente primo accesso (heuristica)
  const q = `SELECT a.id, a.password_hash, a.created_at, a.updated_at, a.airline_id, a.email, al.active as airline_active
         FROM accesso a LEFT JOIN airlines al ON a.airline_id = al.id WHERE a.id = $1`;
    const r = await pool.query(q, [user.id]);
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account non trovato' });
    }
    const row = r.rows[0];
  const mustChange = row.airline_active === false; // uso active come segnale primo accesso
    if (!mustChange) {
      return res.status(400).json({ success: false, message: 'Cambio password non richiesto o già eseguito' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE accesso SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashed, user.id]);
    if (row.airline_id) {
      await pool.query('UPDATE airlines SET active = TRUE, updated_at = NOW() WHERE id = $1', [row.airline_id]);
    }

    // Nuovo token senza must_change_password
    const token = jwt.sign({
      id: user.id,
      email: row.email,
      role: 'airline',
      airlineId: row.airline_id,
      type: 'airline'
    }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      message: 'Password aggiornata',
      token,
      user: {
        id: user.id,
        email: row.email,
        role: 'airline',
        airlineId: row.airline_id,
        type: 'airline',
        must_change_password: false
      }
    });
  } catch (error) {
    console.error('Force change password error:', error);
    res.status(500).json({ success: false, message: 'Errore server' });
  }
});

// Login per compagnie aeree usando credenziali dal database
router.post('/airline/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e password sono obbligatori'
      });
    }

    // Cerca l'utente compagnia aerea nel database
    const userQuery = `
      SELECT u.*, a.name as airline_name, a.iata_code, a.icao_code
      FROM users u
      JOIN airlines a ON u.airline_id = a.id
      WHERE u.email = $1 AND u.role = 'airline' AND u.active = true AND a.active = true
    `;
    
    const result = await pool.query(userQuery, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }

    const user = result.rows[0];
    
    // Verifica password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenziali non valide'
      });
    }

    // Genera token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        airlineId: user.airline_id,
        airlineName: user.airline_name,
        iataCode: user.iata_code,
        type: 'airline'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        airlineId: user.airline_id,
        airlineName: user.airline_name,
        iataCode: user.iata_code,
        type: 'airline'
      }
    });

  } catch (error) {
    console.error('Airline login error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore del server'
    });
  }
});

// CRUD endpoints per la gestione delle compagnie aeree (solo admin)

// GET - Lista tutte le compagnie aeree con credenziali
router.get('/airlines', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT a.id, a.name, a.iata_code, a.icao_code, a.country, a.founded_year, 
             a.website, a.active, a.created_at, a.updated_at,
             acc.email, 
             CASE WHEN acc.id IS NOT NULL THEN true ELSE false END as has_credentials
      FROM airlines a
      LEFT JOIN accesso acc ON acc.airline_id = a.id AND acc.role = 'airline'
      WHERE a.active = true
      ORDER BY a.name
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      airlines: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching airlines:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel caricamento delle compagnie aeree'
    });
  }
});

// POST - Aggiungi nuova compagnia aerea con credenziali
router.post('/airlines', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, iata_code, icao_code, country, founded_year, website, email, password } = req.body;

    // Validazione campi obbligatori
    if (!name || !iata_code || !icao_code || !country) {
      return res.status(400).json({
        success: false,
        message: 'Nome, codice IATA, codice ICAO e paese sono obbligatori'
      });
    }

    // Verifica che i codici non esistano già
    const checkQuery = `
      SELECT id FROM airlines 
      WHERE iata_code = $1 OR icao_code = $2 OR name = $3
    `;
    const checkResult = await pool.query(checkQuery, [iata_code, icao_code, name]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Compagnia aerea, codice IATA o ICAO già esistenti'
      });
    }

    // Se fornite, verifica che email non esista già nella tabella accesso
    if (email) {
      const emailCheckQuery = 'SELECT id FROM accesso WHERE email = $1';
      const emailCheckResult = await pool.query(emailCheckQuery, [email]);
      
      if (emailCheckResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email già in uso'
        });
      }
    }

    // Inserisci nuova compagnia
    const insertQuery = `
      INSERT INTO airlines (name, iata_code, icao_code, country, founded_year, website, active)
      VALUES ($1, $2, $3, $4, $5, $6, FALSE)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      name, iata_code, icao_code, country, founded_year || null, website || null
    ]);

    const airline = result.rows[0];

    // Se fornite credenziali, crea accesso per la compagnia aerea
    if (email && password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const accessInsertQuery = `
        INSERT INTO accesso (email, password_hash, role, airline_id)
        VALUES ($1, $2, 'airline', $3)
        RETURNING email
      `;
      
      await pool.query(accessInsertQuery, [email, hashedPassword, airline.id]);
    }

    res.json({
      success: true,
      message: 'Compagnia aerea aggiunta con successo',
      airline: {
        ...airline,
        email: email || null,
        hasCredentials: !!email,
        active: false
      }
    });

  } catch (error) {
    console.error('Error adding airline:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiunta della compagnia aerea'
    });
  }
});

// PUT - Modifica compagnia aerea esistente con credenziali
router.put('/airlines/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const airlineId = parseInt(req.params.id);
    const { name, iata_code, icao_code, country, founded_year, website, email, password } = req.body;

    // Verifica che la compagnia esista
    const checkQuery = 'SELECT id FROM airlines WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [airlineId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Compagnia aerea non trovata'
      });
    }

    // Verifica duplicati (escludendo la compagnia corrente)
    const duplicateQuery = `
      SELECT id FROM airlines 
      WHERE (iata_code = $1 OR icao_code = $2 OR name = $3) AND id != $4
    `;
    const duplicateResult = await pool.query(duplicateQuery, [iata_code, icao_code, name, airlineId]);
    
    if (duplicateResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Codice IATA, ICAO o nome già in uso da un\'altra compagnia'
      });
    }

    // Se fornita email, verifica che non sia già in uso da altri
    if (email) {
      const emailCheckQuery = `
        SELECT id FROM accesso 
        WHERE email = $1 AND (airline_id != $2 OR airline_id IS NULL)
      `;
      const emailCheckResult = await pool.query(emailCheckQuery, [email, airlineId]);
      
      if (emailCheckResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email già in uso da un\'altra compagnia'
        });
      }
    }

    // Aggiorna la compagnia
    const updateQuery = `
      UPDATE airlines 
      SET name = $1, iata_code = $2, icao_code = $3, country = $4, 
          founded_year = $5, website = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      name, iata_code, icao_code, country, founded_year || null, website || null, airlineId
    ]);

    const airline = result.rows[0];

    // Gestione credenziali accesso
    if (email) {
      // Verifica se esiste già un accesso per questa compagnia
      const existingAccessQuery = 'SELECT id FROM accesso WHERE airline_id = $1 AND role = $2';
      const existingAccessResult = await pool.query(existingAccessQuery, [airlineId, 'airline']);
      
      if (existingAccessResult.rows.length > 0) {
        // Aggiorna accesso esistente
        let updateAccessQuery = `
          UPDATE accesso 
          SET email = $1, updated_at = CURRENT_TIMESTAMP
        `;
        let queryParams = [email, airlineId];
        
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          updateAccessQuery += ', password_hash = $3';
          queryParams = [email, airlineId, hashedPassword];
        }
        
        updateAccessQuery += ' WHERE airline_id = $2 AND role = \'airline\'';
        
        await pool.query(updateAccessQuery, queryParams);
      } else {
        // Crea nuovo accesso
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          const createAccessQuery = `
            INSERT INTO accesso (email, password_hash, role, airline_id)
            VALUES ($1, $2, 'airline', $3)
          `;
          await pool.query(createAccessQuery, [email, hashedPassword, airlineId]);
        }
      }
    }

    res.json({
      success: true,
      message: 'Compagnia aerea aggiornata con successo',
      airline: {
        ...airline,
        email: email || null,
        hasCredentials: !!email
      }
    });

  } catch (error) {
    console.error('Error updating airline:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento della compagnia aerea'
    });
  }
});

// DELETE - Elimina compagnia aerea e relative credenziali (soft delete)
router.delete('/airlines/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const airlineId = parseInt(req.params.id);

    // Verifica che la compagnia esista
    const checkQuery = 'SELECT * FROM airlines WHERE id = $1 AND active = true';
    const checkResult = await pool.query(checkQuery, [airlineId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Compagnia aerea non trovata'
      });
    }

    // Elimina l'accesso associato (se esiste)
    const deleteAccessQuery = `
      DELETE FROM accesso 
      WHERE airline_id = $1 AND role = 'airline'
    `;
    await pool.query(deleteAccessQuery, [airlineId]);

    // Soft delete della compagnia (marca come non attiva invece di eliminare)
    const deleteQuery = `
      UPDATE airlines 
      SET active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(deleteQuery, [airlineId]);

    res.json({
      success: true,
      message: 'Compagnia aerea eliminata con successo',
      airline: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting airline:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione della compagnia aerea'
    });
  }
});

// Endpoint per verificare se l'utente è autorizzato
router.get('/verify', authenticateToken, (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    user: req.user 
  });
});

export default router;
export { authenticateToken };
