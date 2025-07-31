import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
  airlineId?: number; // Aggiunto per supportare le compagnie aeree
  airlineName?: string; // Aggiunto per supportare le compagnie aeree
}

// Interfaccia estesa per JWT payload delle compagnie aeree
interface ExtendedJWTPayload extends JwtPayload {
  userId: number;
  role: string;
  airlineId?: number;
  airlineName?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.sendStatus(401);
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET) as ExtendedJWTPayload;
        req.userId = payload.userId;
        req.userRole = payload.role;
        req.airlineId = payload.airlineId; // Aggiunto supporto airline
        req.airlineName = payload.airlineName; // Aggiunto supporto airline
        console.debug('[DEBUG] Token verified for userId:', payload.userId, 'with role:', payload.role);
        if (payload.airlineId) {
            console.debug('[DEBUG] Airline context:', payload.airlineId, payload.airlineName);
        }
        next();
    } catch (err) {
        return res.sendStatus(403);
    }
}

export function verifyRole(requiredRole: string) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (req.userRole !== requiredRole) {
            return res.status(403).json({ error: 'Accesso negato: ruolo non autorizzato' });
        }
        next();
    };
}

// Middleware per verificare che l'utente sia admin di una compagnia aerea
export function verifyAirlineAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    const userRole = req.userRole;
    const airlineId = req.airlineId;

    if (userRole !== 'airline_admin') {
        return res.status(403).json({
            error: 'Accesso riservato agli amministratori delle compagnie aeree'
        });
    }

    if (!airlineId) {
        return res.status(403).json({
            error: 'ID compagnia aerea mancante nel token'
        });
    }

    console.debug('[DEBUG] Airline admin verified:', req.airlineName, '(ID:', airlineId, ')');
    next();
}

// Middleware per verificare accesso ai dati di una specifica compagnia
export function verifyAirlineAccess(req: AuthRequest, res: Response, next: NextFunction) {
    const userRole = req.userRole;
    const userAirlineId = req.airlineId;

    // Estrae l'ID della compagnia dalla richiesta (parametro URL o body)
    const requestedAirlineId = parseInt(req.params.airlineId) ||
                              parseInt(req.body.airline_id) ||
                              parseInt(req.query.airline_id as string);

    if (userRole === 'admin') {
        // Super admin può accedere a tutto
        console.debug('[DEBUG] Super admin access granted');
        next();
    } else if (userRole === 'airline_admin' && userAirlineId === requestedAirlineId) {
        // Admin compagnia può accedere solo ai suoi dati
        console.debug('[DEBUG] Airline admin access granted for own airline:', userAirlineId);
        next();
    } else {
        console.warn('[WARN] Access denied - User airline:', userAirlineId, 'Requested:', requestedAirlineId);
        res.status(403).json({
            error: 'Accesso negato: non puoi accedere ai dati di questa compagnia aerea'
        });
    }
}

// Middleware per verificare che l'utente sia admin generale O admin di compagnia
export function verifyAdminOrAirlineAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    const userRole = req.userRole;

    if (userRole === 'admin' || userRole === 'airline_admin') {
        console.debug('[DEBUG] Admin or airline admin access granted');
        next();
    } else {
        res.status(403).json({
            error: 'Accesso riservato agli amministratori'
        });
    }
}

// Middleware per operazioni che richiedono solo admin generale
export function verifySystemAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    const userRole = req.userRole;

    if (userRole !== 'admin') {
        return res.status(403).json({
            error: 'Accesso riservato all\'amministratore di sistema'
        });
    }

    console.debug('[DEBUG] System admin access granted');
    next();
}

// Helper function per verificare se un utente può gestire una risorsa di una compagnia
export function canAccessAirlineResource(userRole: string, userAirlineId?: number, resourceAirlineId?: number): boolean {
    if (userRole === 'admin') {
        return true; // Super admin può tutto
    }

    if (userRole === 'airline_admin' && userAirlineId === resourceAirlineId) {
        return true; // Admin può gestire solo la sua compagnia
    }

    return false;
}
