const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth'); // Import del middleware di autenticazione

// Dati mock per testare il frontend
const mockFlights = [
  {
    id: 1,
    flight_number: "AZ123",
    airline_id: 1, // Alitalia
    airline_name: "Alitalia",
    airline_code: "AZ",
    departure_airport: "Leonardo da Vinci International Airport",
    departure_code: "FCO",
    departure_city: "Roma",
    arrival_airport: "Milano Malpensa",
    arrival_code: "MXP",
    arrival_city: "Milano",
    departure_time: "2025-07-30T10:00:00Z",
    arrival_time: "2025-07-30T11:30:00Z",
    price: 150.50,
    total_seats: 180,
    available_seats: 120,
    status: "scheduled",
    aircraft_registration: "I-BIKA",
    aircraft_type: "Airbus",
    aircraft_model: "A320"
  },
  {
    id: 2,
    flight_number: "LH456",
    airline_id: 2, // Lufthansa
    airline_name: "Lufthansa",
    airline_code: "LH",
    departure_airport: "Milano Malpensa",
    departure_code: "MXP",
    departure_city: "Milano",
    arrival_airport: "Frankfurt Airport",
    arrival_code: "FRA",
    arrival_city: "Frankfurt",
    departure_time: "2025-07-30T14:15:00Z",
    arrival_time: "2025-07-30T16:00:00Z",
    price: 220.00,
    total_seats: 220,
    available_seats: 180,
    status: "scheduled",
    aircraft_registration: "D-AIRE",
    aircraft_type: "Airbus",
    aircraft_model: "A321"
  },
  {
    id: 3,
    flight_number: "AF789",
    airline_id: 3, // Air France
    airline_name: "Air France",
    airline_code: "AF",
    departure_airport: "Charles de Gaulle Airport",
    departure_code: "CDG",
    departure_city: "Paris",
    arrival_airport: "Leonardo da Vinci International Airport",
    arrival_code: "FCO",
    arrival_city: "Roma",
    departure_time: "2025-07-30T18:30:00Z",
    arrival_time: "2025-07-30T20:45:00Z",
    price: 180.75,
    total_seats: 200,
    available_seats: 150,
    status: "scheduled",
    aircraft_registration: "F-GKXY",
    aircraft_type: "Airbus",
    aircraft_model: "A319"
  },
  {
    id: 4,
    flight_number: "EK101",
    airline_id: 4, // Emirates
    airline_name: "Emirates",
    airline_code: "EK",
    departure_airport: "Dubai International Airport",
    departure_code: "DXB",
    departure_city: "Dubai",
    arrival_airport: "Milano Malpensa",
    arrival_code: "MXP",
    arrival_city: "Milano",
    departure_time: "2025-07-31T02:15:00Z",
    arrival_time: "2025-07-31T07:30:00Z",
    price: 450.00,
    total_seats: 380,
    available_seats: 320,
    status: "scheduled",
    aircraft_registration: "A6-EUA",
    aircraft_type: "Airbus",
    aircraft_model: "A380"
  },
  {
    id: 5,
    flight_number: "AZ456",
    airline_id: 1, // Alitalia
    airline_name: "Alitalia",
    airline_code: "AZ",
    departure_airport: "Milano Malpensa",
    departure_code: "MXP",
    departure_city: "Milano",
    arrival_airport: "Catania-Fontanarossa Airport",
    arrival_code: "CTA",
    arrival_city: "Catania",
    departure_time: "2025-07-31T09:00:00Z",
    arrival_time: "2025-07-31T11:15:00Z",
    price: 120.25,
    total_seats: 150,
    available_seats: 100,
    status: "scheduled",
    aircraft_registration: "I-BIKB",
    aircraft_type: "Airbus",
    aircraft_model: "A319"
  }
];

const mockAirports = [
  { id: 1, name: "Leonardo da Vinci International Airport", iata_code: "FCO", city: "Roma", country: "Italy" },
  { id: 2, name: "Milano Malpensa", iata_code: "MXP", city: "Milano", country: "Italy" },
  { id: 3, name: "Heathrow Airport", iata_code: "LHR", city: "London", country: "United Kingdom" },
  { id: 4, name: "Charles de Gaulle Airport", iata_code: "CDG", city: "Paris", country: "France" }
];

const mockAirlines = [
  { id: 1, name: "Alitalia", iata_code: "AZ" },
  { id: 2, name: "Lufthansa", iata_code: "LH" },
  { id: 3, name: "Air France", iata_code: "AF" },
  { id: 4, name: "British Airways", iata_code: "BA" }
];

const mockAircrafts = [
  { id: 1, registration: "I-BIKA", aircraft_type: "Airbus", model: "A320", seat_capacity: 180, airline_name: "Alitalia" },
  { id: 2, registration: "D-AIRE", aircraft_type: "Airbus", model: "A321", seat_capacity: 220, airline_name: "Lufthansa" },
  { id: 3, registration: "F-GKXY", aircraft_type: "Boeing", model: "737-800", seat_capacity: 189, airline_name: "Air France" }
];

// Visualizza tutti i voli (pubblico)
router.get('/', async (req, res) => {
  console.log('GET /api/flights - Returning mock flights');
  res.json(mockFlights);
});

// Visualizza voli della compagnia loggata (richiede autenticazione)
router.get('/my-flights', authenticateToken, async (req, res) => {
  if (req.user.type !== 'airline') {
    return res.status(403).json({ error: 'Solo le compagnie aeree possono accedere ai propri voli' });
  }
  
  const myFlights = mockFlights.filter(f => f.airline_id === req.user.id);
  res.json(myFlights);
});

// Visualizza singolo volo per ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const flight = mockFlights.find(f => f.id === parseInt(id));
  
  if (!flight) {
    return res.status(404).json({ error: 'Volo non trovato' });
  }
  
  res.json(flight);
});

// Aggiungi nuovo volo (richiede autenticazione)
router.post('/', authenticateToken, async (req, res) => {
  console.log('POST /api/flights - Creating new flight:', req.body);
  
  // Verifica che l'utente sia una compagnia aerea
  if (req.user.type !== 'airline') {
    return res.status(403).json({ error: 'Solo le compagnie aeree possono aggiungere voli' });
  }
  
  const newFlight = {
    id: mockFlights.length + 1,
    airline_id: req.user.id, // Assegna automaticamente l'ID della compagnia loggata
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  mockFlights.push(newFlight);
  
  res.status(201).json({ 
    message: 'Volo aggiunto con successo', 
    flight: newFlight 
  });
});

// Aggiorna volo esistente (richiede autenticazione)
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const flightIndex = mockFlights.findIndex(f => f.id === parseInt(id));
  
  if (flightIndex === -1) {
    return res.status(404).json({ error: 'Volo non trovato' });
  }

  // Verifica che l'utente sia una compagnia aerea e che possa modificare solo i propri voli
  if (req.user.type !== 'airline') {
    return res.status(403).json({ error: 'Solo le compagnie aeree possono modificare voli' });
  }

  if (mockFlights[flightIndex].airline_id !== req.user.id) {
    return res.status(403).json({ error: 'Puoi modificare solo i voli della tua compagnia' });
  }
  
  mockFlights[flightIndex] = {
    ...mockFlights[flightIndex],
    ...req.body,
    updated_at: new Date().toISOString()
  };
  
  res.json({ 
    message: 'Volo aggiornato con successo', 
    flight: mockFlights[flightIndex] 
  });
});

// Elimina volo (richiede autenticazione)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const flightIndex = mockFlights.findIndex(f => f.id === parseInt(id));
  
  if (flightIndex === -1) {
    return res.status(404).json({ error: 'Volo non trovato' });
  }

  // Verifica che l'utente sia una compagnia aerea e che possa eliminare solo i propri voli
  if (req.user.type !== 'airline') {
    return res.status(403).json({ error: 'Solo le compagnie aeree possono eliminare voli' });
  }

  if (mockFlights[flightIndex].airline_id !== req.user.id) {
    return res.status(403).json({ error: 'Puoi eliminare solo i voli della tua compagnia' });
  }
  
  const deletedFlight = mockFlights.splice(flightIndex, 1)[0];
  
  res.json({ 
    message: 'Volo eliminato con successo', 
    flight: deletedFlight 
  });
});

// Ottieni elenco aeroporti per i dropdown
router.get('/data/airports', async (req, res) => {
  console.log('GET /api/flights/data/airports - Returning mock airports');
  res.json(mockAirports);
});

// Ottieni elenco compagnie aeree per i dropdown
router.get('/data/airlines', async (req, res) => {
  console.log('GET /api/flights/data/airlines - Returning mock airlines');
  res.json(mockAirlines);
});

// Ottieni elenco aerei per i dropdown
router.get('/data/aircrafts', async (req, res) => {
  console.log('GET /api/flights/data/aircrafts - Returning mock aircrafts');
  res.json(mockAircrafts);
});

module.exports = router;
