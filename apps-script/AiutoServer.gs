/**
 * AiutoServer.gs — sezione "Aiuto": domande frequenti, segnalazioni, contatti, guide.
 *
 * Schede del foglio (create da sole al primo uso):
 *   Aiuto         domande frequenti: ruolo (socio | fornitore | admin), domanda, risposta, ordine, attivo
 *   Segnalazioni  problemi segnalati dagli utenti, con i dati tecnici raccolti dall'app
 *   Referenti     persone da contattare: nome, argomento, telefono, email, attivo
 *
 * Guide PDF: file privati su Drive, indicati nelle proprietà dello script
 *   GUIDA_SOCI_ID, GUIDA_FORNITORI_ID, GUIDA_AMMINISTRATORI_ID  (l'ID è la parte dell'indirizzo del file tra /d/ e /view)
 * Ognuno scarica solo le guide dei propri profili: il file passa dal server, non c'è un link pubblico.
 */

var VERSIONE_APP = '2026.09.25';

var SCHEDA_AIUTO_ = 'Aiuto';
var SCHEDA_SEGNALAZIONI_ = 'Segnalazioni';
var SCHEDA_REFERENTI_ = 'Referenti';

var COLONNE_AIUTO_ = ['id', 'ruolo', 'domanda', 'risposta', 'ordine', 'attivo'];
var COLONNE_SEGNALAZIONI_ = ['id', 'timestamp', 'tessera', 'nominativo', 'recapito', 'contatto_preferito', 'profilo', 'pagina',
  'sezione', 'raccolta_id', 'tipo', 'tecnico', 'descrizione', 'dispositivo', 'schermo', 'ultimo_errore', 'versione',
  'stato', 'gestita_da', 'note'];
var COLONNE_REFERENTI_ = ['nome', 'argomento', 'telefono', 'email', 'attivo'];

var TIPI_SEGNALAZIONE_ = {
  ordinare:   { nome: 'Non riesco a ordinare', tecnico: true },
  caricare:   { nome: 'La pagina non si carica o si blocca', tecnico: true },
  dati:       { nome: 'Vedo dati sbagliati', tecnico: true },
  suggerimento: { nome: 'Suggerimento', tecnico: false },
  altro:      { nome: 'Altro', tecnico: false }
};

var GUIDE_ = [
  { ruolo: 'socio',     titolo: 'Guida per i soci',           prop: 'GUIDA_SOCI_ID',            file: 'Guida-Soci.pdf' },
  { ruolo: 'fornitore', titolo: 'Guida per i fornitori',      prop: 'GUIDA_FORNITORI_ID',       file: 'Guida-Fornitori.pdf' },
  { ruolo: 'admin',     titolo: 'Guida per gli amministratori', prop: 'GUIDA_AMMINISTRATORI_ID', file: 'Guida-Amministratori.pdf' }
];

/** Crea la scheda con le colonne indicate, se manca. */
function assicuraScheda_(nome, colonne, righeIniziali) {
  let sh = trovaScheda_(nome);
  if (sh) return sh;
  sh = ss_().insertSheet(nome);
  sh.getRange(1, 1, 1, colonne.length).setValues([colonne]).setFontWeight('bold').setBackground('#E6EEDF');
  sh.setFrozenRows(1);
  if (righeIniziali && righeIniziali.length) sh.getRange(2, 1, righeIniziali.length, colonne.length).setValues(righeIniziali);
  return sh;
}

/** Profili della persona: da token (link personale o accesso di emergenza) oppure anonimo (form generico). */
function profiliAiuto_(token) {
  const t = String(token || '').trim();
  if (!t) return { socio: true, fornitore: false, admin: false, persona: null };
  try {
    const so = socioDaToken_(t);
    return { socio: true, fornitore: so.isFornitore, admin: so.isAdmin, persona: so };
  } catch (e) {
    const master = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
    if (master && t === master) return { socio: true, fornitore: true, admin: true, persona: null };
    return { socio: true, fornitore: false, admin: false, persona: null };
  }
}

/** Dati della sezione Aiuto per chi la apre. contesto = { raccoltaId } facoltativo. */
function aiutoDati(token, contesto) {
  contesto = contesto || {};
  assicuraScheda_(SCHEDA_AIUTO_, COLONNE_AIUTO_, faqIniziali_());
  try { aggiornaDomandeAiuto(); } catch (e) { /* le domande restano quelle di prima */ }
  assicuraScheda_(SCHEDA_REFERENTI_, COLONNE_REFERENTI_);
  const pr = profiliAiuto_(token);
  const ammessi = { socio: pr.socio, fornitore: pr.fornitore, admin: pr.admin };

  const faq = leggiTabellaSafe_(SCHEDA_AIUTO_)
    .filter(r => String(r.domanda || '').trim() && (r.attivo === undefined || String(r.attivo).trim() === '' || isSi(r.attivo)))
    .filter(r => ammessi[String(r.ruolo || 'socio').trim().toLowerCase()])
    .sort((a, b) => num(a.ordine) - num(b.ordine))
    .map(r => ({ ruolo: String(r.ruolo || 'socio').trim().toLowerCase(), domanda: String(r.domanda), risposta: String(r.risposta || '') }));

  const referenti = leggiTabellaSafe_(SCHEDA_REFERENTI_)
    .filter(r => String(r.nome || '').trim() && (r.attivo === undefined || String(r.attivo).trim() === '' || isSi(r.attivo)))
    .map(r => ({ nome: String(r.nome), argomento: String(r.argomento || ''), telefono: String(r.telefono || ''), email: String(r.email || ''), wa: numeroWa_(r.telefono) }));

  // fornitori delle raccolte aperte (o della raccolta che si sta guardando): per i problemi su un ordine
  const fornById = {}; leggiTabella(SHEETS.FORNITORI).forEach(f => fornById[String(f.id)] = f);
  const visti = {}; const fornitori = [];
  leggiTabella(SHEETS.RACCOLTE)
    .filter(r => contesto.raccoltaId ? String(r.id) === String(contesto.raccoltaId) : raccoltaAperta_(r))
    .forEach(r => { const f = fornById[String(r.fornitore_id)]; if (!f || visti[f.id]) return; visti[f.id] = true;
      fornitori.push({ nome: String(f.nome || ''), referente: String(f.referente || ''), telefono: String(f.telefono || ''), wa: numeroWa_(f.telefono) }); });

  const props = PropertiesService.getScriptProperties();
  const guide = GUIDE_.filter(g => ammessi[g.ruolo]).map(g => ({ ruolo: g.ruolo, titolo: g.titolo, disponibile: !!props.getProperty(g.prop) }));

  return {
    profili: ammessi, anonimo: !pr.persona && !pr.admin,
    faq: faq, referenti: referenti, fornitori: fornitori, guide: guide,
    tipi: Object.keys(TIPI_SEGNALAZIONE_).map(k => ({ id: k, nome: TIPI_SEGNALAZIONE_[k].nome })),
    versione: VERSIONE_APP
  };
}

/** Scarica una guida: solo se riguarda uno dei profili di chi la chiede. Ritorna { filename, base64 }. */
function aiutoGuida(token, ruolo) {
  const pr = profiliAiuto_(token);
  const g = GUIDE_.find(x => x.ruolo === ruolo);
  if (!g) throw new Error('Guida non trovata.');
  if (!({ socio: pr.socio, fornitore: pr.fornitore, admin: pr.admin })[ruolo]) throw new Error('Questa guida non riguarda il tuo profilo.');
  const id = PropertiesService.getScriptProperties().getProperty(g.prop);
  if (!id) throw new Error('La guida non è ancora disponibile.');
  const blob = DriveApp.getFileById(String(id).trim()).getBlob();
  return { filename: g.file, base64: Utilities.base64Encode(blob.getBytes()) };
}

/**
 * Invio di una segnalazione.
 * d = { tipo, descrizione, contatto, nome, tessera, recapito, tecnico: { profilo, pagina, sezione, raccoltaId, dispositivo, schermo, ultimoErrore } }
 */
function aiutoSegnala(token, d) {
  d = d || {};
  const tipo = TIPI_SEGNALAZIONE_[String(d.tipo || '')] ? String(d.tipo) : 'altro';
  const descr = String(d.descrizione || '').trim();
  if (descr.length < 5) throw new Error('Scrivi qualche parola per spiegare il problema.');
  if (descr.length > 2000) throw new Error('Il testo è troppo lungo: al massimo 2000 caratteri.');

  // freno agli invii ripetuti: al massimo 5 segnalazioni ogni 10 minuti dallo stesso link (o dal form generico)
  const cache = CacheService.getScriptCache();
  const chiave = 'segn_' + (String(token || '').trim() || 'anonimo').substring(0, 40);
  const n = +(cache.get(chiave) || 0);
  if (n >= 5) throw new Error('Hai inviato molte segnalazioni in poco tempo. Riprova tra qualche minuto.');
  cache.put(chiave, String(n + 1), 600);

  const pr = profiliAiuto_(token);
  const p = pr.persona;
  const tec = d.tecnico || {};
  const taglia = (v, max) => String(v == null ? '' : v).substring(0, max);
  const contatto = ['whatsapp', 'telefono', 'email'].indexOf(String(d.contatto)) >= 0 ? String(d.contatto) : '';

  assicuraScheda_(SCHEDA_SEGNALAZIONI_, COLONNE_SEGNALAZIONI_);
  const id = nuovoId(SCHEDA_SEGNALAZIONI_, 'S');
  aggiungiRiga(SCHEDA_SEGNALAZIONI_, {
    id: id, timestamp: new Date(),
    tessera: p ? p.tessera : taglia(tessKey_(d.tessera), 20),
    nominativo: p ? p.nominativo : taglia(d.nome, 80),
    recapito: taglia(d.recapito || (p ? p.telefono : ''), 80),
    contatto_preferito: contatto,
    profilo: taglia(tec.profilo, 20), pagina: taglia(tec.pagina, 40), sezione: taglia(tec.sezione, 40),
    raccolta_id: taglia(tec.raccoltaId, 20),
    tipo: TIPI_SEGNALAZIONE_[tipo].nome, tecnico: TIPI_SEGNALAZIONE_[tipo].tecnico ? 'SI' : 'NO',
    descrizione: descr,
    dispositivo: taglia(tec.dispositivo, 300), schermo: taglia(tec.schermo, 30), ultimo_errore: taglia(tec.ultimoErrore, 500),
    versione: VERSIONE_APP, stato: 'nuova', gestita_da: '', note: ''
  });
  log_(p ? ('socio:' + p.tessera) : 'anonimo', 'segnalazione_inviata', id + ' · ' + TIPI_SEGNALAZIONE_[tipo].nome);
  return { ok: true, id: id };
}

/* ===================== Amministratori: gestione delle segnalazioni ===================== */

/** (Admin) Elenco delle segnalazioni, le più recenti prima. filtro: 'aperte' (predefinito) | 'tutte'. */
function adminSegnalazioni(token, filtro) {
  checkToken_(token);
  assicuraScheda_(SCHEDA_SEGNALAZIONI_, COLONNE_SEGNALAZIONI_);
  return leggiTabellaSafe_(SCHEDA_SEGNALAZIONI_)
    .filter(s => filtro === 'tutte' || String(s.stato || 'nuova') !== 'risolta')
    .reverse()
    .map(s => ({ id: String(s.id), quando: testoData_(s.timestamp), tessera: String(s.tessera || ''), nominativo: String(s.nominativo || ''),
      recapito: String(s.recapito || ''), wa: numeroWa_(s.recapito), contatto: String(s.contatto_preferito || ''),
      tipo: String(s.tipo || ''), tecnico: isSi(s.tecnico), descrizione: String(s.descrizione || ''),
      pagina: [s.profilo, s.pagina, s.sezione].filter(Boolean).join(' › '), raccolta: String(s.raccolta_id || ''),
      dispositivo: String(s.dispositivo || ''), schermo: String(s.schermo || ''), ultimoErrore: String(s.ultimo_errore || ''),
      versione: String(s.versione || ''), stato: String(s.stato || 'nuova'), gestitaDa: String(s.gestita_da || ''), note: String(s.note || '') }));
}

/** (Admin) Aggiorna stato e note di una segnalazione. */
function adminAggiornaSegnalazione(token, id, d) {
  checkToken_(token);
  const s = leggiTabellaSafe_(SCHEDA_SEGNALAZIONI_).find(x => String(x.id) === String(id));
  if (!s) throw new Error('Segnalazione non trovata.');
  if (d.stato && ['nuova', 'in_corso', 'risolta'].indexOf(d.stato) >= 0) aggiornaCella(SCHEDA_SEGNALAZIONI_, s._riga, 'stato', d.stato);
  if (d.note !== undefined) aggiornaCella(SCHEDA_SEGNALAZIONI_, s._riga, 'note', String(d.note).substring(0, 2000));
  aggiornaCella(SCHEDA_SEGNALAZIONI_, s._riga, 'gestita_da', _ADMIN_CORRENTE);
  logAdmin_('segnalazione_aggiornata', String(id) + (d.stato ? (' → ' + d.stato) : ''));
  return { ok: true };
}

/** Segnalazioni nuove (per le Notifiche del pannello). */
function segnalazioniNuove_() {
  return leggiTabellaSafe_(SCHEDA_SEGNALAZIONI_).filter(s => String(s.stato || 'nuova') === 'nuova')
    .map(s => ({ id: String(s.id), quando: testoData_(s.timestamp), nominativo: String(s.nominativo || ''), tipo: String(s.tipo || ''), tecnico: isSi(s.tecnico) }));
}

/* ===================== Domande frequenti iniziali (generiche) ===================== */
/* Le risposte si modificano nella scheda "Aiuto" del foglio. Le regole del GAS (ordini per altri,
   ritiri mancati, tempi per le modifiche) vanno aggiunte quando il comitato le avrà decise.
   Ogni domanda: [ruolo, domanda, risposta, ordine]. */
var FAQ_VERSIONE_ = '2026.09.26'; // aumentala quando cambi le domande qui sotto: la scheda si aggiorna da sola
function faqDefault_() {
  return [
    ['socio', 'Come faccio un ordine?', 'Quando un fornitore apre gli ordini, nella Community WhatsApp arriva un messaggio con un link. Toccalo, scegli i prodotti con i tasti + e –, controlla il riepilogo e premi "Conferma e invia". Se hai il tuo link personale, puoi ordinare anche dalla tua pagina: nella Home tocca "Attivi".', 10],
    ['socio', 'Come modifico un ordine già inviato?', 'Apri la tua pagina con il link personale e, nella Home, tocca "Attivi": trovi il pulsante "Modifica il mio ordine", attivo fino alla chiusura della raccolta. Se non hai il link personale, scrivi al fornitore o a un amministratore.', 20],
    ['socio', 'Ho perso il mio link personale: cosa faccio?', 'Chiedine uno nuovo a un amministratore. Il vecchio link smetterà di funzionare.', 30],
    ['socio', 'Perché il mio ordine è "da verificare"?', 'Succede quando la tessera non risulta attiva o quando lo stesso socio ha inviato due ordini per la stessa raccolta. L\'ordine è registrato: un amministratore o il fornitore potrebbero contattarti per chiarire.', 40],
    ['socio', 'Perché il prezzo è "indicativo"?', 'Alcuni prodotti, come formaggi o angurie, si pesano al momento. Il fornitore conferma il peso prima della consegna e l\'importo diventa quello esatto.', 50],
    ['socio', 'Quando e dove ritiro? Come pago?', 'Giorno, orario e luogo sono nel messaggio della raccolta e nella tua pagina: nella Home tocca "Attivi" e guarda "Prossime consegne". Nei giorni prima del ritiro trovi anche un promemoria in "Notifiche". Si paga in contanti direttamente al fornitore, al ritiro.', 60],
    ['socio', 'La raccolta è chiusa: posso ancora ordinare?', 'No, dopo la chiusura il modulo non accetta più ordini. Per casi particolari puoi scrivere al fornitore.', 70],
    ['socio', 'Come cambio il mio numero di telefono o la mia email?', 'Nella Home della tua pagina tocca "Profilo": trovi i campi Telefono ed Email e il pulsante Salva.', 80],
    ['socio', 'Come metto l\'app sulla schermata Home del telefono?', 'Apri il tuo link personale. Su Android: tocca i tre puntini in alto a destra e poi "Aggiungi a schermata Home". Su iPhone: tocca il pulsante di condivisione (il quadrato con la freccia) e poi "Aggiungi alla schermata Home".', 90],
    ['socio', 'Dove trovo i miei ordini passati?', 'Nella Home tocca "Storico": trovi gli ordini delle consegne già fatte, dal più recente. Tocca un ordine per vedere i prodotti.', 92],
    ['socio', 'Cosa sono le notifiche?', 'In cima alla Home c\'è "Notifiche": ti avvisa di una raccolta che sta per chiudere, di un ordine da verificare, dell\'importo confermato dopo la pesatura e del prossimo ritiro. Ogni avviso sparisce da solo quando la cosa è fatta o passata.', 94],
    ['socio', 'Come torno alla pagina iniziale?', 'Tocca il pulsante verde "Home" in basso: da lì raggiungi tutte le sezioni.', 96],
    ['fornitore', 'Come aggiungo o nascondo un prodotto?', 'Nella Home tocca "Listino", poi "Nuovo" per aggiungerlo. Per nasconderlo per un po\', tocca "Disponibile": diventa "Non disponibile" e i soci non lo vedono più nel modulo.', 100],
    ['fornitore', 'Come imposto i gusti o un supplemento?', 'Apri il prodotto: in fondo trovi le opzioni. "Variante" è una scelta allo stesso prezzo (per esempio i gusti); "Supplemento" aggiunge un costo (per esempio la tanica).', 110],
    ['fornitore', 'Come confermo i pesi?', 'Nella Home tocca "Raccolte", poi "Conferma pesi" e scrivi il peso reale di ogni pezzo. Gli importi dei soci si aggiornano da soli. Le raccolte con pesi da confermare compaiono anche in "Notifiche".', 120],
    ['fornitore', 'Un socio mi chiede di cambiare il suo ordine', 'Nella Home tocca "Raccolte" e poi "Ordini": puoi correggere le quantità o annullare l\'ordine. Accordati prima con il socio.', 130],
    ['fornitore', 'Dove vedo quanto preparare?', 'Nella Home tocca "Raccolte" e poi "Riepilogo": trovi il totale di ogni prodotto e l\'incasso previsto.', 140],
    ['fornitore', 'Dove trovo le raccolte già consegnate?', 'Nella pagina "Raccolte", in fondo, c\'è il riquadro "Raccolte concluse": toccalo per aprirlo. Il giorno dopo la consegna le raccolte ci passano da sole. Qui gli ordini si possono solo vedere, non modificare.', 142],
    ['fornitore', 'Cosa trovo nelle notifiche?', 'Ordini da verificare, pesi da confermare, raccolte che chiudono entro 24 ore e consegne dei prossimi giorni. Ogni avviso sparisce da solo quando la cosa è fatta o passata.', 144],
    ['admin', 'Come apro una raccolta?', 'Nella Home tocca "Raccolte", poi +. Scegli il fornitore, spunta i prodotti e scrivi la data di chiusura (per esempio 10-10-2026 20:00). Poi apri la raccolta e prepara il messaggio di apertura da incollare su WhatsApp.', 150],
    ['admin', 'Come invio il link personale a un socio?', 'Nella Home tocca "Soci", poi il socio e "Invia link": si apre WhatsApp con il messaggio già scritto.', 160],
    ['admin', 'Una raccolta non si è chiusa da sola', 'Controlla in "Notifiche" se ci sono avvisi sulla chiusura automatica o su una data non leggibile. Chi cura la parte tecnica può eseguire "diagnosiChiusura" dall\'editor.', 170],
    ['admin', 'Come gestisco le segnalazioni?', 'Le nuove segnalazioni compaiono in "Notifiche" e in "Segnalazioni". Quelle segnate come tecniche le segue il referente tecnico; per le altre contatta il socio e aggiorna lo stato.', 180],
    ['admin', 'Quando una raccolta passa nello storico?', 'Il giorno dopo la data di consegna le raccolte chiuse diventano "Consegnata" da sole e passano nella scheda "Storico" di Raccolte e Consegne. Se una raccolta non ha la data di consegna, aprila e tocca "Segna come consegnata".', 182],
    ['admin', 'Dove trovo raccolte e consegne passate?', 'In "Raccolte" e in "Consegne" tocca "Storico": sono divise per mese e puoi filtrarle per fornitore, anche se non è più attivo. Le raccolte concluse sono in sola lettura: gli ordini si possono vedere ma non modificare, e si scarica solo il foglio definitivo.', 184]
  ];
}

/** Righe per una scheda Aiuto nuova. */
function faqIniziali_() {
  return faqDefault_().map((r, i) => ['F' + String(i + 1).padStart(2, '0'), r[0], r[1], r[2], r[3], 'SI']);
}

/* Risposte pubblicate nelle versioni precedenti: servono a riconoscere quelle mai modificate a mano. */
var FAQ_PRECEDENTI_ = [
    ['Come faccio un ordine?', 'Quando un fornitore apre gli ordini, nella Community WhatsApp arriva un messaggio con un link. Toccalo, scegli i prodotti con i tasti + e –, controlla il riepilogo e premi "Conferma e invia". Se hai il tuo link personale, puoi ordinare anche dalla tua pagina, in "I miei ordini".'],
    ['Come modifico un ordine già inviato?', 'Apri la tua pagina con il link personale: in "I miei ordini" trovi il pulsante "Modifica il mio ordine", attivo fino alla chiusura della raccolta. Se non hai il link personale, scrivi al fornitore o a un amministratore.'],
    ['Ho perso il mio link personale: cosa faccio?', 'Chiedine uno nuovo a un amministratore. Il vecchio link smetterà di funzionare.'],
    ['Perché il mio ordine è "da verificare"?', 'Succede quando la tessera non risulta attiva o quando lo stesso socio ha inviato due ordini per la stessa raccolta. L\'ordine è registrato: un amministratore o il fornitore potrebbero contattarti per chiarire.'],
    ['Perché il prezzo è "indicativo"?', 'Alcuni prodotti, come formaggi o angurie, si pesano al momento. Il fornitore conferma il peso prima della consegna e l\'importo diventa quello esatto.'],
    ['Quando e dove ritiro? Come pago?', 'Giorno, orario e luogo sono nel messaggio della raccolta e nella tua pagina, in "Prossime consegne". Si paga in contanti direttamente al fornitore, al ritiro.'],
    ['La raccolta è chiusa: posso ancora ordinare?', 'No, dopo la chiusura il modulo non accetta più ordini. Per casi particolari puoi scrivere al fornitore.'],
    ['Come cambio il mio numero di telefono o la mia email?', 'Nella tua pagina apri "Profilo": trovi i campi Telefono ed Email e il pulsante Salva.'],
    ['Come metto l\'app sulla schermata Home del telefono?', 'Apri il tuo link personale. Su Android: tocca i tre puntini in alto a destra e poi "Aggiungi a schermata Home". Su iPhone: tocca il pulsante di condivisione (il quadrato con la freccia) e poi "Aggiungi alla schermata Home".'],
    ['Come aggiungo o nascondo un prodotto?', 'In "Listino" tocca "Nuovo" per aggiungerlo. Per nasconderlo per un po\', tocca "Disponibile": diventa "Non disponibile" e i soci non lo vedono più nel modulo.'],
    ['Come imposto i gusti o un supplemento?', 'Apri il prodotto: in fondo trovi le opzioni. "Variante" è una scelta allo stesso prezzo (per esempio i gusti); "Supplemento" aggiunge un costo (per esempio la tanica).'],
    ['Come confermo i pesi?', 'In "Raccolte" tocca "Conferma pesi" e scrivi il peso reale di ogni pezzo. Gli importi dei soci si aggiornano da soli.'],
    ['Un socio mi chiede di cambiare il suo ordine', 'In "Raccolte" tocca "Ordini": puoi correggere le quantità o annullare l\'ordine. Accordati prima con il socio.'],
    ['Dove vedo quanto preparare?', 'In "Raccolte" tocca "Riepilogo": trovi il totale di ogni prodotto e l\'incasso previsto.'],
    ['Come apro una raccolta?', 'In "Raccolte" tocca +, scegli il fornitore, spunta i prodotti e scrivi la data di chiusura (per esempio 10-10-2026 20:00). Poi apri la raccolta e prepara il messaggio di apertura da incollare su WhatsApp.'],
    ['Come invio il link personale a un socio?', 'In "Soci" tocca il socio e poi "Invia link": si apre WhatsApp con il messaggio già scritto.'],
    ['Una raccolta non si è chiusa da sola', 'Controlla in "Da fare" se ci sono avvisi sulla chiusura automatica o su una data non leggibile. Chi cura la parte tecnica può eseguire "diagnosiChiusura" dall\'editor.'],
    ['Dove trovo le raccolte già consegnate?', 'Nella pagina "Raccolte", in fondo, c\'è il riquadro "Raccolte concluse": toccalo per aprirlo. Il giorno dopo la consegna le raccolte ci passano da sole.'],
    ['Dove trovo raccolte e consegne passate?', 'In "Raccolte" e in "Consegne" tocca "Storico": sono divise per mese e puoi filtrarle per fornitore, anche se non è più attivo.'],
    ['Come gestisco le segnalazioni?', 'Le nuove segnalazioni compaiono in "Da fare" e in "Segnalazioni". Quelle segnate come tecniche le segue il referente tecnico; per le altre contatta il socio e aggiorna lo stato.']
];

/**
 * Aggiorna le domande frequenti della scheda Aiuto dopo una nuova versione dell'app (una volta sola per versione).
 * - una risposta uguale a quella vecchia viene sostituita con quella nuova;
 * - una risposta cambiata a mano dagli amministratori resta com'è;
 * - le domande nuove vengono aggiunte (quelle tolte a mano dagli amministratori restano tolte).
 * Parte da sola alla prima apertura di "Aiuto"; si può anche eseguire dall'editor.
 */
function aggiornaDomandeAiuto() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('AIUTO_FAQ_VERSIONE') === FAQ_VERSIONE_) return 'Già aggiornate';
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return 'Occupato, riprova';
  try {
    assicuraScheda_(SCHEDA_AIUTO_, COLONNE_AIUTO_, faqIniziali_());
    const chiave = t => String(t || '').trim().toLowerCase();
    const vecchie = {}; FAQ_PRECEDENTI_.forEach(r => { vecchie[chiave(r[0])] = String(r[1]).trim(); });
    const righe = leggiTabellaSafe_(SCHEDA_AIUTO_);
    let cambiate = 0, aggiunte = 0;
    faqDefault_().forEach(d => {
      const r = righe.find(x => chiave(x.domanda) === chiave(d[1]));
      if (!r) {
        if (vecchie[chiave(d[1])] !== undefined) return; // c'era già e un amministratore l'ha tolta: resta tolta
        aggiungiRiga(SCHEDA_AIUTO_, { id: nuovoId(SCHEDA_AIUTO_, 'F'), ruolo: d[0], domanda: d[1], risposta: d[2], ordine: d[3], attivo: 'SI' });
        aggiunte++;
      } else if (String(r.risposta || '').trim() !== d[2] && String(r.risposta || '').trim() === vecchie[chiave(d[1])]) {
        aggiornaCella(SCHEDA_AIUTO_, r._riga, 'risposta', d[2]);
        cambiate++;
      }
    });
    props.setProperty('AIUTO_FAQ_VERSIONE', FAQ_VERSIONE_);
    log_('sistema', 'aiuto_aggiornato', 'versione ' + FAQ_VERSIONE_ + ': ' + cambiate + ' risposte aggiornate, ' + aggiunte + ' domande aggiunte');
    return cambiate + ' risposte aggiornate, ' + aggiunte + ' domande aggiunte';
  } finally {
    lock.releaseLock();
  }
}
