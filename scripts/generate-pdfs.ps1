Param(
  [string]$OutDir = "pdf"
)

if (-not (Get-Command pandoc -ErrorAction SilentlyContinue)) {
  Write-Error "Pandoc non trovato. Installalo e riprova."
  exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host "Generazione PDF report..."
Get-ChildItem -Filter 'REPORT_*.md' | ForEach-Object {
  $base = $_.BaseName
  $outFile = Join-Path $OutDir ($base + '.pdf')
  pandoc $_.FullName -o $outFile
  Write-Host "Creato $outFile"
}

Write-Host "Completato. Rinominare i file con convenzione Cognome_Nome_Matricola.pdf se necessario."
