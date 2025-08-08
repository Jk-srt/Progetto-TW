import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Pool } from 'pg';

interface SeatUpdateMessage {
  type: 'seat_update';
  flightId: number;
  seatId: number;
  status: string;
  reserved_by_session?: string;
  expires_at?: Date;
}

interface ClientConnection {
  ws: WebSocket;
  flightId?: number;
  sessionId?: string;
}

class SeatWebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private pool: Pool;

  constructor(server: any) {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = this.generateClientId();
      
      console.log(`🔌 New WebSocket connection: ${clientId}`);
      
      this.clients.set(clientId, { ws });

      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`🔌 WebSocket disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      }));
    });
  }

  private handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe_flight':
        this.subscribeToFlight(clientId, message.flightId, message.sessionId);
        break;
        
      case 'unsubscribe_flight':
        this.unsubscribeFromFlight(clientId);
        break;
        
      case 'ping':
        client.ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;
    }
  }

  private subscribeToFlight(clientId: string, flightId: number, sessionId?: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.flightId = flightId;
    client.sessionId = sessionId;

    console.log(`📡 Client ${clientId} subscribed to flight ${flightId}`);

    client.ws.send(JSON.stringify({
      type: 'subscribed',
      flightId,
      sessionId,
      timestamp: new Date().toISOString()
    }));
  }

  private unsubscribeFromFlight(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const flightId = client.flightId;
    client.flightId = undefined;
    client.sessionId = undefined;

    console.log(`📡 Client ${clientId} unsubscribed from flight ${flightId}`);

    client.ws.send(JSON.stringify({
      type: 'unsubscribed',
      flightId,
      timestamp: new Date().toISOString()
    }));
  }

  // Metodo pubblico per inviare aggiornamenti sui posti
  public broadcastSeatUpdate(flightId: number, seatUpdate: SeatUpdateMessage) {
    console.log(`📢 Broadcasting seat update for flight ${flightId}, seat ${seatUpdate.seatId}`);

    this.clients.forEach((client, clientId) => {
      if (client.flightId === flightId && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify({
            ...seatUpdate,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error(`Error sending update to client ${clientId}:`, error);
          this.clients.delete(clientId);
        }
      }
    });
  }

  // Metodo per inviare aggiornamenti sui timer di prenotazione
  public broadcastReservationUpdate(flightId: number, sessionId: string, seatIds: number[], expiresAt: Date) {
    console.log(`⏰ Broadcasting reservation update for session ${sessionId}`);

    this.clients.forEach((client, clientId) => {
      if (client.flightId === flightId && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify({
            type: 'reservation_update',
            flightId,
            sessionId,
            seatIds,
            expiresAt,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error(`Error sending reservation update to client ${clientId}:`, error);
          this.clients.delete(clientId);
        }
      }
    });
  }

  // Metodo per inviare notifiche di scadenza imminente
  public broadcastExpirationWarning(flightId: number, sessionId: string, seatIds: number[], minutesLeft: number) {
    console.log(`⚠️ Broadcasting expiration warning for session ${sessionId}: ${minutesLeft} minutes left`);

    this.clients.forEach((client, clientId) => {
      if (client.flightId === flightId && client.sessionId === sessionId && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify({
            type: 'expiration_warning',
            flightId,
            sessionId,
            seatIds,
            minutesLeft,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error(`Error sending expiration warning to client ${clientId}:`, error);
          this.clients.delete(clientId);
        }
      }
    });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Metodo per ottenere statistiche delle connessioni
  public getConnectionStats() {
    const stats = {
      totalConnections: this.clients.size,
      flightSubscriptions: {} as Record<number, number>
    };

    this.clients.forEach(client => {
      if (client.flightId) {
        stats.flightSubscriptions[client.flightId] = 
          (stats.flightSubscriptions[client.flightId] || 0) + 1;
      }
    });

    return stats;
  }
}

export default SeatWebSocketService;
