/**
 * SocioServer.gs — Portale personale del socio (link con token, senza account).
 *   ?socio=TOKEN  -> pagina personale: raccolte aperte (ordine modificabile fino alla chiusura),
 *                    prossime consegne, storico.
 *   ?form=ID&socio=TOKEN -> form d'ordine precompilato; il salvataggio sostituisce l'ordine precedente.
 * Il token del socio sta nella colonna "token" della scheda Soci.
 * Gli amministratori usano il loro stesso link (token admin) anche come socio: il token admin
 * viene riconosciuto e collegato alla tessera indicata nella scheda Admin.
 */

function generaTokenSocio_() { return 's-' + Utilities.getUuid().replace(/-/g, '').substring(0, 18); }

/** Aggiunge una colonna alla scheda se manca. */
function assicuraColonna_(nomeScheda, colonna) {
  const sh = trovaScheda_(nomeScheda);
  if (!sh) throw new Error('Scheda mancante: ' + nomeScheda);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim());
  if (headers.indexOf(colonna) < 0) sh.getRange(1, headers.length + 1).setValue(colonna);
}

/** Ruoli di una tessera: amministratore attivo? fornitore attivo? */
function ruoliTessera_(tessera) {
  const t = tessKey_(tessera);
  // i ruoli valgono solo per un socio con tessera attiva
  const socio = leggiTabella(SHEETS.SOCI).find(x => tessKey_(x.numero_tessera) === t);
  if (!t || !socio || !isSi(socio.tessera_attiva)) return { admin: null, fornitore: null };
  const adm = leggiTabellaSafe_(SHEETS.ADMIN).find(a => tessKey_(a.numero_tessera) === t && (a.attivo === undefined || String(a.attivo).trim() === '' || isSi(a.attivo))) || null;
  const forn = leggiTabella(SHEETS.FORNITORI).find(f => tessKey_(f.numero_tessera) === t && t && isSi(f.attivo)) || null;
  return { admin: adm, fornitore: forn };
}

/**
 * Quando un socio viene disattivato decadono i suoi ruoli: amministratore e fornitore
 * vengono segnati come non attivi (restano nell'elenco, per memoria). Riattivando il socio
 * i ruoli NON tornano da soli: vanno riassegnati.
 */
function revocaRuoli_(tessere) {
  const set = {}; (tessere || []).forEach(t => { const k = tessKey_(t); if (k) set[k] = true; });
  if (!Object.keys(set).length) return 0;
  let n = 0;
  leggiTabellaSafe_(SHEETS.ADMIN).forEach(a => {
    const attivo = a.attivo === undefined || String(a.attivo).trim() === '' || isSi(a.attivo);
    if (set[tessKey_(a.numero_tessera)] && attivo) { assicuraColonna_(SHEETS.ADMIN, 'attivo'); aggiornaCella(SHEETS.ADMIN, a._riga, 'attivo', 'NO'); log_('sistema', 'ruolo_admin_decaduto', 'tessera ' + tessKey_(a.numero_tessera)); n++; }
  });
  leggiTabella(SHEETS.FORNITORI).forEach(f => {
    if (set[tessKey_(f.numero_tessera)] && isSi(f.attivo)) { aggiornaCella(SHEETS.FORNITORI, f._riga, 'attivo', 'NO'); log_('sistema', 'ruolo_fornitore_decaduto', f.id + ' tessera ' + tessKey_(f.numero_tessera)); n++; }
  });
  return n;
}
/** Controlli prima di disattivare un socio dal pannello: non se stessi, non l'ultimo amministratore. */
function puoiDisattivareSocio_(tessera) {
  const t = tessKey_(tessera);
  if (t && t === _ADMIN_TESSERA) throw new Error('Non puoi disattivare la tua tessera.');
  const attivi = leggiTabellaSafe_(SHEETS.ADMIN).filter(a => (a.attivo === undefined || String(a.attivo).trim() === '' || isSi(a.attivo)) && ruoliTessera_(a.numero_tessera).admin);
  if (attivi.length === 1 && tessKey_(attivi[0].numero_tessera) === t) throw new Error('È l\'ultimo amministratore attivo: nomina prima un altro amministratore.');
}

/** Identifica la persona dal suo token personale (colonna "token" della scheda Soci). Lancia se non valido. */
function socioDaToken_(token) {
  const t = String(token || '').trim();
  if (!t) throw new Error('Link non valido.');
  const s = leggiTabella(SHEETS.SOCI).find(x => String(x.token || '').trim() === t);
  if (!s) throw new Error('Link non valido o non più attivo. Chiedi un nuovo link a un amministratore.');
  const r = ruoliTessera_(s.numero_tessera);
  return { tessera: tessKey_(s.numero_tessera), nominativo: String(s.nominativo || ''), telefono: String(s.telefono || ''),
           attiva: isSi(s.tessera_attiva), isAdmin: !!r.admin, adminNome: String(s.nominativo || ''),
           isFornitore: !!r.fornitore, fornitoreNome: r.fornitore ? String(r.fornitore.nome || '') : '', token: t, _riga: s._riga };
}

/** Pagina personale: dati completi. */
/**
 * Dati comuni per la pagina del socio e il suo storico: tabelle lette una volta
 * e funzioni per ricostruire i suoi ordini e le consegne.
 */
function contestoOrdiniSocio_(so) {
  const fornitori = {}; leggiTabella(SHEETS.FORNITORI).forEach(f => fornitori[String(f.id)] = f);
  const prodById = {}; leggiTabella(SHEETS.PRODOTTI).forEach(p => prodById[String(p.id)] = p);
  const opz = {}; leggiTabella(SHEETS.OPZIONI).forEach(o => opz[String(o.id)] = o);
  const luoghi = {}; leggiTabella(SHEETS.LUOGHI).forEach(l => luoghi[String(l.id)] = l);
  const consegne = {}; leggiTabellaSafe_(SHEETS.CONSEGNE).forEach(c => consegne[String(c.id)] = c);
  const raccolte = leggiTabella(SHEETS.RACCOLTE);
  const righeBy = {}; leggiTabella(SHEETS.RIGHE).forEach(r => { (righeBy[String(r.ordine_id)] = righeBy[String(r.ordine_id)] || []).push(r); });
  const mieiOrdini = leggiTabella(SHEETS.ORDINI).filter(o => tessKey_(o.numero_tessera) === so.tessera && String(o.stato) !== 'annullato');

  function dettOrdini(racId) {
    const lista = mieiOrdini.filter(o => String(o.raccolta_id) === String(racId));
    if (!lista.length) return null;
    const righe = []; let tot = 0, daConf = false, aPeso = false, stato = 'valido', note = [];
    lista.forEach(o => {
      if (String(o.stato) !== 'valido') stato = 'da_verificare';
      if (o.note) note.push(String(o.note));
      (righeBy[String(o.id)] || []).forEach(r => {
        const p = prodById[String(r.prodotto_id)]; if (!p) return;
        const op = r.opzione_id ? opz[String(r.opzione_id)] : null;
        const q = num(r.quantita), pc = num(r.peso_confermato);
        const imp = prezzoRiga_(p, op, q, pc); tot += imp;
        if (isSi(p.peso_variabile)) { aPeso = true; if (!pc) daConf = true; }
        const u = String(p.unita || ''); const um = u.indexOf('/') >= 0 ? (' ' + u.split('/').pop()) : '';
        righe.push({ nome: p.nome + (op ? (' – ' + op.nome) : ''), quantita: (Math.round(q * 100) / 100).toString().replace('.', ',') + um, importo: imp });
      });
    });
    return { stato: stato, righe: righe, totale: tot, definitivo: !daConf, aPeso: aPeso, note: note.join(' · '), nOrdini: lista.length };
  }
  function infoConsegna(r) {
    const cid = String(r.consegna_id || '');
    if (cid && consegne[cid]) { const c = consegne[cid], lu = luoghi[String(c.luogo_id || '')] || {};
      return { chiave: 'C:' + cid, data: testoData_(c.data), dt: parseChiusura_(c.data), fascia: c.fascia_oraria || '', luogo: lu.nome || '', indirizzo: lu.indirizzo || '' }; }
    const lu = luoghi[String(r.luogo_id || '')] || {};
    const d = String(r.data_consegna || '').trim();
    return { chiave: d ? ('D:' + testoData_(r.data_consegna) + '|' + (r.luogo_id || '')) : ('R:' + r.id),
      data: d ? testoData_(r.data_consegna) : '', dt: d ? parseChiusura_(r.data_consegna) : null, fascia: r.fascia_oraria || '', luogo: lu.nome || '', indirizzo: lu.indirizzo || '' };
  }
  // una raccolta è "passata" per il socio quando è conclusa o il giorno della consegna è finito
  function passata(r, ic) { return raccoltaConclusa_(r) || consegnaPassata_(ic.dt); }
  return {
    raccolte: raccolte, dettOrdini: dettOrdini, infoConsegna: infoConsegna, passata: passata,
    nomeF: r => (fornitori[String(r.fornitore_id)] || {}).nome || String(r.fornitore_id),
    emojiF: r => (fornitori[String(r.fornitore_id)] || {}).emoji || ''
  };
}

function socioDati(token) {
  const so = socioDaToken_(token);
  try { chiusuraAutomatica('pagina socio'); } catch (e) {}
  const base = urlApp();
  const cx = contestoOrdiniSocio_(so);
  const raccolte = cx.raccolte, dettOrdini = cx.dettOrdini, infoConsegna = cx.infoConsegna, nomeF = cx.nomeF, emojiF = cx.emojiF;

  // raccolte aperte
  const aperte = raccolte.filter(r => raccoltaAperta_(r)).map(r => {
    const ic = infoConsegna(r);
    return { id: String(r.id), fornitore: nomeF(r), emoji: emojiF(r), chiusura: testoData_(r.chiusura),
      consegna: ic.data ? (ic.data + (ic.fascia ? (' · ' + ic.fascia) : '') + (ic.luogo ? (' · ' + ic.luogo) : '')) : '',
      ordine: dettOrdini(r.id), formUrl: base + '?form=' + encodeURIComponent(r.id) + '&socio=' + encodeURIComponent(so.token) };
  });

  // consegne future (e ritiri senza data); quelle concluse sono nello Storico (socioStorico)
  const gruppi = {};
  raccolte.forEach(r => {
    const st = String(r.stato).trim().toLowerCase();
    const ic = infoConsegna(r);
    if (cx.passata(r, ic)) return;
    if (st === 'bozza') return;
    const ord = dettOrdini(r.id);
    if (!ic.dt && !ord) return; // raccolta senza data e senza miei ordini: non interessa
    if (!ic.dt && raccoltaAperta_(r)) return; // aperta senza data: già mostrata tra le aperte
    const g = gruppi[ic.chiave] = gruppi[ic.chiave] || { data: ic.data || 'data da definire', dt: ic.dt, fascia: ic.fascia, luogo: ic.luogo, indirizzo: ic.indirizzo, fornitori: [], ritiri: [] };
    g.fornitori.push(nomeF(r));
    if (ord) g.ritiri.push({ fornitore: nomeF(r), aperta: raccoltaAperta_(r), ordine: ord });
  });
  const lontano = new Date(2999, 0, 1);
  const consegneOut = Object.keys(gruppi).map(k => gruppi[k]).sort((a, b) => (a.dt || lontano) - (b.dt || lontano))
    .map(g => ({ data: g.data, fascia: g.fascia, luogo: g.luogo, indirizzo: g.indirizzo, fornitori: g.fornitori, ritiri: g.ritiri }));

  return {
    socio: { tessera: so.tessera, nominativo: so.nominativo, attiva: so.attiva, isAdmin: so.isAdmin },
    adminUrl: so.isAdmin ? (base + '?admin=' + encodeURIComponent(so.token)) : '',
    fornitoreUrl: so.isFornitore ? (base + '?fornitore=' + encodeURIComponent(so.token)) : '',
    aperte: aperte, consegne: consegneOut
  };
}

/**
 * Storico del socio: i suoi ordini delle consegne concluse, dal più recente.
 * Si carica a pagine: da = quanti ne sono già stati mostrati. Ritorna { voci, altri }.
 */
function socioStorico(token, da) {
  const so = socioDaToken_(token);
  const cx = contestoOrdiniSocio_(so);
  const PAGINA = 20;
  const tutte = [];
  cx.raccolte.forEach(r => {
    if (String(r.stato).trim().toLowerCase() === 'bozza') return;
    const ic = cx.infoConsegna(r);
    if (!cx.passata(r, ic)) return;
    const ord = cx.dettOrdini(r.id);
    if (!ord) return;
    const dt = ic.dt || parseChiusura_(r.chiusura);
    tutte.push({ fornitore: cx.nomeF(r), emoji: cx.emojiF(r), data: ic.data || testoData_(r.chiusura).substring(0, 10),
      anno: dt ? dt.getFullYear() : '', dt: dt ? dt.getTime() : 0, ordine: ord });
  });
  tutte.sort((a, b) => b.dt - a.dt);
  const inizio = Math.max(0, Math.floor(num(da)));
  return { voci: tutte.slice(inizio, inizio + PAGINA).map(x => ({ fornitore: x.fornitore, emoji: x.emoji, data: x.data, anno: x.anno, ordine: x.ordine })),
    altri: tutte.length > inizio + PAGINA, totale: tutte.length };
}

/** Dati del form in modalità socio: form normale + identità + ordine esistente da precompilare. */
function getFormDataSocio(token, cicloId) {
  const so = socioDaToken_(token);
  const d = getFormData(cicloId);
  if (d.errore) return d;
  const ordini = leggiTabella(SHEETS.ORDINI).filter(o => String(o.raccolta_id) === String(cicloId)
    && tessKey_(o.numero_tessera) === so.tessera && String(o.stato) !== 'annullato');
  const ids = {}; ordini.forEach(o => ids[String(o.id)] = true);
  const righe = leggiTabella(SHEETS.RIGHE).filter(r => ids[String(r.ordine_id)]).map(r => ({
    prodottoId: String(r.prodotto_id), opzioneId: String(r.opzione_id || ''), quantita: num(r.quantita), notaSocio: String(r.nota_socio || '') }));
  d.socio = { tessera: so.tessera, nominativo: so.nominativo, portaleUrl: urlApp() + '?socio=' + encodeURIComponent(so.token) };
  d.esistente = ordini.length ? { righe: righe, note: ordini.map(o => String(o.note || '')).filter(Boolean).join(' · ') } : null;
  return d;
}

/* ===================== Link personali (uno per persona) ===================== */
/*
 * Ogni socio ha un solo token (colonna "token" di Soci). Lo stesso link apre:
 *   - il pannello, se il socio è amministratore;
 *   - il portale, se è fornitore;
 *   - altrimenti la sua pagina personale.
 * Da ogni pagina si passa agli altri profili della stessa persona.
 * Il link breve è salvato nella colonna "link_breve" di Soci (non nelle proprietà del progetto).
 */

/** Accorcia un URL senza usare la cache nelle proprietà. Ritorna l'URL lungo se il servizio non risponde. */
function accorciaSenzaCache_(urlLungo) {
  const servizi = serviziShort_();
  for (let i = 0; i < servizi.length; i++) {
    const r = chiamaProvider_(servizi[i], urlLungo);
    if (r.url) return r.url;
  }
  return urlLungo;
}
function accorciaPersonali_() {
  const v = PropertiesService.getScriptProperties().getProperty('ACCORCIA_LINK_PERSONALI');
  return !v || String(v).trim().toUpperCase() !== 'NO';
}

/** Token del socio (lo crea se manca). */
function assicuraTokenSocio_(s) {
  let tok = String(s.token || '').trim();
  if (tok) return tok;
  assicuraColonna_(SHEETS.SOCI, 'token');
  tok = generaTokenSocio_();
  aggiornaCella(SHEETS.SOCI, s._riga, 'token', tok);
  return tok;
}

/** Link personale del socio: { lungo, breve }. Il breve viene creato una volta e salvato nel foglio. */
function linkPersonale_(s) {
  const tok = assicuraTokenSocio_(s);
  const lungo = urlLink_() + '?u=' + encodeURIComponent(tok);
  let breve = String(s.link_breve || '').trim();
  if (!breve && accorciaPersonali_()) {
    const b = accorciaSenzaCache_(lungo);
    if (b && b !== lungo) { assicuraColonna_(SHEETS.SOCI, 'link_breve'); aggiornaCella(SHEETS.SOCI, s._riga, 'link_breve', b); breve = b; }
  }
  return { lungo: lungo, breve: breve || lungo, token: tok };
}

function messaggioLink_(s, link) {
  const nome = String(s.nominativo || '').split(' ')[0] || '';
  const r = ruoliTessera_(s.numero_tessera);
  let extra = '';
  if (r.admin && r.fornitore) extra = ' Con lo stesso link entri anche nel pannello degli amministratori e nel portale fornitore.';
  else if (r.admin) extra = ' Con lo stesso link entri anche nel pannello degli amministratori.';
  else if (r.fornitore) extra = ' Con lo stesso link entri anche nel portale fornitore.';
  return 'Ciao ' + nome + ', questo è il tuo link personale per il GAS Isticcadeddu:\n' + link +
    '\n\nDa qui vedi e modifichi i tuoi ordini fino alla chiusura e trovi le prossime consegne.' + extra +
    '\nConservalo (puoi fissare questo messaggio) e non inoltrarlo ad altri.';
}
function risultatoLinkSocio_(s) {
  const l = linkPersonale_(s);
  const msg = messaggioLink_(s, l.breve);
  const wa = numeroWa_(s.telefono);
  return { ok: true, link: l.breve, linkLungo: l.lungo, messaggio: msg, waUrl: wa ? ('https://wa.me/' + wa + '?text=' + encodeURIComponent(msg)) : '' };
}
function numeroWa_(tel) {
  let n = String(tel || '').replace(/[^\d+]/g, '');
  if (n.indexOf('+') === 0) n = n.substring(1);
  if (n.indexOf('00') === 0) n = n.substring(2);
  if (/^3\d{8,9}$/.test(n)) n = '39' + n; // cellulare italiano senza prefisso
  return /^\d{10,15}$/.test(n) ? n : '';
}
function trovaSocio_(tessera) {
  const s = leggiTabella(SHEETS.SOCI).find(x => tessKey_(x.numero_tessera) === tessKey_(tessera));
  if (!s) throw new Error('Socio non trovato: tessera ' + tessKey_(tessera));
  return s;
}

/** (Admin) Link personale del socio (lo crea se manca, accorciato e salvato nel foglio). Vale per tutti i ruoli. */
function adminLinkSocio(token, tessera) {
  checkToken_(token);
  const s = trovaSocio_(tessera);
  const nuovo = !String(s.token || '').trim();
  const r = risultatoLinkSocio_(s);
  if (nuovo) logAdmin_('link_socio_creato', tessKey_(tessera));
  return r;
}
/** (Admin) Rigenera il link personale: il vecchio smette di funzionare per tutti i profili della persona. */
function adminRigeneraLinkSocio(token, tessera) {
  checkToken_(token);
  const s = trovaSocio_(tessera);
  assicuraColonna_(SHEETS.SOCI, 'token');
  s.token = generaTokenSocio_();
  aggiornaCella(SHEETS.SOCI, s._riga, 'token', s.token);
  if ('link_breve' in s) { aggiornaCella(SHEETS.SOCI, s._riga, 'link_breve', ''); }
  s.link_breve = '';
  logAdmin_('link_socio_rigenerato', tessKey_(tessera));
  return risultatoLinkSocio_(s);
}

/**
 * Crea il token per tutti i soci che non lo hanno (eseguibile dall'editor o dal pannello).
 * Migrazione: se il socio era amministratore o fornitore con un vecchio token personale,
 * quel token diventa il suo token unico, così i link già consegnati continuano a funzionare.
 */
function generaTokenSoci() {
  assicuraColonna_(SHEETS.SOCI, 'token');
  const sh = trovaScheda_(SHEETS.SOCI);
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim());
  const iT = headers.indexOf('token'), iTess = headers.indexOf('numero_tessera');
  const vecchi = {};
  leggiTabellaSafe_(SHEETS.ADMIN).forEach(a => { const t = String(a.token || '').trim(); if (t && tessKey_(a.numero_tessera)) vecchi[tessKey_(a.numero_tessera)] = t; });
  leggiTabella(SHEETS.FORNITORI).forEach(f => { const t = String(f.token_accesso || '').trim(); const k = tessKey_(f.numero_tessera); if (t && k && !vecchi[k]) vecchi[k] = t; });
  const usati = {}; values.slice(1).forEach(r => { const t = String(r[iT] || '').trim(); if (t) usati[t] = true; });
  let creati = 0, migrati = 0;
  const col = values.slice(1).map(r => {
    const esist = String(r[iT] || '').trim();
    if (esist || String(r[iTess]).trim() === '') return [esist];
    const k = tessKey_(r[iTess]);
    if (vecchi[k] && !usati[vecchi[k]]) { usati[vecchi[k]] = true; migrati++; return [vecchi[k]]; }
    creati++; return [generaTokenSocio_()];
  });
  if (col.length) sh.getRange(2, iT + 1, col.length, 1).setValues(col);
  // i vecchi token di amministratori e fornitori-soci non servono più
  leggiTabellaSafe_(SHEETS.ADMIN).forEach(a => { if (String(a.token || '').trim()) aggiornaCella(SHEETS.ADMIN, a._riga, 'token', ''); });
  const soci = {}; leggiTabella(SHEETS.SOCI).forEach(x => soci[tessKey_(x.numero_tessera)] = true);
  leggiTabella(SHEETS.FORNITORI).forEach(f => { const k = tessKey_(f.numero_tessera); if (k && soci[k] && String(f.token_accesso || '').trim()) aggiornaCella(SHEETS.FORNITORI, f._riga, 'token_accesso', ''); });
  log_('sistema', 'token_soci_generati', creati + ' nuovi, ' + migrati + ' da vecchi link');
  return 'Token creati: ' + creati + ' · recuperati da vecchi link: ' + migrati;
}
/** (Admin) Stessa cosa, dal pannello. */
function adminGeneraTokenSoci(token) { checkToken_(token); const r = generaTokenSoci(); logAdmin_('token_soci_generati', r); return r; }

/* ===================== PROFILO (tutte le pagine) ===================== */
/*
 * Il profilo si apre dalla voce "Profilo" del menu, nella pagina del socio, nel portale fornitore
 * e nel pannello. Mostra i dati della tessera, permette di cambiare telefono ed email e di passare
 * agli altri profili della stessa persona (socio, fornitore, amministratore).
 */
function profiloDati(token) {
  let so;
  try { so = socioDaToken_(token); }
  catch (e) { return { ok: false, messaggio: 'Stai usando l\'accesso di emergenza: non c\'è un profilo socio collegato.' }; }
  const s = leggiTabella(SHEETS.SOCI).find(x => String(x.token || '').trim() === String(token).trim());
  const base = urlApp(), t = encodeURIComponent(String(token).trim());
  const scad = String(s.scadenza_tessera || '').trim();
  const dtScad = scad ? parseChiusura_(s.scadenza_tessera) : null;
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  return {
    ok: true,
    nominativo: String(s.nominativo || ''), tessera: so.tessera, attiva: so.attiva,
    scadenza: scad ? testoData_(s.scadenza_tessera) : '', scaduta: !!(dtScad && dtScad < oggi),
    telefono: String(s.telefono || ''), email: String(s.email || ''),
    isAdmin: so.isAdmin, isFornitore: so.isFornitore, fornitoreNome: so.fornitoreNome,
    url: { socio: base + '?socio=' + t, fornitore: so.isFornitore ? (base + '?fornitore=' + t) : '', admin: so.isAdmin ? (base + '?admin=' + t) : '' }
  };
}

/** Salva telefono ed email del socio (li modifica il socio stesso dal suo profilo). */
function profiloSalva(token, d) {
  const so = socioDaToken_(token);
  const s = leggiTabella(SHEETS.SOCI).find(x => String(x.token || '').trim() === String(token).trim());
  const tel = String(d.telefono || '').trim();
  const email = String(d.email || '').trim();
  if (tel && (tel.replace(/\D/g, '').length < 6 || /[^\d\s+().\/-]/.test(tel))) throw new Error('Il numero di telefono non sembra valido.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('L\'indirizzo email non sembra valido.');
  const cambi = [];
  if (tel !== String(s.telefono || '').trim()) { aggiornaCella(SHEETS.SOCI, s._riga, 'telefono', tel); cambi.push('telefono'); }
  if (email !== String(s.email || '').trim()) { assicuraColonna_(SHEETS.SOCI, 'email'); aggiornaCella(SHEETS.SOCI, s._riga, 'email', email); cambi.push('email'); }
  if (cambi.length) log_('socio:' + so.tessera, 'profilo_modificato', cambi.join(', '));
  return profiloDati(token);
}
