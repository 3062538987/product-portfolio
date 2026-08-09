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

  // 会话起始时间（用于上报真实会话时长）
  var pageLoad = Date.now();

  /* ---------- 0. 阅读进度条 ---------- */
  function updateProgress() {
    if (!progressBar) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.firstElementChild.style.transform = 'scaleX(' + p + ')';
  }

  /* ---------- 0.1 埋点：滚动深度里程碑（25/50/75/100%，session 去重） ---------- */
  var DEPTH_MARKS = [25, 50, 75, 100];
  function updateDepth() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    if (max <= 0) return;
    var p = Math.min(100, Math.round((window.scrollY / max) * 100));
    DEPTH_MARKS.forEach(function (m) {
      if (p < m) return;
      var KEY = 'gc_depth:' + m;
      try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, '1'); } catch (e) { return; }
      if (window.track) window.track('scroll_depth', m);
    });
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
    if (!t || !window.track) return;
    var name = t.getAttribute('data-track');
    window.track(name);
    // 下载简历时额外记录「下载前看过的项目数」——衡量内容说服力（核心转化指标）
    if (name === 'download_resume') {
      var n = 0;
      try { n = (JSON.parse(sessionStorage.getItem('gc_proj_viewed') || '[]')).length; } catch (e2) {}
      try { sessionStorage.setItem('gc_downloaded', '1'); } catch (e2) {}
      window.track('download_after', n);
    }
  });

  /* ---------- 0.6 导出 PRD（按项目生成 PDF） ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-prd]');
    if (!b) return;
    if (window.buildPRD) window.buildPRD(b.getAttribute('data-prd'));
  });

  /* ---------- 2. 导航栏滚动阴影 ---------- */
  function updateNavShadow() {
    if (!nav) return;
    nav.classList.toggle('nav--scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', updateNavShadow, { passive: true });
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('scroll', updateDepth, { passive: true });
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

  /* ---------- 3.5 埋点：区块曝光漏斗（到达 projects/about/contact 等核心区） ---------- */
  function trackSectionView(id) {
    if (!id) return;
    var KEY = 'gc_section:' + id;
    try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, '1'); } catch (e) { return; }
    if (window.track) window.track('section_view', id);
  }
  var viewSections = Array.from(document.querySelectorAll('#projects, #about, #articles, #contact'));
  if ('IntersectionObserver' in window && viewSections.length) {
    var secViewObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          trackSectionView(entry.target.id);
          secViewObserver.unobserve(entry.target);
        }
      });
    }, { root: null, rootMargin: '0px 0px -50% 0px', threshold: 0 });
    viewSections.forEach(function (s) { secViewObserver.observe(s); });
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

  /* ---------- 7. 简历末尾：像素小狗反馈（滑块 0-10 → 四档狗状态 + 实时分数） ---------- */
  function initFeedback() {
    var range = document.getElementById('recoRange');
    var label = document.getElementById('recoLabel');
    var submit = document.getElementById('recoSubmit');
    var thanks = document.getElementById('recoThanks');
    var stage = document.getElementById('dogStage');
    var bubble = document.getElementById('recoBubble');
    if (!range || !label || !stage) return;

    var THUMB = 26, MIN = 0, MAX = 10;

    // 数值气泡跟随滑块拇指
    function thumbX(v) {
      var w = range.clientWidth || 1;
      return (v - MIN) / (MAX - MIN) * (w - THUMB) + THUMB / 2;
    }
    function layout() {
      if (bubble) bubble.style.left = thumbX(parseInt(range.value, 10)) + 'px';
    }

    var buckets = [
      { max: 4, mood: '0', text: '暂时没感觉' },
      { max: 7, mood: '1', text: '有点意思' },
      { max: 9, mood: '2', text: '想多了解' },
      { max: 11, mood: '3', text: '非常想约面' }
    ];
    function update() {
      var v = parseInt(range.value, 10);
      var pct = (v / 10) * 100 + '%';
      range.style.background = 'linear-gradient(90deg, var(--brand) ' + pct + ', #E2E8F0 ' + pct + ')';
      for (var i = 0; i < buckets.length; i++) {
        if (v < buckets[i].max) {
          label.textContent = buckets[i].text;
          stage.dataset.mood = buckets[i].mood;
          break;
        }
      }
      if (bubble) bubble.textContent = v;
      layout();
    }
    range.addEventListener('input', update);
    update();
    window.addEventListener('resize', layout);
    window.addEventListener('load', layout);

    if (submit) {
      var KEY = 'portfolio-feedback-done';
      try {
        if (localStorage.getItem(KEY)) {
          // 老访客：直接定格握手终态，不重播动画
          submit.hidden = true;
          range.disabled = true;
          stage.dataset.mood = 'shake';
          label.textContent = '合作愉快。';
          label.classList.add('is-visible');
          if (thanks) thanks.hidden = false;
          if (bubble) bubble.hidden = true;
        }
      } catch (e) {}
      submit.addEventListener('click', function () {
        var v = parseInt(range.value, 10);
        if (window.track) window.track('resume_recommend', v);
        try { localStorage.setItem(KEY, String(v)); } catch (e) {}
        submit.hidden = true;
        range.disabled = true;
        stage.dataset.mood = 'shake';
        label.textContent = '合作愉快。';
        label.classList.add('is-visible');
        if (bubble) bubble.hidden = true;
        var reduced = false;
        try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
        setTimeout(function () {
          if (thanks) thanks.hidden = false;
        }, reduced ? 100 : 950);
      });
    }
  }

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
      // 埋点：仅项目卡埋点。审计后已移除 article_*（文章区弱）与 project_open（重复计数，改用去重 project_view）
      if (willOpen && window.track) {
        var kind = card.getAttribute('data-kind');
        if (kind === 'article') return; // 文章不单独埋点
        var nm = (card.querySelector('.card-name') || {}).textContent || '';
        if (!nm) return;
        // 项目：去重曝光（对比「哪个项目更受 HR 青睐」，比会重复计数的 project_open 准）
        try {
          var KEY = 'gc_proj_viewed';
          var viewed = JSON.parse(sessionStorage.getItem(KEY) || '[]');
          if (viewed.indexOf(nm) === -1) {
            viewed.push(nm);
            sessionStorage.setItem(KEY, JSON.stringify(viewed));
            window.track('project_view', nm);
          }
        } catch (e) {}
        // 认真阅读信号：展开满 8 秒且仍处于展开状态才记 project_read（强兴趣 / 真读完）
        if (!card.getAttribute('data-read-tracked')) {
          setTimeout(function () {
            if (card.classList.contains('is-open')) {
              card.setAttribute('data-read-tracked', '1');
              window.track('project_read', nm);
            }
          }, 8000);
        }
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
      // 记录展开起始时间（仅项目卡，用于真实停留时长）
      if (card.getAttribute('data-kind') !== 'article') card._openAt = Date.now();
    } else {
      body.style.gridTemplateRows = '0fr';
      setTimeout(function () {
        if (body.style.gridTemplateRows === '0fr') body.setAttribute('hidden', '');
      }, 360);
      // 收起时上报真实停留时长（仅项目卡；<3s 视为误触不记）
      if (card.getAttribute('data-kind') !== 'article' && card._openAt && window.track) {
        var sec = Math.round((Date.now() - card._openAt) / 1000);
        card._openAt = 0;
        var nm = (card.querySelector('.card-name') || {}).textContent || '';
        if (sec >= 3 && nm) window.track('project_dwell:' + nm, Math.round(sec / 5) * 5);
      }
    }
  }

  /* ---------- 10. 离开诊断：早退 / 未到联系区就走（定位流失点） ---------- */
  function trackExit() {
    try {
      if (sessionStorage.getItem('gc_exit_done')) return;
      var reachedContact = !!sessionStorage.getItem('gc_section:contact');
      var viewedAny = false;
      try { viewedAny = (JSON.parse(sessionStorage.getItem('gc_proj_viewed') || '[]').length > 0); } catch (e) {}
      var downloaded = !!sessionStorage.getItem('gc_downloaded');
      var shallow = !sessionStorage.getItem('gc_depth:25');
      if (shallow && !viewedAny && !downloaded) {
        if (window.track) window.track('exit_bounce');       // 首屏没留住
      } else if (!reachedContact) {
        if (window.track) window.track('exit_no_contact');    // 看了内容但没滚到联系方式
      }
      // 离开时补报：仍未关闭的项目卡停留时长（避免直接关标签页漏记）
      cards.forEach(function (card) {
        if (card.classList.contains('is-open') && card._openAt && card.getAttribute('data-kind') !== 'article' && window.track) {
          var s = Math.round((Date.now() - card._openAt) / 1000);
          card._openAt = 0;
          var n = (card.querySelector('.card-name') || {}).textContent || '';
          if (s >= 3 && n) window.track('project_dwell:' + n, Math.round(s / 5) * 5);
        }
      });
      // 会话总时长（按 10s 分桶，降低 Top paths 行数）
      var dur = Math.round((Date.now() - pageLoad) / 1000);
      if (window.track) window.track('session_duration', Math.round(dur / 10) * 10);
      sessionStorage.setItem('gc_exit_done', '1');
    } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') trackExit();
  });
  window.addEventListener('pagehide', trackExit);

  initFeedback();
  initLightbox();

  /* ---------- 8. 交付物图片灯箱（点击缩略图放大） ---------- */
  function initLightbox() {
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('hidden', '');
    lb.innerHTML = '<button type="button" class="lightbox-close" aria-label="关闭">' +
      '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '<img class="lightbox-img" alt=""><p class="lightbox-cap"></p>';
    document.body.appendChild(lb);
    var img = lb.querySelector('.lightbox-img');
    var cap = lb.querySelector('.lightbox-cap');
    function open(src, caption) {
      img.src = src; img.alt = caption || '';
      cap.textContent = caption || '';
      lb.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lb.setAttribute('hidden', ''); img.src = '';
      document.body.style.overflow = '';
    }
    document.addEventListener('click', function (e) {
      var t = e.target.closest('.deliverable-thumb');
      if (t) { e.preventDefault(); open(t.getAttribute('data-lightbox'), t.getAttribute('data-caption')); return; }
      if (!lb.hidden && (e.target === lb || e.target.closest('.lightbox-close'))) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lb.hidden) close();
    });
  }
})();
