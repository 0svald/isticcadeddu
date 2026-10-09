/**
 * Api.gs — accesso ai dati senza passare dalle pagine dell'app (solo per gli amministratori).
 *
 * Si chiama con una richiesta POST all'indirizzo della web app (…/exec), corpo JSON:
 *   { "chiave": "<token personale da amministratore>", "azione": "<nome>", "dati": { … } }
 * Risposta JSON: { "ok": true, "risultato": … }  oppure  { "ok": false, "errore": "…" }.
 * Google risponde con un reindirizzamento: il programma che chiama deve seguirlo (curl -L).
 *
 * Sicurezza:
 * - la chiave è il token del link personale di un amministratore (o ADMIN_TOKEN): ogni azione passa
 *   per checkToken_, lo stesso controllo del pannello; rigenerando il link la vecchia chiave non vale più;
 * - solo le azioni dell'elenco AZIONI_API_; nessuna cancellazione (si annulla o si disattiva);
 * - valgono le stesse regole del pannello (es. raccolte concluse in sola lettura);
 * - ogni modifica finisce nella scheda Log con autore "api".
 * Istruzioni ed esempi: file API.md del repository.
 */

/** Punto di accesso per le richieste POST. */
function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = { ok: true, risultato: eseguiApi_(req) };
  } catch (err) {
    out = { ok: false, errore: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Esegue una richiesta (anche più operazioni insieme con l'azione "lotto"). */
function eseguiApi_(req) {
  const chiave = String((req && req.chiave) || '').trim();
  checkToken_(chiave); // lancia "Non autorizzato." se la chiave non è di un amministratore attivo
  const azione = String(req.azione || '');
  if (azione === 'lotto') {
    const ops = Array.isArray(req.dati && req.dati.operazioni) ? req.dati.operazioni : [];
    if (!ops.length) throw new Error('Il lotto è vuoto.');
    if (ops.length > 200) throw new Error('Al massimo 200 operazioni per lotto.');
    // si fermano alla prima operazione che non riesce: quelle prima restano fatte (sono nel Log)
    return ops.map((op, i) => {
      try { return { ok: true, risultato: eseguiAzioneApi_(chiave, String(op.azione || ''), op.dati || {}) }; }
      catch (err) { throw new Error('Operazione ' + (i + 1) + ' (' + op.azione + '): ' + ((err && err.message) || err) + '. Le operazioni precedenti sono state eseguite.'); }
    });
  }
  return eseguiAzioneApi_(chiave, azione, req.dati || {});
}

function eseguiAzioneApi_(chiave, azione, d) {
  const f = AZIONI_API_[azione];
  if (!f) throw new Error('Azione sconosciuta: "' + azione + '". Usa "azioni" per l\'elenco.');
  const scrive = !AZIONI_LETTURA_API_[azione];
  if (!scrive) return f(chiave, d);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // una modifica alla volta: niente numeri doppi
  try {
    const r = f(chiave, d);
    log_('api', 'api_' + azione, JSON.stringify(d).substring(0, 300));
    return r;
  } finally { lock.releaseLock(); }
}

/* ===================== LETTURA ===================== */

var SCHEDE_LEGGIBILI_API_ = ['Fornitori', 'Categorie', 'Prodotti', 'Opzioni', 'Luoghi', 'Raccolte', 'Consegne',
  'Ordini', 'Righe', 'Soci', 'Admin', 'TemplateMessaggi', 'Log', 'Aiuto', 'Segnalazioni', 'Referenti'];
var COLONNE_RISERVATE_API_ = ['token', 'token_accesso'];

/** Righe di una scheda. dati: { scheda, filtro: {colonna: valore}, conToken } */
function apiLeggi_(chiave, d) {
  const scheda = String(d.scheda || '');
  if (SCHEDE_LEGGIBILI_API_.indexOf(scheda) < 0) throw new Error('Scheda non leggibile: "' + scheda + '". Schede: ' + SCHEDE_LEGGIBILI_API_.join(', '));
  const filtro = d.filtro || {};
  return leggiTabellaSafe_(scheda)
    .filter(r => Object.keys(filtro).every(k => String(r[k] == null ? '' : r[k]).trim() === String(filtro[k]).trim()))
    .map(r => {
      const o = { riga: r._riga };
      Object.keys(r).forEach(k => {
        if (k === '_riga' || k === 'ciclo_id') return;
        if (!d.conToken && COLONNE_RISERVATE_API_.indexOf(k) >= 0) return;
        o[k] = (r[k] instanceof Date) ? testoData_(r[k]) : r[k];
      });
      return o;
    });
}

/* ===================== SCRITTURA: soci, fornitori, categorie ===================== */

function apiAggiungiSocio_(chiave, d) {
  checkToken_(chiave);
  const t = tessKey_(d.tessera);
  if (!t) throw new Error('Il numero di tessera è obbligatorio.');
  const nominativo = String(d.nominativo || '').trim();
  if (!nominativo) throw new Error('Il nominativo è obbligatorio.');
  if (leggiTabella(SHEETS.SOCI).some(s => tessKey_(s.numero_tessera) === t)) throw new Error('Tessera già presente: ' + t);
  aggiungiRiga(SHEETS.SOCI, {
    numero_tessera: t, nominativo: nominativo, telefono: String(d.telefono || '').trim(),
    tessera_attiva: d.attiva === false ? 'NO' : 'SI', scadenza_tessera: String(d.scadenza || '').trim(),
    token: generaTokenSocio_(), link_breve: ''
  });
  logAdmin_('socio_creato', t);
  return { tessera: t };
}

/** dati: { tessera, nuovaTessera?, nominativo?, telefono?, attiva?, scadenza? } */
function apiModificaSocio_(chiave, d) {
  const campi = {};
  ['nominativo', 'telefono', 'attiva'].forEach(k => { if (d[k] !== undefined) campi[k] = d[k]; });
  if (d.nuovaTessera !== undefined) campi.tessera = d.nuovaTessera;
  const r = adminModificaSocio(chiave, d.tessera, campi);
  if (d.scadenza !== undefined) {
    const s = trovaSocio_(r.tessera);
    aggiornaCella(SHEETS.SOCI, s._riga, 'scadenza_tessera', String(d.scadenza).trim());
  }
  return r;
}

/** dati: { tessera, nome, referente?, telefono?, email?, zona?, descrizione?, emoji? } (ogni fornitore è un socio) */
function apiAggiungiFornitore_(chiave, d) {
  checkToken_(chiave);
  const nome = String(d.nome || '').trim();
  if (!nome) throw new Error('Il nome del fornitore è obbligatorio.');
  const tessera = tessKey_(d.tessera);
  if (!tessera) throw new Error('Indica la tessera del socio: ogni fornitore è un socio.');
  const socio = trovaSocio_(tessera);
  if (!isSi(socio.tessera_attiva)) throw new Error('La tessera ' + tessera + ' non è attiva.');
  const id = nuovoId(SHEETS.FORNITORI, 'F');
  aggiungiRiga(SHEETS.FORNITORI, {
    id: id, numero_tessera: tessera, nome: nome,
    referente: String(d.referente || '').trim(), telefono: String(d.telefono || '').trim(),
    email: String(d.email || '').trim(), zona: String(d.zona || '').trim(),
    descrizione: String(d.descrizione || '').trim(), emoji: String(d.emoji || '').trim(),
    token_accesso: '', attivo: 'SI'
  });
  logAdmin_('fornitore_creato', id + ' ' + nome);
  return { id: id };
}

/* ===================== SCRITTURA: prodotti e opzioni ===================== */

var CAMPI_PRODOTTO_API_ = {
  categoriaId: 'categoria_id', nome: 'nome', note: 'note', prezzo: 'prezzo', unita: 'unita',
  modalita: 'modalita_vendita', pesoVariabile: 'peso_variabile', passo: 'passo_minimo',
  qtaMin: 'qta_min', qtaMax: 'qta_max', maxPerOrdine: 'max_per_ordine', minConsigliato: 'min_consigliato', attivo: 'attivo'
};

/** Valore di un campo prodotto/opzione come va scritto nel foglio. */
function valoreCampoApi_(campo, v) {
  if (campo === 'attivo' || campo === 'pesoVariabile' || campo === 'richiedeNota') return (v === true || isSi(v)) ? 'SI' : 'NO';
  if (['prezzo', 'passo', 'qtaMin', 'qtaMax', 'maxPerOrdine', 'minConsigliato'].indexOf(campo) >= 0) return (v === '' || v == null) ? '' : num(v);
  return String(v == null ? '' : v).trim();
}

/**
 * Crea (senza id) o modifica (con id) un prodotto. Nella modifica cambiano solo i campi indicati.
 * dati: { id?, fornitoreId (per crearlo), nome, categoriaId, prezzo, unita, modalita, pesoVariabile, passo, note, attivo, … }
 */
function apiSalvaProdotto_(chiave, d) {
  checkToken_(chiave);
  if (d.categoriaId && !leggiTabella(SHEETS.CATEGORIE).some(c => String(c.id) === String(d.categoriaId))) throw new Error('Categoria non trovata: ' + d.categoriaId);
  if (d.id) {
    const p = leggiTabella(SHEETS.PRODOTTI).find(x => String(x.id) === String(d.id));
    if (!p) throw new Error('Prodotto non trovato: ' + d.id);
    if (d.nome !== undefined && !String(d.nome).trim()) throw new Error('Il nome del prodotto non può essere vuoto.');
    Object.keys(CAMPI_PRODOTTO_API_).forEach(k => { if (d[k] !== undefined) aggiornaCella(SHEETS.PRODOTTI, p._riga, CAMPI_PRODOTTO_API_[k], valoreCampoApi_(k, d[k])); });
    logAdmin_('prodotto_modificato', String(d.id));
    return { id: String(d.id) };
  }
  if (!leggiTabella(SHEETS.FORNITORI).some(f => String(f.id) === String(d.fornitoreId))) throw new Error('Fornitore non trovato: ' + d.fornitoreId);
  if (!String(d.nome || '').trim()) throw new Error('Il nome del prodotto è obbligatorio.');
  const riga = { fornitore_id: String(d.fornitoreId), emoji: '', modalita_vendita: 'a_unita', peso_variabile: 'NO', passo_minimo: 1, attivo: 'SI' };
  Object.keys(CAMPI_PRODOTTO_API_).forEach(k => { if (d[k] !== undefined) riga[CAMPI_PRODOTTO_API_[k]] = valoreCampoApi_(k, d[k]); });
  riga.id = nuovoId(SHEETS.PRODOTTI, 'P');
  aggiungiRiga(SHEETS.PRODOTTI, riga);
  logAdmin_('prodotto_creato', riga.id + ' ' + riga.nome);
  return { id: riga.id };
}

var CAMPI_OPZIONE_API_ = { nome: 'nome', tipo: 'tipo', prezzo: 'prezzo', unita: 'unita', note: 'note', richiedeNota: 'richiede_nota_socio' };

/** Crea o modifica un'opzione. Tipi ammessi: variante, supplemento. dati: { id?, prodottoId (per crearla), nome, tipo, prezzo, … } */
function apiSalvaOpzione_(chiave, d) {
  checkToken_(chiave);
  if (d.tipo !== undefined && ['variante', 'supplemento'].indexOf(String(d.tipo)) < 0) throw new Error('Tipo di opzione non valido: usa "variante" o "supplemento".');
  if (d.id) {
    const o = leggiTabella(SHEETS.OPZIONI).find(x => String(x.id) === String(d.id));
    if (!o) throw new Error('Opzione non trovata: ' + d.id);
    if (d.nome !== undefined && !String(d.nome).trim()) throw new Error('Il nome dell\'opzione non può essere vuoto.');
    Object.keys(CAMPI_OPZIONE_API_).forEach(k => { if (d[k] !== undefined) aggiornaCella(SHEETS.OPZIONI, o._riga, CAMPI_OPZIONE_API_[k], valoreCampoApi_(k, d[k])); });
    logAdmin_('opzione_modificata', String(d.id));
    return { id: String(d.id) };
  }
  if (!leggiTabella(SHEETS.PRODOTTI).some(p => String(p.id) === String(d.prodottoId))) throw new Error('Prodotto non trovato: ' + d.prodottoId);
  if (!String(d.nome || '').trim()) throw new Error('Il nome dell\'opzione è obbligatorio.');
  const riga = { prodotto_id: String(d.prodottoId), tipo: 'variante', prezzo: 0, richiede_nota_socio: 'NO' };
  Object.keys(CAMPI_OPZIONE_API_).forEach(k => { if (d[k] !== undefined) riga[CAMPI_OPZIONE_API_[k]] = valoreCampoApi_(k, d[k]); });
  riga.id = nuovoId(SHEETS.OPZIONI, 'OP');
  aggiungiRiga(SHEETS.OPZIONI, riga);
  logAdmin_('opzione_creata', riga.id + ' ' + riga.nome);
  return { id: riga.id };
}

/* ===================== SCRITTURA: raccolte e consegne ===================== */

/** dati: { fornitoreId, chiusura, prodottiIds, maxOrdini?, avvisi?, luogoId?, consegnaId? } */
function apiAggiungiRaccolta_(chiave, d) {
  const r = adminAggiungiRaccolta(chiave, d);
  if (d.consegnaId) adminAssegnaConsegna(chiave, r.id, d.consegnaId);
  return { id: r.id };
}

/** dati: { id, chiusura?, prodottiIds?, maxOrdini?, avvisi?, fornitoreId?, consegnaId? } */
function apiModificaRaccolta_(chiave, d) {
  adminModificaRaccolta(chiave, d.id, d);
  if (d.consegnaId !== undefined) adminAssegnaConsegna(chiave, d.id, d.consegnaId);
  return { id: String(d.id) };
}

/* ===================== SCRITTURA: ordini ===================== */

/**
 * Inserisce un ordine (es. arrivato su WhatsApp) con gli stessi controlli del form generico:
 * tessera non trovata o non attiva, nome diverso o secondo ordine dello stesso socio → "da_verificare".
 * Si può inserire in una raccolta aperta o chiusa, non in una bozza né in una raccolta conclusa.
 * dati: { raccoltaId, tessera, nominativo, righe: [{ prodottoId, opzioneId?, nota?, quantita }], note?, quando? ("GG-MM-AAAA HH:MM") }
 */
function apiInserisciOrdine_(chiave, d) {
  checkToken_(chiave);
  const rac = leggiTabella(SHEETS.RACCOLTE).find(x => String(x.id) === String(d.raccoltaId));
  if (!rac) throw new Error('Raccolta non trovata: ' + d.raccoltaId);
  bloccaSeConclusa_(rac);
  const st = String(rac.stato || '').trim().toLowerCase();
  if (st === 'bozza') throw new Error('La raccolta è ancora una bozza.');
  const tessera = tessKey_(d.tessera), nominativo = String(d.nominativo || '').trim();
  if (!tessera) throw new Error('Il numero di tessera è obbligatorio.');
  if (!nominativo) throw new Error('Il nominativo è obbligatorio.');
  const righe = Array.isArray(d.righe) ? d.righe : [];
  if (!righe.length) throw new Error('L\'ordine non ha prodotti.');

  const ammessi = String(rac.prodotti_ids || '').split(/[;,]/).map(s => s.trim()).filter(Boolean);
  const prodotti = {}; leggiTabella(SHEETS.PRODOTTI).forEach(p => prodotti[String(p.id)] = p);
  const opzioni = {}; leggiTabella(SHEETS.OPZIONI).forEach(o => opzioni[String(o.id)] = o);
  righe.forEach((r, i) => {
    const p = prodotti[String(r.prodottoId)];
    const dove = 'Riga ' + (i + 1) + ': ';
    if (!p) throw new Error(dove + 'prodotto non trovato (' + r.prodottoId + ').');
    if (ammessi.length ? ammessi.indexOf(String(p.id)) < 0 : String(p.fornitore_id) !== String(rac.fornitore_id)) throw new Error(dove + '"' + p.nome + '" non fa parte di questa raccolta.');
    if (r.opzioneId && (!opzioni[String(r.opzioneId)] || String(opzioni[String(r.opzioneId)].prodotto_id) !== String(p.id))) throw new Error(dove + 'l\'opzione ' + r.opzioneId + ' non è di "' + p.nome + '".');
    if (!(num(r.quantita) > 0)) throw new Error(dove + 'la quantità deve essere maggiore di zero.');
    const maxPer = (p.max_per_ordine === '' || p.max_per_ordine == null) ? null : num(p.max_per_ordine);
    if (maxPer != null && num(r.quantita) > maxPer) throw new Error(dove + 'per "' + p.nome + '" il massimo per ordine è ' + maxPer + '.');
  });

  let stato = 'valido', motivo = '';
  const socio = leggiTabella(SHEETS.SOCI).find(s => tessKey_(s.numero_tessera) === tessera);
  if (!socio) { stato = 'da_verificare'; motivo = 'Tessera non trovata'; }
  else if (!isSi(socio.tessera_attiva)) { stato = 'da_verificare'; motivo = 'Tessera non attiva'; }
  else if (!stessoNome_(socio.nominativo, nominativo)) { stato = 'da_verificare'; motivo = 'Nominativo non corrispondente'; }
  const doppio = leggiTabella(SHEETS.ORDINI).some(o => String(o.raccolta_id) === String(rac.id) && tessKey_(o.numero_tessera) === tessera && String(o.stato) !== 'annullato');
  if (doppio) { stato = 'da_verificare'; motivo = (motivo ? motivo + '; ' : '') + 'ordine multiplo: il socio ha già un ordine in questa raccolta'; }

  const id = nuovoId(SHEETS.ORDINI, 'OR');
  aggiungiRiga(SHEETS.ORDINI, {
    id: id, raccolta_id: String(rac.id), numero_tessera: tessera, nominativo_inserito: nominativo,
    stato: stato, motivo_annullamento: motivo, note: String(d.note || '').trim(),
    timestamp: String(d.quando || '').trim() || new Date()
  });
  righe.forEach((r, i) => aggiungiRiga(SHEETS.RIGHE, {
    id: id + '-' + (i + 1), ordine_id: id, prodotto_id: String(r.prodottoId), opzione_id: String(r.opzioneId || ''),
    nota_socio: String(r.nota || '').trim(), quantita: num(r.quantita), peso_confermato: ''
  }));
  logAdmin_('ordine_inserito', id + ' (' + stato + (motivo ? ': ' + motivo : '') + ')');
  return { id: id, stato: stato, motivo: motivo };
}

/** Cambia la quantità di una riga d'ordine. Zero non è ammesso: per togliere un ordine si annulla. */
function apiModificaQuantita_(chiave, d) {
  if (!(num(d.quantita) > 0)) throw new Error('La quantità deve essere maggiore di zero: dall\'API non si cancellano righe. Per togliere un ordine usa "annullaOrdine".');
  return adminModificaRiga(chiave, d.rigaId, num(d.quantita));
}

/* ===================== ELENCO DELLE AZIONI ===================== */

var AZIONI_API_ = {
  // lettura
  azioni:           (k, d) => Object.keys(AZIONI_API_).concat(['lotto']).map(a => ({ azione: a, scrive: !AZIONI_LETTURA_API_[a] && a !== 'lotto', dati: DESCRIZIONE_API_[a] || '' })),
  leggi:            apiLeggi_,
  ordiniRaccolta:   (k, d) => adminOrdiniRaccolta(k, d.raccoltaId),
  statistiche:      (k, d) => adminStatistiche(k, d),
  pdf:              (k, d) => d.tipo === 'provvisorio' ? adminPdfStato(k, d.raccoltaId) : adminPdfDefinitivo(k, d.raccoltaId),
  // soci e fornitori
  aggiungiSocio:    apiAggiungiSocio_,
  modificaSocio:    apiModificaSocio_,
  aggiungiFornitore: apiAggiungiFornitore_,
  modificaFornitore: (k, d) => adminModificaFornitore(k, d.id, d),
  // categorie, prodotti, opzioni
  aggiungiCategoria: (k, d) => adminAggiungiCategoria(k, d),
  modificaCategoria: (k, d) => adminModificaCategoria(k, d.id, d),
  salvaProdotto:    apiSalvaProdotto_,
  salvaOpzione:     apiSalvaOpzione_,
  // raccolte e consegne
  aggiungiRaccolta: apiAggiungiRaccolta_,
  modificaRaccolta: apiModificaRaccolta_,
  chiudiRaccolta:   (k, d) => adminChiudiCiclo(k, d.id),
  riapriRaccolta:   (k, d) => adminRiapriCiclo(k, d.id),
  aggiungiConsegna: (k, d) => adminAggiungiConsegna(k, d),
  modificaConsegna: (k, d) => adminModificaConsegna(k, d.id, d),
  // ordini
  inserisciOrdine:  apiInserisciOrdine_,
  confermaOrdine:   (k, d) => adminConfermaOrdine(k, d.ordineId),
  annullaOrdine:    (k, d) => adminAnnullaOrdine(k, d.ordineId, d.motivo),
  modificaQuantita: apiModificaQuantita_
};
var AZIONI_LETTURA_API_ = { azioni: true, leggi: true, ordiniRaccolta: true, statistiche: true, pdf: true };

var DESCRIZIONE_API_ = {
  leggi: '{ scheda, filtro?: {colonna: valore}, conToken?: false }',
  ordiniRaccolta: '{ raccoltaId }',
  statistiche: '{ mesi?: 3|6|12|"anno", fornitoreId?, categoria? }',
  pdf: '{ raccoltaId, tipo?: "definitivo"|"provvisorio" } → { filename, base64 } (come il pulsante del pannello)',
  aggiungiSocio: '{ tessera, nominativo, telefono?, scadenza?: "GG-MM-AAAA", attiva?: true }',
  modificaSocio: '{ tessera, nuovaTessera?, nominativo?, telefono?, attiva?, scadenza? }',
  aggiungiFornitore: '{ tessera, nome, referente?, telefono?, email?, zona?, descrizione?, emoji? }',
  modificaFornitore: '{ id, nome?, referente?, telefono?, email?, zona?, descrizione?, emoji?, tessera?, attivo? }',
  aggiungiCategoria: '{ nome, emoji? }',
  modificaCategoria: '{ id, nome?, emoji? }',
  salvaProdotto: '{ id? (modifica) | fornitoreId (nuovo), nome, categoriaId, prezzo, unita, modalita, pesoVariabile, passo, note, qtaMin, qtaMax, maxPerOrdine, minConsigliato, attivo }',
  salvaOpzione: '{ id? (modifica) | prodottoId (nuova), nome, tipo: "variante"|"supplemento", prezzo, unita, note, richiedeNota }',
  aggiungiRaccolta: '{ fornitoreId, chiusura: "GG-MM-AAAA HH:MM", prodottiIds: [..], maxOrdini?, avvisi?, luogoId?, consegnaId? }',
  modificaRaccolta: '{ id, chiusura?, prodottiIds?, maxOrdini?, avvisi?, fornitoreId?, consegnaId? }',
  chiudiRaccolta: '{ id }',
  riapriRaccolta: '{ id }',
  aggiungiConsegna: '{ data: "GG-MM-AAAA", fascia?, luogoId?, referente?, telefono?, note? }',
  modificaConsegna: '{ id, data?, fascia?, luogoId?, referente?, telefono? }',
  inserisciOrdine: '{ raccoltaId, tessera, nominativo, righe: [{ prodottoId, opzioneId?, nota?, quantita }], note?, quando?: "GG-MM-AAAA HH:MM" }',
  confermaOrdine: '{ ordineId }',
  annullaOrdine: '{ ordineId, motivo }',
  modificaQuantita: '{ rigaId, quantita (> 0) }',
  lotto: '{ operazioni: [{ azione, dati }, …] } (massimo 200)'
};
