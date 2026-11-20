/* © 2026 Chinaside. Todos los derechos reservados. All rights reserved.
   Prohibida la copia, redistribución o creación de obras derivadas sin permiso por escrito.
   Copying, redistributing or creating derivative works without written permission is prohibited. Ref: cn-ffdc0457 */
/* Caja sorpresa diaria (PROTOTIPO LOCAL). Una vez al día, al entrar en la app, la ventana de USFans se desenfoca y aparece una caja que se agita.
   Al tocarla se abre un carrusel de productos que va frenando hasta pararse en el premio.
   Ahora el premio sale al azar entre los productos de la hoja; más adelante lo decidirá el servidor (ver pickPrize()).
   Sin dependencias. Lo arranca app.js al final de init() con window.CnBox.start({...}). */
(() => {
  'use strict';
  const DISCOUNT = 0.2;                      // lo que se sortea es el enlace al mismo producto un 20 % más barato
  const KEY = 'cnbox';                       // localStorage: { day, name } del último día en que se abrió la caja
  const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || document.documentElement.dataset.admin === '1';   // pruebas: en local y en modo administrador
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)');
  const LANG = (document.documentElement.lang || 'es').slice(0, 2);
  const T = {
    es: { title: 'Tu caja de hoy', hint: 'Toca para abrir', later: 'Más tarde', demo: 'Modo prueba', label: 'Abriendo tu caja…', view: 'Ver oferta', close: 'Guardar', open: 'Abrir la caja sorpresa de hoy', sndOn: 'Sonido activado', sndOff: 'Sonido desactivado' },
    en: { title: 'Your box for today', hint: 'Tap to open', later: 'Later', demo: 'Test mode', label: 'Opening your box…', view: 'View deal', close: 'Save', open: "Open today's surprise box", sndOn: 'Sound on', sndOff: 'Sound off' },
    pl: { title: 'Twoja dzisiejsza skrzynka', hint: 'Dotknij, aby otworzyć', later: 'Później', demo: 'Tryb testowy', label: 'Otwieramy skrzynkę…', view: 'Zobacz ofertę', close: 'Zapisz', open: 'Otwórz dzisiejszą skrzynkę-niespodziankę', sndOn: 'Dźwięk włączony', sndOff: 'Dźwięk wyłączony' },
  }[LANG] || null;
  const t = T || {
    title: 'Tu caja de hoy', hint: 'Toca para abrir', later: 'Más tarde', demo: 'Modo prueba', label: 'Abriendo tu caja…', view: 'Ver oferta', close: 'Guardar', open: 'Abrir la caja sorpresa de hoy', sndOn: 'Sonido activado', sndOff: 'Sonido desactivado',
  };

  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Qué premio toca. PROTOTIPO: al azar entre los productos de la hoja.
     Más adelante esto lo decidirá el servidor (con tope de coste y probabilidades) para que no se pueda manipular desde el navegador. */
  const pickPrize = (pool) => pool[Math.floor(Math.random() * pool.length)];

  /* Caja de cartón en isométrica. Las cuatro solapas de arriba se dibujan como paralelogramos con bisagra en su arista y se abren girando hacia fuera:
     cada una es un cuadrado unidad al que se le aplica una matriz (eje u = la bisagra, eje v = hacia el centro, que al abrirse se levanta) */
  const FLAPS = [
    { id: 'br', h: [120, 50], u: [80, 40], v: [-40, 20] },    // solapa menor de atrás-derecha (bisagra en la arista superior-derecha)
    { id: 'fl', h: [40, 90], u: [80, 40], v: [40, -20] },     // solapa menor de delante-izquierda
    { id: 'bl', h: [40, 90], u: [80, -40], v: [40, 20], tape: 1 },   // solapa mayor de atrás-izquierda
    { id: 'fr', h: [120, 130], u: [80, -40], v: [-40, -20], tape: 1 }, // solapa mayor de delante-derecha
  ];
  const flapMat = (f, th) => {
    const c = Math.cos(th), s = Math.sin(th), len = Math.hypot(f.v[0], f.v[1]);
    return `matrix(${f.u[0]} ${f.u[1]} ${(f.v[0] * c).toFixed(2)} ${(f.v[1] * c - s * len).toFixed(2)} ${f.h[0]} ${f.h[1]})`;
  };
  const flapSvg = (f) => `<g class="cnbox-flap" data-f="${f.id}" transform="${flapMat(f, 0)}"><polygon points="0,0 1,0 1,1 0,1" fill="url(#cbF)" stroke="#c4955f" stroke-width=".9" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${f.tape ? '<polygon points="0,.8 1,.8 1,1 0,1" fill="#b98448" fill-opacity=".42"/>' : ''}</g>`;
  const ART = `<svg class="cnbox-art" viewBox="0 0 240 250" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="cbL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1c791"/><stop offset="1" stop-color="#e3b27a"/></linearGradient>
      <linearGradient id="cbR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b5865a"/><stop offset="1" stop-color="#9a6d42"/></linearGradient>
      <linearGradient id="cbF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f9d8aa"/><stop offset="1" stop-color="#efc48f"/></linearGradient>
      <radialGradient id="cbS" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <radialGradient id="cbI" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffc27a"/><stop offset=".6" stop-color="#e59a52" stop-opacity=".7"/><stop offset="1" stop-color="#e59a52" stop-opacity="0"/></radialGradient>
      <clipPath id="cbC"><polygon points="40,90 120,50 200,90 120,130"/></clipPath>
    </defs>
    <ellipse cx="120" cy="232" rx="98" ry="14" fill="url(#cbS)"/>
    <g class="cnbox-shake">
    <g class="cnbox-body">
      <polygon points="40,90 120,130 120,225 40,185" fill="url(#cbL)"/>
      <polygon points="120,130 200,90 200,185 120,225" fill="url(#cbR)"/>
      <polygon points="72,106 88,114 88,150 72,142" fill="#c99557" fill-opacity=".6"/>
      <polygon points="72,201 88,209 88,191 72,183" fill="#c99557" fill-opacity=".6"/>
      <polyline points="40,90 120,130 200,90" fill="none" stroke="#7a5230" stroke-opacity=".35" stroke-width="1" stroke-linejoin="round"/>
      <g clip-path="url(#cbC)">
        <polygon points="40,90 120,50 200,90 120,130" fill="#7d5330"/>
        <polygon points="40,90 120,50 120,102 40,142" fill="#b78a5c"/>
        <polygon points="120,50 200,90 200,142 120,102" fill="#98693e"/>
        <ellipse class="cnbox-in" cx="120" cy="92" rx="70" ry="36" fill="url(#cbI)"/>
      </g>
    </g>
    <g class="cnbox-lid">${FLAPS.map(flapSvg).join('')}</g>
    </g>
    <g class="cnbox-knife" opacity="0"></g>
  </svg>`;

  /* Cuchillos: las ilustraciones originales recortadas sin fondo (/knives/*.png; las espadas son de píxeles y se giran 180° para que la punta quede abajo). tx,ty = dónde está la punta dentro de cada imagen; px = dibujo de píxeles (sin suavizar). Al abrir, sale uno al azar */
  const KNIVES = [
    { f: 'karambit', w: 195, h: 295, tx: 32.3, ty: 291 },
    { f: 'mariposa', w: 199, h: 298, tx: 6.6, ty: 296 },
    { f: 'daga', w: 212, h: 305, tx: 3.4, ty: 302 },
    { f: 'bayoneta', w: 247, h: 304, tx: 4.0, ty: 302 },
    { f: 'espada-hierro', w: 312, h: 312, tx: 36.0, ty: 312, px: 1 },
    { f: 'espada-diamante', w: 312, h: 312, tx: 36.0, ty: 312, px: 1 },
  ];
  const KV = 2;                                    // sube este número si cambias alguna imagen (evita la caché)
  const knifeSrc = (k) => `/knives/${k.f}.png?v=${KV}`;

  let root, frames, ro, opts, pool, prize, busy = false, shown = false;

  /* ---------- Sonido (sintetizado con Web Audio, sin archivos) ---------- */
  const SKEY = 'cnbox-sound';
  let actx = null, master = null, noiseBuf = null, muted = false, lastTick = 0;
  try { muted = localStorage.getItem(SKEY) === 'off'; } catch { /* sin almacenamiento */ }
  const SND = { open: '/sounds/abrir-caja.mp3?v=1', tick: '/sounds/tick.mp3?v=1' };
  const raw = {}, bufs = {};
  function preloadSnd() { Object.keys(SND).forEach((k) => { if (!raw[k]) raw[k] = fetch(SND[k]).then((r) => r.arrayBuffer()).catch(() => null); }); }
  function decodeSnd(a) {
    Object.keys(raw).forEach((k) => raw[k].then((ab) => { if (ab && !bufs[k]) a.decodeAudioData(ab.slice(0)).then((b) => { bufs[k] = b; }).catch(() => { /* se usará el sonido sintetizado */ }); }));
  }
  /* Reproduce un archivo de sonido. dur = recorta el sonido (fundido al final) para que los tics rápidos no se amontonen */
  function playBuf(k, gain, dur, rate) {
    const a = audio(); if (!a || !bufs[k]) return false;
    const s = a.createBufferSource(), g = a.createGain(), t0 = a.currentTime;
    s.buffer = bufs[k]; s.playbackRate.value = rate || 1;
    g.gain.setValueAtTime(gain, t0);
    if (dur) { g.gain.setValueAtTime(gain, t0 + dur * .55); g.gain.linearRampToValueAtTime(.0001, t0 + dur); }
    s.connect(g); g.connect(master); s.start(t0); if (dur) s.stop(t0 + dur + .02);
    return true;
  }
  function audio() {
    if (muted) return null;
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        actx = new AC();
        master = actx.createGain(); master.gain.value = .7; master.connect(actx.destination);
        noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        decodeSnd(actx);
      }
      if (actx.state === 'suspended') actx.resume();
      return actx;
    } catch { return null; }
  }
  const env = (g, t0, peak, att, dec) => { g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + att); g.gain.exponentialRampToValueAtTime(.0001, t0 + att + dec); };
  function noise(a, t0, dur, f0, f1, peak, q) {
    const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = a.createGain(); env(g, t0, peak, Math.min(.03, dur / 3), dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + .1);
  }
  function tone(a, t0, freq, type, peak, att, dec, f1) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + att + dec);
    env(g, t0, peak, att, dec);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + att + dec + .05);
  }
  // Cada vez que un producto pasa por el marcador: un tic corto. Al frenar el giro, los tics se van espaciando solos
  function sndTick(fast) {
    if (playBuf('tick', fast ? 1 : 1.6, fast ? .09 : 0, .96 + Math.random() * .1)) return;
    const a = audio(); if (!a) return; const t0 = a.currentTime;
    const v = fast ? .13 : .24;
    tone(a, t0, 1450 + Math.random() * 140, 'triangle', v, .002, .055, 720);
    noise(a, t0, .02, 3400, 2600, v * .5, 2);
  }
  // Al parar en el premio: acorde que sube y unas chispas agudas
  function sndWin() {
    const a = audio(); if (!a) return; const t0 = a.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(a, t0 + i * .085, f, 'sine', .22, .006, 1.1);
      tone(a, t0 + i * .085, f * 2, 'triangle', .05, .006, .7);
    });
    for (let i = 0; i < 4; i++) tone(a, t0 + .3 + i * .07 + Math.random() * .03, 2200 + Math.random() * 1800, 'sine', .05, .003, .25);
  }
  function setMuted(m) {
    muted = m;
    try { localStorage.setItem(SKEY, m ? 'off' : 'on'); } catch { /* nada */ }
    paintSound();
  }
  function paintSound() {
    const b = root && root.querySelector('.cnbox-snd');
    if (!b) return;
    b.classList.toggle('off', muted);
    b.setAttribute('aria-label', muted ? t.sndOff : t.sndOn);
    b.title = muted ? t.sndOff : t.sndOn;
    b.setAttribute('aria-pressed', String(!muted));
  }

  function place() {
    if (!root || root.hidden) return;
    const mobile = matchMedia('(max-width: 820px)').matches;
    const r = !mobile && frames ? frames.getBoundingClientRect() : null;
    if (r && r.width > 40 && r.height > 40) {
      Object.assign(root.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: getComputedStyle(frames).borderRadius });
    } else {
      Object.assign(root.style, { left: '0', top: '0', width: '100%', height: '100%', borderRadius: '0' });
    }
  }

  function build() {
    root = el('div', 'cnbox');
    root.id = 'cnbox';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'cnboxTitle');
    root.innerHTML = `
      ${LOCAL ? `<span class="cnbox-demo">${esc(t.demo)}</span>` : ''}
      <div class="cnbox-tools">
        <button class="cnbox-snd" type="button" aria-pressed="true"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9.5v5h3.6L12 18.5v-13L7.6 9.5z" fill="currentColor"/><path class="w1" d="M15.2 9a4.2 4.2 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="w2" d="M17.6 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="mx" d="M15.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        <button class="cnbox-x" type="button">${esc(t.later)}</button>
      </div>
      <div class="cnbox-stage">
        <button class="cnbox-gift" type="button" aria-label="${esc(t.open)}">
          <span class="cnbox-glow"></span>
          ${ART}
          <span class="cnbox-sparks"><i></i><i></i><i></i><i></i></span>
        </button>
        <h2 class="cnbox-title" id="cnboxTitle">${esc(t.title)}</h2>
        <p class="cnbox-hint">${esc(t.hint)}</p>
      </div>
      <div class="cnbox-reelwrap" aria-live="polite">
        <p class="cnbox-label"></p>
        <div class="cnbox-reel"><div class="cnbox-strip"></div><span class="cnbox-line"></span></div>
        <div class="cnbox-result">
          <p class="cnbox-prize"></p>
          <p class="cnbox-price"></p>
          <div class="cnbox-actions">
            <button class="cnbox-btn go" type="button">${esc(t.view)}</button>
            <button class="cnbox-btn soft" type="button">${esc(t.close)}</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(root);
    root.querySelector('.cnbox-snd').addEventListener('click', () => { setMuted(!muted); if (!muted) sndTick(false); });
    paintSound();
    root.querySelector('.cnbox-x').addEventListener('click', () => { try { sessionStorage.setItem('cnbox-later', '1'); } catch { /* nada */ } hide(); });
    root.querySelector('.cnbox-gift').addEventListener('click', openBox);
    root.querySelector('.cnbox-btn.soft').addEventListener('click', () => hide());
    root.querySelector('.cnbox-btn.go').addEventListener('click', () => { const p = prize; hide(); if (p) opts.open?.(p); });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { hide(); return; }
      if (e.key !== 'Tab') return;
      const f = [...root.querySelectorAll('button')].filter((b) => b.offsetParent !== null && !b.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    frames = document.getElementById('frames');
    if (window.ResizeObserver && frames) { ro = new ResizeObserver(place); ro.observe(frames); }
    addEventListener('resize', place);
  }

  function show() {
    if (shown) return;
    shown = true;
    if (!root) build();
    root.className = 'cnbox';
    preloadSnd();
    closeFlaps();
    KNIVES.forEach((k) => { const im = new Image(); im.src = knifeSrc(k); });   // precarga: que no tarde en salir el cuchillo
    root.querySelector('.cnbox-strip').replaceChildren();
    root.hidden = false;
    place();
    prepareReel();                               // las fotos se cargan mientras la caja se agita, para que el giro salga fluido
    requestAnimationFrame(() => { root.classList.add('on'); root.querySelector('.cnbox-gift').focus({ preventScroll: true }); });
  }

  function hide() {
    if (!root || root.hidden) return;
    root.classList.remove('on');
    setTimeout(() => { root.hidden = true; root.className = 'cnbox'; shown = false; busy = false; }, 450);
  }

  /* Carrusel: muchas tarjetas al azar y, en un puesto fijo, el premio */
  const COUNT = 64, PRIZE_AT = 52;
  function prepareReel() {
    prize = pickPrize(pool);
    const strip = root.querySelector('.cnbox-strip');
    const frag = document.createDocumentFragment();
    let prev = null;
    for (let i = 0; i < COUNT; i++) {
      let p = i === PRIZE_AT ? prize : pool[Math.floor(Math.random() * pool.length)];
      if (i !== PRIZE_AT && pool.length > 3) while (p === prev || p === prize) p = pool[Math.floor(Math.random() * pool.length)];
      prev = p;
      const c = el('div', 'cnbox-card' + (i === PRIZE_AT ? ' prize' : ''));
      const img = new Image();
      img.alt = ''; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.src = p.image;
      img.onerror = () => { img.style.visibility = 'hidden'; };
      const pic = el('div', 'cnbox-pic');
      pic.append(img, el('span', 'cnbox-off', '20% OFF'));
      c.append(pic);
      frag.appendChild(c);
    }
    strip.appendChild(frag);
  }

  /* Abre las solapas: giran hacia fuera con un pequeño rebote, una tras otra */
  function openFlaps() {
    const MAX = 130 * Math.PI / 180, T = 460, delay = { br: 0, bl: 30, fl: 60, fr: 90 };
    const gs = [...root.querySelectorAll('.cnbox-flap')].map((g) => ({ g, f: FLAPS.find((x) => x.id === g.dataset.f) }));
    const ease = (x) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);   // sale rápido y se pasa un poco antes de asentarse
    const t0 = performance.now();
    let swapped = false;
    const frame = (now) => {
      let done = true;
      gs.forEach(({ g, f }) => {
        const k = Math.min(1, Math.max(0, (now - t0 - delay[f.id]) / T));
        if (k < 1) done = false;
        g.setAttribute('transform', flapMat(f, MAX * ease(k)));
        // cerrada, las solapas mayores tapan a las menores; al pasar de la vertical, las de delante pasan a ir por encima de las de atrás
        if (f.id === 'fl' && !swapped && MAX * ease(k) > Math.PI / 2) {
          swapped = true;
          const lid = g.parentNode;
          lid.insertBefore(g, lid.querySelector('[data-f="fr"]'));
        }
      });
      if (!done) requestAnimationFrame(frame);
    };
    if (REDUCE.matches) gs.forEach(({ g, f }) => g.setAttribute('transform', flapMat(f, MAX)));
    else requestAnimationFrame(frame);
  }

  /* Curva cubic-bezier como en CSS (para el giro del cuchillo) */
  const bezier = (x1, y1, x2, y2) => (x) => {
    if (x <= 0 || x >= 1) return Math.min(1, Math.max(0, x));
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    let s = x;
    for (let i = 0; i < 8; i++) { const e = ((ax * s + bx) * s + cx) * s - x, d = (3 * ax * s + 2 * bx) * s + cx; if (Math.abs(e) < 1e-5 || !d) break; s -= e / d; }
    return ((ay * s + by) * s + cy) * s;
  };

  /* El cuchillo aparece girando 180° sobre su centro (frenando hasta quedar en su posición), clava la punta en el extremo de la cinta y la recorre en línea recta;
     después se retira y se abren las solapas */
  function slice(done) {
    const kg = root.querySelector('.cnbox-knife');
    const k = KNIVES[Math.floor(Math.random() * KNIVES.length)];
    kg.innerHTML = `<g class="cnbox-kr"><image href="${knifeSrc(k)}" x="${-k.tx}" y="${-k.ty}" width="${k.w}" height="${k.h}"${k.px ? ' style="image-rendering:pixelated"' : ''}/></g>`;
    const kr = kg.firstChild, cx = k.w / 2 - k.tx, cy = k.h / 2 - k.ty;   // centro del cuchillo, medido desde la punta
    const S = .32 * (k.px ? .7 : 1);                // las espadas, un 30 % más pequeñas que los cuchillos
    const P0 = [70, 115], P1 = [170, 65];                // la recta de la cinta: y = 110 - (x - 80) / 2
    const lerp = (a, b, p) => a + (b - a) * p;
    const spinE = bezier(.12, .7, .18, 1), outC = (x) => 1 - Math.pow(1 - x, 3);
    const put = (x, y, o, deg) => {
      kg.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${S})`);
      kr.setAttribute('transform', `rotate(${deg.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})`);
      kg.setAttribute('opacity', o.toFixed(2));
    };
    const A = 640, B = 300, R = 200, t0 = performance.now();
    let called = false;
    const frame = (now) => {
      const e = now - t0;
      if (e < A) {                                       // aparece: baja un poco, se hace visible y gira 180° frenando
        const p = e / A;
        put(P0[0], P0[1] - 30 * (1 - outC(p)), Math.min(1, p / .3), 180 * (1 - spinE(p)));
      } else if (e < A + B) {                            // desliza la punta por la cinta: arranca rápido y frena
        const p = outC((e - A) / B);
        put(lerp(P0[0], P1[0], p), lerp(P0[1], P1[1], p), 1, 0);
      } else {                                           // llega al final: se abren las solapas y el cuchillo se retira
        if (!called) { called = true; done(); }
        const p = Math.min(1, (e - A - B) / R);
        put(P1[0] + 14 * p, P1[1] - 26 * p, 1 - p, 0);
        if (p >= 1) { kg.setAttribute('opacity', 0); return; }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* Deja las solapas cerradas y en su orden original (para cuando la caja vuelve a salir) */
  function closeFlaps() {
    const lid = root.querySelector('.cnbox-lid');
    root.querySelector('.cnbox-knife').setAttribute('opacity', 0);
    FLAPS.forEach((f) => {
      const g = lid.querySelector(`[data-f="${f.id}"]`);
      g.setAttribute('transform', flapMat(f, 0));
      lid.appendChild(g);                          // orden original: br, fl, bl, fr
    });
  }

  function openBox() {
    if (busy) return;
    busy = true;
    write({ day: today(), name: prize?.name || '' });   // contado en cuanto se abre: recargar la página no permite repetir
    root.classList.add('opening');
    const go = () => { openFlaps(); setTimeout(spin, REDUCE.matches ? 80 : 1150); };
    if (REDUCE.matches) { go(); playBuf('open', 1.3); return; }
    audio();                                       // el clic despierta el audio
    let tries = 0;                                 // si el archivo aún se está decodificando, reintenta unos milisegundos
    const playOpen = () => { if (!playBuf('open', 1.3) && tries++ < 15) setTimeout(playOpen, 20); };
    setTimeout(playOpen, 300);                     // 0,15 s antes que la versión original (450 ms -> 300 ms)
    slice(go);
  }

  function spin() {
    root.classList.remove('opening');
    root.classList.add('spin');
    const strip = root.querySelector('.cnbox-strip'), card = strip.children[PRIZE_AT];
    const w = card.getBoundingClientRect().width, gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
    const jitter = (Math.random() - .5) * (w - 26);        // el marcador cae en cualquier punto del premio, no siempre justo en el centro
    const x = -(PRIZE_AT * (w + gap) + w / 2 + jitter);
    const dur = REDUCE.matches ? 600 : 6400;
    const anim = strip.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${x}px)` }], { duration: dur, easing: REDUCE.matches ? 'ease-out' : 'cubic-bezier(.1, .55, .12, 1)', fill: 'forwards' });
    // un tic cada vez que cambia el producto que esta bajo el marcador
    const step = w + gap;
    let last = 0;
    lastTick = 0;
    const loop = () => {
      const m = getComputedStyle(strip).transform;
      const px = m && m !== 'none' ? -new DOMMatrixReadOnly(m).m41 : 0;
      const k = Math.floor(px / step);
      if (k !== last) {
        const now = performance.now();
        if (now - lastTick > 26) { sndTick(now - lastTick < 70); lastTick = now; }
        last = k;
      }
      if (anim.playState === 'running') requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    // al parar, un último empujón suave que deja el premio justo en el centro, bajo el marcador
    const xc = -(PRIZE_AT * (w + gap) + w / 2);
    const settle = () => {
      if (REDUCE.matches || Math.abs(x - xc) < 1.5) { reveal(); return; }
      const a2 = strip.animate([{ transform: `translateX(${x}px)` }, { transform: `translateX(${xc}px)` }], { duration: 520, delay: 120, easing: 'cubic-bezier(.3, .1, .2, 1)', fill: 'forwards' });
      a2.finished.then(reveal, reveal);
    };
    anim.finished.then(settle, reveal);
  }

  function reveal() {
    root.querySelector('.cnbox-label').innerHTML = '';
    root.querySelector('.cnbox-prize').textContent = prize.name;
    const pe = root.querySelector('.cnbox-price');
    const n = opts.num ? opts.num(prize.priceRaw) : NaN;
    if (n > 0 && opts.money) pe.innerHTML = `<s>${esc(opts.money(n))}</s> <b>${esc(opts.money(n * (1 - DISCOUNT)))}</b> <span class="cnbox-off inline">20% OFF</span>`;
    else pe.innerHTML = '<span class="cnbox-off inline">20% OFF</span>';
    pe.hidden = false;
    root.classList.remove('spin');
    root.classList.add('won');
    sndWin();
    setTimeout(() => root.querySelector('.cnbox-btn.go').focus({ preventScroll: true }), 400);
  }

  /* BOTÓN TEMPORAL DE PRUEBAS (solo en local: nunca aparece en la web publicada). Vuelve a sacar la caja las veces que haga falta, sin esperar al día siguiente. */
  function testButton() {
    if (document.getElementById('cnboxTest')) return;
    const b = el('button', 'cnbox-test');
    b.id = 'cnboxTest'; b.type = 'button'; b.textContent = '▶ Probar caja';
    b.title = 'Botón temporal de pruebas (solo en local)';
    b.addEventListener('click', () => { if (!shown) show(); });
    document.body.appendChild(b);
    const fit = () => {
      const f = document.getElementById('frames'), r = f && f.getBoundingClientRect();
      if (!r || matchMedia('(max-width: 820px)').matches || r.width < 80) { Object.assign(b.style, { left: 'auto', top: 'auto', right: '12px', bottom: 'calc(12px + env(safe-area-inset-bottom))' }); return; }
      Object.assign(b.style, { left: `${r.right - b.offsetWidth - 12}px`, top: `${r.bottom - b.offsetHeight - 12}px`, right: 'auto', bottom: 'auto' });
    };
    fit();
    addEventListener('resize', fit);
    const f = document.getElementById('frames');
    if (window.ResizeObserver && f) new ResizeObserver(fit).observe(f);
  }

  /* Arranque: lo llama app.js cuando ya está cargado el catálogo.
     opts = { pool: () => productos con foto, open: (producto) => abrirlo, num: (texto) => precio como número, money: (número) => precio con formato } */
  function start(o) {
    opts = o || {};
    const q = new URLSearchParams(location.search).get('caja');
    if (LOCAL && q === 'reset') { try { localStorage.removeItem(KEY); } catch { /* nada */ } }
    const force = LOCAL && q !== null;
    pool = (opts.pool?.() || []).filter((p) => p && p.image && p.name);
    if (pool.length < 8) return;
    if (LOCAL) testButton();
    const done = read()?.day === today();
    if (done && !force) return;
    if (!force && sessionStorage.getItem('cnbox-later')) return;
    // si aún se está enseñando la guía o la oferta de bienvenida (primera visita), se espera a que se cierren
    const busyUi = () => ['coach', 'offer'].some((id) => { const n = document.getElementById(id); return n && !n.hidden; });
    let tries = 0;
    const go = () => { if (busyUi() && tries++ < 120) { setTimeout(go, 1000); return; } show(); };
    setTimeout(go, 700);
  }

  window.CnBox = { start };
})();
