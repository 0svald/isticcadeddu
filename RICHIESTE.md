# Richieste di nuove funzioni

Qui si segnano le idee per l'app, prima di decidere se e come farle.
Il repository è pubblico: niente nomi reali di soci o fornitori, telefoni o link personali.

Per ogni richiesta: **data**, **per chi**, **cosa serve**, **domande aperte**, **stato**.
Stati: `da valutare` → `proposta pronta` → `in lavorazione` → `fatta` (oppure `scartata`, con il motivo).
Quando una richiesta è fatta, si indica la pull request.

---

## 1. Valutazione degli ordini a 5 stelle

- **Data:** 24-09-2026
- **Per chi:** Socio (vota), Fornitore e Amministratore (vedono la media)
- **Stato:** proposta pronta

**Cosa serve**
Il socio dà da 1 a 5 stelle a ogni ordine ricevuto. Ogni tanto qualcuno fa i complimenti nel gruppo WhatsApp: si vuole che queste valutazioni siano visibili anche nell'app.

**Decisioni (24-09-2026)**
- Si vota nello **Storico** del socio, sulla scheda di ogni ordine.
- Un **promemoria** ricorda di valutare l'ordine: compare **il giorno dopo la chiusura** degli ordini e resta **finché il socio non lo chiude a mano**.
- La **media degli ultimi 12 mesi** si vede nel pannello, nella **lista dei Fornitori**, e ogni fornitore la vede nel **proprio portale**.
- Voti **anonimi** e **non modificabili**.
- Per ora **solo stelle**, nessun commento.

**Proposta**
- Il promemoria sta in cima a "I miei ordini". Il giorno dopo la chiusura l'ordine non è ancora nello Storico (ci entra dopo la consegna), quindi le stelle stanno **dentro il promemoria stesso**. Votare chiude anche il promemoria.
- Nello Storico, ogni ordine non ancora votato mostra cinque stelle grandi da toccare; dopo il voto resta "Hai dato 4 stelle".
- Prima di salvare si chiede conferma ("Il voto è anonimo e non si potrà cambiare").
- Si vota un ordine alla volta (una raccolta = un fornitore), solo per ordini validi.
- Nuova scheda `Valutazioni` (creata da sola): raccolta, fornitore, stelle, data. Per impedire il doppio voto si salva solo un codice ricavato da tessera + raccolta + una chiave segreta dello script, mai la tessera. I promemoria chiusi si salvano allo stesso modo.
- Il promemoria compare solo per le raccolte chiuse dal giorno in cui la funzione viene pubblicata; gli ordini più vecchi si votano dallo Storico.
- Media: "★ 4,6 · 23 voti (ultimi 12 mesi)". Nel portale del fornitore compare da 3 voti in su, perché con 1 o 2 voti si potrebbe intuire chi ha votato.

**Da confermare quando si realizza**
- Stelle dentro il promemoria (vedi sopra).
- Soglia di 3 voti nel portale del fornitore.

---

## 2. Contattare il fornitore: chiamata o WhatsApp

- **Data:** 24-09-2026
- **Per chi:** Socio
- **Stato:** proposta pronta

**Cosa serve**
Quando un socio vuole contattare un fornitore, può chiamarlo o aprire una chat WhatsApp direttamente dall'app.

**Decisioni (24-09-2026)**
- Il fornitore è un socio, è nella Community WhatsApp e ha già dato il consenso a essere contattato in chat o per telefono: nessuna casella di consenso.
- Pulsanti **"Chiama"** (link `tel:`) e **"WhatsApp"** (link `wa.me`), **solo sulle schede delle raccolte aperte**.
- Numero: il telefono della scheda `Fornitori`; se manca, quello del **socio collegato**. Se non c'è nessun numero, i pulsanti **restano visibili ma disattivati**.
- La chat WhatsApp si apre con il testo iniziale: "Ciao, sono Anna Rossi (tessera 0123) del GAS Isticcadeddu, " (con nome e tessera del socio), da completare.

**Nota tecnica**
- Un numero fisso non ha WhatsApp: in quel caso resta attivo solo "Chiama".

---

## 3. Rinnovo della tessera

- **Data:** 26-09-2026
- **Per chi:** Socio (riceve l'avviso e chiede il rinnovo), Amministratore (raccoglie le quote)
- **Stato:** da valutare

**Cosa serve**
Un mese prima della scadenza della tessera, il socio riceve una notifica. Da lì può chiedere il rinnovo agli amministratori. Ogni richiesta diventa un "ordine di rinnovo", e le richieste sono raccolte in una "raccolta dei rinnovi" mensile. Così gli amministratori vedono ogni mese tutte le tessere che scadono il mese dopo, raccolgono le quote e sanno chi non ha ancora chiesto il rinnovo, per contattarlo direttamente.

**Domande aperte**
- Dove si legge la scadenza: c'è già una colonna nella scheda `Soci`?
- La quota è uguale per tutti? Va indicata nella richiesta?
- Chi segna il rinnovo come pagato, e cosa succede alla tessera: si allunga di un anno da sola?
- La "raccolta dei rinnovi" va nella sezione Raccolte del pannello o in una sezione a parte, così non si mescola con gli ordini dei fornitori?
- Il socio che non chiede il rinnovo compare in un elenco "da contattare", con i pulsanti WhatsApp e Chiama?
