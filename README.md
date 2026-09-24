# GAS Isticcadeddu – app ordini

App per gestire gli ordini del **Gruppo di Acquisto Solidale** del comitato di quartiere Isticcadeddu, al posto degli ordini via WhatsApp.
Costo zero: Google Fogli + Google Apps Script, con una piccola app installabile pubblicata su GitHub Pages.

## Cosa fa

- **Soci**: link personale senza password, ordini dal telefono con riepilogo prima dell'invio, modifica fino alla chiusura, prossimi ritiri, storico, profilo (tessera, scadenza, contatti), aiuto e segnalazioni.
- **Fornitori**: listino con disponibilità, varianti e supplementi; raccolte con ordini, riepilogo e conferma dei pesi.
- **Amministratori**: "Da fare", raccolte e consegne, messaggi per WhatsApp, PDF per la consegna, soci e link personali, fornitori, categorie, statistiche, amministratori, segnalazioni, registro delle azioni.
- **Automatismi**: chiusura delle raccolte (ogni 15 minuti e a ogni accesso), backup del foglio ogni 6 ore.

## Struttura del repository

| Cartella | Contenuto |
|---|---|
| `apps-script/` | il codice della web app (file `.gs` e `.html` di Apps Script) e `GUIDA-INSTALLAZIONE.md` |
| `docs/` | l'app installabile pubblicata con **GitHub Pages** (manifest, service worker, icone) |
| `guide/` | le guide PDF per soci, fornitori e amministratori, con i sorgenti per rigenerarle |
| `design/` | l'icona del GAS (le quattro mani) in SVG |

## Privacy

Il repository è **pubblico** (GitHub Pages gratuito lo richiede). Non contiene dati: soci, ordini, telefoni e link personali stanno solo nel foglio Google. Il file `.gitignore` esclude fogli di calcolo e CSV. Token, ID del foglio e altre impostazioni sono nelle **proprietà dello script**, non nel codice.
Non caricare mai qui il foglio dati, esportazioni CSV o schermate con dati reali.

## Installazione

Tutti i passaggi sono in [`apps-script/GUIDA-INSTALLAZIONE.md`](apps-script/GUIDA-INSTALLAZIONE.md). In breve:

1. Crea il foglio Google e il progetto Apps Script; copia i file di `apps-script/` (stesso nome e stesso tipo).
2. Imposta le proprietà dello script (`SPREADSHEET_ID`, `APP_URL`, `ADMIN_TOKEN`, …) e pubblica la web app.
3. Esegui una volta `generaTokenSoci`, `installaTriggerChiusura`, `installaTriggerBackup`.
4. Pubblica `docs/` con GitHub Pages e imposta `LINK_BASE_URL` (sezione 12 della guida).

## Lavorare sul codice con clasp (facoltativo)

[clasp](https://github.com/google/clasp) sincronizza la cartella `apps-script/` con il progetto Apps Script, così le modifiche passano da GitHub:

```bash
npm install -g @google/clasp
clasp login
cd apps-script
cp .clasp.json.example .clasp.json   # e inserisci lo scriptId (Impostazioni progetto › ID script)
clasp pull     # scarica il codice dal progetto
clasp push     # carica il codice nel progetto
```

Dopo `clasp push` pubblica comunque una **nuova versione** del deployment (Gestisci deployment › matita › Nuova versione).

## Convenzioni

- Date nel formato **GG-MM-AAAA**.
- Termini: **Socio**, **Fornitore**, **Amministratore**, **Raccolta**, **Consegna**.
- Apps Script non ammette due file con lo stesso nome: gli script legati a una pagina finiscono in `Server` (`Admin.html` / `AdminServer.gs`).
- Lo stile comune è in `Stile.html`; `Profilo.html` e `Aiuto.html` sono condivisi da tutte le pagine.
