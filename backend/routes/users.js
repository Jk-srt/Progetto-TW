const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Registrazione utente
router.post('/register', async (req, res) => {
  console.debug('[DEBUG] POST /register called with body:', req.body);
  try {
    console.debug('[DEBUG] Registration data:', req.body);
    const user = new User(req.body);
    console.debug('[DEBUG] New User instance created');
    await user.save();
    console.debug('[DEBUG] User saved to DB:', user);
    res.json({ message: 'Registrazione utente completata', user });
  } catch (err) {
    console.error('[ERROR] Registration failed:', err);
    res.status(400).json({ error: err.message });
  }
});

// Login utente (mock, senza hash)
router.post('/login', async (req, res) => {
  console.debug('[DEBUG] POST /login called with body:', req.body);
  const { email, password } = req.body;
  console.debug('[DEBUG] Attempting login for email:', email);
  const user = await User.findOne({ email, password });
  console.debug('[DEBUG] User lookup result:', user);
  if (user) {
    console.debug('[DEBUG] Login successful for user:', user.email);
    res.json({
      message: 'Login effettuato',
      table: User.collection.name,
      username: user.nome,
      email: user.email
    });
  } else {
    console.warn('[WARN] Login failed for email:', email);
    res.status(401).json({ error: 'Credenziali non valide' });
  }
});

// Visualizza tutti gli utenti
router.get('/', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

module.exports = router;
