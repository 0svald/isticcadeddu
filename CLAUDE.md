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
  Si propone di installarla solo con il link personale (`?u=` o già ricordato sul telefono): con il link generico di una raccolta (`?form=`) il manifest non viene inserito e il browser non la considera installabile.
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
- Rami git con **nomi sensati** che descrivono il lavoro (es. `importa-progetto`, `messaggi-whatsapp`), non nomi generati a caso.

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
- **Consegne concluse**: la stessa chiusura automatica, **il giorno dopo la data di consegna**, porta le raccolte `chiuso`/`definitivo` a `consegnato` (`concludiConsegnate_`). Le raccolte senza data di consegna le segna un amministratore ("Segna come consegnata"); "Riporta tra le raccolte in corso" vale solo se la data non è passata. Nessun'altra parte del codice imposta `definitivo` o `archiviato`.
- **Raccolte concluse in sola lettura**: ordini, righe, pesi e dati della raccolta non si modificano più, né dal pannello né dal portale fornitore. Il server lo impone con `bloccaSeConclusa_` / `bloccaOrdineConcluso_` (`Trigger.gs`) in tutte le funzioni che scrivono; il PDF provvisorio (`adminPdfStato`) non si genera. L'unica via per correggere è "Riporta tra le raccolte in corso", se la data di consegna non è passata. Gli ordini rimasti "da verificare" in una raccolta conclusa non compaiono più nelle Notifiche.
- **Storico**: le raccolte concluse (`consegnato`/`archiviato`, `raccoltaConclusa_`) spariscono dalle viste in corso. Socio: Home › Ordini › **Storico** (`socioStorico`, 20 ordini per volta). Pannello: schede **In corso | Storico** in Raccolte e Consegne, per mese, con filtro per fornitore (anche non attivi); il dettaglio di una raccolta conclusa è in **sola lettura**: si vedono gli ordini e si scarica solo il PDF **definitivo**. Portale fornitore: riquadro "Raccolte concluse" in fondo.
- Prodotti "a peso": prezzo indicativo finché il fornitore non **conferma il peso**.
- Opzioni di un prodotto: solo **variante** (stesso prezzo, es. gusti) e **supplemento** (costo in più, es. tanica). Niente "formato".
- **Pagamento** in contanti al fornitore, al ritiro: l'app calcola gli importi ma non registra pagamenti.
- **Statistiche** (pannello, `adminStatistiche(token, {mesi, fornitoreId, categoria})`): filtri Periodo (3, 6, 12 mesi, da inizio anno), Fornitore, Categoria; numeri principali (volume, ordini, **prezzo medio di un ordine** = volume / ordini, soci che hanno ordinato, fornitori attivi) con ▲▼ sul periodo prima della stessa durata; quattro grafici mese per mese; volume per categoria a colonne (4 categorie + "Altro"); "Mostra i numeri" sotto ogni grafico. Il mese di una raccolta è quello della consegna (o della chiusura). Grafici SVG in `Grafici.html` (incluso solo nel pannello), colori validati per chi distingue male i colori.

## PDF di consegna (`Pdf.gs`)

A4 **verticale**, una riga per tessera, una colonna per prodotto (nomi ruotati, vanno a capo se lunghi), importo a fine riga, colonna "Saldato" da spuntare a mano. **Nessun totale complessivo** (il foglio è pubblico). Filigrana: logo completo del comitato; icona delle mani in intestazione.

## Stile e interfaccia

- Stile unico in `Stile.html` (incluso con `<?!= include('Stile') ?>`): colori carta e oliva, **Atkinson Hyperlegible** per il testo (17 px), **Fraunces** per i titoli, pulsanti alti almeno 48 px, etichette di stato sempre con colore **e** parola.
- Niente `alert/confirm/prompt` del browser: usare `chiedi()`, `chiediTesto()`, `avvisa()` di `Stile.html`.
- Icona del GAS: le **quattro mani** del logo del comitato (`design/mani.svg`), incorporata in `Stile.html`. Durante i caricamenti ruota con il movimento "a ribaltamento" (giro completo in 4 quarti) e la scritta "Caricamento…".
- **Home** (tutti i profili): saluto, voce **Notifiche** in cima, poi le sezioni in un **elenco diviso per gruppi** (solo icona e nome, niente riassunti). Socio: *Ordini* (Attivi, Storico) · *La mia tessera* (Profilo, Aiuto). Fornitore: *Vendite* (Raccolte, Listino) · *La mia tessera*. Amministratore: *Ordini* (Raccolte, Consegne) · *Persone* (Soci, Fornitori, Amministratori) · *Gestione* (Categorie, Statistiche, Segnalazioni) · *La mia tessera*.
- Ogni pagina aperta ha in alto il gruppo (piccolo), il titolo e un **riquadro di riepilogo** (`GasUI.riep`, arancione se c'è qualcosa da fare).
- In basso c'è **solo il tasto Home** (`GasUI.barra`), senza numeri. Su computer il pannello ha il menu laterale con gli stessi gruppi (e il tasto Home è nascosto).
- **Notifiche** (prima "Da fare"), per tutti i profili: divise in *Da fare* e *Per sapere*, con colore e parola (Importante, Da fare, Novità, Promemoria) e un pulsante che porta dove serve. Si **calcolano dai dati** a ogni apertura: restano finché l'evento che le ha generate non cambia stato, non si chiudono a mano. Socio e fornitore le calcolano nella pagina dai dati già caricati; il pannello usa `adminDaFare`.
- Componenti comuni in `Stile.html`: `GasUI.home`, `GasUI.riep`, `GasUI.notifiche`, `GasUI.barra`, `GasUI.icona`, `GasUI.data`.
- Selettore a due voci (es. In corso | Storico): classe `.seg` di `Stile.html`, pulsanti con `aria-pressed`.
- `Profilo.html` e `Aiuto.html` sono condivisi da pagina socio, portale fornitore e pannello.
- **Domande frequenti** (scheda `Aiuto`): i testi predefiniti sono in `faqDefault_()` di `AiutoServer.gs`. Quando cambiano, aumentare `FAQ_VERSIONE_` e aggiungere le risposte superate in `FAQ_PRECEDENTI_`: alla prima apertura di Aiuto `aggiornaDomandeAiuto()` aggiorna solo le risposte mai modificate a mano e aggiunge le domande nuove (quelle tolte a mano restano tolte). La versione applicata è nella proprietà `AIUTO_FAQ_VERSIONE` (la scrive il codice).
- **Guide PDF**: gli script `guide/g_soci.py`, `g_forn.py`, `g_adm.py` (con `build_guide.py`) scrivono l'HTML; il PDF si stampa con Chromium (A4, sfondi attivi). Schemi disegnati a mano con dati inventati, non schermate vere.
- Nessuna emoji sui singoli prodotti: resta solo quella della categoria.
- **Categorie**: l'ordine si cambia solo con le frecce ▲▼ nel pannello (`adminSpostaCategoria`); una categoria nuova va in fondo; la colonna `ordine` viene rinumerata 1, 2, 3… così form, portale e messaggi vedono lo stesso ordine.

## File e convenzioni del codice

- Apps Script **non ammette due file con lo stesso nome** anche se di tipo diverso: gli script legati a una pagina finiscono in `Server` (`Admin.html` / `AdminServer.gs`, `Socio.html` / `SocioServer.gs`, `Aiuto.html` / `AiutoServer.gs`).
- Tutti i `.gs` condividono lo stesso spazio globale: niente `const`/`let` globali duplicati tra file; le funzioni private finiscono con `_`.
- Accesso ai dati solo tramite `Dati.gs`: `leggiTabella`, `leggiTabellaSafe_`, `aggiungiRiga`, `aggiornaCella`, `eliminaRiga_`, `nuovoId`, `tessKey_`, `testoData_`. Le righe con prima cella vuota vengono ignorate, a meno che abbiano un `id`.
- Schede: `Fornitori`, `Categorie`, `Prodotti`, `Opzioni`, `Luoghi`, `Raccolte`, `Consegne`, `Ordini`, `Righe`, `Soci`, `Admin`, `TemplateMessaggi`, `Log`, più `Aiuto`, `Segnalazioni`, `Referenti` (create da sole al primo uso).
- Funzioni chiamate dal pannello: `admin…(token, …)` con `checkToken_(token)` in testa; dal portale: `fornitore…(token, …)`; dal socio: `socioDaToken_(token)`.

## Come si pubblica

1. Modifica i file in `apps-script/`, commit su GitHub.
2. Prima di caricare, `clasp pull` in una cartella **separata** e confronto con `apps-script/`: se qualcuno ha modificato il codice dall'editor, `clasp push` lo sovrascriverebbe.
3. `clasp push --force` dalla cartella `apps-script/` (configurazione in `.clasp.json`, escluso dal repository; esempio in `.clasp.json.example`).
4. Pubblica una **nuova versione del deployment esistente** (mai un deployment nuovo: cambierebbero tutti i link):
   `clasp create-deployment -i <ID-DEPLOYMENT> -d "descrizione"` (con clasp più vecchi: `clasp deploy -i …`).
   L'ID del deployment è quello dentro l'indirizzo in `docs/config.js` (inizia con `AKfycbzY888…`). `clasp list-deployments` mostra la versione in uso.
5. Se il codice chiede **nuove autorizzazioni** Google: l'utente le approva nel browser, poi vanno rieseguite `installaTriggerChiusura` e `installaTriggerBackup` (Google sospende i trigger dopo un cambio di permessi).
6. `docs/` si pubblica da solo con GitHub Pages (ramo `main`, cartella `/docs`).

Note su clasp e Claude Code:
- Claude pubblica su Apps Script (push e deployment) **solo con l'autorizzazione esplicita** dell'utente, ogni volta.
- Credenziali di clasp (`~/.clasprc.json`): mai in chat né nel repository. Per le sessioni cloud vanno nella variabile d'ambiente `CLASPRC_JSON` dell'ambiente, da scrivere in `~/.clasprc.json` all'avvio.
- Le pagine si vedono dentro l'app installabile solo se il server le marca con `setXFrameOptionsMode(ALLOWALL)` (in `conFavicon_` di `WebApp.gs`): altrimenti l'app mostra "script.google.com refused to connect".
- Ultima pubblicazione: versione **58** del deployment, 25-09-2026 (codice uguale al ramo `main`: categorie ordinate con le frecce).

Proprietà dello script (le imposta l'utente dall'editor, mai nel codice): `SPREADSHEET_ID`, `APP_URL`, `ADMIN_TOKEN`, `LINK_BASE_URL`, `FAVICON_URL`, `SHORTENER`, `ACCORCIA_LINK_PERSONALI`, `LOGO_URL`, `GUIDA_SOCI_ID`, `GUIDA_FORNITORI_ID`, `GUIDA_AMMINISTRATORI_ID`.

## Privacy e sicurezza

- Il repository è **pubblico**: mai fogli di calcolo, CSV, esportazioni, token, schermate con dati reali (il `.gitignore` esclude `*.xlsx`, `*.csv`, `.clasp.json`).
- Nome, cognome e tessera dei soci sono considerati "pubblici" nel GAS (compaiono nel PDF di consegna); il telefono lo diventa entrando nella Community.
- I link accorciati sono codici brevi: per gli amministratori si può scegliere di lasciarli lunghi (`ACCORCIA_LINK_PERSONALI` = NO).
- Le guide PDF su Drive restano private: ognuno scarica solo quelle dei propri profili, passando dal server.

## In sospeso / prossimi passi

Le idee di nuove funzioni dell'utente sono in **`RICHIESTE.md`** (una sezione per richiesta, con domande aperte e stato): aggiornale lì quando si decide o si realizza qualcosa.

- **GitHub Pages "vero"**: spostare le pagine su Pages e usare Apps Script solo come servizio. Primo passo concordato: aggiungere al server un punto di accesso per richieste web (solo un elenco di funzioni pubbliche) e, nelle pagine, un adattatore che imita `google.script.run`. Le pagine di Google restano attive durante il passaggio. Ordine: pagina socio e form, poi portale fornitore, poi pannello.
- **Rinforzo del foglio**: schede protette, scritture per id (non per numero di riga), colonne tessera/telefono/date come testo, letture in memoria per richiesta, archivio annuale. Più avanti, se il GAS cresce: valutare **Supabase** come base di dati.
- **Messaggi WhatsApp**: nuovi testi proposti (apertura con giorno della settimana e "(a peso)" invece dell'asterisco, promemoria, chiusura, foglio di consegna senza totali, avviso di ritiro), tutti modificabili dalla scheda `TemplateMessaggi`: **in attesa di approvazione**. Oggi `msgStatoProvvisorio`/`msgStatoDefinitivo` mostrano ancora totali complessivi: da togliere.
- **Import CSV** dei soci: oggi sovrascrive il telefono, anche se il socio l'ha aggiornato dal Profilo. Da decidere se aggiornarlo solo quando è vuoto.
- **Referenti** del comitato e **regole del GAS** (ordini per altri, ritiri mancati, tempi per le modifiche): da definire, poi da aggiungere alle domande frequenti (scheda `Aiuto`).
- **`LINK_BASE_URL`**: da impostare a `https://0svald.github.io/isticcadeddu/` perché i nuovi link personali aprano l'app installabile; dopo, eseguire una volta `azzeraLinkBrevi()`.
- Fornitori del foglio senza tessera: vanno collegati a un socio, altrimenti non entrano nel portale.
- Guide PDF (`guide/`): rigenerate il 25-09-2026 con Home, Notifiche, Storico e raccolte concluse, e caricate su Drive. Quando cambiano: stesso file, "Gestisci versioni", così l'ID in `GUIDA_*_ID` non cambia.
