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
}
