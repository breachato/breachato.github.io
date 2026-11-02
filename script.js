document.documentElement.classList.remove('no-js');

// a ogni refresh si riparte dall'inizio: niente posizione ricordata, niente #ancora nell'URL
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
window.scrollTo(0, 0);
addEventListener('beforeunload', () => window.scrollTo(0, 0));

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

// niente immagini o link trascinabili
document.addEventListener('dragstart', e => e.preventDefault());

// link senza destinazione (per ora): non fanno nulla
document.addEventListener('click', e => { if (e.target.closest('[data-noop]')) e.preventDefault(); });

// Discord non ha un link pubblico al profilo: il bottone copia il nick
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  const done = () => {
    const label = b.querySelector('[data-copy-label]');
    if (!label) { b.title = 'Copiato!'; return; }
    const prev = label.dataset.prev || (label.dataset.prev = label.textContent);
    label.textContent = 'Copiato: @' + b.dataset.copy;
    clearTimeout(b._t);
    b._t = setTimeout(() => { label.textContent = prev; }, 1800);
  };
  if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(done, done);
  else done();
});

// ====== titoli spezzati in lettere ======
$$('[data-split]').forEach(el => {
  const text = el.textContent.trim();
  el.textContent = '';
  [...text].forEach(c => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = c === ' ' ? ' ' : c;
    el.append(s);
  });
});

// ====== campo di punti sullo sfondo: ondeggia piano e si accende vicino al mouse ======
(function field() {
  const c = $('#field');
  if (!c) return;
  const ctx = c.getContext('2d');
  const GAP = 32, R = 160;
  let w, h, dots = [];
  const m = { x: -9999, y: -9999, tx: -9999, ty: -9999 };

  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    c.style.width = w + 'px'; c.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = [];
    for (let y = GAP / 2; y < h; y += GAP) for (let x = GAP / 2; x < w; x += GAP) dots.push(x, y);
  }
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', e => { m.tx = e.clientX; m.ty = e.clientY; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { m.tx = m.ty = -9999; });

  let t = 0;
  (function draw() {
    requestAnimationFrame(draw);
    if (document.hidden) return;
    t += .005;
    m.x += (m.tx - m.x) * .08;
    m.y += (m.ty - m.y) * .08;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < dots.length; i += 2) {
      const x = dots[i], y = dots[i + 1];
      const wave = Math.sin(x * .007 + t) * Math.cos(y * .009 + t * .7);
      const d = Math.hypot(x - m.x, y - m.y);
      const k = d < R ? (1 - d / R) ** 2 : 0;
      ctx.fillStyle = `rgba(255,255,255,${.04 + (wave + 1) * .03 + k * .4})`;
      const r = .6 + k * .9;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  })();
})();

// ====== cursore: sempre il pallino bianco, più grande e in contrasto su link e bottoni ======
if (fine) {
  const dot = $('#cursorDot');
  document.documentElement.classList.add('has-cursor');
  addEventListener('pointermove', e => {
    dot.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0) translate(-50%,-50%)`;
    document.documentElement.classList.add('cursor-on');
  }, { passive: true });
  document.addEventListener('pointerover', e => dot.classList.toggle('hover', !!e.target.closest('a, button')));
  document.documentElement.addEventListener('pointerleave', () => document.documentElement.classList.remove('cursor-on'));
}

// ====== leggera inclinazione delle immagini dei lavori ======
if (fine) {
  $$('[data-tilt]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      el.style.setProperty('--rx', (-py * 6) + 'deg');
      el.style.setProperty('--ry', (px * 8) + 'deg');
      el.style.setProperty('--mx', (px + .5) * 100 + '%');
      el.style.setProperty('--my', (py + .5) * 100 + '%');
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });
}

// ====== numeri da GitHub: stats.json lo riscrive la GitHub Action della repo ogni 6 ore ======
const GH_USER = 'breachato';
const stats = fetch('stats.json', { cache: 'no-cache' })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .catch(() => null);
const contributions = stats.then(s => s && s.contributions);
const horizonPRs = stats.then(s => s && s.horizonPRs);

// il contatore animato legge data-count quando parte; se ha già finito, aggiorna il testo
function setStat(name, value) {
  if (value == null) return;
  $$(`[data-stat="${name}"]`).forEach(el => {
    el.dataset.count = value;
    if (el.dataset.counted || !window.gsap) el.textContent = value;
  });
}
contributions.then(v => setStat('contributions', v));
horizonPRs.then(p => p && setStat('prs', p.count));

// ====== terminale: scrive le PR unite su Horizon quando entra in vista ======
(function terminal() {
  const term = $('#term');
  if (!term) return;
  const caret = term.querySelector('.caret');
  const cmd = `gh pr list -R horizon-rust/horizon --author ${GH_USER} --state merged`;
  const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // usato solo se GitHub non risponde
  const fallback = { count: 17, titles: [
    'A pack’s blockstate file stacks over vanilla’s, state by state',
    'A stack’s rarity component sets the colour of its name',
    'A player’s thrown trident fires the projectile impact hook',
    'Native mods: an item frame or painting about to break, cancellable',
    'A boat’s entity tick Post comes after the rest of its tick',
    'A shift-click during a drag on a mod menu type only ends the drag',
    'Fill three gaps in the native entity mount hook',
    'The item_stack helper draws nothing for an empty stack'
  ] };
  const line = (html, cls = '') => {
    const s = document.createElement('span');
    s.className = 't-line ' + cls;
    s.innerHTML = html;
    term.insertBefore(s, caret);
    return s;
  };
  const run = ({ count, titles }) => {
    const out = line('<span class="t-prompt">❯</span> <span class="t-cmd"></span>').querySelector('.t-cmd');
    let i = 0, j = 0;
    const list = () => {
      if (j < titles.length) { line(`<span class="t-ok">✓ merged</span>  ${esc(titles[j++])}`); setTimeout(list, 120); }
      else {
        const rest = count - titles.length;
        line(`${rest > 0 ? `+ altre ${rest} · ` : ''}<span class="t-ok">${count} merged</span>`, 't-sum');
      }
    };
    const type = () => {
      out.textContent = cmd.slice(0, ++i);
      if (i < cmd.length) setTimeout(type, 22);
      else setTimeout(list, 350);
    };
    type();
  };
  const io = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    horizonPRs.then(p => run(p && p.titles.length ? p : fallback));
  }, { threshold: .4 });
  io.observe(term);
})();

// ====== menu mobile ======
const ham = $('#hamburger'), nav = $('#hdrNav');
let lenis = null;
const setMenu = open => {
  ham.classList.toggle('open', open);
  nav.classList.toggle('open', open);
  ham.setAttribute('aria-expanded', open);
  document.body.classList.toggle('no-scroll', open);
  if (lenis) open ? lenis.stop() : lenis.start();
};
ham.addEventListener('click', () => setMenu(!nav.classList.contains('open')));

// ====== animazioni e scroll (GSAP + Lenis) ======
window.addEventListener('DOMContentLoaded', () => {
  const loader = $('#loader');
  if (!window.gsap || !window.ScrollTrigger) {
    document.documentElement.classList.add('static');
    if (loader) loader.remove();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis) {
    lenis = new Lenis({ lerp: .1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // link interni
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    setMenu(false);
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else window.scrollTo({ top: target === 0 ? 0 : target.offsetTop, behavior: 'smooth' });
  });

  // ---- entrata dell'hero (parte quando il caricamento è finito) ----
  const intro = gsap.timeline({ paused: true })
    .from('.hero-title .mask > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: .1 })
    .from('.hero .reveal-up', { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: .1 }, '-=1')
    // clearProps: un transform rimasto sull'header intrappolerebbe il menu mobile (fixed) dentro l'header
    .from('.hdr', { y: -20, opacity: 0, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity' }, '<');

  // ---- caricamento: la barra segue font e immagini, poi la schermata si apre verso l'alto ----
  if (!loader) intro.play();
  else {
    if (lenis) lenis.stop();
    document.documentElement.classList.add('loading');
    const bar = $('#loaderBar');
    const imgs = $$('img');
    const total = imgs.length + 2; // immagini + font + load della pagina
    let done = 0;
    const step = () => { done++; gsap.to(bar, { scaleX: Math.min(1, done / total), duration: .5, ease: 'power2.out', overwrite: true }); };
    imgs.forEach(img => {
      if (img.complete) return step();
      img.addEventListener('load', step, { once: true });
      img.addEventListener('error', step, { once: true });
    });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(step);
    const loaded = new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }));
    const minTime = new Promise(r => setTimeout(r, 900));
    const maxTime = new Promise(r => setTimeout(r, 5000));
    Promise.race([Promise.all([loaded, minTime]), maxTime]).then(() => {
      window.scrollTo(0, 0);
      gsap.timeline()
        .to(bar, { scaleX: 1, duration: .35, ease: 'power2.out', overwrite: true })
        .to('.loader-inner', { opacity: 0, y: -12, duration: .4, ease: 'power2.in' })
        .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'expo.inOut' })
        .add(() => intro.play(), '-=.45')
        .add(() => {
          loader.remove();
          document.documentElement.classList.remove('loading');
          if (lenis) lenis.start();
          ScrollTrigger.refresh();
        });
    });
  }

  // ---- titoli di sezione (l'hero ha già la sua entrata) ----
  $$('.sec-title').forEach(t => gsap.from(t.querySelectorAll('.mask > span'), {
    yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .08,
    scrollTrigger: { trigger: t, start: 'top 88%', once: true }
  }));
  gsap.from('.contact-title .ch', { yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: .035, scrollTrigger: { trigger: '.contact-title', start: 'top 85%', once: true } });

  // ---- testi e blocchi ----
  $$('[data-reveal]').forEach(el => gsap.from(el, {
    y: 36, opacity: 0, duration: 1.1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 90%', once: true }
  }));
  gsap.from('.idx li', { y: 30, opacity: 0, duration: .9, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: '.idx', start: 'top 88%', once: true } });

  // ---- contatori ----
  $$('[data-count]').forEach(el => {
    el.textContent = '0';
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => {
      const o = { v: 0 };
      gsap.to(o, { v: +el.dataset.count, duration: 1.8, ease: 'power3.out',
        onUpdate: () => { el.textContent = Math.round(o.v); },
        onComplete: () => { el.dataset.counted = '1'; el.textContent = el.dataset.count; } });
    } });
  });

  // ---- lavori: carosello orizzontale bloccato su desktop ----
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const track = $('#workTrack'), cards = $$('.wcard', track), idx = $('#workIdx'), bar = $('#workBar');
    const dist = () => track.scrollWidth - innerWidth;
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.work', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: true, invalidateOnRefresh: true,
        onUpdate: s => {
          idx.textContent = String(Math.min(cards.length, Math.floor(s.progress * cards.length * .999) + 1)).padStart(2, '0');
          bar.style.transform = `scaleX(${.2 + s.progress * .8})`;
        }
      }
    });
  });
  mm.add('(max-width: 899px)', () => {
    $$('.wcard').forEach(card => gsap.from(card, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 90%', once: true } }));
  });

  // ---- link attivo nel menu (dopo il pin, così le posizioni sono giuste) ----
  $$('.hdr-nav a').forEach(a => {
    const sec = $(a.getAttribute('href'));
    if (sec) ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: s => a.classList.toggle('active', s.isActive) });
  });

  // ---- stack: due righe che scorrono in direzioni opposte ----
  $$('.mq-row').forEach(row => {
    const inner = row.querySelector('.mq-inner'), dir = +row.dataset.dir;
    let x = dir > 0 ? 0 : -inner.scrollWidth / 2;
    gsap.ticker.add((time, dt) => {
      const half = inner.scrollWidth / 2;
      x -= .6 * dir * dt / 16;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      inner.style.transform = `translate3d(${x}px,0,0)`;
    });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
});
