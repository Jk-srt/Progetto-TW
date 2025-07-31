import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../models/database';

const router = express.Router();

// Interfaccia per JWT payload esteso
interface ExtendedJWTPayload {
  userId: number;
  email: string;
  role: string;
  airlineId?: number;
  airlineName?: string;
}

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const dbService = new DatabaseService(pool);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Registrazione utente (passeggero)
router.post('/register', async (req: Request, res: Response) => {
  console.debug('[DEBUG] POST /register called with body:', req.body);
  try {
<<<<<<< HEAD
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      phone, 
      date_of_birth, 
      nationality, 
      passport_number 
    } = req.body;
    
    // Validazione campi obbligatori
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ 
        error: 'Email, password, nome e cognome sono obbligatori' 
      });
    }

    // Registra l'utente usando il nuovo metodo
    const result = await dbService.registerUser({
      email,
      password,
      first_name,
      last_name,
      phone,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
      nationality,
      passport_number
    });
    
    console.debug('[DEBUG] User registered successfully:', result.user.id);
    
    // Genera token JWT
    const token = jwt.sign(
      { 
        id: result.accesso.id, 
        email: result.accesso.email, 
        role: result.accesso.role,
        userId: result.user.id,
        type: 'user'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
=======
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
>>>>>>> f7361927cc97ab7bf704e63f8ccdc5bc0652132e
    
    res.status(201).json({ 
      message: 'Registrazione completata con successo', 
      user: {
        id: result.user.id,
        first_name: result.user.first_name,
        last_name: result.user.last_name,
        phone: result.user.phone,
        date_of_birth: result.user.date_of_birth,
        nationality: result.user.nationality,
        passport_number: result.user.passport_number
      },
      token
    });
  } catch (err: any) {
    console.error('[ERROR] Registration failed:', err);
    if (err.message === 'Email già registrata') {
      return res.status(400).json({ error: 'Email già registrata' });
    }
    res.status(400).json({ error: err.message || 'Errore durante la registrazione' });
  }
});

<<<<<<< HEAD
// Middleware per verificare il token JWT
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token di accesso richiesto' });
=======
// Login utente
router.post('/login', async (req, res) => {
  console.debug('[DEBUG] POST /login called with body:', req.body);
  try {
    const { email, password } = req.body;
    console.debug('[DEBUG] Attempting login for email:', email);

    const query = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.role, 
               u.password_hash, u.temporary_password, u.airline_id,
               a.name as airline_name, a.iata_code
        FROM users u 
        LEFT JOIN airlines a ON u.airline_id = a.id
        WHERE u.email = $1`;
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

    // Genera JWT token payload
    const tokenPayload: ExtendedJWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // Se è un admin di compagnia aerea, aggiungere info airline
    if (user.airline_id && user.airline_name) {
      tokenPayload.airlineId = user.airline_id;
      tokenPayload.airlineName = user.airline_name;
    }

    // Controllare se deve cambiare password
    if (user.temporary_password) {
      const tempToken = jwt.sign(tokenPayload, process.env.JWT_SECRET as string, { expiresIn: '1h' });
      return res.json({
        message: 'Password temporanea - cambio richiesto',
        requirePasswordChange: true,
        token: tempToken
      });
    }

    // Token normale per utenti con password definitiva
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET as string, { expiresIn: '24h' });

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
        temporary_password: user.temporary_password,
        airline: user.airline_id ? {
          id: user.airline_id,
          name: user.airline_name,
          code: user.iata_code
        } : null
      }
    });
  } catch (error) {
    console.error('[ERROR] Login failed:', error);
    res.status(500).json({ error: 'Errore interno del server' });
>>>>>>> f7361927cc97ab7bf704e63f8ccdc5bc0652132e
  }

<<<<<<< HEAD
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Token non valido' });
=======
// Cambio password per primo login (compagnie aeree)
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token mancante' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as ExtendedJWTPayload;

    // Verifica password attuale
    const userQuery = 'SELECT password_hash FROM users WHERE id = $1 AND temporary_password = true';
    const userResult = await pool.query(userQuery, [payload.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utente non trovato o password già cambiata' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Password attuale non corretta' });
    }

    // Aggiorna password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, temporary_password = false, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, payload.userId]
    );

    // Genera nuovo token completo
    const newToken = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '24h' });

    res.json({
      message: 'Password cambiata con successo',
      token: newToken
    });

  } catch (error) {
    console.error('[ERROR] Password change failed:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Token non valido' });
    } else {
      res.status(500).json({ error: 'Errore interno del server' });
    }
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
>>>>>>> f7361927cc97ab7bf704e63f8ccdc5bc0652132e
    }
    req.user = user;
    next();
  });
};

// Lista tutti gli utenti (solo per admin)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
<<<<<<< HEAD
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Accesso riservato agli amministratori' });
=======
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
>>>>>>> f7361927cc97ab7bf704e63f8ccdc5bc0652132e
    }

    const users = await dbService.getAllUsers();
    res.json({ users });
  } catch (err: any) {
    console.error('[ERROR] Users fetch failed:', err);
    res.status(500).json({ error: 'Errore del server' });
  }
});

export default router;
