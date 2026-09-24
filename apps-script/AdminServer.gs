/**
 * AdminServer.gs (rinominato da Admin.gs per non collidere con Admin.html)
 * Admin.gs — funzioni chiamate dal pannello amministratore.
 * Ogni funzione riceve il token e lo verifica.
 */

// Admin che sta operando in questa richiesta (per il log). Impostato da checkToken_.
var _ADMIN_CORRENTE = '';

function checkToken_(token) {
  const t = String(token || '').trim();
  if (t) {
    const s = leggiTabella(SHEETS.SOCI).find(x => String(x.token || '').trim() === t);
    if (s && ruoliTessera_(s.numero_tessera).admin) { _ADMIN_CORRENTE = String(s.nominativo || tessKey_(s.numero_tessera)); _ADMIN_TESSERA = tessKey_(s.numero_tessera); return; }
  }
  // token di emergenza nelle proprietà del progetto (ADMIN_TOKEN)
  const atteso = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  if (atteso && t === atteso) { _ADMIN_CORRENTE = 'admin (master)'; _ADMIN_TESSERA = ''; return; }
  throw new Error('Non autorizzato.');
}
var _ADMIN_TESSERA = '';

/** Log di un'azione admin, con l'autore corrente. */
function logAdmin_(azione, dettaglio) { log_(_ADMIN_CORRENTE || 'admin', azione, dettaglio); }

/** Elenco dei cicli con conteggi utili, per la dashboard. */
/**
 * Elenco raccolte. vista = 'storico': solo quelle concluse (consegnate o archiviate), dalla più recente;
 * altrimenti solo quelle in corso. Lo storico si carica solo quando l'amministratore lo apre.
 */
function adminListaCicli(token, vista) {
  checkToken_(token);
  try { chiusuraAutomatica('pannello'); } catch (e) {} // chiude subito le raccolte scadute
  const storico = vista === 'storico';
  const fornitori = {}; leggiTabella(SHEETS.FORNITORI).forEach(f => fornitori[String(f.id)] = f);
  const consegne = {}; leggiTabellaSafe_(SHEETS.CONSEGNE).forEach(co => consegne[String(co.id)] = co);
  const conta = {}; // raccolta_id -> { valido, da_verificare }
  leggiTabella(SHEETS.ORDINI).forEach(o => {
    const k = String(o.raccolta_id); const x = conta[k] = conta[k] || { valido: 0, da_verificare: 0 };
    if (String(o.stato) === 'valido') x.valido++; else if (String(o.stato) === 'da_verificare') x.da_verificare++;
  });
  const lista = leggiTabella(SHEETS.RACCOLTE).filter(c => raccoltaConclusa_(c) === storico).map(c => {
    const f = fornitori[String(c.fornitore_id)] || {};
    const dtCons = dataConsegnaRaccolta_(c, consegne);
    const dt = dtCons || parseChiusura_(c.chiusura);
    const x = conta[String(c.id)] || { valido: 0, da_verificare: 0 };
    const cid = String(c.consegna_id || '');
    return {
      id: String(c.id),
      fornitore: f.nome || String(c.fornitore_id),
      fornitoreId: String(c.fornitore_id || ''),
      fornitoreAttivo: isSi(f.attivo),
      stato: String(c.stato || '').trim().toLowerCase(),
      chiusura: c.chiusura ? testoData_(c.chiusura) : '',
      dataConsegna: cid && consegne[cid] ? testoData_(consegne[cid].data) : testoData_(c.data_consegna || ''),
      dt: dt ? dt.getTime() : 0,
      consegnaPassata: consegnaPassata_(dtCons),
      nValidi: x.valido,
      nDaVerificare: x.da_verificare
    };
  });
  if (storico) lista.sort((a, b) => b.dt - a.dt);
  return lista;
}

/** (Admin) Segna una raccolta come consegnata: esce dalle consegne in corso e va nello storico. */
function adminSegnaConsegnata(token, cicloId) {
  checkToken_(token);
  const c = leggiTabella(SHEETS.RACCOLTE).find(x => String(x.id) === String(cicloId));
  if (!c) throw new Error('Raccolta non trovata.');
  if (raccoltaAperta_(c)) throw new Error('Prima chiudi gli ordini di questa raccolta.');
  const st = String(c.stato || '').trim().toLowerCase();
  if (st !== 'chiuso' && st !== 'chiusa' && st !== 'definitivo') throw new Error('Si può segnare come consegnata solo una raccolta chiusa.');
  aggiornaCella(SHEETS.RACCOLTE, c._riga, 'stato', 'consegnato');
  logAdmin_('raccolta_consegnata', String(cicloId));
  return true;
}

/**
 * (Admin) Riporta una raccolta conclusa tra quelle in corso (stato "chiuso"), per correggere
 * un "Segna come consegnata" toccato per errore. Non vale per le raccolte con la data di consegna
 * già passata: la chiusura automatica le rimetterebbe subito nello storico.
 */
function adminRiportaInCorso(token, cicloId) {
  checkToken_(token);
  const c = leggiTabella(SHEETS.RACCOLTE).find(x => String(x.id) === String(cicloId));
  if (!c) throw new Error('Raccolta non trovata.');
  const consegne = {}; leggiTabellaSafe_(SHEETS.CONSEGNE).forEach(co => consegne[String(co.id)] = co);
  if (consegnaPassata_(dataConsegnaRaccolta_(c, consegne))) throw new Error('La data di consegna è già passata: per spostarla, cambia prima la data della consegna.');
  aggiornaCella(SHEETS.RACCOLTE, c._riga, 'stato', 'chiuso');
  logAdmin_('raccolta_riportata_in_corso', String(cicloId));
  return true;
}

/** Restituisce il link (accorciato) al form del ciclo. */
function adminLinkForm(token, cicloId) {
  checkToken_(token);
  return linkForm(cicloId);
}

/** Genera un messaggio di testo (tipo: apertura|chiusura). */
function adminGeneraMessaggio(token, tipo, cicloId) {
  checkToken_(token);
  if (tipo === 'apertura') return msgApertura(cicloId);
  if (tipo === 'chiusura') return msgChiusura(cicloId);
  return 'Tipo messaggio sconosciuto.';
}

/** Genera il PDF dello stato provvisorio (una riga per tessera): {filename, base64}. */
function adminPdfStato(token, cicloId) {
  checkToken_(token);
  return pdfStatoProvvisorio(cicloId);
}

/** Genera il PDF dello stato definitivo (una riga per tessera): {filename, base64}. */
function adminPdfDefinitivo(token, cicloId) {
  checkToken_(token);
  return pdfStatoDefinitivo(cicloId);
}

/** Chiude un ciclo. */
function adminChiudiCiclo(token, cicloId) {
  checkToken_(token);
  const c = leggiTabella(SHEETS.RACCOLTE).find(x => String(x.id) === String(cicloId));
  if (!c) throw new Error('Ciclo non trovato.');
  aggiornaCella(SHEETS.RACCOLTE, c._riga, 'stato', 'chiuso');
  logAdmin_('ciclo_chiuso', String(cicloId));
  return true;
}

/** Riapre un ciclo (prolungamento). */
function adminRiapriCiclo(token, cicloId) {
  checkToken_(token);
  const c = leggiTabella(SHEETS.RACCOLTE).find(x => String(x.id) === String(cicloId));
  if (!c) throw new Error('Ciclo non trovato.');
  aggiornaCella(SHEETS.RACCOLTE, c._riga, 'stato', 'aperto');
  logAdmin_('ciclo_riaperto', String(cicloId));
  return true;
}

/** Elenco ordini "da verificare" di un ciclo. */
function adminOrdiniDaVerificare(token, cicloId) {
  checkToken_(token);
  return leggiTabella(SHEETS.ORDINI)
    .filter(o => String(o.raccolta_id) === String(cicloId) && String(o.stato) === 'da_verificare')
    .map(o => ({
      id: String(o.id), tessera: tessKey_(o.numero_tessera),
      nominativo: o.nominativo_inserito, motivo: o.motivo_annullamento
    }));
}

/** Conferma un ordine da verificare (diventa valido). */
function adminConfermaOrdine(token, ordineId) {
  checkToken_(token);
  const o = leggiTabella(SHEETS.ORDINI).find(x => String(x.id) === String(ordineId));
  if (!o) throw new Error('Ordine non trovato.');
  aggiornaCella(SHEETS.ORDINI, o._riga, 'stato', 'valido');
  aggiornaCella(SHEETS.ORDINI, o._riga, 'motivo_annullamento', '');
  logAdmin_('ordine_confermato', String(ordineId));
  return true;
}

/** Annulla un ordine (con motivo). */
function adminAnnullaOrdine(token, ordineId, motivo) {
  checkToken_(token);
  const o = leggiTabella(SHEETS.ORDINI).find(x => String(x.id) === String(ordineId));
  if (!o) throw new Error('Ordine non trovato.');
  aggiornaCella(SHEETS.ORDINI, o._riga, 'stato', 'annullato');
  aggiornaCella(SHEETS.ORDINI, o._riga, 'motivo_annullamento', String(motivo || 'Annullato dall\'amministratore'));
  logAdmin_('ordine_annullato', String(ordineId) + ' – ' + (motivo || ''));
  return true;
}

/** (Admin) Crea una nuova raccolta (un fornitore, stato aperto). */
function adminAggiungiRaccolta(token, d) {
  checkToken_(token);
  const fid = String(d.fornitoreId || '');
  const f = leggiTabella(SHEETS.FORNITORI).find(x => String(x.id) === fid);
  if (!f) throw new Error('Scegli un fornitore valido.');
  const id = nuovoId(SHEETS.RACCOLTE, 'RA');
  const oggi = Utilities.formatDate(new Date(), 'Europe/Rome', 'dd-MM-yyyy');
  aggiungiRiga(SHEETS.RACCOLTE, {
    id: id, fornitore_id: fid, apertura: oggi,
    chiusura: String(d.chiusura || '').trim(), stato: 'aperto',
    avvisi: String(d.avvisi || '').trim(), luogo_id: String(d.luogoId || ''),
    max_ordini: (num(d.maxOrdini) > 0 ? num(d.maxOrdini) : ''),
    prodotti_ids: (Array.isArray(d.prodottiIds) ? d.prodottiIds.join(';') : String(d.prodottiIds || '')),
    data_consegna: '', fascia_oraria: '', referente_consegna: '', telefono_referente: '', note: ''
  });
  logAdmin_('raccolta_creata', id + ' (' + f.nome + ')');
  return { ok: true, id: id };
}

/** (Admin) Prodotti attivi di un fornitore, per scegliere quali includere in una raccolta. */
function adminProdottiFornitore(token, fornitoreId) {
  checkToken_(token);
  const cat = {}; leggiTabella(SHEETS.CATEGORIE).forEach(c => cat[String(c.id)] = c);
  return leggiTabella(SHEETS.PRODOTTI)
    .filter(p => String(p.fornitore_id) === String(fornitoreId) && isSi(p.attivo))
    .map(p => ({
      id: String(p.id), nome: p.nome, emoji: p.emoji || '',
      categoria: (cat[String(p.categoria_id)] || {}).nome || ''
    }));
}

/** (Admin) Dati di una raccolta (per il form di modifica). */
function adminRaccolta(token, id) {
  checkToken_(token);
  const c = leggiTabella(SHEETS.RACCOLTE).find(x => String(x.id) === String(id));
  if (!c) throw new Error('Raccolta non trovata.');
  return {
    fornitoreId: String(c.fornitore_id || ''),
    chiusura: testoData_(c.chiusura),
    avvisi: c.avvisi || '',
    maxOrdini: (c.max_ordini === '' || c.max_ordini == null) ? '' : num(c.max_ordini),
    prodottiIds: String(c.prodotti_ids || '').split(/[;,]/).map(s => s.trim()).filter(Boolean),
    stato: c.stato || ''
  };
}

/** (Admin) Modifica i dati di una raccolta. */
function adminModificaRaccolta(token, id, d) {
  checkToken_(token);
  const c = leggiTabella(SHEETS.RACCOLTE).find(x => String(x.id) === String(id));
  if (!c) throw new Error('Raccolta non trovata.');
  if (d.fornitoreId) {
    const f = leggiTabella(SHEETS.FORNITORI).find(x => String(x.id) === String(d.fornitoreId));
    if (!f) throw new Error('Fornitore non valido.');
    aggiornaCella(SHEETS.RACCOLTE, c._riga, 'fornitore_id', String(d.fornitoreId));
  }
  if (d.chiusura !== undefined) aggiornaCella(SHEETS.RACCOLTE, c._riga, 'chiusura', String(d.chiusura).trim());
  if (d.avvisi !== undefined) aggiornaCella(SHEETS.RACCOLTE, c._riga, 'avvisi', String(d.avvisi).trim());
  if (d.maxOrdini !== undefined) aggiornaCella(SHEETS.RACCOLTE, c._riga, 'max_ordini', num(d.maxOrdini) > 0 ? num(d.maxOrdini) : '');
  if (d.prodottiIds !== undefined) aggiornaCella(SHEETS.RACCOLTE, c._riga, 'prodotti_ids',
    Array.isArray(d.prodottiIds) ? d.prodottiIds.join(';') : String(d.prodottiIds || ''));
  logAdmin_('raccolta_modificata', String(id));
  return { ok: true };
}

/** (Admin) Elenco categorie globali (condivise tra i listini). */
function adminListaCategorie(token) {
  checkToken_(token);
  return leggiTabella(SHEETS.CATEGORIE)
    .map(c => ({ id: String(c.id), nome: c.nome || '', emoji: c.emoji || '', ordine: num(c.ordine) }))
    .sort((a, b) => a.ordine - b.ordine || a.nome.localeCompare(b.nome));
}

/** (Admin) Crea una categoria globale. */
function adminAggiungiCategoria(token, d) {
  checkToken_(token);
  const nome = String(d.nome || '').trim();
  if (!nome) throw new Error('Il nome della categoria è obbligatorio.');
  const id = nuovoId(SHEETS.CATEGORIE, 'C');
  aggiungiRiga(SHEETS.CATEGORIE, { id: id, fornitore_id: '', nome: nome, emoji: String(d.emoji || '').trim(), ordine: num(d.ordine) || '' });
  logAdmin_('categoria_creata', id + ' ' + nome);
  return { ok: true, id: id };
}

/** (Admin) Modifica una categoria. */
function adminModificaCategoria(token, id, d) {
  checkToken_(token);
  const c = leggiTabella(SHEETS.CATEGORIE).find(x => String(x.id) === String(id));
  if (!c) throw new Error('Categoria non trovata.');
  if (d.nome !== undefined) aggiornaCella(SHEETS.CATEGORIE, c._riga, 'nome', String(d.nome).trim());
  if (d.emoji !== undefined) aggiornaCella(SHEETS.CATEGORIE, c._riga, 'emoji', String(d.emoji).trim());
  if (d.ordine !== undefined) aggiornaCella(SHEETS.CATEGORIE, c._riga, 'ordine', num(d.ordine) || '');
  logAdmin_('categoria_modificata', String(id));
  return { ok: true };
}

/** (Admin) Elimina una categoria (i prodotti che la usavano restano senza categoria). */
function adminEliminaCategoria(token, id) {
  checkToken_(token);
  const c = leggiTabella(SHEETS.CATEGORIE).find(x => String(x.id) === String(id));
  if (!c) throw new Error('Categoria non trovata.');
  eliminaRiga_(SHEETS.CATEGORIE, c._riga);
  logAdmin_('categoria_eliminata', String(id));
  return { ok: true };
}

/** (Admin) Statistiche sugli ordini validi, con filtro periodo opzionale (date GG-MM-AAAA). */
function adminStatistiche(token, dalStr, alStr) {
  checkToken_(token);
  const dal = dalStr ? parseChiusura_(dalStr) : null;
  const al = alStr ? parseChiusura_(alStr) : null;

  const prodById = {}; leggiTabella(SHEETS.PRODOTTI).forEach(p => prodById[String(p.id)] = p);
  const opz = {}; leggiTabella(SHEETS.OPZIONI).forEach(o => opz[String(o.id)] = o);
  const fornById = {}; leggiTabella(SHEETS.FORNITORI).forEach(f => fornById[String(f.id)] = f);
  const cons = {}; leggiTabellaSafe_(SHEETS.CONSEGNE).forEach(c => cons[String(c.id)] = c);
  const luoghi = {}; leggiTabella(SHEETS.LUOGHI).forEach(l => luoghi[String(l.id)] = l);
  const raccolte = leggiTabella(SHEETS.RACCOLTE);
  const raccById = {}; raccolte.forEach(r => raccById[String(r.id)] = r);

  function refData(r){ let dt = parseChiusura_(consegnaDiRaccolta_(r).data); if (!dt) dt = parseChiusura_(r.chiusura); return dt; }
  const incl = {};
  raccolte.forEach(r => { const dt = refData(r); if (dal && (!dt || dt < dal)) return; if (al && (!dt || dt > al)) return; incl[String(r.id)] = true; });

  const ordini = leggiTabella(SHEETS.ORDINI).filter(o => String(o.stato) === 'valido' && incl[String(o.raccolta_id)]);
  const idOrd = {}; ordini.forEach(o => idOrd[String(o.id)] = o);

  const perF = {}, perP = {}, perS = {}, perC = {};
  let volume = 0; const raccSet = {}, sociSet = {};
  leggiTabella(SHEETS.RIGHE).forEach(rg => {
    const o = idOrd[String(rg.ordine_id)]; if (!o) return;
    const qta = num(rg.quantita); if (qta <= 0) return;
    const prod = prodById[String(rg.prodotto_id)]; if (!prod) return;
    const rc = raccById[String(o.raccolta_id)] || {};
    if (String(prod.fornitore_id) !== String(rc.fornitore_id || '')) return; // ignora righe incoerenti
    const op = rg.opzione_id ? opz[String(rg.opzione_id)] : null;
    const imp = prezzoRiga_(prod, op, qta, num(rg.peso_confermato));
    volume += imp;
    const fid = String(rc.fornitore_id || '');
    raccSet[String(o.raccolta_id)] = true; sociSet[tessKey_(o.numero_tessera)] = true;

    const pk = String(rg.prodotto_id);
    if (!perP[pk]) perP[pk] = { nome: prod.nome, qta: 0, volume: 0 };
    perP[pk].qta += qta; perP[pk].volume += imp;

    if (!perF[fid]) perF[fid] = { nome: (fornById[fid] || {}).nome || fid, volume: 0, ordini: {} };
    perF[fid].volume += imp; perF[fid].ordini[String(o.id)] = true;

    const tk = tessKey_(o.numero_tessera);
    if (!perS[tk]) perS[tk] = { tessera: tk, nominativo: o.nominativo_inserito || '', volume: 0, ordini: {} };
    perS[tk].volume += imp; perS[tk].ordini[String(o.id)] = true;

    const cid = String(rc.consegna_id || '') || '(senza consegna)';
    if (!perC[cid]) { const co = cons[cid] || {}; const lu = luoghi[String(co.luogo_id || '')] || {};
      perC[cid] = { etichetta: cid === '(senza consegna)' ? '(senza consegna)' : ((co.data ? testoData_(co.data) : '') + ' ' + (lu.nome || '')).trim(), volume: 0, raccolte: {} }; }
    perC[cid].volume += imp; perC[cid].raccolte[String(o.raccolta_id)] = true;
  });

  const A = (obj, fn) => Object.keys(obj).map(k => fn(obj[k]));
  return {
    generali: { volume: volume, nOrdini: ordini.length, nSoci: Object.keys(sociSet).length,
                nRaccolte: Object.keys(raccSet).length, nFornitori: Object.keys(perF).length, nProdotti: Object.keys(perP).length },
    perFornitore: A(perF, x => ({ nome: x.nome, nOrdini: Object.keys(x.ordini).length, volume: x.volume })).sort((a,b)=>b.volume-a.volume),
    perProdotto:  A(perP, x => ({ nome: x.nome, qta: x.qta, volume: x.volume })).sort((a,b)=>b.volume-a.volume).slice(0,80),
    perSocio:     A(perS, x => ({ tessera: x.tessera, nominativo: x.nominativo, nOrdini: Object.keys(x.ordini).length, volume: x.volume })).sort((a,b)=>b.volume-a.volume).slice(0,80),
    perConsegna:  A(perC, x => ({ etichetta: x.etichetta, nRaccolte: Object.keys(x.raccolte).length, volume: x.volume })).sort((a,b)=>b.volume-a.volume)
  };
}

/* ===================== GESTIONE AMMINISTRATORI ===================== */
/* Un amministratore è un socio: nessun token proprio, usa il link personale del socio. */

/** (Admin) Elenco amministratori (nome dal socio collegato). */
function adminListaAdmin(token) {
  checkToken_(token);
  const soci = {}; leggiTabella(SHEETS.SOCI).forEach(s => soci[tessKey_(s.numero_tessera)] = s);
  return leggiTabellaSafe_(SHEETS.ADMIN).map(a => {
    const tess = tessKey_(a.numero_tessera);
    return { id: String(a.id || ''), nome: (soci[tess] || {}).nominativo || a.nome || '(socio non trovato)', tessera: tess,
      attivo: (a.attivo === undefined || String(a.attivo).trim() === '' || isSi(a.attivo)), io: !!tess && tess === _ADMIN_TESSERA };
  });
}
/** Prepara le colonne della scheda Admin. */
function assicuraSchedaAdmin_() { ['id', 'numero_tessera', 'nome', 'attivo'].forEach(c => assicuraColonna_(SHEETS.ADMIN, c)); }

/** (Admin) Rende amministratore un socio (tessera). Usa il suo link personale. */
function adminAggiungiAdmin(token, d) {
  checkToken_(token);
  const tess = tessKey_(d.tessera);
  if (!tess) throw new Error('Indica la tessera del socio.');
  const socio = trovaSocio_(tess);
  if (!isSi(socio.tessera_attiva)) throw new Error('La tessera ' + tess + ' non è attiva.');
  assicuraSchedaAdmin_();
  const esist = leggiTabellaSafe_(SHEETS.ADMIN).find(a => tessKey_(a.numero_tessera) === tess);
  if (esist) {
    if (esist.attivo !== undefined && String(esist.attivo).trim() !== '' && !isSi(esist.attivo)) {
      aggiornaCella(SHEETS.ADMIN, esist._riga, 'attivo', 'SI'); logAdmin_('admin_riattivato', tess);
    } else throw new Error('Questo socio è già amministratore.');
  } else {
    const id = nuovoId(SHEETS.ADMIN, 'A');
    aggiungiRiga(SHEETS.ADMIN, { id: id, nome: socio.nominativo || '', numero_tessera: tess, attivo: 'SI' });
    logAdmin_('admin_creato', id + ' ' + (socio.nominativo || tess));
  }
  const r = risultatoLinkSocio_(trovaSocio_(tess));
  return { ok: true, link: r.link, messaggio: r.messaggio, waUrl: r.waUrl };
}
/** (Admin) Attiva o disattiva un amministratore. */
function adminModificaAdmin(token, id, d) {
  checkToken_(token);
  const a = leggiTabellaSafe_(SHEETS.ADMIN).find(x => String(x.id) === String(id));
  if (!a) throw new Error('Amministratore non trovato.');
  if (d.attivo !== undefined) {
    if (!d.attivo && tessKey_(a.numero_tessera) === _ADMIN_TESSERA) throw new Error('Non puoi disattivare te stesso.');
    if (d.attivo && !isSi(trovaSocio_(a.numero_tessera).tessera_attiva)) throw new Error('La tessera del socio non è attiva: riattivala prima.');
    assicuraColonna_(SHEETS.ADMIN, 'attivo');
    aggiornaCella(SHEETS.ADMIN, a._riga, 'attivo', d.attivo ? 'SI' : 'NO');
  }
  logAdmin_('admin_modificato', String(id) + (d.attivo === false ? ' (disattivato)' : ''));
  return { ok: true };
}
/** (Admin) Toglie il ruolo di amministratore (il socio resta socio, con il suo link). */
function adminEliminaAdmin(token, id) {
  checkToken_(token);
  const lista = leggiTabellaSafe_(SHEETS.ADMIN);
  const a = lista.find(x => String(x.id) === String(id));
  if (!a) throw new Error('Amministratore non trovato.');
  if (tessKey_(a.numero_tessera) === _ADMIN_TESSERA) throw new Error('Non puoi rimuovere te stesso.');
  const attivi = lista.filter(x => x.attivo === undefined || String(x.attivo).trim() === '' || isSi(x.attivo));
  if (attivi.length <= 1 && attivi.indexOf(a) >= 0) throw new Error('Deve restare almeno un amministratore.');
  eliminaRiga_(SHEETS.ADMIN, a._riga);
  logAdmin_('admin_rimosso', String(id) + ' tessera ' + tessKey_(a.numero_tessera));
  return { ok: true };
}
/** (Admin) Link del proprio profilo: socio e (se lo è) fornitore. */
function adminProfilo(token) {
  checkToken_(token);
  const base = urlApp();
  if (!_ADMIN_TESSERA) return { url: base, socioUrl: '', fornitoreUrl: '' };
  const r = ruoliTessera_(_ADMIN_TESSERA);
  const t = encodeURIComponent(String(token).trim());
  return { url: base, socioUrl: base + '?socio=' + t, fornitoreUrl: r.fornitore ? (base + '?fornitore=' + t) : '' };
}

/** (Admin) Registro delle ultime azioni (dal Log). */
function adminLog(token, n) {
  checkToken_(token);
  n = n || 150;
  const rows = leggiTabella(SHEETS.LOG);
  return rows.slice(-n).reverse().map(r => ({
    quando: testoData_(r.timestamp), utente: r.utente || '', azione: r.azione || '', dettaglio: r.dettaglio || ''
  }));
}

/* ===================== GESTIONE ORDINI (admin) ===================== */
/** Righe leggibili di un ordine. */
function righeOrdine_(ordineId) {
  const prodById = {}; leggiTabella(SHEETS.PRODOTTI).forEach(p => prodById[String(p.id)] = p);
  const opz = {}; leggiTabella(SHEETS.OPZIONI).forEach(o => opz[String(o.id)] = o);
  return leggiTabella(SHEETS.RIGHE).filter(r => String(r.ordine_id) === String(ordineId)).map(r => {
    const p = prodById[String(r.prodotto_id)] || { nome: '?', unita: '' };
    const o = r.opzione_id ? opz[String(r.opzione_id)] : null;
    return { rigaId: String(r.id), prodotto: p.nome + (o ? (' – ' + o.nome) : '') + (r.nota_socio ? (' (' + r.nota_socio + ')') : ''),
             quantita: num(r.quantita), unita: p.unita || '' };
  });
}
/** (Admin) Tutti gli ordini di una raccolta, con le righe. */
function adminOrdiniRaccolta(token, cicloId) {
  checkToken_(token);
  const soci = {}; leggiTabella(SHEETS.SOCI).forEach(s => soci[tessKey_(s.numero_tessera)] = s);
  return leggiTabella(SHEETS.ORDINI)
    .filter(o => String(o.raccolta_id) === String(cicloId) && String(o.stato) !== 'annullato')
    .map(o => ({ id: String(o.id), tessera: tessKey_(o.numero_tessera), nominativo: o.nominativo_inserito || '',
      stato: o.stato, motivo: o.motivo_annullamento || '',
      telefono: (soci[tessKey_(o.numero_tessera)] || {}).telefono || '', note: o.note || '', righe: righeOrdine_(o.id) }))
    .sort((a, b) => a.tessera.localeCompare(b.tessera, undefined, { numeric: true }));
}
/** (Admin) Modifica la quantità di una riga (0 = rimuove la riga). */
function adminModificaRiga(token, rigaId, quantita) {
  checkToken_(token);
  const r = leggiTabella(SHEETS.RIGHE).find(x => String(x.id) === String(rigaId));
  if (!r) throw new Error('Riga non trovata.');
  const q = num(quantita);
  if (q <= 0) { eliminaRiga_(SHEETS.RIGHE, r._riga); logAdmin_('riga_rimossa', rigaId); }
  else { aggiornaCella(SHEETS.RIGHE, r._riga, 'quantita', q); logAdmin_('riga_modificata', rigaId + ' = ' + q); }
  return { ok: true };
}

/** (Admin) URL base della web app (per costruire i link del form). */
function adminUrlApp(token) { checkToken_(token); return urlApp(); }

/* ===================== DA FARE (cose in attesa) ===================== */
/** (Admin) Elenco delle cose che richiedono attenzione. */
function adminDaFare(token) {
  checkToken_(token);
  try { chiusuraAutomatica('pannello'); } catch (e) {}
  const ora = new Date();
  const tra24 = new Date(ora.getTime() + 24 * 3600 * 1000);
  const tra7g = new Date(ora.getTime() + 7 * 24 * 3600 * 1000);
  const fornitori = {}; leggiTabella(SHEETS.FORNITORI).forEach(f => fornitori[String(f.id)] = f);
  const prodById = {}; leggiTabella(SHEETS.PRODOTTI).forEach(p => prodById[String(p.id)] = p);
  const raccolte = leggiTabella(SHEETS.RACCOLTE);
  const ordini = leggiTabella(SHEETS.ORDINI);
  const righe = leggiTabella(SHEETS.RIGHE);
  const nomeF = r => (fornitori[String(r.fornitore_id)] || {}).nome || String(r.fornitore_id);

  // 1) ordini da verificare, raggruppati per raccolta
  const daVer = [];
  raccolte.forEach(r => {
    const l = ordini.filter(o => String(o.raccolta_id) === String(r.id) && String(o.stato) === 'da_verificare');
    if (l.length) daVer.push({ raccoltaId: String(r.id), fornitore: nomeF(r),
      ordini: l.map(o => ({ id: String(o.id), tessera: tessKey_(o.numero_tessera), nominativo: o.nominativo_inserito || '', motivo: o.motivo_annullamento || '' })) });
  });

  // 2) raccolte aperte che chiudono entro 24 ore
  const inChiusura = raccolte.filter(r => raccoltaAperta_(r)).map(r => ({ r: r, dt: parseChiusura_(r.chiusura) }))
    .filter(x => x.dt && x.dt >= ora && x.dt <= tra24)
    .map(x => ({ raccoltaId: String(x.r.id), fornitore: nomeF(x.r), chiusura: testoData_(x.r.chiusura),
      nOrdini: ordini.filter(o => String(o.raccolta_id) === String(x.r.id) && String(o.stato) === 'valido').length }));

  // 3) raccolte chiuse con pesi non ancora confermati
  const pesi = [];
  raccolte.filter(r => String(r.stato) === 'chiuso').forEach(r => {
    const idOrd = {}; ordini.filter(o => String(o.raccolta_id) === String(r.id) && String(o.stato) === 'valido').forEach(o => idOrd[String(o.id)] = true);
    const n = righe.filter(g => idOrd[String(g.ordine_id)] && isSi((prodById[String(g.prodotto_id)] || {}).peso_variabile) && !num(g.peso_confermato)).length;
    if (n) pesi.push({ raccoltaId: String(r.id), fornitore: nomeF(r), nRighe: n });
  });

  // 4) raccolte chiuse senza consegna assegnata
  const senzaConsegna = raccolte.filter(r => String(r.stato) === 'chiuso' && !String(r.consegna_id || '').trim() && !String(r.data_consegna || '').trim())
    .map(r => ({ raccoltaId: String(r.id), fornitore: nomeF(r) }));

  // 5) consegne nei prossimi 7 giorni
  const luoghi = {}; leggiTabella(SHEETS.LUOGHI).forEach(l => luoghi[String(l.id)] = l);
  const oggi0 = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate());
  const consegne = leggiTabellaSafe_(SHEETS.CONSEGNE).map(c => ({ c: c, dt: parseChiusura_(c.data) }))
    .filter(x => x.dt && x.dt >= oggi0 && x.dt <= tra7g).sort((a, b) => a.dt - b.dt)
    .map(x => ({ id: String(x.c.id), data: testoData_(x.c.data), fascia: x.c.fascia_oraria || '',
      luogo: (luoghi[String(x.c.luogo_id || '')] || {}).nome || '',
      fornitori: raccolte.filter(r => String(r.consegna_id) === String(x.c.id)).map(nomeF) }));

  let chiusuraAuto = { trigger: true, nonLeggibili: [] };
  try { chiusuraAuto = statoChiusuraAutomatica_(); } catch (e) {}
  let segnalazioni = [];
  try { segnalazioni = segnalazioniNuove_(); } catch (e) {}
  return { daVerificare: daVer, inChiusura: inChiusura, pesi: pesi, senzaConsegna: senzaConsegna, consegne: consegne, chiusuraAuto: chiusuraAuto, segnalazioni: segnalazioni };
}
