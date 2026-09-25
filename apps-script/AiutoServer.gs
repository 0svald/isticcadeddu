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

var VERSIONE_APP = '2026.09.24';

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
   ritiri mancati, tempi per le modifiche) vanno aggiunte quando il comitato le avrà decise. */
function faqIniziali_() {
  const q = [
    ['socio', 'Come faccio un ordine?', 'Quando un fornitore apre gli ordini, nella Community WhatsApp arriva un messaggio con un link. Toccalo, scegli i prodotti con i tasti + e –, controlla il riepilogo e premi "Conferma e invia". Se hai il tuo link personale, puoi ordinare anche dalla tua pagina, in "I miei ordini".'],
    ['socio', 'Come modifico un ordine già inviato?', 'Apri la tua pagina con il link personale e tocca "Attivi": trovi il pulsante "Modifica il mio ordine", attivo fino alla chiusura della raccolta. Se non hai il link personale, scrivi al fornitore o a un amministratore.'],
    ['socio', 'Ho perso il mio link personale: cosa faccio?', 'Chiedine uno nuovo a un amministratore. Il vecchio link smetterà di funzionare.'],
    ['socio', 'Perché il mio ordine è "da verificare"?', 'Succede quando la tessera non risulta attiva o quando lo stesso socio ha inviato due ordini per la stessa raccolta. L\'ordine è registrato: un amministratore o il fornitore potrebbero contattarti per chiarire.'],
    ['socio', 'Perché il prezzo è "indicativo"?', 'Alcuni prodotti, come formaggi o angurie, si pesano al momento. Il fornitore conferma il peso prima della consegna e l\'importo diventa quello esatto.'],
    ['socio', 'Quando e dove ritiro? Come pago?', 'Giorno, orario e luogo sono nel messaggio della raccolta e nella tua pagina, in "Prossime consegne". Si paga in contanti direttamente al fornitore, al ritiro.'],
    ['socio', 'La raccolta è chiusa: posso ancora ordinare?', 'No, dopo la chiusura il modulo non accetta più ordini. Per casi particolari puoi scrivere al fornitore.'],
    ['socio', 'Come cambio il mio numero di telefono o la mia email?', 'Nella tua pagina apri "Profilo": trovi i campi Telefono ed Email e il pulsante Salva.'],
    ['socio', 'Come metto l\'app sulla schermata Home del telefono?', 'Apri il tuo link personale. Su Android: tocca i tre puntini in alto a destra e poi "Aggiungi a schermata Home". Su iPhone: tocca il pulsante di condivisione (il quadrato con la freccia) e poi "Aggiungi alla schermata Home".'],
    ['fornitore', 'Come aggiungo o nascondo un prodotto?', 'In "Listino" tocca "Nuovo" per aggiungerlo. Per nasconderlo per un po\', tocca "Disponibile": diventa "Non disponibile" e i soci non lo vedono più nel modulo.'],
    ['fornitore', 'Come imposto i gusti o un supplemento?', 'Apri il prodotto: in fondo trovi le opzioni. "Variante" è una scelta allo stesso prezzo (per esempio i gusti); "Supplemento" aggiunge un costo (per esempio la tanica).'],
    ['fornitore', 'Come confermo i pesi?', 'In "Raccolte" tocca "Conferma pesi" e scrivi il peso reale di ogni pezzo. Gli importi dei soci si aggiornano da soli.'],
    ['fornitore', 'Un socio mi chiede di cambiare il suo ordine', 'In "Raccolte" tocca "Ordini": puoi correggere le quantità o annullare l\'ordine. Accordati prima con il socio.'],
    ['fornitore', 'Dove vedo quanto preparare?', 'In "Raccolte" tocca "Riepilogo": trovi il totale di ogni prodotto e l\'incasso previsto.'],
    ['admin', 'Come apro una raccolta?', 'In "Raccolte" tocca +, scegli il fornitore, spunta i prodotti e scrivi la data di chiusura (per esempio 10-10-2026 20:00). Poi apri la raccolta e prepara il messaggio di apertura da incollare su WhatsApp.'],
    ['admin', 'Come invio il link personale a un socio?', 'In "Soci" tocca il socio e poi "Invia link": si apre WhatsApp con il messaggio già scritto.'],
    ['admin', 'Una raccolta non si è chiusa da sola', 'Controlla in "Notifiche" se ci sono avvisi sulla chiusura automatica o su una data non leggibile. Chi cura la parte tecnica può eseguire "diagnosiChiusura" dall\'editor.'],
    ['admin', 'Come gestisco le segnalazioni?', 'Le nuove segnalazioni compaiono in "Notifiche" e in "Segnalazioni". Quelle segnate come tecniche le segue il referente tecnico; per le altre contatta il socio e aggiorna lo stato.']
  ];
  return q.map((r, i) => ['F' + String(i + 1).padStart(2, '0'), r[0], r[1], r[2], (i + 1) * 10, 'SI']);
}
