const CONFIG = {
endpoint: 'https://script.google.com/macros/s/AKfycbx0iwLCC6QnUuok2-2ZGptW6jI2dvN1e53wT6mFECSsYKklprFqGps3xlOaRRbv3rdi/exec',
token: 'campesina-2026'
};
let D = null, AL = null;
const LLAVE = 'campesinado_form_v4';
const S = { pantalla:'inicio', sub:0, id:{dep:'',ent:''}, r:{}, extra:{}, modalLinea:null, depAbierto:'' };
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const arr = x => Array.isArray(x) ? x : [];
const OPC = {
situacion_2022: ['No existía nada','Existía en el papel pero sin aplicarse','Existía pero muy limitado',
'Ya venía funcionando','No se sabe / no hay registro'],
estado: ['Se cumplió completo','Se cumplió en buena parte','Apenas se empezó',
'No se pudo avanzar','No aplica a esta línea'],
tipo_instrumento: ['Decreto','Ley','Resolución','Acuerdo','CONPES','Acto Legislativo',
'Circular','Programa','Proyecto','Convenio','Ninguno todavía','Otro'],
unidad: ['hectáreas','predios','familias campesinas','personas','mujeres rurales','jóvenes rurales',
'organizaciones campesinas','municipios','títulos','créditos','proyectos',
'millones de pesos','porcentaje','otra'],
fragilidad: ['Muy fácil — basta una firma o un cambio de resolución',
'Fácil — con un trámite administrativo se cae',
'Difícil — habría que cambiar una ley',
'Muy difícil — está blindado (ley, sentencia, acto legislativo)',
'Todavía no se sabe'],
tipo_ind: ['Numérico','Cualitativo']
};
const POBLACION = [
{ grupo: 'Sujetos', op: [
'Campesinado',
'Comunidades indígenas',
'Comunidades negras / afrocolombianas',
'Raizales',
'Palenqueros',
'Pueblo Rrom (gitano)',
'Pescadores artesanales' ] },
{ grupo: 'Enfoques', op: [
'Mujeres rurales',
'Jóvenes rurales',
'Víctimas del conflicto armado',
'Personas en reincorporación' ] }
];
const fuente = window.__CARGA__ ? window.__CARGA__()
: Promise.all([
fetch('datos.json').then(r=>r.json()),
fetch('alertas.json').then(r=>r.json()).catch(()=>null)
]).then(([d,a])=>({d,a}));
fuente.then(({d,a})=>{ D=d; AL=a; cargar(); pintar(); })
.catch(e=>{ $('#app').innerHTML = `<div class="wrap"><div class="tarjeta"><p>No se pudieron cargar los datos: ${esc(e.message)}</p></div></div>`; });
let tG;
function guardar(){
try{ localStorage.setItem(LLAVE, JSON.stringify({id:S.id, sub:S.sub, r:S.r, extra:S.extra}));
const g=$('#guardadoInd'); if(g){ g.textContent='guardado ✓'; g.classList.add('ver');
clearTimeout(tG); tG=setTimeout(()=>g.classList.remove('ver'),1300); } }catch(e){}
}
function cargar(){
try{ const v=JSON.parse(localStorage.getItem(LLAVE)||'null');
if(v){ S.id=v.id||S.id; S.sub=v.sub||0; S.r=v.r||{}; S.extra=v.extra||{}; } }catch(e){}
}
function lineas(){
const base = arr(D.lineas).filter(l=>l.subsistema===S.sub);
const propias = arr(S.extra[S.sub]).map(x=>({...x, subsistema:S.sub, propia:true}));
return base.concat(propias);
}
const subActual = () => arr(D.subsistemas).find(s=>s.n===S.sub);
function resp(id){
if(!S.r[id]) S.r[id] = { situacion_2022:'', logros:'', estado:'', indicadores:[],
tipo_instrumento:'', instrumento:'', que_falta:'', fragilidad:'', fuente:'', observaciones:'',
terr:'', dptos:[], mpios:[], poblacion:[],
alerta_nivel:'', alerta_tipo:'', alerta_nota:'', alerta_verif:'' };
const r = S.r[id];
if(!Array.isArray(r.indicadores)) r.indicadores=[];
if(!Array.isArray(r.dptos)) r.dptos=[];
if(!Array.isArray(r.mpios)) r.mpios=[];
if(!Array.isArray(r.poblacion)) r.poblacion=[];
return r;
}
const lleno = id => { const r=S.r[id];
return !!(r && (r.logros||r.estado||r.situacion_2022||r.observaciones||
(r.indicadores||[]).some(i=>i.nombre||i.valor) || r.alerta_nivel)); };
const completas = () => lineas().filter(l=>lleno(l.id)).length;
const totalLlenas = () => Object.keys(S.r).filter(id=>lleno(id)).length;
function pintar(){
const t = $('#tpl-'+({inicio:'inicio',matriz:'matriz',fin:'fin'}[S.pantalla]));
$('#app').innerHTML=''; $('#app').appendChild(t.content.cloneNode(true));
({inicio:pInicio, matriz:pMatriz, fin:pFin}[S.pantalla])();
barraSub();
const tot = lineas().length || 1;
$('#prog').style.width = (S.pantalla==='inicio'?4 : S.pantalla==='fin'?100 : 8+88*(completas()/tot))+'%';
window.scrollTo({top:0,behavior:'smooth'});
}
const ir = p => { S.pantalla=p; pintar(); };
function barraSub(){
const sel = $('#subBarra');
if(S.pantalla!=='matriz'){ sel.classList.add('oculto'); return; }
sel.classList.remove('oculto');
sel.innerHTML = arr(D.subsistemas).map(s=>{
const n = arr(D.lineas).filter(l=>l.subsistema===s.n).concat(arr(S.extra[s.n])||[])
.filter(l=>lleno(l.id)).length;
return `<option value="${s.n}" ${S.sub===s.n?'selected':''}>${s.n}. ${esc(s.corto)}${n?` — ${n} ✓`:''}</option>`;
}).join('');
sel.onchange = e=>{ S.sub=+e.target.value; guardar(); pintar(); };
}
function pInicio(){
['dep','ent'].forEach(k=>{ const e=$('#f'+k[0].toUpperCase()+k.slice(1));
e.value=S.id[k]||''; e.oninput=()=>{ S.id[k]=e.value.trim(); guardar(); }; });
$('#lstEnt').innerHTML = [...new Set(arr(D.subsistemas).map(s=>s.coordina.split(/[\/—]/)[0].trim()))]
.map(v=>`<option value="${esc(v)}">`).join('');
$('#fSub').innerHTML = '<option value="">Elija un subsistema…</option>' +
arr(D.subsistemas).map(s=>`<option value="${s.n}" ${S.sub===s.n?'selected':''}>${s.n}. ${esc(s.nombre)}</option>`).join('');
const info = ()=>{ const s=subActual();
$('#infoSub').innerHTML = s ? `<div class="info-sub"><span class="cnt">${lineas().length} líneas</span>
Llene las que conozca. Coordina: <b>${esc(s.coordina)}</b></div>` : ''; };
$('#fSub').onchange = e=>{ S.sub=+e.target.value||0; guardar(); info(); };
info();
const t = totalLlenas();
$('#avisoRetomar').textContent = t ? `Lleva ${t} línea${t>1?'s':''} diligenciada${t>1?'s':''}.` : '';
$('#btnEmpezar').onclick = ()=>{
if(!S.id.dep||!S.id.ent){ alert('Escriba la dependencia y la entidad.'); return; }
if(!S.sub){ alert('Elija un subsistema.'); return; }
guardar(); ir('matriz');
};
}
function pMatriz(){
const L = lineas(), s = subActual();
$('#mig').textContent = `Subsistema ${s.n} · ${s.corto}`;
$('#tituloSub').textContent = s.nombre;
const sel = (campo, opciones, id) => {
const v = resp(id)[campo];
return `<select data-id="${id}" data-f="${campo}" class="${v?'':'vacio'}">
<option value="">— elija —</option>
${opciones.map(o=>`<option ${v===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
};
const cuerpo = L.map((l,k)=>{
const r = resp(l.id);
const inds = r.indicadores.length ? r.indicadores : [null];
const indHTML = inds.map((ind, j)=>`<div class="ind-item">${filaIndicador(l.id, ind, j)}</div>`).join('');
const clsFila = `${lleno(l.id)?'completa':''} ${l.propia?'propia':''}`;
return `<tr class="${clsFila}" data-fila="${l.id}">
<td class="lin"><div class="num-lin">${l.propia?'<span class="etq-propia">AGREGADA</span>':'LÍNEA '+(k+1)}${lleno(l.id)?' <span class="marca-ok">✓</span>':''}
${l.propia?`<button class="quitar-lin" data-quitar="${l.id}" title="Quitar">✕</button>`:''}</div>
${l.propia
? `<textarea data-id="${l.id}" data-f="__linea" class="txt-lin" placeholder="Escriba la línea">${esc(l.linea)}</textarea>`
: `<div class="txt-lin">${esc(l.linea)}</div>`}</td>
<td>${sel('situacion_2022', OPC.situacion_2022, l.id)}</td>
<td class="celda-ind"><div class="inds-lista">${indHTML}</div>
<button class="btn-ind" data-mas-ind="${l.id}">＋ agregar indicador</button></td>
<td><textarea data-id="${l.id}" data-f="logros" placeholder="Ej: 1.200 familias campesinas con título">${esc(r.logros)}</textarea></td>
<td>${sel('estado', OPC.estado, l.id)}</td>
<td>${sel('tipo_instrumento', OPC.tipo_instrumento, l.id)}
<input data-id="${l.id}" data-f="instrumento" list="lstInst"
placeholder="${r.tipo_instrumento==='Otro'?'¿cuál? escríbalo':'888 de 2025'}"
value="${esc(r.instrumento)}" style="margin-top:4px"></td>
<td><button class="btn-terr ${resumenTerr(r)?'puesto':''}" data-terr="${l.id}">${esc(resumenTerr(r)||'+ elegir')}</button></td>
<td><button class="btn-pob ${r.poblacion.length?'puesto':''}" data-pob="${l.id}">${esc(resumenPob(r)||'+ elegir')}</button></td>
<td><textarea data-id="${l.id}" data-f="que_falta" placeholder="Ej: faltan recursos para los demás municipios">${esc(r.que_falta)}</textarea></td>
<td>${sel('fragilidad', OPC.fragilidad, l.id)}</td>
<td><button class="btn-alerta ${esc(r.alerta_nivel)}" data-al="${l.id}">${esc(resumenAlerta(r)||'+ alerta')}</button></td>
<td><input data-id="${l.id}" data-f="fuente" placeholder="Tablero ANT, hoja 12" value="${esc(r.fuente)}"></td>
<td><textarea data-id="${l.id}" data-f="observaciones" placeholder="Aclaraciones, salvedades">${esc(r.observaciones)}</textarea></td>
</tr>`;
}).join('');
$('#tabla').innerHTML = `
<thead><tr>
<th style="min-width:205px">Línea estratégica</th>
<th style="min-width:145px">¿Cómo estaba en 2022?<small>escoja</small></th>
<th style="min-width:335px">Indicadores<small>puede agregar varios por línea</small></th>
<th style="min-width:210px">Logros<small>escriba</small></th>
<th style="min-width:130px">¿Se cumplió?<small>escoja</small></th>
<th style="min-width:160px">¿Con qué norma o programa?<small>escoja y precise</small></th>
<th style="min-width:120px">¿Dónde?<small>clic para elegir</small></th>
<th style="min-width:150px">Población beneficiaria<small>clic para marcar</small></th>
<th style="min-width:195px">¿Qué falta por garantizar?<small>escriba</small></th>
<th style="min-width:150px">¿Qué tan fácil se puede perder?<small>escoja</small></th>
<th style="min-width:135px">Alerta<small>clic para marcar</small></th>
<th style="min-width:135px">¿De dónde sale la cifra?<small>escriba</small></th>
<th style="min-width:180px">Observaciones<small>abierto</small></th>
</tr></thead>
<tbody>${cuerpo}</tbody>
<datalist id="lstInst">${arr(D.instrumentos).map(i=>`<option value="${esc(i)}">`).join('')}</datalist>`;
conectar();
$('#btnAgregar').onclick = agregarLinea;
$('#btnAtras').onclick = ()=>ir('inicio');
$('#btnEnviar').onclick = $('#btnEnviar2').onclick = enviar;
estado();
}
function filaIndicador(id, ind, j){
const i = ind || {nombre:'',tipo:'',valor:'',unidad:'',corte:''};
return `<div class="ind-fila">
<input data-id="${id}" data-ind="${j}" data-f="nombre" placeholder="Nombre del indicador" value="${esc(i.nombre)}">
<select data-id="${id}" data-ind="${j}" data-f="tipo" class="${i.tipo?'':'vacio'}">
<option value="">tipo</option>
${OPC.tipo_ind.map(o=>`<option ${i.tipo===o?'selected':''}>${esc(o)}</option>`).join('')}</select>
<input data-id="${id}" data-ind="${j}" data-f="valor" placeholder="${i.tipo==='Cualitativo'?'descripción':'valor'}" value="${esc(i.valor)}">
<button class="quitar-ind" data-quitar-ind="${id}" data-j="${j}" title="Quitar">✕</button>
</div>
<div class="ind-fila" style="grid-template-columns:1fr 1fr;margin-top:4px">
<select data-id="${id}" data-ind="${j}" data-f="unidad" class="${i.unidad?'':'vacio'}">
<option value="">unidad</option>
${OPC.unidad.map(o=>`<option ${i.unidad===o?'selected':''}>${esc(o)}</option>`).join('')}</select>
<input data-id="${id}" data-ind="${j}" data-f="corte" placeholder="corte: may-2025" value="${esc(i.corte)}">
</div>`;
}
function conectar(){
$$('#tabla select, #tabla input, #tabla textarea').forEach(el=>{
if(!el.dataset.id) return;
const ev = el.tagName==='SELECT' ? 'onchange' : 'oninput';
el[ev] = ()=>{
const r = resp(el.dataset.id);
if(el.dataset.ind !== undefined){                     // campo de un indicador
const j = +el.dataset.ind;
if(!r.indicadores[j]) r.indicadores[j] = {nombre:'',tipo:'',valor:'',unidad:'',corte:''};
r.indicadores[j][el.dataset.f] = el.value;
if(el.dataset.f==='tipo'){ guardar(); pMatriz(); return; }   // cambia el placeholder
} else if(el.dataset.f==='__linea'){
const p = arr(S.extra[S.sub]).find(x=>x.id===el.dataset.id);
if(p) p.linea = el.value;
} else {
r[el.dataset.f] = el.value;
if(el.dataset.f==='tipo_instrumento'){ guardar(); pMatriz(); return; }
}
if(el.tagName==='SELECT') el.classList.toggle('vacio', !el.value);
marcarFila(el.dataset.id); guardar(); estado();
};
});
$$('[data-mas-ind]').forEach(b=>b.onclick=()=>{
const r = resp(b.dataset.masInd);
if(!r.indicadores.length) r.indicadores.push({nombre:'',tipo:'',valor:'',unidad:'',corte:''});
r.indicadores.push({nombre:'',tipo:'',valor:'',unidad:'',corte:''});
guardar(); pMatriz();
});
$$('[data-quitar-ind]').forEach(b=>b.onclick=()=>{
const r = resp(b.dataset.quitarInd);
r.indicadores.splice(+b.dataset.j, 1); guardar(); pMatriz();
});
$$('[data-terr]').forEach(b=>b.onclick=()=>abrirTerritorio(b.dataset.terr));
$$('[data-pob]').forEach(b=>b.onclick=()=>abrirPoblacion(b.dataset.pob));
$$('[data-al]').forEach(b=>b.onclick=()=>abrirAlerta(b.dataset.al));
$$('[data-quitar]').forEach(b=>b.onclick=()=>{
S.extra[S.sub] = arr(S.extra[S.sub]).filter(x=>x.id!==b.dataset.quitar);
delete S.r[b.dataset.quitar]; guardar(); pMatriz();
});
}
function agregarLinea(){
if(!S.extra[S.sub]) S.extra[S.sub]=[];
S.extra[S.sub].push({ id:`X${S.sub}-${Date.now()}`, linea:'', n_act:0 });
guardar(); pMatriz();
const ta = $$('#tabla [data-f="__linea"]').pop();
if(ta){ ta.scrollIntoView({block:'center',behavior:'smooth'}); ta.focus(); }
}
function marcarFila(id){
const tr = $(`tr[data-fila="${id}"]`); if(!tr) return;
tr.classList.toggle('completa', lleno(id));
const n = tr.querySelector('.num-lin'); if(!n) return;
const tiene = n.querySelector('.marca-ok');
if(lleno(id) && !tiene) n.insertAdjacentHTML('beforeend',' <span class="marca-ok">✓</span>');
if(!lleno(id) && tiene) tiene.remove();
}
function estado(){
const L=lineas(), c=completas();
const nInd = lineas().reduce((a,l)=>a+resp(l.id).indicadores.filter(i=>i.nombre||i.valor).length,0);
$('#estadoLlenado').textContent = `${c} de ${L.length} líneas` +
(nInd?` · ${nInd} indicador${nInd>1?'es':''}`:'') +
(totalLlenas()>c ? ` · ${totalLlenas()} líneas en total` : '');
$('#prog').style.width = (8+88*(c/(L.length||1)))+'%';
barraSub();
}
function abrirTerritorio(id){
S.modalLinea = id; S.depAbierto = '';
$('#modalTit').textContent = '¿En qué territorio?';
$('#modal').classList.remove('oculto');
pintarModal();
const cerrar = ()=>{
$('#modal').classList.add('oculto');
const b = $(`[data-terr="${id}"]`), r = resp(id);
if(b){ b.textContent = resumenTerr(r) || '+ elegir'; b.classList.toggle('puesto', !!resumenTerr(r)); }
marcarFila(id); guardar(); estado();
};
$('#modalX').onclick = $('#modalOk').onclick = cerrar;
}
function pintarModal(){
const r = resp(S.modalLinea), deps = Object.keys(D.territorio).sort();
let h = `<div class="op-terr">
${[['nacional','🇨🇴','Todo el país'],['dptos','🗺️','Departamentos'],['mpios','📍','Municipios']]
.map(([k,e,t])=>`<button class="ot ${r.terr===k?'on':''}" data-t="${k}">
<span class="e">${e}</span><b>${t}</b></button>`).join('')}</div>`;
if(r.terr==='nacional') h += `<p class="ayuda">Aplica en todo el país.</p>`;
if(r.terr==='dptos'){
h += `<select id="mDep"><option value="">Agregar departamento…</option>
${deps.filter(d=>!r.dptos.includes(d)).map(d=>`<option>${esc(d)}</option>`).join('')}</select>
<div class="chips">${r.dptos.map(d=>`<span class="chip">${esc(d)}<button data-q="${esc(d)}">✕</button></span>`).join('')
|| '<span class="ayuda">Ninguno todavía.</span>'}</div>`;
}
if(r.terr==='mpios'){
h += `<select id="mDep2"><option value="">Elija un departamento…</option>
${deps.map(d=>`<option ${S.depAbierto===d?'selected':''}>${esc(d)}</option>`).join('')}</select>`;
if(S.depAbierto){
const todos = D.territorio[S.depAbierto] || [];
const puestos = todos.filter(m=>r.mpios.includes(`${m} (${S.depAbierto})`));
h += `<button class="btn-todo-dep" id="btnTodoDep">
${puestos.length===todos.length ? '✓ Todo ' : '＋ Marcar todo '}${esc(S.depAbierto)} (${todos.length} municipios)</button>
<div class="mun-grid">${todos.map(m=>{
const k = `${m} (${S.depAbierto})`;
return `<label class="mun-chk"><input type="checkbox" data-m="${esc(k)}" ${r.mpios.includes(k)?'checked':''}>
<span>${esc(m)}</span></label>`;}).join('')}</div>`;
}
h += `<div class="chips" style="margin-top:11px">${r.mpios.length
? r.mpios.slice(0,40).map(m=>`<span class="chip">${esc(m)}<button data-qm="${esc(m)}">✕</button></span>`).join('') +
(r.mpios.length>40?`<span class="ayuda">y ${r.mpios.length-40} más</span>`:'')
: '<span class="ayuda">Ningún municipio todavía.</span>'}</div>`;
}
$('#modalCuerpo').innerHTML = h;
$$('#modalCuerpo .ot').forEach(b=>b.onclick=()=>{ r.terr=b.dataset.t; guardar(); pintarModal(); });
const mD=$('#mDep'); if(mD) mD.onchange=e=>{ if(e.target.value){ r.dptos.push(e.target.value); guardar(); pintarModal(); } };
$$('#modalCuerpo .chip button[data-q]').forEach(b=>b.onclick=()=>{
r.dptos=r.dptos.filter(x=>x!==b.dataset.q); guardar(); pintarModal(); });
$$('#modalCuerpo .chip button[data-qm]').forEach(b=>b.onclick=()=>{
r.mpios=r.mpios.filter(x=>x!==b.dataset.qm); guardar(); pintarModal(); });
const d2=$('#mDep2');
if(d2) d2.onchange=e=>{ S.depAbierto=e.target.value; pintarModal(); };
const bt=$('#btnTodoDep');
if(bt) bt.onclick=()=>{
const todos=(D.territorio[S.depAbierto]||[]).map(m=>`${m} (${S.depAbierto})`);
const yaTodos = todos.every(k=>r.mpios.includes(k));
r.mpios = yaTodos ? r.mpios.filter(k=>!todos.includes(k))
: [...new Set([...r.mpios, ...todos])];
guardar(); pintarModal();
};
$$('#modalCuerpo .mun-chk input').forEach(c=>c.onchange=()=>{
const k=c.dataset.m;
if(c.checked){ if(!r.mpios.includes(k)) r.mpios.push(k); }
else r.mpios = r.mpios.filter(x=>x!==k);
guardar(); pintarModal();
});
}
function resumenTerr(r){
if(r.terr==='nacional') return 'Todo el país';
if(r.terr==='dptos') return r.dptos.length ? `${r.dptos.length} depto${r.dptos.length>1?'s':''}` : '';
if(r.terr==='mpios') return r.mpios.length ? `${r.mpios.length} municipio${r.mpios.length>1?'s':''}` : '';
return '';
}
const territorioTexto = r =>
r.terr==='nacional' ? 'Todo el país' :
r.terr==='dptos' ? r.dptos.join(', ') :
r.terr==='mpios' ? r.mpios.join('; ') : '';
function abrirAlerta(id){
S.modalLinea = id;
$('#modalAl').classList.remove('oculto');
pintarAlerta();
const cerrar = ()=>{
$('#modalAl').classList.add('oculto');
const b = $(`[data-al="${id}"]`), r = resp(id);
if(b){ b.textContent = resumenAlerta(r) || '+ alerta';
b.className = 'btn-alerta ' + (r.alerta_nivel||''); }
marcarFila(id); guardar(); estado();
};
$('#modalAlX').onclick = $('#modalAlOk').onclick = cerrar;
}
function pintarAlerta(){
const r = resp(S.modalLinea);
const niveles = AL?.niveles || [];
const tipos   = AL?.tipos || [];
const verif   = AL?.verificacion || [];
const reglas  = AL?.reglas || {};
const t = tipos.find(x=>x.clave===r.alerta_tipo);
const ej = t && r.alerta_nivel ? t['ejemplo_'+r.alerta_nivel] : '';
const esGris = r.alerta_nivel === 'gris';
$('#modalAlCuerpo').innerHTML = `
<p class="ayuda" style="margin-top:0">Marque el nivel según <b>qué tan grave y urgente</b> es,
no según cuánta prueba tenga. La prueba se registra aparte.</p>
<div class="niveles">${niveles.map(n=>`
<button class="niv niv-${n.color} ${r.alerta_nivel===n.color?'on':''}" data-n="${n.color}">
<div class="nt"><span class="pt"></span>${esc(n.nombre)}</div>
<div class="cr">${esc(n.criterio)}</div></button>`).join('')}</div>
${r.alerta_nivel && !esGris ? `
<label style="font-size:12.5px;font-weight:600">¿De qué tipo?</label>
<div class="tipos-al">${tipos.map(x=>`
<button class="tipo-al ${r.alerta_tipo===x.clave?'on':''}" data-tp="${x.clave}">
${esc(x.nombre)}<small>${esc(x.definicion)}</small></button>`).join('')}</div>
${ej ? `<div class="ejemplo-al"><b>Ejemplo de nivel ${esc(r.alerta_nivel)}:</b> ${esc(ej)}</div>` : ''}
<label style="font-size:12.5px;font-weight:600;margin-top:12px;display:block">¿Qué tan confirmado está?</label>
<div class="tipos-al" style="grid-template-columns:1fr">${verif.map(v=>`
<button class="tipo-al ${r.alerta_verif===v.clave?'on':''}" data-vf="${v.clave}">
${esc(v.nombre)}<small>${esc(v.nota)}</small></button>`).join('')}</div>
<div class="campo" style="margin-top:12px">
<label>Detalle (opcional)</label>
<textarea id="alNota" placeholder="Qué está pasando, en una o dos frases">${esc(r.alerta_nota)}</textarea></div>
<div class="aviso-seg"><b>Cuide a la gente.</b> ${esc(reglas.personas||'')}
<br><br>${esc(reglas.terceros||'')}</div>
<button class="btn plano" id="alQuitar" style="margin-top:10px">Quitar esta alerta</button>`
: esGris ? `<div class="aviso-seg" style="margin-top:0"><b>Gris no es verde.</b>
${esc(reglas.gris||'')}</div>
<button class="btn plano" id="alQuitar" style="margin-top:10px">Quitar esta alerta</button>` : ''}`;
$$('#modalAlCuerpo .niv').forEach(b=>b.onclick=()=>{
r.alerta_nivel=b.dataset.n;
if(b.dataset.n==='gris'){ r.alerta_tipo=''; r.alerta_verif=''; r.alerta_nota=''; }
guardar(); pintarAlerta(); });
$$('#modalAlCuerpo .tipo-al[data-tp]').forEach(b=>b.onclick=()=>{ r.alerta_tipo=b.dataset.tp; guardar(); pintarAlerta(); });
$$('#modalAlCuerpo .tipo-al[data-vf]').forEach(b=>b.onclick=()=>{ r.alerta_verif=b.dataset.vf; guardar(); pintarAlerta(); });
const na=$('#alNota'); if(na) na.oninput=()=>{ r.alerta_nota=na.value; guardar(); };
const q=$('#alQuitar'); if(q) q.onclick=()=>{
r.alerta_nivel=''; r.alerta_tipo=''; r.alerta_nota=''; r.alerta_verif=''; guardar(); pintarAlerta(); };
}
function abrirPoblacion(id){
S.modalLinea = id;
$('#modalPob').classList.remove('oculto');
pintarPoblacion();
const cerrar = ()=>{
$('#modalPob').classList.add('oculto');
const b = $(`[data-pob="${id}"]`), r = resp(id);
if(b){ b.textContent = resumenPob(r) || '+ elegir';
b.classList.toggle('puesto', !!r.poblacion.length); }
marcarFila(id); guardar(); estado();
};
$('#modalPobX').onclick = $('#modalPobOk').onclick = cerrar;
}
function pintarPoblacion(){
const r = resp(S.modalLinea);
$('#modalPobCuerpo').innerHTML = `
<p class="ayuda" style="margin-top:0">Marque <b>a quién beneficia</b> esta línea. Puede marcar
varias. Sirve para segmentar la información en la siguiente fase.</p>
${POBLACION.map(g=>`
<div class="pob-grupo">${esc(g.grupo)}</div>
<div class="pob-lista">${g.op.map(o=>`
<label class="pob-op ${r.poblacion.includes(o)?'on':''}">
<input type="checkbox" data-pob-op="${esc(o)}" ${r.poblacion.includes(o)?'checked':''}>
<span>${esc(o)}</span></label>`).join('')}</div>`).join('')}`;
$$('#modalPobCuerpo [data-pob-op]').forEach(c=>c.onchange=()=>{
const o = c.dataset.pobOp;
if(c.checked){ if(!r.poblacion.includes(o)) r.poblacion.push(o); }
else r.poblacion = r.poblacion.filter(x=>x!==o);
c.closest('.pob-op').classList.toggle('on', c.checked);
guardar();
});
}
function resumenPob(r){
const n = r.poblacion.length;
if(!n) return '';
if(n===1) return r.poblacion[0];
return `${n} poblaciones`;
}
function resumenAlerta(r){
if(!r.alerta_nivel) return '';
const tipos = AL?.tipos || [];
const t = tipos.find(x=>x.clave===r.alerta_tipo);
const punto = {rojo:'🔴', naranja:'🟠', verde:'🟢', gris:'⚪'}[r.alerta_nivel] || '';
return r.alerta_nivel==='gris' ? punto+' Sin información' : punto+' '+(t ? t.nombre : r.alerta_nivel);
}
function paquete(){
const filas = [];
arr(D.subsistemas).forEach(s=>{
const base = arr(D.lineas).filter(l=>l.subsistema===s.n);
const prop = arr(S.extra[s.n]).map(x=>({...x, propia:true}));
base.concat(prop).forEach(l=>{
if(!lleno(l.id)) return;
const r = resp(l.id);
const inds = r.indicadores.filter(i=>i.nombre||i.valor);
const comun = { dependencia:S.id.dep, entidad:S.id.ent,
subsistema:`${s.n}. ${s.nombre}`, linea:l.linea, linea_agregada: l.propia?'Sí':'No',
situacion_2022:r.situacion_2022, logros:r.logros, estado:r.estado,
tipo_instrumento:r.tipo_instrumento, instrumento:r.instrumento,
donde:territorioTexto(r), poblacion:(r.poblacion||[]).join('; '),
que_falta:r.que_falta, fragilidad:r.fragilidad,
alerta_nivel:r.alerta_nivel, alerta_tipo:r.alerta_tipo, alerta_verif:r.alerta_verif, alerta_nota:r.alerta_nota,
fuente:r.fuente, observaciones:r.observaciones };
if(inds.length) inds.forEach(i=>filas.push({...comun,
indicador:i.nombre, indicador_tipo:i.tipo, valor:i.valor, unidad:i.unidad, fecha_corte:i.corte}));
else filas.push({...comun, indicador:'', indicador_tipo:'', valor:'', unidad:'', fecha_corte:''});
});
});
return { recibido:new Date().toISOString(), token:CONFIG.token, id:S.id,
subsistema:S.sub, subsistema_nombre:subActual()?.nombre, cols:COLS_CSV, filas };
}
async function enviar(){
const p = paquete();
if(!p.filas.length){ alert('Todavía no hay ninguna línea diligenciada.'); return; }
const btns = [$('#btnEnviar'), $('#btnEnviar2')].filter(Boolean);
btns.forEach(b=>{ b.disabled=true; b.textContent='Enviando…'; });
try{
const r = await fetch(CONFIG.endpoint || '/enviar', { method:'POST',
headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify(p) });
if(!r.ok) throw new Error('el servidor respondió '+r.status);
S.enviado=true; S.enviadas=p.filas.length; S.paqueteEnviado=p; localStorage.removeItem(LLAVE); ir('fin');
}catch(e){ S.enviado=false; S.errorEnvio=e.message; S.paqueteEnviado=p; ir('fin'); }
}
const COLS_CSV = ['recibido','dependencia','entidad','subsistema','linea','linea_agregada',
'situacion_2022','indicador','indicador_tipo','valor','unidad','fecha_corte',
'logros','estado','tipo_instrumento','instrumento','donde','poblacion','que_falta','fragilidad',
'alerta_nivel','alerta_tipo','alerta_verif','alerta_nota','fuente','observaciones'];
function csvDe(p){
const q = v => '"'+String(v ?? '').replace(/"/g,'""').replace(/[\r\n]+/g,' ')+'"';
const base = { recibido:p.recibido, dependencia:p.id.dep, entidad:p.id.ent,
subsistema:p.subsistema_nombre || p.subsistema };
const cuerpo = p.filas.map(f => COLS_CSV.map(c =>
q(f[c]!==undefined && f[c]!=='' ? f[c] : (base[c] ?? ''))).join(';')).join('\n');
return '﻿' + COLS_CSV.join(';') + '\n' + cuerpo + '\n';   // BOM: Excel abre bien las tildes
}
function descargarRespuestas(){
const p = paquete();
if(!p.filas.length){ alert('Todavía no hay ninguna línea diligenciada.'); return; }
bajarArchivo(csvDe(p), nombreArchivo(p,'csv'), 'text/csv;charset=utf-8');
}
const limpioNom = s => String(s||'').replace(/[^\wáéíóúñÁÉÍÓÚÑ ]/gi,'').trim().slice(0,40) || 'dependencia';
const nombreArchivo = (p,ext) => `Constancia_${limpioNom(p.id.dep)}.${ext}`;
function bajarArchivo(contenido, nombre, tipo){
const a = document.createElement('a');
a.href = URL.createObjectURL(new Blob([contenido], {type:tipo}));
a.download = nombre; document.body.appendChild(a); a.click();
setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function constanciaHTML(p){
const fecha = (()=>{ try{ return new Date(p.recibido).toLocaleString('es-CO'); }catch(e){ return p.recibido||''; } })();
const grupos = {};
(p.filas||[]).forEach(f=>{
const k = (f.subsistema||'')+'¬'+(f.linea||'');
if(!grupos[k]) grupos[k] = {...f, indicadores:[]};
if(f.indicador||f.valor) grupos[k].indicadores.push(
{nombre:f.indicador,valor:f.valor,unidad:f.unidad,corte:f.fecha_corte});
});
const campo = (et,v)=> v ? `<div class="cp"><span class="et">${esc(et)}</span><span class="vl">${esc(v)}</span></div>` : '';
const bloques = Object.values(grupos).map(g=>`
<section class="linea">
<div class="sub">${esc(g.subsistema)}</div>
<h3>${esc(g.linea)}</h3>
${g.indicadores.length?`<table class="ind"><thead><tr><th>Indicador</th><th>Valor</th><th>Unidad</th><th>Corte</th></tr></thead>
<tbody>${g.indicadores.map(x=>`<tr><td>${esc(x.nombre)}</td><td>${esc(x.valor)}</td><td>${esc(x.unidad)}</td><td>${esc(x.corte)}</td></tr>`).join('')}</tbody></table>`:''}
${campo('Cómo estaba en 2022',g.situacion_2022)}
${campo('Logros',g.logros)}
${campo('¿Se cumplió?',g.estado)}
${campo('Norma o programa',[g.tipo_instrumento,g.instrumento].filter(Boolean).join(': '))}
${campo('¿Dónde?',g.donde)}
${campo('Población beneficiaria',g.poblacion)}
${campo('Qué falta',g.que_falta)}
${campo('Qué tan fácil se puede perder',g.fragilidad)}
${campo('Alerta',[g.alerta_nivel,g.alerta_tipo,g.alerta_nota].filter(Boolean).join(' · '))}
${campo('Fuente',g.fuente)}
${campo('Observaciones',g.observaciones)}
</section>`).join('');
return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Constancia — ${esc(p.id.dep||'')}</title>
<style>
body{font-family:"Segoe UI",system-ui,Arial,sans-serif;color:#1d1618;max-width:820px;margin:0 auto;padding:26px;line-height:1.5}
.top{border-bottom:3px solid #8E1218;padding-bottom:14px;margin-bottom:18px}
.top .k{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8E1218;font-weight:700}
h1{font-size:20px;margin:4px 0 12px;color:#5E0B10}
.meta{font-size:13px;color:#555} .meta b{color:#1d1618}
.linea{border:1px solid #e8dfe0;border-left:4px solid #8E1218;border-radius:9px;padding:13px 15px;margin:12px 0;page-break-inside:avoid}
.linea .sub{font-size:11px;font-weight:700;color:#8E1218;text-transform:uppercase;letter-spacing:.03em}
.linea h3{font-size:15px;margin:3px 0 9px;color:#5E0B10}
table.ind{width:100%;border-collapse:collapse;margin:6px 0 10px;font-size:12.5px}
table.ind th{background:#8E1218;color:#fff;text-align:left;padding:5px 8px;font-size:11px}
table.ind td{border-bottom:1px solid #eee;padding:5px 8px}
.cp{display:flex;gap:10px;padding:3px 0;font-size:13px}
.cp .et{flex:0 0 190px;color:#8b7f81;font-weight:600;font-size:11.5px;text-transform:uppercase;letter-spacing:.02em}
.cp .vl{flex:1}
.pie{margin-top:22px;padding-top:12px;border-top:1px solid #e8dfe0;font-size:11.5px;color:#8b7f81}
@media print{body{padding:0}.no-print{display:none}}
</style></head><body>
<div class="top">
<div class="k">Constancia de registro · Herramienta de seguimiento y veeduría</div>
<h1>Derechos de los sujetos populares del campo y de la Reforma Agraria</h1>
<div class="meta"><b>Dependencia:</b> ${esc(p.id.dep||'—')} &nbsp;·&nbsp; <b>Entidad:</b> ${esc(p.id.ent||'—')}<br>
<b>Fecha de registro:</b> ${esc(fecha)} &nbsp;·&nbsp; <b>Líneas:</b> ${Object.keys(grupos).length} &nbsp;·&nbsp; <b>Filas:</b> ${(p.filas||[]).length}</div>
</div>
${bloques || '<p>No hay registros.</p>'}
<div class="pie">Este documento reproduce lo que la dependencia registró en la plataforma. Es una constancia para verificación; el consolidado oficial lo mantiene el equipo de veeduría.</div>
<p class="no-print" style="text-align:center;margin-top:20px"><button onclick="window.print()" style="padding:9px 18px;background:#8E1218;color:#fff;border:0;border-radius:8px;font-size:14px;cursor:pointer">Imprimir o guardar como PDF</button></p>
</body></html>`;
}
function descargarConstancia(){
const p = S.paqueteEnviado || paquete();
if(!p.filas || !p.filas.length){ alert('No hay información para la constancia.'); return; }
bajarArchivo(constanciaHTML(p), nombreArchivo(p,'html'), 'text/html;charset=utf-8');
}
function pFin(){
if(S.enviado){
$('#finCuerpo').innerHTML = `<div class="emo">✓</div>
<h2>Ha sido enviado. Gracias.</h2>
<p>Llegaron <b>${S.enviadas} registros</b> y quedan guardados como constancia.</p>
<div class="caja">
<p style="margin:0 0 8px"><b>Descargue una copia de lo que registró</b></p>
<p style="margin:0 0 12px">Le queda como respaldo y para verificar la información. Se abre en el
navegador y puede imprimirla o guardarla como PDF.</p>
<button class="btn" id="btnConstancia">⬇ Descargar mi constancia</button>
</div>
<div class="acciones" style="justify-content:center;margin-top:22px">
<button class="btn plano" id="btnOtro">Registrar otra dependencia</button></div>`;
$('#btnConstancia').onclick = descargarConstancia;
$('#btnOtro').onclick = ()=>{ S.r={}; S.extra={}; S.sub=0; S.enviado=false; S.paqueteEnviado=null; guardar(); ir('inicio'); };
} else {
const sinReceptor = /\b40[45]\b/.test(S.errorEnvio||'');
$('#finCuerpo').innerHTML = `<div class="emo">⚠️</div>
<h2>${sinReceptor ? 'El envío automático todavía no está habilitado' : 'No se pudo enviar'}</h2>
<p>Su información <b>no se perdió</b>: quedó guardada en este navegador y sigue ahí
aunque cierre la página.</p>
<div class="caja" style="text-align:left">
<p style="margin:0 0 8px"><b>Qué hacer ahora</b></p>
<p style="margin:0 0 6px">Descargue sus respuestas con el botón de abajo y envíelas por correo
a quien le compartió el enlace. El archivo abre en Excel y ya trae las columnas listas.</p>
<p style="margin:0">Cuando el envío quede habilitado, también puede volver a entrar
desde este mismo equipo y darle <b>Intentar de nuevo</b>: lo que escribió sigue cargado.</p>
</div>
<div class="acciones" style="justify-content:center;margin-top:20px;flex-wrap:wrap">
<button class="btn" id="btnBajar">⬇ Descargar mis respuestas</button>
<button class="btn plano" id="btnReintentar">Intentar de nuevo</button>
<button class="btn plano" id="btnVolver">Volver a la tabla</button></div>
<p class="ayuda" style="margin-top:16px">Detalle técnico: ${esc(S.errorEnvio||'')}</p>`;
$('#btnBajar').onclick = descargarRespuestas;
$('#btnReintentar').onclick = enviar;
$('#btnVolver').onclick = ()=>ir('matriz');
}
}