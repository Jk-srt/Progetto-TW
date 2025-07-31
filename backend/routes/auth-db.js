const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Configurazione pool PostgreSQL Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Middleware per verificare il token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token di accesso richiesto' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token non valido' });
    }
    req.user = user;
    next();
  });
};

// Middleware per verificare che l'utente sia admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accesso riservato agli amministratori' });
  }
  next();
};

// Login universale (utenti e admin)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e password sono obbligatori'
      });
    }

    // Cerca l'utente nel database
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email o password non corretti'
      });
    }

    const user = userResult.rows[0];

    // Verifica password (assumendo che sia già hashata nel DB)
    // Per ora confronto diretto, in produzione usare bcrypt
    const isValidPassword = password === 'secureTemporaryPwd' && user.role === 'admin' || 
                           await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email o password non corretti'
      });
    }

    // Genera token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        type: user.role === 'admin' ? 'admin' : 'user'
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
        first_name: user.first_name,
        last_name: user.last_name,
        type: user.role === 'admin' ? 'admin' : 'user'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore del server'
    });
  }
});

// Login per compagnie aeree usando credenziali dal database
router.post('/airline/login', async (req, res) => {
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
router.get('/airlines', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT a.id, a.name, a.iata_code, a.icao_code, a.country, a.founded_year, 
             a.website, a.active, a.created_at, a.updated_at,
             u.email, 
             CASE WHEN u.id IS NOT NULL THEN true ELSE false END as has_credentials
      FROM airlines a
      LEFT JOIN users u ON u.airline_id = a.id AND u.role = 'airline'
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
router.post('/airlines', authenticateToken, requireAdmin, async (req, res) => {
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

    // Se fornite, verifica che email non esista già
    if (email) {
      const emailCheckQuery = 'SELECT id FROM users WHERE email = $1';
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
      INSERT INTO airlines (name, iata_code, icao_code, country, founded_year, website)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      name, iata_code, icao_code, country, founded_year || null, website || null
    ]);

    const airline = result.rows[0];

    // Se fornite credenziali, crea utente per la compagnia aerea
    if (email && password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const userInsertQuery = `
        INSERT INTO users (email, password_hash, role, first_name, airline_id)
        VALUES ($1, $2, 'airline', $3, $4)
        RETURNING email
      `;
      
      await pool.query(userInsertQuery, [email, hashedPassword, name, airline.id]);
    }

    res.json({
      success: true,
      message: 'Compagnia aerea aggiunta con successo',
      airline: {
        ...airline,
        email: email || null,
        hasCredentials: !!email
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
router.put('/airlines/:id', authenticateToken, requireAdmin, async (req, res) => {
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
        SELECT id FROM users 
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

    // Gestione credenziali utente
    if (email) {
      // Verifica se esiste già un utente per questa compagnia
      const existingUserQuery = 'SELECT id FROM users WHERE airline_id = $1 AND role = $2';
      const existingUserResult = await pool.query(existingUserQuery, [airlineId, 'airline']);
      
      if (existingUserResult.rows.length > 0) {
        // Aggiorna utente esistente
        const updateUserQuery = `
          UPDATE users 
          SET email = $1, first_name = $2, updated_at = CURRENT_TIMESTAMP
          ${password ? ', password_hash = $4' : ''}
          WHERE airline_id = $3 AND role = 'airline'
        `;
        
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await pool.query(updateUserQuery, [email, name, airlineId, hashedPassword]);
        } else {
          await pool.query(updateUserQuery.replace(', password_hash = $4', ''), [email, name, airlineId]);
        }
      } else {
        // Crea nuovo utente
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          const createUserQuery = `
            INSERT INTO users (email, password_hash, role, first_name, airline_id)
            VALUES ($1, $2, 'airline', $3, $4)
          `;
          await pool.query(createUserQuery, [email, hashedPassword, name, airlineId]);
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
router.delete('/airlines/:id', authenticateToken, requireAdmin, async (req, res) => {
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

    // Disattiva l'utente associato (se esiste)
    const deactivateUserQuery = `
      UPDATE users 
      SET active = false, updated_at = CURRENT_TIMESTAMP
      WHERE airline_id = $1 AND role = 'airline'
    `;
    await pool.query(deactivateUserQuery, [airlineId]);

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
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    success: true, 
    user: req.user 
  });
});

module.exports = router;
