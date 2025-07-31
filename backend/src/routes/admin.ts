import { Router } from 'express';
import { DatabaseService } from '../models/database';
import pool from '../db/pool';
import { authenticateToken, verifyRole } from '../middleware/auth';
<<<<<<< HEAD
=======
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
>>>>>>> f7361927cc97ab7bf704e63f8ccdc5bc0652132e

const router = Router();
const db = new DatabaseService(pool);

// List all users (admin only) - solo passeggeri
router.get('/users', authenticateToken, verifyRole('admin'), async (_req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('[ERROR] Failed to get users:', error);
        res.status(500).json({ error: 'Errore nel recupero degli utenti' });
    }
});

// List all airlines for invitation (admin only)
router.get('/airlines-available', authenticateToken, verifyRole('admin'), async (_req, res) => {
    try {
        const query = `
            SELECT a.id, a.name, a.iata_code, a.country,
                   CASE WHEN u.id IS NULL THEN false ELSE true END as has_admin
            FROM airlines a
            LEFT JOIN users u ON a.id = u.airline_id AND u.role = 'airline_admin'
            WHERE a.active = true
            ORDER BY a.name
        `;

        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('[ERROR] Failed to get available airlines:', error);
        res.status(500).json({ error: 'Errore nel recupero delle compagnie aeree' });
    }
});

<<<<<<< HEAD
// Delete user by ID (admin only)
=======
// Invite/create airline user (admin only)
router.post('/invite-airline', authenticateToken, verifyRole('admin'), async (req, res) => {
    try {
        const { airline_id, email, first_name, last_name, phone } = req.body;

        // Verifica che la compagnia aerea esista
        const airlineQuery = 'SELECT id, name, iata_code FROM airlines WHERE id = $1 AND active = true';
        const airlineResult = await pool.query(airlineQuery, [airline_id]);

        if (airlineResult.rows.length === 0) {
            return res.status(404).json({ error: 'Compagnia aerea non trovata o non attiva' });
        }

        const airline = airlineResult.rows[0];

        // Verifica che non esista già un admin per questa compagnia
        const existingAdminQuery = 'SELECT id FROM users WHERE airline_id = $1 AND role = $2';
        const existingAdmin = await pool.query(existingAdminQuery, [airline_id, 'airline_admin']);

        if (existingAdmin.rows.length > 0) {
            return res.status(400).json({
                error: `La compagnia ${airline.name} ha già un amministratore assegnato`
            });
        }

        // Verifica che l'email non sia già in uso
        const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
        const existingUser = await pool.query(existingUserQuery, [email]);

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email già in uso' });
        }

        // Genera password temporanea sicura (12 caratteri)
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        const now = new Date();

        // Crea l'utente admin della compagnia aerea usando il metodo esistente
        const user = await db.createUser({
            email,
            password_hash: passwordHash,
            first_name: first_name || 'Admin',
            last_name: last_name || airline.name,
            phone: phone || '',
            role: 'airline_admin', // Corretto da 'airlines' a 'airline_admin'
            airline_id: airline_id, // Aggiunto campo mancante
            temporary_password: true,
            created_at: now,
            updated_at: now
        });

        console.log(`[INFO] Airline admin invited for ${airline.name}:`, {
            userId: user.id,
            email: user.email,
            airlineId: airline_id,
            airlineName: airline.name
        });

        res.status(201).json({
            message: `Amministratore per ${airline.name} invitato con successo`,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                airline: {
                    id: airline.id,
                    name: airline.name,
                    code: airline.iata_code
                }
            },
            temporary_password: tempPassword, // In produzione, inviare via email sicura
            instructions: 'La password temporanea deve essere cambiata al primo login'
        });

    } catch (error) {
        console.error('[ERROR] Failed to invite airline admin:', error);
        res.status(500).json({ error: 'Errore nella creazione dell\'invito' });
    }
});

// Delete user (admin only)
>>>>>>> f7361927cc97ab7bf704e63f8ccdc5bc0652132e
router.delete('/users/:id', authenticateToken, verifyRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verifica che l'utente non sia l'admin principale
        const userQuery = 'SELECT role, email FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Utente non trovato' });
        }

        const user = userResult.rows[0];
        if (user.role === 'admin') {
            return res.status(403).json({ error: 'Non è possibile eliminare l\'amministratore principale' });
        }

        // Controlla se ci sono prenotazioni associate
        const bookingsCheck = await pool.query(
            'SELECT COUNT(*) as count FROM bookings WHERE user_id = $1',
            [id]
        );

        if (parseInt(bookingsCheck.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Impossibile eliminare: esistono prenotazioni associate'
            });
        }

        const deleteResult = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

        res.json({
            message: 'Utente eliminato con successo',
            user: deleteResult.rows[0]
        });
    } catch (error) {
        console.error('[ERROR] Failed to delete user:', error);
        res.status(500).json({ error: 'Errore nell\'eliminazione dell\'utente' });
    }
});

export default router;
// end of file
