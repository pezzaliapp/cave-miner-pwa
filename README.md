# Cave Miner — PezzaliAPP Edition
Replica in stile *Boulder Dash* scritta in JS **ES5** (compatibile iOS 8).

## Pubblicazione
1. Crea un repo (es. `cave-miner-pwa`), abilita **GitHub Pages** dalla root.
2. Carica tutti i file così come sono.
3. Apri l'URL di Pages. Su iOS 8 funziona online (niente offline); sui browser moderni è PWA con offline.

## Controlli
- Tastiera: frecce per muoversi, **Space** = pausa.
- Touch: D-Pad sotto il gioco, bottone ● per pausa.

## Note tecniche
- Nessun asset esterno; tutto disegnato via Canvas.
- Codice ES5 (niente module/arrow/class) per vecchi Safari.
- Se vuoi più livelli, modifica `levelMap` in `app.js`.
