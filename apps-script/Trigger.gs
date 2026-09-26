/**
 * Trigger.gs — chiusura automatica delle raccolte.
 * Una raccolta aperta viene chiusa quando:
 *   - è passata la data/ora di chiusura, oppure
 *   - è stato raggiunto il numero massimo di ordini (max_ordini).
 *
 * Il controllo avviene:
 *   - ogni 15 minuti, con il trigger (vedi installaTriggerChiusura);
 *   - e comunque ogni volta che qualcuno apre il form, invia un ordine, apre il pannello
 *     o la pagina del socio: così una raccolta scaduta non resta mai ordinabile,
 *     anche se il trigger si fosse fermato.
 */

/** Una raccolta è aperta? (tollera "Aperta", maiuscole e spazi) */
function raccoltaAperta_(c) {
  const s = String(c.stato || '').trim().toLowerCase();
  return s === 'aperto' || s === 'aperta';
}

const MESI_IT_ = { gen: 1, feb: 2, mar: 3, apr: 4, mag: 5, giu: 6, lug: 7, ago: 8, set: 9, ott: 10, nov: 11, dic: 12 };

/**
 * Converte il valore "chiusura" (Date o testo) in Date. Null se non riconosciuto.
 * Accetta: 10-10-2026 20:00 · 10/10/2026 20.00 · 10-10-2026 ore 20 · mercoledì 10-10 alle 20:00 ·
 *          10 ottobre 2026 20:00 · 2026-10-10 20:00. Senza ora: fine giornata (23:59). Senza anno: il più vicino.
 */
function parseChiusura_(v) {
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    // una data senza ora (mezzanotte) vale fino alla fine di quel giorno
    if (v.getHours() === 0 && v.getMinutes() === 0) return new Date(v.getFullYear(), v.getMonth(), v.getDate(), 23, 59);
    return v;
  }
  let s = String(v || '').trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica)/g, ' ')
       .replace(/(^|\s)(ore|alle|h)(?=\s|\d|$)/g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const ora = s.match(/(\d{1,2})[:.](\d{2})\s*$/) || s.match(/\s(\d{1,2})\s*$/);
  let hh = 23, mm = 59, resto = s;
  if (ora) { hh = +ora[1]; mm = ora[2] !== undefined ? +ora[2] : 0; resto = s.substring(0, ora.index).trim(); }
  let g, me, a, m;
  if ((m = resto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { a = +m[1]; me = +m[2]; g = +m[3]; }
  else if ((m = resto.match(/^(\d{1,2})[-\/.](\d{1,2})(?:[-\/.](\d{2,4}))?/))) { g = +m[1]; me = +m[2]; a = m[3] ? +m[3] : null; }
  else if ((m = resto.match(/^(\d{1,2})\s+([a-zà]{3})[a-zà]*\.?(?:\s+(\d{4}))?/)) && MESI_IT_[m[2]]) { g = +m[1]; me = MESI_IT_[m[2]]; a = m[3] ? +m[3] : null; }
  else return null;
  if (a !== null && a < 100) a += 2000;
  if (hh > 23 || mm > 59 || me < 1 || me > 12 || g < 1 || g > 31) return null;
  if (a === null) { // senza anno: quello che dà la data più vicina a oggi
    const oggi = new Date(); a = oggi.getFullYear();
    const d = new Date(a, me - 1, g, hh, mm);
    if (d - oggi > 183 * 864e5) a--; else if (oggi - d > 183 * 864e5) a++;
  }
  return new Date(a, me - 1, g, hh, mm);
}

/** Numero di ordini validi (tessere distinte) di una raccolta. */
function nOrdiniValidi_(cicloId, ordini) {
  ordini = ordini || leggiTabella(SHEETS.ORDINI);
  return new Set(
    ordini.filter(o => String(o.raccolta_id) === String(cicloId) && String(o.stato) === 'valido')
          .map(o => tessKey_(o.numero_tessera))
  ).size;
}

/** Se la raccolta aperta è scaduta o al completo la chiude subito. Ritorna true se l'ha chiusa. */
function chiudiSeScaduta_(c, ordini, chi) {
  if (!raccoltaAperta_(c)) return false;
  let motivo = '';
  const dt = parseChiusura_(c.chiusura);
  if (dt && dt <= new Date()) motivo = 'scadenza data';
  if (!motivo) {
    const maxO = num(c.max_ordini);
    if (maxO > 0 && nOrdiniValidi_(c.id, ordini) >= maxO) motivo = 'massimo ordini raggiunto';
  }
  if (!motivo) return false;
  aggiornaCella(SHEETS.RACCOLTE, c._riga, 'stato', 'chiuso');
  c.stato = 'chiuso';
  log_(chi || 'trigger', 'chiusura_automatica', String(c.id) + ' (' + motivo + ')');
  return true;
}

/** La raccolta è conclusa (consegnata o archiviata)? Le raccolte concluse vanno nello storico. */
function raccoltaConclusa_(c) {
  const s = String(c.stato || '').trim().toLowerCase();
  return s === 'consegnato' || s === 'consegnata' || s === 'archiviato' || s === 'archiviata';
}

/**
 * Le raccolte concluse sono in sola lettura: ordini, righe, pesi e dati della raccolta non si modificano più.
 * Lancia un errore se la raccolta è conclusa. Per correggere un "Segna come consegnata" toccato per errore
 * c'è "Riporta tra le raccolte in corso" (adminRiportaInCorso).
 */
function bloccaSeConclusa_(c) {
  if (c && raccoltaConclusa_(c)) throw new Error('La raccolta è conclusa: gli ordini si possono vedere ma non modificare.');
}

/** Controlla che la raccolta di un ordine non sia conclusa. */
function bloccaOrdineConcluso_(ordine) {
  bloccaSeConclusa_(leggiTabella(SHEETS.RACCOLTE).find(x => String(x.id) === String(ordine.raccolta_id)));
}

/** Data di consegna di una raccolta (dalla consegna assegnata o dai vecchi campi), come Date. Null se manca. */
function dataConsegnaRaccolta_(r, consegneById) {
  const cid = String(r.consegna_id || '');
  if (cid && consegneById[cid]) return parseChiusura_(consegneById[cid].data);
  return String(r.data_consegna || '').trim() ? parseChiusura_(r.data_consegna) : null;
}

/** Il giorno della consegna è finito? (vero da mezzanotte del giorno dopo) */
function consegnaPassata_(dt, ora) {
  if (!dt) return false;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1) <= (ora || new Date());
}

/**
 * Il giorno dopo la consegna, le raccolte chiuse passano a "consegnato" e finiscono nello storico.
 * Le raccolte senza data di consegna restano chiuse: le segna un amministratore dal pannello.
 */
function concludiConsegnate_(raccolte, chi) {
  const consegne = {}; leggiTabellaSafe_(SHEETS.CONSEGNE).forEach(co => consegne[String(co.id)] = co);
  const ora = new Date();
  let n = 0;
  raccolte.forEach(r => {
    const s = String(r.stato || '').trim().toLowerCase();
    if (s !== 'chiuso' && s !== 'chiusa' && s !== 'definitivo') return;
    if (!consegnaPassata_(dataConsegnaRaccolta_(r, consegne), ora)) return;
    aggiornaCella(SHEETS.RACCOLTE, r._riga, 'stato', 'consegnato');
    r.stato = 'consegnato';
    log_(chi || 'trigger', 'consegna_conclusa', String(r.id));
    n++;
  });
  return n;
}

/**
 * Chiude tutte le raccolte scadute o al completo, e porta a "consegnato" quelle già consegnate.
 * Eseguita dal trigger e all'apertura del pannello.
 */
function chiusuraAutomatica(chi) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return 0;
  try {
    const autore = typeof chi === 'string' ? chi : 'trigger';
    const ordini = leggiTabella(SHEETS.ORDINI);
    const raccolte = leggiTabella(SHEETS.RACCOLTE);
    let chiuse = 0;
    raccolte.forEach(c => { if (chiudiSeScaduta_(c, ordini, autore)) chiuse++; });
    try { concludiConsegnate_(raccolte, autore); } catch (e) { log_(autore, 'errore_conclusione_consegne', String(e && e.message || e)); }
    return chiuse;
  } finally {
    lock.releaseLock();
  }
}

/** Installa il trigger di chiusura automatica (ogni 15 minuti). Eseguila una volta dall'editor. */
function installaTriggerChiusura() {
  rimuoviTriggerChiusura();
  ScriptApp.newTrigger('chiusuraAutomatica').timeBased().everyMinutes(15).create();
  const n = chiusuraAutomatica('installazione');
  Logger.log('Trigger di chiusura automatica installato (ogni 15 minuti). Raccolte chiuse ora: ' + n);
  return 'OK';
}

/** Rimuove il trigger di chiusura automatica. */
function rimuoviTriggerChiusura() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'chiusuraAutomatica') ScriptApp.deleteTrigger(t);
  });
  return 'OK';
}

/** Stato della chiusura automatica, per le Notifiche del pannello. */
function statoChiusuraAutomatica_() {
  let trigger = false;
  try { trigger = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'chiusuraAutomatica'); } catch (e) { trigger = null; }
  const nonLeggibili = leggiTabella(SHEETS.RACCOLTE)
    .filter(c => raccoltaAperta_(c) && String(c.chiusura || '').trim() && !parseChiusura_(c.chiusura))
    .map(c => ({ id: String(c.id), chiusura: testoData_(c.chiusura) }));
  return { trigger: trigger, nonLeggibili: nonLeggibili };
}

/**
 * Diagnosi: eseguila dall'editor e leggi il risultato in "Log di esecuzione".
 * Per ogni raccolta aperta mostra come viene letta la data di chiusura e se verrebbe chiusa.
 */
function diagnosiChiusura() {
  const righe = [];
  const st = statoChiusuraAutomatica_();
  righe.push('Trigger chiusura automatica: ' + (st.trigger ? 'INSTALLATO' : (st.trigger === false ? 'NON installato → esegui installaTriggerChiusura' : 'non verificabile')));
  const ora = new Date();
  righe.push('Adesso: ' + Utilities.formatDate(ora, 'Europe/Rome', 'dd-MM-yyyy HH:mm') + ' (fuso del progetto: ' + Session.getScriptTimeZone() + ')');
  const ordini = leggiTabella(SHEETS.ORDINI);
  leggiTabella(SHEETS.RACCOLTE).forEach(c => {
    const stato = String(c.stato || '');
    if (!raccoltaAperta_(c)) { if (stato.trim().toLowerCase().indexOf('apert') === 0) righe.push(c.id + ': stato "' + stato + '" non riconosciuto'); return; }
    const dt = parseChiusura_(c.chiusura);
    const tipo = c.chiusura instanceof Date ? 'data del foglio' : 'testo';
    const maxO = num(c.max_ordini);
    righe.push(c.id + ': chiusura "' + testoData_(c.chiusura) + '" (' + tipo + ') → ' +
      (dt ? Utilities.formatDate(dt, 'Europe/Rome', 'dd-MM-yyyy HH:mm') + (dt <= ora ? ' · SCADUTA: va chiusa' : ' · ancora aperta') : 'NON LEGGIBILE: correggi la data (es. 10-10-2026 20:00)') +
      (maxO > 0 ? ' · ordini ' + nOrdiniValidi_(c.id, ordini) + '/' + maxO : ''));
  });
  const testo = righe.join('\n');
  Logger.log(testo);
  return testo;
}
