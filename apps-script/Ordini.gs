/**
 * Ordini.gs — dati per il form, verifica tessera e salvataggio ordini.
 */

/** Prodotti inclusi in una raccolta: quelli selezionati (prodotti_ids) o, se vuoto, tutti gli attivi del fornitore. */
function prodottiRaccolta_(raccolta) {
  const attivi = leggiTabella(SHEETS.PRODOTTI)
    .filter(p => String(p.fornitore_id) === String(raccolta.fornitore_id) && isSi(p.attivo));
  const ids = String(raccolta.prodotti_ids || '').split(/[;,]/).map(s => s.trim()).filter(Boolean);
  if (!ids.length) return attivi;
  const set = {}; ids.forEach(i => set[i] = true);
  return attivi.filter(p => set[String(p.id)]);
}

/** Normalizza un nominativo per il confronto tollerante. */
function normNome_(s) {
  s = String(s || '').toLowerCase().trim();
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // togli accenti
  s = s.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.split(' ').sort().join(' '); // ordine nome/cognome irrilevante
}

/** Confronto tollerante tra due nominativi. */
function stessoNome_(a, b) {
  return normNome_(a) === normNome_(b);
}

/** Tessera come stringa (mantiene gli zeri iniziali). */
function tessKey_(v) {
  return String(v == null ? '' : v).trim();
}

/**
 * Tabelle usate per descrivere le raccolte nelle pagine d'ordine, lette una volta sola.
 */
function contestoForm_() {
  const fornitori = {}; leggiTabella(SHEETS.FORNITORI).forEach(f => fornitori[String(f.id)] = f);
  const luoghi = {}; leggiTabella(SHEETS.LUOGHI).forEach(l => luoghi[String(l.id)] = l);
  const opzioni = leggiTabella(SHEETS.OPZIONI);
  const categorie = leggiTabella(SHEETS.CATEGORIE).sort((a, b) => num(a.ordine) - num(b.ordine)); // categorie globali
  return { fornitori: fornitori, luoghi: luoghi, opzioni: opzioni, categorie: categorie };
}

/** Un prodotto come lo vede il form d'ordine. */
function prodottoPerForm_(p, opzioni) {
  return {
    id: String(p.id),
    categoria_id: String(p.categoria_id || ''),
    nome: p.nome,
    emoji: p.emoji || '',
    note: p.note || '',
    prezzo: num(p.prezzo),
    unita: p.unita || '',
    modalita: p.modalita_vendita || 'a_unita',
    peso_variabile: isSi(p.peso_variabile),
    passo: num(p.passo_minimo) || 1,
    min_consigliato: p.min_consigliato === '' ? null : num(p.min_consigliato),
    max_per_ordine: p.max_per_ordine === '' ? null : num(p.max_per_ordine),
    opzioni: opzioni.filter(o => String(o.prodotto_id) === String(p.id)).map(o => ({
      id: String(o.id), nome: o.nome, tipo: o.tipo, prezzo: num(o.prezzo),
      unita: o.unita || '', note: o.note || '', richiede_nota: isSi(o.richiede_nota_socio)
    }))
  };
}

/** Una raccolta con fornitore, date e prodotti, come la vede il form d'ordine. */
function raccoltaPerForm_(ciclo, cx) {
  const fornitore = cx.fornitori[String(ciclo.fornitore_id)] || {};
  const luogo = cx.luoghi[String(ciclo.luogo_id)] || {};
  const dtChiusura = parseChiusura_(ciclo.chiusura);
  return {
    aperto: raccoltaAperta_(ciclo),
    ciclo: {
      id: String(ciclo.id),
      chiusura: testoData_(ciclo.chiusura),
      chiusuraTs: dtChiusura ? dtChiusura.getTime() : null,
      avvisi: ciclo.avvisi || '',
      data_consegna: testoData_(ciclo.data_consegna),
      fascia_oraria: ciclo.fascia_oraria || '',
      referente: ciclo.referente_consegna || fornitore.referente || ''
    },
    fornitore: { nome: fornitore.nome || '', zona: fornitore.zona || '', descrizione: fornitore.descrizione || '', emoji: fornitore.emoji || '' },
    luogo: { nome: luogo.nome || '', indirizzo: luogo.indirizzo || '' },
    consegna: (function(){ try { const c = consegnaDiRaccolta_(ciclo); return { data: c.data || '', fascia: c.fascia || '', luogo: c.luogoNome || '' }; } catch (e) { return { data: '', fascia: '', luogo: '' }; } })(),
    prodotti: prodottiRaccolta_(ciclo).map(p => prodottoPerForm_(p, cx.opzioni))
  };
}

/**
 * Dati necessari a costruire il form d'ordine per un ciclo.
 * Chiamata dal client al caricamento della pagina.
 */
function getFormData(cicloId) {
  cicloId = String(cicloId);
  const ciclo = leggiTabella(SHEETS.RACCOLTE).find(c => String(c.id) === cicloId);
  if (!ciclo) return { errore: 'Ciclo non trovato.' };
  try { chiudiSeScaduta_(ciclo, null, 'form'); } catch (e) {} // se è scaduta si chiude adesso
  const cx = contestoForm_();
  const d = raccoltaPerForm_(ciclo, cx);
  d.categorie = cx.categorie.map(c => ({ id: String(c.id), nome: c.nome, emoji: c.emoji || '' }));
  return d;
}

/** Controlla tessera e nome dell'ordine. Ritorna { stato, motivo }. */
function verificaTessera_(soci, tessera, nominativo) {
  const socio = soci.find(s => tessKey_(s.numero_tessera) === tessera);
  if (!socio) return { stato: 'da_verificare', motivo: 'Tessera non trovata' };
  if (!isSi(socio.tessera_attiva)) return { stato: 'da_verificare', motivo: 'Tessera non attiva' };
  if (!stessoNome_(socio.nominativo, nominativo)) return { stato: 'da_verificare', motivo: 'Nominativo non corrispondente' };
  return { stato: 'valido', motivo: '' };
}

/**
 * Salva l'ordine di una persona in una raccolta. Va chiamata con il lock già preso.
 * chi = { modo: 'socio' | 'admin' | 'anonimo', tessera, nominativo, autore, origine }
 *   - socio e admin: il nuovo ordine sostituisce quelli precedenti della stessa tessera in questa raccolta;
 *     con annulla = true e nessun prodotto, l'ordine precedente viene solo annullato;
 *   - anonimo: un secondo ordine della stessa tessera diventa "da verificare".
 * Le raccolte chiuse rifiutano sempre l'ordine, anche per gli amministratori.
 * Ritorna { ok, stato, messaggio, ordineId, modificato, annullato }.
 */
function salvaOrdineRaccolta_(chi, cicloId, items, note, annulla) {
  cicloId = String(cicloId);
  items = (items || []).filter(it => num(it.quantita) > 0);
  const ciclo = leggiTabella(SHEETS.RACCOLTE).find(c => String(c.id) === cicloId);
  if (!ciclo) return { ok: false, messaggio: 'Raccolta non trovata.' };
  const nomeF = (leggiTabella(SHEETS.FORNITORI).find(f => String(f.id) === String(ciclo.fornitore_id)) || {}).nome || '';
  chiudiSeScaduta_(ciclo, null, 'form');
  if (!raccoltaAperta_(ciclo)) {
    const quando = testoData_(ciclo.chiusura);
    return { ok: false, chiusa: true, messaggio: 'Gli ordini per ' + (nomeF || 'questo fornitore') + ' sono chiusi' + (quando ? (' dal ' + quando) : '') + ': questo ordine non è stato registrato.' };
  }
  const tessera = chi.tessera, nominativo = chi.nominativo;
  const sostituisce = chi.modo === 'socio' || chi.modo === 'admin';
  const precedenti = leggiTabella(SHEETS.ORDINI).filter(o => String(o.raccolta_id) === cicloId
    && tessKey_(o.numero_tessera) === tessera && String(o.stato) !== 'annullato');
  const motivoSost = chi.modo === 'admin' ? 'Sostituito: modificato da un amministratore' : 'Sostituito: modificato dal socio';

  // nessun prodotto: con il link personale (o da amministratore) vuol dire "togli il mio ordine"
  if (!items.length) {
    if (annulla && sostituisce && precedenti.length) {
      const motivoAnn = chi.modo === 'admin' ? 'Annullato da un amministratore' : 'Annullato dal socio';
      precedenti.forEach(o => { aggiornaCella(SHEETS.ORDINI, o._riga, 'stato', 'annullato'); aggiornaCella(SHEETS.ORDINI, o._riga, 'motivo_annullamento', motivoAnn); });
      log_(chi.autore, 'ordine_annullato', precedenti.map(o => o.id).join(', ') + ' – ' + motivoAnn);
      return { ok: true, annullato: true, stato: 'annullato', messaggio: 'Ordine annullato.' };
    }
    return { ok: false, messaggio: 'Nessun prodotto selezionato.' };
  }

  // massimo ordini della raccolta (non blocca chi modifica il proprio ordine)
  const maxO = num(ciclo.max_ordini);
  if (maxO > 0) {
    const validi = leggiTabella(SHEETS.ORDINI).filter(o => String(o.raccolta_id) === cicloId && String(o.stato) === 'valido');
    const giaSuo = validi.some(o => tessKey_(o.numero_tessera) === tessera);
    const distinti = new Set(validi.map(o => tessKey_(o.numero_tessera))).size;
    if (!giaSuo && distinti >= maxO) return { ok: false, messaggio: 'La raccolta di ' + (nomeF || 'questo fornitore') + ' ha raggiunto il numero massimo di ordini.' };
  }

  // prodotti: devono essere della raccolta e rispettare il massimo per ordine
  const ammessi = {}; prodottiRaccolta_(ciclo).forEach(p => ammessi[String(p.id)] = p);
  for (const it of items) {
    const p = ammessi[String(it.prodottoId)];
    if (!p) return { ok: false, messaggio: 'Un prodotto scelto per ' + (nomeF || 'questa raccolta') + ' non è più disponibile: ricarica la pagina.' };
    const maxPer = p.max_per_ordine === '' ? null : num(p.max_per_ordine);
    if (maxPer != null && num(it.quantita) > maxPer) return { ok: false, messaggio: 'Per "' + p.nome + '" il massimo per ordine è ' + maxPer + ' ' + (p.unita || '') + '.' };
  }

  let { stato, motivo } = verificaTessera_(leggiTabella(SHEETS.SOCI), tessera, nominativo);
  let conflitto = false, sostituiti = 0;
  if (sostituisce) {
    precedenti.forEach(o => { aggiornaCella(SHEETS.ORDINI, o._riga, 'stato', 'annullato');
      aggiornaCella(SHEETS.ORDINI, o._riga, 'motivo_annullamento', motivoSost); sostituiti++; });
  } else if (precedenti.some(o => String(o.stato) === 'valido')) {
    conflitto = true; stato = 'da_verificare';
    motivo = (motivo ? motivo + '; ' : '') + 'ordine multiplo: il socio ha già un ordine in questa raccolta';
  }

  const ordineId = nuovoId(SHEETS.ORDINI, 'OR');
  try { assicuraColonna_(SHEETS.ORDINI, 'origine'); } catch (e) {}
  aggiungiRiga(SHEETS.ORDINI, {
    id: ordineId, raccolta_id: cicloId, numero_tessera: tessera,
    nominativo_inserito: nominativo, stato: stato, motivo_annullamento: motivo,
    note: String(note || '').trim(), origine: chi.origine || '',
    timestamp: new Date()
  });
  items.forEach((it, i) => {
    aggiungiRiga(SHEETS.RIGHE, {
      id: ordineId + '-' + (i + 1), ordine_id: ordineId, prodotto_id: String(it.prodottoId),
      opzione_id: String(it.opzioneId || ''), nota_socio: String(it.notaSocio || ''),
      quantita: num(it.quantita), peso_confermato: ''
    });
  });
  log_(chi.autore, sostituiti ? 'ordine_modificato' : ('ordine_' + stato),
    ordineId + (motivo ? (' – ' + motivo) : '') + (sostituiti ? ' (sostituisce il precedente)' : '') + (chi.modo === 'admin' ? (' – per la tessera ' + tessera) : ''));

  const msg = stato === 'valido'
    ? (sostituiti ? 'Ordine aggiornato.' : 'Ordine registrato.')
    : (conflitto
        ? 'Risulti già avere un ordine per questa raccolta. Il nuovo ordine è stato registrato e verrà verificato da un amministratore o dal fornitore, che potranno contattarti.'
        : 'Ordine registrato, ma segnalato per verifica (' + motivo + '). Un amministratore lo controllerà.');
  return { ok: true, stato: stato, messaggio: msg, ordineId: ordineId, modificato: sostituiti > 0, motivo: motivo };
}

/** Chi sta ordinando: dal link personale, dal pannello (per conto di un socio) o dal form comune. */
function chiOrdina_(payload) {
  if (payload.adminToken) {
    checkToken_(payload.adminToken); // lancia "Non autorizzato."
    const tessera = tessKey_(payload.tessera);
    const s = leggiTabella(SHEETS.SOCI).find(x => tessKey_(x.numero_tessera) === tessera);
    return { modo: 'admin', tessera: tessera, nominativo: s ? String(s.nominativo || '') : String(payload.nominativo || '').trim(),
             autore: _ADMIN_CORRENTE || 'admin', origine: 'amministratore' };
  }
  if (payload.socioToken) {
    const so = socioDaToken_(payload.socioToken);
    return { modo: 'socio', tessera: so.tessera, nominativo: so.nominativo,
             autore: 'socio:' + so.tessera + (so.isAdmin ? (' (' + so.adminNome + ')') : ''), origine: 'link personale' };
  }
  const tessera = tessKey_(payload.tessera);
  return { modo: 'anonimo', tessera: tessera, nominativo: String(payload.nominativo || '').trim(), autore: tessera, origine: 'link comune' };
}

/**
 * Salva un ordine (form di una sola raccolta). items = [{prodottoId, opzioneId, quantita, notaSocio}]
 * Restituisce {ok, stato, messaggio}.
 */
function submitOrder(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // serializza gli invii concorrenti
  try {
    let chi;
    try { chi = chiOrdina_(payload); } catch (e) { return { ok: false, messaggio: e.message }; }
    if (!chi.tessera) return { ok: false, messaggio: 'Inserisci il numero di tessera.' };
    if (!chi.nominativo) return { ok: false, messaggio: 'Inserisci il nominativo.' };
    const r = salvaOrdineRaccolta_(chi, payload.cicloId, payload.items, payload.note, false);
    if (r.ok && r.stato === 'valido') r.messaggio = r.messaggio.replace(/\.$/, '. Grazie!');
    return r;
  } finally {
    lock.releaseLock();
  }
}

/* ===================== PAGINA UNICA "ORDINI APERTI" (?ordini) ===================== */

/**
 * Tutte le raccolte aperte, dalla chiusura più vicina (quelle senza data in fondo).
 * opz: { socioToken } (link personale), { adminToken } (ordine per conto di un socio) o niente (link comune).
 */
function getOrdiniAperti(opz) {
  opz = opz || {};
  try { chiusuraAutomatica('pagina ordini'); } catch (e) {}
  const out = { modo: 'anonimo' };
  let so = null;
  if (opz.adminToken) {
    checkToken_(opz.adminToken);
    out.modo = 'admin';
    out.admin = { nome: _ADMIN_CORRENTE || 'Amministratore' };
    out.soci = leggiTabella(SHEETS.SOCI).filter(s => tessKey_(s.numero_tessera))
      .map(s => ({ tessera: tessKey_(s.numero_tessera), nominativo: String(s.nominativo || ''), attiva: isSi(s.tessera_attiva) }))
      .sort((a, b) => a.nominativo.localeCompare(b.nominativo, 'it'));
    out.pannelloUrl = urlApp() + '?admin=' + encodeURIComponent(String(opz.adminToken));
  } else if (opz.socioToken) {
    so = socioDaToken_(opz.socioToken);
    out.modo = 'socio';
    out.socio = { tessera: so.tessera, nominativo: so.nominativo, attiva: so.attiva,
                  portaleUrl: urlApp() + '?socio=' + encodeURIComponent(so.token) };
  }
  const cx = contestoForm_();
  const lontano = 8.64e15;
  out.raccolte = leggiTabella(SHEETS.RACCOLTE).filter(r => raccoltaAperta_(r))
    .map(r => raccoltaPerForm_(r, cx))
    .filter(r => r.prodotti.length)
    .sort((a, b) => (a.ciclo.chiusuraTs || lontano) - (b.ciclo.chiusuraTs || lontano));
  out.categorie = cx.categorie.map(c => ({ id: String(c.id), nome: c.nome, emoji: c.emoji || '' }));
  out.esistenti = so ? ordiniApertiDi_(so.tessera) : {};
  return out;
}

/** Ordini non annullati di una tessera nelle raccolte aperte: { raccoltaId: { righe, note } }. */
function ordiniApertiDi_(tessera) {
  const aperte = {}; leggiTabella(SHEETS.RACCOLTE).forEach(r => { if (raccoltaAperta_(r)) aperte[String(r.id)] = true; });
  const per = {}, idOrd = {};
  leggiTabella(SHEETS.ORDINI).forEach(o => {
    const rid = String(o.raccolta_id);
    if (!aperte[rid] || tessKey_(o.numero_tessera) !== tessera || String(o.stato) === 'annullato') return;
    const e = per[rid] = per[rid] || { righe: [], note: [] };
    if (o.note) e.note.push(String(o.note));
    idOrd[String(o.id)] = rid;
  });
  leggiTabella(SHEETS.RIGHE).forEach(r => {
    const rid = idOrd[String(r.ordine_id)]; if (!rid) return;
    per[rid].righe.push({ prodottoId: String(r.prodotto_id), opzioneId: String(r.opzione_id || ''), quantita: num(r.quantita), notaSocio: String(r.nota_socio || '') });
  });
  Object.keys(per).forEach(k => per[k].note = per[k].note.join(' · '));
  return per;
}

/** Pannello: ordini già presenti del socio scelto, per precompilare la pagina. */
function ordiniApertiSocio(adminToken, tessera) {
  checkToken_(adminToken);
  return ordiniApertiDi_(tessKey_(tessera));
}

/**
 * Invio della pagina unica: un ordine per ogni raccolta toccata.
 * payload = { tessera, nominativo, socioToken | adminToken,
 *             ordini: [{ cicloId, items:[{prodottoId, opzioneId, quantita, notaSocio}], note, annulla }] }
 * Ogni raccolta ha il suo esito: se una si è chiusa nel frattempo, le altre vengono registrate lo stesso.
 * Ritorna { ok, esiti: [{ cicloId, ok, stato, messaggio, ... }] }.
 */
function submitOrdini(payload) {
  payload = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // un invio alla volta: niente numeri d'ordine doppi
  try {
    let chi;
    try { chi = chiOrdina_(payload); } catch (e) { return { ok: false, messaggio: e.message }; }
    if (!chi.tessera) return { ok: false, messaggio: 'Inserisci il numero di tessera.' };
    if (!chi.nominativo) return { ok: false, messaggio: 'Inserisci nome e cognome.' };
    const ordini = Array.isArray(payload.ordini) ? payload.ordini : [];
    if (!ordini.length) return { ok: false, messaggio: 'Scegli almeno un prodotto.' };
    if (ordini.length > 40) return { ok: false, messaggio: 'Troppe raccolte in un solo invio.' };
    const esiti = ordini.map(o => {
      let r;
      try { r = salvaOrdineRaccolta_(chi, o.cicloId, o.items, o.note, !!o.annulla); }
      catch (e) { r = { ok: false, messaggio: 'Errore: ' + ((e && e.message) || e) }; }
      r.cicloId = String(o.cicloId);
      return r;
    });
    return { ok: esiti.some(e => e.ok), esiti: esiti, modo: chi.modo };
  } finally {
    lock.releaseLock();
  }
}

/** Link della pagina unica, da fissare in cima alla Community (accorciato, se possibile). */
function linkPaginaOrdini() {
  return accorcia_(urlLink_() + '?ordini=1');
}

/** Pannello: link della pagina unica. */
function adminLinkPaginaOrdini(token) {
  checkToken_(token);
  return { link: linkPaginaOrdini(), lungo: urlLink_() + '?ordini=1' };
}
