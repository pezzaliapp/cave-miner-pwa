/* Cave Miner — PezzaliAPP Edition — ES5 (iOS 8 ok) */
(function () {
  // ---------- RAF polyfill ----------
  window.requestAnimFrame = window.requestAnimationFrame || function (cb) { return setTimeout(cb, 16); };

  // ---------- Config base ----------
  var TILE = 24, COLS = 20, ROWS = 14, W = COLS * TILE, H = ROWS * TILE;
  var canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;

  var timeEl = document.getElementById('time'),
      diaEl  = document.getElementById('diamonds'),
      needEl = document.getElementById('need'),
      livesEl= document.getElementById('lives');
  var levelSel = document.getElementById('levelSel'),
      btnPlay  = document.getElementById('btnPlay'),
      btnRestart = document.getElementById('restartBtn'); // opzionale

  // ---------- Tiles ----------
  var EMPTY = 0, DIRT = 1, WALL = 2, ROCK = 3, DIAM = 4, EXIT = 5;

  // ---------- Livelli (20x14) ----------
  // Simboli: # muro, . terra, ' ' vuoto, o roccia, * diamante, X uscita, P player
  var LEVELS = [
    { name: "Tutorial", need: 5, map: [
      "####################",
      "#P....o...####....X#",
      "#....oo..#..*..#### ",
      "#..####..#..o..*..# ",
      "#..#  #..#..o..*..# ",
      "#..#  #..#######..# ",
      "#..#  #..........o# ",
      "#..####..######..## ",
      "#......*....o..*..# ",
      "#..o..######..o..## ",
      "#..o..#....#..o..*# ",
      "#..*..#....#..*...# ",
      "#......oooo#......# ",
      "####################"
    ]},
    { name: "Caverna stretta", need: 8, map: [
      "####################",
      "#P......o..*..o...X#",
      "#######..##..##..###",
      "#....*..o..*..o....#",
      "#..##..####..####..#",
      "#..##..#..*..#..#..#",
      "#..o...#..o..#..#..#",
      "#..*...#..*..#..#..#",
      "#..##..####..##..###",
      "#....o.....*.......#",
      "###..########..###.#",
      "#....*..o..*..o....#",
      "#................. #",
      "####################"
    ]},
    { name: "Caduta libera", need: 10, map: [
      "####################",
      "#P..o..o..o..o..o.X#",
      "#..................#",
      "#..*..*..*..*..*...#",
      "#..................#",
      "#..o..o..o..o..o...#",
      "#..................#",
      "#..*..*..*..*..*...#",
      "#..................#",
      "#..o..o..o..o..o...#",
      "#..................#",
      "#..*..*..*..*..*...#",
      "#..................#",
      "####################"
    ]}
  ];

  // ---------- Custom levels da localStorage ----------
  function loadCustomLevels() {
    try {
      var raw = localStorage.getItem('caveminer_levels');
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!(arr && arr.length)) return [];
      var out = [], i, r, ok, L;
      for (i = 0; i < arr.length; i++) {
        L = arr[i];
        if (!L || !L.name || !L.map || !L.need) continue;
        if (!(L.map.length === ROWS)) continue;
        ok = true;
        for (r = 0; r < L.map.length; r++) {
          if (typeof L.map[r] !== 'string' || L.map[r].length !== COLS) { ok = false; break; }
        }
        if (!ok) continue;
        out.push({ name: String(L.name), need: L.need | 0, map: L.map });
      }
      return out;
    } catch (e) { return []; }
  }
  function refreshLevelList() {
    while (levelSel.firstChild) levelSel.removeChild(levelSel.firstChild);
    var src = LEVELS.concat(loadCustomLevels()), i, opt;
    for (i = 0; i < src.length; i++) {
      opt = document.createElement('option');
      opt.value = i;
      opt.textContent = (i + 1) + ". " + src[i].name;
      levelSel.appendChild(opt);
    }
  }
  refreshLevelList();

  // ---------- Stato ----------
  var grid = [];
  var player = { x: 1, y: 1, alive: true };
  var need = 0, have = 0, exitOpen = false, lives = 3, time = 0, paused = false, gameOver = false;

  // movimento a passo fisso con autorepeat
  var input = { up: false, down: false, left: false, right: false };
  var moveInitialDelay = 10;   // frame di attesa alla prima pressione
  var moveRepeatDelay  = 5;    // frame tra un passo e l’altro con tasto tenuto
  var moveCounter = 0;
  var lastDirX = 0, lastDirY = 0;

  // anti-stallo: se il player non cambia cella per un po', si considera intrappolato
  var lastPos = { x: -1, y: -1 }, idleFrames = 0, idleLimit = 180; // 3s @60fps

  function loadLevel(idx) {
    var merged = LEVELS.concat(loadCustomLevels());
    var L = merged[idx | 0] || merged[0];
    var r, c, row, ch, t;
    grid = new Array(ROWS);
    player.x = 1; player.y = 1; player.alive = true;
    for (r = 0; r < ROWS; r++) {
      grid[r] = new Array(COLS);
      row = L.map[r];
      for (c = 0; c < COLS; c++) {
        ch = row.charAt(c);
        t = EMPTY;
        if (ch === '#') t = WALL;
        else if (ch === '.') t = DIRT;
        else if (ch === 'o') t = ROCK;
        else if (ch === '*') t = DIAM;
        else if (ch === 'X') t = EXIT;
        else t = EMPTY;
        grid[r][c] = t;
        if (ch === 'P') { player.x = c; player.y = r; }
      }
    }
    need = L.need | 0; have = 0; exitOpen = false; time = 0; paused = false; gameOver = false;
    needEl && (needEl.textContent = String(need));
    diaEl  && (diaEl.textContent  = "0");
    livesEl&& (livesEl.textContent= String(lives));
    // reset controllo stallo
    lastPos.x = player.x; lastPos.y = player.y; idleFrames = 0;
    moveCounter = 0; lastDirX = 0; lastDirY = 0;
  }
  loadLevel(0);

  // ---------- Helper griglia ----------
  function inb(x, y) { return y >= 0 && y < ROWS && x >= 0 && x < COLS; }
  function get(x, y) { return inb(x, y) ? grid[y][x] : WALL; }
  function set(x, y, v) { if (inb(x, y)) grid[y][x] = v; }

  // ---------- Input tastiera ----------
  function key(e, down) {
    var k = e.key || e.code || e.keyCode;
    if (k === 'ArrowUp'   || k === 38) input.up    = down;
    else if (k === 'ArrowDown' || k === 40) input.down  = down;
    else if (k === 'ArrowLeft' || k === 37) input.left  = down;
    else if (k === 'ArrowRight'|| k === 39) input.right = down;
    else if (k === ' ' || k === 'Space' || k === 'Spacebar' || k === 32) { if (down) paused = !paused; }
  }
  document.addEventListener('keydown', function (e) { key(e, true); });
  document.addEventListener('keyup',   function (e) { key(e, false); });

  // ---------- Touch → sintetizza key ----------
  function bindButtons() {
    var btns = document.querySelectorAll('.btn');
    function fire(code, type) {
      try {
        var ev = new KeyboardEvent(type, { key: code, code: code, bubbles: true });
        document.dispatchEvent(ev);
      } catch (_) { /* iOS 8 fallback silenzioso */ }
    }
    var i, b, k;
    for (i = 0; i < btns.length; i++) {
      b = btns[i]; k = b.getAttribute('data-k');
      if (!k) continue;
      (function (btn, keycode) {
        btn.addEventListener('touchstart', function (e) { fire(keycode, 'keydown'); e.preventDefault(); });
        btn.addEventListener('touchend',   function (e) { fire(keycode, 'keyup');   e.preventDefault(); });
        btn.addEventListener('mousedown',  function ()   { fire(keycode, 'keydown'); });
        btn.addEventListener('mouseup',    function ()   { fire(keycode, 'keyup');   });
        btn.addEventListener('mouseleave', function ()   { fire(keycode, 'keyup');   });
      })(b, k);
    }
  }
  bindButtons();

  // ---------- Restart (opzionale) ----------
  if (btnRestart) btnRestart.addEventListener('click', function(){ loadLevel(levelSel.selectedIndex | 0); });

  // ---------- Fisica + logica ----------
  var tick = 0;

  function stepGravityAndCrush() {
    var x, y, t;
    // bottom-up per far "cadere"
    for (y = ROWS - 1; y >= 0; y--) {
      for (x = 0; x < COLS; x++) {
        t = grid[y][x];
        if (t === ROCK || t === DIAM) {
          // se sotto è vuoto → cade
          if (get(x, y + 1) === EMPTY) {
            // se la cella di destinazione è il player → schiacciato
            if (player.x === x && player.y === (y + 1)) { set(x, y, EMPTY); set(x, y + 1, t); killPlayer(); continue; }
            set(x, y, EMPTY);
            set(x, y + 1, t);
          } else {
            // scivolo laterale (semplice)
            if (get(x + 1, y) === EMPTY && get(x + 1, y + 1) === EMPTY) {
              set(x, y, EMPTY); set(x + 1, y, t);
            } else if (get(x - 1, y) === EMPTY && get(x - 1, y + 1) === EMPTY) {
              set(x, y, EMPTY); set(x - 1, y, t);
            }
          }
        }
      }
    }
  }

  function tryMovePlayer(dx, dy) {
    var nx = player.x + dx, ny = player.y + dy, nt = get(nx, ny);

    // spinta roccia orizzontale
    if (nt === ROCK && dy === 0 && get(nx + dx, ny) === EMPTY) {
      set(nx + dx, ny, ROCK);
      set(nx, ny, EMPTY);
      nt = EMPTY;
    }

    // camminabile
    if (nt === EMPTY || nt === DIRT || nt === DIAM || (nt === EXIT && exitOpen)) {
      if (nt === DIAM) {
        have++;
        if (diaEl) diaEl.textContent = String(have);
        if (have >= need) exitOpen = true;
      }
      if (nt === EXIT && exitOpen) {
        paused = true;
        setTimeout(function(){ paused = false; loadLevel(levelSel.selectedIndex | 0); }, 600);
        return true;
      }
      player.x = nx; player.y = ny;
      set(nx, ny, EMPTY);
      return true;
    }
    return false;
  }

  function update() {
    if (paused || gameOver || !player.alive) return;

    tick++;
    time += 1 / 60;
    if ((tick % 60) === 0 && timeEl) { timeEl.textContent = String((time | 0)); }

    // 1) Fisica pietre + schiacciamento
    stepGravityAndCrush();

    // 2) Movimento a passo fisso con autorepeat
    var wantX = 0, wantY = 0;
    if (input.up) wantY = -1; else if (input.down) wantY = 1;
    if (input.left) wantX = -1; else if (input.right) wantX = 1;

    // se cambia direzione → mossa immediata, poi delay
    if (wantX !== lastDirX || wantY !== lastDirY) {
      moveCounter = moveInitialDelay;
      if (wantX !== 0 || wantY !== 0) { // prima mossa istantanea
        tryMovePlayer(wantX, wantY);
      }
      lastDirX = wantX; lastDirY = wantY;
    } else {
      if (wantX !== 0 || wantY !== 0) {
        if (moveCounter > 0) moveCounter--;
        else {
          if (tryMovePlayer(wantX, wantY)) {
            moveCounter = moveRepeatDelay;
          } else {
            // se bloccato contro muro/roccia non resetto il contatore, così riprova presto
            moveCounter = moveRepeatDelay;
          }
        }
      } else {
        // nessun input → reset
        moveCounter = 0;
      }
    }

    // 3) Anti-stallo: se resti nella stessa cella troppo a lungo, restart
    if (player.x === lastPos.x && player.y === lastPos.y) idleFrames++;
    else idleFrames = 0;
    lastPos.x = player.x; lastPos.y = player.y;
    if (idleFrames > idleLimit) {
      // considerato intrappolato
      loadLevel(levelSel.selectedIndex | 0);
      return;
    }
  }

  function killPlayer() {
    if (!player.alive) return;
    player.alive = false;
    lives--; if (livesEl) livesEl.textContent = String(lives);
    if (lives <= 0) { gameOver = true; return; }
    setTimeout(function () {
      if (!gameOver) { player.alive = true; loadLevel(levelSel.selectedIndex | 0); }
    }, 500);
  }

  // ---------- Render ----------
  function rect(x, y, w, h, fill, stroke) {
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.strokeRect(x, y, w, h); }
  }
  function drawTile(t, x, y) {
    var px = x * TILE, py = y * TILE;
    if (t === EMPTY) { rect(px, py, TILE, TILE, "#000"); }
    else if (t === DIRT) { rect(px, py, TILE, TILE, "#0b1a2a"); ctx.fillStyle = "#10283f"; ctx.fillRect(px + 3, py + 3, 4, 4); ctx.fillRect(px + 10, py + 8, 5, 4); ctx.fillRect(px + 16, py + 14, 4, 4); }
    else if (t === WALL) { rect(px, py, TILE, TILE, "#24324f", "#3c4f7a"); ctx.strokeStyle = "#3c4f7a"; ctx.beginPath(); ctx.moveTo(px, py + TILE / 2); ctx.lineTo(px + TILE, py + TILE / 2); ctx.moveTo(px + TILE / 2, py); ctx.lineTo(px + TILE / 2, py + TILE); ctx.stroke(); }
    else if (t === ROCK) { rect(px, py, TILE, TILE, "#394b6e", "#516a99"); rect(px + 5, py + 5, TILE - 10, TILE - 10, "#4a628f"); }
    else if (t === DIAM) { rect(px, py, TILE, TILE, "#0c1220"); ctx.fillStyle = "#37e0ff"; ctx.beginPath(); ctx.moveTo(px + TILE / 2, py + 3); ctx.lineTo(px + TILE - 3, py + TILE / 2); ctx.lineTo(px + TILE / 2, py + TILE - 3); ctx.lineTo(px + 3, py + TILE / 2); ctx.closePath(); ctx.fill(); }
    else if (t === EXIT) { rect(px, py, TILE, TILE, exitOpen ? "#1aa36f" : "#422b2b", "#62d9ac"); if (!exitOpen) { ctx.strokeStyle = "#813d3d"; ctx.beginPath(); ctx.moveTo(px + 4, py + 4); ctx.lineTo(px + TILE - 4, py + TILE - 4); ctx.stroke(); } }
  }
  function render() {
    rect(0, 0, W, H, "#000");
    var y, x;
    for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) drawTile(grid[y][x], x, y);
    // Player
    var px = player.x * TILE, py = player.y * TILE;
    rect(px, py, TILE, TILE, "#ffd54a", "#ffe28a");
    rect(px + 8, py + 6, 3, 3, "#000"); rect(px + 13, py + 6, 3, 3, "#000");
  }

  // ---------- Loop ----------
  function loop() { if (!paused) update(); render(); requestAnimFrame(loop); }
  loop();

  // ---------- UI ----------
  if (btnPlay) btnPlay.addEventListener('click', function () { loadLevel(levelSel.selectedIndex | 0); });
})();
