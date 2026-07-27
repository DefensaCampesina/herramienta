/* Defensa del Campesinado — v4: subsistemas, planes de acción y territorio */
let D=null, G=null;
const S = { vista:'territorio', terr:'', otra:'', region:'', dpto:'', mpio:'', sub:0, zoom:null, abiertas:{} };

const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=n=>new Intl.NumberFormat('es-CO').format(Math.round(n));
const dec=(n,d=1)=>new Intl.NumberFormat('es-CO',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
const arr=x=>Array.isArray(x)?x:[];

/* territorialidades campesinas: cada una es una figura jurídica distinta */
const TERR=[
 {k:'zrc',   n:'Zonas de Reserva Campesina', s:'ZRC',   c:'#1565C0', f:m=>m.zrc,
  d:'Figura de la Ley 160 de 1994 que estabiliza la economía campesina y frena la concentración de la tierra.'},
 {k:'appa',  n:'Áreas de Protección para la Producción de Alimentos', s:'APPA', c:'#2E7D32', f:m=>m.appa,
  d:'Protegen suelos de alto potencial para garantizar la soberanía alimentaria.'},
 {k:'zppa',  n:'Zonas de Protección para la Producción de Alimentos', s:'ZPPA', c:'#EF6C00', f:m=>m.zppa,
  d:'Ordenamiento del suelo rural en función de la producción de alimentos.'},
 {k:'tecam', n:'Territorios Campesinos Agroalimentarios', s:'TECAM', c:'#6A1B9A', f:m=>m.tecam,
  d:'Territorialidad propia del campesinado, construida desde las comunidades.'},
 {k:'otras', n:'Otras territorialidades', s:'OTRAS', c:'#00838F', f:m=>m.otras,
  d:'Otras formas de ordenamiento territorial campesino reconocidas.'}
];
/* PDET y demás NO son territorialidades campesinas: son focalización de política */
const OTRAS=[
 {k:'pdet', n:'Municipios PDET', c:'#C62828', f:m=>m.pdet,
  d:'Focalización del Acuerdo de Paz, no una territorialidad campesina.'},
 {k:'igac', n:'Con catastro rural actualizado', c:'#F9A825', f:m=>m.igac_ha>0,
  d:'Municipios con actualización catastral rural (Resolución Art. 49).'},
 {k:'ant',  n:'Con compra de tierras', c:'#8D6E63', f:m=>m.ant_ha_compra>0,
  d:'Municipios donde la ANT compró tierras para el Fondo.'}
];

let R=null;   // respuestas del formulario de veeduría (capa viva)
Promise.all([
  fetch('datos.json').then(r=>r.json()),
  fetch('geo.json').then(r=>r.json()),
  fetch('respuestas.json').then(r=>r.json()).catch(()=>({meta:{total_entradas:0},entradas:[],por_subsistema:{},por_dependencia:{},municipios:{}}))
]).then(([d,g,r])=>{D=d;G=g;R=r;iniciar();})
 .catch(e=>{$('#vistas').innerHTML=`<div class="card"><div class="body"><p class="muted">No se pudieron cargar los datos: ${esc(e.message)}</p></div></div>`;});

function iniciar(){
  $('#corte').textContent = 'Planes SINRADR 2024-2026 · Catastro ' + D.meta.corte_igac;
  rail(); render();
  $$('.navtab').forEach(b=>b.onclick=()=>{S.vista=b.dataset.v;
    $$('.navtab').forEach(x=>x.classList.toggle('on',x===b)); render();});
  $('#fab').onclick=()=>{$('#panelAgente').classList.toggle('oculto');$('#fab').classList.toggle('oculto');};
  $('#cerrarAgente').onclick=()=>{$('#panelAgente').classList.add('oculto');$('#fab').classList.remove('oculto');};
  if(window.Agente) Agente.iniciar(D);
}

/* ============ rail ============ */
const mp = ()=>S.mpio ? D.municipios.find(m=>m.cod_mpio===S.mpio) : null;
function sel(){
  const ft = TERR.find(t=>t.k===S.terr), fo = OTRAS.find(o=>o.k===S.otra);
  return D.municipios.filter(m=>(!S.region||m.region===S.region)&&(!S.dpto||m.dpto===S.dpto)
    && (!ft||ft.f(m)) && (!fo||fo.f(m)));
}
function rail(){
  $('#slTerr').innerHTML = TERR.map(t=>`<button class="sl ${S.terr===t.k?'on':''}" data-k="${t.k}" title="${esc(t.d)}">
    <span><i style="background:${t.c};width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:6px"></i>${esc(t.s)}</span>
    <span class="c">${num(D.municipios.filter(t.f).length)}</span></button>`).join('');
  $$('#slTerr .sl').forEach(b=>b.onclick=()=>{S.terr=S.terr===b.dataset.k?'':b.dataset.k;S.mpio='';S.zoom=null;rail();render();});

  $('#slOtras').innerHTML = OTRAS.map(o=>`<button class="sl ${S.otra===o.k?'on':''}" data-k="${o.k}" title="${esc(o.d)}">
    <span>${esc(o.n)}</span><span class="c">${num(D.municipios.filter(o.f).length)}</span></button>`).join('');
  $$('#slOtras .sl').forEach(b=>b.onclick=()=>{S.otra=S.otra===b.dataset.k?'':b.dataset.k;S.mpio='';S.zoom=null;rail();render();});

  const regs=[...new Set(D.municipios.map(m=>m.region))].sort();
  $('#selRegion').innerHTML='<option value="">Todas las regiones</option>'+regs.map(r=>`<option${S.region===r?' selected':''}>${esc(r)}</option>`).join('');
  const bd=D.municipios.filter(m=>!S.region||m.region===S.region);
  $('#selDpto').innerHTML='<option value="">Todos los departamentos</option>'+[...new Set(bd.map(m=>m.dpto))].sort().map(d=>`<option${S.dpto===d?' selected':''}>${esc(d)}</option>`).join('');
  const bm=sel().sort((a,b)=>a.mpio.localeCompare(b.mpio));
  $('#selMpio').innerHTML='<option value="">Todos los municipios</option>'+bm.map(m=>`<option value="${m.cod_mpio}"${S.mpio===m.cod_mpio?' selected':''}>${esc(m.mpio)}</option>`).join('');
  $('#selRegion').onchange=e=>{S.region=e.target.value;S.dpto='';S.mpio='';S.zoom=null;rail();render();};
  $('#selDpto').onchange  =e=>{S.dpto=e.target.value;S.mpio='';S.zoom=null;rail();render();};
  $('#selMpio').onchange  =e=>{S.mpio=e.target.value;acercar();rail();render();};
  $('#limpiar').onclick   =()=>{Object.assign(S,{terr:'',otra:'',region:'',dpto:'',mpio:'',zoom:null});rail();render();};

  $('#slSub').innerHTML = '<button class="sl '+(S.sub?'':'on')+'" data-s="0">Todos</button>' +
    arr(D.subsistemas).map(s=>`<button class="sl ${S.sub===s.n?'on':''}" data-s="${s.n}">
      <span><i style="background:${s.color};width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:6px"></i>${s.n}. ${esc(s.corto)}</span></button>`).join('');
  $$('#slSub .sl').forEach(b=>b.onclick=()=>{S.sub=+b.dataset.s;rail();render();});
  ctx();
}
function ctx(){
  const m=mp(), f=sel();
  if(m){
    $('#ctxBox').innerHTML=`<div class="n">${esc(m.mpio)}</div><div class="d">${esc(m.dpto)} · ${esc(m.region)}</div>
      <div class="tags">${tags(m)||'<span class="b">Sin figura</span>'}</div>`;
  } else {
    const ft=TERR.find(t=>t.k===S.terr), fo=OTRAS.find(o=>o.k===S.otra);
    $('#ctxBox').innerHTML=`<div class="n">${esc(S.dpto||S.region||'Colombia')}</div>
      <div class="d">${esc(ft?ft.n:(fo?fo.n:'Todas las figuras'))}</div>
      <div class="cifras"><div>Municipios<b>${num(f.length)}</b></div>
      <div>Con territorialidad<b>${num(f.filter(x=>x.territorialidad).length)}</b></div></div>`;
  }
}
const tags = m => TERR.filter(t=>t.f(m)).map(t=>`<span class="b" style="background:${t.c};color:#fff">${t.s}</span>`).join(' ')
  + (m.pdet?' <span class="b" style="background:#C62828;color:#fff">PDET</span>':'');

/* ============ mapa ============ */
function acercar(){ const m=mp(); if(!m||!G.mpios[m.cod_mpio]){S.zoom=null;return;}
  const c=G.mpios[m.cod_mpio].c; S.zoom={x:c[0],y:c[1],k:5.5}; }
function pintarMapa(id,o){
  o=o||{};
  const s=new Set(sel().map(m=>m.cod_mpio));
  const porCod=Object.fromEntries(D.municipios.map(m=>[m.cod_mpio,m]));
  const vals=o.valores||null, max=vals?Math.max(...Object.values(vals),1):1;
  const PAL=['#EDF5EE','#C8E6C9','#94CF9B','#5FB566','#2E7D32','#14401C'];
  const color=cod=>{
    const m=porCod[cod]; if(!m) return '#f2f5f2';
    if(vals){const v=vals[cod]||0; return v?PAL[Math.min(5,1+Math.floor((v/max)*4.99))]:'#F1F5F1';}
    if(!s.has(cod)) return '#E9EDEA';
    if(S.mpio===cod) return '#F9A825';
    const t=TERR.find(t=>t.f(m)); if(t) return t.c;
    if(m.pdet) return '#C62828';
    return '#9FC5A4';
  };
  const z=S.zoom;
  const tr = z ? `translate(${G.vb[0]/2 - z.x*z.k} ${G.vb[1]/2 - z.y*z.k}) scale(${z.k})` : '';
  const paths=Object.keys(G.mpios).map(c=>
    `<path class="mp ${S.mpio===c?'sel':''}" d="${G.mpios[c].d}" fill="${color(c)}" data-c="${c}"/>`).join('');
  const dp=Object.values(G.dptos).map(d=>`<path class="dp" d="${d}"/>`).join('');
  // recuadro de islas: juntas y grandes, sin conservar la distancia real entre ellas
  const islas=Object.keys(G.sai||{}).map(c=>
    `<path class="mp" d="${G.sai[c]}" fill="${color(c)}" data-c="${c}"/>`).join('');
  const etiq=Object.values(G.sai_labels||{}).map(l=>
    `<text x="${l.x}" y="${l.y}" text-anchor="middle" style="font-size:11px;font-weight:600">${esc(l.t)}</text>`).join('');
  const I=G.inset;
  $(id).innerHTML=`<div class="mapa-caja">
    <div class="zoom-ctrl"><button id="zIn">+</button><button id="zOut">−</button><button id="zRst" title="Ver todo">⤢</button></div>
    <svg id="mapa" viewBox="0 0 ${G.vb[0]} ${G.vb[1]}" style="max-height:${o.alto||'68vh'}">
      <g class="g-zoom" transform="${tr}"><g>${paths}</g><g>${dp}</g></g>
      <g><rect class="inset-b" x="${I[0]}" y="${I[1]}" width="${I[2]}" height="${I[3]}" rx="12"/>
        <text x="${I[0]+I[2]/2}" y="${I[1]+18}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:var(--verde2)">Archipiélago</text>
        ${islas}${etiq}</g>
    </svg></div>
    <div class="escala">${o.escala||leyenda()}</div>`;
  const tip=$('#tip');
  $$(`${id} path.mp`).forEach(p=>{
    p.onmousemove=e=>{const m=porCod[p.dataset.c]; if(!m)return;
      const extra = vals?`<span style="color:var(--maiz2)">${num(vals[p.dataset.c]||0)} ${esc(o.unidad||'')}</span>`
        : (m.igac_ha?`<span style="color:var(--maiz2)">${num(m.igac_ha)} ha actualizadas</span>`:'');
      tip.innerHTML=`<b>${esc(m.mpio)}</b>${esc(m.dpto)}<br>${extra}`;
      tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px'; tip.style.opacity=1;};
    p.onmouseleave=()=>tip.style.opacity=0;
    p.onclick=()=>{const m=porCod[p.dataset.c]; if(!m)return;
      if(S.mpio===p.dataset.c){S.mpio='';S.zoom=null;} else {S.mpio=p.dataset.c;S.dpto=m.dpto;S.region=m.region;acercar();}
      rail();render();};
  });
  $('#zIn').onclick =()=>{S.zoom=S.zoom?{...S.zoom,k:Math.min(S.zoom.k*1.5,14)}:{x:G.vb[0]/2,y:G.vb[1]/2,k:1.5};render();};
  $('#zOut').onclick=()=>{if(!S.zoom)return;const k=S.zoom.k/1.5;S.zoom=k<=1.05?null:{...S.zoom,k};render();};
  $('#zRst').onclick=()=>{S.zoom=null;S.mpio='';rail();render();};
}
const leyenda=()=>TERR.map(t=>`<span class="lg"><i style="background:${t.c}"></i>${t.s}</span>`).join('')
  + '<span class="lg"><i style="background:#C62828"></i>PDET</span>'
  + '<span class="lg"><i style="background:#E9EDEA"></i>Fuera del filtro</span>';

/* ============ vistas ============ */
function render(){({territorio:vTerritorio,subsistemas:vSubsistemas,veeduria:vVeeduria,balance:vBalance,defensa:vDefensa}[S.vista]||vTerritorio)();}

/* ---- helpers de la capa de veeduría (respuestas del formulario) ---- */
const subColor = n => (arr(D.subsistemas).find(s=>s.n===n)||{}).color || '#8E1218';
const AL_COL = {rojo:'#C62828', naranja:'#E07B00', verde:'#2E7D32', gris:'#78909C'};
const AL_TXT = {rojo:'Alerta roja', naranja:'Alerta naranja', verde:'Logro por defender', gris:'Sin información'};
function respuestasDe(n){ return arr(R&&R.entradas).filter(e=>e.subsistema===n); }
function fichaRespuesta(e){
  const col = subColor(e.subsistema);
  const inds = e.indicadores.filter(i=>i.nombre||i.valor).map(i=>
    `<span class="ind-chip"><b>${esc(i.valor||'')}</b> ${esc(i.unidad||'')} · ${esc(i.nombre||'')}${i.corte?` <i>(${esc(i.corte)})</i>`:''}</span>`).join('');
  const pob = e.poblacion.slice(0,12).map(p=>`<span class="pob-chip">${esc(p)}</span>`).join('');
  const al = e.alerta ? `<div class="al-linea" style="--a:${AL_COL[e.alerta.nivel]||'#999'}">
      <b>${esc(AL_TXT[e.alerta.nivel]||e.alerta.nivel)}</b>${e.alerta.tipo?' · '+esc(e.alerta.tipo):''}
      ${e.alerta.nota?`<div class="al-nota">${esc(e.alerta.nota)}</div>`:''}</div>` : '';
  const CUR = {aprobado:['✓ Aprobado','#2E7D32'], revisado:['Revisado','#E07B00'],
    rechazado:['Rechazado','#C62828'], pendiente:['Sin revisar','#8b998f']};
  const cu = CUR[e.curacion||'pendiente'];
  return `<div class="resp" style="border-left-color:${col}">
    <div class="resp-cab"><span class="resp-sub" style="background:${col}">S${e.subsistema}</span>
      <span class="resp-dep">${esc(e.dependencia)}</span>
      <span class="resp-cur" style="color:${cu[1]};border-color:${cu[1]}">${cu[0]}</span>
      <span class="resp-donde">📍 ${esc(e.donde)}</span></div>
    <div class="resp-linea">${esc(e.linea)}</div>
    ${e.logros?`<div class="resp-logro">${esc(e.logros)}</div>`:''}
    ${inds?`<div class="resp-inds">${inds}</div>`:''}
    <div class="resp-grid">
      ${e.situacion_2022?`<div><label>Cómo estaba en 2022</label><span>${esc(e.situacion_2022)}</span></div>`:''}
      ${e.estado?`<div><label>¿Se cumplió?</label><span>${esc(e.estado)}</span></div>`:''}
      ${e.instrumento||e.tipo_instrumento?`<div><label>Con qué norma o programa</label><span>${esc([e.tipo_instrumento,e.instrumento].filter(Boolean).join(': '))}</span></div>`:''}
      ${e.fragilidad?`<div><label>Qué tan fácil se pierde</label><span>${esc(e.fragilidad)}</span></div>`:''}
    </div>
    ${e.que_falta?`<div class="resp-falta"><label>Qué falta</label> ${esc(e.que_falta)}</div>`:''}
    ${pob?`<div class="resp-pob">${pob}</div>`:''}
    ${al}
    ${e.fuente?`<div class="resp-fuente">Fuente: ${esc(e.fuente)}</div>`:''}</div>`;
}

/* ---- VEEDURÍA: lo que reportaron las dependencias por el formulario ---- */
function vVeeduria(){
  const M = R&&R.meta || {total_entradas:0};
  const ent = S.sub ? respuestasDe(S.sub) : arr(R&&R.entradas);
  const porSub = R&&R.por_subsistema || {};
  const porDep = R&&R.por_dependencia || {};
  const conAlerta = arr(R&&R.entradas).filter(e=>e.alerta).length;
  $('#vistas').innerHTML=`<div class="vh"><div><h2>Veeduría — lo que reportaron las dependencias</h2>
    <p>Reportes recibidos por el formulario. Es la información viva del tablero: se actualiza a medida que llegan y se depuran.</p></div></div>
    <div class="aviso" style="margin-bottom:12px"><b>Información preliminar.</b> ${esc(M.nota||'Pendiente de depuración por el equipo de veeduría.')} Corte: ${esc(M.generado||'—')}.</div>
    <div class="big">
      <div class="bigc"><div class="v">${num(M.total_entradas||ent.length)}</div><div class="u">reportes</div><div class="l">Líneas reportadas</div><div class="cita">${num(M.total_filas||0)} filas en la hoja.</div></div>
      <div class="bigc"><div class="v">${num(M.dependencias||Object.keys(porDep).length)}</div><div class="u">dependencias</div><div class="l">Han respondido</div><div class="cita">${esc(Object.keys(porDep).join(' · ')||'—')}</div></div>
      <div class="bigc"><div class="v">${Object.values(porSub).filter(v=>v).length}</div><div class="u">de 8 subsistemas</div><div class="l">Con al menos un reporte</div><div class="cita">Faltan ${8-Object.values(porSub).filter(v=>v).length} por reportar.</div></div>
      <div class="bigc"><div class="v" style="color:${conAlerta?'#C62828':'#2E7D32'}">${conAlerta}</div><div class="u">con alerta</div><div class="l">Marcadas por quien reportó</div><div class="cita">Roja, naranja o gris.</div></div>
    </div>
    <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,2.2fr)">
      <div class="card"><header><h3>📊 Reportes por subsistema</h3></header><div class="body" id="vSubBars"></div></div>
      <div class="card"><header><h3>📋 Reportes ${S.sub?'del subsistema '+S.sub:'recibidos'}</h3><span class="sub">${ent.length}</span></header>
        <div class="body" id="vLista"></div></div>
    </div>`;
  // barras por subsistema (clic para filtrar)
  const maxS = Math.max(1, ...Object.values(porSub));
  $('#vSubBars').innerHTML = arr(D.subsistemas).map(s=>{
    const n = porSub[s.n]||0;
    return `<div class="barra-it ${S.sub===s.n?'on':''}" data-s="${s.n}" style="cursor:pointer">
      <div class="bn"><span><b style="color:${s.color}">${s.n}.</b> ${esc(s.corto)}</span><b>${n}</b></div>
      <div class="bt"><div class="bf" style="width:${(n/maxS*100).toFixed(0)}%;background:${s.color}"></div></div></div>`;
  }).join('') + (S.sub?`<button class="limpiar" id="vTodos" style="margin-top:10px">↺ Ver todos los subsistemas</button>`:'');
  $$('#vSubBars .barra-it').forEach(b=>b.onclick=()=>{S.sub=S.sub===+b.dataset.s?0:+b.dataset.s;rail();render();});
  const vt=$('#vTodos'); if(vt) vt.onclick=()=>{S.sub=0;rail();render();};
  $('#vLista').innerHTML = ent.length
    ? ent.sort((a,b)=>a.subsistema-b.subsistema).map(fichaRespuesta).join('')
    : '<div class="vacio">Todavía no hay reportes para esta selección.</div>';
}

/* ---- TERRITORIO: mapa + dimensiones desplegables en la misma pestaña ---- */
function vTerritorio(){
  const m=mp(), f=sel();
  $('#vistas').innerHTML=`
   <div class="vh"><div><h2>${m?esc(m.mpio):esc(S.dpto||S.region||'Colombia')}</h2>
     <p>${m?'Datos propios de este municipio. Despliega cada subsistema para ver qué se hizo aquí y qué falta.'
          :'Elige un municipio en el mapa para acercarte. Los subsistemas se despliegan al hacer clic.'}</p></div></div>
   ${m?tarjetasMpio(m):tarjetasPais(f)}
   <div class="grid" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)">
     <div class="card"><header><h3>🗺️ Mapa</h3><span class="sub">${num(f.length)} municipios</span></header>
       <div class="body pad0" id="mapaBox"></div></div>
     <div class="card"><header><h3>${m?'📌 Detalle':'📍 Departamentos'}</h3></header>
       <div class="body" id="lateral"></div></div>
   </div>
   <div class="card" style="margin-top:13px"><header><h3>🧩 Los 8 subsistemas ${m?'en '+esc(m.mpio):'de la reforma agraria'}</h3>
     <span class="sub">clic para desplegar</span></header>
     <div class="body" id="acordeon"></div></div>`;
  pintarMapa('#mapaBox',{alto:'58vh'});
  $('#lateral').innerHTML = m ? detalleMpio(m) : ranking(f);
  if(!m) $$('#lateral .barra-it').forEach(b=>b.onclick=()=>{S.dpto=S.dpto===b.dataset.d?'':b.dataset.d;S.mpio='';rail();render();});
  acordeon('#acordeon', m);
}
function acordeon(id, m){
  const subs = S.sub ? arr(D.subsistemas).filter(s=>s.n===S.sub) : arr(D.subsistemas);
  $(id).innerHTML = subs.map(s=>{
    const P = planesDe(s.n, m);
    const nv = (!m) ? respuestasDe(s.n).length : 0;
    const ab = !!S.abiertas[s.n];
    return `<details class="sub-acc" ${ab?'open':''} data-s="${s.n}" style="--c:${s.color}">
      <summary>
        <span class="tit"><b style="color:${s.color}">${s.n}.</b> ${esc(s.nombre)}</span>
        <span class="nums">${nv?`<b style="color:#8E1218">${nv} reporte${nv>1?'s':''} de veeduría</b> · `:''}${P.length} actividades${P.filter(p=>p.reporta).length?` · ${P.filter(p=>p.reporta).length} con reporte`:''}</span>
      </summary>
      <div class="cont">${contenidoSub(s, P, m)}</div></details>`;
  }).join('');
  $$(`${id} .sub-acc`).forEach(d=>d.addEventListener('toggle',()=>{S.abiertas[d.dataset.s]=d.open;}));
}
function planesDe(n, m){
  let P = arr(D.planes).filter(p=>p.subsistema===n);
  if (m) {                       // filtrar por lo que aplique a ese municipio o sea nacional
    const dep = (m.dpto||'').toLowerCase(), mun=(m.mpio||'').toLowerCase(), reg=(m.region||'').toLowerCase();
    P = P.filter(p=>{
      const t=(p.territorializacion||'').toLowerCase();
      if(!t) return false;
      if(/nacional/.test(t)) return true;
      return t.includes(mun)||t.includes(dep)||reg.split(' ').some(w=>w.length>4&&t.includes(w));
    });
  }
  return P;
}
function contenidoSub(s, P, m){
  // reportes de veeduría de este subsistema (solo cuando se ve el país, no un municipio)
  const veed = (!m) ? respuestasDe(s.n) : [];
  const bloqueVeed = veed.length ? `
    <h5 class="mini" style="color:#8E1218">📋 REPORTADO POR LAS DEPENDENCIAS — veeduría (${veed.length})</h5>
    ${veed.map(fichaRespuesta).join('')}
    <div style="height:10px"></div>` : '';
  if(!P.length) return bloqueVeed || '<div class="vacio">Sin actividades ni reportes registrados para esta selección.</div>';
  const conR = P.filter(p=>p.reporta);
  const est = {Cumplida:0,'En proceso':0,'Sin avance':0,'Sin reporte':0};
  P.forEach(p=>est[p.estado]=(est[p.estado]||0)+1);
  const barras = Object.entries(est).filter(([,v])=>v).map(([k,v])=>{
    const col={Cumplida:'#2E7D32','En proceso':'#F9A825','Sin avance':'#C62828','Sin reporte':'#B0BEC5'}[k];
    return `<span class="lg"><i style="background:${col}"></i>${k}: <b>${v}</b></span>`;}).join('');
  const porAnio = {}; P.forEach(p=>porAnio[p.anio]=(porAnio[p.anio]||0)+1);
  return `
    <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:var(--gris);margin-bottom:10px">
      ${barras}<span class="lg">Años: ${Object.keys(porAnio).sort().join(' · ')}</span>
      ${s.coordinador?`<span class="lg">Coordina: <b>${esc(s.coordinador.slice(0,60))}</b></span>`:''}</div>
    ${bloqueVeed}
    ${conR.length?`<h5 class="mini">✅ LO QUE SE HIZO — reportado por la entidad (${conR.length})</h5>
      ${conR.slice(0,8).map(fichaPlan).join('')}
      ${conR.length>8?`<details class="mas"><summary>Ver las otras ${conR.length-8}</summary>${conR.slice(8).map(fichaPlan).join('')}</details>`:''}`:''}
    <details class="mas"><summary>📋 Todas las actividades del plan (${P.length})</summary>
      ${P.map(fichaPlan).join('')}</details>`;
}
const ICONO={Cumplida:'✅','En proceso':'🔄','Sin avance':'⛔','Sin reporte':'▫️'};
function fichaPlan(p){
  const col={Cumplida:'#2E7D32','En proceso':'#F9A825','Sin avance':'#C62828','Sin reporte':'#CFD8DC'}[p.estado];
  return `<div class="plan" style="border-left-color:${col}">
    <div class="pa">${ICONO[p.estado]||''} ${esc(p.actividad)}</div>
    ${p.meta?`<div class="pm"><b>Meta:</b> ${esc(p.meta)}</div>`:''}
    ${p.cumplimiento?`<div class="pc"><b>Reporte:</b> ${esc(String(p.cumplimiento).slice(0,420))}</div>`:''}
    ${p.barreras?`<div class="pb"><b>Barreras:</b> ${esc(String(p.barreras).slice(0,300))}</div>`:''}
    <div class="pf">${esc(p.territorializacion||'sin territorializar')} · ${p.anio}${p.responsable?' · '+esc(p.responsable):''}</div></div>`;
}
function tarjetasMpio(m){
  const c=[];
  if(m.igac_ha) c.push({v:num(m.igac_ha),u:'hectáreas rurales actualizadas',l:'Catastro rural',
    cita:`${esc(m.igac_tipo||'Actualización catastral')} · última actualización: ${esc(m.igac_fecha||D.meta.corte_igac)} · ${num(m.igac_predios)} predios`});
  if(m.ant_ha_compra) c.push({v:num(m.ant_ha_compra),u:'hectáreas',l:'Compra de tierras para el Fondo',
    cita:`${esc(D.contador.fuente)}, ${esc(D.contador.corte)}.`});
  if(!c.length) return `<div class="card" style="margin-bottom:13px"><div class="body">
    <p class="muted">Sin actualización catastral rural ni compra de tierras registrada en este municipio.</p></div></div>`;
  return `<div class="big">${c.map(x=>`<div class="bigc"><div class="v">${esc(x.v)}</div>
    <div class="u">${esc(x.u)}</div><div class="l">${esc(x.l)}</div><div class="cita">${esc(x.cita)}</div></div>`).join('')}</div>`;
}
function tarjetasPais(f){
  const C=D.contador, hay=S.dpto||S.region||S.terr||S.otra;
  const ha=f.reduce((a,x)=>a+(x.igac_ha||0),0), ant=f.reduce((a,x)=>a+(x.ant_ha_compra||0),0);
  const c = hay ? [
    {v:num(f.length),u:'municipios',l:'En la selección',cita:'Clasificación territorial SINRAD.'},
    {v:num(ant),u:'hectáreas',l:'Compra de tierras',cita:`${C.fuente}, ${C.corte}.`},
    {v:num(ha),u:'hectáreas',l:'Catastro rural actualizado',cita:`IGAC, corte ${D.meta.corte_igac}.`},
    {v:num(f.filter(x=>x.territorialidad).length),u:'municipios',l:'Con territorialidad campesina',cita:'ZRC, APPA, ZPPA, TECAM u otras.'}
  ] : [
    {v:C.provision_fondo,u:'hectáreas',l:'Provisión del Fondo de Tierras',
     cita:`${C.fuente}. Compra ${C.compra_directa} + procesos ${C.procesos_agrarios} + transferencias ${C.transferencias}.`},
    {v:C.entregas_3m,u:`hectáreas en ${C.predios_entregados} predios`,l:'Entregadas a sujetos de reforma agraria',cita:`${C.fuente}, ${C.corte}.`},
    {v:C.formalizacion,u:'hectáreas',l:'Formalización de tierras',cita:`${C.fuente}.`},
    {v:num(arr(D.planes).length),u:'actividades',l:'En los planes de los 8 subsistemas',cita:esc(D.meta.fuente_planes)}
  ];
  return (hay?'':`<div class="aviso" style="margin-bottom:12px"><b>Fuente que manda:</b> ${esc(C.nota)}</div>`) +
    `<div class="big">${c.map(x=>`<div class="bigc"><div class="v">${esc(x.v)}</div>
    <div class="u">${esc(x.u)}</div><div class="l">${esc(x.l)}</div><div class="cita">${esc(x.cita)}</div></div>`).join('')}</div>`;
}
function detalleMpio(m){
  return `<table class="tb"><tbody>
    <tr><td>Región</td><td class="num">${esc(m.region)}</td></tr>
    ${m.pdet?`<tr><td>Subregión PDET</td><td class="num">${esc(m.nombre_pdet||'—')}</td></tr>`:''}
    <tr><td>Tipo de actualización</td><td class="num">${esc(m.igac_tipo||'—')}</td></tr>
    <tr><td>Última actualización</td><td class="num">${esc(m.igac_fecha||'—')}</td></tr>
    <tr><td>Hectáreas actualizadas</td><td class="num">${m.igac_ha?num(m.igac_ha):'—'}</td></tr>
    <tr><td>Predios rurales</td><td class="num">${m.igac_predios?num(m.igac_predios):'—'}</td></tr>
    <tr><td>Código DANE</td><td class="num">${esc(m.cod_mpio)}</td></tr></tbody></table>`;
}
function ranking(f){
  const c={}; f.forEach(m=>c[m.dpto]=(c[m.dpto]||0)+(m.igac_ha||0));
  let e=Object.entries(c).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,12);
  let tit='Hectáreas rurales actualizadas';
  if(!e.length){ const c2={}; f.forEach(m=>c2[m.dpto]=(c2[m.dpto]||0)+1);
    e=Object.entries(c2).sort((a,b)=>b[1]-a[1]).slice(0,12); tit='Municipios por departamento'; }
  const max=e.length?e[0][1]:1;
  return `<p class="muted" style="margin:0 0 9px">${tit}</p><div class="barras">${e.map(([d,n])=>`
    <div class="barra-it ${S.dpto===d?'on':''}" data-d="${esc(d)}">
      <div class="bn"><span>${esc(d)}</span><b>${num(n)}</b></div>
      <div class="bt"><div class="bf" style="width:${(n/max*100).toFixed(1)}%"></div></div></div>`).join('')}</div>`;
}

/* ---- SUBSISTEMAS ---- */
function vSubsistemas(){
  const subs = S.sub ? arr(D.subsistemas).filter(s=>s.n===S.sub) : arr(D.subsistemas);
  $('#vistas').innerHTML=`<div class="vh"><div><h2>Los 8 subsistemas del SINRADR</h2>
    <p>Creados por el Decreto 1406 de 2023. Cada uno con su plan de acción, su entidad coordinadora y su reporte de cumplimiento.</p></div></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-bottom:14px">
      ${subs.map(s=>{const P=arr(D.planes).filter(p=>p.subsistema===s.n);
        return `<div class="bigc" style="--k:${s.color};cursor:pointer" data-s="${s.n}">
          <div class="v" style="color:${s.color}">${P.length}</div><div class="u">actividades</div>
          <div class="l">${s.n}. ${esc(s.corto)}</div>
          <div class="cita">${esc((s.coordinador||'sin coordinador registrado').slice(0,64))}</div></div>`;}).join('')}
    </div>
    <div id="acordeon2"></div>`;
  $$('#vistas .bigc[data-s]').forEach(b=>b.onclick=()=>{S.sub=+b.dataset.s;rail();render();});
  acordeon('#acordeon2', null);
}

/* ---- BALANCE ---- */
function vBalance(){
  const R = arr(D.resumen).filter(r=>!S.sub||r.subsistema===S.sub);
  const P = arr(D.planes).filter(p=>!S.sub||p.subsistema===S.sub);
  const conR = P.filter(p=>p.reporta), barr = P.filter(p=>p.barreras&&p.barreras.length>3);
  const est={}; P.forEach(p=>est[p.estado]=(est[p.estado]||0)+1);
  const porEstr={}; P.forEach(p=>porEstr[p.estrategia]=(porEstr[p.estrategia]||0)+1);
  $('#vistas').innerHTML=`<div class="vh"><div><h2>Qué se hizo y qué no</h2>
    <p>Balance de los planes de acción de los subsistemas. Solo ${conR.length} de ${P.length} actividades traen reporte de cumplimiento de la entidad: <b>ese vacío también es un hallazgo</b>.</p></div></div>
    <div class="big">
      <div class="bigc"><div class="v">${num(P.length)}</div><div class="u">actividades comprometidas</div>
        <div class="l">En los planes 2024-2026</div></div>
      <div class="bigc"><div class="v">${num(conR.length)}</div><div class="u">${dec(100*conR.length/Math.max(P.length,1),0)}% del total</div>
        <div class="l">Con reporte de cumplimiento</div></div>
      <div class="bigc alerta"><div class="v">${num(P.length-conR.length)}</div><div class="u">sin información</div>
        <div class="l">Sin reporte de la entidad</div></div>
      <div class="bigc alerta"><div class="v">${num(barr.length)}</div><div class="u">actividades</div>
        <div class="l">Con barreras documentadas</div></div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
      <div class="card"><header><h3>Estado de las actividades</h3></header><div class="body">
        ${Object.entries(est).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
          const col={Cumplida:'#2E7D32','En proceso':'#F9A825','Sin avance':'#C62828','Sin reporte':'#B0BEC5'}[k];
          return `<div class="barra-it"><div class="bn"><span>${ICONO[k]||''} ${k}</span><b>${v}</b></div>
            <div class="bt"><div class="bf" style="width:${v/P.length*100}%;background:${col}"></div></div></div>`;}).join('')}</div></div>
      <div class="card"><header><h3>Por estrategia territorial</h3><span class="sub">SINRAD</span></header><div class="body">
        ${Object.entries(porEstr).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
          const mx=Math.max(...Object.values(porEstr));
          return `<div class="barra-it"><div class="bn"><span>${esc(k)}</span><b>${v}</b></div>
            <div class="bt"><div class="bf" style="width:${v/mx*100}%"></div></div></div>`;}).join('')}</div></div>
    </div>
    ${barr.length?`<div class="card" style="margin-top:13px"><header><h3>⛔ Barreras documentadas por las propias entidades</h3>
      <span class="sub">${barr.length}</span></header><div class="body">
      ${barr.slice(0,14).map(p=>`<div class="plan" style="border-left-color:#C62828">
        <div class="pa">${esc(p.actividad)}</div>
        <div class="pb"><b>Barrera:</b> ${esc(String(p.barreras).slice(0,400))}</div>
        <div class="pf">Subsistema ${p.subsistema} · ${p.anio}</div></div>`).join('')}
      ${barr.length>14?`<details class="mas"><summary>Ver las otras ${barr.length-14}</summary>
        ${barr.slice(14).map(p=>`<div class="plan" style="border-left-color:#C62828">
          <div class="pa">${esc(p.actividad)}</div><div class="pb">${esc(String(p.barreras).slice(0,400))}</div></div>`).join('')}</details>`:''}
      </div></div>`:''}`;
}

/* ---- DEFENSA ---- */
function vDefensa(){
  const P = arr(D.planes).filter(p=>p.estado==='Sin avance' || (p.barreras&&p.barreras.length>3));
  $('#vistas').innerHTML=`<div class="vh"><div><h2>Defensa</h2>
    <p>Lo que quedó sin avance o con barreras es lo primero que se pierde en un cambio de gobierno.</p></div></div>
    <div class="card" style="margin-bottom:13px"><header><h3>⚠️ Compromisos en riesgo</h3>
      <span class="sub">${P.length} actividades sin avance o con barreras</span></header>
      <div class="body">${P.length?P.slice(0,20).map(fichaPlan).join(''):'<div class="vacio">Sin registros.</div>'}</div></div>
    <div class="card"><header><h3>📰 Denuncias documentadas</h3><span class="sub">solo con fuente verificable</span></header>
      <div class="body"><div class="vacio">Todavía no hay denuncias cargadas.<br>
        <span style="font-size:11.5px">Esta sección se alimenta solo de hechos verificados, con municipio identificado y enlace a la fuente.</span></div></div></div>`;
}
