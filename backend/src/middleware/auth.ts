import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.sendStatus(401);
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload & { userId: number; role: string };
        req.userId = payload.userId;
        req.userRole = payload.role;
        console.debug('[DEBUG] Token verified for userId:', payload.userId, 'with role:', payload.role);
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
