export interface Route {
  id: number;
  route_name: string;
  departure_airport_id: number;
  arrival_airport_id: number;
  distance_km: number;
  estimated_duration: string;
  default_price: number; // Prezzo economy
  business_price?: number; // Prezzo business
  first_price?: number; // Prezzo first class
  status: string;
  departure_airport: string;
  departure_code: string;
  departure_city: string;
  arrival_airport: string;
  arrival_code: string;
  arrival_city: string;
}

export interface RouteFormData {
  route_name: string;
  departure_airport_id: number;
  arrival_airport_id: number;
  distance_km: number;
  estimated_duration: string;
  default_price: number; // Prezzo economy
  business_price?: number; // Prezzo business opzionale
  first_price?: number; // Prezzo first class opzionale
  status?: string;
}
