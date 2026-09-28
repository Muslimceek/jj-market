(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 800px)');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const codes = { ru: 'RU', tr: 'TR', kk: 'KZ', uz: 'UZ', ky: 'KG' };
  let language = 'ru', phase = 0, manualUntil = 0, screen = 'home', paused = reduced.matches;
  let pointerX = 0, pointerY = 0, framePending = false;
  const t = key => window.JJ_I18N[language]?.[key] || window.JJ_I18N.ru[key] || key;
  const safeGet = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const detected = (navigator.languages || [navigator.language]).map(l => l.split('-')[0]).find(l => codes[l]);
  language = codes[safeGet('jjmarket_lang')] ? safeGet('jjmarket_lang') : detected || 'ru';
  if (!reduced.matches && safeGet('jjmarket_motion') === 'paused') paused = true;

  // Real links remain centralized; absent contacts provide an honest alternative.
  const config = window.JJ_CONFIG;
  const missing = value => !value || /^\[/.test(value);
  const links = {
    whatsapp: missing(config.WHATSAPP_LINK) ? null : (/^https:\/\//.test(config.WHATSAPP_LINK) ? config.WHATSAPP_LINK : 'https://wa.me/' + config.WHATSAPP_LINK.replace(/\D/g, '')),
    phone: missing(config.PHONE_NUMBER) ? null : 'tel:' + config.PHONE_NUMBER.replace(/[^\d+]/g, ''),
    email: missing(config.EMAIL) ? null : 'mailto:' + config.EMAIL,
    instagram: config.INSTAGRAM_URL,
    appstore: config.APPSTORE_URL
  };
  const campaign = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => /^utm_(source|medium|campaign|content|term)$/.test(k)));
  $$('[data-link]').forEach(link => {
    const type = link.dataset.link;
    const href = links[type];
    if (href) {
      link.href = href;
      if (/^https:/.test(href)) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    } else link.dataset.unavailable = 'true';
    link.addEventListener('click', event => {
      const detail = { action: type, available: !!href, language, campaign };
      window.dispatchEvent(new CustomEvent('jj:cta', { detail }));
      if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: 'jj_cta_click', ...detail });
      if (!href) { event.preventDefault(); $('#contactDialog').showModal(); }
    });
  });
  $('.dialog-close').addEventListener('click', () => $('#contactDialog').close());
  $('#contactDialog').addEventListener('click', event => { if (event.target === event.currentTarget) {
    const r = event.currentTarget.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.currentTarget.close();
  }});

  // Accordion uses intrinsic height so every language remains readable.
  $('#faqList').innerHTML = [1,2,3,4,5,6,7].map(n => `<article class="faq-item reveal"><h3><button class="faq-question" aria-expanded="false" aria-controls="answer-${n}" id="question-${n}"><span data-i18n="faq.q${n}"></span><span class="plus" aria-hidden="true"></span></button></h3><div class="faq-answer" id="answer-${n}" role="region" aria-labelledby="question-${n}" aria-hidden="true" inert><div><p data-i18n="faq.a${n}"></p></div></div></article>`).join('');
  $$('.faq-question').forEach(button => button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    $$('.faq-question').forEach(item => {
      const isOpen = item === button && open;
      item.setAttribute('aria-expanded', String(isOpen));
      const panel = $('#' + item.getAttribute('aria-controls'));
      panel.setAttribute('aria-hidden', String(!isOpen)); panel.inert = !isOpen;
    });
  }));

  function updatePhaseCopy() {
    $('.stage-caption').textContent = t('motion.phase' + phase);
    $('.step-detail').textContent = t('how.step' + (phase + 1) + 'Text');
  }
  const detail = document.createElement('p'); detail.className = 'step-detail'; detail.setAttribute('aria-live', 'polite');
  $('.step-buttons').after(detail);

  function translate(lang, save = false) {
    language = codes[lang] ? lang : 'ru';
    root.lang = language;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.title = t('meta.title');
    $('meta[name="description"]').content = t('meta.description');
    $('.lang-code').textContent = codes[language];
    $('#footerLang').value = language;
    $$('[data-lang]').forEach(button => button.setAttribute('aria-current', String(button.dataset.lang === language)));
    $('#langTrigger').setAttribute('aria-label', `${t('ui.language')}: ${codes[language]}`);
    $('#motionToggle').setAttribute('aria-label', t(paused ? 'ui.play' : 'ui.pause'));
    $('.dialog-close').setAttribute('aria-label', t('ui.close'));
    $('.app-switch').setAttribute('aria-label', t('ui.screens'));
    $('.step-buttons').setAttribute('aria-label', t('ui.process'));
    $('#appScreenshot').alt = t(screen === 'home' ? 'motion.home' : 'motion.categories') + ' — JJ Market';
    updatePhaseCopy();
    if (save) {
      safeSet('jjmarket_lang', language);
      if (!paused) $$('.hero-title,.section h2').forEach(el => el.animate([{ opacity: .3, transform: 'translateY(5px)' },{ opacity: 1, transform: 'translateY(0)' }], { duration: 280, easing: 'ease-out' }));
    }
    queueScroll();
  }
  const langTrigger = $('#langTrigger'), langMenu = $('#language-menu');
  function closeLanguage(focus = false) { langMenu.hidden = true; langTrigger.setAttribute('aria-expanded','false'); if(focus) langTrigger.focus(); }
  langTrigger.addEventListener('click', () => {
    const open = langMenu.hidden; langMenu.hidden = !open; langTrigger.setAttribute('aria-expanded',String(open));
    if(open) $(`[data-lang="${language}"]`).focus();
  });
  $$('[data-lang]').forEach(button => button.addEventListener('click', () => { translate(button.dataset.lang, true); closeLanguage(true); }));
  $('#footerLang').addEventListener('change', e => translate(e.target.value, true));
  document.addEventListener('click', e => { if(!e.target.closest('.language')) closeLanguage(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !langMenu.hidden) closeLanguage(true); });
  langMenu.addEventListener('keydown', e => {
    if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key)) return;
    e.preventDefault(); const items = $$('button', langMenu); const i = items.indexOf(document.activeElement);
    items[e.key === 'Home' ? 0 : e.key === 'End' ? items.length-1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
  });

  // Native scroll-driven choreography. No scroll hijacking or library dependency.
  function setPhase(next) {
    phase = clamp(next,0,3);
    const stage = $('#step-panel'); stage.dataset.phase = phase; stage.setAttribute('aria-labelledby', 'step-' + phase);
    $('.stage-counter').textContent = `0${phase + 1} / 04`;
    $('.stage-meter i').style.width = `${(phase + 1) * 25}%`;
    $$('.step').forEach((button, i) => {
      const active = i === phase; button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
    });
    updatePhaseCopy();
  }
  $$('.step').forEach(button => button.addEventListener('click', () => { manualUntil = performance.now() + 5000; setPhase(Number(button.dataset.step)); }));
  $('.step-buttons').addEventListener('keydown', e => {
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (phase + (e.key === 'ArrowRight' ? 1 : -1) + 4) % 4;
    manualUntil = performance.now() + 5000; setPhase(next); $('#step-' + next).focus();
  });
  $$('[data-screen]').forEach(button => button.addEventListener('click', () => {
    if(screen === button.dataset.screen) return;
    screen = button.dataset.screen;
    $$('[data-screen]').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    const shot = $('#appScreenshot'); shot.src = `assets/app-${screen}.webp`;
    shot.alt = t('motion.' + (screen === 'home' ? 'home' : 'categories')) + ' — JJ Market';
    if(!paused) shot.animate([{opacity:.1,transform:'translateX(22px) scale(1.025)'},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:450,easing:'cubic-bezier(.16,1,.3,1)'});
  }));
  // Preload only the second small real screenshot, after the page is ready.
  const alternate = new Image(); alternate.src = 'assets/app-categories.webp';
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if(entry.isIntersecting){entry.target.classList.add('visible'); observer.unobserve(entry.target);}
  }),{threshold:.1,rootMargin:'0px 0px -25px 0px'});
  $$('.reveal').forEach(el => observer.observe(el));
  $$('.ecosystem-card,.benefit,.contact-link').forEach((el,i) => el.style.setProperty('--delay', `${(i%3)*70}ms`));
  document.body.classList.add('motion-ready');
  const sceneVisibility = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('offstage', !entry.isIntersecting)), { rootMargin: '120px' });
  $$('section,.marquee').forEach(scene => sceneVisibility.observe(scene));
  $$('.tilt-card').forEach(card => {
    card.addEventListener('pointermove',e => {
      if(paused || e.pointerType !== 'mouse') return;
      const r=card.getBoundingClientRect();
      card.style.setProperty('--tilt-x', `${-(e.clientY-r.top-r.height/2)/45}deg`);
      card.style.setProperty('--tilt-y', `${(e.clientX-r.left-r.width/2)/45}deg`);
    });
    card.addEventListener('pointerleave',()=>{card.style.setProperty('--tilt-x','0deg');card.style.setProperty('--tilt-y','0deg');});
  });
  $('.hero-art').addEventListener('pointermove',e => {
    if(e.pointerType !== 'mouse' || paused) return;
    const r = e.currentTarget.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width-.5;pointerY=(e.clientY-r.top)/r.height-.5;
  });
  $('.hero-art').addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;});

  function updateScroll() {
    framePending = false;
    const y=window.scrollY, vh=window.innerHeight;
    $('#header').classList.toggle('scrolled',y>24);
    $('.read-progress i').style.transform=`scaleX(${clamp(y/(document.documentElement.scrollHeight-vh || 1))})`;
    const hero = $('.hero').getBoundingClientRect();
    const final = $('.final-section').getBoundingClientRect();
    $('#mobileDock').classList.toggle('visible',hero.bottom<vh*.45 && final.top>vh*.8);
    const how=$('#how').getBoundingClientRect();
    if(!paused && !mobile.matches && performance.now()>manualUntil && how.top < vh*.2 && how.bottom > vh*.65){
      const p=clamp((-how.top+vh*.13)/(how.height-vh*.65)); const next=Math.min(3,Math.floor(p*4));
      if(next!==phase) setPhase(next);
    }
    const route=$('.route-section').getBoundingClientRect();
    const routeProgress=clamp((vh-route.top)/(vh*.9));
    $('.route-draw').style.strokeDashoffset=paused ? '0' : String(1-routeProgress);
    const app=$('.phone-scene').getBoundingClientRect();
    if(!paused && app.bottom>0 && app.top<vh){
      const p=clamp((vh-app.top)/(vh+app.height));
      $('.phone-parallax').style.transform=`translateY(${(p-.5)*-50}px) rotate(${(-10+p*16).toFixed(2)}deg) rotateY(${(-18+p*30).toFixed(2)}deg) rotateX(6deg)`;
    }
    if(!paused && hero.bottom>0){
      $('.hero-art').style.setProperty('translate',`0 ${Math.min(y*.13,90)}px`);
      $('.hero-copy').style.opacity=String(clamp(1-y/(hero.height*1.5),.35,1));
    }
    $$('.mission-lines p').forEach((line,i)=>{
      const r=line.getBoundingClientRect(); line.classList.toggle('lit',paused || r.top<vh*.7-i*12);
    });
  }
  function queueScroll(){if(!framePending){framePending=true;requestAnimationFrame(updateScroll);}}
  window.addEventListener('scroll',queueScroll,{passive:true});window.addEventListener('resize',queueScroll,{passive:true});
  mobile.addEventListener('change',queueScroll);

  // Globe is procedural vector graphics, drawn locally and only while visible.
  // Polygons describe the world silhouette; dots are spatial, not market-presence claims.
  const canvas=$('#globeCanvas'), ctx=canvas.getContext('2d');
  const continents=[
    [[-168,66],[-151,71],[-125,71],[-103,79],[-69,77],[-55,55],[-65,44],[-80,26],[-88,18],[-103,22],[-117,33],[-124,48],[-151,59]],
    [[-82,12],[-69,10],[-51,5],[-35,-7],[-42,-23],[-53,-34],[-70,-56],[-76,-35],[-81,-6]],
    [[-17,35],[10,37],[34,31],[43,13],[51,11],[42,-13],[33,-29],[19,-35],[10,-18],[-3,3],[-15,10]],
    [[-10,36],[-10,44],[4,51],[8,58],[20,71],[34,70],[42,55],[32,40],[15,36]],
    [[30,40],[38,55],[32,70],[68,78],[110,75],[141,68],[177,65],[177,52],[146,45],[137,34],[122,21],[109,2],[99,10],[79,7],[69,25],[48,30]],
    [[112,-11],[132,-10],[152,-22],[151,-38],[135,-38],[114,-26]],
    [[-52,59],[-42,60],[-20,78],[-35,84],[-60,79]],
    [[46,-12],[51,-16],[47,-26],[43,-22]],
    [[129,31],[143,43],[145,40],[133,30]],
    [[95,5],[108,-7],[125,-10],[129,-5],[114,0]]
  ];
  function inside(x,y,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))hit=!hit;}return hit;}
  const points=[];
  for(let lat=-76;lat<80;lat+=2.7){const step=2.7/Math.cos(lat*Math.PI/180);for(let lon=-180;lon<180;lon+=step){
    const land=continents.some(poly=>inside(lon,lat,poly));
    const a=lat*Math.PI/180,b=lon*Math.PI/180;
    points.push({x:Math.cos(a)*Math.sin(b),y:-Math.sin(a),z:Math.cos(a)*Math.cos(b),land});
  }}
  let cw=0,ch=0,radius=0,dpr=1,globeVisible=true,raf=0,last=0,clock=0,aimX=0,aimY=0;
  function resizeGlobe(){const rect=canvas.getBoundingClientRect();cw=rect.width;ch=rect.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);radius=Math.min(cw,ch)*.425;drawGlobe();}
  function drawGlobe(){
    if(!ctx || !cw || !ch)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);
    const cx=cw/2,cy=ch/2;aimX+=(pointerX-aimX)*.035;aimY+=(pointerY-aimY)*.035;
    const rot=-.62-clock*.000035+aimX*.25,tilt=.22+aimY*.12;
    const cos=Math.cos(rot),sin=Math.sin(rot),ct=Math.cos(tilt),st=Math.sin(tilt);
    const shade=ctx.createRadialGradient(cx-radius*.2,cy-radius*.3,0,cx,cy,radius);
    shade.addColorStop(0,'#26113266');shade.addColorStop(.7,'#150b1f55');shade.addColorStop(1,'#140a2011');
    ctx.fillStyle=shade;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fill();
    ctx.lineWidth=.6;ctx.strokeStyle='#9a20ea20';ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
    for(const p of points){
      const x=p.x*cos+p.z*sin,z=-p.x*sin+p.z*cos,y=p.y*ct-z*st,zz=p.y*st+z*ct;
      if(zz<-.04)continue;
      const depth=(zz+1)/2,alpha=p.land ? .2+zz*.65 : .025+zz*.07;
      ctx.fillStyle=p.land ? `rgba(201,143,239,${alpha.toFixed(2)})` : `rgba(154,32,234,${alpha.toFixed(2)})`;
      ctx.beginPath();ctx.arc(cx+x*radius,cy+y*radius,(p.land ? 1.15 : .55)*(0.6+depth*.5),0,Math.PI*2);ctx.fill();
    }
    // Orbit accent follows the sphere, while labels remain legible in HTML.
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.35);ctx.scale(1,.43);ctx.beginPath();ctx.arc(0,0,radius*1.09,0,Math.PI*2);ctx.strokeStyle='#9a20ea28';ctx.lineWidth=1;ctx.stroke();ctx.restore();
  }
  function globeFrame(now){raf=0;if(paused || !globeVisible || document.hidden){last=0;return;}if(now-last>32){clock+=last?Math.min(now-last,80):33;last=now;drawGlobe();}raf=requestAnimationFrame(globeFrame);}
  function startGlobe(){if(!raf && !paused && globeVisible && !document.hidden)raf=requestAnimationFrame(globeFrame);}
  new ResizeObserver(resizeGlobe).observe(canvas);
  new IntersectionObserver(entries=>{globeVisible=entries[0].isIntersecting;startGlobe();},{threshold:0}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{last=0;startGlobe();});
  function setMotion(value,save=false){
    paused=value;root.classList.toggle('motion-paused',paused);$('#motionToggle').setAttribute('aria-pressed',String(paused));$('#motionToggle').setAttribute('aria-label',t(paused?'ui.play':'ui.pause'));
    if(save)safeSet('jjmarket_motion',paused?'paused':'playing');
    if(paused){cancelAnimationFrame(raf);raf=0;$('.hero-copy').style.opacity='1';$('.hero-art').style.translate='none';}else startGlobe();
    queueScroll();
  }
  $('#motionToggle').addEventListener('click',()=>setMotion(!paused,true));
  reduced.addEventListener('change',e=>setMotion(e.matches));
  translate(language);setPhase(0);setMotion(paused);resizeGlobe();startGlobe();queueScroll();
  document.fonts.ready.then(queueScroll);
})();
