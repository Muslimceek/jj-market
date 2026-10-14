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

  /* ---------- Hero depth: layers follow the pointer, lerped ---------- */
  const stage = $('.hero-stage');
  let tx = 0, ty = 0, cx = 0, cy = 0, heroRaf = 0;
  function heroFrame() {
    cx += (tx - cx) * .08; cy += (ty - cy) * .08;
    stage.style.setProperty('--px', cx.toFixed(4));
    stage.style.setProperty('--py', cy.toFixed(4));
    heroRaf = Math.abs(tx - cx) + Math.abs(ty - cy) > .0005 ? requestAnimationFrame(heroFrame) : 0;
  }
  $('.hero').addEventListener('pointermove', e => {
    if (!finePointer.matches || paused) return;
    tx = clamp(e.clientX / innerWidth - .5, -.5, .5);
    ty = clamp(e.clientY / innerHeight - .5, -.5, .5);
    if (!heroRaf) heroRaf = requestAnimationFrame(heroFrame);
  });
  $('.hero').addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!heroRaf) heroRaf = requestAnimationFrame(heroFrame); });

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

  /* ---------- Globe: dotted Earth with the Istanbul to Kazakhstan arc ---------- */
  const globe = (() => {
    const canvas = $('#globe'), wrap = $('.globe-wrap');
    if (!canvas) return { start() {} };
    const ctx = canvas.getContext('2d');
    const from = $('#geoFrom'), to = $('#geoTo');
    const R = Math.PI / 180;
    // Coarse continent silhouettes (lon, lat). Dots are spatial texture, not market-presence claims.
    const continents = [
      [[-168,66],[-151,71],[-125,71],[-103,79],[-69,77],[-55,55],[-65,44],[-80,26],[-88,18],[-103,22],[-117,33],[-124,48],[-151,59]],
      [[-82,12],[-69,10],[-51,5],[-35,-7],[-42,-23],[-53,-34],[-70,-56],[-76,-35],[-81,-6]],
      [[-17,35],[10,37],[34,31],[43,13],[51,11],[42,-13],[33,-29],[19,-35],[10,-18],[-3,3],[-15,10]],
      [[-10,36],[-10,44],[-2,47],[4,51],[8,58],[20,71],[34,70],[42,55],[40,45],[36,41],[26,40],[24,37],[15,38],[12,44],[3,42]],
      [[26,40],[36,41],[42,41.5],[47,42],[50,40],[53,37],[60,37],[67,37],[72,40],[80,42],[88,49],[98,52],[110,50],[120,53],[132,47],[141,52],[160,60],[177,65],[180,69],[140,73],[110,77],[80,73],[60,70],[50,68],[40,66],[34,70],[42,55],[40,45]],
      [[34,31],[36,36],[44,37],[48,30],[56,25],[60,23],[66,25],[72,21],[77,8],[80,15],[88,22],[92,22],[98,16],[100,13],[105,9],[109,12],[108,21],[117,24],[122,31],[121,40],[128,38],[126,34],[130,42],[135,44],[141,45],[138,53],[132,47],[120,53],[110,50],[98,52],[88,49],[80,42],[72,40],[67,37],[60,37],[53,37],[50,40],[47,42],[42,41.5],[44,37],[36,36]],
      [[34,31],[43,13],[51,11],[57,18],[60,23],[56,25],[52,24],[48,30],[44,37],[36,36]],
      [[112,-11],[132,-10],[142,-11],[152,-22],[151,-38],[135,-38],[114,-26]],
      [[-52,59],[-42,60],[-20,78],[-35,84],[-60,79]],
      [[46,-12],[51,-16],[47,-26],[43,-22]],
      [[129,31],[143,43],[145,40],[133,30]],
      [[95,5],[108,-7],[125,-10],[129,-5],[114,0]],
      [[-6,50],[2,51],[-3,59],[-8,57]]
    ];
    const TR = [[26,42],[28.5,41.3],[33,42],[36,41.6],[41,41.4],[44.6,40],[44.6,37.4],[42,37.1],[38,36.8],[36,35.9],[35.4,36.6],[32,36.2],[29,36.4],[27.2,37],[26.2,39],[26.1,40.5]];
    const KZ = [[46.6,48.5],[49.5,51.3],[54,51.2],[58,51],[61,50.8],[61.2,53.8],[65,54.6],[69,55.4],[73.4,54],[76.7,54.2],[80,51.2],[83,51],[87.3,49.2],[85.6,47],[83,47.2],[80.2,45],[80,42.8],[75,42.9],[71,42.6],[69,41.2],[66,41.8],[62,43.6],[58.5,45.6],[56,45],[55.9,41.3],[53,42.2],[52.8,44.5],[50.3,44.6],[49.2,46.4],[47,46.8]];
    const inside = (x, y, poly) => { let hit = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) hit = !hit; } return hit; };
    const vec = (lat, lon) => [Math.cos(lat * R) * Math.sin(lon * R), Math.sin(lat * R), Math.cos(lat * R) * Math.cos(lon * R)];
    const pts = [];
    for (let lat = -78; lat <= 80; lat += 1.9) {
      const step = 1.9 / Math.max(.2, Math.cos(lat * R));
      for (let lon = -180; lon < 180; lon += step) {
        const hi = inside(lon, lat, TR) ? 2 : inside(lon, lat, KZ) ? 3 : 0;
        const land = hi || continents.some(p => inside(lon, lat, p)) ? 1 : 0;
        pts.push({ v: vec(lat, lon), t: hi || land });
      }
    }
    const A = vec(41.01, 28.98), B = vec(51.17, 71.45);
    const omega = Math.acos(A[0] * B[0] + A[1] * B[1] + A[2] * B[2]);
    const slerp = s => { const a = Math.sin((1 - s) * omega) / Math.sin(omega), b = Math.sin(s * omega) / Math.sin(omega), lift = 1 + .2 * Math.sin(Math.PI * s); return [(a * A[0] + b * B[0]) * lift, (a * A[1] + b * B[1]) * lift, (a * A[2] + b * B[2]) * lift]; };
    const arc = Array.from({ length: 81 }, (_, i) => slerp(i / 80));

    let w = 0, h = 0, dpr = 1, rad = 0, raf = 0, visible = false, last = 0, clock = 0, started = 0;
    let aimX = 0, aimY = 0, curX = 0, curY = 0;
    const proj = (v, lon0, lat0) => {
      const cl = Math.cos(lon0), sl = Math.sin(lon0), ct = Math.cos(lat0), st = Math.sin(lat0);
      const x = v[0] * cl - v[2] * sl, z = v[0] * sl + v[2] * cl, y = v[1];
      return [x, y * ct - z * st, y * st + z * ct];
    };
    function size() {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      rad = Math.min(w, h) * .4;
      draw(performance.now());
    }
    const buckets = Array.from({ length: 16 }, () => []);
    function draw(now) {
      if (!w) return;
      curX += (aimX - curX) * .05; curY += (aimY - curY) * .05;
      const lon0 = (52 + Math.sin(clock * .00018) * 5 + curX * 14) * R;
      const lat0 = (34 + curY * 8) * R;
      const c = ctx, cxp = w / 2, cyp = h / 2;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
      const atm = c.createRadialGradient(cxp, cyp, rad * .9, cxp, cyp, rad * 1.28);
      atm.addColorStop(0, 'rgba(174,51,255,.35)'); atm.addColorStop(1, 'rgba(174,51,255,0)');
      c.fillStyle = atm; c.beginPath(); c.arc(cxp, cyp, rad * 1.28, 0, Math.PI * 2); c.fill();
      const body = c.createRadialGradient(cxp - rad * .35, cyp - rad * .4, rad * .1, cxp, cyp, rad);
      body.addColorStop(0, '#3a1660'); body.addColorStop(.7, '#1b0b2c'); body.addColorStop(1, '#12081d');
      c.fillStyle = body; c.beginPath(); c.arc(cxp, cyp, rad, 0, Math.PI * 2); c.fill();
      buckets.forEach(b => (b.length = 0));
      for (const p of pts) {
        const q = proj(p.v, lon0, lat0);
        if (q[2] < 0) continue;
        const depth = Math.min(3, (q[2] * 4) | 0);
        buckets[p.t * 4 + depth].push(cxp + q[0] * rad, cyp - q[1] * rad);
      }
      const styles = [
        d => [`rgba(190,140,255,${.04 + d * .03})`, .9],
        d => [`rgba(214,178,255,${.25 + d * .17})`, 1.5],
        d => [`rgba(255,255,255,${.55 + d * .15})`, 2.1],
        d => [`rgba(255,255,255,${.55 + d * .15})`, 2.1]
      ];
      for (let t = 0; t < 4; t++) for (let d = 0; d < 4; d++) {
        const arr = buckets[t * 4 + d]; if (!arr.length) continue;
        const [col, s] = styles[t](d); c.fillStyle = col; c.beginPath();
        for (let i = 0; i < arr.length; i += 2) c.rect(arr[i] - s / 2, arr[i + 1] - s / 2, s, s);
        c.fill();
      }
      // Arc draws in once, then a parcel of light travels it on a loop.
      const prog = started ? Math.min(1, (now - started) / 2200) : 0;
      const ease = 1 - Math.pow(1 - prog, 3);
      const P = arc.map(v => { const q = proj(v, lon0, lat0); return [cxp + q[0] * rad, cyp - q[1] * rad, q[2]]; });
      const n = Math.max(1, Math.round(ease * (P.length - 1)));
      c.lineCap = 'round';
      c.lineWidth = 2.4;
      const g = c.createLinearGradient(P[0][0], P[0][1], P[P.length - 1][0], P[P.length - 1][1]);
      g.addColorStop(0, '#E7C8FF'); g.addColorStop(1, '#AE33FF');
      c.strokeStyle = g; c.shadowColor = 'rgba(174,51,255,.9)'; c.shadowBlur = 12;
      c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let i = 1; i <= n; i++) c.lineTo(P[i][0], P[i][1]); c.stroke();
      c.shadowBlur = 0;
      [P[0], P[P.length - 1]].forEach((e, k) => {
        if (k === 1 && prog < 1) return;
        const pulse = (clock * .0012 + k * .5) % 1;
        c.strokeStyle = `rgba(231,200,255,${(1 - pulse) * .8})`; c.lineWidth = 1.5;
        c.beginPath(); c.arc(e[0], e[1], 5 + pulse * 16, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(e[0], e[1], 4, 0, Math.PI * 2); c.fill();
      });
      if (prog >= 1 && !paused) {
        const s = (clock % 2800) / 2800, idx = s * (P.length - 1), i0 = Math.floor(idx), f = idx - i0, i1 = Math.min(P.length - 1, i0 + 1);
        const x = P[i0][0] + (P[i1][0] - P[i0][0]) * f, y = P[i0][1] + (P[i1][1] - P[i0][1]) * f;
        const glow = c.createRadialGradient(x, y, 0, x, y, 16);
        glow.addColorStop(0, 'rgba(255,255,255,.95)'); glow.addColorStop(.35, 'rgba(214,170,255,.6)'); glow.addColorStop(1, 'rgba(174,51,255,0)');
        c.fillStyle = glow; c.beginPath(); c.arc(x, y, 16, 0, Math.PI * 2); c.fill();
      }
      const place = (el, p) => { el.style.left = (p[0] / w * 100).toFixed(2) + '%'; el.style.top = (p[1] / h * 100).toFixed(2) + '%'; };
      place(from, P[0]); place(to, P[P.length - 1]);
      from.classList.toggle('is-on', started > 0);
      to.classList.toggle('is-on', prog >= 1);
    }
    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) { last = 0; return; }
      if (now - last >= 30) { clock += last ? Math.min(now - last, 60) : 30; last = now; draw(now); }
      if (!paused || (started && now - started < 2400)) raf = requestAnimationFrame(frame);
    }
    const api = { start() { if (!raf && visible) raf = requestAnimationFrame(frame); } };
    new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !started) started = performance.now() + (reduced.matches ? -5000 : 250);
      if (visible) api.start();
    }, { threshold: .25 }).observe(canvas);
    document.addEventListener('visibilitychange', () => { last = 0; api.start(); });
    wrap.addEventListener('pointermove', e => {
      if (!finePointer.matches) return;
      const r = wrap.getBoundingClientRect();
      aimX = (e.clientX - r.left) / r.width - .5; aimY = (e.clientY - r.top) / r.height - .5;
    });
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
