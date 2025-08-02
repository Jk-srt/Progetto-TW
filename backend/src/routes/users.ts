import express, { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../models/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

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

// GET /api/users/profile - Ottieni profilo utente corrente
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }

    // Query per ottenere i dati dell'utente basata sul tipo di account
    let userQuery = '';
    let queryParams = [userId];

    if (req.user?.type === 'user') {
      userQuery = `
        SELECT 
          au.id,
          au.email,
          au.role,
          au.created_at,
          u.first_name,
          u.last_name,
          u.phone,
          u.date_of_birth,
          u.nationality
        FROM accesso au
        JOIN users u ON au.user_id = u.id
        WHERE au.id = $1
      `;
    } else if (req.user?.type === 'airline') {
      userQuery = `
        SELECT 
          au.id,
          au.email,
          au.role,
          au.created_at,
          a.name as airline_name,
          a.iata_code,
          a.country
        FROM accesso au
        JOIN airlines a ON au.airline_id = a.id
        WHERE au.id = $1
      `;
    } else {
      // Admin user
      userQuery = `
        SELECT 
          au.id,
          au.email,
          au.role,
          au.created_at,
          'Admin' as first_name,
          'User' as last_name
        FROM accesso au
        WHERE au.id = $1 AND au.role = 'admin'
      `;
    }

    const userResult = await pool.query(userQuery, queryParams);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }

    const userData = userResult.rows[0];

    res.json({
      success: true,
      user: userData
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Errore del server'
    });
  }
});

// PUT /api/users/profile - Aggiorna profilo utente
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { first_name, last_name, email, phone, date_of_birth, nationality } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }

    // Validazione email formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato email non valido'
      });
    }

    // Verifica se l'email esiste già (escludendo l'utente corrente)
    if (email) {
      const emailCheckQuery = 'SELECT id FROM accesso WHERE email = $1 AND id != $2';
      const emailCheckResult = await pool.query(emailCheckQuery, [email, userId]);
      
      if (emailCheckResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email già in uso'
        });
      }
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Aggiorna email in accesso se fornita
      if (email) {
        const updateEmailQuery = 'UPDATE accesso SET email = $1 WHERE id = $2';
        await client.query(updateEmailQuery, [email, userId]);
      }

      // Aggiorna i dati specifici del tipo di utente
      if (req.user?.type === 'user') {
        // Aggiorna tabella users
        const updateUserQuery = `
          UPDATE users 
          SET 
            first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            phone = COALESCE($3, phone),
            date_of_birth = COALESCE($4, date_of_birth),
            nationality = COALESCE($5, nationality),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = (
            SELECT user_id FROM accesso WHERE id = $6
          )
        `;
        
        await client.query(updateUserQuery, [
          first_name,
          last_name,
          phone,
          date_of_birth || null,
          nationality,
          userId
        ]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Profilo aggiornato con successo'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del profilo'
    });
  }
});

// PUT /api/users/change-password - Cambia password utente
router.put('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utente non autenticato'
      });
    }

    // Validazione input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Tutti i campi sono obbligatori'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Le nuove password non corrispondono'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nuova password deve essere lunga almeno 6 caratteri'
      });
    }

    // Ottieni la password corrente dell'utente
    const userQuery = 'SELECT password_hash FROM accesso WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utente non trovato'
      });
    }

    const user = userResult.rows[0];

    // Verifica la password corrente
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Password corrente non corretta'
      });
    }

    // Hash della nuova password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Aggiorna la password nel database
    const updatePasswordQuery = `
      UPDATE accesso 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `;
    
    await pool.query(updatePasswordQuery, [hashedNewPassword, userId]);

    res.json({
      success: true,
      message: 'Password cambiata con successo'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il cambio password'
    });
  }
});

// Middleware per verificare il token JWT (sostituito dall'import)
// const authenticateToken = rimosso

// Lista tutti gli utenti (solo per admin)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
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
