#!/usr/bin/env bash
set -euo pipefail

if ! command -v pandoc >/dev/null 2>&1; then
  echo "Pandoc non trovato. Installalo e riprova." >&2
  exit 1
fi

OUTDIR="pdf"
mkdir -p "$OUTDIR"

echo "Generazione PDF report..."
for f in REPORT_*.md; do
  base="${f%.md}"
  # Attenzione: rinominare manualmente i placeholder prima della consegna finale
  pandoc "$f" -o "$OUTDIR/${base}.pdf" || { echo "Errore conversione $f"; exit 1; }
  echo "Creato $OUTDIR/${base}.pdf"
done

echo "Completato. Rinominare i file secondo convenzione Cognome_Nome_Matricola.pdf se necessario."
