/* Agente de consulta sobre reforma agraria — app2
   Se ciñe al corpus oficial. Hoy funciona sin API (recuperación local por términos).
   Al contratar la API se pega la llave en CONFIG.apiKey y el contexto recuperado se manda al modelo. */
const Agente = (() => {
  const CONFIG = {
    apiKey: '',                    // en produccion esto va en una funcion serverless, no aqui
    modelo: 'claude-sonnet-5',
    sistema: `Eres un asistente sobre la reforma agraria colombiana y los derechos del campesinado.
Respondes UNICAMENTE con base en los fragmentos de documentos oficiales que se te entregan como contexto.
Si la respuesta no esta en el contexto, dilo con claridad y sugiere que documento podria tenerla. Nunca inventes cifras.
Cita siempre el documento de donde sale el dato. Escribe claro y corto, para publico campesino y organizaciones sociales.`
  };
  let corpus = [], D = null;

  const norm = t => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc  = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const VACIAS = new Set(('de la el los las en y a que del un una por con para su sus se al lo es son como o mas ' +
    'sobre entre cual cuales cuanto cuantos cuanta cuantas donde cuando quien quienes hay tiene').split(' '));

  function iniciar(datos){
    D = datos;
    fetch('corpus.json').then(r => r.json()).then(c => { corpus = c; listo(); }).catch(() => { corpus = []; listo(); });
    document.getElementById('btnPreguntar').onclick = preguntar;
    document.getElementById('txtPregunta').addEventListener('keydown', e => { if (e.key === 'Enter') preguntar(); });
    const sug = ['Que son las APPA?', 'Cuantas hectareas se entregaron?', 'Que es el Contador de la Reforma Agraria?',
                 'Que es una Zona de Reserva Campesina?', 'Que falta por implementar?'];
    document.getElementById('sugs').innerHTML = sug.map(s => '<button class="sug">' + esc(s) + '</button>').join('');
    Array.prototype.forEach.call(document.querySelectorAll('#sugs .sug'), b => {
      b.onclick = () => { document.getElementById('txtPregunta').value = b.textContent; preguntar(); };
    });
  }

  function listo(){
    decir('agente', corpus.length
      ? 'Hola. Puedo consultar <b>' + corpus.length + ' fragmentos</b> de los documentos oficiales de la reforma agraria: los hitos del sector, el Plan Decenal y el arbol de problemas del campesinado. Preguntame lo que necesites.'
      : 'Todavia no esta cargado el corpus documental. Hay que correr <code>R/03_corpus.R</code>.');
  }

  function decir(quien, html, fuente){
    const c = document.getElementById('chat');
    c.insertAdjacentHTML('beforeend',
      '<div class="msg ' + (quien === 'yo' ? 'yo' : '') + '"><div class="q">' + (quien === 'yo' ? 'Tu' : 'Agente') + '</div>' +
      '<div class="tx">' + html + (fuente ? '<div class="fu">' + esc(fuente) + '</div>' : '') + '</div></div>');
    c.scrollTop = c.scrollHeight;
  }

  /* recuperacion: puntua fragmentos por coincidencia de terminos, con bonus si esta en el titulo */
  function recuperar(q, n){
    n = n || 4;
    const term = norm(q).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 3 && !VACIAS.has(t));
    if (!term.length) return [];
    return corpus.map(f => {
      const t = norm(f.texto), ti = norm(f.titulo || '');
      let p = 0;
      term.forEach(w => { const m = t.split(w).length - 1; if (m) p += m + (ti.indexOf(w) >= 0 ? 5 : 0); });
      return { f: f, p: p };
    }).filter(x => x.p > 0).sort((a, b) => b.p - a.p).slice(0, n).map(x => x.f);
  }

  function preguntar(){
    const inp = document.getElementById('txtPregunta');
    const q = inp.value.trim(); if (!q) return;
    decir('yo', esc(q)); inp.value = '';
    const hits = recuperar(q);
    if (!hits.length){
      decir('agente', 'No encontre eso en los documentos oficiales cargados. Puedo responder sobre acceso y formalizacion de tierras, territorialidades campesinas (ZRC, APPA, ZPPA, TECAM), el Contador de la Reforma Agraria, credito agropecuario, la Jurisdiccion Agraria y el Plan Decenal.');
      return;
    }
    if (CONFIG.apiKey) { conModelo(q, hits); return; }
    const f = hits[0];
    const cuerpo = f.texto.length > 760 ? f.texto.slice(0, 760) + '...' : f.texto;
    decir('agente',
      '<b>' + esc(f.titulo) + '</b><br>' + esc(cuerpo) +
      (hits.length > 1
        ? '<div style="margin-top:8px;font-size:11px;color:var(--gris)">Tambien puede servirte:<br>' +
          hits.slice(1).map(h => '&middot; ' + esc(h.titulo)).join('<br>') + '</div>'
        : ''),
      'Fuente: ' + f.doc);
  }

  async function conModelo(q, hits){
    const ctx = hits.map(h => '[' + h.doc + ' - ' + h.titulo + ']\n' + h.texto).join('\n\n---\n\n');
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': CONFIG.apiKey,
                   'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: CONFIG.modelo, max_tokens: 900, system: CONFIG.sistema,
          messages: [{ role: 'user', content: 'CONTEXTO:\n' + ctx + '\n\nPREGUNTA: ' + q }] })
      });
      const j = await r.json();
      const txt = (j.content && j.content[0] && j.content[0].text) || 'Sin respuesta del modelo.';
      const docs = hits.map(h => h.doc).filter((v, i, a) => a.indexOf(v) === i).join(' | ');
      decir('agente', esc(txt).replace(/\n/g, '<br>'), 'Fuentes: ' + docs);
    } catch (e) {
      decir('agente', 'No se pudo consultar el modelo. Revisa la llave de API.');
    }
  }

  return { iniciar: iniciar, CONFIG: CONFIG };
})();
window.Agente = Agente;
