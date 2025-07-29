#!/bin/bash
echo "Avvio del progetto TAW con Docker..."

echo "Costruzione delle immagini..."
docker compose build

echo "Avvio dei servizi..."
docker compose up -d

echo "Attendendo che i servizi siano pronti..."
sleep 5

echo "Stato dei servizi:"
docker compose ps

echo ""
echo "Progetto TAW avviato!"
echo "Frontend: http://localhost:4200"
echo "Backend API: http://localhost:3000"
echo ""
echo "Per vedere i log: docker compose logs -f"
echo "Per fermare: docker compose down"
