# Cave Miner — PezzaliAPP Edition v2 (PWA)
**ES5 compatibile (iOS 8 OK) • Giocabile su desktop e mobile • Offline-ready**

Cave Miner è un arcade “a passi” ispirato ai classici *cave-digging*. Scava la terra, spingi le rocce, raccogli i diamanti richiesti e raggiungi l’uscita quando diventa **verde**. Versione v2 riscritta in **JavaScript ES5** per la massima compatibilità (anche Safari iOS 8.4.1), impacchettata come **PWA** con installazione e caching offline.

---

## ✨ Caratteristiche
- **Compatibilità estesa:** ES5 puro (niente transpiler), gira su browser moderni e vecchi (es. iOS 8).
- **PWA completa:** manifest, service worker cache-first, installabile e giocabile **offline**.
- **Controlli desktop e mobile:** frecce / spazio / R su desktop; **pad virtuale** su smartphone/tablet.
- **Audio SFX** (push/fall/pick/win) con sblocco al primo tap (iOS ready).
- **Editor livelli** (facoltativo): crea livelli 20×14, salvali in `localStorage` e giocabili dal selettore.
- **Niente dipendenze**: un solo `index.html`, `app.js`, `sw.js` e asset statici.

---

## 🎮 Comandi
### Desktop
- **Frecce**: muovi (passo a griglia)
- **Spazio**: pausa
- **R**: ricomincia livello

### Mobile
- **Pad virtuale** in basso (sempre visibile): frecce, pausa e ricomincia.

---

## 🧪 Regole principali
- Le **rocce** si spingono **solo orizzontalmente** se:
  1) la cella successiva nella direzione di spinta è **vuota**,  
  2) la roccia è **appoggiata** (non sospesa nel vuoto).
- Le rocce e i diamanti **cadono** se sotto è vuoto; possono **scivolare** su superfici “rotonde”.
- Raccogli il numero di **💎 richiesti**: l’uscita diventa **verde** → entra per vincere il livello.

---

## 🗂 Struttura cartelle

.
├─ index.html
├─ app.js
├─ sw.js
├─ manifest.webmanifest
├─ icons/
│  ├─ icon-192.png
│  ├─ icon-512.png
│  └─ sfx/
│     ├─ push.wav
│     ├─ fall.wav
│     ├─ pick.wav
│     └─ win.wav
└─ editor.html (opzionale) + editor.js

> **Nota**: nella v2 le icone/suoni sono sotto `icons/` (non `assets/`). Il service worker e il codice puntano a questi percorsi.

---

## 🚀 Avvio locale
Serve un **server statico** (per SW/manifest). Esempi:

### Python 3
```bash
python3 -m http.server 8000

Apri: http://localhost:8000

Node (http-server)

npx http-server -p 8000

In HTTP file:// i service worker non si attivano.

⸻

📱 PWA / Offline
	•	Il service worker (sw.js) segue strategia cache-first e mette in cache:
	•	index.html, app.js, manifest.webmanifest, icone in icons/, e carica dinamico degli altri asset.
	•	La navigazione (richieste navigate) fa rete→fallback a index per resilienza offline.
	•	Installazione: appare il pulsante Installa (evento beforeinstallprompt) su browser supportati.

⸻

🔊 Audio
	•	I 4 SFX sono in icons/sfx/ e referenziati da app.js.
	•	Sblocco audio su iOS/Android dopo il tap su Start, canvas o pad (riproduzione silenziosa “unlock”).
	•	Pulsante 🔊/🔇 nel pannello HUD per mutare.

⸻

🧱 Editor Livelli (facoltativo)
	•	Apri editor.html, disegna una mappa 20×14 (simboli: # .  o  *  X  P).
	•	Salva → va in localStorage:caveminer_levels.
	•	Nel gioco comparirà nel menu Livello (in coda ai livelli base).

⸻

🔧 Build/Deploy
	•	Non serve build pipeline: è vanilla.
	•	Pubblica la cartella così com’è su un hosting statico (GitHub Pages, Netlify, Vercel, S3…).
	•	Aggiornamento SW: incrementa CACHE in sw.js (es. caveminer-v2-cache-v3) quando cambi asset.

⸻

🩺 Troubleshooting
	•	Suoni non partono su iOS → fai un tap su START o sul canvas (serve un gesto utente per sbloccare l’audio).
	•	Icone non caricate / PWA non installabile → verifica i path in manifest.webmanifest e che il file venga servito con Content-Type: application/manifest+json.
	•	SW non aggiorna → hard refresh o “Unregister” da DevTools → Application → Service Workers; ricordati di bumpare CACHE.
	•	Pad non risponde → controlla che gli elementi con data-k="..." siano presenti e che non ci siano overlay sopra.

⸻

📋 Licenza & Crediti
	•	Codice: MIT (o specifica la tua licenza).
	•	Ispirato ai classici dei puzzle/digging anni ’80.
	•	Grafica e SFX minimali originali per la demo.

⸻

🗺 Roadmap rapida
	•	Animazioni base (camminata, raccolta)
	•	Effetti particelle su caduta/rottura
	•	Salvataggio progressi (localStorage)
	•	Condivisione livelli (export/import JSON)

⸻

Buon divertimento! 💎
