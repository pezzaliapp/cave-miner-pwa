/* Cave Miner — Boulder Dash-like (ES5, iOS 8 friendly) */
(function(){
  // Polyfill semplice
  window.requestAnimFrame = window.requestAnimationFrame || function(cb){ return setTimeout(cb, 16); };

  // --- Config ---
  var TILE = 24;            // dimensione logica tile (canvas 480x336 => 20x14)
  var COLS = 20, ROWS = 14;
  var W = COLS*TILE, H = ROWS*TILE;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;

  var timeEl = document.getElementById('time');
  var diaEl  = document.getElementById('diamonds');
  var needEl = document.getElementById('need');
  var livesEl= document.getElementById('lives');

  // --- Tile codes ---
  var EMPTY=0, DIRT=1, WALL=2, ROCK=3, DIAM=4, EXIT=5, PLAYER=6;

  // --- Level (semplice demo) ---
  // Stringhe 20x14: #=WALL, .=DIRT, ' '=EMPTY, o=rock, *=diam, X=exit, P=player
  var levelMap = [
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
  ];

  // Parse in griglia
  var grid = [], r, c;
  var player = {x:1,y:1, alive:true};
  var need = 6; // diamanti richiesti per aprire uscita
  var have = 0;
  var exitOpen = false;
  var lives = 3;
  var time = 0, paused=false, gameOver=false;

  function resetFromMap(){
    grid = new Array(ROWS);
    var foundP = false;
    for (r=0;r<ROWS;r++){
      grid[r] = new Array(COLS);
      var row = levelMap[r];
      for (c=0;c<COLS;c++){
        var ch = row.charAt(c);
        var t = EMPTY;
        if (ch === '#') t=WALL;
        else if (ch === '.') t=DIRT;
        else if (ch === 'o') t=ROCK;
        else if (ch === '*') t=DIAM;
        else if (ch === 'X') t=EXIT;
        else t=EMPTY;
        grid[r][c] = t;
        if (ch === 'P'){ player.x=c; player.y=r; foundP=true; }
      }
    }
    have=0; exitOpen=false; time=0; paused=false; gameOver=false; player.alive=true;
  }
  resetFromMap();
  needEl.textContent = String(need);
  diaEl.textContent  = String(have);
  livesEl.textContent= String(lives);

  // --- Input ---
  var input = {up:false,down:false,left:false,right:false};
  function key(e,down){
    var k = e.key || e.code;
    if (k==='ArrowUp') input.up=down;
    else if (k==='ArrowDown') input.down=down;
    else if (k==='ArrowLeft') input.left=down;
    else if (k==='ArrowRight') input.right=down;
    else if (k===' ' || k==='Space' || k==='Spacebar') { // pausa
      if (down){ paused = !paused; }
    }
    if (e.target && e.target.tagName==='BUTTON') e.preventDefault();
  }
  document.addEventListener('keydown', function(e){ key(e,true); });
  document.addEventListener('keyup',   function(e){ key(e,false);} );

  // Touch buttons
  function bindButtons(){
    var btns = document.querySelectorAll('.btn');
    function fire(code, type){
      var ev = new KeyboardEvent(type, {key:code, code:code, bubbles:true});
      document.dispatchEvent(ev);
    }
    Array.prototype.forEach.call(btns, function(b){
      var k = b.getAttribute('data-k');
      if (!k) return;
      b.addEventListener('touchstart', function(e){ fire(k,'keydown'); e.preventDefault(); });
      b.addEventListener('touchend',   function(e){ fire(k,'keyup');   e.preventDefault(); });
      b.addEventListener('mousedown',  function(){ fire(k,'keydown'); });
      b.addEventListener('mouseup',    function(){ fire(k,'keyup'); });
      b.addEventListener('mouseleave', function(){ fire(k,'keyup'); });
    });
  }
  bindButtons();

  // --- Helpers ---
  function inb(x,y){ return y>=0 && y<ROWS && x>=0 && x<COLS; }
  function get(x,y){ return inb(x,y)? grid[y][x] : WALL; }
  function set(x,y,v){ if (inb(x,y)) grid[y][x]=v; }

  // --- Mechanics ---
  var tick = 0;
  function update(){
    if (paused || gameOver) return;
    tick++;
    time += 1/60;
    if ((tick%60)===0){ timeEl.textContent = String((time|0)); }

    // physics bottom-up so falling resolves properly
    var x,y;
    for (y=ROWS-1;y>=0;y--){
      for (x=0;x<COLS;x++){
        var t = grid[y][x];
        if (t===ROCK || t===DIAM){
          if (get(x,y+1)===EMPTY){
            set(x,y,EMPTY); set(x,y+1,t);
            // se cade sul player
            if (player.x===x && player.y===y+2 && get(x,y+1)===t){
              killPlayer();
            }
          } else if (get(x,y+1)===ROCK || get(x,y+1)===DIAM || get(x,y+1)===WALL || get(x,y+1)===DIRT){
            // scivola a dx o sx se possibile
            if (get(x+1,y)===EMPTY && get(x+1,y+1)===EMPTY){
              set(x,y,EMPTY); set(x+1,y,t);
            } else if (get(x-1,y)===EMPTY && get(x-1,y+1)===EMPTY){
              set(x,y,EMPTY); set(x-1,y,t);
            }
          }
        }
      }
    }

    // Movimento player (una cella per frame max)
    var dx=0, dy=0;
    if (input.up) dy=-1; else if (input.down) dy=1;
    if (input.left) dx=-1; else if (input.right) dx=1;

    if (dx!==0 || dy!==0){
      var nx = player.x+dx, ny = player.y+dy;
      var nt = get(nx,ny);
      // Push roccia orizzontale
      if (nt===ROCK && dy===0 && get(nx+dx,ny)===EMPTY){
        set(nx+dx,ny,ROCK);
        set(nx,ny,EMPTY);
        nt=EMPTY;
      }
      if (nt===DIRT || nt===EMPTY || (nt===DIAM) || (nt===EXIT && exitOpen)){
        if (nt===DIAM){ have++; diaEl.textContent=String(have); if (have>=need) exitOpen=true; }
        if (nt===EXIT && exitOpen){ // win -> next reset semplice
          paused=true;
          setTimeout(function(){ paused=false; resetFromMap(); diaEl.textContent='0'; livesEl.textContent=String(lives); }, 800);
          return;
        }
        player.x=nx; player.y=ny;
        set(nx,ny,EMPTY);
      }
    }
  }

  function killPlayer(){
    if (!player.alive) return;
    player.alive=false;
    lives--; livesEl.textContent=String(lives);
    if (lives<=0){ gameOver=true; }
    // respawn semplice
    setTimeout(function(){
      if (lives>0){ resetFromMap(); livesEl.textContent=String(lives); }
    }, 500);
  }

  // --- Render ---
  function rect(x,y,w,h,fill,stroke){
    if (fill){ ctx.fillStyle=fill; ctx.fillRect(x,y,w,h); }
    if (stroke){ ctx.strokeStyle=stroke; ctx.strokeRect(x,y,w,h); }
  }

  function drawTile(t, x,y){
    var px = x*TILE, py=y*TILE, m=2;
    if (t===EMPTY){
      rect(px,py,TILE,TILE,"#000");
    } else if (t===DIRT){
      rect(px,py,TILE,TILE,"#0b1a2a");
      // granulosità
      ctx.fillStyle="#10283f";
      ctx.fillRect(px+3,py+3,4,4);
      ctx.fillRect(px+10,py+8,5,4);
      ctx.fillRect(px+16,py+14,4,4);
    } else if (t===WALL){
      rect(px,py,TILE,TILE,"#24324f","#3c4f7a");
      ctx.strokeStyle="#3c4f7a"; ctx.beginPath();
      ctx.moveTo(px,py+TILE/2); ctx.lineTo(px+TILE,py+TILE/2);
      ctx.moveTo(px+TILE/2,py); ctx.lineTo(px+TILE/2,py+TILE);
      ctx.stroke();
    } else if (t===ROCK){
      rect(px,py,TILE,TILE,"#394b6e","#516a99");
      rect(px+5,py+5,TILE-10,TILE-10,"#4a628f");
    } else if (t===DIAM){
      rect(px,py,TILE,TILE,"#0c1220");
      ctx.fillStyle="#37e0ff";
      ctx.beginPath();
      ctx.moveTo(px+TILE/2,py+3);
      ctx.lineTo(px+TILE-3,py+TILE/2);
      ctx.lineTo(px+TILE/2,py+TILE-3);
      ctx.lineTo(px+3,py+TILE/2);
      ctx.closePath();
      ctx.fill();
    } else if (t===EXIT){
      rect(px,py,TILE,TILE, exitOpen? "#1aa36f" : "#422b2b", "#62d9ac");
      if (!exitOpen){
        ctx.strokeStyle="#813d3d";
        ctx.beginPath(); ctx.moveTo(px+4,py+4); ctx.lineTo(px+TILE-4,py+TILE-4); ctx.stroke();
      }
    }
  }

  function render(){
    rect(0,0,W,H,"#000");
    var x,y;
    for (y=0;y<ROWS;y++){
      for (x=0;x<COLS;x++){
        drawTile(grid[y][x],x,y);
      }
    }
    // Player
    var px=player.x*TILE, py=player.y*TILE;
    rect(px,py,TILE,TILE,"#ffd54a","#ffe28a");
    rect(px+8,py+6,3,3,"#000");
    rect(px+13,py+6,3,3,"#000");
  }

  function loop(){
    if (!paused) update();
    render();
    requestAnimFrame(loop);
  }
  loop();
})();
