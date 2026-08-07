/* ============================================================
   PM 秋招作品集 — 交互脚本（零构建纯静态）
   ============================================================ */

(function () {
  'use strict';

  // 渐进增强标记：仅在 JS 可用时启用 reveal 初始隐藏
  document.documentElement.classList.add('js');

  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('navToggle');
  var mobileMenu = document.getElementById('mobileMenu');
  var mobileOverlay = document.getElementById('mobileOverlay');
  var yearEl = document.getElementById('year');
  var progressBar = document.getElementById('scrollProgress');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- 0. 阅读进度条 ---------- */
  function updateProgress() {
    if (!progressBar) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.firstElementChild.style.transform = 'scaleX(' + p + ')';
  }

  /* ---------- 1. 平滑滚动 ---------- */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-scroll]');
    if (!link) return;
    e.preventDefault();
    var href = link.getAttribute('href');
    if (!href || href === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      var el = document.querySelector(href);
      if (el) {
        var offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 68;
        var top = el.getBoundingClientRect().top + window.scrollY - offset - 16;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    }
    closeMobileMenu();
  });

  /* ---------- 0.5 埋点：联系方式 / 下载简历 等带 data-track 的点击 ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-track]');
    if (t && window.track) window.track(t.getAttribute('data-track'));
  });

  /* ---------- 2. 导航栏滚动阴影 ---------- */
  function updateNavShadow() {
    if (!nav) return;
    nav.classList.toggle('nav--scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', updateNavShadow, { passive: true });
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateNavShadow();
  updateProgress();

  /* ---------- 3. 导航高亮 (IntersectionObserver) ---------- */
  var sections = Array.from(document.querySelectorAll('#hero, #projects, #about, #articles'));
  var navLinks = Array.from(document.querySelectorAll('.nav-link')).filter(function (l) {
    return l.getAttribute('href') && document.querySelector(l.getAttribute('href'));
  });

  if ('IntersectionObserver' in window && sections.length) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (entry.target.id === 'hero') {
          navLinks.forEach(function (l) { l.classList.remove('active'); });
        } else {
          var id = '#' + entry.target.id;
          navLinks.forEach(function (l) { l.classList.toggle('active', l.getAttribute('href') === id); });
        }
      });
    }, { root: null, rootMargin: '-80px 0px 0px 0px', threshold: 0.3 });
    sections.forEach(function (s) { navObserver.observe(s); });
  }

  /* ---------- 4. 滚动入场 reveal ---------- */
  var revealEls = Array.from(document.querySelectorAll('[data-reveal]'));
  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          obs.unobserve(entry.target);
        }
      });
    }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el, i) {
      // 同组元素轻微错落
      el.style.transitionDelay = (Math.min(i % 6, 5) * 60) + 'ms';
      revealObserver.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 5. 移动端汉堡菜单 ---------- */
  function openMobileMenu() {
    if (!mobileMenu || !navToggle) return;
    mobileMenu.hidden = false;
    requestAnimationFrame(function () { mobileMenu.classList.add('open'); });
    if (mobileOverlay) { mobileOverlay.hidden = false; }
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', '关闭菜单');
    navToggle.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    document.body.style.overflow = 'hidden';
  }
  function closeMobileMenu() {
    if (!mobileMenu || !navToggle || mobileMenu.hidden) return;
    mobileMenu.classList.remove('open');
    if (mobileOverlay) mobileOverlay.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', '打开菜单');
    navToggle.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    document.body.style.overflow = '';
    setTimeout(function () {
      if (!mobileMenu.classList.contains('open')) mobileMenu.hidden = true;
    }, 360);
  }
  function toggleMobileMenu() {
    if (navToggle && navToggle.getAttribute('aria-expanded') === 'true') closeMobileMenu();
    else openMobileMenu();
  }
  if (navToggle) navToggle.addEventListener('click', toggleMobileMenu);
  if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileMenu);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileMenu && !mobileMenu.hidden) { closeMobileMenu(); navToggle.focus(); }
  });

  /* ---------- 6. 项目手风琴（单开模式） ---------- */
  var cards = Array.from(document.querySelectorAll('.project-card'));

  cards.forEach(function (card) {
    var toggle = card.querySelector('.card-toggle');
    var body = card.querySelector('.card-body');
    if (!toggle || !body) return;

    toggle.addEventListener('click', function () {
      // 独立开合：不强制收起其他卡片，避免上方卡片塌陷导致整页窜动（"跳走"）
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      var willOpen = !expanded;
      setCardState(card, toggle, body, willOpen);
      // 埋点：项目 / 文章 展开
      if (willOpen && window.track) {
        var kind = card.getAttribute('data-kind');
        var nm = (card.querySelector('.card-name') || {}).textContent || '';
        window.track(kind === 'article' ? 'article_open' : 'project_open', nm);
      }
    });
    toggle.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); }
    });
  });

  function setCardState(card, toggle, body, expanded) {
    toggle.setAttribute('aria-expanded', String(expanded));
    card.classList.toggle('is-open', expanded);

    var chevron = toggle.querySelector('.card-chevron');
    if (chevron) chevron.textContent = expanded ? '收起' : '展开';

    if (expanded) {
      body.removeAttribute('hidden');
      void body.offsetHeight;
      body.style.gridTemplateRows = '1fr';
    } else {
      body.style.gridTemplateRows = '0fr';
      setTimeout(function () {
        if (body.style.gridTemplateRows === '0fr') body.setAttribute('hidden', '');
      }, 360);
    }
  }

})();
