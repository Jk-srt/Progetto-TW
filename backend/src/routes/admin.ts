import { Router } from 'express';
import { DatabaseService } from '../models/database';
import pool from '../db/pool';
import { authenticateToken, verifyRole } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();
const db = new DatabaseService(pool);

// List all users (admin only)
router.get('/users', authenticateToken, verifyRole('admin'), async (_req, res) => {
    const users = await db.getAllUsers();
    res.json(users);
});

// Invite/create airline user (admin only)
router.post('/users/airline', authenticateToken, verifyRole('admin'), async (req, res) => {
    const { email, first_name, last_name, phone } = req.body;
    const tempPassword = Math.random().toString(36).slice(-8);
    const password_hash = await bcrypt.hash(tempPassword, 10);
    const now = new Date();
    const user = await db.createUser({
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        role: 'airlines',
        temporary_password: true,
        created_at: now,
        updated_at: now
    });
    // in real app send email with tempPassword
    res.status(201).json({ user, temporary_password: tempPassword });
});

// Delete user by ID (admin only)
router.delete('/users/:id', authenticateToken, verifyRole('admin'), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await db.deleteUserById(id);
    res.sendStatus(204);
});

export default router;
// end of file
