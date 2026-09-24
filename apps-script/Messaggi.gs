/**
 * Messaggi.gs — genera i testi da incollare nel gruppo WhatsApp.
 * Stile "essenziale": poche emoji. I blocchi standard vengono dalla scheda TemplateMessaggi.
 */

function fmtPrezzo_(n) {
  return (Math.round(num(n) * 100) / 100).toFixed(2).replace('.', ',');
}

function templateTesto_(chiave) {
  const t = leggiTabella(SHEETS.TEMPLATE).find(x => String(x.chiave) === chiave && isSi(x.attivo));
  return t ? String(t.testo) : '';
}

/** Importo di una riga, considerando opzione e (per i prodotti a peso variabile) il peso confermato. */
function prezzoRiga_(prodotto, opzione, quantita, pesoConfermato) {
  const base = num(prodotto.prezzo);
  // prodotto a peso variabile con peso confermato dal fornitore: importo = peso × prezzo/kg
  if (isSi(prodotto.peso_variabile) && pesoConfermato && num(pesoConfermato) > 0) {
    let pkg = base;
    if (opzione && opzione.tipo === 'variante' && num(opzione.prezzo) > 0) pkg = num(opzione.prezzo);
    return num(pesoConfermato) * pkg;
  }
  if (opzione) {
    if (opzione.tipo === 'variante' && num(opzione.prezzo) > 0) return quantita * num(opzione.prezzo);
    if (opzione.tipo === 'formato') return quantita * num(opzione.prezzo);
    if (opzione.tipo === 'supplemento') return quantita * base + num(opzione.prezzo);
  }
  return quantita * base;
}

/** Raccoglie righe valide di un ciclo con i relativi prodotti/opzioni. */
function righeValideCiclo_(cicloId) {
  const ordini = leggiTabella(SHEETS.ORDINI)
    .filter(o => String(o.raccolta_id) === String(cicloId) && String(o.stato) === 'valido');
  const idOrdini = {}; ordini.forEach(o => idOrdini[String(o.id)] = o);
  const prodotti = {}; leggiTabella(SHEETS.PRODOTTI).forEach(p => prodotti[String(p.id)] = p);
  const opzioni = {}; leggiTabella(SHEETS.OPZIONI).forEach(o => opzioni[String(o.id)] = o);
  const righe = leggiTabella(SHEETS.RIGHE).filter(r => idOrdini[String(r.ordine_id)]);
  return righe.map(r => ({
    prodotto: prodotti[String(r.prodotto_id)] || { nome: '?', prezzo: 0, unita: '' },
    opzione: r.opzione_id ? opzioni[String(r.opzione_id)] : null,
    quantita: num(r.quantita)
  }));
}

function datiCiclo_(cicloId) {
  const ciclo = leggiTabella(SHEETS.RACCOLTE).find(c => String(c.id) === String(cicloId));
  if (!ciclo) return null;
  const fornitore = leggiTabella(SHEETS.FORNITORI).find(f => String(f.id) === String(ciclo.fornitore_id)) || {};
  const luogo = leggiTabella(SHEETS.LUOGHI).find(l => String(l.id) === String(ciclo.luogo_id)) || {};
  return { ciclo, fornitore, luogo };
}

/** MESSAGGIO: apertura ordini. */
function msgApertura(cicloId) {
  const d = datiCiclo_(cicloId); if (!d) return 'Ciclo non trovato.';
  const { ciclo, fornitore, luogo } = d;
  const categorie = leggiTabella(SHEETS.CATEGORIE)
    .sort((a, b) => num(a.ordine) - num(b.ordine));  // categorie globali
  const prodotti = prodottiRaccolta_(ciclo);
  const opzioni = leggiTabella(SHEETS.OPZIONI);

  let out = (fornitore.emoji ? fornitore.emoji + ' ' : '') + '*RACCOLTA ORDINI APERTA – ' + String(fornitore.nome).toUpperCase() + '*\n';
  const sub = [fornitore.referente, fornitore.zona].filter(Boolean).join(' · ');
  if (sub) out += sub + '\n';
  if (fornitore.descrizione) out += fornitore.descrizione + '\n';

  function stampaProdotti(lista) {
    lista.forEach(p => {
      out += '- ' + p.nome + ' — ' + fmtPrezzo_(p.prezzo) + ' ' + (p.unita || '') + (isSi(p.peso_variabile) ? ' *' : '') + '\n';
      String(p.note || '').split('\n').filter(Boolean).forEach(n => out += '    ' + n + '\n');
      opzioni.filter(o => String(o.prodotto_id) === String(p.id)).forEach(o => {
        if (o.tipo === 'formato') out += '    formato: ' + o.nome + ' — ' + fmtPrezzo_(o.prezzo) + ' ' + (o.unita || '') + '\n';
        else if (o.tipo === 'supplemento') out += '    supplemento: ' + o.nome + ' — +' + fmtPrezzo_(o.prezzo) + ' €' + (o.note ? (' · ' + o.note) : '') + '\n';
        else if (o.tipo === 'variante' && num(o.prezzo) > 0) out += '    ' + o.nome + ' — ' + fmtPrezzo_(o.prezzo) + ' ' + (o.unita || '') + '\n';
      });
      if (p.min_consigliato !== '' && num(p.min_consigliato) > 0) out += '    minimo consigliato ' + num(p.min_consigliato) + ' ' + (p.unita || '') + '\n';
    });
  }

  categorie.forEach(c => {
    const lista = prodotti.filter(p => String(p.categoria_id) === String(c.id));
    if (!lista.length) return;
    out += '\n*' + String(c.nome).toUpperCase() + '*\n';
    stampaProdotti(lista);
  });
  const fuori = prodotti.filter(p => !String(p.categoria_id).trim());
  if (fuori.length) { out += '\n'; stampaProdotti(fuori); }

  if (prodotti.some(p => isSi(p.peso_variabile))) out += '\n* importo indicativo, confermato prima della consegna\n';

  if (ciclo.avvisi) {
    out += '\n⚠️ *IMPORTANTE*\n';
    String(ciclo.avvisi).split(';').map(s => s.trim()).filter(Boolean).forEach(a => out += '- ' + a + '\n');
  }

  const cons = consegnaDiRaccolta_(ciclo);
  out += '\n';
  if (cons.data) {
    out += 'Consegna: ' + cons.data + (cons.fascia ? (', ' + cons.fascia) : '') +
           (cons.luogoNome ? (' – ' + cons.luogoNome) : '') + '\n';
  } else {
    out += 'Consegna: comunicata dopo la chiusura ordini\n';
  }
  out += 'Pagamento diretto al fornitore alla consegna\n';
  if (cons.referente) out += 'Info: ' + cons.referente + (cons.telefono ? (' – ' + cons.telefono) : '') + '\n';

  out += '\n👉 Ordina' + (ciclo.chiusura ? (' entro ' + testoData_(ciclo.chiusura)) : '') + ': ' + linkForm(cicloId);
  return out;
}

/** MESSAGGIO: chiusura ordini. */
function msgChiusura(cicloId) {
  const d = datiCiclo_(cicloId); if (!d) return 'Ciclo non trovato.';
  const ordini = leggiTabella(SHEETS.ORDINI)
    .filter(o => String(o.raccolta_id) === String(cicloId) && String(o.stato) === 'valido');
  const nSoci = new Set(ordini.map(o => tessKey_(o.numero_tessera))).size;
  return '🔒 *RACCOLTA ORDINI CHIUSA – ' + d.fornitore.nome + '*\n' +
         'Grazie a tutti! Hanno ordinato ' + nSoci + ' soci.\n' +
         'Il riepilogo definitivo arriva a breve.';
}

/** MESSAGGIO: stato provvisorio (totali per prodotto). */
function msgStatoProvvisorio(cicloId) {
  const d = datiCiclo_(cicloId); if (!d) return 'Ciclo non trovato.';
  const righe = righeValideCiclo_(cicloId);
  const perProdotto = {};
  let totEuro = 0;
  righe.forEach(r => {
    const key = r.prodotto.nome + '||' + (r.prodotto.unita || '');
    perProdotto[key] = (perProdotto[key] || 0) + r.quantita;
    totEuro += prezzoRiga_(r.prodotto, r.opzione, r.quantita);
  });
  let out = '⏳ *STATO PROVVISORIO – ' + d.fornitore.nome + '* (agg. ' +
            Utilities.formatDate(new Date(), 'Europe/Rome', 'dd-MM-yyyy HH:mm') + ')\n';
  Object.keys(perProdotto).forEach(k => {
    const [nome, unita] = k.split('||');
    out += nome + ': ' + (Math.round(perProdotto[k] * 100) / 100) + (unita ? (' ' + unita) : '') + '\n';
  });
  out += 'Totale provvisorio: ' + fmtPrezzo_(totEuro) + ' € (importi variabili indicativi)\n';
  if (d.ciclo.chiusura) out += 'Ordina entro ' + testoData_(d.ciclo.chiusura) + ': ' + linkForm(cicloId);
  return out;
}
