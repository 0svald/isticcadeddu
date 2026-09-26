from build_guide import *
def side(on,main):
    voci=''.join(f'<div class="{"on" if s==on else ""}">{s}</div>' for s in ['Home','Notifiche'])
    for g,vv in GRUPPI_ADM: voci+=f'<div class="sg">{g}</div>'+''.join(f'<div class="{"on" if s==on else ""}">{s}</div>' for s in vv)
    return '<div class="side"><div class="sn"><div style="display:flex;align-items:center;gap:6px;padding:4px 6px 10px"><span class="mk"></span><b style="font-family:Georgia,serif;color:var(--green-d);font-size:12px">GAS Isticcadeddu</b></div>'+voci+'</div><div class="mn">'+main+'</div></div>'
notifiche=side('Notifiche','''<div class="h">Notifiche</div><div class="ng">Da fare</div>'''+nota('urg','IMPORTANTE','Data di chiusura non leggibile','"quando finisce il formaggio": correggi la data (es. 10-10-2026 20:00).','Apri raccolta')+nota('fare','DA FARE','1 ordine da verificare · Caseificio La Collina','0147 — Paolo Bianchi · secondo ordine','Apri raccolta')+nota('fare','DA FARE','1 segnalazione nuova','La pagina non si carica o si blocca (tecnica) · Lucia Neri','Apri le segnalazioni')+'''<div class="ng">Per sapere</div>'''+nota('','PROMEMORIA','Consegna del 12-10-2026 · dalle 18:00','Piazza del mercato · Caseificio La Collina, Orto del Sole','Vedi le consegne'))
home_adm=top('GAS Isticcadeddu','Amministrazione')+home('Paolo',GRUPPI_ADM,4,{'Segnalazioni':1})
storico=side('Raccolte','''<div class="sopra">ORDINI</div><div class="h">Raccolte</div>'''+riep('14 raccolte concluse','Le raccolte già consegnate, dalla più recente.')+'''<div class="seg"><span>In corso</span><span class="on">Storico</span></div>
<div class="row"><span class="lab">Fornitore</span><span class="in" style="margin:0;flex:1;margin-left:8px">— tutti i fornitori — ▾</span></div>
<div class="hg">SETTEMBRE 2026</div><div class="card"><b>Caseificio La Collina</b> <span class="badge grey">Consegnata</span><div class="sub">consegna 28-09-2026 · 8 ordini</div></div>
<div class="card"><b>Frantoio Monte Verde</b> <span class="badge off">non attivo</span> <span class="badge grey">Consegnata</span><div class="sub">consegna 21-09-2026 · 11 ordini</div></div>''')
racc=top('GAS Isticcadeddu','Amministrazione')+'''<div class="body">
<div class="sub" style="font-weight:700;color:var(--green-d)">‹ Raccolte</div>
<div class="row"><div><div class="h" style="margin:0">Caseificio La Collina</div><span class="badge">Aperta</span> <span class="sub">chiusura 10-10-2026 20:00</span></div><span class="badge">Apri form</span></div>
<div class="btns" style="margin:6px 0"><div class="card" style="margin:0"><b>8</b><br><span class="sub">ordini</span></div><div class="card warn" style="margin:0"><b>1</b><br><span class="sub">da verificare</span></div><div class="card" style="margin:0"><b>12-10</b><br><span class="sub">consegna</span></div></div>
<div class="card"><div class="grpt">Messaggi per WhatsApp<small>Il testo si apre pronto da copiare.</small></div><div class="btns2"><span class="btn sec">Apertura</span><span class="btn sec">Chiusura</span></div></div>
<div class="card"><div class="grpt">Foglio per la consegna (PDF)</div><div class="btns2"><span class="btn sec">Provvisorio</span><span class="btn sec">Definitivo</span></div></div>
<div class="card"><div class="grpt">Ordini dei soci</div><div class="btns2"><span class="btn sec">Gestisci ordini</span><span class="btn red">Chiudi gli ordini adesso</span></div></div>
<div class="det">Impostazioni: prodotti, chiusura, consegna ▸</div>
</div>'''+barra()
socio=top('GAS Isticcadeddu','Amministrazione')+'''<div class="body">
'''+testa('PERSONE','Soci')+riep('142 soci · 131 attivi','Tocca un socio per modificarlo o mandargli il suo link.')+'''<div class="card"><b>Anna Rossi</b><div class="sub">tessera 0123 · 333 000 0000</div></div>
<div class="card mine"><div class="lab">Nominativo</div><div class="in">Anna Rossi</div><div class="lab">Telefono</div><div class="in">333 000 0000</div>
<div class="btns2"><span class="btn">Salva</span><span class="btn ghost">Annulla</span></div>
<div class="grpt" style="margin-top:8px">Link personale</div><div class="btns2"><span class="btn">Invia link</span><span class="btn sec">Rigenera link</span></div>
<div class="sub" style="margin-top:5px">https://is.gd/Ab3xYz</div><div class="btns2"><span class="btn sec">Apri WhatsApp</span><span class="btn sec">Copia messaggio</span></div></div>
</div>'''+barra()
segn=side('Segnalazioni','''<div class="h">Segnalazioni</div>
<div class="card"><div class="row"><span><b>La pagina non si carica o si blocca</b> <span class="badge warn">tecnica</span> <span class="badge warn">Nuova</span></span><span class="sub">08-10-2026 18:40</span></div>
<div class="sub">Lucia Neri · tessera 0210 · 333 000 0000 · preferisce WhatsApp</div><p style="margin:5px 0">Dopo aver toccato "Ordina" la pagina resta bianca.</p>
<div class="det">Dati tecnici ▸</div><div class="row"><span class="sub">Stato</span><span class="in" style="margin:0;flex:1;margin-left:8px">In corso ▾</span></div>
<div class="in" style="color:#999">Note interne (cosa è stato fatto)</div><div class="row" style="justify-content:flex-start;gap:6px"><span class="btn" style="margin:0">Salva</span><span class="btn sec" style="margin:0">Scrivi su WhatsApp</span></div></div>''')
stat=side('Statistiche','''<div class="sopra">GESTIONE</div><div class="h">Statistiche</div>
<div class="row" style="justify-content:flex-start;gap:6px;margin:4px 0 8px"><span class="in" style="margin:0">Ultimi 12 mesi ▾</span><span class="in" style="margin:0">Tutti i fornitori ▾</span><span class="in" style="margin:0">Tutte le categorie ▾</span></div>
<div class="btns"><div class="card" style="margin:0"><span class="sub">Volume scambiato</span><br><b>27.210 €</b><div class="sub" style="color:var(--green-d)">▲ +11%</div></div><div class="card" style="margin:0"><span class="sub">Ordini</span><br><b>1.331</b><div class="sub" style="color:var(--green-d)">▲ +8%</div></div><div class="card" style="margin:0"><span class="sub">Prezzo medio di un ordine</span><br><b>20,44 €</b><div class="sub" style="color:var(--green-d)">▲ +3%</div></div></div>
<div class="btns2" style="margin-top:6px"><div class="card" style="margin:0"><b style="font-size:12px">Ordini</b><svg viewBox="0 0 220 60" style="width:100%;height:auto;display:block"><line x1="4" x2="194" y1="54" y2="54" stroke="#DDD5C1"/><path d="M4.0 23.2 L21.3 21.0 L38.5 16.3 L55.8 22.9 L73.1 24.2 L90.4 20.1 L107.6 17.3 L124.9 15.7 L142.2 15.1 L159.5 18.9 L176.7 23.9 L194.0 12.3" fill="none" stroke="#3A6B35" stroke-width="2"/><circle cx="194.0" cy="12.3" r="3.5" fill="#3A6B35"/></svg></div><div class="card" style="margin:0"><b style="font-size:12px">Soci che hanno ordinato</b><svg viewBox="0 0 220 60" style="width:100%;height:auto;display:block"><line x1="4" x2="194" y1="54" y2="54" stroke="#DDD5C1"/><path d="M4.0 24.5 L21.3 22.3 L38.5 16.6 L55.8 23.1 L73.1 24.5 L90.4 20.9 L107.6 18.0 L124.9 15.9 L142.2 14.4 L159.5 18.7 L176.7 23.8 L194.0 12.3" fill="none" stroke="#3A6B35" stroke-width="2"/><circle cx="194.0" cy="12.3" r="3.5" fill="#3A6B35"/></svg></div><div class="card" style="margin:0"><b style="font-size:12px">Fornitori attivi</b><svg viewBox="0 0 220 60" style="width:100%;height:auto;display:block"><line x1="4" x2="194" y1="54" y2="54" stroke="#DDD5C1"/><path d="M4.0 19.2 L21.3 19.2 L38.5 12.3 L55.8 19.2 L73.1 19.2 L90.4 19.2 L107.6 12.3 L124.9 12.3 L142.2 12.3 L159.5 19.2 L176.7 19.2 L194.0 12.3" fill="none" stroke="#3A6B35" stroke-width="2"/><circle cx="194.0" cy="12.3" r="3.5" fill="#3A6B35"/></svg></div><div class="card" style="margin:0"><b style="font-size:12px">Prezzo medio di un ordine</b><svg viewBox="0 0 220 60" style="width:100%;height:auto;display:block"><line x1="4" x2="194" y1="54" y2="54" stroke="#DDD5C1"/><path d="M4.0 14.0 L21.3 13.4 L38.5 13.8 L55.8 13.0 L73.1 12.6 L90.4 13.2 L107.6 13.6 L124.9 13.0 L142.2 12.4 L159.5 12.8 L176.7 13.2 L194.0 12.3" fill="none" stroke="#3A6B35" stroke-width="2"/><circle cx="194.0" cy="12.3" r="3.5" fill="#3A6B35"/></svg></div></div>
<div class="card"><b style="font-size:12px">Volume per categoria, mese per mese</b><div class="sub"><span style="color:#2a78d6">■</span> Verdura <span style="color:#eb6834">■</span> Formaggi <span style="color:#1baf7a">■</span> Frutta <span style="color:#eda100">■</span> Olio e conserve</div><div style="display:flex;align-items:flex-end;gap:14px;height:90px;padding:4px 8px;margin-top:6px;border-bottom:1px solid #DDD5C1"><div style="display:flex;flex-direction:column-reverse;width:14px;gap:1px"><div style="height:17px;background:#2a78d6"></div><div style="height:15px;background:#eb6834"></div><div style="height:11px;background:#1baf7a"></div><div style="height:9px;background:#eda100"></div></div><div style="display:flex;flex-direction:column-reverse;width:14px;gap:1px"><div style="height:18px;background:#2a78d6"></div><div style="height:16px;background:#eb6834"></div><div style="height:11px;background:#1baf7a"></div><div style="height:9px;background:#eda100"></div></div><div style="display:flex;flex-direction:column-reverse;width:14px;gap:1px"><div style="height:16px;background:#2a78d6"></div><div style="height:17px;background:#eb6834"></div><div style="height:12px;background:#1baf7a"></div><div style="height:15px;background:#eda100"></div></div><div style="display:flex;flex-direction:column-reverse;width:14px;gap:1px"><div style="height:17px;background:#2a78d6"></div><div style="height:14px;background:#eb6834"></div><div style="height:12px;background:#1baf7a"></div><div style="height:8px;background:#eda100"></div></div><div style="display:flex;flex-direction:column-reverse;width:14px;gap:1px"><div style="height:17px;background:#2a78d6"></div><div style="height:13px;background:#eb6834"></div><div style="height:11px;background:#1baf7a"></div><div style="height:7px;background:#eda100"></div></div><div style="display:flex;flex-direction:column-reverse;width:14px;gap:1px"><div style="height:20px;background:#2a78d6"></div><div style="height:16px;background:#eb6834"></div><div style="height:12px;background:#1baf7a"></div><div style="height:7px;background:#eda100"></div></div></div></div>''')
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
<p>Il pannello si apre sulla <b>Home</b>: in cima le <b>Notifiche</b>, poi le sezioni divise in gruppi: <b>Ordini</b> (Raccolte, Consegne), <b>Persone</b> (Soci, Fornitori, Amministratori), <b>Gestione</b> (Categorie, Statistiche, Segnalazioni) e <b>La mia tessera</b> (Profilo, Aiuto). Sul telefono si torna alla Home con il pulsante verde <span class="k">Home</span> in basso; sul computer lo stesso elenco è nel menu a sinistra.</p>
<p>In cima a ogni sezione c'è un <b>riquadro di riepilogo</b>: per esempio quante raccolte sono aperte, la prossima consegna, quanti soci sono attivi. Diventa arancione se c'è qualcosa da fare.</p>
{phone(home_adm,'La Home del pannello sul telefono.')}
<div class="box"><b>Regola valida ovunque:</b> tocca una riga per aprirla e modificarla, poi <span class="k">Salva</span>. Il pulsante <b>+</b> aggiunge qualcosa di nuovo. Prima di un'azione importante compare una finestra di conferma.</div>

<h2>Notifiche</h2>
<p>Raccolgono tutto ciò che aspetta qualcuno (prima si chiamavano "Da fare"). Sono divise in <b>Da fare</b> e <b>Per sapere</b>:</p>
<ul><li><b>Ordini da verificare</b>, con <span class="k">Conferma</span> e <span class="k">Annulla</span> direttamente lì;</li>
<li><b>Segnalazioni nuove</b> arrivate dai soci;</li>
<li><b>Pesi da confermare</b> e <b>raccolte chiuse senza consegna</b>;</li>
<li><b>Avvisi sulla chiusura automatica</b>: se non è attiva o se una data di chiusura non si riesce a leggere;</li>
<li>per sapere: le <b>raccolte che chiudono entro 24 ore</b> e le <b>consegne dei prossimi 7 giorni</b>.</li></ul>
<p>Ogni notifica ha un pulsante che porta dove serve. Non vanno cancellate: <b>restano finché la cosa non cambia</b> (l'ordine verificato, il peso confermato, la segnalazione presa in carico) e poi spariscono da sole. Anche soci e fornitori hanno le loro notifiche.</p>
{browser(notifiche,'Le Notifiche sul computer (dati inventati).')}

<h2>Raccolte</h2>
<h3>Aprire una raccolta</h3>
<div class="step"><div class="n">1</div><div>In <b>Raccolte</b> tocca <b>+</b> e scegli il fornitore.</div></div>
<div class="step"><div class="n">2</div><div>Spunta i <b>prodotti</b> da mettere in vendita (compaiono solo quelli disponibili).</div></div>
<div class="step"><div class="n">3</div><div>Scrivi la <b>data di chiusura</b>, per esempio <i>10-10-2026 20:00</i>, e se serve il <b>numero massimo di ordini</b>.</div></div>
<div class="step"><div class="n">4</div><div>Salva, apri la raccolta e prepara il <b>messaggio di apertura</b>.</div></div>
<h3>Dentro una raccolta</h3>
<p>La raccolta si apre in una schermata propria, con <b>‹ Raccolte</b> per tornare indietro. In alto i numeri (ordini, da verificare, consegna) e il pulsante <span class="k">Apri form</span>, che mostra il modulo come lo vedono i soci. Sotto, i blocchi:</p>
<ul><li><b>Messaggi per WhatsApp:</b> <span class="k">Apertura</span> e <span class="k">Chiusura</span> preparano il testo; tocca <span class="k">Copia il messaggio</span> e incollalo nella Community. L'app non scrive da sola nei gruppi.</li>
<li><b>Foglio per la consegna (PDF):</b> una riga per ogni tessera, i prodotti, l'importo e la colonna "Saldato" da spuntare a penna. Il <i>provvisorio</i> si usa mentre si raccolgono gli ordini, il <i>definitivo</i> dopo la conferma dei pesi. Per le raccolte concluse c'è solo il definitivo. Il foglio non mostra totali complessivi, perché è condiviso con tutti.</li>
<li><b>Ordini dei soci:</b> <span class="k">Gestisci ordini</span> per correggere quantità o annullare, e <span class="k">Chiudi gli ordini adesso</span> (o "Riapri").</li>
<li><b>Impostazioni:</b> prodotti, data di chiusura, massimo ordini, avvisi e consegna.</li></ul>
{phone(racc,'Il dettaglio di una raccolta sul telefono.')}
<div class="box">Le raccolte <b>si chiudono da sole</b> alla data di chiusura o al numero massimo di ordini: ogni 15 minuti e comunque appena qualcuno apre il form o il pannello. Se nelle Notifiche compare un avviso sulla chiusura, avvisa chi cura la parte tecnica.</div>
<h3>Raccolte concluse e storico</h3>
<p>Il giorno dopo la data di consegna le raccolte chiuse diventano <b>Consegnata</b> da sole ed escono da quelle in corso, anche per soci e fornitori. Se una raccolta non ha la data di consegna, aprila e tocca <span class="k">Segna come consegnata</span>; se l'hai toccato per sbaglio, c'è <span class="k">Riporta tra le raccolte in corso</span>.</p>
<p>In <b>Raccolte</b> e in <b>Consegne</b> il selettore <b>In corso | Storico</b> mostra quelle passate, divise per mese, con un filtro per <b>fornitore</b> (anche quelli non più attivi). Una raccolta conclusa è <b>in sola lettura</b>: puoi vedere gli ordini, ma non modificarli, e scaricare solo il foglio <i>definitivo</i>.</p>
{browser(storico,'Lo storico delle raccolte (dati inventati).')}
<h3>Ordini da verificare</h3>
<p>Un ordine va in verifica quando la tessera non è attiva o scaduta, oppure quando lo stesso socio ha mandato due ordini senza il link personale (con il link personale, invece, il nuovo ordine sostituisce il vecchio). Telefona al socio, poi <span class="k">Conferma</span> l'ordine giusto e <span class="k">Annulla</span> l'altro. Lo può fare anche il fornitore dal suo portale.</p>

<h2>Consegne</h2>
<p>Con <b>+</b> crei una consegna: data, orario, luogo e chi la segue. Poi, nelle impostazioni di ogni raccolta, scegli la consegna. <span class="k">Genera avviso</span> prepara il messaggio di ritiro con l'elenco dei fornitori. Le consegne in corso sono in ordine di data; quelle passate sono in <b>Storico</b>.</p>

<h2>Soci</h2>
<ul><li>Tocca un socio per cambiare tessera, nome, telefono o per segnarlo come <b>non attivo</b>.</li>
<li><b>Link personale:</b> <span class="k">Invia link</span> apre WhatsApp sulla chat del socio con il messaggio già scritto; <span class="k">Rigenera link</span> crea un link nuovo e disattiva il vecchio, per tutti i profili della persona.</li>
<li>In <b>Import/Export</b> carichi l'elenco dei soci da un file (Tessera, Nominativo, Telefono): prima di confermare vedi cosa cambia. I soci assenti dal file diventano non attivi. C'è anche <span class="k">Crea i link mancanti</span>, per dare il link a chi non l'ha ancora.</li></ul>
{phone(socio,'La scheda di un socio con il link personale.')}
<div class="box warn">Quando un socio viene <b>disattivato</b>, decadono in automatico i suoi ruoli di fornitore e amministratore. Se viene riattivato, i ruoli vanno riassegnati. Non puoi disattivare la tua tessera né l'ultimo amministratore.</div>

<h2>Fornitori e categorie</h2>
<p>Ogni fornitore è un socio: per aggiungerlo tocca <b>+</b> e indica per prima cosa la <b>tessera del socio</b>, poi i dati dell'azienda. Il fornitore entra nel portale con il suo link personale di socio. Toccando un fornitore aggiorni i suoi dati, lo attivi o disattivi, e gestisci il listino per suo conto. Le <b>categorie</b> sono comuni a tutti i fornitori: qui le aggiungi e le rinomini. L'ordine della lista è quello che vedono i soci nel modulo d'ordine: sposta una categoria con le frecce <span class="k">▲</span> e <span class="k">▼</span>. Una categoria nuova va in fondo.</p>

<h2>Statistiche</h2>
<p>In alto scegli il <b>periodo</b> (ultimi 3, 6 o 12 mesi, oppure da inizio anno) e, se vuoi, un <b>fornitore</b> o una <b>categoria</b>: tutta la pagina si aggiorna da sola.</p>
<ul><li>I <b>numeri principali</b>: volume scambiato, ordini, <b>prezzo medio di un ordine</b> (volume diviso per il numero di ordini), soci che hanno ordinato e fornitori attivi. Sotto ognuno, ▲ o ▼ dice di quanto è cambiato rispetto al periodo prima della stessa durata.</li>
<li><b>Quattro grafici</b> mese per mese: ordini, soci che hanno ordinato, fornitori attivi e prezzo medio. Tocca un punto per leggere il numero del mese.</li>
<li>Il <b>volume per categoria</b>, a colonne colorate: le quattro categorie più vendute e "Altro".</li>
<li>Sotto ogni grafico, <span class="k">Mostra i numeri</span> apre la tabella mese per mese. In fondo resta il dettaglio per fornitore, consegna, prodotto e socio.</li></ul>
<p>Sono numeri utili anche per presentare il GAS a nuovi fornitori. Il mese di una raccolta è quello della sua consegna; contano solo gli ordini validi.</p>
{browser(stat,'Le statistiche (numeri inventati).')}

<h2>Amministratori</h2>
<ul><li>Per aggiungerne uno tocca <b>+</b> e scrivi la <b>tessera del socio</b>: userà il suo link personale, non serve un link nuovo.</li>
<li>Toccando un amministratore puoi <span class="k">Invia link</span>, <span class="k">Disattiva</span> o <span class="k">Rimuovi amministratore</span> (resta socio).</li>
<li>Il <b>Registro azioni</b> mostra chi ha fatto cosa e quando.</li></ul>

<h2>Segnalazioni</h2>
<p>Le segnalazioni dei soci arrivano a <b>tutti gli amministratori</b>: le nuove compaiono nelle <b>Notifiche</b> e nella sezione <b>Segnalazioni</b>. Quelle segnate come <b>tecniche</b> le segue il referente tecnico; per le altre contatta il socio. Ogni segnalazione ha i <b>dati tecnici</b> raccolti dall'app (pagina, telefono usato, ultimo errore), uno <b>stato</b> (nuova, in corso, risolta) e le <b>note interne</b>. "Mostra anche le risolte" fa vedere lo storico.</p>
{browser(segn,'Una segnalazione da gestire.')}

<h2>Profilo e Aiuto</h2>
<p>Nel <b>Profilo</b> vedi la tua tessera, cambi telefono ed email e passi agli altri tuoi profili. In <b>Aiuto</b> trovi le domande frequenti (anche quelle per gli amministratori), i contatti e le guide dei tuoi profili.</p>

<h2>Per chi cura la parte tecnica</h2>
<ul><li>I dati sono in un <b>foglio Google</b>, il programma in <b>Apps Script</b> (proprietà <code>SPREADSHEET_ID</code>). Le domande frequenti stanno nella scheda <b>Aiuto</b>, i referenti nella scheda <b>Referenti</b>, le segnalazioni nella scheda <b>Segnalazioni</b>.</li>
<li>Per pubblicare una modifica: <b>Gestisci deployment › matita › Nuova versione</b>. Mai "Nuovo deployment", altrimenti cambiano tutti i link.</li>
<li>Da eseguire una volta dall'editor, e di nuovo <b>dopo ogni cambio di autorizzazioni</b>: <code>installaTriggerChiusura</code> e <code>installaTriggerBackup</code>. Se una raccolta non si chiude, esegui <code>diagnosiChiusura</code> e leggi il log di esecuzione.</li>
<li>Le <b>domande frequenti</b> della scheda Aiuto si aggiornano da sole dopo una nuova versione dell'app (una volta sola, segnata nella proprietà <code>AIUTO_FAQ_VERSIONE</code>): cambiano solo le risposte mai modificate a mano e si aggiungono le domande nuove. Si può anche eseguire <code>aggiornaDomandeAiuto</code> dall'editor.</li>
<li>Backup automatici ogni 6 ore nella cartella Drive "GAS Backup" (resta l'ultima settimana).</li>
<li>Guide PDF: caricale su Drive e metti l'ID di ciascun file nelle proprietà <code>GUIDA_SOCI_ID</code>, <code>GUIDA_FORNITORI_ID</code>, <code>GUIDA_AMMINISTRATORI_ID</code>. Ognuno scarica solo le guide dei propri profili.</li>
<li><code>ADMIN_TOKEN</code> è l'accesso di emergenza. <code>ACCORCIA_LINK_PERSONALI</code> = NO lascia lunghi i link personali. <code>FAVICON_URL</code> è l'icona della scheda del browser.</li></ul>
'''
open('guida-admin.html','w',encoding='utf-8').write(page('Gestire il Gruppo d\'Acquisto','Guida per gli amministratori',body))
