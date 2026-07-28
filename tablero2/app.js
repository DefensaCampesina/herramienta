/* Tablero v5.1 — portada partida (sujetos+alertas | mapa de territorialidades),
   drill-down Sujeto → Dimensión → Derecho → Instrumentos, y cápsula de alertas. */
let D=null, G=null, T=null;
const S = { nivel:'inicio', sujeto:null, dimension:null, derecho:null,
            capa:'zrc', alFiltro:{nivel:'',derecho:'',sujeto:''}, zoom:null };

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const arr = x => Array.isArray(x) ? x : [];
const num = n => new Intl.NumberFormat('es-CO').format(Math.round(n||0));
const noAc = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

Promise.all([
  fetch('datos.json').then(r=>r.json()),
  fetch('geo.json').then(r=>r.json()),
  fetch('territorialidades.json').then(r=>r.json()).catch(()=>({}))
]).then(([d,g,t])=>{ D=d; G=g; T=t; render(); })
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
/* dimensiones válidas para un sujeto (campesinado no lleva cultural-ancestral) */
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
  if(S.sujeto) m.push({t:S.sujeto.n,on:()=>ir('dimensiones',{dimension:null,derecho:null})});
  if(S.dimension) m.push({t:S.dimension.n,on:()=>ir('derechos',{derecho:null})});
  if(S.derecho) m.push({t:S.derecho.n,on:()=>{}});
  const R=$('#ruta');
  if(m.length<=1){ R.innerHTML=''; return; }
  R.innerHTML=m.map((x,i)=>`${i?'<span class="sep">›</span>':''}<button class="mig ${i===m.length-1?'actual':''}" data-i="${i}">${esc(x.t)}</button>`).join('');
  $$('#ruta .mig').forEach(b=>b.onclick=()=>m[+b.dataset.i].on());
}
function render(){ ruta();
  ({inicio:vInicio,alertas:vAlertas,territorialidades:vTerritorialidades,
    dimensiones:vDimensiones,derechos:vDerechos,herramienta:vHerramienta}[S.nivel]||vInicio)(); }

/* ================= INICIO: dos columnas ================= */
function vInicio(){
  const al = alertasUtiles();
  const cards = arr(D.sujetos).map(su=>{
    const n=instrumentos(su).length;
    return `<button class="card-suj" data-suj="${su.k}"><span class="emoji">${su.emoji}</span>
      <span class="txt"><b>${esc(su.n)}</b><small>${n} instrumento${n!==1?'s':''}</small></span>
      <span class="flecha">→</span></button>`;
  }).join('');
  const hitos = arr(D.hitos).map(h=>`<div class="hito">
      <h4>${h.emoji||''} ${esc(h.titulo)}</h4>
      ${h.cifras?h.cifras.map(c=>`<div><span class="cifra">${esc(c.v)}</span> <span class="u">${esc(c.u)}</span></div>`).join(''):''}
      ${h.lista?`<ul>${h.lista.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
      ${h.extra?`<div class="u"><b>${esc(h.extra)}</b></div>`:''}
      <div class="fuente">Fuente: ${esc(h.fuente)}</div></div>`).join('');

  $('#app').innerHTML = `
   <div class="inicio2">
     <div class="col-izq">
       <button class="btn-alertas" id="btnAl">
         <span class="ba-ico">🚨</span>
         <span class="ba-txt"><b>Alertas del territorio</b>
           <small>${al.total} registradas · ${al.conPorque} con explicación</small></span>
         <span class="ba-pts">${['rojo','naranja','gris','verde'].map(n=>
           al.porNivel[n]?`<i class="pt ${n}" title="${n}">${al.porNivel[n]}</i>`:'').join('')}</span>
       </button>

       <div class="seccion-tit">Sujetos populares del campo</div>
       <div class="lista-suj">${cards}</div>

       <div class="seccion-tit">Hitos de la reforma agraria</div>
       <div class="hitos">${hitos}</div>
     </div>

     <div class="col-der">
       <div class="mapa-panel">
         <div class="mapa-cab">
           <h3>🗺️ Territorialidades y seguridad alimentaria</h3>
           <button class="ver-todo" id="verTerr">Ver detalle →</button>
         </div>
         <div class="capas" id="capas"></div>
         <div class="mapa-caja" id="mapaBox"></div>
         <div class="mapa-pie" id="mapaPie"></div>
       </div>
     </div>
   </div>`;
  $$('#app .card-suj').forEach(b=>b.onclick=()=>{ S.sujeto=D.sujetos.find(x=>x.k===b.dataset.suj); ir('dimensiones'); });
  $('#btnAl').onclick=()=>ir('alertas');
  $('#verTerr').onclick=()=>ir('territorialidades');
  pintarCapas('#capas'); pintarMapa('#mapaBox','#mapaPie');
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
function vDimensiones(){
  const cards = dimensionesDe(S.sujeto).map(dm=>{
    const n=instrumentos(S.sujeto,dm).length; if(!n) return '';
    return `<button class="card-nav" data-dim="${dm.k}"><span class="emoji">${dm.emoji}</span>
      <h3>${esc(dm.n)}</h3><span class="cuenta">${n} instrumento${n!==1?'s':''}</span>
      <span class="flecha">→</span></button>`;
  }).join('');
  $('#app').innerHTML=`<p class="intro">Dimensiones de <b>${esc(S.sujeto.n)}</b>. Elija una para ver los derechos.</p>
    <div class="rej dim">${cards||'<p class="vacio">Sin instrumentos.</p>'}</div>`;
  $$('#app .card-nav').forEach(b=>b.onclick=()=>{ S.dimension=D.dimensiones.find(x=>x.k===b.dataset.dim); ir('derechos'); });
}
function vDerechos(){
  const cards = arr(D.derechos).map(de=>{
    const n=instrumentos(S.sujeto,S.dimension,de).length; if(!n) return '';
    return `<button class="card-nav" data-der="${de.k}"><h3>${esc(de.n)}</h3>
      <span class="desc">${esc(de.sub)}</span><span class="cuenta">${n} instrumento${n!==1?'s':''}</span>
      <span class="flecha">→</span></button>`;
  }).join('');
  $('#app').innerHTML=`<p class="intro"><b>${esc(S.sujeto.n)}</b> › <b>${esc(S.dimension.n)}</b></p>
    <div class="rej der">${cards||'<p class="vacio">Sin derechos con instrumentos.</p>'}</div>`;
  $$('#app .card-nav').forEach(b=>b.onclick=()=>{ S.derecho=D.derechos.find(x=>x.k===b.dataset.der); ir('herramienta'); });
}
function vHerramienta(){
  const its=instrumentos(S.sujeto,S.dimension,S.derecho);
  const ruta=(D.rutas||{})[S.derecho.k]||{};
  const alertas = arr(D.respuestas).filter(r=>r.alerta && derDeResp(r)===S.derecho.k && (r.alerta.nota||'').trim().length>10);
  $('#app').innerHTML=`
    <div class="h4-cab"><div class="der-sub">${esc(S.sujeto.n)} · ${esc(S.dimension.n)}</div>
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
    <div class="meta">${it.sujetos.map(s=>`<span class="chip-x">${esc(s)}</span>`).join('')}
      ${it.dimensiones.map(d=>`<span>· ${esc(d)}</span>`).join('')}</div>
    <div class="fuente-x">Fuente: ${esc(it.hoja)} ·
      ${enlaceOk?`<a href="${esc(it.enlace)}" target="_blank" rel="noopener">abrir la norma ↗</a>`
                :`<span class="sin-enlace">sin enlace en la fuente oficial</span>`}</div>
  </div>`;
}
