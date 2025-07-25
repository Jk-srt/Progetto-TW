const express = require('express');
const router = express.Router();
const Route = require('../models/Route');

// Visualizza tutte le rotte
router.get('/', async (req, res) => {
  const routes = await Route.find();
  res.json(routes);
});

// Aggiungi nuova rotta
router.post('/', async (req, res) => {
  try {
    const route = new Route(req.body);
    await route.save();
    res.json({ message: 'Rotta aggiunta', rotta: route });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

