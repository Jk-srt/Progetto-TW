import express from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Registrazione utente
router.post('/register', async (req, res) => {
  console.debug('[DEBUG] POST /register called with body:', req.body);
  try {
    const { first_name, last_name, email, password, phone } = req.body;

    // Verifica se l'utente esiste già
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Utente già esistente con questa email' });
    }

    // Hash della password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (first_name, last_name, email, password_hash, phone, role, temporary_password) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, first_name, last_name, email, phone, role, created_at
    `;
    
    const values = [first_name, last_name, email, hashedPassword, phone, 'user', false];
    const result = await pool.query(query, values);
    
    console.debug('[DEBUG] User saved to DB:', result.rows[0]);
    res.status(201).json({ 
      message: 'Registrazione utente completata', 
      user: result.rows[0] 
    });
  } catch (err: any) {
    console.error('[ERROR] Registration failed:', err);
    res.status(400).json({ error: err.message || 'Errore durante la registrazione' });
  }
});

// Login utente
router.post('/login', async (req, res) => {
  console.debug('[DEBUG] POST /login called with body:', req.body);
  try {
    const { email, password } = req.body;
    console.debug('[DEBUG] Attempting login for email:', email);
    
    const query = 'SELECT id, first_name, last_name, email, password_hash, role, temporary_password FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      console.warn('[WARN] User not found for email:', email);
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = result.rows[0];
    
    // Verifica password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      console.warn('[WARN] Password mismatch for email:', email);
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Genera JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    console.debug('[DEBUG] Login successful for user:', user.email);
    res.json({
      message: 'Login effettuato',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        temporary_password: user.temporary_password
      }
    });
  } catch (error) {
    console.error('[ERROR] Login failed:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Visualizza tutti gli utenti (solo per admin)
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT id, first_name, last_name, email, phone, role, created_at FROM users ORDER BY created_at DESC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Errore nel recupero degli utenti' });
  }
});

// Ottieni profilo utente per ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT id, first_name, last_name, email, phone, role, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Errore nel recupero dell\'utente' });
  }
});

// Aggiorna profilo utente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone } = req.body;

    const query = `
      UPDATE users 
      SET first_name = $1, last_name = $2, email = $3, phone = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 
      RETURNING id, first_name, last_name, email, phone, updated_at
    `;
    
    const values = [first_name, last_name, email, phone, id];
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    res.json({ 
      message: 'Profilo aggiornato con successo', 
      user: result.rows[0] 
    });
  } catch (err: any) {
    console.error('Error updating user:', err);
    if (err.code === '23505') { // Violazione vincolo univoco
      res.status(400).json({ error: 'Email già esistente' });
    } else {
      res.status(400).json({ error: 'Errore nell\'aggiornamento del profilo' });
    }
  }
});

// Elimina utente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Controlla se ci sono prenotazioni associate
    const bookingsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM bookings WHERE user_id = $1',
      [id]
    );
    
    if (parseInt(bookingsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Impossibile eliminare l\'utente: esistono prenotazioni associate' 
      });
    }
    
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    res.json({ 
      message: 'Utente eliminato con successo', 
      user: result.rows[0] 
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Errore nell\'eliminazione dell\'utente' });
  }
});

export default router;
