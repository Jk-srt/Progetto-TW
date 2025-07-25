const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Registrazione utente
router.post('/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json({ message: 'Registrazione utente completata', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login utente (mock, senza hash)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) {
    res.json({ message: 'Login effettuato', user: user.email });
  } else {
    res.status(401).json({ error: 'Credenziali non valide' });
  }
});

// Visualizza tutti gli utenti
router.get('/', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

module.exports = router;

