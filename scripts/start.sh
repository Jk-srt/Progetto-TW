#!/usr/bin/env bash

echo "🐳 Avvio del progetto TAW con Docker..."

# Verifica che Docker sia installato
if ! command -v docker &> /dev/null; then
  echo "❌ Docker non è installato. Installalo prima di continuare."
  exit 1
fi

echo "🔨 Costruzione delle immagini..."
docker compose build

echo "🚀 Avvio dei servizi..."
docker compose up -d

echo "⏳ Attendendo che i servizi siano pronti..."
sleep 5

echo "📊 Stato dei servizi:"
docker compose ps

echo

echo "✅ Progetto TAW avviato con successo!"
echo "🌐 Frontend: http://localhost:4200"
echo "🔧 Backend API: http://localhost:3000"

echo

echo "📝 Per vedere i log: docker compose logs -f"
echo "🛑 Per fermare: docker compose down"

