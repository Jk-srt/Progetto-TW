const express = require('express');
const mongoose = require('mongoose');
const app = express();
const userRoutes = require('./routes/users');
const flightRoutes = require('./routes/flights');
const routeRoutes = require('./routes/routes');

app.use(express.json());

// Connessione a MongoDB
mongoose.connect('mongodb://localhost:27017/exam_project', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connesso a MongoDB');
}).catch((err) => {
  console.error('Errore connessione MongoDB:', err);
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

app.use('/api/users', userRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/routes', routeRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});
