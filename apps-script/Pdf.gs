/**
 * Pdf.gs — PDF a MATRICE (verticale, A4) per la consegna.
 * Una riga per tessera, una colonna per ogni prodotto della raccolta, la quantità
 * nella cella corrispondente, il totale € a fine riga e una casella "Saldato" da
 * spuntare a mano durante la consegna. Il logo del comitato è in filigrana.
 * Vale sia per lo stato provvisorio (importi indicativi) sia per il definitivo.
 */

/** Icona del GAS (le quattro mani), PNG 96 px incorporato: intestazione dei PDF. */
var ICONA_GAS_ = 'data:image/png;base64,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';

var LOGO_URL_ = 'https://www.isticcadeddu.com/test/wp-content/uploads/cropped-isticcadeddu-logo-small.png';

function escHtml_(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/** Logo come data URI (scaricato una volta e messo in cache). '' se non disponibile. */
function logoDataUri_(){
  const props = PropertiesService.getScriptProperties();
  const cached = props.getProperty('LOGO_B64');
  if (cached) return cached;
  const url = props.getProperty('LOGO_URL') || LOGO_URL_;
  try{
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions:true, followRedirects:true });
    if (resp.getResponseCode() === 200){
      const uri = 'data:image/png;base64,' + Utilities.base64Encode(resp.getBlob().getBytes());
      props.setProperty('LOGO_B64', uri);
      return uri;
    }
  }catch(e){}
  return '';
}
/** Svuota la cache del logo (se cambia l'immagine). */
function svuotaLogo(){ PropertiesService.getScriptProperties().deleteProperty('LOGO_B64'); return 'OK'; }

/** Dati a matrice: prodotti (colonne) e righe per socio con quantità e totale. */
function dettaglioMatrice_(cicloId){
  const d = datiCiclo_(cicloId);
  if (!d) return null;
  const prodotti = prodottiRaccolta_(d.ciclo).map(p => ({ id:String(p.id), nome:p.nome, emoji:p.emoji||'' }));
  const prodById = {}; leggiTabella(SHEETS.PRODOTTI).forEach(p => prodById[String(p.id)] = p);
  const opz = {}; leggiTabella(SHEETS.OPZIONI).forEach(o => opz[String(o.id)] = o);
  const ordini = leggiTabella(SHEETS.ORDINI).filter(o => String(o.raccolta_id) === String(cicloId) && String(o.stato) === 'valido');
  const byOrd = {}; leggiTabella(SHEETS.RIGHE).forEach(r => { (byOrd[String(r.ordine_id)] = byOrd[String(r.ordine_id)] || []).push(r); });

  const rows = ordini.map(o => {
    const q = {}; let tot = 0;
    (byOrd[String(o.id)] || []).forEach(r => {
      const qta = num(r.quantita); if (qta <= 0) return;
      const pid = String(r.prodotto_id);
      const prod = prodById[pid]; if (!prod) return;
      if (String(prod.fornitore_id) !== String(d.ciclo.fornitore_id)) return; // ignora righe di altri fornitori
      q[pid] = (q[pid] || 0) + qta;
      const op = r.opzione_id ? opz[String(r.opzione_id)] : null;
      tot += prezzoRiga_(prod, op, qta, num(r.peso_confermato));
    });
    return { tessera: tessKey_(o.numero_tessera), nominativo: o.nominativo_inserito || '', q: q, totale: tot };
  }).sort((a,b) => a.tessera.localeCompare(b.tessera, undefined, {numeric:true}));

  return { fornitore: d.fornitore, ciclo: d.ciclo, prodotti: prodotti, rows: rows };
}

function qcell_(v){ if (!v) return ''; return (Math.round(v*100)/100).toString().replace('.', ','); }

/** HTML a matrice, verticale (A4), con filigrana logo. */
function htmlMatrice_(cicloId, definitivo){
  const m = dettaglioMatrice_(cicloId);
  if (!m) return '<p>Raccolta non trovata.</p>';
  const oggi = Utilities.formatDate(new Date(), 'Europe/Rome', 'dd-MM-yyyy HH:mm');
  const logo = logoDataUri_();

  let body = '';
  m.rows.forEach(r => {
    let tds = '';
    m.prodotti.forEach(p => { tds += '<td class="q">' + qcell_(r.q[p.id]) + '</td>'; });
    body += '<tr><td class="t">' + escHtml_(r.tessera) + '</td><td class="n">' + escHtml_(r.nominativo) + '</td>' +
            tds + '<td class="tot">' + fmtPrezzo_(r.totale) + '</td><td class="pay"></td></tr>';
  });
  if (!m.rows.length) body = '<tr><td colspan="' + (m.prodotti.length + 4) + '">Nessun ordine valido.</td></tr>';

  let thProd = '';
  m.prodotti.forEach(p => { thProd += '<th class="pcol"><div class="rot">' + escHtml_(p.nome) + '</div></th>'; });

  const titolo = definitivo ? 'Ordine definitivo' : 'Stato provvisorio';

  return (
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
  '@page{ size:A4 portrait; margin:10mm 8mm; }' +
  'body{ font-family:Arial,Helvetica,sans-serif; color:#1b1b1b; margin:0; }' +
  '.wm{ position:fixed; top:50%; left:50%; width:75%; transform:translate(-50%,-50%); opacity:.06; z-index:0; }' +
  '.hd{ position:relative; z-index:1; margin:2px 0 6px; }' +
  '.hd h1{ font-size:15px; color:#2E7D32; margin:0; display:inline; }' +
  '.hd .sub{ color:#555; font-size:10px; margin-left:8px; }' +
  '.hd .tag{ float:right; font-size:9px; border:1px solid #cfd; padding:1px 6px; border-radius:8px; background:#eef4ea; color:#2E7D32; }' +
  'table{ position:relative; z-index:1; border-collapse:collapse; width:100%; font-size:8.5px; }' +
  'th,td{ border:1px solid #cfcabb; padding:2px 3px; text-align:center; }' +
  'th{ background:#eef2e7; color:#2E7D32; font-weight:600; }' +
  'th.pcol{ height:96px; vertical-align:bottom; min-width:16px; padding:3px 2px; }' +
  // nome del prodotto ruotato: se è troppo lungo va a capo (su più righe affiancate) invece di allungare l'intestazione
  '.rot{ writing-mode:vertical-rl; transform:rotate(180deg); white-space:normal; max-height:90px; line-height:1.1; overflow-wrap:break-word; word-break:break-word; margin:0 auto; font-weight:600; text-align:left; }' +
  'td.t{ font-weight:700; text-align:left; white-space:nowrap; } td.n{ text-align:left; white-space:nowrap; max-width:110px; overflow:hidden; }' +
  'td.q{ font-weight:600; } td.tot{ font-weight:700; white-space:nowrap; text-align:right; } ' +
  'td.pay{ width:26px; } .tf td{ background:#f1f8e9; font-weight:700; }' +
  '.note{ position:relative; z-index:1; color:#666; font-size:8px; margin-top:4px; }' +
  '</style></head><body>' +
  (logo ? '<img class="wm" src="' + logo + '">' : '') +
  '<div class="hd"><span class="tag">' + (definitivo ? 'DEFINITIVO' : 'PROVVISORIO') + '</span>' +
  '<img src="' + ICONA_GAS_ + '" style="height:20px;width:20px;vertical-align:-4px;margin-right:6px">' +
  '<h1>' + escHtml_(titolo + ' – ' + m.fornitore.nome) + '</h1>' +
  '<span class="sub">agg. ' + oggi + ' · ' + m.rows.length + ' soci' +
  (m.ciclo.chiusura ? (' · chiusura ' + testoData_(m.ciclo.chiusura)) : '') + '</span></div>' +
  '<table><thead><tr><th>Tess.</th><th>Nominativo</th>' + thProd + '<th>Totale €</th><th>Saldato</th></tr></thead>' +
  '<tbody>' + body + '</tbody></table>' +
  '<div class="note">Quantità per prodotto; importi ' + (definitivo ? 'definitivi' : 'indicativi') +
  '. Pagamento diretto al fornitore alla consegna: spunta "Saldato" quando l\'ordine è pagato.</div>' +
  '</body></html>'
  );
}

function pdfDaHtml_(html, prefisso, fornitoreNome){
  const pdf = Utilities.newBlob(html, MimeType.HTML, 'stato.html').getAs(MimeType.PDF);
  const nomeF = String(fornitoreNome || 'ordini').replace(/[^\w]+/g, '_');
  const data = Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyyMMdd_HHmm');
  return { filename: prefisso + '_' + nomeF + '_' + data + '.pdf', base64: Utilities.base64Encode(pdf.getBytes()) };
}

/** PDF stato provvisorio (matrice). */
function pdfStatoProvvisorio(cicloId){
  const d = datiCiclo_(cicloId);
  return pdfDaHtml_(htmlMatrice_(cicloId, false), 'stato_provvisorio', d && d.fornitore.nome);
}
/** PDF stato definitivo (matrice). */
function pdfStatoDefinitivo(cicloId){
  const d = datiCiclo_(cicloId);
  return pdfDaHtml_(htmlMatrice_(cicloId, true), 'stato_definitivo', d && d.fornitore.nome);
}
