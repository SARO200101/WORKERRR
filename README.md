# Officina & Investimenti

Web app PWA in italiano per iOS e desktop. Serve per:
- registrare investimenti in azioni (solo totale investito)
- registrare acquisti e vendite con calcolo profitto/perdita
- gestire promemoria lavori (es. riparazioni)

## Uso rapido
1. Apri index.html in un browser.
2. Aggiungi transazioni e promemoria.
3. I dati restano sul dispositivo (salvataggio locale).

## Installazione su iPhone
- Apri il sito con Safari.
- Usa “Condividi” → “Aggiungi alla schermata Home”.

## Hosting su Cloudflare Pages
Carica questa cartella come progetto statico. Non servono build o dipendenze.

Se vuoi usare la sincronizzazione cloud, serve Pages + Functions + D1 (vedi sotto).

## Sincronizzazione cloud (opzionale)
Questa app include un’API in functions/api/sync.js e una tabella D1.

### 1) Crea il database D1
- Cloudflare Dashboard → D1 → Crea database (es. officina-db).
- Apri il database → “Console” → esegui il contenuto di db/schema.sql.

### 2) Collega D1 al progetto Pages
- Cloudflare Pages → il tuo progetto → Settings → Functions.
- Aggiungi binding D1 con nome: DB (deve essere esattamente DB).

### 3) Deploy con Functions
Per usare functions/ serve deploy tramite Git (consigliato):
- Crea un repository Git e push di questa cartella.
- Collega il repo a Cloudflare Pages.

### 4) Usa la sincronizzazione
Nell’app:
- Inserisci un ID archivio.
- “Carica su cloud” per salvare.
- “Scarica dal cloud” per ripristinare.

## Note
- Le icone in icons/ sono segnaposto: sostituiscile con icone PNG per una resa iOS migliore.
