/**
 * WebApp.gs — punto d'ingresso della web app.
 * Rotte:
 *   ?form=CI01           -> form d'ordine per un ciclo (pubblico)
 *   ?form=CI01&socio=T   -> form precompilato con il link personale del socio
 *   ?socio=TOKEN         -> pagina personale del socio (anche con il token di un amministratore)
 *   ?admin=TOKEN         -> pannello amministratore (protetto da token)
 *   (nessun parametro)   -> pagina di cortesia
 *
 * Il token admin si imposta in: Impostazioni progetto > Proprietà script > ADMIN_TOKEN
 */

/**
 * Punto d'ingresso: costruisce la pagina e le applica la favicon.
 * Favicon: proprietà script FAVICON_URL (un'immagine PNG o ICO pubblicata online, https);
 * se manca si usa il logo del comitato (LOGO_URL oppure quello predefinito).
 */
function doGet(e) {
  return conFavicon_(pagina_(e));
}

function conFavicon_(out) {
  // le pagine possono essere mostrate dentro l'app installabile (GitHub Pages, vedi cartella docs/ del repository)
  try { if (out && out.setXFrameOptionsMode) out.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); } catch (err) {}
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('FAVICON_URL') || props.getProperty('LOGO_URL') || LOGO_URL_;
  if (url && out && out.setFaviconUrl) {
    try { out.setFaviconUrl(url); } catch (err) { /* indirizzo non valido: si tiene l'icona di Google */ }
  }
  return out;
}

function pagina_(e) {
  const p = (e && e.parameter) || {};

  // link personale unico (?u=TOKEN): apre il pannello per gli amministratori,
  // il portale per i fornitori, altrimenti la pagina del socio
  if (p.u) {
    let so = null;
    try { so = socioDaToken_(String(p.u)); } catch (err) {
      return HtmlService.createHtmlOutput(paginaSemplice_('Link non valido', err.message)).addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }
    if (so.isAdmin) p.admin = p.u; else if (so.isFornitore) p.fornitore = p.u; else p.socio = p.u;
  }

  if (p.form) {
    const t = HtmlService.createTemplateFromFile('Form');
    t.cicloId = String(p.form);
    t.socioToken = String(p.socio || '');
    return t.evaluate()
      .setTitle('Ordine GAS')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (p.socio) {
    try { socioDaToken_(String(p.socio)); }
    catch (err) { return HtmlService.createHtmlOutput(paginaSemplice_('Link non valido', err.message)).addMetaTag('viewport', 'width=device-width, initial-scale=1'); }
    const t = HtmlService.createTemplateFromFile('Socio');
    t.token = String(p.socio);
    return t.evaluate()
      .setTitle('I miei ordini – GAS')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (p.fornitore) {
    const t = HtmlService.createTemplateFromFile('Fornitore');
    t.token = String(p.fornitore);
    return t.evaluate()
      .setTitle('Portale Fornitore GAS')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (p.admin) {
    var ok = false; try { checkToken_(String(p.admin)); ok = true; } catch (e) { ok = false; }
    if (!ok) {
      return HtmlService.createHtmlOutput(paginaSemplice_('Accesso non autorizzato',
        'Questo link non è valido. Se sei un amministratore, controlla il token.'));
    }
    const t = HtmlService.createTemplateFromFile('Admin');
    t.token = String(p.admin);
    return t.evaluate()
      .setTitle('Admin GAS')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  return HtmlService.createHtmlOutput(paginaSemplice_('Gruppo di Acquisto Solidale',
    'Questa pagina si apre tramite i link agli ordini pubblicati nel gruppo.'));
}

/** Pagina informativa minimale, coerente con lo stile del form. */
function paginaSemplice_(titolo, testo) {
  return '<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' + include('Stile') +
    '<style>.box{max-width:460px;margin:0 auto;padding:60px 20px;text-align:center}.box p{color:var(--muted);font-size:1.05rem}</style>' +
    '</head><body><header class="topbar"><div class="brand"><div class="mark" role="img" aria-label="GAS Isticcadeddu"></div><div class="bt"><b>GAS Isticcadeddu</b></div></div></header>' +
    '<div class="box"><h1>' + titolo + '</h1><p>' + testo + '</p></div></body></html>';
}

/** URL base della web app. Preferisce la proprietà APP_URL (stabile), altrimenti l'URL corrente. */
function urlApp() {
  const fisso = PropertiesService.getScriptProperties().getProperty('APP_URL');
  if (fisso) return fisso;
  return ScriptApp.getService().getUrl();
}

/** Utility: memorizza l'URL /exec corrente come APP_URL (eseguila UNA volta dopo il primo deployment). */
function salvaUrlApp() {
  const url = ScriptApp.getService().getUrl(); // durante l'esecuzione dall'editor può essere /dev
  Logger.log('URL rilevato: ' + url);
  Logger.log('Se termina con /dev, NON usarlo: incolla a mano l\'URL /exec nella proprietà APP_URL.');
  return url;
}

/** Link al form di un ciclo (accorciato, se lo shortener è attivo). */
function linkForm(cicloId) {
  const lungo = urlLink_() + '?form=' + encodeURIComponent(cicloId);
  // il link breve di ogni raccolta è salvato nella colonna "link_breve" della scheda Raccolte
  try {
    const r = leggiTabella(SHEETS.RACCOLTE).find(x => String(x.id) === String(cicloId));
    if (r) {
      const salvato = String(r.link_breve || '').trim();
      if (salvato) return salvato;
      const breve = accorciaSenzaCache_(lungo);
      if (breve && breve !== lungo) { assicuraColonna_(SHEETS.RACCOLTE, 'link_breve'); aggiornaCella(SHEETS.RACCOLTE, r._riga, 'link_breve', breve); }
      return breve || lungo;
    }
  } catch (e) {}
  return accorcia_(lungo);
}

/** Inserisce il contenuto di un file HTML del progetto (usato per lo stile condiviso: <?!= include('Stile') ?>). */
function include(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

/**
 * Indirizzo da usare nei link che si mandano alle persone (link personali e link delle raccolte).
 * Se è impostata la proprietà LINK_BASE_URL (l'indirizzo dell'app su GitHub Pages) si usa quella,
 * così chi apre il link può installare l'app sul telefono; altrimenti l'indirizzo della web app.
 */
function urlLink_() {
  const b = String(PropertiesService.getScriptProperties().getProperty('LINK_BASE_URL') || '').trim();
  return b ? b.replace(/[?#].*$/, '') : urlApp();
}

/**
 * Da eseguire una volta dopo aver impostato (o cambiato) LINK_BASE_URL:
 * cancella i link brevi salvati, che puntano al vecchio indirizzo. Verranno ricreati al prossimo invio.
 * I link già consegnati continuano a funzionare, ma aprono la web app senza la possibilità di installarla.
 */
function azzeraLinkBrevi() {
  let n = 0;
  [SHEETS.SOCI, SHEETS.RACCOLTE].forEach(nome => {
    leggiTabella(nome).forEach(r => { if (String(r.link_breve || '').trim()) { aggiornaCella(nome, r._riga, 'link_breve', ''); n++; } });
  });
  log_('sistema', 'link_brevi_azzerati', String(n));
  Logger.log('Link brevi azzerati: ' + n);
  return n;
}
