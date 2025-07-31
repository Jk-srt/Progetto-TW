import { Router } from 'express';
import { DatabaseService } from '../models/database';
import pool from '../db/pool';
import { authenticateToken, verifyRole } from '../middleware/auth';

const router = Router();
const db = new DatabaseService(pool);

// List all users (admin only) - solo passeggeri
router.get('/users', authenticateToken, verifyRole('admin'), async (_req, res) => {
    const users = await db.getAllUsers();
    res.json(users);
});

// Delete user by ID (admin only)
router.delete('/users/:id', authenticateToken, verifyRole('admin'), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await db.deleteUserById(id);
    res.sendStatus(204);
});

export default router;
// end of file
