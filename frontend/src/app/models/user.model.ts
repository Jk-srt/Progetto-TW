export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'user' | 'admin' | 'airline';
  airline_id?: number; // ID della compagnia aerea per utenti con ruolo 'airline'
  airline_name?: string; // Nome della compagnia aerea
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'user' | 'airline';
  airline_id?: number; // Obbligatorio se role = 'airline'
}
