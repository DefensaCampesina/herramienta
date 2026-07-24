/* Puerta de entrada: pide la clave, descifra el contenido y se la entrega a app.js.
   La clave nunca sale del navegador: no se envía a ningún servidor. */
(function () {
  const $ = s => document.querySelector(s);
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  let listo, falló;
  window.__CARGA__ = () => new Promise((res, rej) => { listo = res; falló = rej; });

  async function abrir(clave, sobre) {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', enc.encode(clave), 'PBKDF2', false, ['deriveKey']);
    const k = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: b64(sobre.sal), iterations: sobre.iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const claro = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64(sobre.iv) }, k, b64(sobre.datos));
    return JSON.parse(new TextDecoder().decode(claro));
  }

  document.addEventListener('DOMContentLoaded', () => {
    const puerta = $('#puerta'), inp = $('#pClave'), btn = $('#pEntrar'), err = $('#pErr');
    let sobre = null;

    fetch('contenido.bin').then(r => r.json()).then(s => { sobre = s; })
      .catch(() => { err.textContent = 'No se pudo cargar el contenido. Recargue la página.'; });

    // recordar la clave en esta pestaña, para que no la pida en cada recarga
    const guardada = sessionStorage.getItem('cl_camp');

    async function entrar(clave, silencioso) {
      if (!sobre) { err.textContent = 'Todavía está cargando, espere un segundo.'; return; }
      btn.disabled = true; btn.textContent = 'Abriendo…'; err.textContent = '';
      try {
        const c = await abrir(clave, sobre);
        sessionStorage.setItem('cl_camp', clave);
        puerta.remove();
        listo({ d: c.d, a: c.a });
      } catch (e) {
        sessionStorage.removeItem('cl_camp');
        if (!silencioso) err.textContent = 'Esa clave no abre. Revísela con quien le pasó el enlace.';
        btn.disabled = false; btn.textContent = 'Entrar';
        inp.value = ''; inp.focus();
      }
    }

    btn.addEventListener('click', () => entrar(inp.value.trim()));
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') entrar(inp.value.trim()); });

    if (guardada) {
      const esperar = setInterval(() => {
        if (sobre) { clearInterval(esperar); entrar(guardada, true); }
      }, 60);
    } else {
      setTimeout(() => inp.focus(), 100);
    }
  });
})();
