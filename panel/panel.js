/* Panel de depuración del equipo de veeduría.
   Lee y escribe contra el receptor de Apps Script. La clave del equipo NO va en el
   código: la escribe quien entra y se guarda solo en esta pestaña. */

const EXEC = 'https://script.google.com/macros/s/AKfycbx0iwLCC6QnUuok2-2ZGptW6jI2dvN1e53wT6mFECSsYKklprFqGps3xlOaRRbv3rdi/exec';

const USUARIOS = ['lorenza.arango', 'daniela.marcucci', 'santiago.roldan'];

// columnas que se muestran resumidas en la tabla; el resto se ve al abrir el registro
const COL_TABLA = ['dependencia', 'subsistema', 'linea', 'indicador', 'valor', 'unidad'];
const ETIQUETAS = {
  recibido:'Recibido', dependencia:'Dependencia', entidad:'Entidad', subsistema:'Subsistema',
  linea:'Línea estratégica', linea_agregada:'Línea agregada', situacion_2022:'Cómo estaba en 2022',
  indicador:'Indicador', indicador_tipo:'Tipo', valor:'Valor', unidad:'Unidad', fecha_corte:'Fecha de corte',
  logros:'Logros', estado:'¿Se cumplió?', tipo_instrumento:'Tipo de instrumento', instrumento:'Norma/programa',
  donde:'Dónde', poblacion:'Población beneficiaria', que_falta:'Qué falta', fragilidad:'Qué tan fácil se pierde',
  alerta_nivel:'Alerta (nivel)', alerta_tipo:'Alerta (tipo)', alerta_verif:'Alerta (verificación)',
  alerta_nota:'Alerta (nota)', fuente:'Fuente', observaciones:'Observaciones'
};
const ESTADOS = { pendiente:'Pendiente', revisado:'Revisado', aprobado:'Aprobado', rechazado:'Rechazado' };

let D = null;                       // { header, filas, curacion, proceso }
const S = { usuario:'', clave:'', filtro:{ buscar:'', dep:'', sub:'', estado:'' }, edit:null };

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- red ---------- */
async function pedir(cuerpo){
  // text/plain: petición simple, sin preflight CORS (Apps Script no responde el preflight)
  const r = await fetch(EXEC, { method:'POST',
    headers:{ 'Content-Type':'text/plain;charset=utf-8' },
    body: JSON.stringify(cuerpo) });
  if(!r.ok) throw new Error('el servidor respondió ' + r.status);
  const t = await r.text();
  try { return JSON.parse(t); } catch(e){ throw new Error('respuesta inesperada'); }
}
const cargarDatos = () => pedir({ accion:'panel', claveAdmin:S.clave });
const guardarCuracion = (id, estado, nota) =>
  pedir({ accion:'curar', claveAdmin:S.clave, id, estado, nota, por:S.usuario });
const guardarPaso = (clave, hecho, texto) =>
  pedir({ accion:'checklist', claveAdmin:S.clave, clave, hecho, texto, por:S.usuario });

/* ---------- entrada ---------- */
function iniciarEntrada(){
  $('#eUsuario').innerHTML = '<option value="">Elija…</option>' +
    USUARIOS.map(u=>`<option value="${u}">${u}</option>`).join('');
  const g = sessionStorage.getItem('panel_ses');
  if(g){ try{ const v=JSON.parse(g); S.usuario=v.u; S.clave=v.c;
    $('#eUsuario').value=v.u; entrar(true); }catch(e){} }
  $('#eEntrar').onclick = ()=>entrar(false);
  $('#eClave').onkeydown = e=>{ if(e.key==='Enter') entrar(false); };
}
async function entrar(silencioso){
  const u = $('#eUsuario').value, c = silencioso ? S.clave : $('#eClave').value.trim();
  if(!u){ $('#eErr').textContent = 'Elija quién entra.'; return; }
  if(!c){ $('#eErr').textContent = 'Escriba la clave del equipo.'; return; }
  $('#eEntrar').disabled = true; $('#eEntrar').textContent = 'Entrando…'; $('#eErr').textContent='';
  S.usuario = u; S.clave = c;
  try{
    const d = await cargarDatos();
    if(d && d.ok === false && d.error === 'admin'){ throw new Error('clave'); }
    if(!d || !Array.isArray(d.filas) || !Array.isArray(d.header)){
      // respuesta que no es la del panel: normalmente el receptor viejo sin actualizar
      throw new Error('receptor');
    }
    D = d;
    sessionStorage.setItem('panel_ses', JSON.stringify({ u, c }));
    $('#entrada').classList.add('oculto');
    $('#panel').classList.remove('oculto');
    $('#quien').textContent = u;
    render();
  }catch(e){
    sessionStorage.removeItem('panel_ses');
    $('#eErr').textContent =
      e.message === 'clave'    ? 'Esa clave no da acceso al panel.' :
      e.message === 'receptor' ? 'El receptor todavía no tiene el panel habilitado (falta actualizarlo).' :
      'No se pudo entrar: ' + e.message;
    $('#eEntrar').disabled = false; $('#eEntrar').textContent = 'Entrar';
    if(silencioso){ /* al recargar con sesión vieja, vuelve a pedir */ }
  }
}
function salir(){ sessionStorage.removeItem('panel_ses'); location.reload(); }

/* ---------- datos derivados ---------- */
const curDe = id => (D.curacion && D.curacion[id]) || { estado:'', nota:'', por:'', cuando:'' };
const estadoDe = id => curDe(id).estado || 'pendiente';
const soloReales = () => D.filas.filter(f => !/prueba/i.test(String(f.dependencia||'')));

function filtradas(){
  return soloReales().filter(f=>{
    const F = S.filtro;
    if(F.dep && String(f.dependencia)!==F.dep) return false;
    if(F.sub && String(f.subsistema).split('.')[0]!==F.sub) return false;
    if(F.estado && estadoDe(f.id)!==F.estado) return false;
    if(F.buscar){
      const txt = Object.values(f).join(' ').toLowerCase();
      if(!txt.includes(F.buscar.toLowerCase())) return false;
    }
    return true;
  });
}

/* ---------- render ---------- */
function render(){
  renderTarjetas(); renderFiltros(); renderTabla(); renderProceso();
}
function renderTarjetas(){
  const reales = soloReales();
  const cont = {pendiente:0, revisado:0, aprobado:0, rechazado:0};
  reales.forEach(f=>cont[estadoDe(f.id)]++);
  const deps = new Set(reales.map(f=>String(f.dependencia))).size;
  const card = (n,l,cls='') => `<div class="tarjeta ${cls}"><div class="t-num">${n}</div><div class="t-lab">${l}</div></div>`;
  $('#tarjetas').innerHTML =
    card(reales.length,'registros recibidos') +
    card(deps,'dependencias') +
    card(cont.pendiente,'por revisar','am') +
    card(cont.aprobado,'aprobados','ok') +
    card(cont.rechazado,'rechazados','no');
}
function renderFiltros(){
  const reales = soloReales();
  const deps = [...new Set(reales.map(f=>String(f.dependencia)))].sort();
  const subs = [...new Set(reales.map(f=>String(f.subsistema).split('.')[0]))].sort();
  const sel = (el, ops, val) => { el.innerHTML = el.children[0].outerHTML +
    ops.map(o=>`<option ${o===val?'selected':''}>${esc(o)}</option>`).join(''); };
  sel($('#fDep'), deps, S.filtro.dep);
  sel($('#fSub'), subs, S.filtro.sub);
  $('#fBuscar').oninput = e=>{ S.filtro.buscar=e.target.value; renderTabla(); };
  $('#fDep').onchange   = e=>{ S.filtro.dep=e.target.value; renderTabla(); };
  $('#fSub').onchange   = e=>{ S.filtro.sub=e.target.value; renderTabla(); };
  $('#fEstado').onchange= e=>{ S.filtro.estado=e.target.value; renderTabla(); };
}
function renderTabla(){
  const filas = filtradas();
  $('#cuentaFiltro').textContent = `${filas.length} de ${soloReales().length}`;
  const th = COL_TABLA.map(c=>`<th>${esc(ETIQUETAS[c]||c)}</th>`).join('');
  const cuerpo = filas.map(f=>{
    const est = estadoDe(f.id), cur = curDe(f.id);
    const celdas = COL_TABLA.map(c=>{
      let v = String(f[c]??'');
      if(c==='subsistema') v = v.split('.')[0];
      if(c==='linea' && v.length>60) v = v.slice(0,60)+'…';
      return `<td>${esc(v)}</td>`;
    }).join('');
    return `<tr data-id="${f.id}" class="est-${est}">
      ${celdas}
      <td class="c-est"><span class="pill ${est}">${ETIQUETAS_EST(est)}</span>${cur.nota?' 📝':''}</td>
      <td><button class="btn plano mini" data-editar="${f.id}">Abrir</button></td></tr>`;
  }).join('');
  $('#tabla').innerHTML = `<thead><tr>${th}<th>Estado</th><th></th></tr></thead>
    <tbody>${cuerpo || `<tr><td colspan="${COL_TABLA.length+2}" class="vacio">Nada que mostrar con estos filtros.</td></tr>`}</tbody>`;
  $$('[data-editar]').forEach(b=>b.onclick=()=>abrirRegistro(b.dataset.editar));
}
const ETIQUETAS_EST = e => ESTADOS[e] || e;

function renderProceso(){
  const cont = $('#listaProceso');
  cont.innerHTML = (D.proceso||[]).map(p=>`
    <label class="paso ${p.hecho?'hecho':''}">
      <input type="checkbox" data-paso="${esc(p.clave)}" ${p.hecho?'checked':''}>
      <span class="paso-txt">${esc(p.texto)}</span>
      <span class="paso-meta">${p.hecho&&p.por?`✓ ${esc(p.por)} · ${fechaCorta(p.cuando)}`:''}</span>
    </label>`).join('');
  $$('[data-paso]').forEach(c=>c.onchange=async()=>{
    c.disabled=true;
    try{ await guardarPaso(c.dataset.paso, c.checked);
      const p=(D.proceso||[]).find(x=>x.clave===c.dataset.paso);
      if(p){ p.hecho=c.checked; p.por=c.checked?S.usuario:''; p.cuando=c.checked?new Date().toISOString():''; }
      renderProceso(); flash('Guardado');
    }catch(e){ c.checked=!c.checked; flash('No se pudo guardar', true); }
    c.disabled=false;
  });
  $('#btnNuevoPaso').onclick = async()=>{
    const t = $('#nuevoPaso').value.trim(); if(!t) return;
    const clave = 'x'+Date.now();
    try{ await guardarPaso(clave, false, t);
      (D.proceso=D.proceso||[]).push({clave, texto:t, hecho:false, por:'', cuando:''});
      $('#nuevoPaso').value=''; renderProceso(); flash('Paso agregado');
    }catch(e){ flash('No se pudo agregar', true); }
  };
}

/* ---------- editor de registro ---------- */
function abrirRegistro(id){
  const f = D.filas.find(x=>x.id===id); if(!f) return;
  S.edit = id;
  const cur = curDe(id);
  const campos = D.header.filter(c=>c!=='id' && (f[c]!==''&&f[c]!==undefined))
    .map(c=>`<div class="campo-ver"><label>${esc(ETIQUETAS[c]||c)}</label>
      <div>${esc(String(f[c]))}</div></div>`).join('');
  $('#mTit').textContent = f.dependencia || 'Registro';
  $('#mCuerpo').innerHTML = `
    <div class="ver-datos">${campos}</div>
    <div class="curacion">
      <label>Estado de depuración</label>
      <div class="est-botones">
        ${Object.entries(ESTADOS).map(([k,v])=>`
          <button class="est-b ${k} ${estadoDe(id)===k?'on':''}" data-est="${k}">${v}</button>`).join('')}
      </div>
      <label style="margin-top:12px">Nota de depuración (opcional)</label>
      <textarea id="mNota" placeholder="Qué se revisó, qué se corrigió, qué falta verificar…">${esc(cur.nota)}</textarea>
      ${cur.por?`<p class="ayuda">Última edición: ${esc(cur.por)} · ${fechaCorta(cur.cuando)}</p>`:''}
    </div>`;
  let estSel = estadoDe(id);
  $$('#mCuerpo .est-b').forEach(b=>b.onclick=()=>{
    estSel=b.dataset.est; $$('#mCuerpo .est-b').forEach(x=>x.classList.toggle('on',x===b));
  });
  $('#modal').classList.remove('oculto');
  const cerrar = ()=>$('#modal').classList.add('oculto');
  $('#mX').onclick = $('#mCerrar').onclick = cerrar;
  $('#mGuardar').onclick = async()=>{
    $('#mGuardar').disabled=true; $('#mGuardar').textContent='Guardando…';
    try{
      await guardarCuracion(id, estSel, $('#mNota').value);
      D.curacion = D.curacion||{};
      D.curacion[id] = { estado:estSel, nota:$('#mNota').value, por:S.usuario, cuando:new Date().toISOString() };
      cerrar(); renderTarjetas(); renderTabla(); flash('Guardado');
    }catch(e){ flash('No se pudo guardar: '+e.message, true); }
    $('#mGuardar').disabled=false; $('#mGuardar').textContent='Guardar';
  };
}

/* ---------- descargas ---------- */
function csv(filas){
  const cols = D.header.filter(c=>c!=='id')
    .concat(['cur_estado','cur_nota','cur_por']);
  const q = v => '"'+String(v??'').replace(/"/g,'""').replace(/[\r\n]+/g,' ')+'"';
  const lineas = filas.map(f=>{
    const cur = curDe(f.id);
    return cols.map(c=>{
      if(c==='cur_estado') return q(estadoDe(f.id));
      if(c==='cur_nota') return q(cur.nota);
      if(c==='cur_por') return q(cur.por);
      return q(f[c]);
    }).join(';');
  });
  return '﻿' + cols.join(';') + '\n' + lineas.join('\n') + '\n';
}
function bajar(nombre, contenido, tipo){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], {type:tipo}));
  a.download = nombre; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function iniciarDescargas(){
  $('#btnCsvTodo').onclick = ()=>bajar('veeduria_recibido.csv', csv(soloReales()), 'text/csv;charset=utf-8');
  $('#btnCsvAprob').onclick = ()=>{
    const ap = soloReales().filter(f=>estadoDe(f.id)==='aprobado');
    if(!ap.length){ flash('Todavía no hay registros aprobados', true); return; }
    bajar('veeduria_aprobado.csv', csv(ap), 'text/csv;charset=utf-8');
  };
  $('#btnDataset').onclick = ()=>{
    const ap = soloReales().filter(f=>estadoDe(f.id)==='aprobado');
    if(!ap.length){ flash('Apruebe registros antes de generar el dataset', true); return; }
    const limpio = ap.map(f=>{ const o={}; D.header.forEach(c=>{ if(c!=='id') o[c]=f[c]; });
      o.poblacion = String(f.poblacion||'').split(';').map(s=>s.trim()).filter(Boolean); return o; });
    bajar('dataset_tablero.json', JSON.stringify({
      generado: new Date().toISOString(), por: S.usuario, registros: limpio.length, datos: limpio
    }, null, 1), 'application/json');
    $('#avisoDataset').textContent = `${limpio.length} registros aprobados exportados.`;
  };
}

/* ---------- utilidades ---------- */
function fechaCorta(iso){ if(!iso) return ''; const d=String(iso);
  return d.length>=16 ? d.slice(0,10)+' '+d.slice(11,16) : d; }
let tFlash;
function flash(msg, malo){
  const a=$('#aviso'); a.textContent=msg; a.className='aviso-flotante'+(malo?' malo':'');
  clearTimeout(tFlash); tFlash=setTimeout(()=>a.classList.add('oculto'), 2200);
}
function iniciarTabs(){
  $$('.tab').forEach(t=>t.onclick=()=>{
    $$('.tab').forEach(x=>x.classList.toggle('on',x===t));
    $$('.panel-tab').forEach(p=>p.classList.add('oculto'));
    $('#tab-'+t.dataset.tab).classList.remove('oculto');
  });
}
async function refrescar(){
  $('#btnRefrescar').disabled=true;
  try{ D = await cargarDatos(); render(); flash('Actualizado'); }
  catch(e){ flash('No se pudo actualizar', true); }
  $('#btnRefrescar').disabled=false;
}

/* ---------- arranque ---------- */
iniciarEntrada(); iniciarTabs(); iniciarDescargas();
$('#btnSalir').onclick = salir;
$('#btnRefrescar').onclick = refrescar;
