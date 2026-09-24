/**
 * Short.gs — accorcia gli URL lunghi con servizi gratuiti, sicuri e a REDIRECT DIRETTO.
 *
 * Servizi usati: is.gd (principale) e spoo.me (riserva). Entrambi etici, senza
 * pubblicità e senza pagina intermedia. TinyURL solo se richiesto esplicitamente.
 * NON si usa CleanURI: è stato rimosso perché reindirizzava a domini di spam.
 *
 * Proprietà script:
 *   SHORTENER      = auto (default: isgd + spoome) | isgd | spoome | tinyurl | off
 *   TINYURL_TOKEN  = (opzionale) token API TinyURL, usato solo con SHORTENER=tinyurl
 */

function serviziShort_() {
  const props = PropertiesService.getScriptProperties();
  const modo = (props.getProperty('SHORTENER') || 'auto').toLowerCase();
  if (modo === 'off') return [];
  if (modo === 'isgd') return ['isgd', 'spoome'];
  if (modo === 'spoome') return ['spoome', 'isgd'];
  if (modo === 'tinyurl') {
    return props.getProperty('TINYURL_TOKEN')
      ? ['tinyurl_api', 'tinyurl', 'isgd', 'spoome']
      : ['tinyurl', 'isgd', 'spoome'];
  }
  return ['isgd', 'spoome']; // auto (default)
}

/** Chiama un singolo servizio. Ritorna {url, status, body}. url=null se fallisce. */
function chiamaProvider_(provider, urlLungo) {
  const props = PropertiesService.getScriptProperties();
  try {
    if (provider === 'spoome') {
      const resp = UrlFetchApp.fetch('https://spoo.me/', {
        method: 'post',
        payload: { url: urlLungo },
        headers: { 'Accept': 'application/json' },
        muteHttpExceptions: true
      });
      const code = resp.getResponseCode(), body = resp.getContentText();
      if (code >= 200 && code < 300) {
        const j = JSON.parse(body);
        if (j && j.short_url) return { url: j.short_url, status: code, body: body };
      }
      return { url: null, status: code, body: body };
    }
    if (provider === 'tinyurl_api') {
      const token = props.getProperty('TINYURL_TOKEN');
      if (!token) return { url: null, status: 0, body: 'token mancante' };
      const resp = UrlFetchApp.fetch('https://api.tinyurl.com/create', {
        method: 'post', contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + token },
        payload: JSON.stringify({ url: urlLungo }),
        muteHttpExceptions: true
      });
      const code = resp.getResponseCode(), body = resp.getContentText();
      if (code >= 200 && code < 300) {
        const j = JSON.parse(body);
        const t = j && j.data && j.data.tiny_url;
        if (t) return { url: t, status: code, body: body };
      }
      return { url: null, status: code, body: body };
    }
    // keyless GET (is.gd, tinyurl)
    const ep = (provider === 'isgd')
      ? 'https://is.gd/create.php?format=simple&url=' + encodeURIComponent(urlLungo)
      : 'https://tinyurl.com/api-create.php?url=' + encodeURIComponent(urlLungo);
    const resp = UrlFetchApp.fetch(ep, {
      muteHttpExceptions: true, followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GAS-GAS/1.0)' }
    });
    const code = resp.getResponseCode(), body = String(resp.getContentText()).trim();
    if (code === 200 && /^https?:\/\//i.test(body) && !/error/i.test(body)) {
      return { url: body, status: code, body: body };
    }
    return { url: null, status: code, body: body };
  } catch (e) {
    return { url: null, status: -1, body: String(e) };
  }
}

function accorcia_(urlLungo) {
  if (!urlLungo) return urlLungo;
  const servizi = serviziShort_();
  if (!servizi.length) return urlLungo;

  const props = PropertiesService.getScriptProperties();
  const firma = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, urlLungo)
  ).substring(0, 20);
  const chiaveCache = 'short_' + firma;
  const inCache = props.getProperty(chiaveCache);
  if (inCache) return inCache;

  for (let i = 0; i < servizi.length; i++) {
    const r = chiamaProvider_(servizi[i], urlLungo);
    if (r.url) { props.setProperty(chiaveCache, r.url); return r.url; }
  }
  return urlLungo; // fallback: link lungo
}

/** Svuota la cache dei link corti (usala dopo aver cambiato servizio o deployment). */
function svuotaCacheLink() {
  const props = PropertiesService.getScriptProperties();
  const tutte = props.getProperties();
  Object.keys(tutte).forEach(k => { if (k.indexOf('short_') === 0) props.deleteProperty(k); });
}

/** DIAGNOSTICA: eseguila dall'editor e apri "Esecuzioni" per leggere i Log. */
function testShortener() {
  const u = 'https://www.example.com/pagina-di-prova?ts=' + Date.now();
  Logger.log('URL di prova: ' + u);
  serviziShort_().forEach(s => {
    const r = chiamaProvider_(s, u);
    Logger.log('[' + s + '] status=' + r.status + '  url=' + (r.url || '(nessuno)') +
               '  risposta=' + String(r.body).substring(0, 200));
  });
  const finale = accorcia_(u);
  Logger.log(finale === u ? 'ESITO: nessun servizio ha funzionato (link invariato).' : 'ESITO OK: ' + finale);
  return finale;
}
