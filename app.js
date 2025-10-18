/* Cave Miner — PezzaliAPP Edition v2 — ES5 (iOS 8 ok) */
(function () {
  window.requestAnimFrame = window.requestAnimationFrame || function (cb) { return setTimeout(cb, 16); };

  var TILE = 24, COLS = 20, ROWS = 14, W = COLS * TILE, H = ROWS * TILE;
  var canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;

  var timeEl = document.getElementById('time'),
      diaEl  = document.getElementById('diamonds'),
      needEl = document.getElementById('need'),
      livesEl= document.getElementById('lives');
  var levelSel = document.getElementById('levelSel'),
      btnPlay  = document.getElementById('btnPlay');

  var sfx = {
    push: document.getElementById('sfx_push'),
    fall: document.getElementById('sfx_fall'),
    pick: document.getElementById('sfx_pick'),
    win:  document.getElementById('sfx_win')
  };
  sfx.push.src='./assets/sfx/push.wav';
  sfx.fall.src='./assets/sfx/fall.wav';
  sfx.pick.src='./assets/sfx/pick.wav';
  sfx.win.src ='./assets/sfx/win.wav';

  var btnMute = document.getElementById('btnMute');
  var muted = false;
  btnMute.onclick = function(){ muted=!muted; btnMute.textContent = muted?'🔇':'🔊'; };
  function play(name){
    try{ if(!muted){ sfx[name].currentTime=0; sfx[name].play(); } }catch(_){}
  }

  var EMPTY=0, DIRT=1, WALL=2, ROCK=3, DIAM=4, EXIT=5;

  var LEVELS = [
    { name:"Tutorial", need:5, map:[
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
    { name:"Caverna stretta", need:8, map:[
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
    { name:"Caduta libera", need:10, map:[
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

  function loadCustomLevels(){
    try {
      var raw = localStorage.getItem('caveminer_levels');
      if (!raw) return [];
      var arr = JSON.parse(raw) || [];
      var out = [];
      for (var i=0;i<arr.length;i++){
        var L = arr[i];
        if (!L || !L.name || !L.map || !L.need) continue;
        if (L.map.length !== ROWS) continue;
        var ok = true;
        for (var r=0;r<ROWS;r++){
          if (typeof L.map[r] !== 'string' || L.map[r].length !== COLS){ ok=false; break; }
        }
        if (ok) out.push({ name:String(L.name), need:L.need|0, map:L.map });
      }
      return out;
    } catch(_) { return []; }
  }
  function refreshLevelList(){
    while (levelSel.firstChild) levelSel.removeChild(levelSel.firstChild);
    var src = LEVELS.concat(loadCustomLevels());
    for (var i=0;i<src.length;i++){
      var opt = document.createElement('option');
      opt.value = i; opt.textContent = (i+1)+". "+src[i].name;
      levelSel.appendChild(opt);
    }
  }
  refreshLevelList();

  var grid = [], player = {x:1,y:1,alive:true}, need=0, have=0, exitOpen=false, lives=3, time=0, paused=true, gameOver=false;
  var startOverlay = document.getElementById('start');
  document.getElementById('btnStart').onclick = function(){ paused=false; startOverlay.style.display='none'; };

  function inb(x,y){ return y>=0 && y<ROWS && x>=0 && x<COLS; }
  function get(x,y){ return inb(x,y)? grid[y][x] : WALL; }
  function set(x,y,v){ if (inb(x,y)) grid[y][x]=v; }
  function isEmpty(x,y){ return get(x,y)===EMPTY; }
  function rockIsSupported(x,y){ return !isEmpty(x, y+1); }

  function loadLevel(idx){
    var merged = LEVELS.concat(loadCustomLevels());
    var L = merged[(idx|0)] || merged[0];

    grid = new Array(ROWS);
    var r,c,row,ch;
    player.x=1; player.y=1; player.alive=true;

    for (r=0;r<ROWS;r++){
      grid[r] = new Array(COLS);
      row = L.map[r];
      for (c=0;c<COLS;c++){
        ch = row.charAt(c);
        var t = EMPTY;
        if (ch==='#') t=WALL;
        else if (ch==='.') t=DIRT;
        else if (ch==='o') t=ROCK;
        else if (ch==='*') t=DIAM;
        else if (ch==='X') t=EXIT;
        grid[r][c]=t;
        if (ch==='P'){ player.x=c; player.y=r; }
      }
    }
    need = L.need|0; have=0; exitOpen=false; time=0; gameOver=false;
    needEl.textContent = String(need);
    diaEl.textContent  = "0";
    livesEl.textContent= String(lives);
  }
  loadLevel(0);

  var input = {up:false,down:false,left:false,right:false};
  function key(e,down){
    var k = e.key || e.code || e.which;
    if (k==='ArrowUp' || k===38)    input.up=down;
    else if (k==='ArrowDown'||k===40) input.down=down;
    else if (k==='ArrowLeft'||k===37) input.left=down;
    else if (k==='ArrowRight'||k===39)input.right=down;
    else if (k==='KeyR'||k==='r'||k===82){ if (down){ loadLevel(levelSel.selectedIndex|0); } }
    else if (k===' ' || k==='Space' || k==='Spacebar' || k===32) { if (down) paused=!paused; }
    if (e && e.preventDefault) e.preventDefault();
  }
  document.addEventListener('keydown', function(e){ key(e,true); });
  document.addEventListener('keyup',   function(e){ key(e,false); });

  (function bindButtons(){
    var btns = document.querySelectorAll('#pad .btn');
    var active = {};
    function fire(code, type){
      try {
        var ev = new KeyboardEvent(type, {key:code, code:code, bubbles:true});
        document.dispatchEvent(ev);
      } catch(_){
        var e = document.createEvent('Event');
        e.initEvent(type, true, true);
        e.key = code; e.code = code;
        document.dispatchEvent(e);
      }
    }
    function start(e){
      var k = this.getAttribute('data-k'); active[k]=true; fire(k,'keydown'); e.preventDefault();
    }
    function end(e){
      var k = this.getAttribute('data-k'); if(active[k]){ fire(k,'keyup'); active[k]=false; } e.preventDefault();
    }
    for (var i=0;i<btns.length;i++){
      var b = btns[i];
      b.addEventListener('touchstart', start, {passive:false});
      b.addEventListener('touchend',   end,   {passive:false});
      b.addEventListener('mousedown',  start, false);
      b.addEventListener('mouseup',    end,   false);
      b.addEventListener('mouseleave', end,   false);
    }
  })();

  var moveCooldown = 0, MOVE_REPEAT_MS = 110;
  function tryMove(dx,dy){
    var nx = player.x + dx, ny = player.y + dy, nt = get(nx, ny);

    if (dy===0 && (dx===1 || dx===-1) && nt===ROCK){
      if (isEmpty(nx+dx, ny) && rockIsSupported(nx, ny)){
        set(nx+dx, ny, ROCK);
        set(nx, ny, EMPTY);
        nt = EMPTY;
        play('push');
      } else {
        return false;
      }
    }

    if (nt===EMPTY || nt===DIRT || nt===DIAM || (nt===EXIT && exitOpen)){
      if (nt===DIAM){
        diaEl.textContent = String(++have);
        if (have>=need) exitOpen=true;
        play('pick');
      }
      if (nt===EXIT && exitOpen){
        // win
        play('win');
        setTimeout(function(){ loadLevel(levelSel.selectedIndex|0); }, 600);
        return true;
      }
      player.x = nx; player.y = ny;
      if (nt===DIRT || nt===DIAM) set(nx, ny, EMPTY);
      moveCooldown = MOVE_REPEAT_MS;
      return true;
    }
    return false;
  }

  function handleInput(dtMs){
    if (moveCooldown>0) { moveCooldown -= dtMs; if (moveCooldown<0) moveCooldown=0; }
    if (moveCooldown!==0) return;
    if (input.left)  { if (tryMove(-1,0)) return; }
    if (input.right) { if (tryMove(+1,0)) return; }
    if (input.up)    { if (tryMove(0,-1)) return; }
    if (input.down)  { if (tryMove(0,+1)) return; }
  }

  var pendingWin = false;

  function killPlayer(){
    if (!player.alive || pendingWin) return;
    player.alive=false; var lives=parseInt(livesEl.textContent,10)||3; lives--; livesEl.textContent=String(lives);
    if (lives<=0){ return; }
    setTimeout(function(){ player.alive=true; loadLevel(levelSel.selectedIndex|0); }, 500);
  }

  function physicsStep(){
    var x, y, t;
    for (y = ROWS - 2; y >= 0; y--) {
      for (x = 0; x < COLS; x++) {
        t = grid[y][x];
        if (!(t === ROCK || t === DIAM)) continue;

        if (get(x, y + 1) === EMPTY) {
          set(x, y, EMPTY);
          set(x, y + 1, t);
          if (t===ROCK) play('fall');
          if (!pendingWin && player.x === x && player.y === y + 1) killPlayer();
          continue;
        }

        var under = get(x, y + 1);
        if (under === ROCK || under === DIAM) {
          if (get(x + 1, y) === EMPTY && get(x + 1, y + 1) === EMPTY) {
            set(x, y, EMPTY); set(x + 1, y, t); continue;
          }
          if (get(x - 1, y) === EMPTY && get(x - 1, y + 1) === EMPTY) {
            set(x, y, EMPTY); set(x - 1, y, t); continue;
          }
        }
      }
    }
  }

  function rect(x,y,w,h,fill,stroke){
    if (fill){ ctx.fillStyle=fill; ctx.fillRect(x,y,w,h); }
    if (stroke){ ctx.strokeStyle=stroke; ctx.strokeRect(x,y,w,h); }
  }
  function drawTile(t,x,y){
    var px=x*TILE, py=y*TILE;
    if (t===EMPTY){ rect(px,py,TILE,TILE,"#000"); }
    else if (t===DIRT){
      rect(px,py,TILE,TILE,"#0b1a2a");
      ctx.fillStyle="#10283f";
      ctx.fillRect(px+3,py+3,4,4); ctx.fillRect(px+10,py+8,5,4); ctx.fillRect(px+16,py+14,4,4);
    }
    else if (t===WALL){
      rect(px,py,TILE,TILE,"#24324f","#3c4f7a");
      ctx.strokeStyle="#3c4f7a"; ctx.beginPath();
      ctx.moveTo(px,py+TILE/2); ctx.lineTo(px+TILE,py+TILE/2);
      ctx.moveTo(px+TILE/2,py); ctx.lineTo(px+TILE/2,py+TILE);
      ctx.stroke();
    }
    else if (t===ROCK){
      rect(px,py,TILE,TILE,"#394b6e","#516a99");
      rect(px+5,py+5,TILE-10,TILE-10,"#4a628f");
    }
    else if (t===DIAM){
      rect(px,py,TILE,TILE,"#0c1220");
      ctx.fillStyle="#37e0ff"; ctx.beginPath();
      ctx.moveTo(px+TILE/2,py+3);
      ctx.lineTo(px+TILE-3,py+TILE/2);
      ctx.lineTo(px+TILE/2,py+TILE-3);
      ctx.lineTo(px+3,py+TILE/2);
      ctx.closePath(); ctx.fill();
    }
    else if (t===EXIT){
      rect(px,py,TILE,TILE, exitOpen? "#1aa36f" : "#422b2b", "#62d9ac");
      if (!exitOpen){
        ctx.strokeStyle="#813d3d"; ctx.beginPath();
        ctx.moveTo(px+4,py+4); ctx.lineTo(px+TILE-4,py+TILE-4); ctx.stroke();
      }
    }
  }
  function render(){
    rect(0,0,W,H,"#000");
    for (var y=0;y<ROWS;y++) for (var x=0;x<COLS;x++) drawTile(grid[y][x],x,y);
    var px=player.x*TILE, py=player.y*TILE;
    rect(px,py,TILE,TILE,"#ffd54a","#ffe28a");
    rect(px+8,py+6,3,3,"#000"); rect(px+13,py+6,3,3,"#000");
  }

  var ACC=0, STEP=1000/60, lastTs=Date.now(), tick=0;
  function loop(){
    var now=Date.now(), dt=now-lastTs; lastTs=now;
    if (dt>250) dt=250;
    ACC += dt;
    if (!paused) handleInput(dt);

    while (ACC >= STEP) {
      if (!paused) {
        physicsStep();
        tick++; if ((tick%60)===0){ timeEl.textContent = String((++time)|0); }
      }
      ACC -= STEP;
    }
    render();
    requestAnimFrame(loop);
  }
  loop();

  btnPlay.addEventListener('click', function(){ loadLevel(levelSel.selectedIndex|0); });
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js'); }
})();
