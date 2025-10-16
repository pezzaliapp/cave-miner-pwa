/* Cave Miner — Boulder Dash-like core — ES5 friendly */
(function(){
  // ----------------- Setup base -----------------
  var TILE=24, COLS=20, ROWS=14, W=COLS*TILE, H=ROWS*TILE;
  var canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
  canvas.width=W; canvas.height=H;

  var timeEl=document.getElementById('time'), diaEl=document.getElementById('diamonds'),
      needEl=document.getElementById('need'), livesEl=document.getElementById('lives');
  var levelSel=document.getElementById('levelSel'), btnPlay=document.getElementById('btnPlay');

  // RequestAnimationFrame polyfill
  var raf = window.requestAnimationFrame || function(cb){ return setTimeout(cb,16); };

  // Tiles
  var T_EMPTY=0, T_DIRT=1, T_WALL=2, T_ROCK=3, T_DIAM=4, T_EXIT=5;

  // Livelli demo (mappa 20x14). Simboli: # muro, . terra, ' ' vuoto, o roccia, * diamante, X uscita, P player.
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

  // ----------------- Stato -----------------
  // Ogni cella è un oggetto {t:type, falling:bool}
  var grid=[], player={x:1,y:1, px:1, py:1, moving:false, dirX:0, dirY:0, pending:null, alive:true};
  var need=0, have=0, exitOpen=false, lives=3, timeLeft=200, paused=false, gameOver=false;

  // Velocità movimento: quanti frame per passare da una cella alla prossima
  var MOVE_FRAMES = 6;          // più alto = più lento (BD classico è piuttosto “rigido”)
  var moveCounter = 0;          // contatore animazione
  var TICKS_PER_SEC = 60;       // logica base
  var tickCount = 0;

  // ----------------- Helpers griglia -----------------
  function inb(x,y){ return y>=0 && y<ROWS && x>=0 && x<COLS; }
  function get(x,y){ return inb(x,y) ? grid[y][x] : {t:T_WALL, falling:false}; }
  function set(x,y,cell){ if(inb(x,y)) grid[y][x]=cell; }
  function setT(x,y,t){ if(inb(x,y)) grid[y][x].t=t; }

  // ----------------- Caricamento livello -----------------
  function buildCellFromChar(ch){
    var t=T_EMPTY;
    if (ch==='#') t=T_WALL;
    else if (ch==='.') t=T_DIRT;
    else if (ch==='o') t=T_ROCK;
    else if (ch==='*') t=T_DIAM;
    else if (ch==='X') t=T_EXIT;
    return { t:t, falling:false };
  }

  function refreshLevelList(){
    while(levelSel.firstChild) levelSel.removeChild(levelSel.firstChild);
    for (var i=0;i<LEVELS.length;i++){
      var opt=document.createElement('option');
      opt.value=i; opt.textContent=(i+1)+". "+LEVELS[i].name;
      levelSel.appendChild(opt);
    }
  }

  function loadLevel(idx){
    var L=LEVELS[idx|0]||LEVELS[0];
    grid=new Array(ROWS);
    for (var r=0;r<ROWS;r++){
      grid[r]=new Array(COLS);
      var row=L.map[r];
      for (var c=0;c<COLS;c++){
        var ch=row.charAt(c);
        grid[r][c]=buildCellFromChar(ch);
        if (ch==='P'){ player.x=c; player.y=r; }
      }
    }
    player.px=player.x; player.py=player.y;
    player.moving=false; player.dirX=0; player.dirY=0; player.pending=null; player.alive=true;
    need=L.need|0; have=0; exitOpen=false; moveCounter=0;
    timeLeft=200; paused=false; gameOver=false;
    if (needEl) needEl.textContent=String(need);
    if (diaEl)  diaEl.textContent="0";
    if (livesEl)livesEl.textContent=String(lives);
    if (timeEl) timeEl.textContent=String(timeLeft);
  }

  refreshLevelList(); loadLevel(0);

  // ----------------- Input & buffer -----------------
  var input = {up:false,down:false,left:false,right:false, pause:false};

  function press(dir){
    // Se sto già camminando, metto in queue la nuova direzione
    if (player.moving){
      player.pending = dir;
      return;
    }
    tryStartMove(dir.dx, dir.dy);
  }

  function tryStartMove(dx,dy){
    if (dx===0 && dy===0) return;
    var nx=player.x+dx, ny=player.y+dy, c=get(nx,ny);
    // Spinta masso a orizzontale
    if (c.t===T_ROCK && dy===0){
      var beyond=get(nx+dx, ny);
      if (beyond.t===T_EMPTY && !c.falling){
        // spingi il masso
        set(nx+dx, ny, {t:T_ROCK, falling:false});
        setT(nx,ny,T_EMPTY);
        // Ora la cella di fronte è vuota
        c = get(nx,ny);
      } else {
        return; // non puoi spingere
      }
    }
    // Entrare in EMPTY/ DIRT/ DIAM / EXIT (solo se aperta)
    if (c.t===T_WALL) return;
    if (c.t===T_EXIT && !exitOpen) return;

    // Raccogli diamante
    if (c.t===T_DIAM){
      have++; if (diaEl) diaEl.textContent=String(have);
      if (have>=need) exitOpen=true;
    }
    // Scava terra
    if (c.t!==T_EXIT) setT(nx,ny,T_EMPTY);

    // Avvia movimento animato
    player.dirX=dx; player.dirY=dy;
    player.px=player.x; player.py=player.y;
    player.x=nx; player.y=ny;
    moveCounter = MOVE_FRAMES;
    player.moving=true;
  }

  function onKey(e,down){
    var k=e.key||e.code||e.which;
    if (k==='ArrowUp'   || k===38) input.up   = down;
    if (k==='ArrowDown' || k===40) input.down = down;
    if (k==='ArrowLeft' || k===37) input.left = down;
    if (k==='ArrowRight'|| k===39) input.right= down;
    if (k===' ' || k==='Space' || k===32){ if(down){ input.pause=true; } }
  }
  document.addEventListener('keydown', function(e){ onKey(e,true); });
  document.addEventListener('keyup',   function(e){ onKey(e,false); });

  // Pulsanti touch (data-k = ArrowUp/Down/Left/Right/Space)
  function bindButtons(){
    var btns=document.querySelectorAll('.btn[data-k]');
    function synth(k,type){
      try{ document.dispatchEvent(new KeyboardEvent(type,{key:k,code:k,bubbles:true})); }
      catch(_){}
    }
    for (var i=0;i<btns.length;i++){
      (function(b){
        var k=b.getAttribute('data-k');
        b.addEventListener('touchstart',function(e){ synth(k,'keydown'); e.preventDefault(); });
        b.addEventListener('touchend',  function(e){ synth(k,'keyup');   e.preventDefault(); });
        b.addEventListener('mousedown', function(){ synth(k,'keydown'); });
        b.addEventListener('mouseup',   function(){ synth(k,'keyup');   });
        b.addEventListener('mouseleave',function(){ synth(k,'keyup');   });
      })(btns[i]);
    }
  }
  bindButtons();

  // ----------------- Logica Boulder Dash -----------------
  function stepInput(){
    if (input.pause){ paused=!paused; input.pause=false; }
    if (paused || gameOver || !player.alive) return;

    // Se sto animando tra celle, consumo i frame
    if (player.moving){
      moveCounter--;
      if (moveCounter<=0){
        player.moving=false;
        // appena arrivo al centro cella, se ho una direzione pending la provo
        if (player.pending){
          var d=player.pending; player.pending=null;
          press(d);
        } else {
          // se tengo premuto, proseguo nella stessa direzione (classico hold)
          var dir = null;
          if (input.left)  dir={dx:-1,dy:0};
          else if (input.right) dir={dx:1,dy:0};
          else if (input.up)    dir={dx:0,dy:-1};
          else if (input.down)  dir={dx:0,dy:1};
          if (dir) press(dir);
        }
      }
      return;
    }

    // Non sto muovendo: leggi input in ordine preferenza (come BD: orizzontale/verticale equivalente)
    if (input.left)       press({dx:-1,dy:0});
    else if (input.right) press({dx:1,dy:0});
    else if (input.up)    press({dx:0,dy:-1});
    else if (input.down)  press({dx:0,dy:1});
  }

  function stepPhysics(){
    if (paused || gameOver) return;

    // Timer (una volta al secondo)
    tickCount++;
    if (tickCount % TICKS_PER_SEC === 0){
      timeLeft--; if (timeEl) timeEl.textContent=String(timeLeft);
      if (timeLeft<=0){ killPlayer(); }
    }

    // Caduta/rotolamento bottom-up
    var x,y,c,below,br,bl;
    for (y=ROWS-1; y>=0; y--){
      for (x=0; x<COLS; x++){
        c=get(x,y);
        if (c.t===T_ROCK || c.t===T_DIAM){
          below=get(x,y+1);
          if (below.t===T_EMPTY){
            // cade
            set(x,y, {t:T_EMPTY, falling:false});
            set(x,y+1, {t:c.t, falling:true});
            // schiaccia player se sta sotto
            if (player.x===x && player.y===y+2 && player.moving===false){
              killPlayer();
            }
          } else {
            // rotolo su masso/diamante
            if (below.t===T_ROCK || below.t===T_DIAM){
              // prova a destra
              br=get(x+1,y); if (br.t===T_EMPTY && get(x+1,y+1).t===T_EMPTY){
                set(x,y,{t:T_EMPTY,falling:false});
                set(x+1,y,{t:c.t,falling:true});
                continue;
              }
              // prova a sinistra
              bl=get(x-1,y); if (bl.t===T_EMPTY && get(x-1,y+1).t===T_EMPTY){
                set(x,y,{t:T_EMPTY,falling:false});
                set(x-1,y,{t:c.t,falling:true});
                continue;
              }
            }
            // altrimenti si ferma
            c.falling=false;
          }
        }
      }
    }

    // Entrare nell’uscita -> reload livello (semplice)
    if (exitOpen && get(player.x,player.y).t===T_EXIT){
      paused=true;
      setTimeout(function(){
        paused=false;
        loadLevel(levelSel.selectedIndex|0);
      }, 600);
    }
  }

  function killPlayer(){
    if (!player.alive) return;
    player.alive=false; lives--; if (livesEl) livesEl.textContent=String(lives);
    if (lives<=0){ gameOver=true; return; }
    setTimeout(function(){
      player.alive=true;
      loadLevel(levelSel.selectedIndex|0);
    }, 600);
  }

  // ----------------- Render -----------------
  function rect(x,y,w,h,fill,stroke){
    if (fill){ ctx.fillStyle=fill; ctx.fillRect(x,y,w,h); }
    if (stroke){ ctx.strokeStyle=stroke; ctx.strokeRect(x,y,w,h); }
  }
  function drawTile(t,x,y){
    var px=x*TILE, py=y*TILE;
    if (t===T_EMPTY){ rect(px,py,TILE,TILE,"#000"); }
    else if (t===T_DIRT){ rect(px,py,TILE,TILE,"#0b1a2a"); ctx.fillStyle="#10283f";
      ctx.fillRect(px+3,py+3,4,4); ctx.fillRect(px+10,py+8,5,4); ctx.fillRect(px+16,py+14,4,4); }
    else if (t===T_WALL){ rect(px,py,TILE,TILE,"#24324f","#3c4f7a");
      ctx.strokeStyle="#3c4f7a"; ctx.beginPath();
      ctx.moveTo(px,py+TILE/2); ctx.lineTo(px+TILE,py+TILE/2);
      ctx.moveTo(px+TILE/2,py); ctx.lineTo(px+TILE/2,py+TILE); ctx.stroke(); }
    else if (t===T_ROCK){ rect(px,py,TILE,TILE,"#394b6e","#516a99"); rect(px+5,py+5,TILE-10,TILE-10,"#4a628f"); }
    else if (t===T_DIAM){ rect(px,py,TILE,TILE,"#0c1220"); ctx.fillStyle="#37e0ff";
      ctx.beginPath(); ctx.moveTo(px+TILE/2,py+3); ctx.lineTo(px+TILE-3,py+TILE/2);
      ctx.lineTo(px+TILE/2,py+TILE-3); ctx.lineTo(px+3,py+TILE/2); ctx.closePath(); ctx.fill(); }
    else if (t===T_EXIT){
      rect(px,py,TILE,TILE, exitOpen? "#1aa36f" : "#422b2b", "#62d9ac");
      if (!exitOpen){ ctx.strokeStyle="#813d3d"; ctx.beginPath(); ctx.moveTo(px+4,py+4); ctx.lineTo(px+TILE-4,py+TILE-4); ctx.stroke(); }
    }
  }
  function render(){
    rect(0,0,W,H,"#000");
    // background tiles
    for (var y=0;y<ROWS;y++) for (var x=0;x<COLS;x++) drawTile(grid[y][x].t,x,y);

    // player interpolato
    var fx=player.px, fy=player.py;
    if (player.moving){
      var t = 1 - (moveCounter / MOVE_FRAMES); // 0..1
      fx = player.px + player.dirX * t;
      fy = player.py + player.dirY * t;
    } else {
      fx = player.x; fy = player.y;
    }
    var px=fx*TILE, py=fy*TILE;
    rect(px,py,TILE,TILE,"#ffd54a","#ffe28a");
    rect(px+8,py+6,3,3,"#000"); rect(px+13,py+6,3,3,"#000");
  }

  // ----------------- Loop -----------------
  function loop(){
    stepInput();
    // la fisica la eseguo sempre alla stessa frequenza percepita
    stepPhysics();
    render();
    raf(loop);
  }
  loop();

  // ----------------- UI -----------------
  if (btnPlay) btnPlay.addEventListener('click', function(){ loadLevel(levelSel.selectedIndex|0); });

})();
