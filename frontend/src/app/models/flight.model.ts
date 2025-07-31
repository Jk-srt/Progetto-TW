export interface Flight {
  id: string;
  flightNumber: string;
  airline?: string;
  aircraft?: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  status: 'On Time' | 'Delayed' | 'Boarding' | 'Departed' | 'scheduled' | 'delayed' | 'cancelled' | 'completed';
  // Campi dal database
  flight_number?: string;
  departure_airport?: string;
  departure_city?: string;
  arrival_airport?: string;
  arrival_city?: string;
  departure_time?: string;
  arrival_time?: string;
  available_seats?: number;
  total_seats?: number;
  airline_id?: number;
  airline_name?: string;
}

// Interfaccia per gli aeroporti basata sul database backend
export interface Airport {
  id: number;
  name: string;
  iata_code: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
}

// Interfaccia per le compagnie aeree basata sul database backend
export interface Airline {
  id: number;
  name: string;
  iata_code: string;
  icao_code?: string;
  country?: string;
  founded_year?: number;
  website?: string;
  logo_url?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Interfaccia per gli aerei basata sul database backend
export interface Aircraft {
  id: number;
  airline_id?: number;
  registration: string;
  aircraft_type: string;
  manufacturer?: string;
  model: string;
  seat_capacity: number;
  business_class_seats?: number;
  economy_class_seats?: number;
  manufacturing_year?: number;
  last_maintenance?: string;
  status?: 'active' | 'maintenance' | 'retired';
  airline_name?: string; // Campo aggiuntivo dalle query JOIN
  created_at?: string;
  updated_at?: string;
}

// Interfaccia per i dati del form di creazione/modifica voli
export interface FlightFormData {
  flight_number: string;
  airline_id: number;
  aircraft_id: number;
  departure_airport_id: number;
  arrival_airport_id: number;
  departure_time: string;
  arrival_time: string;
  price: number;
  total_seats: number;
  available_seats: number;
  status: string;
}
