/* Tablero v5.1 — portada partida (sujetos+alertas | mapa de territorialidades),
   drill-down Sujeto → Dimensión → Derecho → Instrumentos, y cápsula de alertas. */
let D=null, G=null, T=null, F=null;
const S = { nivel:'inicio', sujeto:null, dimension:null, derecho:null,
            capa:'zrc', pestMapa:'terr', alFiltro:{nivel:'',derecho:'',sujeto:''}, zoom:null,
            fuente:'compras', metrica:'ha', filtros:{} };

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const arr = x => Array.isArray(x) ? x : [];
const num = n => new Intl.NumberFormat('es-CO').format(Math.round(n||0));
const noAc = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

Promise.all([
  fetch('datos.json').then(r=>r.json()),
  fetch('geo.json').then(r=>r.json()),
  fetch('territorialidades.json').then(r=>r.json()).catch(()=>({})),
  fetch('fondo.json').then(r=>r.json()).catch(()=>null)
]).then(([d,g,t,f])=>{ D=d; G=g; T=t; F=f; render(); })
 .catch(e=>{ $('#app').innerHTML=`<p class="vacio">No se pudieron cargar los datos: ${esc(e.message)}</p>`; });

/* ---------- filtros de instrumentos ---------- */
function instrumentos(suj,dim,der){
  return arr(D.instrumentos).filter(it=>{
    if(suj){ if(!(arr(suj.match).some(x=>it.sujetos.includes(x)) || it.sujetos.includes('Todos'))) return false; }
    if(dim){ if(!it.dimensiones.some(x=>noAc(x)===noAc(dim.n))) return false; }
    if(der){ if(!it.derechos.includes(der.n)) return false; }
    return true;
  });
}
/* dimensiones de un sujeto. La dimensión cultural se llama "Cultural-ancestral" para los
   pueblos étnicos y solo "Cultural" para el campesinado y los demás sujetos. */
function nombreDim(dm, suj){
  if(dm.nAlt && suj && !suj.etnico) return dm.nAlt;
  return dm.n;
}
function dimensionesDe(suj){
  const excl = arr(suj && suj.sinDimension).map(noAc);
  return arr(D.dimensiones).filter(dm=>!excl.includes(noAc(dm.n)) && !excl.includes(noAc(dm.k)));
}
const SUB_DER = {1:'tierra',2:'territorio',3:'agua',4:'vivirbien',5:'conocimiento',6:'economia',7:'credito',8:'etnico'};
const derDeResp = r => SUB_DER[parseInt(String(r.subsistema).split('.')[0])] || '';

/* ---------- navegación ---------- */
function ir(nivel,extra={}){ Object.assign(S,{nivel},extra); render(); window.scrollTo({top:0,behavior:'smooth'}); }
function ruta(){
  const m=[{t:'Inicio',on:()=>ir('inicio',{sujeto:null,dimension:null,derecho:null})}];
  if(S.nivel==='alertas') m.push({t:'Alertas',on:()=>{}});
  if(S.nivel==='territorialidades') m.push({t:'Territorialidades',on:()=>{}});
  if(S.nivel==='guia') m.push({t:'Guía de palabras',on:()=>{}});
  if(S.sujeto) m.push({t:S.sujeto.n,on:()=>ir('dimensiones',{dimension:null,derecho:null})});
  if(S.dimension) m.push({t:nombreDim(S.dimension,S.sujeto),on:()=>ir('derechos',{derecho:null})});
  if(S.derecho) m.push({t:S.derecho.n,on:()=>{}});
  const R=$('#ruta');
  if(m.length<=1){ R.innerHTML=''; return; }
  R.innerHTML=m.map((x,i)=>`${i?'<span class="sep">›</span>':''}<button class="mig ${i===m.length-1?'actual':''}" data-i="${i}">${esc(x.t)}</button>`).join('');
  $$('#ruta .mig').forEach(b=>b.onclick=()=>m[+b.dataset.i].on());
}
function render(){ ruta();
  ({inicio:vInicio,alertas:vAlertas,territorialidades:vTerritorialidades,guia:vGuia,
    dimensiones:vDimensiones,derechos:vDerechos,herramienta:vHerramienta}[S.nivel]||vInicio)();
  bristol(); }

/* ================= GUÍA: qué significa cada palabra ================= */
function vGuia(){
  const g = arr(D.guia);
  $('#app').innerHTML = `
    <div class="guia-cab">
      <h2>📖 ¿Qué quiere decir cada palabra?</h2>
      <p>Aquí explicamos, en palabras sencillas, las figuras que aparecen en el tablero:
        qué son, para qué sirven y qué norma las respalda. Toque una tarjeta para desplegarla.</p>
      <input id="gBuscar" class="g-buscar" placeholder="Buscar: ZRC, resguardo, baldío…">
    </div>
    <div class="guia-rej" id="guiaRej"></div>`;
  const pintar = (txt='') => {
    const t = noAc(txt);
    const vis = g.filter(f => !t || noAc(f.nombre+' '+f.quees+' '+f.clave).includes(t));
    $('#guiaRej').innerHTML = vis.length ? vis.map((f,i)=>`
      <details class="gf anim" style="--d:${i*35}ms">
        <summary><span class="gf-emo">${f.emoji}</span>
          <span class="gf-n">${esc(f.nombre)}</span><span class="gf-mas">+</span></summary>
        <div class="gf-cuerpo">
          <div class="gf-b"><label>¿Qué es?</label><p>${esc(f.quees)}</p></div>
          <div class="gf-b"><label>¿Para qué sirve?</label><p>${esc(f.paraque)}</p></div>
          ${f.ojo?`<div class="gf-ojo"><b>Ojo:</b> ${esc(f.ojo)}</div>`:''}
          ${f.ejemplo?`<div class="gf-b"><label>Un ejemplo</label><p>${esc(f.ejemplo)}</p></div>`:''}
          <div class="gf-pie">
            <div><b>Norma:</b> ${esc(f.norma)}</div>
            ${f.quien?`<div><b>Quién lo tramita:</b> ${esc(f.quien)}</div>`:''}
          </div>
        </div>
      </details>`).join('') : '<p class="vacio">No encontramos esa palabra. Pruebe con otra.</p>';
  };
  pintar();
  $('#gBuscar').oninput = e => pintar(e.target.value);
}

/* ================= INICIO: dos columnas ================= */
function vInicio(){
  const al = alertasUtiles();
  const cards = arr(D.sujetos).map((su,i)=>{
    const n=instrumentos(su).length;
    return `<button class="card-suj anim" style="--d:${i*55}ms" data-suj="${su.k}">
      <span class="csi" style="background-image:url('img/${su.img||su.k}.jpg')"></span>
      <span class="txt"><b>${esc(su.n)}</b><small>${n} instrumento${n!==1?'s':''}</small></span>
      <span class="flecha">→</span></button>`;
  }).join('');

  $('#app').innerHTML = `
   <div class="inicio2">
     <div class="col-izq">
       <button class="btn-alertas anim" id="btnAl">
         <span class="ba-ico">🚨</span>
         <span class="ba-txt"><b>Alertas del territorio</b>
           <small>${al.total} registradas · ${al.conPorque} con explicación</small></span>
         <span class="ba-pts">${['rojo','naranja','gris','verde'].map(n=>
           al.porNivel[n]?`<i class="pt ${n}" title="${n}">${al.porNivel[n]}</i>`:'').join('')}</span>
       </button>

       <button class="btn-guia anim" id="btnGuia">
         <span class="bg-ico">📖</span>
         <span class="bg-txt"><b>¿Qué quiere decir cada palabra?</b>
           <small>ZRC, TECAM, APPA, resguardo, baldío… explicado sencillo</small></span>
         <span class="flecha">→</span>
       </button>

       <div class="seccion-tit">Sujetos populares del campo</div>
       <div class="lista-suj">${cards}</div>
     </div>

     <div class="col-der">
       <div class="mapa-panel anim">
         <div class="pest-mapa">
           <button class="pest ${S.pestMapa==='terr'?'on':''}" data-p="terr">🗺️ Territorialidades y APPA</button>
           <button class="pest ${S.pestMapa==='fondo'?'on':''}" data-p="fondo">🌱 Gestión del Fondo de Tierras</button>
         </div>
         <div id="cuerpoMapa"></div>
       </div>
     </div>
   </div>

   <div class="seccion-tit">Hitos de la reforma agraria</div>
   <p class="guia-hitos">${esc(D.hitosIntro||'')} Cada tarjeta reúne las cifras de un frente de la política agraria.</p>
   <div class="hitos-rej" id="hitosRej"></div>
   <p class="hitos-fte">Fuente: ${esc(D.hitosFuente||'')}</p>
   <div class="creditos" id="creditos"></div>`;

  $$('#app .card-suj').forEach(b=>b.onclick=()=>{ S.sujeto=D.sujetos.find(x=>x.k===b.dataset.suj); ir('dimensiones'); });
  $('#btnAl').onclick=()=>ir('alertas');
  $('#btnGuia').onclick=()=>ir('guia');
  $$('#app .pest').forEach(b=>b.onclick=()=>{ S.pestMapa=b.dataset.p;
    $$('#app .pest').forEach(x=>x.classList.toggle('on',x===b)); cuerpoMapa(); });
  cuerpoMapa();
  pintarHitos('#hitosRej'); pintarCreditos('#creditos');
}
function cuerpoMapa(){
  if(S.pestMapa==='fondo'){ vistaFondo('#cuerpoMapa'); return; }
  $('#cuerpoMapa').innerHTML = `
    <div class="mapa-cab2"><span>Elija una capa; pase el cursor sobre el mapa.</span>
      <button class="ver-todo" id="verTerr">Ver detalle →</button></div>
    <div class="capas" id="capas"></div>
    <div class="mapa-caja" id="mapaBox"></div>
    <div class="mapa-pie" id="mapaPie"></div>`;
  $('#verTerr').onclick=()=>ir('territorialidades');
  pintarCapas('#capas'); pintarMapa('#mapaBox','#mapaPie');
}

/* ============ GESTIÓN DEL FONDO DE TIERRAS: Excel espacializado ============ */
const ETIQ = {
  tipo_proceso:'Tipo de proceso', vigencia:'Vigencia', beneficiario:'Tipo de beneficiario',
  reporte:'Reporte de comprados', estado:'Estado del procedimiento', recibido:'Recibido por la ANT',
  entrega:'Entrega material del predio', situacion:'Situación jurídica', beneficio:'Tipo de beneficio',
  departamento:'Departamento', municipio:'Municipio', entidad:'Entidad receptora', zona:'Zona',
  marco:'Marco legal', anio:'Año', tipo_predio:'Tipo de predio', decision:'Tipo de decisión',
  ha:'Hectáreas', predios:'Predios', familias:'Familias beneficiadas', mujeres:'Beneficiarias mujeres'
};
/* filtros que se ofrecen por fuente (los de más peso analítico primero) */
const FILTROS = {
  compras: ['beneficio','situacion','departamento','municipio'],
  sae:     ['departamento','municipio'],
  procesos:['tipo_proceso','departamento','municipio'],
};
function fuenteFT(){ return (F||{})[S.fuente] || null; }
/* filas que pasan los filtros activos */
function filasFT(){
  const f = fuenteFT(); if(!f) return [];
  const act = Object.entries(S.filtros).filter(([k,v])=>v!=='' && v!=null && f.cats.includes(k));
  return f.filas.filter(fila => act.every(([k,v]) => f.dic[k][fila[1+f.cats.indexOf(k)]] === v));
}
const valFT = (f,fila,campo) => {
  const i = f.nums.indexOf(campo);
  return i<0 ? 0 : (fila[1+f.cats.length+i] || 0);
};
function vistaFondo(sel){
  const f = fuenteFT();
  if(!f){ $(sel).innerHTML='<p class="vacio">No se pudo cargar la gestión del Fondo de Tierras.</p>'; return; }
  const fuentes = Object.keys(F).map(k=>`<button class="fte ${S.fuente===k?'on':''}" data-f="${k}">${esc(F[k].nombre)}</button>`).join('');
  // métricas: solo las que traen datos (la fuente puede tener la columna vacía, p. ej. predios en 0)
  const conDato = f.nums.filter(n=>f.filas.some(fila=>valFT(f,fila,n)>0));
  if(!conDato.includes(S.metrica)) S.metrica = conDato[0] || f.nums[0];
  const metricas = conDato.map(n=>`<button class="met ${S.metrica===n?'on':''}" data-m="${n}">${esc(ETIQ[n]||n)}</button>`).join('');
  // municipio en cascada: solo los del departamento elegido (y solo los que sobreviven a los demás filtros)
  const iDep=f.cats.indexOf('departamento'), iMun=f.cats.indexOf('municipio');
  const munVisibles = (()=>{
    if(iMun<0) return null;
    const act = Object.entries(S.filtros).filter(([k,v])=>v && k!=='municipio' && f.cats.includes(k));
    const s = new Set();
    f.filas.forEach(fila=>{
      if(!act.every(([k,v])=>f.dic[k][fila[1+f.cats.indexOf(k)]]===v)) return;
      s.add(f.dic.municipio[fila[1+iMun]]);
    });
    return s;
  })();
  const filtros = FILTROS[S.fuente].filter(c=>f.cats.includes(c)).map(c=>{
    let vals = f.dic[c].map((v,i)=>({v,i})).filter(x=>x.v);
    if(c==='municipio' && munVisibles) vals = vals.filter(x=>munVisibles.has(x.v));
    vals.sort((a,b)=>a.v.localeCompare(b.v));
    if(vals.length<2 && c!=='municipio') return '';
    const depSel = S.filtros.departamento;
    const etq = c==='municipio' && depSel ? `Municipio (${esc(depSel)})` : (ETIQ[c]||c);
    return `<label class="ft-f"><span>${esc(etq)}</span>
      <select data-cat="${c}"><option value="">${c==='municipio'?`Todos (${vals.length})`:'Todos'}</option>
      ${vals.map(x=>`<option ${S.filtros[c]===x.v?'selected':''}>${esc(x.v)}</option>`).join('')}</select></label>`;
  }).join('');
  const hayF = Object.values(S.filtros).some(v=>v);
  $(sel).innerHTML = `
    <div class="ft-fuentes">${fuentes}</div>
    <div class="ft-filtros">${filtros}
      ${hayF?'<button class="ft-limpiar" id="ftLimpiar">↺ Quitar filtros</button>':''}</div>
    <div class="ft-metricas"><span>Pintar el mapa por:</span>${metricas}</div>
    <div class="mapa-zona"><div class="mapa-caja" id="mapaFondo"></div>
      <div class="panel-cifras oculto" id="panelCifras"></div></div>
    <div class="mapa-pie" id="pieFondo"></div>`;
  $$(sel+' .fte').forEach(b=>b.onclick=()=>{ S.fuente=b.dataset.f; S.filtros={};
    S.metrica=(F[S.fuente].nums[0]||'ha'); vistaFondo(sel); });
  $$(sel+' .met').forEach(b=>b.onclick=()=>{ S.metrica=b.dataset.m; vistaFondo(sel); });
  $$(sel+' select[data-cat]').forEach(s=>s.onchange=()=>{
    S.filtros[s.dataset.cat]=s.value;
    // al cambiar de departamento, el municipio elegido puede no pertenecerle
    if(s.dataset.cat==='departamento') S.filtros.municipio='';
    vistaFondo(sel);
  });
  const lim=$('#ftLimpiar'); if(lim) lim.onclick=()=>{ S.filtros={}; vistaFondo(sel); };
  pintarMapaFondo('#mapaFondo','#pieFondo');
}
function pintarMapaFondo(selMapa, selPie){
  const f = fuenteFT(); const filas = filasFT();
  // agregar por municipio
  const porMun = {}; let total=0, nPredios=0;
  filas.forEach(fila=>{
    const cod=fila[0], v=valFT(f,fila,S.metrica);
    porMun[cod]=(porMun[cod]||0)+v; total+=v; nPredios++;
  });
  const vals = Object.values(porMun).filter(v=>v>0);
  const max = vals.length?Math.max(...vals):1;
  const esc5 = v => { const t=Math.sqrt(v/max); return t; };   // raíz: evita que un municipio aplaste al resto
  const base = Object.values(G.dptos||{}).map(d=>`<path class="dp" d="${d}"/>`).join('');
  const col = F[S.fuente].color;
  const capa = Object.keys(porMun).map(cod=>{
    const g=(G.mpios||{})[cod]; if(!g||!porMun[cod]) return '';
    return `<path class="mf" d="${g.d}" fill="${col}" fill-opacity="${(0.18+esc5(porMun[cod])*0.82).toFixed(2)}" data-cod="${cod}"/>`;
  }).join('');
  const I=G.inset||[22,22,250,150];
  const islas = Object.keys(G.sai||{}).map(k=>`<path class="dp" d="${G.sai[k]}"/>`).join('');
  const etiq = Object.values(G.sai_labels||{}).map(l=>
    `<text x="${l.x}" y="${l.y}" text-anchor="middle" class="isl-lab">${esc(l.t)}</text>`).join('');
  // zoom cuando hay filtro territorial: encuadra los municipios visibles
  const tr = zoomFondo(Object.keys(porMun));
  $(selMapa).innerHTML = `<svg viewBox="0 0 ${G.vb[0]} ${G.vb[1]}">
      <g class="g-zoom" style="transform:${tr}"><g>${base}</g><g>${capa}</g></g>
      <g><rect class="inset-b" x="${I[0]}" y="${I[1]}" width="${I[2]}" height="${I[3]}" rx="10"/>${islas}${etiq}</g></svg>`;
  const uni = S.metrica==='ha'?'hectáreas':(ETIQ[S.metrica]||S.metrica).toLowerCase();
  $(selPie).innerHTML = `<b>${num(total)}</b> ${esc(uni)} · ${num(nPredios)} registro${nPredios!==1?'s':''}
     en <b>${Object.keys(porMun).length}</b> municipios`;
  panelCifras(f, filas);
  // nombres de municipio para el tooltip
  const nomMun = {}; const iMun=f.cats.indexOf('municipio'), iDep=f.cats.indexOf('departamento');
  filas.forEach(fila=>{ if(!nomMun[fila[0]]) nomMun[fila[0]] =
    [f.dic.municipio?f.dic.municipio[fila[1+iMun]]:'', f.dic.departamento?f.dic.departamento[fila[1+iDep]]:''];});
  const tip=$('#tip');
  $$(`${selMapa} path.mf`).forEach(p=>{
    p.onmousemove=e=>{ const cod=p.dataset.cod, n=nomMun[cod]||['',''];
      tip.innerHTML=`<b>${esc(n[0]||cod)}</b><br>${esc(n[1]||'')}<br>${num(porMun[cod])} ${esc(uni)}`;
      tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px'; tip.style.opacity=1; };
    p.onmouseleave=()=>tip.style.opacity=0;
  });
}
/* ---- zoom: al filtrar departamento o municipio, encuadra lo que quedó visible ---- */
function centroide(cod){ const g=(G.mpios||{})[cod]; return g && g.c ? g.c : null; }
function zoomFondo(codigos){
  if(!(S.filtros.departamento || S.filtros.municipio)) return 'none';
  const pts = codigos.map(centroide).filter(Boolean);
  if(!pts.length) return 'none';
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
  const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
  const cx=(x0+x1)/2, cy=(y0+y1)/2;
  const m = 120;                                  // margen para que no quede pegado al borde
  const k = Math.max(1, Math.min(6, Math.min(G.vb[0]/(x1-x0+m), G.vb[1]/(y1-y0+m))));
  return `translate(${(G.vb[0]/2 - cx*k).toFixed(1)}px, ${(G.vb[1]/2 - cy*k).toFixed(1)}px) scale(${k.toFixed(2)})`;
}
/* ---- panel emergente con las cifras de la selección ---- */
const CIFRAS = [
  {k:'ha',       n:'Hectáreas'},
  {k:'predios',  n:'Predios'},
  {k:'familias', n:'Familias beneficiadas'},
  {k:'mujeres',  n:'Beneficiarias mujeres'},
];
function panelCifras(f, filas){
  const el = $('#panelCifras'); if(!el) return;
  const dep = S.filtros.departamento, mun = S.filtros.municipio;
  if(!dep && !mun){ el.classList.add('oculto'); el.innerHTML=''; return; }
  const tot = {};
  CIFRAS.forEach(c=>{ if(f.nums.includes(c.k))
    tot[c.k] = filas.reduce((a,fila)=>a+valFT(f,fila,c.k),0); });
  const municipios = new Set(filas.map(x=>x[0])).size;
  el.classList.remove('oculto');
  el.innerHTML = `
    <div class="pc-cab"><div class="pc-lugar">${esc(mun||dep)}</div>
      ${mun?`<div class="pc-dep">${esc(dep||'')}</div>`:`<div class="pc-dep">${municipios} municipio${municipios!==1?'s':''}</div>`}
      <button class="pc-x" id="pcX" title="Quitar el filtro territorial">✕</button></div>
    <div class="pc-cifras">
      ${CIFRAS.filter(c=>tot[c.k]!==undefined).map(c=>`
        <div class="pc-it ${tot[c.k]?'':'vacia'}">
          <div class="pc-n">${tot[c.k]?num(tot[c.k]):'—'}</div>
          <div class="pc-l">${esc(c.n)}</div></div>`).join('')}
    </div>
    <div class="pc-pie">${num(filas.length)} registro${filas.length!==1?'s':''} · ${esc(F[S.fuente].nombre)}</div>`;
  const x=$('#pcX'); if(x) x.onclick=()=>{ S.filtros.departamento=''; S.filtros.municipio=''; vistaFondo('#cuerpoMapa'); };
}

/* créditos de las fotografías: las licencias CC BY-SA exigen atribución */
function pintarCreditos(sel){
  const el=$(sel); if(!el) return;
  fetch('img/creditos.json').then(r=>r.json()).then(c=>{
    const l=Object.values(c).map(x=>
      `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.titulo.replace(/\.(jpg|jpeg|png)$/i,''))}</a>` +
      ` · ${esc(x.autor||'autor no indicado')} · ${esc(x.licencia)}`).join(' &nbsp;|&nbsp; ');
    el.innerHTML = `<b>Fotografías:</b> Wikimedia Commons — ${l}`;
  }).catch(()=>{ el.innerHTML=''; });
}
/* ---------- hitos: tarjetas con gráfica animada ----------
   Cada tarjeta lleva UN color (es magnitud, no categorías que compitan).
   Las cifras que comparten unidad se comparan en barras; el resto van con
   contador animado. Todo arranca al entrar en pantalla y se queda quieto. */
const numDe = s => { // "826.734,9" -> 826734.9 ; "$22" -> 22 ; "7 %–8 %" -> 7
  const m = String(s).replace(/[^\d.,–-]/g,'').split(/[–-]/)[0];
  const v = parseFloat(m.replace(/\./g,'').replace(',','.'));
  return isNaN(v) ? null : v;
};
/* Sin barras comparativas: estas cifras son de frentes distintos y no se comparan
   entre sí. Cada dato es una tarjeta con su número creciendo y una línea de
   progreso que solo acompaña el conteo (llega siempre al 100%). */
function pintarHitos(sel){
  $(sel).innerHTML = arr(D.hitosGrupos).map((gr,gi)=>`
    <div class="ht anim" style="--d:${gi*50}ms;--c:${gr.color}">
      <div class="ht-cab"><span class="ht-emo">${gr.emoji}</span>
        <div><h4>${esc(gr.titulo)}</h4><small>${esc(gr.guia||'')}</small></div></div>
      ${gr.items.map((it,k)=>{ const v=numDe(it.c);
        return `<div class="ht-it" style="--k:${k*90}ms">
          <div class="ht-c">${v!=null?`<span class="cnt" data-n="${v}" data-txt="${esc(it.c)}">0</span>`:esc(it.c)}
            <span class="ht-u">${esc(it.u)}</span></div>
          <div class="ht-t">${esc(it.t)}</div>
          <div class="ht-linea"><i></i></div>
        </div>`; }).join('')}
    </div>`).join('');
  animarAlVer(sel);
}
/* dispara la animación cuando la tarjeta entra en pantalla; luego la deja quieta */
function animarAlVer(sel){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tarjetas = $$(sel+' .ht');
  const arrancar = t => {
    if(t.dataset.listo) return; t.dataset.listo='1';
    t.classList.add('ver');
    t.querySelectorAll('.cnt,.ht-b-val').forEach(e=>contar(e, reduce));
  };
  if(reduce || !('IntersectionObserver' in window)){ tarjetas.forEach(arrancar); return; }
  const io = new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){ arrancar(e.target); io.unobserve(e.target); }
  }), { threshold:0.28 });
  tarjetas.forEach(t=>io.observe(t));
}
function contar(el, reduce){
  const fin = parseFloat(el.dataset.n); if(isNaN(fin)) return;
  const txt = el.dataset.txt;                       // formato original ("826.734,9", "$22")
  const dec = (txt||'').includes(',') ? 1 : 0;
  const fmt = v => {
    const s = v.toLocaleString('es-CO',{minimumFractionDigits:dec, maximumFractionDigits:dec});
    return txt ? txt.replace(/[\d.,]+/, s) : s;     // conserva $ y %
  };
  if(reduce){ el.textContent = fmt(fin); return; }
  const dur = 1100, t0 = performance.now();
  const paso = t => {
    const p = Math.min(1, (t-t0)/dur);
    const e = 1 - Math.pow(1-p, 3);                 // desacelera al final
    el.textContent = fmt(fin*e);
    if(p<1) requestAnimationFrame(paso); else el.textContent = fmt(fin);
  };
  requestAnimationFrame(paso);
}

/* ---------- mapa de territorialidades ---------- */
const CAPAS = () => Object.keys(T||{}).map(k=>({k, ...T[k]}));
function pintarCapas(sel){
  $(sel).innerHTML = CAPAS().map(c=>`<button class="capa ${S.capa===c.k?'on':''}" data-c="${c.k}">
    <i style="background:${c.color}"></i>${esc(c.nombre.replace(/\s*\(.*?\)\s*/,''))}
    <b>${c.tipo==='municipios'?c.n+' mpios':num(c.n)}</b></button>`).join('');
  $$(sel+' .capa').forEach(b=>b.onclick=()=>{ S.capa=b.dataset.c; pintarCapas(sel); pintarMapa('#mapaBox','#mapaPie'); });
}
function pintarMapa(selMapa, selPie){
  const c = (T||{})[S.capa]; if(!c || !G) return;
  const base = Object.values(G.dptos||{}).map(d=>`<path class="dp" d="${d}"/>`).join('');
  let capa='', resumen='';
  if(c.tipo==='municipios'){
    const mm=c.municipios||{};
    capa = Object.keys(mm).map(cod=>{
      const g=(G.mpios||{})[cod]; if(!g) return '';
      return `<path class="mm" d="${g.d}" fill="${c.color}" data-cod="${cod}"/>`;
    }).join('');
    resumen = `<b>${num(c.total_ha)} hectáreas</b> en ${c.n} municipios · ${esc(c.nombre)}`;
  } else {
    capa = arr(c.items).map((it,i)=>`<path class="tt" d="${it.d}" fill="${c.color}" data-i="${i}"/>`).join('');
    const ha = arr(c.items).reduce((a,x)=>a+(x.ha||0),0);
    resumen = `<b>${num(c.n)}</b> ${esc(c.nombre)}${ha?` · ${num(ha)} hectáreas`:''}`;
  }
  const I=G.inset||[22,22,196,214];
  const islas = Object.keys(G.sai||{}).map(k=>`<path class="dp" d="${G.sai[k]}"/>`).join('');
  $(selMapa).innerHTML = `<svg viewBox="0 0 ${G.vb[0]} ${G.vb[1]}" id="svgMapa">
      <g>${base}</g><g>${capa}</g>
      <g><rect class="inset-b" x="${I[0]}" y="${I[1]}" width="${I[2]}" height="${I[3]}" rx="10"/>${islas}</g>
    </svg>`;
  $(selPie).innerHTML = resumen;
  const tip=$('#tip');
  $$(`${selMapa} path.tt`).forEach(p=>{
    p.onmousemove=e=>{ const it=c.items[+p.dataset.i]; if(!it) return;
      tip.innerHTML=`<b>${esc(it.n||'—')}</b>${it.ha?`<br>${num(it.ha)} ha`:''}${it.mun?`<br>${esc(it.mun)}`:''}`;
      tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px'; tip.style.opacity=1; };
    p.onmouseleave=()=>tip.style.opacity=0;
  });
  $$(`${selMapa} path.mm`).forEach(p=>{
    p.onmousemove=e=>{ const m=(c.municipios||{})[p.dataset.cod]; if(!m) return;
      tip.innerHTML=`<b>${esc(m.mun)}</b><br>${esc(m.dep)}<br>${num(m.ha)} ha en APPA`;
      tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px'; tip.style.opacity=1; };
    p.onmouseleave=()=>tip.style.opacity=0;
  });
}

/* ---------- vista territorialidades ampliada ---------- */
function vTerritorialidades(){
  $('#app').innerHTML = `
    <p class="intro">Mapa de las <b>territorialidades</b> del campo y de las áreas para la
      <b>seguridad alimentaria</b>. Elija una capa; pase el cursor sobre el mapa para ver cada territorio.</p>
    <div class="terr-full">
      <div class="capas grande" id="capas2"></div>
      <div class="mapa-caja grande" id="mapaBox2"></div>
      <div class="mapa-pie" id="mapaPie2"></div>
      <div id="listaTerr"></div>
    </div>`;
  pintarCapas('#capas2'); pintarMapa('#mapaBox2','#mapaPie2'); listaTerr();
  const obs=()=>{ pintarMapa('#mapaBox2','#mapaPie2'); listaTerr(); };
  $$('#capas2 .capa').forEach(b=>b.onclick=()=>{ S.capa=b.dataset.c; pintarCapas('#capas2'); obs(); });
}
function listaTerr(){
  const c=(T||{})[S.capa]; if(!c) return;
  let filas;
  if(c.tipo==='municipios'){
    filas = Object.entries(c.municipios||{}).sort((a,b)=>b[1].ha-a[1].ha).slice(0,40)
      .map(([cod,m])=>`<tr><td>${esc(m.mun)}</td><td>${esc(m.dep)}</td><td class="n">${num(m.ha)}</td></tr>`).join('');
    $('#listaTerr').innerHTML=`<table class="tb"><thead><tr><th>Municipio</th><th>Departamento</th><th>Hectáreas</th></tr></thead><tbody>${filas}</tbody></table>`;
  } else {
    filas = arr(c.items).slice().sort((a,b)=>(b.ha||0)-(a.ha||0)).slice(0,40)
      .map(it=>`<tr><td>${esc(it.n||'—')}</td><td>${esc(it.mun||it.dep||'')}</td><td class="n">${it.ha?num(it.ha):'—'}</td></tr>`).join('');
    $('#listaTerr').innerHTML=`<table class="tb"><thead><tr><th>Territorio</th><th>Ubicación</th><th>Hectáreas</th></tr></thead><tbody>${filas}</tbody></table>`;
  }
}

/* ================= ALERTAS ================= */
function alertasUtiles(){
  const con = arr(D.respuestas).filter(r=>r.alerta);
  const porNivel={}; con.forEach(r=>porNivel[r.alerta.nivel]=(porNivel[r.alerta.nivel]||0)+1);
  const conPorque = con.filter(r=>(r.alerta.nota||'').trim().length>10).length;
  return {lista:con, total:con.length, porNivel, conPorque};
}
const NIV = {rojo:['Roja','#C62828'],naranja:['Naranja','#E07B00'],verde:['Verde','#2E7D32'],gris:['Sin información','#78909C']};
function vAlertas(){
  const A = alertasUtiles();
  const F = S.alFiltro;
  // tabla dinámica derecho x nivel
  const porDer = {};
  A.lista.forEach(r=>{ const k=derDeResp(r)||'otro';
    porDer[k]=porDer[k]||{rojo:0,naranja:0,verde:0,gris:0,total:0};
    porDer[k][r.alerta.nivel]=(porDer[k][r.alerta.nivel]||0)+1; porDer[k].total++; });
  const nomDer = k => (arr(D.derechos).find(x=>x.k===k)||{}).n || 'Sin clasificar';
  // tabla dinámica sujeto x nivel (usa población beneficiaria de la respuesta)
  const porSuj = {};
  A.lista.forEach(r=>{ const ps = arr(r.poblacion).length?r.poblacion:['(sin especificar)'];
    ps.forEach(p=>{ porSuj[p]=porSuj[p]||{rojo:0,naranja:0,verde:0,gris:0,total:0};
      porSuj[p][r.alerta.nivel]=(porSuj[p][r.alerta.nivel]||0)+1; porSuj[p].total++; }); });

  const filtradas = A.lista.filter(r=>{
    if(F.nivel && r.alerta.nivel!==F.nivel) return false;
    if(F.derecho && derDeResp(r)!==F.derecho) return false;
    if(F.sujeto && !arr(r.poblacion).includes(F.sujeto)) return false;
    return true;
  });
  const conNota = filtradas.filter(r=>(r.alerta.nota||'').trim().length>10);
  const sinNota = filtradas.filter(r=>!((r.alerta.nota||'').trim().length>10));

  const tabla = (obj, titulo, campo, nombre) => {
    const filas = Object.entries(obj).sort((a,b)=>b[1].total-a[1].total).map(([k,v])=>`
      <tr class="${F[campo]===k?'sel':''}" data-${campo}="${esc(k)}">
        <td>${esc(nombre?nombre(k):k)}</td>
        ${['rojo','naranja','gris','verde'].map(n=>`<td class="n">${v[n]?`<span class="badge ${n}">${v[n]}</span>`:'<span class="cero">·</span>'}</td>`).join('')}
        <td class="n"><b>${v.total}</b></td></tr>`).join('');
    return `<div class="panel"><h3>${titulo}</h3><div class="body pad0">
      <table class="tb din"><thead><tr><th>${nombre?'Derecho':'Sujeto'}</th><th>🔴</th><th>🟠</th><th>⚪</th><th>🟢</th><th>Total</th></tr></thead>
      <tbody>${filas}</tbody></table></div></div>`;
  };

  $('#app').innerHTML = `
    <div class="al-cab">
      <h2>🚨 Alertas del territorio</h2>
      <p>${A.total} alertas marcadas por las dependencias. <b>${A.conPorque} explican el motivo</b>;
        las demás quedaron marcadas sin describir el hecho.</p>
      <div class="al-niveles">${Object.entries(NIV).map(([k,[n,c]])=>`
        <button class="niv-b ${F.nivel===k?'on':''}" data-nivel="${k}" style="--c:${c}">
          <b>${A.porNivel[k]||0}</b> ${n}</button>`).join('')}</div>
    </div>
    <div class="cols2">
      ${tabla(porDer,'Alertas por derecho','derecho',nomDer)}
      ${tabla(porSuj,'Alertas por sujeto','sujeto',null)}
    </div>
    ${(F.nivel||F.derecho||F.sujeto)?`<button class="limpiar" id="limpiarF">↺ Quitar filtros</button>`:''}
    <div class="seccion-tit">Alertas con explicación (${conNota.length})</div>
    ${conNota.length?conNota.map(fichaAlerta).join(''):'<p class="vacio">Ninguna alerta con explicación en esta selección.</p>'}
    <div class="seccion-tit">Marcadas sin explicación (${sinNota.length})</div>
    <p class="nota-vacio">Estas alertas se marcaron pero no describen el hecho. Para poder actuar sobre ellas
      hace falta pedirle a la dependencia el <b>por qué</b>.</p>
    <div class="sin-nota">${sinNota.slice(0,40).map(r=>`
      <div class="sn"><span class="pt ${r.alerta.nivel}"></span>
        <span class="sn-dep">${esc(r.dependencia)}</span>
        <span class="sn-lin">${esc((r.linea||'').slice(0,70))}</span>
        <span class="sn-der">${esc(nomDer(derDeResp(r)))}</span></div>`).join('')}</div>`;

  $$('#app [data-nivel]').forEach(b=>b.onclick=()=>{ F.nivel = F.nivel===b.dataset.nivel?'':b.dataset.nivel; render(); });
  $$('#app [data-derecho]').forEach(b=>b.onclick=()=>{ F.derecho = F.derecho===b.dataset.derecho?'':b.dataset.derecho; render(); });
  $$('#app [data-sujeto]').forEach(b=>b.onclick=()=>{ F.sujeto = F.sujeto===b.dataset.sujeto?'':b.dataset.sujeto; render(); });
  const lf=$('#limpiarF'); if(lf) lf.onclick=()=>{ S.alFiltro={nivel:'',derecho:'',sujeto:''}; render(); };
}
function fichaAlerta(r){
  const [n,c] = NIV[r.alerta.nivel]||['—','#999'];
  return `<div class="al-ficha" style="--c:${c}">
    <div class="al-top"><span class="al-niv" style="background:${c}">${esc(n)}</span>
      ${r.alerta.tipo?`<span class="al-tipo">${esc(r.alerta.tipo)}</span>`:''}
      <span class="al-dep">${esc(r.dependencia)}</span></div>
    <div class="al-linea">${esc(r.linea||'')}</div>
    <div class="al-nota">${esc(r.alerta.nota||'')}</div>
    ${arr(r.poblacion).length?`<div class="al-pob">${r.poblacion.map(p=>`<span>${esc(p)}</span>`).join('')}</div>`:''}
  </div>`;
}

/* ================= drill-down ================= */
const heroSujeto = () => `<div class="hero" style="background-image:url('img/${S.sujeto.img||S.sujeto.k}.jpg')">
    <div class="hero-txt"><span>${S.sujeto.emoji}</span><h2>${esc(S.sujeto.n)}</h2></div></div>`;
function vDimensiones(){
  const cards = dimensionesDe(S.sujeto).map((dm,i)=>{
    const n=instrumentos(S.sujeto,dm).length; if(!n) return '';
    return `<button class="card-nav anim" style="--d:${i*60}ms" data-dim="${dm.k}"><span class="emoji">${dm.emoji}</span>
      <h3>${esc(nombreDim(dm,S.sujeto))}</h3><span class="cuenta">${n} instrumento${n!==1?'s':''}</span>
      <span class="flecha">→</span></button>`;
  }).join('');
  $('#app').innerHTML=`${heroSujeto()}
    <p class="intro">Elija una dimensión para ver los derechos.</p>
    <div class="rej dim">${cards||'<p class="vacio">Sin instrumentos.</p>'}</div>`;
  $$('#app .card-nav').forEach(b=>b.onclick=()=>{ S.dimension=D.dimensiones.find(x=>x.k===b.dataset.dim); ir('derechos'); });
}
function vDerechos(){
  const cards = arr(D.derechos).map((de,i)=>{
    const n=instrumentos(S.sujeto,S.dimension,de).length; if(!n) return '';
    return `<button class="card-nav anim" style="--d:${i*55}ms" data-der="${de.k}"><h3>${esc(de.n)}</h3>
      <span class="desc">${esc(de.sub)}</span><span class="cuenta">${n} instrumento${n!==1?'s':''}</span>
      <span class="flecha">→</span></button>`;
  }).join('');
  $('#app').innerHTML=`${heroSujeto()}
    <p class="intro">Dimensión <b>${esc(nombreDim(S.dimension,S.sujeto))}</b>. Derechos con instrumentos:</p>
    <div class="rej der">${cards||'<p class="vacio">Sin derechos con instrumentos.</p>'}</div>`;
  $$('#app .card-nav').forEach(b=>b.onclick=()=>{ S.derecho=D.derechos.find(x=>x.k===b.dataset.der); ir('herramienta'); });
}
function vHerramienta(){
  const its=instrumentos(S.sujeto,S.dimension,S.derecho);
  const ruta=(D.rutas||{})[S.derecho.k]||{};
  const alertas = arr(D.respuestas).filter(r=>r.alerta && derDeResp(r)===S.derecho.k && (r.alerta.nota||'').trim().length>10);
  $('#app').innerHTML=`
    <div class="h4-cab"><div class="der-sub">${esc(S.sujeto.n)} · ${esc(nombreDim(S.dimension,S.sujeto))}</div>
      <h2>${esc(S.derecho.n)}</h2>
      <div class="ctx">${esc(S.derecho.sub)} · ${its.length} instrumento${its.length!==1?'s':''}</div></div>
    <div class="cols2">
      <div>
        <div class="panel ruta-def"><h3>🛡️ Ruta de defensa</h3><div class="body">
          ${ruta.protege?`<div class="protege">${esc(ruta.protege)}</div>`:''}
          ${ruta.pasos?`<ol>${ruta.pasos.map(p=>`<li>${esc(p)}</li>`).join('')}</ol>`:''}
        </div></div>
        <div class="panel"><h3>🚨 Alertas de este derecho</h3><div class="body">
          ${alertas.length?alertas.map(fichaAlerta).join('')
            :`<p class="vacio">Sin alertas explicadas.</p>`}
          ${ruta.alertas?`<div class="al-tipicas"><b>A qué estar atentos:</b>
            ${ruta.alertas.map(a=>`<div class="alerta-tipo"><span class="pt naranja"></span>${esc(a)}</div>`).join('')}</div>`:''}
        </div></div>
      </div>
      <div class="panel"><h3>📜 Instrumentos de acceso a este derecho</h3><div class="body">
        ${its.length?its.map(fichaInstrumento).join(''):'<p class="vacio">Sin instrumentos.</p>'}
      </div></div>
    </div>`;
}
function fichaInstrumento(it){
  const enlaceOk = it.enlace && /^https?:\/\//i.test(it.enlace);
  return `<div class="instrumento">
    <span class="tipo-num">${esc(it.tipo)} ${esc(it.numero)}${it.fecha?' · '+esc(it.fecha):''}</span>
    <div class="desc">${esc(it.descripcion||it.epigrafe.slice(0,90))}</div>
    <details class="epi-det"><summary>Ver el texto del epígrafe</summary>
      <div class="epi">${esc(it.epigrafe)}</div></details>
    ${it.falta?`<div class="falta"><span class="falta-t">Qué falta</span>${esc(it.falta)}</div>`:''}
    <div class="meta">${it.sujetos.map(s=>`<span class="chip-x">${esc(s)}</span>`).join('')}
      ${it.dimensiones.map(d=>`<span>· ${esc(d)}</span>`).join('')}</div>
    <div class="fuente-x">Fuente: ${esc(it.hoja)} ·
      ${enlaceOk?`<a href="${esc(it.enlace)}" target="_blank" rel="noopener">abrir la norma ↗</a>`
                :`<span class="sin-enlace">sin enlace en la fuente oficial</span>`}</div>
  </div>`;
}

/* ================= BOT BRISTOL =================
   Asistente de la casa, sin conexión a ningún modelo: responde con lo que hay
   en el propio tablero (guía, hitos, sujetos, derechos, territorialidades). */
let bristolListo = false;
function bristol(){
  if(bristolListo) return; bristolListo = true;
  const cont = document.createElement('div');
  cont.innerHTML = `
    <button id="brBtn" class="br-btn" title="Bot Bristol: le ayudo a moverse por el tablero">
      <img src="img/bristol_av.jpg" alt="Bot Bristol">
      <span class="br-globo">¿Le ayudo?</span>
    </button>
    <div id="brPanel" class="br-panel oculto">
      <div class="br-cab">
        <img src="img/bristol_av.jpg" alt="">
        <div><b>Bot Bristol</b><small>Le ayudo a entender y a moverse por aquí</small></div>
        <button id="brX" title="Cerrar">✕</button>
      </div>
      <div class="br-chat" id="brChat"></div>
      <div class="br-sugs" id="brSugs"></div>
    </div>`;
  document.body.appendChild(cont);
  const $c = () => $('#brChat');
  const decir = (quien, html) => {
    const d = document.createElement('div');
    d.className = 'br-msg ' + quien; d.innerHTML = html;
    $c().appendChild(d); $c().scrollTop = $c().scrollHeight;
  };
  const sugerir = lista => {
    $('#brSugs').innerHTML = lista.map((s,i)=>`<button class="br-s" data-i="${i}">${esc(s.t)}</button>`).join('');
    $$('#brSugs .br-s').forEach(b=>b.onclick=()=>{
      const s = lista[+b.dataset.i];
      decir('yo', esc(s.t));
      setTimeout(()=>s.on(), 220);
    });
  };
  const menu = () => sugerir([
    {t:'¿Qué es esta página?', on:()=>{ decir('bot',
      'Es una herramienta para <b>seguirle la pista a la reforma agraria</b>. Puede mirarla de dos maneras:<br><br>' +
      '• Por <b>sujeto</b>: campesinado, pueblos indígenas, comunidades negras, pueblo Rrom, pescadores, mujeres y jóvenes. ' +
      'Entra a uno y va bajando: dimensión → derecho → las normas que lo respaldan.<br>' +
      '• Por <b>territorio</b>: el mapa de la derecha, con las territorialidades y la gestión de tierras.'); menu(); }},
    {t:'No entiendo una palabra', on:()=>{
      decir('bot','Le explico cualquiera de estas. Toque la que quiera:');
      sugerir(arr(D.guia).map(f=>({t:f.emoji+' '+f.nombre.replace(/\s*\(.*?\)\s*/,''), on:()=>{
        decir('bot', `<b>${esc(f.nombre)}</b><br><br>${esc(f.quees)}<br><br>` +
          `<b>¿Para qué sirve?</b><br>${esc(f.paraque)}<br><br>` +
          (f.ojo?`<i>Ojo: ${esc(f.ojo)}</i><br><br>`:'') +
          `<small>Norma: ${esc(f.norma)}</small>`);
        sugerir([{t:'Ver la guía completa', on:()=>{ ir('guia'); cerrar(); }},
                 {t:'Otra palabra', on:()=>menu()}]);
      }})).concat([{t:'← Volver', on:()=>menu()}]));
    }},
    {t:'¿Cuánta tierra se entregó?', on:()=>{
      const g = arr(D.hitosGrupos).find(x=>x.k==='tierra');
      decir('bot', g ? '<b>Tierra para las comunidades</b><br><br>' +
        g.items.map(i=>`• <b>${esc(i.c)}</b> ${esc(i.u)}: ${esc(i.t)}`).join('<br>') +
        `<br><br><small>${esc(D.hitosFuente||'')}</small>`
        : 'Todavía no tengo esa cifra cargada.');
      sugerir([{t:'Ver el mapa de tierras', on:()=>{ S.pestMapa='fondo'; ir('inicio'); cerrar(); }},
               {t:'← Volver', on:()=>menu()}]);
    }},
    {t:'¿Qué territorialidades hay?', on:()=>{
      const t = Object.values(T||{});
      decir('bot', t.length ? 'En el mapa puede prender y apagar estas capas:<br><br>' +
        t.map(c=>`• <b>${esc(c.nombre)}</b>: ${c.tipo==='municipios'? c.n+' municipios' : num(c.n)}`).join('<br>')
        : 'El mapa todavía está cargando.');
      sugerir([{t:'Ver el mapa', on:()=>{ S.pestMapa='terr'; ir('inicio'); cerrar(); }},
               {t:'← Volver', on:()=>menu()}]);
    }},
    {t:'Buscar una norma', on:()=>{
      decir('bot','Escriba una palabra (por ejemplo: <i>semillas</i>, <i>crédito</i>, <i>mujeres</i>) y le muestro las normas que la mencionan.');
      $('#brSugs').innerHTML = `<div class="br-busca"><input id="brQ" placeholder="Escriba aquí…"><button id="brGo">Buscar</button></div>
        <button class="br-s" id="brVolver">← Volver</button>`;
      const buscar = () => {
        const q = noAc($('#brQ').value.trim());
        if(q.length < 3){ decir('bot','Escriba al menos 3 letras.'); return; }
        decir('yo', esc($('#brQ').value));
        const hits = arr(D.instrumentos).filter(i=>
          noAc(i.descripcion + ' ' + i.epigrafe + ' ' + i.derechos.join(' ')).includes(q)).slice(0,6);
        decir('bot', hits.length
          ? `Encontré <b>${hits.length}</b> ${hits.length===1?'norma':'normas'}:<br><br>` + hits.map(i=>
              `• <b>${esc(i.tipo)} ${esc(i.numero)}</b>${i.fecha?' ('+esc(i.fecha.slice(0,4))+')':''}<br>` +
              `<small>${esc(i.descripcion||i.epigrafe.slice(0,90))}</small>` +
              (/^https?:/.test(i.enlace)?`<br><a href="${esc(i.enlace)}" target="_blank" rel="noopener">abrir la norma ↗</a>`:'')
            ).join('<br><br>')
          : 'No encontré nada con esa palabra. Pruebe con otra.');
      };
      $('#brGo').onclick = buscar;
      $('#brQ').onkeydown = e => { if(e.key==='Enter') buscar(); };
      $('#brVolver').onclick = () => menu();
      setTimeout(()=>$('#brQ') && $('#brQ').focus(), 120);
    }},
    {t:'¿Y las alertas?', on:()=>{
      const a = alertasUtiles();
      decir('bot', `Hay <b>${a.total} alertas</b> marcadas por las dependencias, pero solo <b>${a.conPorque}</b> explican el motivo.<br><br>` +
        Object.entries(a.porNivel).map(([k,v])=>`• ${esc((NIV[k]||[k])[0])}: <b>${v}</b>`).join('<br>') +
        '<br><br>Una alerta sin explicación no se puede atender: hay que pedirle a la dependencia el porqué.');
      sugerir([{t:'Ver las alertas', on:()=>{ ir('alertas'); cerrar(); }},
               {t:'← Volver', on:()=>menu()}]);
    }},
  ]);
  const abrir = () => {
    $('#brPanel').classList.remove('oculto');
    $('#brBtn').classList.add('activo');
    if(!$c().children.length){
      decir('bot','Buenas. Soy el <b>Bot Bristol</b>. Como el almanaque, estoy para orientar: ' +
        'le explico las palabras difíciles y le muestro dónde está cada cosa.<br><br>¿En qué le ayudo?');
      menu();
    }
  };
  const cerrar = () => { $('#brPanel').classList.add('oculto'); $('#brBtn').classList.remove('activo'); };
  $('#brBtn').onclick = () => $('#brPanel').classList.contains('oculto') ? abrir() : cerrar();
  $('#brX').onclick = cerrar;
}
