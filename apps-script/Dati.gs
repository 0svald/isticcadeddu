/**
 * Dati.gs — accesso al foglio Google (il "database" del GAS).
 * Legge le tabelle per nome di colonna, così l'ordine delle colonne non conta.
 */

// Nomi delle schede (devono coincidere con i tab del foglio)
const SHEETS = {
  FORNITORI: 'Fornitori',
  CATEGORIE: 'Categorie',
  PRODOTTI: 'Prodotti',
  OPZIONI: 'Opzioni',
  LUOGHI: 'Luoghi',
  RACCOLTE: 'Raccolte',
  CONSEGNE: 'Consegne',
  ORDINI: 'Ordini',
  RIGHE: 'Righe',
  SOCI: 'Soci',
  ADMIN: 'Admin',
  TEMPLATE: 'TemplateMessaggi',
  LOG: 'Log'
};

/** Restituisce il foglio dati. Usa SPREADSHEET_ID se impostato, altrimenti il foglio attivo. */
function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  const attivo = SpreadsheetApp.getActive();
  if (attivo) return attivo;
  throw new Error('Foglio non trovato: imposta la proprietà script SPREADSHEET_ID con l\'ID del foglio.');
}

// Alias per compatibilità: "Raccolte" può ancora chiamarsi "Cicli" in fogli non aggiornati.
const ALIAS_SCHEDE = { 'Raccolte': ['Raccolte', 'Cicli'] };

/** Trova una scheda per nome, provando gli alias. */
function trovaScheda_(nome) {
  const ss = ss_();
  const candidati = ALIAS_SCHEDE[nome] || [nome];
  for (let i = 0; i < candidati.length; i++) {
    const sh = ss.getSheetByName(candidati[i]);
    if (sh) return sh;
  }
  return null;
}

/** Legge una scheda come array di oggetti {colonna: valore}. */
function leggiTabella(nomeScheda) {
  const sh = trovaScheda_(nomeScheda);
  if (!sh) throw new Error('Scheda mancante: ' + nomeScheda);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(h => String(h).trim());
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    // salta righe vuote o note (prima cella vuota), a meno che la riga abbia un id
    // (es. scheda Admin la cui prima colonna è 'email', vuota per i nuovi amministratori)
    if (String(row[0]).trim() === '') {
      const iId = headers.indexOf('id');
      if (iId < 0 || String(row[iId]).trim() === '') continue;
    }
    const obj = { _riga: r + 1 };
    headers.forEach((h, c) => { if (h) obj[h] = row[c]; });
    // alias di colonna: raccolta_id <-> ciclo_id (fogli non aggiornati)
    if (obj.ciclo_id !== undefined && obj.raccolta_id === undefined) obj.raccolta_id = obj.ciclo_id;
    if (obj.raccolta_id !== undefined && obj.ciclo_id === undefined) obj.ciclo_id = obj.raccolta_id;
    out.push(obj);
  }
  return out;
}

/** Elimina una riga fisica da una scheda. */
function eliminaRiga_(nomeScheda, rigaFisica) {
  const sh = trovaScheda_(nomeScheda);
  if (!sh) throw new Error('Scheda mancante: ' + nomeScheda);
  sh.deleteRow(rigaFisica);
}

/** Come leggiTabella, ma se la scheda non esiste restituisce [] (per schede opzionali). */
function leggiTabellaSafe_(nomeScheda) {
  try { return leggiTabella(nomeScheda); } catch (e) { return []; }
}

/** Aggiunge una riga a una scheda rispettando l'ordine delle sue colonne. */
function aggiungiRiga(nomeScheda, oggetto) {
  const sh = trovaScheda_(nomeScheda);
  if (!sh) throw new Error('Scheda mancante: ' + nomeScheda);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const riga = headers.map(h => {
    if (h in oggetto) return oggetto[h];
    // alias colonna: se il foglio ha ancora 'ciclo_id', usa 'raccolta_id'
    if (h === 'ciclo_id' && 'raccolta_id' in oggetto) return oggetto['raccolta_id'];
    if (h === 'raccolta_id' && 'ciclo_id' in oggetto) return oggetto['ciclo_id'];
    return '';
  });
  sh.appendRow(riga);
}

/** Aggiorna una cella (per riga fisica e nome colonna). */
function aggiornaCella(nomeScheda, rigaFisica, colonna, valore) {
  const sh = trovaScheda_(nomeScheda);
  if (!sh) throw new Error('Scheda mancante: ' + nomeScheda);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).trim());
  let idx = headers.indexOf(colonna);
  if (idx < 0 && colonna === 'raccolta_id') idx = headers.indexOf('ciclo_id');
  if (idx < 0 && colonna === 'ciclo_id') idx = headers.indexOf('raccolta_id');
  if (idx < 0) throw new Error('Colonna mancante: ' + colonna + ' in ' + nomeScheda);
  sh.getRange(rigaFisica, idx + 1).setValue(valore);
}

/** SI/NO -> booleano. */
function isSi(v) {
  return String(v).trim().toUpperCase() === 'SI';
}

/** Prezzo/numero robusto (gestisce virgola). */
function num(v) {
  if (typeof v === 'number') return v;
  if (v === '' || v == null) return 0;
  return parseFloat(String(v).replace(',', '.')) || 0;
}

/** Formatta un valore data in testo leggibile (le celle possono essere Date o testo). */
function testoData_(v) {
  if (v instanceof Date) {
    const conOra = v.getHours() || v.getMinutes();
    return Utilities.formatDate(v, 'Europe/Rome', conOra ? 'dd-MM-yyyy HH:mm' : 'dd-MM-yyyy');
  }
  return String(v == null ? '' : v);
}

/** Scrive una riga nel Log. */
function log_(utente, azione, dettaglio) {
  try {
    aggiungiRiga(SHEETS.LOG, {
      timestamp: new Date(),
      utente: utente || '',
      azione: azione || '',
      dettaglio: dettaglio || ''
    });
  } catch (e) { /* il log non deve mai bloccare */ }
}

/** Genera un id progressivo tipo "OR0007" leggendo gli id esistenti. */
function nuovoId(nomeScheda, prefisso, colonnaId) {
  colonnaId = colonnaId || 'id';
  const righe = leggiTabella(nomeScheda);
  let max = 0;
  righe.forEach(r => {
    const s = String(r[colonnaId] || '');
    const m = s.match(new RegExp('^' + prefisso + '(\\d+)$'));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  const n = String(max + 1).padStart(4, '0');
  return prefisso + n;
}
