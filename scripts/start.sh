#!/bin/bash
echo "🚀 Avvio sistema TAW Flights con nuova architettura database..."

echo "🐳 Costruzione delle immagini..."
docker compose build

echo "🛫 Avvio dei servizi..."
docker compose up -d

echo "⏳ Attendendo che i servizi siano pronti..."
sleep 10

echo "📊 Stato dei servizi:"
docker compose ps

# Test connessioni
echo ""
echo "🔗 Test connessioni..."
echo "Backend API:" 
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/flights && echo " ✅ OK" || echo " ❌ Error"
echo "Frontend:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:4200 && echo " ✅ OK" || echo " ❌ Error"

echo ""
echo "🎉 Sistema TAW Flights avviato!"
echo "📱 Frontend: http://localhost:4200"
echo "🔧 Backend API: http://localhost:3000"
echo "🧪 Test Sistema: file://$(pwd)/test-sistema-completo.html"
echo ""
echo "👤 Credenziali Admin:"
echo "   Email: admin@example.com"
echo "   Password: secureTemporaryPwd"
echo ""
echo "✈️ Database ristrutturato:"
echo "   - Tabella 'accesso': autenticazione separata"
echo "   - Tabella 'users': solo dati passeggeri"
echo "   - Registrazione utenti completa implementata"
echo ""
echo "📋 Comandi utili:"
echo "   docker compose logs -f    # Vedere i log"
echo "   docker compose down       # Fermare tutto"
