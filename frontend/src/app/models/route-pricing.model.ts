// Modelli TypeScript per gestire i prezzi per classe

export interface SeatClass {
  id?: number;
  route_id: number;
  seat_class: 'economy' | 'business' | 'first';
  base_price: number;
  created_at?: string;
  updated_at?: string;
}

export interface Route {
  id: number;
  route_name: string;
  departure_airport_id: number;
  arrival_airport_id: number;
  distance_km: number;
  estimated_duration: string;
  default_price: number; // Prezzo economy di default
  status: string;
  departure_airport: string;
  departure_code: string;
  departure_city: string;
  arrival_airport: string;
  arrival_code: string;
  arrival_city: string;
  
  // Prezzi per classe
  pricing?: SeatClass[];
  economy_price?: number;
  business_price?: number;
  first_price?: number;
}

export interface RouteFormData {
  route_name: string;
  departure_airport_id: number;
  arrival_airport_id: number;
  distance_km: number;
  estimated_duration: string;
  default_price: number; // Prezzo economy
  status?: string;
  
  // Prezzi opzionali per altre classi
  business_price?: number;
  first_price?: number;
}

export interface RoutePricingView {
  route_id: number;
  route_name: string;
  departure_airport_id: number;
  arrival_airport_id: number;
  departure_airport: string;
  departure_code: string;
  arrival_airport: string;
  arrival_code: string;
  seat_class: 'economy' | 'business' | 'first';
  base_price: number;
  distance_km: number;
  estimated_duration: string;
  status: string;
}
