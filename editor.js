// editor.js — ES5 editor livelli 20x14
(function(){
  var COLS=20, ROWS=14;
  var gridEl = document.getElementById('grid');
  var io = document.getElementById('io');
  var lvlName = document.getElementById('lvlName');
  var lvlNeed = document.getElementById('lvlNeed');
  var current = " "; // tile selezionato
  var down = false;

  // palette
  var chips = document.querySelectorAll('.chip');
  function setActiveChip(ch){
    for (var i=0;i<chips.length;i++){ chips[i].className = chips[i].className.replace(' active',''); }
    ch.className += ' active';
    current = ch.getAttribute('data-t');
  }
  for (var i=0;i<chips.length;i++){
    (function(ch){ ch.addEventListener('click', function(){ setActiveChip(ch); }); })(chips[i]);
  }
  setActiveChip(chips[0]);

  // modello
  var map = [];
  function initMap(){
    map = [];
    for (var r=0;r<ROWS;r++){
      var row = "";
      for (var c=0;c<COLS;c++) row += " ";
      map.push(row);
    }
  }
  function setCell(x,y,ch){
    var row = map[y];
    map[y] = row.substr(0,x) + ch + row.substr(x+1);
  }

  // UI grid
  function buildGrid(){
    gridEl.innerHTML = "";
    for (var y=0;y<ROWS;y++){
      for (var x=0;x<COLS;x++){
        (function(xx,yy){
          var cell = document.createElement('div');
          cell.className = 'cell';
          cell.setAttribute('data-x', xx); cell.setAttribute('data-y', yy);
          cell.title = xx+','+yy;
          cell.onmousedown = function(e){ down = true; paint(cell, xx, yy); };
          cell.onmouseover = function(e){ if (down) paint(cell, xx, yy); };
          cell.ontouchstart = function(e){ paint(cell, xx, yy); e.preventDefault(); };
          gridEl.appendChild(cell);
        })(x,y);
      }
    }
    document.body.onmouseup = function(){ down=false; };
  }
  function paint(cell, x, y){
    // permetti un solo 'P'
    if (current==='P'){
      // cancella P esistenti
      for (var r=0;r<ROWS;r++){
        for (var c=0;c<COLS;c++){
          if (map[r].charAt(c)==='P') setCell(c,r,' ');
        }
      }
    }
    setCell(x,y,current);
    cell.textContent = current===' ' ? '' : current;
  }

  function refreshCells(){
    var cells = gridEl.children;
    var i=0;
    for (var y=0;y<ROWS;y++){
      for (var x=0;x<COLS;x++){
        var ch = map[y].charAt(x);
        cells[i].textContent = ch===' ' ? '' : ch;
        i++;
      }
    }
  }

  // tools
  document.getElementById('btnClear').onclick = function(){ initMap(); refreshCells(); };
  document.getElementById('btnWalls').onclick = function(){
    for (var x=0;x<COLS;x++){ setCell(x,0,'#'); setCell(x,ROWS-1,'#'); }
    for (var y=0;y<ROWS;y++){ setCell(0,y,'#'); setCell(COLS-1,y,'#'); }
    refreshCells();
  };
  document.getElementById('btnSetPlayer').onclick = function(){ current='P'; };
  document.getElementById('btnSave').onclick = function(){
    try {
      var L = {name: String(lvlName.value||'Custom Level'), need: parseInt(lvlNeed.value||'6',10), map: map.slice(0)};
      var arr = [];
      try { arr = JSON.parse(localStorage.getItem('caveminer_levels')||'[]'); } catch(_){ arr=[]; }
      arr.push(L);
      localStorage.setItem('caveminer_levels', JSON.stringify(arr));
      alert('Livello salvato! Apri il gioco: apparirà nel selettore.');
    } catch(e){ alert('Errore salvataggio: '+e); }
  };
  document.getElementById('btnExport').onclick = function(){
    io.value = JSON.stringify([{name:String(lvlName.value||'Custom Level'), need: parseInt(lvlNeed.value||'6',10), map: map.slice(0)}], null, 2);
  };
  document.getElementById('btnImport').onclick = function(){
    try {
      var arr = JSON.parse(io.value);
      if (!(arr && arr.length)) throw new Error('JSON vuoto');
      var L = arr[0];
      if (!(L.map && L.map.length===14)) throw new Error('mappa non 20x14');
      map = L.map.slice(0);
      lvlName.value = L.name || 'Custom Level';
      lvlNeed.value = L.need || 6;
      refreshCells();
    } catch(e){ alert('Errore import: '+e.message); }
  };

  // init
  initMap(); buildGrid(); refreshCells();
})();