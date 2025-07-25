const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');

// Visualizza tutti i voli
router.get('/', async (req, res) => {
  const flights = await Flight.find();
  res.json(flights);
});

// Aggiungi nuovo volo
router.post('/', async (req, res) => {
  try {
    const flight = new Flight(req.body);
    await flight.save();
    res.json({ message: 'Volo aggiunto', volo: flight });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

