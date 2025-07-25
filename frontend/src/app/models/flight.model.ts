export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  status: 'On Time' | 'Delayed' | 'Boarding' | 'Departed';
  aircraft: string;
}
