/**
 * FornitoreServer.gs — portale fornitori (accesso con link personale ?fornitore=TOKEN).
 * Il fornitore gestisce il proprio listino, vede i soci ordinanti, chiude i propri
 * ordini e conferma i pesi dei prodotti a peso variabile.
 * Ogni funzione verifica che la risorsa appartenga al fornitore del token.
 */

/** Trova il fornitore dal token, o lancia errore. */
function fornitoreDaToken_(token) {
  token = String(token || '').trim();
  if (!token) throw new Error('Link non valido.');
  // ogni fornitore è un socio: si entra con il link personale del socio
  const s = leggiTabella(SHEETS.SOCI).find(x => String(x.token || '').trim() === token);
  if (!s) throw new Error('Link non valido o non più attivo.');
  const f = ruoliTessera_(s.numero_tessera).fornitore;
  if (!f) throw new Error('Questo profilo non è collegato a un fornitore attivo.');
  f._viaSocio = true;
  return f;
}

/** Link del portale di un fornitore: link personale del socio collegato, oppure (fornitore non socio) il vecchio link. */
function linkFornitore_(f, breve) {
  const tess = tessKey_(f.numero_tessera);
  const s = tess ? leggiTabella(SHEETS.SOCI).find(x => tessKey_(x.numero_tessera) === tess) : null;
  if (!s) return '';
  return breve ? linkPersonale_(s).breve : (urlLink_() + '?u=' + encodeURIComponent(assicuraTokenSocio_(s)));
}

/** Dati iniziali del portale: fornitore, cicli, categorie, listino. */
function fornitoreDati(token) {
  const f = fornitoreDaToken_(token);
  const ordini = leggiTabella(SHEETS.ORDINI);
  const cicli = leggiTabella(SHEETS.RACCOLTE)
    .filter(c => String(c.fornitore_id) === String(f.id))
    .map(c => {
      const suoi = ordini.filter(o => String(o.raccolta_id) === String(c.id));
      return {
        id: String(c.id), stato: c.stato,
        chiusura: testoData_(c.chiusura),
        dataConsegna: consegnaDiRaccolta_(c).data,
        nValidi: suoi.filter(o => String(o.stato) === 'valido').length,
        nDaVerificare: suoi.filter(o => String(o.stato) === 'da_verificare').length
      };
    });

  const categorie = leggiTabella(SHEETS.CATEGORIE)
    .sort((a, b) => num(a.ordine) - num(b.ordine))
    .map(c => ({ id: String(c.id), nome: c.nome, emoji: c.emoji || '' }));  // categorie globali

  const opzioni = leggiTabella(SHEETS.OPZIONI);
  const prodotti = leggiTabella(SHEETS.PRODOTTI)
    .filter(p => String(p.fornitore_id) === String(f.id))
    .map(p => ({
      id: String(p.id), categoria_id: String(p.categoria_id || ''),
      nome: p.nome, emoji: p.emoji || '', note: p.note || '',
      prezzo: num(p.prezzo), unita: p.unita || '',
      modalita: p.modalita_vendita || 'a_unita',
      peso_variabile: isSi(p.peso_variabile),
      passo: num(p.passo_minimo) || 1,
      attivo: isSi(p.attivo),
      nOpzioni: opzioni.filter(o => String(o.prodotto_id) === String(p.id)).length
    }));

  return {
    fornitore: {
      id: String(f.id), nome: f.nome || '', referente: f.referente || '',
      telefono: f.telefono || '', email: f.email || '', zona: f.zona || '',
      descrizione: f.descrizione || '', emoji: f.emoji || ''
    },
    cicli: cicli, categorie: categorie, prodotti: prodotti,
    socioUrl: f._viaSocio ? (urlApp() + '?socio=' + encodeURIComponent(String(token).trim())) : '',
    adminUrl: (f._viaSocio && ruoliTessera_(f.numero_tessera).admin) ? (urlApp() + '?admin=' + encodeURIComponent(String(token).trim())) : ''
  };
}

/** Il fornitore aggiorna i propri dati anagrafici. */
function fornitoreSalvaDati(token, d) {
  const f = fornitoreDaToken_(token);
  const nome = String(d.nome || '').trim();
  if (!nome) throw new Error('Il nome è obbligatorio.');
  const campi = {
    nome: nome,
    referente: String(d.referente || '').trim(),
    telefono: String(d.telefono || '').trim(),
    email: String(d.email || '').trim(),
    zona: String(d.zona || '').trim(),
    descrizione: String(d.descrizione || '').trim(),
    emoji: String(d.emoji || '').trim()
  };
  Object.keys(campi).forEach(k => aggiornaCella(SHEETS.FORNITORI, f._riga, k, campi[k]));
  log_('fornitore:' + f.id, 'dati_aggiornati', '');
  return { ok: true };
}

/** Verifica che un ciclo appartenga al fornitore. */
function cicloDelFornitore_(f, cicloId) {
  const c = leggiTabella(SHEETS.RACCOLTE).find(x => String(x.id) === String(cicloId));
  if (!c || String(c.fornitore_id) !== String(f.id)) throw new Error('Ciclo non valido.');
  return c;
}

/** Il fornitore chiude i propri ordini. */
function fornitoreChiudiCiclo(token, cicloId) {
  const f = fornitoreDaToken_(token);
  const c = cicloDelFornitore_(f, cicloId);
  aggiornaCella(SHEETS.RACCOLTE, c._riga, 'stato', 'chiuso');
  log_('fornitore:' + f.id, 'ciclo_chiuso', String(cicloId));
  return true;
}

/** Righe a peso variabile del ciclo, da confermare (con peso attuale se già inserito). */
function fornitoreRigheDaConfermare(token, cicloId) {
  const f = fornitoreDaToken_(token);
  cicloDelFornitore_(f, cicloId);
  const prodotti = {}; leggiTabella(SHEETS.PRODOTTI).forEach(p => prodotti[String(p.id)] = p);
  const ordini = {}; leggiTabella(SHEETS.ORDINI)
    .filter(o => String(o.raccolta_id) === String(cicloId) && String(o.stato) === 'valido')
    .forEach(o => ordini[String(o.id)] = o);
  const out = [];
  leggiTabella(SHEETS.RIGHE).forEach(r => {
    const o = ordini[String(r.ordine_id)];
    if (!o) return;
    const p = prodotti[String(r.prodotto_id)];
    if (!p || !isSi(p.peso_variabile)) return;
    out.push({
      rigaId: String(r.id),
      nominativo: o.nominativo_inserito || '',
      tessera: tessKey_(o.numero_tessera),
      prodotto: p.nome,
      quantita: num(r.quantita), unita: p.unita || '',
      pesoConfermato: num(r.peso_confermato)
    });
  });
  return out.sort((a, b) => a.tessera.localeCompare(b.tessera, undefined, { numeric: true }));
}

/** Il fornitore conferma il peso (kg) di una riga. */
function fornitoreConfermaPeso(token, rigaId, peso) {
  const f = fornitoreDaToken_(token);
  const riga = leggiTabella(SHEETS.RIGHE).find(r => String(r.id) === String(rigaId));
  if (!riga) throw new Error('Riga non trovata.');
  const ordine = leggiTabella(SHEETS.ORDINI).find(o => String(o.id) === String(riga.ordine_id));
  if (!ordine) throw new Error('Ordine non trovato.');
  cicloDelFornitore_(f, ordine.raccolta_id); // verifica appartenenza
  aggiornaCella(SHEETS.RIGHE, riga._riga, 'peso_confermato', num(peso) > 0 ? num(peso) : '');
  log_('fornitore:' + f.id, 'peso_confermato', rigaId + ' = ' + peso);
  return true;
}

/** Crea o aggiorna un prodotto del fornitore. */
function fornitoreSalvaProdotto(token, p) {
  const f = fornitoreDaToken_(token);
  const campi = {
    fornitore_id: f.id,
    categoria_id: String(p.categoria_id || ''),
    nome: String(p.nome || '').trim(),
    emoji: String(p.emoji || '').trim(),
    note: String(p.note || '').trim(),
    prezzo: num(p.prezzo),
    unita: String(p.unita || '').trim(),
    modalita_vendita: String(p.modalita || 'a_unita'),
    peso_variabile: p.peso_variabile ? 'SI' : 'NO',
    passo_minimo: num(p.passo) || 1,
    attivo: (p.attivo === false) ? 'NO' : 'SI'
  };
  if (!campi.nome) throw new Error('Il nome del prodotto è obbligatorio.');

  if (p.id) {
    const es = leggiTabella(SHEETS.PRODOTTI).find(x => String(x.id) === String(p.id));
    if (!es || String(es.fornitore_id) !== String(f.id)) throw new Error('Prodotto non valido.');
    Object.keys(campi).forEach(k => aggiornaCella(SHEETS.PRODOTTI, es._riga, k, campi[k]));
    log_('fornitore:' + f.id, 'prodotto_modificato', String(p.id));
    return { ok: true, id: String(p.id) };
  } else {
    const id = nuovoId(SHEETS.PRODOTTI, 'P');
    aggiungiRiga(SHEETS.PRODOTTI, Object.assign({ id: id }, campi));
    log_('fornitore:' + f.id, 'prodotto_creato', id);
    return { ok: true, id: id };
  }
}

/** Attiva/disattiva un prodotto. */
function fornitoreToggleProdotto(token, prodottoId, attivo) {
  const f = fornitoreDaToken_(token);
  const es = leggiTabella(SHEETS.PRODOTTI).find(x => String(x.id) === String(prodottoId));
  if (!es || String(es.fornitore_id) !== String(f.id)) throw new Error('Prodotto non valido.');
  aggiornaCella(SHEETS.PRODOTTI, es._riga, 'attivo', attivo ? 'SI' : 'NO');
  return true;
}

/** (Admin) Link personale del fornitore, per consegnarlo. */
function adminLinkFornitore(token, fornitoreId) {
  checkToken_(token);
  const f = leggiTabella(SHEETS.FORNITORI).find(x => String(x.id) === String(fornitoreId));
  if (!f) throw new Error('Fornitore non trovato.');
  return linkFornitore_(f, true);
}

/** (Admin) Elenco fornitori con il link al loro portale (non accorciato, è un link privato). */
function adminListaFornitori(token) {
  checkToken_(token);
  const base = urlApp();
  return leggiTabella(SHEETS.FORNITORI).map(f => ({
    id: String(f.id), nome: f.nome, attivo: isSi(f.attivo), tessera: tessKey_(f.numero_tessera),
    link: linkFornitore_(f, false)
  }));
}

/** Genera un token casuale per il link di un fornitore. */
function generaToken_() {
  return 'f-' + Utilities.getUuid().replace(/-/g, '').substring(0, 20);
}

/** (Admin) Crea un nuovo fornitore con token generato. */
function adminAggiungiFornitore(token, d) {
  checkToken_(token);
  const nome = String(d.nome || '').trim();
  if (!nome) throw new Error('Il nome del fornitore è obbligatorio.');
  const id = nuovoId(SHEETS.FORNITORI, 'F');
  const tessera = tessKey_(d.tessera);
  if (!tessera) throw new Error('Indica la tessera del socio: ogni fornitore è un socio.');
  const socio = trovaSocio_(tessera);
  if (!isSi(socio.tessera_attiva)) throw new Error('La tessera ' + tessera + ' non è attiva.');
  const tok = ''; // il fornitore usa il link personale del socio
  aggiungiRiga(SHEETS.FORNITORI, {
    id: id,
    numero_tessera: String(d.tessera || '').trim(),
    nome: nome,
    referente: String(d.referente || '').trim(),
    telefono: String(d.telefono || '').trim(),
    email: String(d.email || '').trim(),
    zona: String(d.zona || '').trim(),
    descrizione: String(d.descrizione || '').trim(),
    emoji: String(d.emoji || '').trim(),
    token_accesso: tok,
    attivo: 'SI'
  });
  logAdmin_('fornitore_creato', id + ' ' + nome);
  const nf = leggiTabella(SHEETS.FORNITORI).find(x => String(x.id) === id);
  return { ok: true, id: id, link: nf ? linkFornitore_(nf, true) : '' };
}

/** (Admin) Rigenera il token (link) di un fornitore: quello vecchio smette di funzionare. */
function adminRigeneraTokenFornitore(token, fornitoreId) {
  checkToken_(token);
  const f = leggiTabella(SHEETS.FORNITORI).find(x => String(x.id) === String(fornitoreId));
  if (!f) throw new Error('Fornitore non trovato.');
  if (!tessKey_(f.numero_tessera)) throw new Error('Il fornitore non è collegato a una tessera.');
  const r = adminRigeneraLinkSocio(token, f.numero_tessera); // un solo link per persona
  return { ok: true, link: r.link };
}

/** (Admin) Dati completi di un fornitore, per il form di modifica. */
function adminFornitore(token, id) {
  checkToken_(token);
  const f = leggiTabella(SHEETS.FORNITORI).find(x => String(x.id) === String(id));
  if (!f) throw new Error('Fornitore non trovato.');
  return {
    id: String(f.id), nome: f.nome || '', referente: f.referente || '', telefono: f.telefono || '',
    email: f.email || '', zona: f.zona || '', descrizione: f.descrizione || '', emoji: f.emoji || '',
    attivo: isSi(f.attivo), tessera: tessKey_(f.numero_tessera),
    link: linkFornitore_(f, false)
  };
}

/** (Admin) Modifica l'anagrafica di un fornitore. */
function adminModificaFornitore(token, id, d) {
  checkToken_(token);
  const f = leggiTabella(SHEETS.FORNITORI).find(x => String(x.id) === String(id));
  if (!f) throw new Error('Fornitore non trovato.');
  const campi = ['nome', 'referente', 'telefono', 'email', 'zona', 'descrizione', 'emoji'];
  campi.forEach(k => { if (d[k] !== undefined) aggiornaCella(SHEETS.FORNITORI, f._riga, k, String(d[k]).trim()); });
  if (d.tessera !== undefined) {
    const nt = tessKey_(d.tessera);
    if (!nt) throw new Error('La tessera è obbligatoria: ogni fornitore è un socio.');
    trovaSocio_(nt); // deve esistere tra i soci
    aggiornaCella(SHEETS.FORNITORI, f._riga, 'numero_tessera', nt);
  }
  if (d.attivo !== undefined) {
    if (d.attivo) { const so = trovaSocio_(d.tessera !== undefined ? d.tessera : f.numero_tessera); if (!isSi(so.tessera_attiva)) throw new Error('Il socio collegato non è attivo: riattiva prima la tessera.'); }
    aggiornaCella(SHEETS.FORNITORI, f._riga, 'attivo', d.attivo ? 'SI' : 'NO');
  }
  if (String(d.nome || '').trim() === '' && d.nome !== undefined) throw new Error('Il nome è obbligatorio.');
  logAdmin_('fornitore_modificato', String(id));
  return { ok: true };
}

/** (Fornitore) Riepilogo aggregato di una raccolta: quantità per prodotto e totale, senza dettaglio per socio. */
function fornitoreRiepilogoRaccolta(token, cicloId) {
  const f = fornitoreDaToken_(token);
  cicloDelFornitore_(f, cicloId);
  const prodById = {}; leggiTabella(SHEETS.PRODOTTI).forEach(p => prodById[String(p.id)] = p);
  const opz = {}; leggiTabella(SHEETS.OPZIONI).forEach(o => opz[String(o.id)] = o);
  const ordini = leggiTabella(SHEETS.ORDINI).filter(o => String(o.raccolta_id) === String(cicloId) && String(o.stato) === 'valido');
  const idOrd = {}; ordini.forEach(o => idOrd[String(o.id)] = true);

  const agg = {}; let totale = 0;
  leggiTabella(SHEETS.RIGHE).forEach(r => {
    if (!idOrd[String(r.ordine_id)]) return;
    const qta = num(r.quantita); if (qta <= 0) return;
    const prod = prodById[String(r.prodotto_id)]; if (!prod) return;
    if (String(prod.fornitore_id) !== String(f.id)) return; // ignora righe di altri fornitori (dati incoerenti)
    const op = r.opzione_id ? opz[String(r.opzione_id)] : null;
    const imp = prezzoRiga_(prod, op, qta, num(r.peso_confermato));
    const key = String(r.prodotto_id);
    if (!agg[key]) agg[key] = { nome: prod.nome, unita: prod.unita || '', qta: 0, importo: 0 };
    agg[key].qta += qta; agg[key].importo += imp; totale += imp;
  });
  return {
    nOrdini: ordini.length,
    totale: totale,
    prodotti: Object.keys(agg).map(k => agg[k]).sort((a, b) => a.nome.localeCompare(b.nome))
  };
}

/* ===================== GESTIONE ORDINI (fornitore) ===================== */
/** Verifica che un ordine appartenga a una raccolta del fornitore; ritorna l'ordine. */
function ordineDelFornitore_(f, ordineId) {
  const o = leggiTabella(SHEETS.ORDINI).find(x => String(x.id) === String(ordineId));
  if (!o) throw new Error('Ordine non trovato.');
  cicloDelFornitore_(f, o.raccolta_id); // lancia se non è del fornitore
  return o;
}
/** (Fornitore) Tutti gli ordini di una sua raccolta, con le righe (per gestirli con il socio). */
function fornitoreOrdini(token, cicloId) {
  const f = fornitoreDaToken_(token);
  cicloDelFornitore_(f, cicloId);
  const soci = {}; leggiTabella(SHEETS.SOCI).forEach(s => soci[tessKey_(s.numero_tessera)] = s);
  return leggiTabella(SHEETS.ORDINI)
    .filter(o => String(o.raccolta_id) === String(cicloId) && String(o.stato) !== 'annullato')
    .map(o => ({ id: String(o.id), tessera: tessKey_(o.numero_tessera), nominativo: o.nominativo_inserito || '',
      stato: o.stato, motivo: o.motivo_annullamento || '',
      telefono: (soci[tessKey_(o.numero_tessera)] || {}).telefono || '', note: o.note || '', righe: righeOrdine_(o.id) }))
    .sort((a, b) => a.tessera.localeCompare(b.tessera, undefined, { numeric: true }));
}
/** (Fornitore) Annulla un ordine (su richiesta del socio). */
function fornitoreAnnullaOrdine(token, ordineId, motivo) {
  const f = fornitoreDaToken_(token);
  const o = ordineDelFornitore_(f, ordineId);
  aggiornaCella(SHEETS.ORDINI, o._riga, 'stato', 'annullato');
  aggiornaCella(SHEETS.ORDINI, o._riga, 'motivo_annullamento', String(motivo || 'Annullato dal fornitore'));
  log_('fornitore:' + f.id, 'ordine_annullato', ordineId + ' – ' + (motivo || ''));
  return true;
}
/** (Fornitore) Conferma un ordine in verifica (diventa valido). */
function fornitoreConfermaOrdine(token, ordineId) {
  const f = fornitoreDaToken_(token);
  const o = ordineDelFornitore_(f, ordineId);
  aggiornaCella(SHEETS.ORDINI, o._riga, 'stato', 'valido');
  aggiornaCella(SHEETS.ORDINI, o._riga, 'motivo_annullamento', '');
  log_('fornitore:' + f.id, 'ordine_confermato', ordineId);
  return true;
}
/** (Fornitore) Modifica la quantità di una riga di un suo ordine (0 = rimuove). */
function fornitoreModificaRiga(token, rigaId, quantita) {
  const f = fornitoreDaToken_(token);
  const r = leggiTabella(SHEETS.RIGHE).find(x => String(x.id) === String(rigaId));
  if (!r) throw new Error('Riga non trovata.');
  ordineDelFornitore_(f, r.ordine_id); // verifica appartenenza
  const q = num(quantita);
  if (q <= 0) { eliminaRiga_(SHEETS.RIGHE, r._riga); log_('fornitore:' + f.id, 'riga_rimossa', rigaId); }
  else { aggiornaCella(SHEETS.RIGHE, r._riga, 'quantita', q); log_('fornitore:' + f.id, 'riga_modificata', rigaId + ' = ' + q); }
  return { ok: true };
}

/* ===================== LISTINO: elimina prodotto e opzioni ===================== */
function prodottoDelFornitore_(f, prodottoId) {
  const p = leggiTabella(SHEETS.PRODOTTI).find(x => String(x.id) === String(prodottoId));
  if (!p || String(p.fornitore_id) !== String(f.id)) throw new Error('Prodotto non valido.');
  return p;
}
/** (Fornitore) Elimina un prodotto e le sue opzioni. */
function fornitoreEliminaProdotto(token, prodottoId) {
  const f = fornitoreDaToken_(token);
  prodottoDelFornitore_(f, prodottoId);
  leggiTabella(SHEETS.OPZIONI).filter(o => String(o.prodotto_id) === String(prodottoId))
    .sort((a, b) => b._riga - a._riga).forEach(o => eliminaRiga_(SHEETS.OPZIONI, o._riga));
  const p2 = leggiTabella(SHEETS.PRODOTTI).find(x => String(x.id) === String(prodottoId));
  if (p2) eliminaRiga_(SHEETS.PRODOTTI, p2._riga);
  log_('fornitore:' + f.id, 'prodotto_eliminato', String(prodottoId));
  return { ok: true };
}
/** (Fornitore) Opzioni di un prodotto. */
function fornitoreOpzioni(token, prodottoId) {
  const f = fornitoreDaToken_(token);
  prodottoDelFornitore_(f, prodottoId);
  return leggiTabella(SHEETS.OPZIONI).filter(o => String(o.prodotto_id) === String(prodottoId)).map(o => ({
    id: String(o.id), nome: o.nome || '', tipo: o.tipo || 'variante', prezzo: num(o.prezzo),
    unita: o.unita || '', note: o.note || '', richiede_nota: isSi(o.richiede_nota_socio)
  }));
}
/** (Fornitore) Crea o modifica un'opzione. */
function fornitoreSalvaOpzione(token, d) {
  const f = fornitoreDaToken_(token);
  prodottoDelFornitore_(f, d.prodottoId);
  const campi = {
    prodotto_id: String(d.prodottoId), nome: String(d.nome || '').trim(), tipo: String(d.tipo || 'variante'),
    prezzo: num(d.prezzo), unita: String(d.unita || '').trim(), note: String(d.note || '').trim(),
    richiede_nota_socio: d.richiede_nota ? 'SI' : 'NO'
  };
  if (!campi.nome) throw new Error('Il nome dell\'opzione è obbligatorio.');
  if (d.id) {
    const es = leggiTabella(SHEETS.OPZIONI).find(x => String(x.id) === String(d.id));
    if (!es) throw new Error('Opzione non trovata.');
    Object.keys(campi).forEach(k => aggiornaCella(SHEETS.OPZIONI, es._riga, k, campi[k]));
    log_('fornitore:' + f.id, 'opzione_modificata', String(d.id));
    return { ok: true, id: String(d.id) };
  }
  const id = nuovoId(SHEETS.OPZIONI, 'OP');
  aggiungiRiga(SHEETS.OPZIONI, Object.assign({ id: id }, campi));
  log_('fornitore:' + f.id, 'opzione_creata', id);
  return { ok: true, id: id };
}
/** (Fornitore) Elimina un'opzione. */
function fornitoreEliminaOpzione(token, opzioneId) {
  const f = fornitoreDaToken_(token);
  const o = leggiTabella(SHEETS.OPZIONI).find(x => String(x.id) === String(opzioneId));
  if (!o) throw new Error('Opzione non trovata.');
  prodottoDelFornitore_(f, o.prodotto_id);
  eliminaRiga_(SHEETS.OPZIONI, o._riga);
  log_('fornitore:' + f.id, 'opzione_eliminata', String(opzioneId));
  return { ok: true };
}
