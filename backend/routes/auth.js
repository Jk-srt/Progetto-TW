const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Mock admin user
const admin = {
  id: 0,
  email: 'admin@example.com',
  password: 'secureTemporaryPwd',
  role: 'admin',
  first_name: 'Admin',
  last_name: 'System'
};

// Mock database per le compagnie aeree (in produzione sarà nel database)
let airlines = [
  {
    id: 1,
    name: 'Alitalia',
    email: 'admin@alitalia.com',
    password: 'alitalia123', // In produzione sarà hashata
    iata_code: 'AZ'
  },
  {
    id: 2,
    name: 'Lufthansa',
    email: 'admin@lufthansa.com',
    password: 'lufthansa123',
    iata_code: 'LH'
  },
  {
    id: 3,
    name: 'Air France',
    email: 'admin@airfrance.com',
    password: 'airfrance123',
    iata_code: 'AF'
  },
  {
    id: 4,
    name: 'Emirates',
    email: 'admin@emirates.com',
    password: 'emirates123',
    iata_code: 'EK'
  }
];

const JWT_SECRET = 'your-secret-key-here';

// Login per compagnie aeree
router.post('/airline/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Trova la compagnia aerea
    const airline = airlines.find(a => a.email === email && a.password === password);

    if (!airline) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email o password non corretti' 
      });
    }

    // Genera JWT token
    const token = jwt.sign(
      { 
        id: airline.id, 
        name: airline.name, 
        email: airline.email,
        type: 'airline'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: airline.id,
        name: airline.name,
        email: airline.email,
        type: 'airline'
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

// Login per admin
router.post('/admin/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Verifica credenziali admin
    if (email !== admin.email || password !== admin.password) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email o password non corretti' 
      });
    }

    // Genera token JWT
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        first_name: admin.first_name,
        last_name: admin.last_name,
        type: 'admin'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore del server' 
    });
  }
});

// Middleware per verificare che l'utente sia admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accesso riservato agli amministratori' });
  }
  next();
};

// CRUD endpoints per la gestione delle compagnie aeree (solo admin)

// GET - Lista tutte le compagnie aeree
router.get('/airlines', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    success: true,
    airlines: airlines
  });
});

// POST - Aggiungi nuova compagnia aerea
router.post('/airlines', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, email, password, iata_code } = req.body;

    // Validazione
    if (!name || !email || !password || !iata_code) {
      return res.status(400).json({
        success: false,
        message: 'Tutti i campi sono obbligatori'
      });
    }

    // Verifica che l'email non esista già
    if (airlines.find(a => a.email === email)) {
      return res.status(400).json({
        success: false,
        message: 'Email già in uso'
      });
    }

    // Genera nuovo ID
    const newId = Math.max(...airlines.map(a => a.id), 0) + 1;

    const newAirline = {
      id: newId,
      name,
      email,
      password,
      iata_code
    };

    airlines.push(newAirline);

    res.json({
      success: true,
      message: 'Compagnia aerea aggiunta con successo',
      airline: newAirline
    });

  } catch (error) {
    console.error('Error adding airline:', error);
    res.status(500).json({
      success: false,
      message: 'Errore del server'
    });
  }
});

// PUT - Modifica compagnia aerea esistente
router.put('/airlines/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const airlineId = parseInt(req.params.id);
    const { name, email, password, iata_code } = req.body;

    const airlineIndex = airlines.findIndex(a => a.id === airlineId);
    if (airlineIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Compagnia aerea non trovata'
      });
    }

    // Verifica che l'email non sia usata da altre compagnie
    const emailExists = airlines.find(a => a.email === email && a.id !== airlineId);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email già in uso da un\'altra compagnia'
      });
    }

    // Aggiorna i dati
    airlines[airlineIndex] = {
      ...airlines[airlineIndex],
      name: name || airlines[airlineIndex].name,
      email: email || airlines[airlineIndex].email,
      password: password || airlines[airlineIndex].password,
      iata_code: iata_code || airlines[airlineIndex].iata_code
    };

    res.json({
      success: true,
      message: 'Compagnia aerea aggiornata con successo',
      airline: airlines[airlineIndex]
    });

  } catch (error) {
    console.error('Error updating airline:', error);
    res.status(500).json({
      success: false,
      message: 'Errore del server'
    });
  }
});

// DELETE - Elimina compagnia aerea
router.delete('/airlines/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const airlineId = parseInt(req.params.id);
    
    const airlineIndex = airlines.findIndex(a => a.id === airlineId);
    if (airlineIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Compagnia aerea non trovata'
      });
    }

    const deletedAirline = airlines.splice(airlineIndex, 1)[0];

    res.json({
      success: true,
      message: 'Compagnia aerea eliminata con successo',
      airline: deletedAirline
    });

  } catch (error) {
    console.error('Error deleting airline:', error);
    res.status(500).json({
      success: false,
      message: 'Errore del server'
    });
  }
});

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

// Endpoint per verificare se l'utente è autorizzato
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    success: true, 
    user: req.user 
  });
});

// Ottieni lista delle compagnie aeree (per demo)
router.get('/airlines', (req, res) => {
  const publicAirlines = airlines.map(({ password, ...airline }) => airline);
  res.json(publicAirlines);
});

module.exports = { router, authenticateToken };
