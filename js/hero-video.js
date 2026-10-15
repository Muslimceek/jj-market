(() => {
  'use strict';

  const hero = document.querySelector('.hero');
  const film = hero && hero.querySelector('.hero-film');
  const video = document.getElementById('heroVideo');
  if (!hero || !film || !video) return;

  const root = document.documentElement;
  const mobile = matchMedia('(max-width: 900px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const globalToggle = document.getElementById('motionToggle');
  const heroToggle = document.getElementById('heroMotionToggle');
  let loadedSource = '';
  let failedSource = '';
  let playRevision = 0;
  let playPending = false;
  let playBlocked = false;

  const bounds = film.getBoundingClientRect();
  const heroBounds = hero.getBoundingClientRect();
  let visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
  let nearby = heroBounds.bottom > -300 && heroBounds.top < window.innerHeight + 300;
  const source = () => mobile.matches ? video.dataset.mobileSrc : video.dataset.desktopSrc;
  const motionAllowed = () => !reduced.matches && !root.classList.contains('motion-paused');
  const shouldPlay = () => motionAllowed() && visible && !document.hidden && loadedSource === source();

  // Playback is requested explicitly, so loading a source cannot bypass visibility checks.
  video.autoplay = false;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'none';

  function pause() {
    playRevision++;
    playPending = false;
    video.pause();
  }

  function showFrame() {
    if (shouldPlay() && video.readyState >= 2 && !video.paused) {
      film.classList.add('is-playing');
    }
  }

  function reconcile() {
    const nextSource = source();
    const nextPoster = mobile.matches ? video.dataset.mobilePoster : video.dataset.desktopPoster;
    if (nextPoster && video.getAttribute('poster') !== nextPoster) video.poster = nextPoster;

    if (loadedSource && loadedSource !== nextSource) {
      pause();
      film.classList.remove('is-playing');
      video.removeAttribute('src');
      video.load();
      loadedSource = '';
      failedSource = '';
      playBlocked = false;
    }

    if (reduced.matches) film.classList.remove('is-playing');
    if (!motionAllowed() || !nearby || document.hidden) {
      pause();
      playBlocked = false;
      return;
    }

    if (!loadedSource && nextSource) {
      loadedSource = nextSource;
      video.src = nextSource;
      video.preload = 'auto';
      video.load();
    }

    if (!shouldPlay()) {
      pause();
      playBlocked = false;
      return;
    }
    if (failedSource === loadedSource || playBlocked || playPending || !video.paused) return;

    const revision = ++playRevision;
    playPending = true;
    let request;
    try {
      request = video.play();
    } catch {
      playPending = false;
      playBlocked = true;
      return;
    }
    Promise.resolve(request).then(() => {
      if (revision !== playRevision) return;
      playPending = false;
      if (shouldPlay()) showFrame();
      else pause();
    }).catch(() => {
      if (revision !== playRevision) return;
      playPending = false;
      playBlocked = true;
    });
  }

  video.addEventListener('playing', () => {
    if (shouldPlay()) showFrame();
    else pause();
  });
  video.addEventListener('error', () => {
    if (!video.error || !loadedSource) return;
    failedSource = loadedSource;
    pause();
    film.classList.remove('is-playing');
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      nearby = entry.isIntersecting;
      reconcile();
    }, { rootMargin: '300px 0px' }).observe(hero);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      reconcile();
    }).observe(film);
  } else {
    window.addEventListener('scroll', () => {
      const rect = film.getBoundingClientRect();
      const heroRect = hero.getBoundingClientRect();
      visible = rect.bottom > 0 && rect.top < window.innerHeight;
      nearby = heroRect.bottom > -300 && heroRect.top < window.innerHeight + 300;
      reconcile();
    }, { passive: true });
  }

  new MutationObserver(reconcile).observe(root, { attributes: true, attributeFilter: ['class'] });
  mobile.addEventListener('change', reconcile);
  reduced.addEventListener('change', reconcile);
  document.addEventListener('visibilitychange', reconcile);
  window.addEventListener('pagehide', pause);
  window.addEventListener('pageshow', reconcile);

  if (globalToggle && heroToggle) {
    const mirrorToggle = () => {
      ['aria-label', 'aria-pressed'].forEach(name => {
        const value = globalToggle.getAttribute(name);
        if (value !== null) heroToggle.setAttribute(name, value);
      });
    };
    heroToggle.addEventListener('click', () => globalToggle.click());
    new MutationObserver(mirrorToggle).observe(globalToggle, {
      attributes: true,
      attributeFilter: ['aria-label', 'aria-pressed']
    });
    mirrorToggle();
  }

  reconcile();
})();
