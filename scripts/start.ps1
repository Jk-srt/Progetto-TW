# Script PowerShell per avviare il progetto TAW
Write-Host "🐳 Avvio del progetto TAW con Docker..." -ForegroundColor Cyan

# Verifica che Docker sia installato
if (!(Get-Command "docker" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker non è installato. Installalo prima di continuare." -ForegroundColor Red
    exit 1
}

# Costruisce e avvia i container
Write-Host "🔨 Costruzione delle immagini..." -ForegroundColor Yellow
docker compose build

Write-Host "🚀 Avvio dei servizi..." -ForegroundColor Green
docker compose up -d

Write-Host "⏳ Attendendo che i servizi siano pronti..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Controlla lo stato dei servizi
Write-Host "📊 Stato dei servizi:" -ForegroundColor Cyan
docker compose ps

Write-Host ""
Write-Host "✅ Progetto TAW avviato con successo!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:4200" -ForegroundColor Blue
Write-Host "🔧 Backend API: http://localhost:3000" -ForegroundColor Blue
Write-Host ""
Write-Host "📝 Per vedere i log: docker compose logs -f" -ForegroundColor Gray
Write-Host "🛑 Per fermare: docker compose down" -ForegroundColor Gray
