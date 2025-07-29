const express = require('express');
require('dotenv').config();
const app = express();
// const userRoutes = require('./routes/users');
const flightRoutes = require('./routes/flights');
// const routeRoutes = require('./routes/routes');

app.use(express.json());

// Log middleware per debug
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Query:`, req.query);
  next();
});

// Connessione a Neon PostgreSQL
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL // imposta la variabile d'ambiente con la stringa di connessione Neon
});

client.connect()
  .then(() => {
    console.log('Connesso a Neon PostgreSQL');
  })
  .catch((err) => {
    console.error('Errore connessione Neon PostgreSQL:', err);
  });
app.get('/', (req, res) => {
  res.send('Applicazione avviata!');
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'API funzionante',
    data: {
      utenti: ['admin', 'compagnia1', 'passeggero1'],
      voli: [
        { id: 1, partenza: 'Roma', arrivo: 'Milano', costo: 120 },
        { id: 2, partenza: 'Milano', arrivo: 'Parigi', costo: 180 }
      ]
    }
  });
});

// app.use('/api/users', userRoutes);
app.use('/api/flights', flightRoutes);
// app.use('/api/routes', routeRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});
