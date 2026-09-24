from build_guide import *
listino = top('Caseificio La Collina','Portale fornitore · zona Esempio')+'''<div class="body">
<div class="row"><div class="h">Il mio listino</div><span class="btn" style="margin:0">+ Nuovo</span></div>
<div class="sub" style="font-weight:700;letter-spacing:.06em">FORMAGGI</div>
<div class="card row"><div><b>Formaggio fresco</b><br><span class="sub">15,00 €/kg</span></div><span class="pill">● Disponibile</span></div>
<div class="card row"><div><b>Formaggio stagionato</b><br><span class="sub">20,00 €/kg</span></div><span class="pill">● Disponibile</span></div>
<div class="card row off"><div><b>Crema di formaggio</b><br><span class="sub">5,00 € a barattolo</span></div><span class="pill no">○ Non disponibile</span></div>
<div class="sub" style="font-weight:700;letter-spacing:.06em;margin-top:6px">YOGURT</div>
<div class="card row"><div><b>Yogurt alla frutta</b><br><span class="sub">1,50 € l'uno · 3 opzioni</span></div><span class="pill">● Disponibile</span></div>
</div>'''+nav(NAV_FORN,'Listino')
prodotto = top('Caseificio La Collina','Portale fornitore · zona Esempio')+'''<div class="body">
<div class="card mine"><div class="lab">Nome</div><div class="in">Yogurt alla frutta</div>
<div class="btns2"><div><div class="lab">Prezzo €</div><div class="in">1,50</div></div><div><div class="lab">Unità</div><div class="in">l'uno</div></div></div>
<div class="btns"><span class="btn" style="margin:0">Salva</span><span class="btn ghost" style="margin:0">Annulla</span><span class="btn red" style="margin:0">Elimina</span></div>
<div class="grpt" style="margin-top:8px">Opzioni</div>
<div class="li"><span>Fragola <span class="sub">(variante)</span></span><span class="sub">Modifica · Elimina</span></div>
<div class="li"><span>Pesca <span class="sub">(variante)</span></span><span class="sub">Modifica · Elimina</span></div>
<div class="in" style="margin-top:6px;color:#999">Nome opzione (es. Frutti di bosco)</div><div class="btn">Aggiungi opzione</div></div>
</div>'''+nav(NAV_FORN,'Listino')
raccolte = top('Caseificio La Collina','Portale fornitore · zona Esempio')+'''<div class="body">
<div class="h">Le mie raccolte</div>
<div class="card mine"><b>Raccolta – consegna 12-10-2026</b> <span class="badge grey">Chiusa</span> <span class="badge warn">1 da verificare</span><div class="sub">8 ordini · chiusura 10-10-2026 20:00</div>
<div class="btns" style="margin-top:6px"><span class="btn sec" style="margin:0">Ordini</span><span class="btn sec" style="margin:0">Riepilogo</span><span class="btn sec" style="margin:0">Conferma pesi</span></div>
<table style="margin-top:8px"><tr><th>Prodotto</th><th>Quantità</th><th>Importo</th></tr><tr><td>Formaggio fresco</td><td>6</td><td>90,00 €</td></tr><tr><td>Yogurt alla frutta</td><td>24</td><td>36,00 €</td></tr><tr><td><b>Totale (8 ordini)</b></td><td></td><td><b>126,00 €</b></td></tr></table></div>
</div>'''+nav(NAV_FORN,'Raccolte')
ordini = top('Caseificio La Collina','Portale fornitore · zona Esempio')+'''<div class="body">
<div class="card warn"><b>0147 — Paolo Bianchi</b> <span class="badge warn">da verificare</span><div class="sub">333 000 0000 · ⚠ ordine multiplo</div><div class="sub">✎ nota: ho dimenticato lo yogurt</div>
<div class="row" style="margin-top:5px"><span>Yogurt alla frutta</span><span class="q" style="width:34px;height:24px">2</span><span class="badge">Salva</span></div>
<div class="btns2"><span class="btn">Conferma</span><span class="btn red">Annulla ordine</span></div></div>
<div class="card"><b>0123 — Anna Rossi</b> <span class="badge">valido</span><div class="row" style="margin-top:5px"><span>Formaggio fresco</span><span class="q" style="width:34px;height:24px">1</span><span class="badge">Salva</span></div><div class="btn red">Annulla ordine</div></div>
</div>'''+nav(NAV_FORN,'Raccolte')
body=f'''
<p class="lead">Dal portale del fornitore tieni aggiornato il tuo listino e segui gli ordini dei soci. Si usa dal telefono o dal computer.</p>

<h2>Come si entra</h2>
<p>Ogni fornitore è anche socio: entri con il tuo <b>link personale di socio</b>, lo stesso che usi per i tuoi ordini. Si apre direttamente sul portale del fornitore; dal <b>Profilo</b> passi a "I miei ordini" e viceversa.</p>
<div class="box warn">Il link è una chiave: non inoltrarlo. Se lo perdi, chiedine uno nuovo a un amministratore.</div>
<p>In basso ci sono quattro voci: <b>Listino</b>, <b>Raccolte</b>, <b>Profilo</b> e <b>Aiuto</b>. I dati della tua azienda (nome, telefono, zona, descrizione) li aggiorna un amministratore: se cambiano, avvisalo.</p>

<h2>Il listino</h2>
<p>I prodotti sono divisi per categoria. Per ognuno vedi il prezzo e, a destra, il pulsante della disponibilità.</p>
<ul><li><b>Prodotto finito o fuori stagione:</b> tocca <span class="k">Disponibile</span>. Diventa subito <b>Non disponibile</b> e grigio, e i soci non lo vedono più. Non viene cancellato: quando torna, toccalo di nuovo. I prodotti non disponibili si spostano in fondo alla categoria alla successiva apertura.</li>
<li><b>Cambiare un prodotto:</b> tocca il suo nome. Puoi cambiare nome, categoria, prezzo, unità (per esempio €/kg, l'uno, a cassetta), modo di vendita e note, poi tocca <span class="k">Salva</span>.</li>
<li><b>Si pesa al momento:</b> sceglilo per i prodotti venduti a pezzo ma pagati a peso. Il peso vero lo confermi tu prima della consegna.</li>
<li><b>Nuovo prodotto:</b> tocca <span class="k">+ Nuovo</span> in alto.</li>
<li><b>Eliminare:</b> <span class="k">Elimina</span> lo toglie per sempre. Se è solo finito, meglio "Non disponibile".</li></ul>
<h3>Le opzioni di un prodotto</h3>
<p>In fondo alla scheda del prodotto ci sono le opzioni, di due tipi:</p>
<ul><li><b>Variante:</b> una scelta allo stesso prezzo, come i gusti dello yogurt.</li><li><b>Supplemento:</b> un costo in più che si somma, come la tanica per olio o vino.</li></ul>
{phones([(listino,'Il listino'),(prodotto,'la scheda di un prodotto con le opzioni')])}

<h2>Le raccolte</h2>
<p>Ogni giro di ordini aperto per te è una <b>raccolta</b>. Le trovi tutte, anche quelle passate. Per ognuna ci sono tre pulsanti:</p>
<ul><li><span class="k">Ordini</span>: l'ordine di ogni socio con tessera, telefono ed eventuale nota. Puoi <b>correggere le quantità</b> o <b>annullare un ordine</b>, per esempio se il socio ti chiama per cambiare.</li>
<li><span class="k">Riepilogo</span>: il totale di ogni prodotto da preparare e l'incasso previsto.</li>
<li><span class="k">Conferma pesi</span>: per i prodotti che si pesano, scrivi il peso reale di ogni pezzo. Gli importi dei soci si aggiornano da soli.</li></ul>
<p>Se la raccolta è ancora aperta c'è anche <span class="k">Chiudi gli ordini adesso</span>, per fermarli prima della data (per esempio se la merce è finita).</p>
{phones([(raccolte,'Le raccolte con il riepilogo'),(ordini,'gli ordini, con uno da verificare')])}
<h3>Ordini "da verificare"</h3>
<p>Un ordine va in verifica quando la tessera non è attiva o quando lo stesso socio ha mandato due ordini. Il consiglio è <b>telefonare al socio</b>, poi toccare <span class="k">Conferma</span> sull'ordine giusto e <span class="k">Annulla ordine</span> su quello da togliere.</p>
<div class="box">Conferma i pesi <b>prima della consegna</b>: così nel foglio ogni socio vede l'importo esatto da pagare.</div>

<h2>Profilo e Aiuto</h2>
<p>Nel <b>Profilo</b> vedi la tua tessera e la scadenza, cambi telefono ed email e passi a "I miei ordini" (o al pannello, se sei anche amministratore).</p>
<p>In <b>Aiuto</b> trovi le domande frequenti, i contatti del comitato, questa guida da scaricare e <span class="k">Segnala</span> per un problema dell'app: la segnalazione arriva agli amministratori.</p>
'''
open('guida-fornitori.html','w',encoding='utf-8').write(page('Il portale del fornitore','Guida per i fornitori',body))
