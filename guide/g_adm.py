from build_guide import *
SIDE=['Da fare','Raccolte','Consegne','Soci','Fornitori','Categorie','Statistiche','Amministratori','Segnalazioni','Profilo','Aiuto']
def side(on,main): return '<div class="side"><div class="sn"><div style="display:flex;align-items:center;gap:6px;padding:4px 6px 10px"><span class="mk"></span><b style="font-family:Georgia,serif;color:var(--green-d);font-size:12px">GAS Isticcadeddu</b></div>'+''.join(f'<div class="{"on" if s==on else ""}">{s}</div>' for s in SIDE)+'</div><div class="mn">'+main+'</div></div>'
dafare=side('Da fare','''<div class="h">Da fare</div>
<div class="card warn"><b>Data di chiusura non leggibile</b><div class="sub" style="color:#5E3908">"quando finisce il formaggio" · correggi la data (es. 10-10-2026 20:00)</div></div>
<div class="card"><div class="row"><b>Ordini da verificare</b><span class="badge warn">1</span></div><div class="row" style="margin-top:4px"><span>0147 · Paolo Bianchi<br><span class="sub">Caseificio La Collina · secondo ordine</span></span><span><span class="badge full">Conferma</span> <span class="badge warn">Annulla</span></span></div></div>
<div class="card"><div class="row"><b>Segnalazioni nuove</b><span class="badge warn">1</span></div><div class="sub">La pagina non si carica o si blocca <span class="badge warn">tecnica</span> · Lucia Neri</div></div>
<div class="card"><b>Consegne dei prossimi 7 giorni</b><div class="sub">12-10-2026 · dalle 18:00 · Piazza del mercato — La Collina, Orto del Sole</div></div>''')
racc=top('GAS Isticcadeddu','Amministrazione')+'''<div class="body">
<div class="sub" style="font-weight:700;color:var(--green-d)">‹ Raccolte</div>
<div class="row"><div><div class="h" style="margin:0">Caseificio La Collina</div><span class="badge">Aperta</span> <span class="sub">chiusura 10-10-2026 20:00</span></div><span class="badge">Apri form</span></div>
<div class="btns" style="margin:6px 0"><div class="card" style="margin:0"><b>8</b><br><span class="sub">ordini</span></div><div class="card warn" style="margin:0"><b>1</b><br><span class="sub">da verificare</span></div><div class="card" style="margin:0"><b>12-10</b><br><span class="sub">consegna</span></div></div>
<div class="card"><div class="grpt">Messaggi per WhatsApp<small>Il testo si apre pronto da copiare.</small></div><div class="btns2"><span class="btn sec">Apertura</span><span class="btn sec">Chiusura</span></div></div>
<div class="card"><div class="grpt">Foglio per la consegna (PDF)</div><div class="btns2"><span class="btn sec">Provvisorio</span><span class="btn sec">Definitivo</span></div></div>
<div class="card"><div class="grpt">Ordini dei soci</div><div class="btns2"><span class="btn sec">Gestisci ordini</span><span class="btn red">Chiudi gli ordini adesso</span></div></div>
<div class="det">Impostazioni: prodotti, chiusura, consegna ▸</div>
</div>'''+nav(NAV_ADM,'Raccolte')
socio=top('GAS Isticcadeddu','Amministrazione')+'''<div class="body">
<div class="h">Soci</div><div class="card"><b>Anna Rossi</b><div class="sub">tessera 0123 · 333 000 0000</div></div>
<div class="card mine"><div class="lab">Nominativo</div><div class="in">Anna Rossi</div><div class="lab">Telefono</div><div class="in">333 000 0000</div>
<div class="btns2"><span class="btn">Salva</span><span class="btn ghost">Annulla</span></div>
<div class="grpt" style="margin-top:8px">Link personale</div><div class="btns2"><span class="btn">Invia link</span><span class="btn sec">Rigenera link</span></div>
<div class="sub" style="margin-top:5px">https://is.gd/Ab3xYz</div><div class="btns2"><span class="btn sec">Apri WhatsApp</span><span class="btn sec">Copia messaggio</span></div></div>
</div>'''+nav(NAV_ADM,'Altro')
segn=side('Segnalazioni','''<div class="h">Segnalazioni</div>
<div class="card"><div class="row"><span><b>La pagina non si carica o si blocca</b> <span class="badge warn">tecnica</span> <span class="badge warn">Nuova</span></span><span class="sub">08-10-2026 18:40</span></div>
<div class="sub">Lucia Neri · tessera 0210 · 333 000 0000 · preferisce WhatsApp</div><p style="margin:5px 0">Dopo aver toccato "Ordina" la pagina resta bianca.</p>
<div class="det">Dati tecnici ▸</div><div class="row"><span class="sub">Stato</span><span class="in" style="margin:0;flex:1;margin-left:8px">In corso ▾</span></div>
<div class="in" style="color:#999">Note interne (cosa è stato fatto)</div><div class="row" style="justify-content:flex-start;gap:6px"><span class="btn" style="margin:0">Salva</span><span class="btn sec" style="margin:0">Scrivi su WhatsApp</span></div></div>''')
stat=side('Statistiche','''<div class="h">Statistiche</div><div class="btns"><div class="card" style="margin:0"><span class="sub">Volume scambiato</span><br><b>4.250,00 €</b></div><div class="card" style="margin:0"><span class="sub">Ordini</span><br><b>312</b></div><div class="card" style="margin:0"><span class="sub">Soci ordinanti</span><br><b>85</b></div></div>
<table style="margin-top:8px"><tr><th>Fornitore</th><th>Ordini</th><th>Volume</th></tr><tr><td>Orto del Sole</td><td>140</td><td>1.820,00 €</td></tr><tr><td>Caseificio La Collina</td><td>96</td><td>1.530,00 €</td></tr><tr><td>Frantoio Monte Verde</td><td>76</td><td>900,00 €</td></tr></table>''')
body=f'''
<p class="lead">Il pannello degli amministratori serve a organizzare il Gruppo d'Acquisto: raccolte, consegne, soci, fornitori e le segnalazioni. Funziona dal telefono e dal computer.</p>

<h2>Le parole da conoscere</h2>
<ul><li><b>Socio:</b> chi ha la tessera. Anche fornitori e amministratori sono soci.</li>
<li><b>Fornitore:</b> un socio che vende; ha il suo listino e il portale del fornitore.</li>
<li><b>Amministratore:</b> un socio che gestisce il pannello.</li>
<li><b>Raccolta:</b> un giro di ordini per un fornitore, con una data di chiusura.</li>
<li><b>Consegna:</b> giorno e luogo del ritiro; può riunire più raccolte.</li>
<li><b>Categorie:</b> Formaggi, Frutta, Verdura… uguali per tutti i fornitori.</li></ul>

<h2>Come si entra</h2>
<p>Ogni persona ha <b>un solo link personale</b>, legato alla sua tessera. Per un amministratore il link apre il pannello; dal <b>Profilo</b> passa alla sua pagina di socio e, se è anche fornitore, al portale del fornitore. Ogni azione nel pannello viene registrata con il suo nome.</p>
<p>Sul computer il menu è a sinistra; sul telefono c'è una barra in basso con <b>Da fare</b>, <b>Raccolte</b>, <b>Consegne</b>, <b>Profilo</b> e <b>Altro</b> (dove trovi le altre sezioni).</p>
<div class="box"><b>Regola valida ovunque:</b> tocca una riga per aprirla e modificarla, poi <span class="k">Salva</span>. Il pulsante <b>+</b> aggiunge qualcosa di nuovo. Prima di un'azione importante compare una finestra di conferma.</div>

<h2>Da fare</h2>
<p>È la prima pagina: raccoglie tutto ciò che aspetta qualcuno.</p>
<ul><li><b>Ordini da verificare</b>, con <span class="k">Conferma</span> e <span class="k">Annulla</span> direttamente lì;</li>
<li><b>Segnalazioni nuove</b> arrivate dai soci;</li>
<li><b>Raccolte che chiudono entro 24 ore</b>, <b>pesi da confermare</b>, <b>raccolte chiuse senza consegna</b>;</li>
<li><b>Avvisi sulla chiusura automatica</b>: se non è attiva o se una data di chiusura non si riesce a leggere;</li>
<li>le <b>consegne dei prossimi 7 giorni</b>.</li></ul>
{browser(dafare,'La pagina "Da fare" sul computer (dati inventati).')}

<h2>Raccolte</h2>
<h3>Aprire una raccolta</h3>
<div class="step"><div class="n">1</div><div>In <b>Raccolte</b> tocca <b>+</b> e scegli il fornitore.</div></div>
<div class="step"><div class="n">2</div><div>Spunta i <b>prodotti</b> da mettere in vendita (compaiono solo quelli disponibili).</div></div>
<div class="step"><div class="n">3</div><div>Scrivi la <b>data di chiusura</b>, per esempio <i>10-10-2026 20:00</i>, e se serve il <b>numero massimo di ordini</b>.</div></div>
<div class="step"><div class="n">4</div><div>Salva, apri la raccolta e prepara il <b>messaggio di apertura</b>.</div></div>
<h3>Dentro una raccolta</h3>
<p>La raccolta si apre in una schermata propria, con <b>‹ Raccolte</b> per tornare indietro. In alto i numeri (ordini, da verificare, consegna) e il pulsante <span class="k">Apri form</span>, che mostra il modulo come lo vedono i soci. Sotto, i blocchi:</p>
<ul><li><b>Messaggi per WhatsApp:</b> <span class="k">Apertura</span> e <span class="k">Chiusura</span> preparano il testo; tocca <span class="k">Copia il messaggio</span> e incollalo nella Community. L'app non scrive da sola nei gruppi.</li>
<li><b>Foglio per la consegna (PDF):</b> una riga per ogni tessera, i prodotti, l'importo e la colonna "Saldato" da spuntare a penna. Il <i>provvisorio</i> si usa mentre si raccolgono gli ordini, il <i>definitivo</i> dopo la conferma dei pesi. Il foglio non mostra totali complessivi, perché è condiviso con tutti.</li>
<li><b>Ordini dei soci:</b> <span class="k">Gestisci ordini</span> per correggere quantità o annullare, e <span class="k">Chiudi gli ordini adesso</span> (o "Riapri").</li>
<li><b>Impostazioni:</b> prodotti, data di chiusura, massimo ordini, avvisi e consegna.</li></ul>
{phone(racc,'Il dettaglio di una raccolta sul telefono.')}
<div class="box">Le raccolte <b>si chiudono da sole</b> alla data di chiusura o al numero massimo di ordini: ogni 15 minuti e comunque appena qualcuno apre il form o il pannello. Se in "Da fare" compare un avviso sulla chiusura, avvisa chi cura la parte tecnica.</div>
<h3>Ordini da verificare</h3>
<p>Un ordine va in verifica quando la tessera non è attiva o scaduta, oppure quando lo stesso socio ha mandato due ordini senza il link personale (con il link personale, invece, il nuovo ordine sostituisce il vecchio). Telefona al socio, poi <span class="k">Conferma</span> l'ordine giusto e <span class="k">Annulla</span> l'altro. Lo può fare anche il fornitore dal suo portale.</p>

<h2>Consegne</h2>
<p>Con <b>+</b> crei una consegna: data, orario, luogo e chi la segue. Poi, nelle impostazioni di ogni raccolta, scegli la consegna. <span class="k">Genera avviso</span> prepara il messaggio di ritiro con l'elenco dei fornitori.</p>

<h2>Soci</h2>
<ul><li>Tocca un socio per cambiare tessera, nome, telefono o per segnarlo come <b>non attivo</b>.</li>
<li><b>Link personale:</b> <span class="k">Invia link</span> apre WhatsApp sulla chat del socio con il messaggio già scritto; <span class="k">Rigenera link</span> crea un link nuovo e disattiva il vecchio, per tutti i profili della persona.</li>
<li>In <b>Import/Export</b> carichi l'elenco dei soci da un file (Tessera, Nominativo, Telefono): prima di confermare vedi cosa cambia. I soci assenti dal file diventano non attivi. C'è anche <span class="k">Crea i link mancanti</span>, per dare il link a chi non l'ha ancora.</li></ul>
{phone(socio,'La scheda di un socio con il link personale.')}
<div class="box warn">Quando un socio viene <b>disattivato</b>, decadono in automatico i suoi ruoli di fornitore e amministratore. Se viene riattivato, i ruoli vanno riassegnati. Non puoi disattivare la tua tessera né l'ultimo amministratore.</div>

<h2>Fornitori e categorie</h2>
<p>Ogni fornitore è un socio: per aggiungerlo tocca <b>+</b> e indica per prima cosa la <b>tessera del socio</b>, poi i dati dell'azienda. Il fornitore entra nel portale con il suo link personale di socio. Toccando un fornitore aggiorni i suoi dati, lo attivi o disattivi, e gestisci il listino per suo conto. Le <b>categorie</b> sono comuni a tutti i fornitori: qui le aggiungi e le rinomini.</p>

<h2>Statistiche</h2>
<p>Scegli un periodo (o nessuno, per vedere tutto) e tocca <span class="k">Calcola</span>: volume scambiato, ordini, soci ordinanti e il dettaglio per fornitore, prodotto, socio e consegna. Sono numeri utili anche per presentare il GAS a nuovi fornitori.</p>
{browser(stat,'Le statistiche (numeri inventati).')}

<h2>Amministratori</h2>
<ul><li>Per aggiungerne uno tocca <b>+</b> e scrivi la <b>tessera del socio</b>: userà il suo link personale, non serve un link nuovo.</li>
<li>Toccando un amministratore puoi <span class="k">Invia link</span>, <span class="k">Disattiva</span> o <span class="k">Rimuovi amministratore</span> (resta socio).</li>
<li>Il <b>Registro azioni</b> mostra chi ha fatto cosa e quando.</li></ul>

<h2>Segnalazioni</h2>
<p>Le segnalazioni dei soci arrivano a <b>tutti gli amministratori</b>: le nuove compaiono in "Da fare" e nella sezione <b>Segnalazioni</b>. Quelle segnate come <b>tecniche</b> le segue il referente tecnico; per le altre contatta il socio. Ogni segnalazione ha i <b>dati tecnici</b> raccolti dall'app (pagina, telefono usato, ultimo errore), uno <b>stato</b> (nuova, in corso, risolta) e le <b>note interne</b>. "Mostra anche le risolte" fa vedere lo storico.</p>
{browser(segn,'Una segnalazione da gestire.')}

<h2>Profilo e Aiuto</h2>
<p>Nel <b>Profilo</b> vedi la tua tessera, cambi telefono ed email e passi agli altri tuoi profili. In <b>Aiuto</b> trovi le domande frequenti (anche quelle per gli amministratori), i contatti e le guide dei tuoi profili.</p>

<h2>Per chi cura la parte tecnica</h2>
<ul><li>I dati sono in un <b>foglio Google</b>, il programma in <b>Apps Script</b> (proprietà <code>SPREADSHEET_ID</code>). Le domande frequenti stanno nella scheda <b>Aiuto</b>, i referenti nella scheda <b>Referenti</b>, le segnalazioni nella scheda <b>Segnalazioni</b>.</li>
<li>Per pubblicare una modifica: <b>Gestisci deployment › matita › Nuova versione</b>. Mai "Nuovo deployment", altrimenti cambiano tutti i link.</li>
<li>Da eseguire una volta dall'editor, e di nuovo <b>dopo ogni cambio di autorizzazioni</b>: <code>installaTriggerChiusura</code> e <code>installaTriggerBackup</code>. Se una raccolta non si chiude, esegui <code>diagnosiChiusura</code> e leggi il log di esecuzione.</li>
<li>Backup automatici ogni 6 ore nella cartella Drive "GAS Backup" (resta l'ultima settimana).</li>
<li>Guide PDF: caricale su Drive e metti l'ID di ciascun file nelle proprietà <code>GUIDA_SOCI_ID</code>, <code>GUIDA_FORNITORI_ID</code>, <code>GUIDA_AMMINISTRATORI_ID</code>. Ognuno scarica solo le guide dei propri profili.</li>
<li><code>ADMIN_TOKEN</code> è l'accesso di emergenza. <code>ACCORCIA_LINK_PERSONALI</code> = NO lascia lunghi i link personali. <code>FAVICON_URL</code> è l'icona della scheda del browser.</li></ul>
'''
open('guida-admin.html','w',encoding='utf-8').write(page('Gestire il Gruppo d\'Acquisto','Guida per gli amministratori',body))
