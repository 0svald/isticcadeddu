/**
 * SociImport.gs — import dell'elenco soci da file CSV (Tessera, Nominativo, Telefono).
 * Flusso: analizza (anteprima differenze) -> conferma (applica). Le tessere assenti
 * dal CSV diventano "non attive" (non vengono cancellate, per conservare lo storico).
 * Dopo l'import ri-verifica gli ordini dei cicli aperti/chiusi.
 */

/** Divide una riga CSV rispettando le virgolette. */
function splitCsvLine_(line, sep) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === sep) { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out.map(x => x.trim());
}

/** Interpreta il testo CSV -> { rows:[{tessera,nominativo,telefono}], sep }. */
function parseCsvSoci_(text) {
  text = String(text || '').replace(/^\uFEFF/, ''); // togli BOM
  const linee = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (!linee.length) return { rows: [], sep: ',' };
  // separatore: ';' se più frequente nella prima riga, altrimenti ','
  const sep = (linee[0].split(';').length > linee[0].split(',').length) ? ';' : ',';

  // rileva intestazione
  const prima = splitCsvLine_(linee[0], sep).map(s => s.toLowerCase());
  const haHeader = prima.some(c => /tesser|nominativ|nome|telefon|cell/.test(c));
  let idxT = 0, idxN = 1, idxTel = 2;
  let start = 0;
  if (haHeader) {
    start = 1;
    prima.forEach((c, i) => {
      if (/tesser/.test(c)) idxT = i;
      else if (/nominativ|nome|cognome/.test(c)) idxN = i;
      else if (/telefon|cell/.test(c)) idxTel = i;
    });
  }

  const rows = [];
  for (let i = start; i < linee.length; i++) {
    const cols = splitCsvLine_(linee[i], sep);
    const tessera = tessKey_(cols[idxT]);
    if (!tessera) continue;
    rows.push({
      tessera: tessera,
      nominativo: (cols[idxN] || '').trim(),
      telefono: (cols[idxTel] || '').trim()
    });
  }
  return { rows: rows, sep: sep };
}

/** Confronta il CSV con la scheda Soci e restituisce le differenze. */
function diffSoci_(rowsCsv) {
  const soci = leggiTabella(SHEETS.SOCI);
  const perTessera = {};
  soci.forEach(s => perTessera[tessKey_(s.numero_tessera)] = s);
  const tessereCsv = {};

  const nuovi = [], riattivate = [], modificate = [], disattivate = [];
  let invariate = 0;

  rowsCsv.forEach(r => {
    tessereCsv[r.tessera] = true;
    const es = perTessera[r.tessera];
    if (!es) { nuovi.push({ tessera: r.tessera, nominativo: r.nominativo }); return; }
    const eraAttiva = isSi(es.tessera_attiva);
    const nomeDiverso = String(es.nominativo || '').trim() !== r.nominativo;
    const telDiverso = String(es.telefono || '').trim() !== r.telefono;
    if (!eraAttiva) riattivate.push({ tessera: r.tessera, nominativo: r.nominativo });
    else if (nomeDiverso || telDiverso) modificate.push({
      tessera: r.tessera, da: es.nominativo, a: r.nominativo
    });
    else invariate++;
  });

  soci.forEach(s => {
    const t = tessKey_(s.numero_tessera);
    if (isSi(s.tessera_attiva) && !tessereCsv[t]) {
      disattivate.push({ tessera: t, nominativo: s.nominativo });
    }
  });

  return { totaleCsv: rowsCsv.length, nuovi, riattivate, modificate, disattivate, invariate };
}

/** ANALISI (anteprima). Non modifica nulla. */
function adminAnalizzaCsvSoci(token, csvText) {
  checkToken_(token);
  const parsed = parseCsvSoci_(csvText);
  if (!parsed.rows.length) return { errore: 'Nessuna riga valida trovata nel CSV.' };
  const d = diffSoci_(parsed.rows);
  const taglia = a => ({ n: a.length, esempi: a.slice(0, 50) });
  return {
    separatore: parsed.sep,
    totaleCsv: d.totaleCsv,
    invariate: d.invariate,
    nuovi: taglia(d.nuovi),
    riattivate: taglia(d.riattivate),
    modificate: taglia(d.modificate),
    disattivate: taglia(d.disattivate)
  };
}

/** CONFERMA. Applica le modifiche alla scheda Soci e ri-verifica gli ordini. */
function adminImportaCsvSoci(token, csvText) {
  checkToken_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const parsed = parseCsvSoci_(csvText);
    if (!parsed.rows.length) return { ok: false, messaggio: 'Nessuna riga valida nel CSV.' };

    const sh = ss_().getSheetByName(SHEETS.SOCI);
    const values = sh.getDataRange().getValues();
    const headers = values[0].map(h => String(h).trim());
    const ci = {
      t: headers.indexOf('numero_tessera'),
      n: headers.indexOf('nominativo'),
      tel: headers.indexOf('telefono'),
      att: headers.indexOf('tessera_attiva'),
      sca: headers.indexOf('scadenza_tessera')
    };
    if (ci.t < 0 || ci.att < 0) return { ok: false, messaggio: 'Colonne mancanti nella scheda Soci.' };

    // mappa tessera -> indice riga (nell'array values)
    const idxByTessera = {};
    for (let r = 1; r < values.length; r++) {
      const t = tessKey_(values[r][ci.t]);
      if (t) idxByTessera[t] = r;
    }

    const csvByTessera = {};
    parsed.rows.forEach(r => csvByTessera[r.tessera] = r);

    let nuovi = 0, aggiornate = 0, riattivate = 0, disattivate = 0;

    // aggiorna/riattiva esistenti e prepara nuovi
    const nuoveRighe = [];
    parsed.rows.forEach(r => {
      const idx = idxByTessera[r.tessera];
      if (idx == null) {
        const riga = new Array(headers.length).fill('');
        riga[ci.t] = r.tessera;
        if (ci.n >= 0) riga[ci.n] = r.nominativo;
        if (ci.tel >= 0) riga[ci.tel] = r.telefono;
        riga[ci.att] = 'SI';
        nuoveRighe.push(riga);
        nuovi++;
      } else {
        const row = values[idx];
        if (!isSi(row[ci.att])) riattivate++;
        row[ci.att] = 'SI';
        if (ci.n >= 0) row[ci.n] = r.nominativo;
        if (ci.tel >= 0) row[ci.tel] = r.telefono;
        aggiornate++;
      }
    });

    // disattiva le tessere assenti dal CSV (tranne quella di chi sta importando)
    const tessereDisattivate = []; let protetta = '';
    for (let r = 1; r < values.length; r++) {
      const t = tessKey_(values[r][ci.t]);
      if (t && !csvByTessera[t] && isSi(values[r][ci.att])) {
        if (t === _ADMIN_TESSERA) { protetta = t; continue; }
        values[r][ci.att] = 'NO';
        tessereDisattivate.push(t);
        disattivate++;
      }
    }

    // riscrivi il blocco esistente e aggiungi i nuovi
    sh.getRange(1, 1, values.length, headers.length).setValues(values);
    if (nuoveRighe.length) {
      sh.getRange(values.length + 1, 1, nuoveRighe.length, headers.length).setValues(nuoveRighe);
    }

    // decadono i ruoli (amministratore, fornitore) dei soci disattivati
    const ruoliDecaduti = revocaRuoli_(tessereDisattivate);
    if (protetta) log_('sistema', 'import_tessera_protetta', 'la tessera ' + protetta + ' (chi importa) non è stata disattivata');

    // ri-verifica ordini validi nei cicli aperti/chiusi con tessera ora non attiva
    const ordiniSegnalati = riverificaOrdini_();

    logAdmin_('import_soci', 'nuovi=' + nuovi + ' aggiornate=' + aggiornate +
         ' riattivate=' + riattivate + ' disattivate=' + disattivate + ' ruoli_decaduti=' + ruoliDecaduti + ' ordini_segnalati=' + ordiniSegnalati);

    try { generaTokenSoci(); } catch (e) {} // i nuovi soci ricevono subito il token del link personale
    return {
      ok: true,
      nuovi: nuovi, aggiornate: aggiornate, riattivate: riattivate,
      disattivate: disattivate, ordiniSegnalati: ordiniSegnalati, ruoliDecaduti: ruoliDecaduti, tesseraProtetta: protetta
    };
  } finally {
    lock.releaseLock();
  }
}



/** (Admin) Esporta i soci in CSV (testo). */
function adminExportSociCsv(token) {
  checkToken_(token);
  const esc = v => { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  let out = 'Tessera,Nominativo,Telefono,Attiva\n';
  leggiTabella(SHEETS.SOCI).forEach(s => {
    out += [esc(tessKey_(s.numero_tessera)), esc(s.nominativo), esc(s.telefono), isSi(s.tessera_attiva) ? 'SI' : 'NO'].join(',') + '\n';
  });
  return { filename: 'soci_' + Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyyMMdd') + '.csv', testo: out };
}

/** Segna "da_verificare" gli ordini validi (cicli aperti/chiusi) con tessera non attiva. */
function riverificaOrdini_() {
  const attive = {};
  leggiTabella(SHEETS.SOCI).forEach(s => { if (isSi(s.tessera_attiva)) attive[tessKey_(s.numero_tessera)] = true; });
  const cicliVivi = {};
  leggiTabella(SHEETS.RACCOLTE).forEach(c => {
    const st = String(c.stato).toLowerCase();
    if (st === 'aperto' || st === 'chiuso') cicliVivi[String(c.id)] = true;
  });
  let n = 0;
  leggiTabella(SHEETS.ORDINI).forEach(o => {
    if (String(o.stato) !== 'valido') return;
    if (!cicliVivi[String(o.raccolta_id)]) return;
    if (!attive[tessKey_(o.numero_tessera)]) {
      aggiornaCella(SHEETS.ORDINI, o._riga, 'stato', 'da_verificare');
      aggiornaCella(SHEETS.ORDINI, o._riga, 'motivo_annullamento', 'Tessera non più attiva (import soci)');
      n++;
    }
  });
  return n;
}

/** (Admin) Elenco soci per la gestione manuale. */
function adminListaSoci(token) {
  checkToken_(token);
  return leggiTabella(SHEETS.SOCI).map(s => ({
    tessera: tessKey_(s.numero_tessera),
    nominativo: s.nominativo || '',
    telefono: s.telefono || '',
    attiva: isSi(s.tessera_attiva)
  })).sort((a, b) => a.tessera.localeCompare(b.tessera, undefined, { numeric: true }));
}

/** (Admin) Attiva/disattiva un socio per numero tessera. */
function adminToggleSocio(token, tessera, attiva) {
  checkToken_(token);
  const s = leggiTabella(SHEETS.SOCI).find(x => tessKey_(x.numero_tessera) === tessKey_(tessera));
  if (!s) throw new Error('Socio non trovato.');
  if (!attiva) puoiDisattivareSocio_(tessera);
  aggiornaCella(SHEETS.SOCI, s._riga, 'tessera_attiva', attiva ? 'SI' : 'NO');
  if (!attiva) { revocaRuoli_([tessera]); riverificaOrdini_(); } // decadono i ruoli; ricontrolla gli ordini aperti
  logAdmin_(attiva ? 'socio_attivato' : 'socio_disattivato', tessKey_(tessera));
  return true;
}

/** (Admin) Esporta i soci in CSV (separatore ';', con BOM per Excel). */
function adminExportCsvSoci(token) {
  checkToken_(token);
  const soci = leggiTabella(SHEETS.SOCI);
  const esc = v => {
    v = String(v == null ? '' : v);
    return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };
  let csv = 'Tessera;Nominativo;Telefono;Attiva\n';
  soci.forEach(s => {
    csv += [esc(tessKey_(s.numero_tessera)), esc(s.nominativo), esc(s.telefono),
            isSi(s.tessera_attiva) ? 'SI' : 'NO'].join(';') + '\n';
  });
  const data = Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyyMMdd');
  return { filename: 'soci_' + data + '.csv', csv: '\uFEFF' + csv };
}

/** (Admin) Aggiunge un singolo socio. */
function adminAggiungiSocio(token, d) {
  checkToken_(token);
  const t = tessKey_(d.tessera);
  if (!t) throw new Error('Il numero di tessera è obbligatorio.');
  const esiste = leggiTabella(SHEETS.SOCI).some(s => tessKey_(s.numero_tessera) === t);
  if (esiste) throw new Error('Tessera già presente: ' + t);
  aggiungiRiga(SHEETS.SOCI, {
    numero_tessera: t,
    nominativo: String(d.nominativo || '').trim(),
    telefono: String(d.telefono || '').trim(),
    tessera_attiva: 'SI',
    scadenza_tessera: ''
  });
  logAdmin_('socio_creato', t);
  try { generaTokenSoci(); } catch (e) {}
  return { ok: true };
}

/** (Admin) Modifica un socio: nominativo, telefono e — se serve — anche il numero tessera. */
function adminModificaSocio(token, tessera, d) {
  checkToken_(token);
  const vecchia = tessKey_(tessera);
  const s = leggiTabella(SHEETS.SOCI).find(x => tessKey_(x.numero_tessera) === vecchia);
  if (!s) throw new Error('Socio non trovato.');

  // cambio tessera (con propagazione ai riferimenti)
  if (d.tessera !== undefined) {
    const nuova = tessKey_(d.tessera);
    if (!nuova) throw new Error('Il numero tessera non può essere vuoto.');
    if (nuova !== vecchia) {
      if (leggiTabella(SHEETS.SOCI).some(x => tessKey_(x.numero_tessera) === nuova)) {
        throw new Error('Esiste già la tessera ' + nuova + '.');
      }
      aggiornaCella(SHEETS.SOCI, s._riga, 'numero_tessera', nuova);
      leggiTabella(SHEETS.ORDINI).forEach(o => { if (tessKey_(o.numero_tessera) === vecchia) aggiornaCella(SHEETS.ORDINI, o._riga, 'numero_tessera', nuova); });
      leggiTabella(SHEETS.FORNITORI).forEach(f => { if (tessKey_(f.numero_tessera) === vecchia) aggiornaCella(SHEETS.FORNITORI, f._riga, 'numero_tessera', nuova); });
      leggiTabellaSafe_(SHEETS.ADMIN).forEach(a => { if (tessKey_(a.numero_tessera) === vecchia) aggiornaCella(SHEETS.ADMIN, a._riga, 'numero_tessera', nuova); });
      logAdmin_('tessera_cambiata', vecchia + ' -> ' + nuova);
      tessera = nuova;
    }
  }
  if (d.nominativo !== undefined) aggiornaCella(SHEETS.SOCI, s._riga, 'nominativo', String(d.nominativo).trim());
  if (d.telefono !== undefined) aggiornaCella(SHEETS.SOCI, s._riga, 'telefono', String(d.telefono).trim());
  if (d.attiva !== undefined) {
    const eraAttiva = isSi(s.tessera_attiva);
    if (!d.attiva && eraAttiva) puoiDisattivareSocio_(tessera);
    aggiornaCella(SHEETS.SOCI, s._riga, 'tessera_attiva', d.attiva ? 'SI' : 'NO');
    if (!d.attiva && eraAttiva) { revocaRuoli_([tessera]); riverificaOrdini_(); }
  }
  logAdmin_('socio_modificato', tessKey_(tessera));
  return { ok: true, tessera: tessKey_(tessera) };
}
