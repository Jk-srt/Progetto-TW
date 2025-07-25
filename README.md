# Progetto TAW - Sistema di Prenotazione Voli ✈️

Un'applicazione full-stack per la gestione e prenotazione di voli, sviluppata con Angular (frontend) e Node.js/Express (backend), utilizzando PostgreSQL come database.

## 🏗️ Architettura

- **Frontend**: Angular 18+ con TypeScript
- **Backend**: Node.js con Express e TypeScript
- **Database**: PostgreSQL (Neon Cloud Database)
- **Containerization**: Docker & Docker Compose

## 🚀 Quick Start

### Prerequisiti
- Docker e Docker Compose installati
- Git
- Un database PostgreSQL (consigliato: Neon)

### 1. Clona il repository
```bash
git clone https://github.com/Jk-srt/Progetto-TW.git
cd Progetto-TW-1
```

### 2. Configura le variabili d'ambiente
```bash
# Copia il file di esempio
cp .env.example .env

# Modifica .env con le tue credenziali PostgreSQL
# DATABASE_URL=postgresql://username:password@host:port/database
```

### 3. Setup e avvio
```bash
# Rendi eseguibili gli script
chmod +x scripts/*.sh

# Setup iniziale (opzionale - installa dipendenze e inizializza DB)
./scripts/setup.sh

# Avvia l'applicazione
./scripts/start.sh
```

### 4. Accedi all'applicazione
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Database Test**: http://localhost:3000/api/db-test

## 🗄️ Database

Il progetto utilizza PostgreSQL con le seguenti tabelle principali:
- `users` - Gestione utenti
- `flights` - Informazioni sui voli
- `bookings` - Prenotazioni
- `passengers` - Dettagli passeggeri

### Inizializzazione Database

Il file `backend/database/init.sql` contiene lo schema completo del database. Per inizializzarlo manualmente:

```bash
psql "postgresql://username:password@host:port/database" -f backend/database/init.sql
```

## 📝 API Endpoints

### Health & Status
- `GET /api/health` - Status dell'applicazione
- `GET /api/db-test` - Test connessione database

### Voli
- `GET /api/flights` - Lista tutti i voli
- `GET /api/flights/search?departure=FCO&arrival=CDG&date=2025-08-01` - Ricerca voli

### Prossimi endpoint (in sviluppo)
- Autenticazione utenti
- Gestione prenotazioni
- Gestione profilo utente

## 🛠️ Sviluppo

### Struttura del progetto
```
├── backend/           # API Node.js/Express
│   ├── src/          # Codice sorgente TypeScript
│   ├── database/     # Script SQL
│   └── Dockerfile    # Container backend
├── frontend/         # App Angular
│   ├── src/          # Codice sorgente TypeScript
│   └── Dockerfile    # Container frontend
├── scripts/          # Script di utilità
└── docker-compose.yml
```

### Comandi utili
```bash
# Logs applicazione
docker compose logs -f

# Logs specifici
docker compose logs -f backend
docker compose logs -f frontend

# Restart servizi
docker compose restart

# Stop applicazione
docker compose down

# Rebuild e restart
docker compose down
docker compose build
docker compose up -d
```

## 🔧 Configurazione

### Variabili d'ambiente (.env)
```env
# Database PostgreSQL
DATABASE_URL=postgresql://username:password@host:port/database

# Backend
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
PORT=3000

# Frontend
ANGULAR_ENV=development
```

## 🤝 Contribuire

1. Fork del repository
2. Crea un branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori informazioni.

## 👥 Autori

- [@Jk-srt](https://github.com/Jk-srt) - Sviluppatore principale

---

**Nota**: Questo progetto è in fase di sviluppo attivo. Alcune funzionalità potrebbero non essere ancora complete.