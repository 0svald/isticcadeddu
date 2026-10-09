# API dei dati – GAS Isticcadeddu

Per gli amministratori: leggere e modificare i dati del foglio senza aprire l'app e senza ripubblicarla.
Il codice è in `apps-script/Api.gs`.

## Come si chiama

Richiesta **POST** all'indirizzo della web app (quello che finisce con `/exec`, lo stesso di `docs/config.js`), con corpo JSON:

```json
{ "chiave": "TOKEN-PERSONALE", "azione": "leggi", "dati": { "scheda": "Soci" } }
```

- **chiave**: il token del tuo link personale da amministratore (la parte dopo `?u=`), oppure `ADMIN_TOKEN`.
  Se rigeneri il link dal pannello, la vecchia chiave smette di funzionare.
- **Non** scrivere la chiave in file del repository né in messaggi condivisi.
- Google risponde con un reindirizzamento: con `curl` serve `-L`.

Risposta: `{ "ok": true, "risultato": … }` oppure `{ "ok": false, "errore": "…" }`.

Esempio con `curl` (dati inventati):

```bash
curl -sL -X POST "https://script.google.com/macros/s/ID-DEPLOYMENT/exec" \
  -H "Content-Type: text/plain" \
  -d '{"chiave":"TOKEN-PERSONALE","azione":"leggi","dati":{"scheda":"Soci","filtro":{"numero_tessera":"0123"}}}'
```

## Regole

- Si può fare solo quello che è nell'elenco qui sotto. **Nessuna cancellazione**: un ordine si annulla, un socio o un prodotto si disattiva.
- Valgono le stesse regole del pannello: per esempio le raccolte concluse sono in sola lettura.
- Ogni modifica finisce nella scheda `Log` con autore `api`. Le letture no.
- Le colonne `token` e `token_accesso` non vengono restituite, a meno di chiedere `"conToken": true`.
- Date nel formato `GG-MM-AAAA` (con ora: `GG-MM-AAAA HH:MM`).

## Azioni

`azioni` restituisce questo elenco, con i campi di ogni azione.

### Lettura

| Azione | Dati |
|---|---|
| `leggi` | `{ scheda, filtro?: {colonna: valore}, conToken? }` – schede: Fornitori, Categorie, Prodotti, Opzioni, Luoghi, Raccolte, Consegne, Ordini, Righe, Soci, Admin, TemplateMessaggi, Log, Aiuto, Segnalazioni, Referenti |
| `ordiniRaccolta` | `{ raccoltaId }` – ordini con le righe |
| `statistiche` | `{ mesi?: 3, 6, 12 o "anno", fornitoreId?, categoria? }` |
| `pdf` | `{ raccoltaId, tipo?: "definitivo" o "provvisorio" }` – il foglio per la consegna in PDF (`filename`, `base64`), come il pulsante del pannello |

### Soci e fornitori

| Azione | Dati |
|---|---|
| `aggiungiSocio` | `{ tessera, nominativo, telefono?, scadenza?, attiva? }` – il link personale viene creato |
| `modificaSocio` | `{ tessera, nuovaTessera?, nominativo?, telefono?, attiva?, scadenza? }` |
| `aggiungiFornitore` | `{ tessera, nome, referente?, telefono?, email?, zona?, descrizione?, emoji? }` – la tessera deve essere di un socio attivo |
| `modificaFornitore` | `{ id, nome?, referente?, telefono?, email?, zona?, descrizione?, emoji?, tessera?, attivo? }` |

### Categorie, prodotti, opzioni

| Azione | Dati |
|---|---|
| `aggiungiCategoria` | `{ nome, emoji? }` – va in fondo alla lista |
| `modificaCategoria` | `{ id, nome?, emoji? }` |
| `salvaProdotto` | nuovo: `{ fornitoreId, nome, categoriaId, prezzo, unita, … }`; modifica: `{ id, …solo i campi da cambiare }`. Campi: `nome, categoriaId, prezzo, unita, modalita, pesoVariabile, passo, note, qtaMin, qtaMax, maxPerOrdine, minConsigliato, attivo` |
| `salvaOpzione` | nuova: `{ prodottoId, nome, tipo, prezzo, … }`; modifica: `{ id, … }`. `tipo`: `variante` o `supplemento` |

### Raccolte e consegne

| Azione | Dati |
|---|---|
| `aggiungiRaccolta` | `{ fornitoreId, chiusura, prodottiIds: [..], maxOrdini?, avvisi?, luogoId?, consegnaId? }` |
| `modificaRaccolta` | `{ id, chiusura?, prodottiIds?, maxOrdini?, avvisi?, fornitoreId?, consegnaId? }` |
| `chiudiRaccolta`, `riapriRaccolta` | `{ id }` |
| `aggiungiConsegna` | `{ data, fascia?, luogoId?, referente?, telefono?, note? }` |
| `modificaConsegna` | `{ id, data?, fascia?, luogoId?, referente?, telefono? }` |

### Ordini

| Azione | Dati |
|---|---|
| `inserisciOrdine` | `{ raccoltaId, tessera, nominativo, righe: [{ prodottoId, opzioneId?, nota?, quantita }], note?, quando? }` |
| `confermaOrdine` | `{ ordineId }` |
| `annullaOrdine` | `{ ordineId, motivo }` |
| `modificaQuantita` | `{ rigaId, quantita }` – maggiore di zero |

`inserisciOrdine` fa gli stessi controlli del form generico: tessera non trovata o non attiva, nome diverso, secondo ordine dello stesso socio → l'ordine entra come `da_verificare`. Si può inserire in una raccolta **aperta o chiusa** (per gli ordini arrivati su WhatsApp), non in una bozza né in una raccolta conclusa. `quando` è l'ora dell'ordine; se manca, si usa l'ora attuale.

### Più operazioni insieme

```json
{ "chiave": "TOKEN-PERSONALE", "azione": "lotto", "dati": { "operazioni": [
  { "azione": "aggiungiSocio", "dati": { "tessera": "0123", "nominativo": "Anna Rossi", "telefono": "333 000 0000" } },
  { "azione": "inserisciOrdine", "dati": { "raccoltaId": "RA0001", "tessera": "0123", "nominativo": "Anna Rossi",
      "quando": "26-09-2026 15:20", "righe": [ { "prodottoId": "P0001", "quantita": 1 } ] } }
] } }
```

Al massimo 200 operazioni. Si eseguono in ordine e ci si ferma alla prima che non riesce: l'errore dice quale, e quelle prima **restano fatte** (sono nel `Log`).
