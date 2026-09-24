# CLAUDE.md – App ordini GAS Isticcadeddu

Questo file riassume il progetto per Claude Code: decisioni prese, convenzioni, come si pubblica, cosa resta da fare.
Il progetto è nato in una lunga conversazione su claude.ai; qui c'è tutto ciò che serve per continuare senza quella cronologia.
Tienilo aggiornato quando si prendono decisioni nuove.

## Il progetto in breve

App per gli ordini del **Gruppo di Acquisto Solidale (GAS)** del comitato di quartiere **Isticcadeddu** (Sardegna), che sostituisce gli ordini via WhatsApp.
Vincoli: **budget zero**, strumenti Google, utenti in gran parte anziani e poco pratici di tecnologia.

- Dati: un **foglio Google** (una scheda per tabella).
- Codice: **Google Apps Script** pubblicato come web app (`apps-script/`), *Esegui come: Me*, *Chi ha accesso: Chiunque*.
- App installabile: contenitore su **GitHub Pages** (`docs/`) che mostra le pagine di Apps Script a schermo intero.
- La comunicazione con i soci resta su una **Community WhatsApp** (gruppi di annuncio dove solo gli amministratori scrivono). L'app non scrive su WhatsApp: prepara i testi da copiare, e usa link `wa.me` per aprire le chat.

## Lingua e tono

- Tutto in **italiano**: interfaccia, messaggi, guide, commenti nel codice.
- Linguaggio **semplice e concreto**: frasi brevi, "tocca il pulsante verde", niente gergo tecnico nelle parti per soci e fornitori.
- Terminologia **obbligatoria**: Socio, **Fornitore** (mai "produttore"), **Amministratore** (mai "responsabile"), Raccolta, Consegna, Categoria, Listino. Non inventare termini nuovi.
- Date sempre nel formato **GG-MM-AAAA** (con ora: GG-MM-AAAA HH:MM).
- Negli esempi, nelle schermate e nelle guide usare solo **dati inventati** (es. Anna Rossi, tessera 0123, Caseificio La Collina, 333 000 0000). Mai nomi reali di soci o fornitori.

## Preferenze di lavoro dell'utente

- **Niente anteprime** (pagine dimostrative con dati finti) se non richieste esplicitamente: consegnare i file modificati.
- Per le modifiche all'interfaccia importanti: prima proporre, poi scrivere il codice dopo la conferma.
- Indicare sempre **quali file** sostituire e ricordare di pubblicare una **nuova versione** del deployment.
- Verificare il codice prima di consegnarlo (sintassi, e dove possibile una simulazione della logica).

## Utenti, ruoli e accesso

- **Un solo link personale per persona**, legato alla tessera: `…?u=TOKEN`. Il token è nella colonna `token` della scheda `Soci`. Nessuna password, nessun account Google.
- **Fornitore** e **Amministratore** sono ruoli di un **socio**: tutti i fornitori e gli amministratori sono soci, **non esistono fornitori senza tessera**. Non hanno un token proprio: usano quello del socio.
- `?u=` apre il pannello per gli amministratori, il portale per i fornitori, altrimenti la pagina del socio. Ogni pagina ha la voce **Profilo** per passare agli altri profili della stessa persona.
- Rotte di `doGet` (`WebApp.gs`): `?u=`, `?socio=`, `?fornitore=`, `?admin=` (tutte con lo stesso token), `?form=ID` (form della raccolta, anche anonimo con tessera + nome; `&socio=TOKEN` per la versione precompilata).
- `ADMIN_TOKEN` (proprietà dello script) è solo un **accesso di emergenza**.
- Se un socio viene **disattivato**, i suoi ruoli di amministratore e fornitore **decadono** (segnati come non attivi). Riattivando il socio **non tornano da soli**. Non si può disattivare la propria tessera né l'ultimo amministratore attivo.
- **Rigenera link** invalida il vecchio link per tutti i profili della persona. Il link breve (is.gd / spoo.me) è salvato nella colonna `link_breve` di `Soci`.
- Ogni azione degli amministratori finisce nella scheda `Log` con il loro nome.

## Ordini e raccolte

- Una **raccolta** = un fornitore, con prodotti scelti (`prodotti_ids`), data di **chiusura**, eventuale `max_ordini`. Una **consegna** raggruppa più raccolte (stesso giorno e luogo).
- Stati raccolta: `bozza` → `aperto` → `chiuso` → `definitivo` → `consegnato` → `archiviato`. Stati ordine: `valido`, `da_verificare`, `annullato`.
- Con il **link personale** il socio modifica il proprio ordine **fino alla chiusura**: il nuovo ordine **sostituisce** il precedente.
- Dal **form generico** (tessera + nome) un secondo ordine dello stesso socio **non sostituisce**: diventa `da_verificare` e lo gestiscono amministratori o fornitore.
- Tessera non attiva o scaduta: l'ordine è accettato ma `da_verificare`.
- Chi arriva primo prende il prodotto: nessuna regola di priorità. L'invio degli ordini usa `LockService` solo per evitare numeri d'ordine duplicati.
- **Chiusura automatica** (`Trigger.gs`): trigger ogni 15 minuti **e** controllo a ogni apertura di form, pannello o pagina socio. Date lette in modo tollerante (`parseChiusura_`). `diagnosiChiusura()` spiega perché una raccolta non si chiude.
- Prodotti "a peso": prezzo indicativo finché il fornitore non **conferma il peso**.
- Opzioni di un prodotto: solo **variante** (stesso prezzo, es. gusti) e **supplemento** (costo in più, es. tanica). Niente "formato".
- **Pagamento** in contanti al fornitore, al ritiro: l'app calcola gli importi ma non registra pagamenti.

## PDF di consegna (`Pdf.gs`)

A4 **verticale**, una riga per tessera, una colonna per prodotto (nomi ruotati, vanno a capo se lunghi), importo a fine riga, colonna "Saldato" da spuntare a mano. **Nessun totale complessivo** (il foglio è pubblico). Filigrana: logo completo del comitato; icona delle mani in intestazione.

## Stile e interfaccia

- Stile unico in `Stile.html` (incluso con `<?!= include('Stile') ?>`): colori carta e oliva, **Atkinson Hyperlegible** per il testo (17 px), **Fraunces** per i titoli, pulsanti alti almeno 48 px, etichette di stato sempre con colore **e** parola.
- Niente `alert/confirm/prompt` del browser: usare `chiedi()`, `chiediTesto()`, `avvisa()` di `Stile.html`.
- Icona del GAS: le **quattro mani** del logo del comitato (`design/mani.svg`), incorporata in `Stile.html`. Durante i caricamenti ruota con il movimento "a ribaltamento" (giro completo in 4 quarti) e la scritta "Caricamento…".
- Menu: su telefono barra in basso, su computer menu laterale nel pannello.
- `Profilo.html` e `Aiuto.html` sono condivisi da pagina socio, portale fornitore e pannello.
- Nessuna emoji sui singoli prodotti: resta solo quella della categoria.

## File e convenzioni del codice

- Apps Script **non ammette due file con lo stesso nome** anche se di tipo diverso: gli script legati a una pagina finiscono in `Server` (`Admin.html` / `AdminServer.gs`, `Socio.html` / `SocioServer.gs`, `Aiuto.html` / `AiutoServer.gs`).
- Tutti i `.gs` condividono lo stesso spazio globale: niente `const`/`let` globali duplicati tra file; le funzioni private finiscono con `_`.
- Accesso ai dati solo tramite `Dati.gs`: `leggiTabella`, `leggiTabellaSafe_`, `aggiungiRiga`, `aggiornaCella`, `eliminaRiga_`, `nuovoId`, `tessKey_`, `testoData_`. Le righe con prima cella vuota vengono ignorate, a meno che abbiano un `id`.
- Schede: `Fornitori`, `Categorie`, `Prodotti`, `Opzioni`, `Luoghi`, `Raccolte`, `Consegne`, `Ordini`, `Righe`, `Soci`, `Admin`, `TemplateMessaggi`, `Log`, più `Aiuto`, `Segnalazioni`, `Referenti` (create da sole al primo uso).
- Funzioni chiamate dal pannello: `admin…(token, …)` con `checkToken_(token)` in testa; dal portale: `fornitore…(token, …)`; dal socio: `socioDaToken_(token)`.

## Come si pubblica

1. Modifica i file in `apps-script/`, commit su GitHub.
2. `clasp push` dalla cartella `apps-script/` (configurazione in `.clasp.json`, escluso dal repository; esempio in `.clasp.json.example`).
3. Pubblica una **nuova versione del deployment esistente** (mai un deployment nuovo: cambierebbero tutti i link).
4. Se il codice chiede **nuove autorizzazioni** Google: l'utente le approva nel browser, poi vanno rieseguite `installaTriggerChiusura` e `installaTriggerBackup` (Google sospende i trigger dopo un cambio di permessi).
5. `docs/` si pubblica da solo con GitHub Pages (ramo `main`, cartella `/docs`).

Proprietà dello script (le imposta l'utente dall'editor, mai nel codice): `SPREADSHEET_ID`, `APP_URL`, `ADMIN_TOKEN`, `LINK_BASE_URL`, `FAVICON_URL`, `SHORTENER`, `ACCORCIA_LINK_PERSONALI`, `LOGO_URL`, `GUIDA_SOCI_ID`, `GUIDA_FORNITORI_ID`, `GUIDA_AMMINISTRATORI_ID`.

## Privacy e sicurezza

- Il repository è **pubblico**: mai fogli di calcolo, CSV, esportazioni, token, schermate con dati reali (il `.gitignore` esclude `*.xlsx`, `*.csv`, `.clasp.json`).
- Nome, cognome e tessera dei soci sono considerati "pubblici" nel GAS (compaiono nel PDF di consegna); il telefono lo diventa entrando nella Community.
- I link accorciati sono codici brevi: per gli amministratori si può scegliere di lasciarli lunghi (`ACCORCIA_LINK_PERSONALI` = NO).
- Le guide PDF su Drive restano private: ognuno scarica solo quelle dei propri profili, passando dal server.

## In sospeso / prossimi passi

- **GitHub Pages "vero"**: spostare le pagine su Pages e usare Apps Script solo come servizio. Primo passo concordato: aggiungere al server un punto di accesso per richieste web (solo un elenco di funzioni pubbliche) e, nelle pagine, un adattatore che imita `google.script.run`. Le pagine di Google restano attive durante il passaggio. Ordine: pagina socio e form, poi portale fornitore, poi pannello.
- **Rinforzo del foglio**: schede protette, scritture per id (non per numero di riga), colonne tessera/telefono/date come testo, letture in memoria per richiesta, archivio annuale. Più avanti, se il GAS cresce: valutare **Supabase** come base di dati.
- **Messaggi WhatsApp**: nuovi testi proposti (apertura con giorno della settimana e "(a peso)" invece dell'asterisco, promemoria, chiusura, foglio di consegna senza totali, avviso di ritiro), tutti modificabili dalla scheda `TemplateMessaggi`: **in attesa di approvazione**. Oggi `msgStatoProvvisorio`/`msgStatoDefinitivo` mostrano ancora totali complessivi: da togliere.
- **Import CSV** dei soci: oggi sovrascrive il telefono, anche se il socio l'ha aggiornato dal Profilo. Da decidere se aggiornarlo solo quando è vuoto.
- **Referenti** del comitato e **regole del GAS** (ordini per altri, ritiri mancati, tempi per le modifiche): da definire, poi da aggiungere alle domande frequenti (scheda `Aiuto`).
- Fornitori del foglio senza tessera: vanno collegati a un socio, altrimenti non entrano nel portale.
- Guide PDF (`guide/`): rigenerate il 24-09-2026; da aggiornare quando cambiano le funzioni.
