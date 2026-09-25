from build_guide import *
home_socio = top('GAS Isticcadeddu','La mia pagina · tessera 0123')+home('Anna',GRUPPI_SOCIO,2)
pagina_socio = top('GAS Isticcadeddu','La mia pagina · tessera 0123')+'''<div class="body">'''+testa('ORDINI','Attivi')+riep('1 ordine aperto · 1 raccolta da ordinare','Prossimo ritiro: giovedì 12 ottobre, dalle 18:00 · Piazza del mercato · circa 36,00 € in contanti.')+'''
<div class="h" style="font-size:15px;margin-top:8px">Ordini aperti</div>
<div class="card mine"><div class="row"><b>Caseificio La Collina</b><span class="badge full">Ordinato</span></div><div class="sub">Puoi modificarlo fino al 10-10 alle 20:00</div>
<div class="li"><span>Formaggio fresco · 1 kg</span><span>15,00 €</span></div><div class="li"><span>Yogurt alla frutta – Fragola · 4</span><span>6,00 €</span></div>
<div class="row" style="font-weight:700;padding-top:4px"><span>Totale indicativo</span><span>21,00 €</span></div><div class="btn sec">Modifica il mio ordine</div></div>
<div class="card"><div class="row"><b>Orto del Sole</b><span class="badge">Aperta</span></div><div class="sub">Ordini fino all'11-10 · non hai ancora ordinato</div><div class="btn">Ordina</div></div>
</div>'''+barra()
notif_socio = top('GAS Isticcadeddu','La mia pagina · tessera 0123')+'''<div class="body"><div class="h">Notifiche</div><div class="ng">Da fare</div>'''+nota('fare','DA FARE','Orto del Sole chiude presto','Ordini fino all\'11-10 alle 20:00. Non hai ancora ordinato.','Ordina')+'''<div class="ng">Per sapere</div>'''+nota('','NOVITÀ','Importo confermato: 16,50 €','Caseificio La Collina ha pesato i tuoi prodotti. Da pagare in contanti al ritiro.')+nota('','PROMEMORIA','Ritiro giovedì 12 ottobre, dalle 18:00','Piazza del mercato · 2 fornitori · circa 36,00 €')+'</div>'+barra()
storico_socio = top('GAS Isticcadeddu','La mia pagina · tessera 0123')+'''<div class="body">'''+testa('ORDINI','Storico')+riep('28 ordini passati','L\'ultimo: Caseificio La Collina, consegna del 28-09-2026.')+'''
<div class="h" style="font-size:15px">2026</div>
<div class="card"><div class="row"><b>Caseificio La Collina</b><b>18,30 €</b></div><div class="sub">Consegna del 28-09-2026</div>
<div class="li"><span>Formaggio fresco · 1,22 kg</span><span>18,30 €</span></div><div class="row" style="font-weight:700;padding-top:4px"><span>Totale</span><span>18,30 €</span></div></div>
<div class="card"><div class="row"><b>Orto del Sole</b><b>12,00 €</b></div><div class="sub">Consegna del 21-09-2026</div><div class="sub" style="color:var(--green-d)">Tocca per vedere i prodotti</div></div>
</div>'''+barra()
form = top('Caseificio La Collina','')+'''<div class="body">
<div class="h">Caseificio La Collina</div><div class="sub">Latte di capra, senza additivi</div>
<div class="btns2" style="margin:6px 0"><div class="card" style="margin:0"><span class="sub">Ordini fino a</span><br><b>sabato 10-10, ore 20:00</b></div><div class="card" style="margin:0"><span class="sub">Ritiro</span><br><b>lunedì 12-10 · dalle 18:00</b></div></div>
<div class="card" style="background:var(--green-t);border-color:var(--green-l)">Ordini come <b>Anna Rossi</b> · tessera 0123</div>
<div style="display:flex;gap:5px;margin:6px 0"><span class="badge full" style="padding:4px 10px">Formaggi</span><span class="badge grey" style="padding:4px 10px">Yogurt</span></div>
<div class="prod on"><div class="row"><b>Formaggio fresco</b><b>15,00 €/kg</b></div><div class="sub">Si pesa al momento: il fornitore conferma l'importo esatto prima del ritiro.</div>
<div class="st"><span class="u">1 kg · 15,00 €</span><span class="sb m">–</span><span class="q">1</span><span class="sb">+</span></div></div>
<div class="prod on"><div class="row"><b>Yogurt alla frutta</b><b>1,50 € l'uno</b></div><div class="in">Fragola ▾</div>
<div class="st"><span class="u">4 · 6,00 €</span><span class="sb m">–</span><span class="q">4</span><span class="sb">+</span></div></div>
</div><div class="totbar"><div><span class="sub">2 prodotti · indicativo</span><br><b style="font-size:15px">21,00 €</b></div><span class="btn" style="margin:0">Controlla e invia</span></div>'''
riep = '''<div class="body" style="background:#7C7E74;padding-top:120px"><div style="background:var(--paper);border-radius:16px 16px 0 0;padding:10px 12px;margin:0 -11px -12px">
<div class="h">Controlla il tuo ordine</div><div class="sub">Caseificio La Collina · Anna Rossi, tessera 0123</div>
<div class="card"><div class="li"><span><b>Formaggio fresco</b><br><span class="sub">1 kg</span></span><span>15,00 €</span></div><div class="li"><span><b>Yogurt alla frutta – Fragola</b><br><span class="sub">4</span></span><span>6,00 €</span></div>
<div class="row" style="font-weight:700;padding-top:6px"><span>Totale indicativo</span><span>21,00 €</span></div></div>
<div class="btn">Conferma e invia</div><div class="btn sec">Torna a modificare</div></div></div>'''
profilo = top('GAS Isticcadeddu','La mia pagina · tessera 0123')+'''<div class="body">
<div class="row" style="justify-content:flex-start;gap:9px"><div style="width:38px;height:38px;border-radius:50%;background:var(--green-t);color:var(--green-d);display:flex;align-items:center;justify-content:center;font-weight:700">AR</div><div><div class="h" style="margin:0">Anna Rossi</div><div class="sub">Tessera 0123</div></div></div>
<div class="card"><div class="grpt">La tua tessera</div><div class="btns2"><div><span class="sub">Stato</span><br><b>Attiva</b></div><div><span class="sub">Scadenza</span><br><b>31-12-2026</b></div></div></div>
<div class="card"><div class="grpt">I tuoi contatti</div><div class="lab">Telefono</div><div class="in">333 000 0000</div><div class="lab">Email</div><div class="in" style="color:#999">facoltativa</div><div class="btn" style="width:70px">Salva</div></div>
</div>'''+barra()
aiuto = top('GAS Isticcadeddu','La mia pagina · tessera 0123')+'''<div class="body">
<div class="h">Aiuto</div><div class="btns" style="grid-template-columns:repeat(4,1fr)"><span class="btn ghost" style="margin:0">Domande</span><span class="btn" style="margin:0">Segnala</span><span class="btn ghost" style="margin:0">Contatti</span><span class="btn ghost" style="margin:0">Guide</span></div>
<div class="card warn"><b>È un problema con un tuo ordine?</b><div class="sub" style="color:#5E3908">Scrivi direttamente al fornitore.</div><div class="row" style="margin-top:5px"><span>Caseificio La Collina</span><span class="badge">WhatsApp</span></div></div>
<div class="card"><b>Segnala un problema dell'app</b><div class="lab" style="margin-top:5px">Cosa è successo?</div><div class="in">◉ Non riesco a ordinare</div><div class="in">○ La pagina non si carica o si blocca</div><div class="lab">Descrivi il problema</div><div class="in" style="height:34px"></div><div class="btn">Invia la segnalazione</div></div>
</div>'''+barra()
foglio='''<div class="body"><div class="h" style="font-size:14px">Ordine definitivo – Caseificio La Collina</div><table><tr><th>Tess.</th><th>Nominativo</th><th>Formaggio fresco</th><th>Ricotta</th><th>Yogurt</th><th>Totale €</th><th>Saldato</th></tr>
<tr><td>0123</td><td style="text-align:left">Anna Rossi</td><td>1</td><td></td><td>4</td><td>21,00</td><td></td></tr><tr><td>0147</td><td style="text-align:left">Paolo Bianchi</td><td></td><td>1</td><td></td><td>11,00</td><td></td></tr><tr><td>0210</td><td style="text-align:left">Lucia Neri</td><td>0,5</td><td>0,5</td><td>2</td><td>16,50</td><td></td></tr></table></div>'''

body=f'''
<p class="lead">Con l'app del Gruppo di Acquisto ordini dal telefono, vedi i tuoi ordini e sai quando e dove ritirare. Non serve installare niente e non ci sono password da ricordare.</p>
<div class="box"><b>In poche parole:</b> apri il tuo link personale, tocca <span class="k">Ordina</span>, scegli i prodotti, controlla e premi <span class="k">Conferma e invia</span>. Il giorno del ritiro paghi in contanti al fornitore.</div>

<h2>Il tuo link personale</h2>
<p>Un amministratore ti manda, in privato su WhatsApp, un <b>link personale</b>: un indirizzo che inizia con <i>https://</i>. È la tua chiave per entrare nella tua pagina.</p>
<ul><li><b>Conservalo:</b> nella chat di WhatsApp tieni premuto il messaggio e scegli "Fissa".</li>
<li><b>Mettilo sulla schermata Home</b>, così lo apri come un'app. Su Android: apri il link, tocca i tre puntini in alto a destra, poi "Aggiungi a schermata Home". Su iPhone: tocca il quadrato con la freccia, poi "Aggiungi alla schermata Home".</li>
<li><b>Non inoltrarlo</b> ad altri: chi lo ha può vedere e cambiare i tuoi ordini. Se lo perdi, chiedine uno nuovo a un amministratore: il vecchio smette di funzionare.</li></ul>

<h2>La tua pagina</h2>
<p>Quando apri il tuo link arrivi sulla <b>Home</b>: un elenco con tutte le voci, diviso in gruppi.</p>
<ul><li><b>Notifiche</b>, in cima: gli avvisi che ti riguardano. Il numero dice quanti sono.</li>
<li><b>Ordini</b>: <b>Attivi</b> (gli ordini in corso e le prossime consegne) e <b>Storico</b> (gli ordini delle consegne già fatte).</li>
<li><b>La mia tessera</b>: <b>Profilo</b> e <b>Aiuto</b>.</li></ul>
<p>Tocca una voce per aprirla. Per tornare alla Home, tocca il pulsante verde <span class="k">Home</span> in basso: c'è in ogni pagina.</p>
<p>In cima a ogni pagina c'è un <b>riquadro di riepilogo</b> con le cose principali, per esempio quanti ordini hai aperti e quando è il prossimo ritiro. Diventa arancione se c'è qualcosa da fare.</p>
{phones([(home_socio,'La Home'),(pagina_socio,'Ordini › Attivi')])}
<p>In <b>Attivi</b> trovi, dall'alto:</p>
<ul><li>gli <b>ordini aperti</b>: per ogni fornitore il pulsante <span class="k">Ordina</span> oppure, se hai già ordinato, il tuo ordine con <span class="k">Modifica il mio ordine</span>;</li>
<li>le <b>prossime consegne</b>, con i fornitori presenti e quello che ritiri tu.</li></ul>

<h2>Notifiche</h2>
<p>Le notifiche ti avvisano quando c'è qualcosa per te. Sono divise in due gruppi:</p>
<ul><li><b>Da fare</b>: una raccolta che sta per chiudere e dove non hai ancora ordinato, o un tuo ordine <b>in verifica</b>;</li>
<li><b>Per sapere</b>: una raccolta aperta, l'<b>importo confermato</b> dopo la pesatura, il <b>promemoria del ritiro</b> nei giorni prima.</li></ul>
<p>Ogni notifica ha un pulsante che ti porta dove serve, per esempio <span class="k">Ordina</span>. Non devi cancellarle: <b>spariscono da sole</b> quando la cosa è fatta o passata (quando hai ordinato, quando il ritiro è passato).</p>
{phone(notif_socio,'Le notifiche del socio.')}

<h2>Storico</h2>
<p>In <b>Storico</b> trovi i tuoi ordini delle <b>consegne già fatte</b>, dal più recente, divisi per anno. Tocca un ordine per vedere i prodotti e l'importo. Se sono tanti, in fondo c'è <span class="k">Mostra altri</span>. Un ordine passa nello Storico da solo, il giorno dopo la consegna.</p>
{phone(storico_socio,'Lo Storico degli ordini.')}

<h2>Fare un ordine</h2>
<div class="step"><div class="n">1</div><div>Tocca <span class="k">Ordina</span> in <b>Attivi</b> (o in una notifica). Puoi anche toccare il link nel messaggio della raccolta, nella Community WhatsApp.</div></div>
<div class="step"><div class="n">2</div><div>In alto vedi <b>fino a quando</b> puoi ordinare e <b>quando si ritira</b>. Le categorie in fila (Formaggi, Yogurt…) ti portano subito ai prodotti.</div></div>
<div class="step"><div class="n">3</div><div>Usa <b>+</b> e <b>–</b> per la quantità. Il prodotto scelto diventa verde e mostra quanto spendi. Se c'è una scelta, come il gusto, tocca il riquadro e scegli.</div></div>
<div class="step"><div class="n">4</div><div>Se serve, scrivi una <b>nota per il fornitore</b> in fondo (per esempio "taglio piccolo").</div></div>
<div class="step"><div class="n">5</div><div>Tocca <span class="k">Controlla e invia</span>: compare il riepilogo. Se è tutto giusto tocca <span class="k">Conferma e invia</span>, altrimenti <span class="k">Torna a modificare</span>.</div></div>
{phones([(form,"Il modulo d'ordine"),(riep,"il riepilogo prima dell'invio")])}
<div class="box"><b>"Si pesa al momento"</b>: prodotti come formaggi o angurie hanno un prezzo indicativo. Il fornitore pesa e conferma l'importo esatto prima del ritiro.</div>

<h2>Cambiare un ordine</h2>
<p>In <b>Attivi</b> tocca <span class="k">Modifica il mio ordine</span>: trovi l'ordine già compilato, cambi quello che vuoi e confermi. Il nuovo ordine <b>sostituisce</b> il precedente. Si può fare fino alla chiusura della raccolta; dopo, scrivi al fornitore.</p>
<div class="box warn">Se ordini dal link della Community senza il tuo link personale, scrivi numero di tessera e nome. In questo caso un secondo ordine <b>non sostituisce</b> il primo: restano tutti e due e vengono controllati da un amministratore o dal fornitore, che ti contatteranno.</div>

<h2>Il giorno del ritiro</h2>
<p>Prima della consegna viene pubblicato un <b>foglio con tutti gli ordini</b>: cerca la riga con la tua tessera, controlla i prodotti e l'importo. Si paga <b>in contanti al fornitore</b>, possibilmente con i soldi giusti. Porta cassette o contenitori se il fornitore lo chiede.</p>
{browser(foglio,'Il foglio della consegna: una riga per ogni tessera.','foglio di consegna (PDF)')}

<h2>Profilo</h2>
<p>Nel <b>Profilo</b> vedi il numero e lo stato della tua tessera e <b>quando scade</b>. Puoi cambiare il tuo <b>telefono</b> e la tua <b>email</b>, poi toccare <span class="k">Salva</span>: servono a fornitori e amministratori per contattarti.</p>
<p>Se sei anche fornitore o amministratore, nel Profilo trovi i pulsanti per <b>passare agli altri profili</b> con lo stesso link.</p>

<h2>Aiuto</h2>
<p>In <b>Aiuto</b> trovi le <b>domande frequenti</b>, i <b>contatti</b> e la <b>guida</b> da scaricare. Se qualcosa non funziona, apri <span class="k">Segnala</span>:</p>
<ul><li>per un errore <b>nel tuo ordine</b> (quantità sbagliata, prodotto mancante) scrivi direttamente al <b>fornitore</b>, con i pulsanti WhatsApp o Chiama;</li>
<li>per un problema <b>dell'app</b>, scegli cosa è successo, descrivilo in poche parole e invia. La segnalazione arriva agli amministratori, che ti ricontatteranno se serve.</li></ul>
{phones([(profilo,'Il Profilo'),(aiuto,'Aiuto › Segnala')])}
<p>Nel modulo d'ordine l'aiuto si apre con il pulsante <span class="k">Serve aiuto?</span> in fondo alla pagina.</p>

<h2>Ordine "da verificare"</h2>
<p>Succede quando la tessera non risulta attiva o scaduta, oppure quando lo stesso socio ha inviato due ordini senza il link personale. L'ordine <b>è registrato</b>: un amministratore o il fornitore potrebbero contattarti. Per rinnovare la tessera rivolgiti al comitato.</p>
'''
open('guida-soci.html','w',encoding='utf-8').write(page('Come usare l\'app del GAS','Guida per i soci',body))
