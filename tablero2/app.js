/* Tablero v5 — navegación en profundidad:
   Sujetos → Dimensiones → Derechos → La herramienta (instrumentos + ruta de defensa + alertas).
   Datos: la matriz de normatividad clasificada + hitos (contador/IGAC) + respuestas del formulario. */
let D = null;
const S = { nivel:'sujetos', sujeto:null, dimension:null, derecho:null, hito:null };

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const arr = x => Array.isArray(x) ? x : [];
const num = n => new Intl.NumberFormat('es-CO').format(n);
const noAc = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

fetch('datos.json').then(r=>r.json()).then(d=>{ D=d; render(); })
  .catch(e=>{ $('#app').innerHTML = `<p class="vacio">No se pudieron cargar los datos: ${esc(e.message)}</p>`; });

/* ---------- filtrado de instrumentos ---------- */
function instrumentos(suj, dim, der){
  return arr(D.instrumentos).filter(it=>{
    if(suj){
      const m = arr(suj.match).some(x=>it.sujetos.includes(x)) || it.sujetos.includes('Todos');
      if(!m) return false;
    }
    if(dim){ if(!it.dimensiones.some(x=>noAc(x)===noAc(dim.n))) return false; }
    if(der){ if(!it.derechos.includes(der.n)) return false; }
    return true;
  });
}
const derechoKey = der => der.n; // los instrumentos guardan el nombre completo

/* ---------- navegación ---------- */
function ir(nivel, extra={}){ Object.assign(S, {nivel}, extra); render(); window.scrollTo({top:0,behavior:'smooth'}); }
function ruta(){
  const migas = [{t:'Inicio', on:()=>ir('sujetos',{sujeto:null,dimension:null,derecho:null,hito:null})}];
  if(S.sujeto) migas.push({t:S.sujeto.n, on:()=>ir('dimensiones',{dimension:null,derecho:null})});
  if(S.dimension) migas.push({t:S.dimension.n, on:()=>ir('derechos',{derecho:null})});
  if(S.derecho) migas.push({t:S.derecho.n, on:()=>{}});
  if(S.hito) migas.push({t:S.hito.titulo, on:()=>{}});
  const R = $('#ruta');
  if(migas.length<=1){ R.innerHTML=''; return; }
  R.innerHTML = migas.map((m,i)=>{
    const actual = i===migas.length-1;
    return `${i?'<span class="sep">›</span>':''}<button class="mig ${actual?'actual':''}" data-i="${i}">${esc(m.t)}</button>`;
  }).join('');
  $$('#ruta .mig').forEach(b=>b.onclick=()=>migas[+b.dataset.i].on());
}

/* ---------- render por nivel ---------- */
function render(){
  ruta();
  ({sujetos:vSujetos, dimensiones:vDimensiones, derechos:vDerechos, herramienta:vHerramienta, hito:vHito}[S.nivel]||vSujetos)();
}

/* NIVEL 1 — sujetos + hitos */
function vSujetos(){
  const cards = arr(D.sujetos).map(su=>{
    const n = instrumentos(su).length;
    return `<button class="card-nav" data-suj="${su.k}">
      <span class="emoji">${su.emoji}</span>
      <h3>${esc(su.n)}</h3>
      <span class="cuenta">${n} instrumento${n!==1?'s':''}</span>
      <span class="flecha">→</span></button>`;
  }).join('');
  const hitos = arr(D.hitos).map(h=>`
    <div class="hito">
      <h4>${h.emoji||''} ${esc(h.titulo)}</h4>
      ${h.cifras?h.cifras.map(c=>`<div><span class="cifra">${esc(c.v)}</span> <span class="u">${esc(c.u)}</span></div>`).join(''):''}
      ${h.lista?`<ul>${h.lista.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
      ${h.extra?`<div class="u" style="margin-top:6px"><b>${esc(h.extra)}</b></div>`:''}
      <div class="fuente">Fuente: ${esc(h.fuente)}</div>
    </div>`).join('');
  $('#app').innerHTML = `
    <p class="intro">Elija un <b>sujeto del campo</b> para ver, paso a paso, sus dimensiones, sus derechos,
      los instrumentos (decretos y resoluciones) que los materializan y la ruta para defenderlos.</p>
    <div class="rej suj">${cards}</div>
    <div class="seccion-tit">Hitos de la reforma agraria</div>
    <div class="hitos">${hitos}</div>`;
  $$('#app .card-nav').forEach(b=>b.onclick=()=>{
    S.sujeto = D.sujetos.find(x=>x.k===b.dataset.suj); ir('dimensiones');
  });
}

/* NIVEL 2 — dimensiones del sujeto */
function vDimensiones(){
  const cards = arr(D.dimensiones).map(dm=>{
    const n = instrumentos(S.sujeto, dm).length;
    if(!n) return '';
    return `<button class="card-nav" data-dim="${dm.k}">
      <span class="emoji">${dm.emoji}</span>
      <h3>${esc(dm.n)}</h3>
      <span class="cuenta">${n} instrumento${n!==1?'s':''}</span>
      <span class="flecha">→</span></button>`;
  }).join('');
  $('#app').innerHTML = `
    <p class="intro">Dimensiones de <b>${esc(S.sujeto.n)}</b>. Elija una para ver los derechos que se juegan en ella.</p>
    <div class="rej dim">${cards || '<p class="vacio">Sin instrumentos para este sujeto.</p>'}</div>`;
  $$('#app .card-nav').forEach(b=>b.onclick=()=>{
    S.dimension = D.dimensiones.find(x=>x.k===b.dataset.dim); ir('derechos');
  });
}

/* NIVEL 3 — derechos (subsistemas) */
function vDerechos(){
  const cards = arr(D.derechos).map(de=>{
    const n = instrumentos(S.sujeto, S.dimension, de).length;
    if(!n) return '';
    return `<button class="card-nav" data-der="${de.k}">
      <h3>${esc(de.n)}</h3>
      <span class="desc">${esc(de.sub)}</span>
      <span class="cuenta">${n} instrumento${n!==1?'s':''}</span>
      <span class="flecha">→</span></button>`;
  }).join('');
  $('#app').innerHTML = `
    <p class="intro"><b>${esc(S.sujeto.n)}</b> › <b>${esc(S.dimension.n)}</b>. Estos son los derechos con instrumentos en esta dimensión.</p>
    <div class="rej der">${cards || '<p class="vacio">Sin derechos con instrumentos para esta combinación.</p>'}</div>`;
  $$('#app .card-nav').forEach(b=>b.onclick=()=>{
    S.derecho = D.derechos.find(x=>x.k===b.dataset.der); ir('herramienta');
  });
}

/* NIVEL 4 — la herramienta: instrumentos + ruta de defensa + alertas + respuestas */
function vHerramienta(){
  const its = instrumentos(S.sujeto, S.dimension, S.derecho);
  const ruta = (D.rutas||{})[S.derecho.k] || {};
  // alertas reales del formulario para este derecho
  const respu = arr(D.respuestas).filter(r=> mapaDerecho(r) === S.derecho.k);
  const alertasReales = respu.filter(r=>r.alerta).map(r=>r.alerta);

  const listaInstr = its.map(it=>`
    <div class="instrumento">
      <span class="tipo-num">${esc(it.tipo)} ${esc(it.numero)}${it.fecha?' · '+esc(it.fecha):''}</span>
      <div class="desc">${esc(it.descripcion||it.epigrafe.slice(0,90))}</div>
      <div class="epi">${esc(it.epigrafe.slice(0,220))}${it.epigrafe.length>220?'…':''}</div>
      <div class="meta">
        ${it.sujetos.map(s=>`<span class="chip-x">${esc(s)}</span>`).join('')}
        ${it.dimensiones.map(dm=>`<span>· ${esc(dm)}</span>`).join('')}
      </div>
      <div class="fuente-x">Fuente: ${esc(it.hoja)}${it.enlace?` · <a href="${esc(it.enlace)}" target="_blank" rel="noopener">ver norma</a>`:''}</div>
    </div>`).join('');

  const respuHTML = respu.length ? respu.map(r=>`
    <div class="resp-x">
      <div class="dep">${esc(r.dependencia)}</div>
      ${r.logros?`<div class="logro">${esc(r.logros.slice(0,200))}</div>`:''}
      ${r.indicadores&&r.indicadores.length?`<div class="cifras">${r.indicadores.slice(0,4).map(i=>`<span>${esc(i.valor||'')} ${esc(i.unidad||'')} · ${esc((i.nombre||'').slice(0,40))}</span>`).join('')}</div>`:''}
    </div>`).join('') : '<p class="vacio">Aún no hay reportes de las dependencias para este derecho.</p>';

  $('#app').innerHTML = `
    <div class="h4-cab">
      <div class="der-sub">${esc(S.sujeto.n)} · ${esc(S.dimension.n)}</div>
      <h2>${esc(S.derecho.n)}</h2>
      <div class="ctx">${esc(S.derecho.sub)} · ${its.length} instrumento${its.length!==1?'s':''}</div>
    </div>
    <div class="cols2">
      <div>
        <div class="panel ruta-def"><h3>🛡️ Ruta de defensa</h3><div class="body">
          ${ruta.protege?`<div class="protege">${esc(ruta.protege)}</div>`:''}
          ${ruta.pasos?`<ol>${ruta.pasos.map(p=>`<li>${esc(p)}</li>`).join('')}</ol>`:'<p class="vacio">—</p>'}
        </div></div>
        <div class="panel"><h3>🚨 Alertas</h3><div class="body">
          ${alertasReales.length?alertasReales.map(a=>`<div class="alerta-real"><b>${esc({rojo:'Roja',naranja:'Naranja',verde:'Verde',gris:'Sin información'}[a.nivel]||a.nivel)}</b>${a.tipo?' · '+esc(a.tipo):''}${a.nota?`<div>${esc(a.nota)}</div>`:''}</div>`).join(''):''}
          ${ruta.alertas?ruta.alertas.map(a=>`<div class="alerta-tipo"><span class="pt al-naranja"></span>${esc(a)}</div>`).join(''):''}
        </div></div>
      </div>
      <div>
        <div class="panel"><h3>📜 La herramienta — instrumentos de acceso a este derecho</h3><div class="body">
          ${listaInstr || '<p class="vacio">Sin instrumentos.</p>'}
        </div></div>
        <div class="panel"><h3>📋 Lo que reportaron las dependencias</h3><div class="body">
          ${respuHTML}
        </div></div>
      </div>
    </div>`;
}

/* mapea una respuesta del formulario (subsistema) a la clave de derecho */
function mapaDerecho(r){
  const sub = parseInt(String(r.subsistema).toString().split('.')[0]) || r.subsistema;
  return ({1:'tierra',2:'territorio',3:'agua',4:'vivirbien',5:'conocimiento',6:'economia',7:'credito',8:'etnico'})[sub] || '';
}

function vHito(){ ir('sujetos'); }
