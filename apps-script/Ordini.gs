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
 * Dati necessari a costruire il form d'ordine per un ciclo.
 * Chiamata dal client al caricamento della pagina.
 */
function getFormData(cicloId) {
  cicloId = String(cicloId);
  const cicli = leggiTabella(SHEETS.RACCOLTE);
  const ciclo = cicli.find(c => String(c.id) === cicloId);
  if (!ciclo) return { errore: 'Ciclo non trovato.' };

  try { chiudiSeScaduta_(ciclo, null, 'form'); } catch (e) {} // se è scaduta si chiude adesso
  const aperto = raccoltaAperta_(ciclo);
  const fornitore = leggiTabella(SHEETS.FORNITORI).find(f => String(f.id) === String(ciclo.fornitore_id)) || {};
  const luogo = leggiTabella(SHEETS.LUOGHI).find(l => String(l.id) === String(ciclo.luogo_id)) || {};

  const categorie = leggiTabella(SHEETS.CATEGORIE)
    .sort((a, b) => num(a.ordine) - num(b.ordine));  // categorie globali

  const prodotti = prodottiRaccolta_(ciclo);

  const opzioni = leggiTabella(SHEETS.OPZIONI);

  const prodOut = prodotti.map(p => ({
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
  }));

  return {
    aperto: aperto,
    ciclo: {
      id: String(ciclo.id),
      chiusura: testoData_(ciclo.chiusura),
      avvisi: ciclo.avvisi || '',
      data_consegna: testoData_(ciclo.data_consegna),
      fascia_oraria: ciclo.fascia_oraria || '',
      referente: ciclo.referente_consegna || fornitore.referente || ''
    },
    fornitore: { nome: fornitore.nome || '', zona: fornitore.zona || '', descrizione: fornitore.descrizione || '', emoji: fornitore.emoji || '' },
    luogo: { nome: luogo.nome || '', indirizzo: luogo.indirizzo || '' },
    consegna: (function(){ try { const c = consegnaDiRaccolta_(ciclo); return { data: c.data || '', fascia: c.fascia || '', luogo: c.luogoNome || '' }; } catch (e) { return { data: '', fascia: '', luogo: '' }; } })(),
    categorie: categorie.map(c => ({ id: String(c.id), nome: c.nome, emoji: c.emoji || '' })),
    prodotti: prodOut
  };
}

/**
 * Salva un ordine. items = [{prodottoId, opzioneId, quantita, notaSocio}]
 * Restituisce {ok, stato, messaggio}.
 */
function submitOrder(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // serializza gli invii concorrenti
  try {
    const cicloId = String(payload.cicloId);
    // modalità socio (link personale): identità dal token, l'ordine sostituisce il precedente
    let viaSocio = null;
    if (payload.socioToken) {
      try { viaSocio = socioDaToken_(payload.socioToken); }
      catch (e) { return { ok: false, messaggio: e.message }; }
      payload.tessera = viaSocio.tessera; payload.nominativo = viaSocio.nominativo;
    }
    const tessera = tessKey_(payload.tessera);
    const nominativo = String(payload.nominativo || '').trim();
    const items = (payload.items || []).filter(it => num(it.quantita) > 0);

    if (!tessera) return { ok: false, messaggio: 'Inserisci il numero di tessera.' };
    if (!nominativo) return { ok: false, messaggio: 'Inserisci il nominativo.' };
    if (items.length === 0) return { ok: false, messaggio: 'Nessun prodotto selezionato.' };

    const ciclo = leggiTabella(SHEETS.RACCOLTE).find(c => String(c.id) === cicloId);
    if (!ciclo) return { ok: false, messaggio: 'Ciclo non trovato.' };
    chiudiSeScaduta_(ciclo, null, 'form');
    if (!raccoltaAperta_(ciclo)) {
      return { ok: false, messaggio: 'Gli ordini per questo fornitore sono chiusi.' };
    }

    // massimo ordini della raccolta (non blocca chi modifica il proprio ordine)
    const maxO = num(ciclo.max_ordini);
    if (maxO > 0) {
      const validi = leggiTabella(SHEETS.ORDINI)
        .filter(o => String(o.raccolta_id) === cicloId && String(o.stato) === 'valido');
      const giaSuo = validi.some(o => tessKey_(o.numero_tessera) === tessera);
      const distinti = new Set(validi.map(o => tessKey_(o.numero_tessera))).size;
      if (!giaSuo && distinti >= maxO) {
        return { ok: false, messaggio: 'La raccolta ha raggiunto il numero massimo di ordini.' };
      }
    }

    // --- verifica tessera ---
    const soci = leggiTabella(SHEETS.SOCI);
    const socio = soci.find(s => tessKey_(s.numero_tessera) === tessera);
    let stato = 'valido', motivo = '';
    if (!socio) { stato = 'da_verificare'; motivo = 'Tessera non trovata'; }
    else if (!isSi(socio.tessera_attiva)) { stato = 'da_verificare'; motivo = 'Tessera non attiva'; }
    else if (!stessoNome_(socio.nominativo, nominativo)) { stato = 'da_verificare'; motivo = 'Nominativo non corrispondente'; }

    // --- validazione prodotti (max per ordine) ---
    const prodotti = leggiTabella(SHEETS.PRODOTTI);
    const mappaProd = {};
    prodotti.forEach(p => mappaProd[String(p.id)] = p);
    for (const it of items) {
      const p = mappaProd[String(it.prodottoId)];
      if (!p) return { ok: false, messaggio: 'Prodotto non valido nell\'ordine.' };
      const maxPer = p.max_per_ordine === '' ? null : num(p.max_per_ordine);
      if (maxPer != null && num(it.quantita) > maxPer) {
        return { ok: false, messaggio: 'Per "' + p.nome + '" il massimo per ordine è ' + maxPer + ' ' + (p.unita || '') + '.' };
      }
    }

    // --- conflitto: se il socio ha già un ordine valido in questa raccolta, NON si sostituisce: si segnala ---
    const esistenti = leggiTabella(SHEETS.ORDINI).filter(o => String(o.raccolta_id) === cicloId
                    && tessKey_(o.numero_tessera) === tessera && String(o.stato) === 'valido');
    let conflitto = false, sostituiti = 0;
    if (viaSocio) {
      // il socio identificato dal link modifica il proprio ordine: annulla tutti i suoi ordini attivi in questa raccolta
      leggiTabella(SHEETS.ORDINI).filter(o => String(o.raccolta_id) === cicloId
          && tessKey_(o.numero_tessera) === tessera && String(o.stato) !== 'annullato')
        .forEach(o => { aggiornaCella(SHEETS.ORDINI, o._riga, 'stato', 'annullato');
          aggiornaCella(SHEETS.ORDINI, o._riga, 'motivo_annullamento', 'Sostituito: modificato dal socio'); sostituiti++; });
    } else if (esistenti.length) {
      conflitto = true;
      stato = 'da_verificare';
      motivo = (motivo ? motivo + '; ' : '') + 'ordine multiplo: il socio ha già un ordine in questa raccolta';
    }

    // --- scrittura ordine + righe ---
    const ordineId = nuovoId(SHEETS.ORDINI, 'OR');
    aggiungiRiga(SHEETS.ORDINI, {
      id: ordineId, raccolta_id: cicloId, numero_tessera: tessera,
      nominativo_inserito: nominativo, stato: stato, motivo_annullamento: motivo,
      note: String(payload.note || '').trim(),
      timestamp: new Date()
    });
    items.forEach((it, i) => {
      aggiungiRiga(SHEETS.RIGHE, {
        id: ordineId + '-' + (i + 1),
        ordine_id: ordineId,
        prodotto_id: String(it.prodottoId),
        opzione_id: String(it.opzioneId || ''),
        nota_socio: String(it.notaSocio || ''),
        quantita: num(it.quantita),
        peso_confermato: ''
      });
    });

    const autore = viaSocio ? ('socio:' + tessera + (viaSocio.isAdmin ? (' (' + viaSocio.adminNome + ')') : '')) : tessera;
    log_(autore, sostituiti ? 'ordine_modificato' : ('ordine_' + stato), ordineId + (motivo ? (' – ' + motivo) : '') + (sostituiti ? ' (sostituisce il precedente)' : ''));

    const msg = stato === 'valido'
      ? (sostituiti ? 'Ordine aggiornato. Grazie!' : 'Ordine registrato. Grazie!')
      : (conflitto
          ? 'Risulti già avere un ordine per questa raccolta. Il nuovo ordine è stato registrato e verrà verificato da un amministratore o dal fornitore, che potranno contattarti.'
          : 'Ordine registrato, ma segnalato per verifica (' + motivo + '). Un amministratore lo controllerà.');
    return { ok: true, stato: stato, messaggio: msg, ordineId: ordineId, modificato: sostituiti > 0 };

  } finally {
    lock.releaseLock();
  }
}
