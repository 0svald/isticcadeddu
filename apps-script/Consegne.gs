/**
 * Consegne.gs — le CONSEGNE sono entità a sé che AGGREGANO più raccolte.
 * Una consegna ha data, fascia oraria, luogo, referente. Ogni raccolta si
 * assegna a una consegna tramite la colonna `consegna_id` (in Raccolte).
 * Retrocompatibilità: se una raccolta non ha consegna_id, si usano i suoi
 * vecchi campi data_consegna/fascia_oraria/luogo_id (se presenti).
 */

/** Elenco luoghi attivi (per i menu a tendina). */
function adminLuoghi(token) {
  checkToken_(token);
  return leggiTabella(SHEETS.LUOGHI)
    .filter(l => isSi(l.attivo))
    .map(l => ({ id: String(l.id), nome: l.nome, indirizzo: l.indirizzo || '' }));
}

/** (Admin) Aggiunge un luogo di consegna. */
function adminAggiungiLuogo(token, d) {
  checkToken_(token);
  const nome = String(d.nome || '').trim();
  if (!nome) throw new Error('Il nome del luogo è obbligatorio.');
  const id = nuovoId(SHEETS.LUOGHI, 'L');
  aggiungiRiga(SHEETS.LUOGHI, {
    id: id, nome: nome, indirizzo: String(d.indirizzo || '').trim(),
    link_mappa: String(d.linkMappa || '').trim(), attivo: 'SI'
  });
  logAdmin_('luogo_creato', id + ' ' + nome);
  return { ok: true, id: id };
}

/** Dati di consegna risolti per una raccolta (dalla consegna assegnata o dai campi legacy). */
function consegnaDiRaccolta_(raccolta) {
  const luoghi = {}; leggiTabella(SHEETS.LUOGHI).forEach(l => luoghi[String(l.id)] = l);
  const cid = String(raccolta.consegna_id || '');
  if (cid) {
    const co = leggiTabellaSafe_(SHEETS.CONSEGNE).find(x => String(x.id) === cid);
    if (co) {
      const lu = luoghi[String(co.luogo_id || '')] || {};
      return {
        data: testoData_(co.data), fascia: co.fascia_oraria || '',
        luogoId: String(co.luogo_id || ''), luogoNome: lu.nome || '', luogoIndirizzo: lu.indirizzo || '',
        referente: co.referente || '', telefono: co.telefono || ''
      };
    }
  }
  // legacy: campi sulla raccolta stessa
  const lu = luoghi[String(raccolta.luogo_id || '')] || {};
  return {
    data: testoData_(raccolta.data_consegna), fascia: raccolta.fascia_oraria || '',
    luogoId: String(raccolta.luogo_id || ''), luogoNome: lu.nome || '', luogoIndirizzo: lu.indirizzo || '',
    referente: raccolta.referente_consegna || '', telefono: raccolta.telefono_referente || ''
  };
}

/** (Admin) Crea una nuova consegna. */
function adminAggiungiConsegna(token, d) {
  checkToken_(token);
  const id = nuovoId(SHEETS.CONSEGNE, 'CO');
  aggiungiRiga(SHEETS.CONSEGNE, {
    id: id, data: String(d.data || '').trim(), fascia_oraria: String(d.fascia || '').trim(),
    luogo_id: String(d.luogoId || ''), referente: String(d.referente || '').trim(),
    telefono: String(d.telefono || '').trim(), note: String(d.note || '').trim()
  });
  logAdmin_('consegna_creata', id);
  return { ok: true, id: id };
}

/** Ora d'inizio (HH:MM) da una fascia oraria. */
function oraMin_(fasce) {
  let min = null;
  fasce.forEach(f => { const m = String(f).match(/(\d{1,2})[:.](\d{2})/);
    if (m) { const t = ('0' + m[1]).slice(-2) + ':' + m[2]; if (min === null || t < min) min = t; } });
  return min;
}

/** (Admin) Elenco consegne con le raccolte (e fornitori) assegnate. */
function adminListaConsegne(token) {
  checkToken_(token);
  const luoghi = {}; leggiTabella(SHEETS.LUOGHI).forEach(l => luoghi[String(l.id)] = l);
  const fornitori = {}; leggiTabella(SHEETS.FORNITORI).forEach(f => fornitori[String(f.id)] = f);
  const raccolte = leggiTabella(SHEETS.RACCOLTE);

  const ora = new Date();
  const lista = leggiTabellaSafe_(SHEETS.CONSEGNE).map(co => {
    const lu = luoghi[String(co.luogo_id || '')] || {};
    const rs = raccolte.filter(r => String(r.consegna_id || '') === String(co.id));
    const dt = parseChiusura_(co.data);
    // conclusa: il giorno della consegna è finito, oppure (senza data) tutte le sue raccolte sono concluse
    const conclusa = dt ? consegnaPassata_(dt, ora) : (rs.length > 0 && rs.every(r => raccoltaConclusa_(r)));
    return {
      id: String(co.id), data: testoData_(co.data), fascia: co.fascia_oraria || '',
      luogoId: String(co.luogo_id || ''), luogoNome: lu.nome || '(luogo non impostato)', luogoIndirizzo: lu.indirizzo || '',
      oraInizio: oraMin_([co.fascia_oraria]),
      dt: dt ? dt.getTime() : 0, conclusa: conclusa,
      raccolte: rs.map(r => {
        const f = fornitori[String(r.fornitore_id)] || {};
        return { id: String(r.id), fornitore: f.nome || String(r.fornitore_id), emoji: f.emoji || '',
          fornitoreId: String(r.fornitore_id || ''), fornitoreAttivo: isSi(f.attivo) };
      })
    };
  });
  // in corso: dalla più vicina (senza data in fondo); concluse: dalla più recente
  const lontano = 8.64e15;
  return lista.sort((a, b) => a.conclusa !== b.conclusa ? (a.conclusa ? 1 : -1)
    : (a.conclusa ? (b.dt - a.dt) : ((a.dt || lontano) - (b.dt || lontano))));
}

/** (Admin) Consegna attualmente assegnata a una raccolta. */
function adminConsegnaDiRaccolta(token, raccoltaId) {
  checkToken_(token);
  const r = leggiTabella(SHEETS.RACCOLTE).find(x => String(x.id) === String(raccoltaId));
  if (!r) throw new Error('Raccolta non trovata.');
  return { consegnaId: String(r.consegna_id || '') };
}

/** (Admin) Assegna (o toglie) una raccolta a una consegna. */
function adminAssegnaConsegna(token, raccoltaId, consegnaId) {
  checkToken_(token);
  const r = leggiTabella(SHEETS.RACCOLTE).find(x => String(x.id) === String(raccoltaId));
  if (!r) throw new Error('Raccolta non trovata.');
  aggiornaCella(SHEETS.RACCOLTE, r._riga, 'consegna_id', String(consegnaId || ''));
  logAdmin_('raccolta_assegnata_consegna', raccoltaId + ' -> ' + (consegnaId || '(nessuna)'));
  return true;
}

/** Testo di un blocco standard (se attivo). */
function bloccoStandard_(chiave) {
  const t = leggiTabella(SHEETS.TEMPLATE).find(x => String(x.chiave) === chiave && isSi(x.attivo));
  return t ? String(t.testo).trim() : '';
}

/** (Admin) Genera l'avviso di ritiro per una consegna (aggrega le sue raccolte). */
function adminMsgAvvisoRitiro(token, consegnaId) {
  checkToken_(token);
  const co = leggiTabellaSafe_(SHEETS.CONSEGNE).find(x => String(x.id) === String(consegnaId));
  if (!co) return 'Consegna non trovata.';
  const lu = leggiTabella(SHEETS.LUOGHI).find(l => String(l.id) === String(co.luogo_id)) || {};
  const fornitori = {}; leggiTabella(SHEETS.FORNITORI).forEach(f => fornitori[String(f.id)] = f);
  const rs = leggiTabella(SHEETS.RACCOLTE).filter(r => String(r.consegna_id || '') === String(co.id));

  let out = '🚚 *AVVISO RITIRO ORDINI GAS*\n';
  out += 'Ritiro per tutti i soci che hanno ordinato:\n';
  out += '📍 ' + (lu.nome || '(luogo)') + (lu.indirizzo ? (' (' + lu.indirizzo + ')') : '') + '\n';
  const ora = oraMin_([co.fascia_oraria]);
  out += '📅 ' + testoData_(co.data) + (ora ? (' · ⏰ dalle ' + ora) : '') + '\n\n';

  out += '*FORNITORI IN CONSEGNA*\n';
  if (!rs.length) out += '- (nessuna raccolta assegnata)\n';
  rs.forEach(r => { const f = fornitori[String(r.fornitore_id)] || {};
    out += '- ' + (f.emoji ? f.emoji + ' ' : '') + (f.nome || r.fornitore_id) + '\n'; });

  ['blocco_parcheggio', 'blocco_da_portare', 'blocco_spirito'].forEach(ch => {
    const b = bloccoStandard_(ch); if (b) out += '\n' + b + '\n';
  });
  out += '\nGrazie a tutti per la collaborazione 🙏';
  return out;
}

/** (Admin) Dati di una consegna (per il form di modifica). */
function adminConsegna(token, id) {
  checkToken_(token);
  const co = leggiTabellaSafe_(SHEETS.CONSEGNE).find(x => String(x.id) === String(id));
  if (!co) throw new Error('Consegna non trovata.');
  return {
    data: testoData_(co.data), fascia: co.fascia_oraria || '',
    luogoId: String(co.luogo_id || ''), referente: co.referente || '',
    telefono: co.telefono || '', note: co.note || ''
  };
}

/** (Admin) Modifica i dati di una consegna. */
function adminModificaConsegna(token, id, d) {
  checkToken_(token);
  const co = leggiTabellaSafe_(SHEETS.CONSEGNE).find(x => String(x.id) === String(id));
  if (!co) throw new Error('Consegna non trovata.');
  if (d.data !== undefined) aggiornaCella(SHEETS.CONSEGNE, co._riga, 'data', String(d.data).trim());
  if (d.fascia !== undefined) aggiornaCella(SHEETS.CONSEGNE, co._riga, 'fascia_oraria', String(d.fascia).trim());
  if (d.luogoId !== undefined) aggiornaCella(SHEETS.CONSEGNE, co._riga, 'luogo_id', String(d.luogoId));
  if (d.referente !== undefined) aggiornaCella(SHEETS.CONSEGNE, co._riga, 'referente', String(d.referente).trim());
  if (d.telefono !== undefined) aggiornaCella(SHEETS.CONSEGNE, co._riga, 'telefono', String(d.telefono).trim());
  logAdmin_('consegna_modificata', String(id));
  return { ok: true };
}
