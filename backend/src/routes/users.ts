import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../models/database';

const router = express.Router();

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

// Lista tutti gli utenti (solo per admin)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Accesso riservato agli amministratori' });
    }

    const users = await dbService.getAllUsers();
    res.json({ users });
  } catch (err: any) {
    console.error('[ERROR] Users fetch failed:', err);
    res.status(500).json({ error: 'Errore del server' });
  }
});

export default router;
