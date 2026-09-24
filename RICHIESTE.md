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
- **Stato:** proposta pronta, in attesa di conferma

**Cosa serve**
Il socio dà da 1 a 5 stelle a ogni ordine ricevuto. Ogni tanto qualcuno fa i complimenti nel gruppo WhatsApp: si vuole che queste valutazioni siano visibili anche nell'app.

**Decisioni (24-09-2026)**
- Si vota nello **Storico** del socio, sulla scheda di ogni ordine.
- Una **notifica temporanea** ricorda al socio di valutare l'ordine.
- La **media** si vede nel pannello, nella **lista dei Fornitori**, e ogni fornitore la vede nel **proprio portale**.
- Voti **anonimi** e **non modificabili**.
- Per ora **solo stelle**, nessun commento.

**Proposta**
- La notifica compare in cima a "I miei ordini" dal **giorno dopo la consegna** (quando l'ordine entra nello Storico) e resta **7 giorni**, o finché il socio vota. "Più tardi" la nasconde fino alla prossima apertura.
- Nello Storico, ogni ordine non ancora votato mostra cinque stelle grandi da toccare; dopo il voto resta "Hai dato 4 stelle", senza possibilità di cambiarlo.
- Si vota un ordine alla volta (una raccolta = un fornitore), solo per ordini validi.
- Nuova scheda `Valutazioni` (creata da sola): raccolta, fornitore, stelle, data. Per impedire il doppio voto senza sapere chi ha votato, si salva solo un codice ricavato da tessera + raccolta (non reversibile), mai la tessera.
- Media e numero di voti: "★ 4,6 · 23 voti". Nel portale del fornitore la media compare **da 3 voti in su**, perché con 1 o 2 voti si potrebbe intuire chi ha votato.

**Domande aperte**
- "Dal giorno della chiusura": va bene il **giorno dopo la consegna** (quando il socio ha ricevuto la merce), o si intende proprio la chiusura degli ordini?
- 7 giorni per la notifica vanno bene?
- La media è di sempre o degli ultimi 12 mesi?

---

## 2. Contattare il fornitore: chiamata o WhatsApp

- **Data:** 24-09-2026
- **Per chi:** Socio
- **Stato:** proposta pronta, in attesa di conferma

**Cosa serve**
Quando un socio vuole contattare un fornitore, può chiamarlo o aprire una chat WhatsApp direttamente dall'app.

**Decisioni (24-09-2026)**
- Il fornitore è un socio, è nella Community WhatsApp e ha già dato il consenso a essere contattato in chat o per telefono: nessuna casella di consenso.

**Proposta**
- Due pulsanti **"Chiama"** (link `tel:`) e **"WhatsApp"** (link `wa.me`), senza costi.
- Numero: il telefono della scheda `Fornitori`; se manca, quello del socio collegato. Senza numero i pulsanti non compaiono.
- Dove: sulla scheda di ogni **raccolta aperta**, sotto ogni ritiro nelle **Prossime consegne** e dentro la scheda di ogni ordine dello **Storico**.
- La chat WhatsApp si apre con un testo iniziale già scritto, es. "Ciao, sono Anna Rossi (tessera 0123) del GAS Isticcadeddu, ti scrivo per l'ordine della consegna del 02-07-2026." Il socio può cambiarlo prima di inviare.

**Domande aperte**
- Il testo iniziale va bene, o meglio la chat vuota?
