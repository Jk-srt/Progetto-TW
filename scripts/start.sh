#!/bin/bash

echo "🐳 Avvio del progetto TAW con Docker..."

# Verifica che Docker sia installato
if ! command -v docker &> /dev/null; then
    echo "❌ Docker non è installato. Installalo prima di continuare."
    exit 1
fi

# Verifica che docker-compose sia disponibile
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose non è disponibile. Aggiorna Docker."
    exit 1
fi

# Crea il file .env se non esiste
if [ ! -f .env ]; then
    echo "📋 Copiando .env.example in .env..."
    cp .env.example .env
    echo "⚠️  Modifica il file .env con i tuoi parametri!"
fi

# Costruisce e avvia i container
echo "🔨 Costruzione delle immagini..."
docker compose build

echo "🚀 Avvio dei servizi..."
docker compose up -d

echo "⏳ Attendendo che i servizi siano pronti..."
sleep 10

# Controlla lo stato dei servizi
echo "📊 Stato dei servizi:"
docker compose ps

# Verifica se ci sono container attivi
RUNNING_CONTAINERS=$(docker compose ps -q)

if [ -z "$RUNNING_CONTAINERS" ]; then
    echo ""
    echo "❌ ERRORE: Nessun container è stato avviato!"
    echo "🔍 Controlla i log per vedere gli errori:"
    echo "   docker compose logs"
    exit 1
else
    echo ""
    echo "✅ Progetto TAW avviato con successo!"
    echo "🌐 Frontend: http://localhost:4200"
    echo "🔧 Backend API: http://localhost:3000"
    echo "☁️  Database: MongoDB Atlas"
fi

echo ""
echo "✅ Progetto TAW avviato con successo!"
echo "🌐 Frontend: http://localhost:4200"
echo "🔧 Backend API: http://localhost:3000"
echo "📊 MongoDB: mongodb://localhost:27017"
echo ""
echo "📝 Per vedere i log: docker compose logs -f"
echo "🛑 Per fermare: docker compose down"
