const express = require('express');
const router = express.Router();

// Dati mock per i voli
const mockFlights = [
  { 
    id: 1, 
    flight_number: 'AZ123',
    partenza: 'Roma (FCO)', 
    arrivo: 'Milano (MXP)', 
    departure_time: '2025-08-05T08:00:00Z',
    arrival_time: '2025-08-05T09:15:00Z',
    costo: 120,
    available_seats: 150,
    total_seats: 180,
    aircraft_id: 3
  },
  { 
    id: 2, 
    flight_number: 'AZ456',
    partenza: 'Milano (MXP)', 
    arrivo: 'Parigi (CDG)', 
    departure_time: '2025-08-05T14:30:00Z',
    arrival_time: '2025-08-05T16:00:00Z',
    costo: 180,
    available_seats: 89,
    total_seats: 120,
    aircraft_id: 3
  },
  { 
    id: 3, 
    flight_number: 'LH789',
    partenza: 'Roma (FCO)', 
    arrivo: 'Berlino (BER)', 
    departure_time: '2025-08-06T11:20:00Z',
    arrival_time: '2025-08-06T13:45:00Z',
    costo: 210,
    available_seats: 45,
    total_seats: 180,
    aircraft_id: 3
  }
];

// GET /api/flights - Lista voli
router.get('/', (req, res) => {
  const { from, to, date, passengers } = req.query;
  
  console.log('Ricerca voli:', { from, to, date, passengers });
  
  // Filtra voli basato sui parametri (simulazione)
  let filteredFlights = mockFlights;
  
  if (from) {
    filteredFlights = filteredFlights.filter(flight => 
      flight.partenza.toLowerCase().includes(from.toLowerCase())
    );
  }
  
  if (to) {
    filteredFlights = filteredFlights.filter(flight => 
      flight.arrivo.toLowerCase().includes(to.toLowerCase())
    );
  }
  
  res.json({
    success: true,
    flights: filteredFlights,
    total: filteredFlights.length
  });
});

// GET /api/flights/:id - Dettagli volo
router.get('/:id', (req, res) => {
  const flightId = parseInt(req.params.id);
  const flight = mockFlights.find(f => f.id === flightId);
  
  if (!flight) {
    return res.status(404).json({
      success: false,
      message: 'Volo non trovato'
    });
  }
  
  res.json({
    success: true,
    flight
  });
});

module.exports = router;
