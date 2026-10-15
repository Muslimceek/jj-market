(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const mq = q => matchMedia(q);
  const reduced = mq('(prefers-reduced-motion: reduce)');
  const finePointer = mq('(hover: hover) and (pointer: fine)');
  const desktop = mq('(min-width: 901px)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
  };

  // Official store listings, verified against the App Store and Google Play.
  const LINKS = {
    iosBuyer: 'https://apps.apple.com/app/jj-market-kz/id6768357531',
    androidBuyer: 'https://play.google.com/store/apps/details?id=com.jjmarket.customer&pcampaignid=web_share'
  };

  /* ---------- Platform: send each visitor to their own store ---------- */
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  root.classList.add(isIOS ? 'os-ios' : isAndroid ? 'os-android' : 'os-desktop');
  if (isIOS || isAndroid) {
    $$('[data-smart-download]').forEach(a => { a.href = isIOS ? LINKS.iosBuyer : LINKS.androidBuyer; a.rel = 'noopener'; });
  }

  /* ---------- Analytics hook (works with GTM if present) ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-track]');
    if (!a) return;
    const detail = { action: a.dataset.track, href: a.getAttribute('href'), language: lang };
    window.dispatchEvent(new CustomEvent('jj:cta', { detail }));
    if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: 'jj_cta_click', ...detail });
  });

  /* ---------- Marquee: duplicate once for a seamless loop ---------- */
  const track = $('.marquee-track');
  if (track) [...track.children].forEach(li => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.append(c); });

  /* ---------- FAQ ---------- */
  const faq = $('#faqList');
  faq.innerHTML = [1, 2, 3, 4, 5, 6, 7].map(n => `
    <div class="qa glass reveal" style="--i:${n - 1}" data-specular>
      <h3><button class="q" type="button" id="q${n}" aria-expanded="false" aria-controls="a${n}"><span data-i18n="faq.q${n}"></span><span class="plus" aria-hidden="true"></span></button></h3>
      <div class="a" id="a${n}" role="region" aria-labelledby="q${n}" inert><div><p data-i18n="faq.a${n}"></p></div></div>
    </div>`).join('');
  faq.addEventListener('click', e => {
    const q = e.target.closest('.q');
    if (!q) return;
    const open = q.getAttribute('aria-expanded') !== 'true';
    q.setAttribute('aria-expanded', String(open));
    $('#' + q.getAttribute('aria-controls')).inert = !open;
  });

  /* ---------- i18n ---------- */
  const DICT = window.JJ_I18N || { ru: {} };
  const CODES = { ru: 'RU', kk: 'KZ', tr: 'TR', uz: 'UZ', ky: 'KG' };
  const browserLang = (navigator.languages || [navigator.language || 'ru']).map(l => String(l).toLowerCase().split('-')[0]).find(l => CODES[l]);
  let lang = CODES[store.get('jj_lang')] ? store.get('jj_lang') : (browserLang || 'ru');
  const t = k => (DICT[lang] && DICT[lang][k]) ?? DICT.ru[k] ?? '';

  function translate(next, save) {
    lang = CODES[next] ? next : 'ru';
    root.lang = lang;
    $$('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (v) el.textContent = v; });
    $$('[data-i18n-alt]').forEach(el => { const v = t(el.dataset.i18nAlt); if (v) el.alt = v; });
    $$('[data-i18n-aria]').forEach(el => { const v = t(el.dataset.i18nAria); if (v) el.setAttribute('aria-label', v); });
    document.title = t('meta.title');
    $('meta[name="description"]').setAttribute('content', t('meta.description'));
    $('.lang-code').textContent = CODES[lang];
    $('#langTrigger').setAttribute('aria-label', `${t('ui.language')}: ${CODES[lang]}`);
    $$('[data-lang]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.lang === lang)));
    $('#footerLang').value = lang;
    $('.nav').setAttribute('aria-label', t('ui.sections'));
    $('.cats').setAttribute('aria-label', t('ui.categories'));
    $('.footer-nav').setAttribute('aria-label', t('footer.apps'));
    setMotionLabel();
    splitTitles();
    requestAnimationFrame(placeThumb);
    if (save) store.set('jj_lang', lang);
  }

  const trigger = $('#langTrigger'), menu = $('#langMenu');
  const closeMenu = focus => {
    if (menu.hidden) return;
    trigger.setAttribute('aria-expanded', 'false');
    if (focus) trigger.focus();
    if (reduced.matches) { menu.hidden = true; return; }
    menu.classList.add('is-closing');
    setTimeout(() => { menu.hidden = true; menu.classList.remove('is-closing'); }, 160);
  };
  trigger.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) ($(`[data-lang="${lang}"]`, menu) || menu.firstElementChild).focus();
  });
  menu.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) { translate(b.dataset.lang, true); closeMenu(true); } });
  menu.addEventListener('keydown', e => {
    const items = $$('button', menu), i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
    if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    if (e.key === 'Tab') closeMenu(false);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) closeMenu(true); });
  document.addEventListener('pointerdown', e => { if (!menu.hidden && !e.target.closest('#langMenu, #langTrigger')) closeMenu(false); });
  $('#footerLang').addEventListener('change', e => translate(e.target.value, true));

  /* ---------- Motion preference (pause button + reduced motion) ---------- */
  let paused = reduced.matches || store.get('jj_motion') === 'paused';
  const toggle = $('#motionToggle');
  function setMotionLabel() { if (toggle) { toggle.setAttribute('aria-label', t(paused ? 'ui.play' : 'ui.pause')); toggle.setAttribute('aria-pressed', String(paused)); } }
  function setPaused(v, save) {
    paused = v;
    root.classList.toggle('motion-paused', paused);
    setMotionLabel();
    if (save) store.set('jj_motion', paused ? 'paused' : 'playing');
    if (!paused) { globe.start(); autoSeller.restart(); } else autoSeller.stop();
  }
  toggle && toggle.addEventListener('click', () => setPaused(!paused, true));
  reduced.addEventListener('change', e => setPaused(e.matches || store.get('jj_motion') === 'paused'));

  /* ---------- Section titles rise word by word ---------- */
  const esc = w => w.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function splitTitles() {
    $$('.title').forEach(el => {
      let k = 0;
      const text = el.textContent;
      el.innerHTML = text.split('\n').map(line => line.split(' ').filter(Boolean).map(w => `<span class="w"><span style="--wi:${k++}">${esc(w)}</span></span>`).join(' ')).join('<br>');
      el.classList.add('split');
    });
  }

  /* ---------- Reveal on enter ---------- */
  const revealIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); }
  }), { threshold: .14, rootMargin: '0px 0px -6% 0px' });
  const observeReveals = () => $$('.reveal:not(.is-in), .title:not(.is-in)').forEach(el => revealIO.observe(el));

  /* ---------- Header, dock, active nav ---------- */
  const header = $('#header');
  new IntersectionObserver(([en]) => header.classList.toggle('is-scrolled', !en.isIntersecting)).observe($('.top-sentinel'));
  const dock = $('#dock');
  let heroOut = false, downloadIn = false;
  const syncDock = () => dock.classList.toggle('is-visible', heroOut && !downloadIn);
  new IntersectionObserver(([en]) => { heroOut = !en.isIntersecting; syncDock(); }, { threshold: 0, rootMargin: '-35% 0px 0px 0px' }).observe($('.hero'));
  new IntersectionObserver(([en]) => { downloadIn = en.isIntersecting; syncDock(); }, { threshold: .2 }).observe($('#download'));
  const navLinks = $$('.nav a');
  const sectionIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    navLinks.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id)));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['top', 'how', 'why', 'sellers', 'faq'].forEach(id => sectionIO.observe($('#' + id)));

  /* ---------- Phone screen transitions (shared by "how" and sellers) ---------- */
  function showScreen(container, next) {
    const screens = $$('.screen', container);
    const prev = screens.findIndex(s => s.classList.contains('is-active'));
    if (prev === next || !screens[next]) return;
    const incoming = screens[next];
    screens.forEach(s => s.classList.remove('is-prev'));
    if (prev > -1) { screens[prev].classList.remove('is-active'); screens[prev].classList.add('is-prev'); }
    if (reduced.matches) {
      incoming.style.transition = 'none';
    } else {
      incoming.style.transition = 'none';
      incoming.classList.toggle('from-top', next < prev);
      void incoming.offsetWidth;
      incoming.style.transition = '';
    }
    incoming.classList.add('is-active');
    container.classList.toggle('status-light', incoming.dataset.status === 'light');
    clearTimeout(container._t);
    container._t = setTimeout(() => {
      screens.forEach((s, i) => { if (i !== next) s.classList.remove('is-prev', 'from-top'); });
      incoming.style.transition = '';
    }, 820);
  }

  /* ---------- How to order: the step crossing the middle drives the phone ---------- */
  const steps = $$('.step');
  const howScreens = $('#howScreens');
  function setStep(i) {
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    $('#steps').style.setProperty('--progress', ((i + 1) / steps.length).toFixed(3));
    showScreen(howScreens, i);
  }
  const stepIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting && desktop.matches) setStep(Number(en.target.dataset.step));
  }), { rootMargin: '-46% 0px -46% 0px' });
  steps.forEach(s => stepIO.observe(s));
  steps[0] && steps[0].classList.add('is-active');

  /* ---------- Seller app: segmented control + gentle auto-advance ---------- */
  const tabs = $$('#sellerTabs [role="tab"]');
  const sellerScreens = $('#sellerScreens');
  const thumb = $('.seg-thumb');
  let sellerIndex = 0;
  function placeThumb() {
    const b = tabs[sellerIndex];
    if (!b || !thumb) return;
    thumb.style.setProperty('--tx', b.offsetLeft + 'px');
    thumb.style.setProperty('--tw', b.offsetWidth + 'px');
    thumb.style.setProperty('--ty', b.offsetTop + 'px');
    thumb.style.setProperty('--th', b.offsetHeight + 'px');
  }
  function selectTab(i, focus) {
    sellerIndex = (i + tabs.length) % tabs.length;
    tabs.forEach((b, k) => { const on = k === sellerIndex; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    sellerScreens.setAttribute('aria-labelledby', tabs[sellerIndex].id);
    placeThumb();
    showScreen(sellerScreens, sellerIndex);
    if (focus) tabs[sellerIndex].focus();
  }
  tabs.forEach((b, i) => b.addEventListener('click', () => { autoSeller.hold(); selectTab(i); }));
  $('#sellerTabs').addEventListener('keydown', e => {
    const map = { ArrowRight: 1, ArrowLeft: -1 };
    if (map[e.key]) { e.preventDefault(); autoSeller.hold(); selectTab(sellerIndex + map[e.key], true); }
    if (e.key === 'Home') { e.preventDefault(); autoSeller.hold(); selectTab(0, true); }
    if (e.key === 'End') { e.preventDefault(); autoSeller.hold(); selectTab(tabs.length - 1, true); }
  });
  const autoSeller = (() => {
    let timer = 0, visible = false, holdUntil = 0;
    const tick = () => { if (!paused && visible && performance.now() > holdUntil) selectTab(sellerIndex + 1); };
    const api = {
      stop() { clearInterval(timer); timer = 0; },
      restart() { api.stop(); if (!paused && visible) timer = setInterval(tick, 3600); },
      hold() { holdUntil = performance.now() + 12000; },
      setVisible(v) { visible = v; api.restart(); }
    };
    return api;
  })();
  const sellerDevice = $('.seller-device');
  new IntersectionObserver(([en]) => autoSeller.setVisible(en.isIntersecting), { threshold: .4 }).observe(sellerDevice);
  sellerDevice.addEventListener('pointerenter', () => autoSeller.hold());
  sellerDevice.addEventListener('focusin', () => autoSeller.hold());
  window.addEventListener('resize', () => requestAnimationFrame(placeThumb), { passive: true });

  /* ---------- Specular highlight follows the pointer on glass ---------- */
  let specEl = null, specX = 0, specY = 0, specRaf = 0;
  document.addEventListener('pointermove', e => {
    if (!finePointer.matches) return;
    specEl = e.target.closest && e.target.closest('[data-specular]');
    if (!specEl) return;
    specX = e.clientX; specY = e.clientY;
    if (!specRaf) specRaf = requestAnimationFrame(() => {
      specRaf = 0;
      if (!specEl) return;
      const r = specEl.getBoundingClientRect();
      specEl.style.setProperty('--mx', ((specX - r.left) / r.width * 100).toFixed(1) + '%');
      specEl.style.setProperty('--my', ((specY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  }, { passive: true });

  /* ---------- Liquid Glass edge refraction (Chromium only) ----------
     Each .lens element gets an SVG displacement map shaped like its own rounded rectangle:
     pixels near the rim sample the backdrop from further inside, bending the light like a
     thick glass edge. Other browsers keep the frosted fallback from CSS. */
  const lensOK = (() => {
    const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
    return brands.some(b => /Chromium|Google Chrome|Microsoft Edge|Opera/i.test(b.brand))
      && CSS.supports('backdrop-filter', 'url(#x)')
      && !mq('(prefers-reduced-transparency: reduce)').matches;
  })();
  if (lensOK) {
    const defs = $('#lensDefs');
    const NS = 'http://www.w3.org/2000/svg';
    let uid = 0;
    const buildMap = (w, h, r, bezel) => {
      const k = w * h > 60000 ? .5 : 1;           // big surfaces get a half-res map, scaled up by feImage
      const cw = Math.max(2, Math.round(w * k)), ch = Math.max(2, Math.round(h * k));
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const ctx = c.getContext('2d'), img = ctx.createImageData(cw, ch), d = img.data;
      const hw = w / 2, hh = h / 2;
      const sdf = (x, y) => { const qx = Math.abs(x - hw) - (hw - r), qy = Math.abs(y - hh) - (hh - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
        const x = (i + .5) / k, y = (j + .5) / k, o = (j * cw + i) * 4;
        const dist = -sdf(x, y);
        let dx = 0, dy = 0;
        if (dist > 0 && dist < bezel) {
          const gx = sdf(x + 1, y) - sdf(x - 1, y), gy = sdf(x, y + 1) - sdf(x, y - 1), gl = Math.hypot(gx, gy) || 1;
          const m = Math.pow(1 - dist / bezel, 2.2);  // strongest at the rim, fading to clear glass
          dx = -gx / gl * m; dy = -gy / gl * m;
        }
        d[o] = 128 + dx * 127; d[o + 1] = 128 + dy * 127; d[o + 2] = 128; d[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      return c.toDataURL();
    };
    const apply = el => {
      const r0 = el.getBoundingClientRect();
      const w = Math.round(r0.width), h = Math.round(r0.height);
      if (w < 8 || h < 8) return;
      const cs = getComputedStyle(el);
      const r = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, h / 2, w / 2);
      const bezel = Math.min(22, h * .36, w * .36);
      const id = el.dataset.lens || (el.dataset.lens = 'lens-' + (++uid));
      let f = defs.querySelector('#' + id);
      if (!f) {
        f = document.createElementNS(NS, 'filter');
        f.id = id; f.setAttribute('color-interpolation-filters', 'sRGB'); f.setAttribute('filterUnits', 'userSpaceOnUse');
        f.innerHTML = '<feImage result="map" preserveAspectRatio="none" x="0" y="0"/><feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G"/>';
        defs.append(f);
      }
      f.setAttribute('x', 0); f.setAttribute('y', 0); f.setAttribute('width', w); f.setAttribute('height', h);
      const fe = f.querySelector('feImage');
      fe.setAttribute('width', w); fe.setAttribute('height', h); fe.setAttribute('href', buildMap(w, h, r, bezel));
      f.querySelector('feDisplacementMap').setAttribute('scale', (bezel * 1.7).toFixed(1));
      const blur = Math.max(4, (parseFloat(cs.getPropertyValue('--blur')) || 16) * .55);
      const value = `url(#${id}) blur(${blur.toFixed(1)}px) saturate(185%) brightness(1.04)`;
      el.style.backdropFilter = value; el.style.webkitBackdropFilter = value;
    };
    const ro = new ResizeObserver(entries => entries.forEach(en => {
      clearTimeout(en.target._lt);
      en.target._lt = setTimeout(() => apply(en.target), 90);
    }));
    $$('.lens').forEach(el => ro.observe(el));
    root.classList.add('has-lens');
  }

  /* ---------- Globe: Natural Earth dots and the Istanbul to Kazakhstan route ----------
     Camera flies in, the route draws as a comet, parcels travel it on a loop and Kazakhstan
     lights up on every arrival. Drag to spin (inertia, then it settles home). */
  const globe = (() => {
    const canvas = $('#globe'), wrap = $('.globe-wrap'), DATA = window.JJ_GLOBE;
    if (!canvas || !DATA) return { start() {} };
    const ctx = canvas.getContext('2d');
    const from = $('#geoFrom'), to = $('#geoTo'), parcel = $('#parcel');
    const R = Math.PI / 180, TAU = Math.PI * 2;
    const vec = (lat, lon) => [Math.cos(lat * R) * Math.sin(lon * R), Math.sin(lat * R), Math.cos(lat * R) * Math.cos(lon * R)];
    const easeOut = p => 1 - Math.pow(1 - p, 3);

    const expand = (rows, step, lat0, out) => {
      for (const row of rows) {
        const lat = lat0 + row[0] * step, n = Math.max(1, Math.round(360 * Math.cos(lat * R) / step));
        for (let i = 1; i < row.length; i += 2) for (let k = row[i]; k < row[i + 1]; k++) out.push(vec(lat, -180 + (k + .5) * 360 / n));
      }
      return out;
    };
    const land = expand(DATA.rows, DATA.s, DATA.lat0, []);
    const tr = expand(DATA.tr, DATA.fs, DATA.flat0, []);
    const kz = expand(DATA.kz, DATA.fs, DATA.flat0, []);
    const grat = [];
    for (let lon = -180; lon < 180; lon += 20) { const l = []; for (let lat = -80; lat <= 80; lat += 4) l.push(vec(lat, lon)); grat.push(l); }
    for (let lat = -60; lat <= 60; lat += 20) { const l = []; for (let lon = -180; lon <= 180; lon += 4) l.push(vec(lat, lon)); grat.push(l); }
    const stars = Array.from({ length: 42 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * TAU, s: .6 + Math.random() * 1.1 }));

    const A = vec(41.01, 28.98), B = vec(51.17, 71.45);
    const omega = Math.acos(A[0] * B[0] + A[1] * B[1] + A[2] * B[2]);
    const arc = Array.from({ length: 121 }, (_, i) => {
      const s = i / 120, a = Math.sin((1 - s) * omega) / Math.sin(omega), b = Math.sin(s * omega) / Math.sin(omega), lift = 1 + .24 * Math.sin(Math.PI * s);
      return [(a * A[0] + b * B[0]) * lift, (a * A[1] + b * B[1]) * lift, (a * A[2] + b * B[2]) * lift];
    });

    const HOME = { lon: 50, lat: 39 };
    let w = 0, h = 0, dpr = 1, rad = 0, raf = 0, visible = false, last = 0, clock = 0;
    let introAt = 0, arcDoneAt = 0, kzLit = 0, lastS = 0;
    let aimX = 0, aimY = 0, curX = 0, curY = 0;
    let dragLon = 0, dragLat = 0, vLon = 0, vLat = 0, dragging = false, releasedAt = 0;
    const ripples = [];

    function size() {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      rad = Math.min(w, h) * .4;
      draw(performance.now());
    }
    function view(now) {
      const p = introAt ? (reduced.matches ? 1 : easeOut(Math.min(1, (now - introAt) / 2100))) : 0;
      return {
        lon: (HOME.lon - 80 * (1 - p) + Math.sin(clock * .00016) * 4 + curX * 12 + dragLon) * R,
        lat: (HOME.lat - 16 * (1 - p) + curY * 7 + dragLat) * R,
        zoom: .8 + .2 * p, intro: p
      };
    }
    const project = (v, cl, sl, ct, st) => {
      const x = v[0] * cl - v[2] * sl, z = v[0] * sl + v[2] * cl, y = v[1];
      return [x, y * ct - z * st, y * st + z * ct];
    };

    function draw(now) {
      if (!w) return;
      const c = ctx, cx = w / 2, cy = h / 2;
      const V = view(now), r = rad * V.zoom;
      const cl = Math.cos(V.lon), sl = Math.sin(V.lon), ct = Math.cos(V.lat), st = Math.sin(V.lat);
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);

      // Stars twinkle around the planet.
      for (const s of stars) {
        const a = .15 + .45 * (.5 + .5 * Math.sin(clock * .0018 + s.p));
        c.fillStyle = `rgba(231,205,255,${(a * V.intro).toFixed(3)})`;
        c.fillRect(s.x * w, s.y * h, s.s, s.s);
      }
      // Atmosphere.
      const atm = c.createRadialGradient(cx, cy, r * .92, cx, cy, r * 1.32);
      atm.addColorStop(0, 'rgba(174,51,255,.42)'); atm.addColorStop(.45, 'rgba(174,51,255,.12)'); atm.addColorStop(1, 'rgba(174,51,255,0)');
      c.fillStyle = atm; c.beginPath(); c.arc(cx, cy, r * 1.32, 0, TAU); c.fill();

      // Orbit ring, back half (behind the sphere).
      const orbit = (front) => {
        c.save(); c.translate(cx, cy); c.rotate(-.32); c.scale(1, .26);
        c.strokeStyle = `rgba(214,170,255,${front ? .32 : .12})`; c.lineWidth = 1.2 / .26 * .3; c.setLineDash([2, 7]);
        c.beginPath(); c.arc(0, 0, r * 1.2, front ? 0 : Math.PI, front ? Math.PI : TAU); c.stroke(); c.setLineDash([]);
        const g = (clock * .00022) % TAU, gy = Math.sin(g);
        if ((gy > 0) === front) { c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(Math.cos(g) * r * 1.2, gy * r * 1.2, 5, 0, TAU); c.fill(); }
        c.restore();
      };
      orbit(false);

      // Sphere body + night side.
      const body = c.createRadialGradient(cx - r * .35, cy - r * .42, r * .08, cx, cy, r);
      body.addColorStop(0, '#41186b'); body.addColorStop(.62, '#1c0b2e'); body.addColorStop(1, '#10071a');
      c.fillStyle = body; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();

      // Graticule.
      c.strokeStyle = 'rgba(214,170,255,.07)'; c.lineWidth = 1;
      for (const line of grat) {
        c.beginPath(); let pen = false;
        for (const v of line) { const q = project(v, cl, sl, ct, st); if (q[2] < 0) { pen = false; continue; } const X = cx + q[0] * r, Y = cy - q[1] * r; pen ? c.lineTo(X, Y) : c.moveTo(X, Y); pen = true; }
        c.stroke();
      }

      // Land dots, bucketed by depth so one fill per alpha level.
      const lvl = [[], [], [], []];
      for (const v of land) { const q = project(v, cl, sl, ct, st); if (q[2] < .02) continue; lvl[Math.min(3, (q[2] * 4) | 0)].push(cx + q[0] * r, cy - q[1] * r); }
      lvl.forEach((arr, d) => {
        const s = 1.15 + d * .22; c.fillStyle = `rgba(205,168,255,${(.16 + d * .16).toFixed(2)})`; c.beginPath();
        for (let i = 0; i < arr.length; i += 2) c.rect(arr[i] - s / 2, arr[i + 1] - s / 2, s, s);
        c.fill();
      });
      const country = (pts, col, s) => {
        c.fillStyle = col; c.beginPath();
        for (const v of pts) { const q = project(v, cl, sl, ct, st); if (q[2] < .02) continue; c.rect(cx + q[0] * r - s / 2, cy - q[1] * r - s / 2, s, s); }
        c.fill();
      };
      country(tr, 'rgba(255,255,255,.95)', 1.5);
      const glow = Math.max(0, ...ripples.map(p => 1 - (now - p) / 900));
      country(kz, `rgba(${Math.round(214 + 41 * kzLit)},${Math.round(178 + 77 * kzLit)},255,${(.45 + .5 * kzLit).toFixed(2)})`, 1.4 + .3 * kzLit);

      // Glass sphere: specular bloom and rim light.
      const spec = c.createRadialGradient(cx - r * .42, cy - r * .5, 0, cx - r * .42, cy - r * .5, r * .75);
      spec.addColorStop(0, 'rgba(255,255,255,.13)'); spec.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = spec; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
      const rim = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      rim.addColorStop(0, 'rgba(236,214,255,.55)'); rim.addColorStop(.5, 'rgba(174,51,255,.12)'); rim.addColorStop(1, 'rgba(174,51,255,.35)');
      c.strokeStyle = rim; c.lineWidth = 1.4; c.beginPath(); c.arc(cx, cy, r - .7, 0, TAU); c.stroke();

      // Route.
      const P = arc.map(v => { const q = project(v, cl, sl, ct, st); return [cx + q[0] * r, cy - q[1] * r, q[2]]; });
      const arcStart = introAt + (reduced.matches ? -9999 : 1250);
      const prog = introAt ? Math.min(1, Math.max(0, (now - arcStart) / 1500)) : 0;
      if (prog >= 1 && !arcDoneAt) arcDoneAt = now;
      kzLit = arcDoneAt ? Math.min(1, (now - arcDoneAt) / 700) : 0;
      const n = Math.round(easeOut(prog) * (P.length - 1));
      if (n > 0) {
        c.lineCap = 'round';
        const g = c.createLinearGradient(P[0][0], P[0][1], P[P.length - 1][0], P[P.length - 1][1]);
        g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(199,125,255,.95)');
        const path = () => { c.beginPath(); let pen = false; for (let i = 0; i <= n; i++) { if (P[i][2] < -.04) { pen = false; continue; } pen ? c.lineTo(P[i][0], P[i][1]) : c.moveTo(P[i][0], P[i][1]); pen = true; } };
        c.strokeStyle = 'rgba(174,51,255,.35)'; c.lineWidth = 7; path(); c.stroke();
        c.strokeStyle = g; c.lineWidth = 2.2; path(); c.stroke();
        if (prog < 1 && P[n][2] > -.04) comet(P[n][0], P[n][1], 22);
      }
      // Origin pulse, and arrival ripples at Kazakhstan.
      const pulse = (clock * .0011) % 1;
      const fromVis = P[0][2] > .02, toVis = P[P.length - 1][2] > .02;
      if (introAt && fromVis) ring(P[0], 5 + pulse * 18, (1 - pulse) * .8);
      if (fromVis) dot(P[0], 4.2);
      if (arcDoneAt && toVis) {
        dot(P[P.length - 1], 4.2 + glow * 2);
        for (let i = ripples.length - 1; i >= 0; i--) { const p = (now - ripples[i]) / 1100; if (p >= 1) { ripples.splice(i, 1); continue; } ring(P[P.length - 1], 6 + p * 34, (1 - p) * .9); }
      }

      // Parcels travel the route on a loop once it is drawn.
      let lead = null;
      if (arcDoneAt && !paused && !reduced.matches) {
        const period = 3200;
        for (let k = 0; k < 3; k++) {
          const s = (((now - arcDoneAt) / period) + k / 3) % 1;
          const hp = pointAt(P, s);
          if (hp[2] < -.04) { if (k === 0) { lead = null; lastS = s; } continue; }
          trail(P, s, .16);
          comet(hp[0], hp[1], 13);
          if (k === 0) { lead = { p: hp, s }; if (s < lastS) ripples.push(now); lastS = s; }
        }
      }
      if (parcel) {
        if (lead) {
          const lift = Math.sin(Math.PI * lead.s), fade = Math.min(1, Math.sin(Math.PI * lead.s) * 3);
          parcel.style.transform = `translate(${lead.p[0].toFixed(1)}px,${lead.p[1].toFixed(1)}px) translate(-50%,-120%) scale(${(.75 + .45 * lift).toFixed(3)}) rotate(${(-10 + 20 * lead.s).toFixed(1)}deg)`;
          parcel.style.opacity = fade.toFixed(3);
        } else parcel.style.opacity = '0';
      }

      const place = (el, p) => { el.style.left = (p[0] / w * 100).toFixed(2) + '%'; el.style.top = (p[1] / h * 100).toFixed(2) + '%'; };
      place(from, P[0]); place(to, P[P.length - 1]);
      from.classList.toggle('is-on', prog > 0);
      to.classList.toggle('is-on', arcDoneAt > 0);
      from.classList.toggle('is-back', !fromVis);
      to.classList.toggle('is-back', !toVis);
    }
    function pointAt(P, s) { const idx = s * (P.length - 1), i0 = Math.floor(idx), f = idx - i0, i1 = Math.min(P.length - 1, i0 + 1); return [P[i0][0] + (P[i1][0] - P[i0][0]) * f, P[i0][1] + (P[i1][1] - P[i0][1]) * f, P[i0][2] + (P[i1][2] - P[i0][2]) * f]; }
    function trail(P, s, len) {
      const a = Math.max(0, s - len), steps = 14;
      for (let i = 0; i < steps; i++) {
        const t0 = a + (s - a) * i / steps, t1 = a + (s - a) * (i + 1) / steps, p0 = pointAt(P, t0), p1 = pointAt(P, t1);
        ctx.strokeStyle = `rgba(255,255,255,${((i + 1) / steps * .85).toFixed(3)})`; ctx.lineWidth = 1 + (i + 1) / steps * 2.2;
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      }
    }
    function comet(x, y, size) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, size);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(225,190,255,.75)'); g.addColorStop(1, 'rgba(174,51,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
    }
    function ring(p, radius, alpha) { ctx.strokeStyle = `rgba(231,200,255,${alpha.toFixed(3)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p[0], p[1], radius, 0, TAU); ctx.stroke(); }
    function dot(p, radius) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], radius, 0, TAU); ctx.fill(); }

    function physics() {
      if (dragging) return;
      if (Math.abs(vLon) + Math.abs(vLat) > .002) { dragLon += vLon * 16; dragLat = clamp(dragLat + vLat * 16, -30, 30); vLon *= .93; vLat *= .93; }
      else if (performance.now() - releasedAt > 900) { dragLon += (0 - dragLon) * .045; dragLat += (0 - dragLat) * .045; }
      curX += (aimX - curX) * .05; curY += (aimY - curY) * .05;
    }
    const busy = () => dragging || Math.abs(dragLon) + Math.abs(dragLat) > .05 || (introAt && performance.now() - introAt < 4200);
    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) { last = 0; return; }
      const gap = finePointer.matches ? 15 : 30;
      if (now - last >= gap) { clock += last ? Math.min(now - last, 60) : gap; last = now; physics(); draw(now); }
      if (!paused || busy()) raf = requestAnimationFrame(frame);
    }
    const api = { start() { if (!raf && visible) raf = requestAnimationFrame(frame); } };
    new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !introAt) introAt = performance.now();
      if (visible) api.start();
    }, { threshold: .3 }).observe(canvas);
    document.addEventListener('visibilitychange', () => { last = 0; api.start(); });

    // Direct manipulation: horizontal drag spins the globe, vertical scroll stays with the page.
    let px = 0, py = 0, pt = 0;
    wrap.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      dragging = true; px = e.clientX; py = e.clientY; pt = performance.now(); vLon = vLat = 0;
      wrap.setPointerCapture(e.pointerId); wrap.classList.add('is-dragging'); api.start();
    });
    wrap.addEventListener('pointermove', e => {
      if (!dragging) {
        if (!finePointer.matches) return;
        const r = wrap.getBoundingClientRect();
        aimX = (e.clientX - r.left) / r.width - .5; aimY = (e.clientY - r.top) / r.height - .5;
        return;
      }
      const now = performance.now(), dt = Math.max(8, now - pt), k = 140 / Math.max(200, rad * 2);
      const dl = (e.clientX - px) * k * -1, dv = (e.clientY - py) * k;
      dragLon += dl; dragLat = clamp(dragLat + dv, -30, 30);
      vLon = dl / dt; vLat = dv / dt; px = e.clientX; py = e.clientY; pt = now;
      if (paused) draw(now);
    });
    const release = () => { if (!dragging) return; dragging = false; releasedAt = performance.now(); wrap.classList.remove('is-dragging'); api.start(); };
    wrap.addEventListener('pointerup', release);
    wrap.addEventListener('pointercancel', release);
    wrap.addEventListener('pointerleave', () => { aimX = 0; aimY = 0; });
    return api;
  })();

  /* ---------- Price counts up once, so "tenge" registers as a real number ---------- */
  const countIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    countIO.unobserve(en.target);
    const el = en.target, end = Number(el.dataset.count), fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
    if (reduced.matches || paused) { el.textContent = fmt(end); return; }
    const t0 = performance.now(), dur = 1100;
    const step = now => { const p = Math.min(1, (now - t0) / dur); el.textContent = fmt(end * (1 - Math.pow(2, -10 * p))); if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(end); };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Boot ---------- */
  translate(lang, false);
  setPaused(paused, false);
  observeReveals();
  selectTab(0);
  const year = $('#year'); if (year) year.textContent = new Date().getFullYear();
  document.fonts && document.fonts.ready.then(placeThumb);
})();
