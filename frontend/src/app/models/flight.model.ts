export interface Flight {
  id: number;
  flight_number: string;
  airline_id?: number;
  aircraft_id?: number;
  departure_airport_id?: number;
  arrival_airport_id?: number;
  airline_name?: string;
  airline_code?: string;
  aircraft_registration?: string;
  aircraft_type?: string;
  aircraft_model?: string;
  departure_airport: string;
  departure_code?: string;
  departure_city?: string;
  arrival_airport: string;
  arrival_code?: string;
  arrival_city?: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  total_seats: number;
  available_seats: number;
  status: 'scheduled' | 'delayed' | 'cancelled' | 'completed';
  created_at?: string;
  updated_at?: string;
}

export interface Airport {
  id: number;
  name: string;
  iata_code: string;
  city: string;
  country: string;
}

export interface Airline {
  id: number;
  name: string;
  iata_code: string;
}

export interface Aircraft {
  id: number;
  registration: string;
  aircraft_type: string;
  model: string;
  seat_capacity: number;
  airline_name?: string;
}

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
  status: 'scheduled' | 'delayed' | 'cancelled' | 'completed';
}
