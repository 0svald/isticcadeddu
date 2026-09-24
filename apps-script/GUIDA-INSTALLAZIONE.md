# Guida di installazione – App ordini GAS Isticcadeddu

Aggiornata al 23-09-2026. Stack: Google Fogli + Apps Script, costo zero.

## 1. Il foglio dati

Il foglio Google contiene le schede: `Fornitori`, `Categorie`, `Prodotti`, `Opzioni`, `Luoghi`, `Raccolte`, `Consegne`, `Ordini`, `Righe`, `Soci`, `Admin`, `TemplateMessaggi`, `Log`.

Colonne aggiunte di recente (se usi un foglio vecchio, aggiungile in fondo; molte il codice le crea da solo quando servono):

| Scheda | Colonne |
|---|---|
| `Soci` | `token`, `link_breve`, `email` |
| `Ordini` | `note` |
| `Raccolte` | `consegna_id`, `prodotti_ids`, `max_ordini`, `link_breve` |
| `Admin` | `id`, `nome`, `numero_tessera`, `attivo` |
| `Fornitori` | `numero_tessera` (obbligatoria: ogni fornitore è un socio) |

Le date sono sempre nel formato **GG-MM-AAAA** (con l'ora: GG-MM-AAAA HH:MM).

## 2. I file del progetto Apps Script

Crea nel progetto (pulsante **+** accanto a "File") un file per ciascuno, con **lo stesso nome** e il **tipo** indicato. Apps Script non ammette due file con lo stesso nome, anche se di tipo diverso: per questo i file di script legati a una pagina finiscono in `Server`.

**Script (.gs)**

| File | Contenuto |
|---|---|
| `Dati` | lettura e scrittura del foglio, date, utilità |
| `WebApp` | indirizzi della web app (`?u=`, `?form=`, `?socio=`, `?fornitore=`, `?admin=`), stile condiviso, link delle raccolte |
| `Ordini` | dati del form e salvataggio degli ordini |
| `Messaggi` | testi per WhatsApp |
| `Pdf` | foglio di consegna in PDF (A4 verticale, con logo in filigrana) |
| `Short` | accorciatore dei link (is.gd, spoo.me) |
| `AdminServer` | funzioni del pannello amministratori |
| `FornitoreServer` | funzioni del portale fornitore |
| `SocioServer` | pagina del socio, link personali, ruoli |
| `SociImport` | elenco soci, import/export CSV |
| `Consegne` | consegne, luoghi, avviso di ritiro |
| `Trigger` | chiusura automatica delle raccolte |
| `Backup` | copia automatica del foglio ogni 6 ore |
| `AiutoServer` | sezione Aiuto: domande frequenti, segnalazioni, contatti, guide |

**HTML (.html)**

| File | Pagina |
|---|---|
| `Stile` | stile comune a tutte le pagine (colori, caratteri, pulsanti, finestre di conferma) |
| `Profilo` | schermata "Profilo", comune a pagina del socio, portale fornitore e pannello |
| `Aiuto` | sezione "Aiuto", comune a tutte le pagine (nel form d'ordine si apre da "Serve aiuto?") |
| `Form` | form d'ordine |
| `Socio` | pagina personale del socio |
| `Fornitore` | portale del fornitore |
| `Admin` | pannello amministratori |

**Manifest:** Impostazioni progetto › "Mostra il file manifest appsscript.json", poi incolla `appsscript.json`.

## 3. Proprietà dello script

Impostazioni progetto › Proprietà script:

| Proprietà | Valore |
|---|---|
| `SPREADSHEET_ID` | l'ID del foglio (nell'indirizzo, tra `/d/` e `/edit`) |
| `APP_URL` | l'indirizzo `/exec` del deployment (dopo il punto 4) |
| `ADMIN_TOKEN` | parola segreta di **emergenza** per entrare nel pannello |
| `SHORTENER` | facoltativa: `auto` (predefinito), `isgd`, `spoome`, `off` |
| `ACCORCIA_LINK_PERSONALI` | facoltativa: `NO` per lasciare lunghi i link personali |
| `LOGO_URL` | facoltativa: logo per la filigrana dei PDF (e favicon, se non c'è `FAVICON_URL`) |
| `GUIDA_SOCI_ID`, `GUIDA_FORNITORI_ID`, `GUIDA_AMMINISTRATORI_ID` | ID dei PDF delle guide su Drive (file privati: ognuno scarica solo le guide dei propri profili) |
| `LINK_BASE_URL` | indirizzo dell'app installabile su GitHub Pages (es. `https://nome.github.io/gas-isticcadeddu/`): i link personali e delle raccolte puntano lì |
| `FAVICON_URL` | icona della scheda del browser: indirizzo https del file `mani-sfondo-180.png` caricato sul sito del comitato |

## 4. Pubblicazione

1. **Esegui il deployment › Nuovo deployment › App web**.
2. *Esegui come*: **Me**. *Chi ha accesso*: **Chiunque**.
3. Concedi le autorizzazioni (foglio, servizi esterni, trigger, Drive per i backup).
4. Copia l'indirizzo `/exec` nella proprietà `APP_URL`.

**Per ogni modifica successiva:** Esegui il deployment › Gestisci deployment › matita › **Nuova versione**. Mai "Nuovo deployment", altrimenti cambiano tutti gli indirizzi.

## 5. Operazioni da fare una volta sola (dall'editor)

Seleziona la funzione in alto e premi **Esegui**:

1. `generaTokenSoci` – crea il link personale per tutti i soci (i vecchi link di amministratori e fornitori restano validi). Si può fare anche dal pannello: Soci › Import/Export › "Crea i link mancanti".
2. `installaTriggerChiusura` – ogni 15 minuti chiude le raccolte scadute o al numero massimo di ordini. Le raccolte scadute vengono chiuse anche quando qualcuno apre il form o il pannello. Se una raccolta resta aperta, esegui `diagnosiChiusura` e leggi il risultato nel log di esecuzione. **Dopo ogni cambio di autorizzazioni** (per esempio quando Google chiede nuovi permessi) riesegui `installaTriggerChiusura` e `installaTriggerBackup`.
3. `installaTriggerBackup` – copia del foglio ogni 6 ore nella cartella Drive "GAS Backup", tiene l'ultima settimana.

## 6. Come si entra

Ogni persona ha **un solo link personale**, legato alla sua tessera: `…/exec?u=TOKEN`.

- Un **amministratore** entra nel pannello; un **fornitore** nel suo portale; gli altri soci nella loro pagina.
- In ogni pagina c'è la voce di menu **Profilo**: dati della tessera e scadenza, telefono ed email modificabili dal socio, e il passaggio agli altri profili della stessa persona (pagina del socio, portale fornitore, pannello).
- Il link si invia dal pannello: scheda del socio › **Invia link** (apre WhatsApp con il messaggio pronto). Il link breve viene salvato nella colonna `link_breve` di Soci.
- **Rigenera link** disattiva il vecchio link per tutti i profili della persona.
- Gli amministratori e i fornitori **non hanno un link proprio**: usano quello del socio.
- Se un socio viene **disattivato**, i suoi ruoli di amministratore e fornitore decadono (restano segnati come non attivi; riattivando il socio vanno riassegnati).
- Il form d'ordine resta raggiungibile anche con il link della raccolta (`?form=`), con tessera e nome.
- `ADMIN_TOKEN` è solo per le emergenze (es. nessun amministratore attivo).

## 7. Prova rapida

1. Apri il pannello con il tuo link personale (o `…/exec?admin=ADMIN_TOKEN`).
2. **Da fare**: verifica che si carichi.
3. **Raccolte › +**: crea una raccolta, poi aprila e genera il messaggio di apertura.
4. **Apri form**: fai un ordine di prova e controlla che compaia in "Gestisci ordini".
5. Scarica il **PDF provvisorio** e controlla la filigrana.
6. **Soci**: premi "Invia link" su un socio di prova, apri il link e controlla la pagina personale.

## 8. Sicurezza e manutenzione

- I link personali sono come chiavi: non vanno inoltrati. Se uno circola, **Rigenera link**.
- Un link accorciato è un codice breve che in teoria si può indovinare, e il servizio esterno vede il link completo. Per gli amministratori valutate `ACCORCIA_LINK_PERSONALI` = `NO`.
- Ogni azione degli amministratori finisce nel **Registro azioni** (scheda Log), con il nome di chi l'ha fatta.
- Oltre ai backup automatici, prima di grandi modifiche fate **File › Crea una copia** del foglio.

## 9. In sospeso

- Nuovi testi dei messaggi WhatsApp, pulsanti "Promemoria" e "Foglio di consegna": in attesa di approvazione.
- Guide per soci, fornitori e amministratori: da aggiornare con pagina personale, link unico e nuovo stile.

## 10. Icona del GAS

L'icona con le quattro mani (dal logo del comitato) è già inserita nell'app: testate di tutte le pagine, schermate di caricamento e intestazione dei PDF. Per usarla anche come **favicon** (l'icona nella scheda del browser) carica `mani-sfondo-180.png` nella libreria media del sito del comitato e metti il suo indirizzo nella proprietà `FAVICON_URL`. I file sorgente (SVG) sono nella cartella `favicon`.

## 11. Sezione Aiuto

- **Domande frequenti**: scheda `Aiuto` del foglio (creata al primo uso con domande generiche). Colonne: `ruolo` (socio, fornitore, admin), `domanda`, `risposta`, `ordine`, `attivo`. Ognuno vede solo le domande dei propri profili.
- **Referenti**: scheda `Referenti` (nome, argomento, telefono, email, attivo). Finché è vuota, i Contatti mostrano "in via di definizione".
- **Segnalazioni**: scheda `Segnalazioni`. Le nuove compaiono in "Da fare" e nella sezione Segnalazioni del pannello, per tutti gli amministratori; quelle tecniche sono segnate come tali per il referente tecnico. L'app allega da sola pagina, tipo di telefono e ultimo errore mostrato.
- **Guide**: carica i PDF su Drive (non serve condividerli), copia l'ID di ogni file e mettilo nelle proprietà `GUIDA_…_ID`.

## 12. App installabile (GitHub Pages)

Le pagine di Apps Script non si possono "installare" sul telefono. Per questo il repository contiene, nella cartella `docs/`, una piccola app che le mostra a schermo intero e che Chrome propone di installare, con l'icona delle quattro mani.

1. In `docs/config.js` scrivi l'indirizzo `/exec` della web app.
2. Su GitHub: Settings › Pages › "Deploy from a branch" › ramo `main`, cartella `/docs`. Dopo un minuto l'app è su `https://<utente>.github.io/<repository>/`.
3. In Apps Script imposta la proprietà `LINK_BASE_URL` con quell'indirizzo ed esegui una volta `azzeraLinkBrevi` (i link brevi salvati puntavano al vecchio indirizzo).
4. Pubblica una **nuova versione** del deployment: le pagine ora si possono mostrare dentro l'app.
5. Imposta `FAVICON_URL` con `https://<utente>.github.io/<repository>/icons/icon-192.png`.

Da quel momento "Invia link" manda il link dell'app: al primo accesso il telefono se lo ricorda e Chrome propone "Installa". I link già consegnati continuano a funzionare, ma aprono la web app senza possibilità di installarla: conviene rimandarli.
Per far dimenticare il link a un telefono: apri l'app aggiungendo `?esci` all'indirizzo.
