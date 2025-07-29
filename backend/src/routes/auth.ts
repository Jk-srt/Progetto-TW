import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

interface Airline {
  id: number;
  name: string;
  email: string;
  password: string;
  iata_code: string;
}

interface JWTPayload {
  id: number;
  name: string;
  email: string;
  type: string;
}

// Mock database per le compagnie aeree (in produzione sarà nel database)
const airlines: Airline[] = [
  {
    id: 1,
    name: 'Alitalia',
    email: 'admin@alitalia.com',
    password: 'alitalia123', // In produzione sarà hashata
    iata_code: 'AZ'
  },
  {
    id: 2,
    name: 'Lufthansa',
    email: 'admin@lufthansa.com',
    password: 'lufthansa123',
    iata_code: 'LH'
  },
  {
    id: 3,
    name: 'Air France',
    email: 'admin@airfrance.com',
    password: 'airfrance123',
    iata_code: 'AF'
  },
  {
    id: 4,
    name: 'Emirates',
    email: 'admin@emirates.com',
    password: 'emirates123',
    iata_code: 'EK'
  }
];

const JWT_SECRET = 'your-secret-key-here';

// Login per compagnie aeree
router.post('/airline/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Trova la compagnia aerea
    const airline = airlines.find(a => a.email === email && a.password === password);

    if (!airline) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email o password non corretti' 
      });
    }

    // Genera JWT token
    const token = jwt.sign(
      { 
        id: airline.id, 
        name: airline.name, 
        email: airline.email,
        type: 'airline'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: airline.id,
        name: airline.name,
        email: airline.email,
        type: 'airline'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore del server' 
    });
  }
});

// Estendi l'interfaccia Request per includere user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Middleware per verificare il token JWT
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token di accesso richiesto' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Token non valido' });
    }
    req.user = user;
    next();
  });
};

// Endpoint per verificare se l'utente è autorizzato
router.get('/verify', authenticateToken, (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    user: req.user 
  });
});

// Ottieni lista delle compagnie aeree (per demo)
router.get('/airlines', (req: Request, res: Response) => {
  const publicAirlines = airlines.map(({ password, ...airline }) => airline);
  res.json(publicAirlines);
});

export default router;
export { authenticateToken };
