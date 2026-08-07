/* ============================================================
   渲染引擎：把 window.SITE_CONTENT 渲染成公开页
   - 可选区块（交付物 / 时间线 / 技能 / 文章 / 社交 / 指标 / 标签）为空则不渲染
   - 给可追踪元素加 data-track；给卡片加 data-kind 供 main.js 埋点
   - 生成打印简历（#resumeOnly）
   ============================================================ */
(function () {
  'use strict';
  var D = window.SITE_CONTENT || {};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  // 支持 **加粗** 标记
  function md(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }
  function $(id) { return document.getElementById(id); }

  var ICONS = {
    github: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 2.5-.34c.85 0 1.71.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9v2.82c0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0ZM.5 8h4V24h-4V8Zm7 0h3.8v2.2h.05c.53-1 1.83-2.2 3.77-2.2 4.03 0 4.78 2.65 4.78 6.1V24h-4v-7.1c0-1.7-.03-3.9-2.37-3.9-2.38 0-2.74 1.86-2.74 3.78V24h-4V8Z"/></svg>',
    juejin: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2 2 7v10l10 5 10-5V7L12 2Zm0 2.2 6.5 3.25L12 10.7 5.5 7.45 12 4.2ZM4 9.1l7 3.5v7.3l-7-3.5V9.1Zm9 10.8v-7.3l7-3.5v7.3l-7 3.5Z"/></svg>',
    zhihu: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M5.5 4h4l-3.5 7H2l3.5-7Zm5.5 0h10l-3.5 7h-4L11 4Zm-5.5 9h4L6 20H2l3.5-7Zm5.5 0h10l-3.5 7h-4L11 13Z"/></svg>'
  };
  function icon(type) { return ICONS[type] || '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor"/></svg>'; }

  var CONTACT_ICONS = {
    email: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7.5 8 5.5 8-5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    wechat: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9.5 4C5.9 4 3 6.5 3 9.6c0 1.8.97 3.4 2.5 4.4l-.63 2 2.2-1.15c.45.12.93.2 1.43.22-.17-.55-.27-1.12-.27-1.72C8.23 10.4 11.2 8 14.75 8c.32 0 .63.02.93.05C14.98 5.9 12.5 4 9.5 4Z" fill="currentColor"/><path d="M14.7 9.5c-3 0-5.4 2-5.4 4.4s2.4 4.4 5.4 4.4c.53 0 1.04-.07 1.5-.2l1.8.95-.5-1.6c1.5-.85 2.5-2.2 2.5-3.55 0-2.4-2.3-4.4-5.3-4.4Z" fill="currentColor" opacity=".55"/></svg>'
  };
  var DOC_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

  /* ---------------- 导航 / 页脚 / 元信息 ---------------- */
  function renderMeta() {
    var s = D.site || {};
    if (s.title) document.title = s.title;
    var desc = document.querySelector('meta[name="description"]');
    if (desc && s.description) desc.setAttribute('content', s.description);
    var name = (D.hero && D.hero.name) || s.name || '作品集';
    var nb = $('navBrand'); if (nb) nb.innerHTML = esc(name) + '<span class="brand-dot">.</span>';
    var fb = $('footerBrand'); if (fb) fb.innerHTML = esc(name) + '<span class="brand-dot">.</span>';
  }

  /* ---------------- HERO ---------------- */
  function renderHero() {
    var h = D.hero || {};
    var c = $('heroContent'); if (!c) return;
    var html = '';
    if (h.kicker) html += '<p class="kicker" data-reveal>' + esc(h.kicker) + '</p>';
    if (h.name) html += '<h1 class="hero-name" data-reveal><span class="hero-name-mark">' + esc(h.name) + '</span></h1>';
    if (h.role) html += '<p class="hero-role" data-reveal>' + esc(h.role) + '</p>';
    if (h.stats && h.stats.length) {
      html += '<div class="hero-stats" data-reveal aria-label="核心指标">';
      h.stats.forEach(function (st, i) {
        if (i) html += '<span class="stat-divider" aria-hidden="true"></span>';
        html += '<div class="stat"><span class="stat-num">' + esc(st.num) +
          (st.small ? '<small>' + esc(st.small) + '</small>' : '') + '</span>' +
          '<span class="stat-label">' + esc(st.label) + '</span></div>';
      });
      html += '</div>';
    }
    if (h.tags && h.tags.length) {
      html += '<div class="hero-tags" data-reveal aria-label="核心技能">';
      h.tags.forEach(function (t) { html += '<span>' + esc(t) + '</span>'; });
      html += '</div>';
    }
    if (h.cta) {
      html += '<div class="hero-cta" data-reveal>' +
        '<a href="#projects" class="btn btn-primary" data-scroll>查看作品 <span aria-hidden="true">↓</span></a>' +
        '<a href="#about" class="btn btn-ghost" data-scroll>了解更多</a></div>';
    }
    c.innerHTML = html;

    var v = $('heroVisual');
    if (v) {
      if (h.avatar) {
        v.innerHTML = '<div class="avatar-frame"><img class="avatar-img" src="' + esc(h.avatar) + '" alt="头像"></div>';
      } else {
        var init = (h.name || '?').charAt(0);
        v.innerHTML = '<div class="avatar-frame"><div class="avatar">' + esc(init) + '</div></div>';
      }
    }
  }

  /* ---------------- 项目卡片 ---------------- */
  function renderModules(modules) {
    if (!modules || !modules.length) return '';
    var html = '';
    modules.forEach(function (m) {
      var inner = '';
      (m.paragraphs || []).forEach(function (p) { if (p) inner += '<p>' + md(p) + '</p>'; });
      var blts = (m.bullets || []).filter(Boolean);
      if (blts.length) {
        inner += '<ul class="module-bullets">';
        blts.forEach(function (b) { inner += '<li>' + md(b) + '</li>'; });
        inner += '</ul>';
      }
      if (m.table && m.table.head && m.table.rows && m.table.rows.length) {
        inner += '<div class="table-wrap"><table class="data-table"><thead><tr>';
        m.table.head.forEach(function (th) { inner += '<th>' + esc(th) + '</th>'; });
        inner += '</tr></thead><tbody>';
        m.table.rows.forEach(function (row) {
          inner += '<tr>';
          row.forEach(function (cell) { inner += '<td>' + esc(cell) + '</td>'; });
          inner += '</tr>';
        });
        inner += '</tbody></table></div>';
      }
      if (m.note) inner += '<p class="module-note">' + md(m.note) + '</p>';
      if (!inner) return; // 空模块不渲染
      html += '<div class="module"><h3 class="module-title"><span class="mod-no">' +
        esc(m.no || '') + '</span>' + esc(m.title || '') + '</h3>' + inner + '</div>';
    });
    return html;
  }

  function renderDeliverables(dels) {
    if (!dels || !dels.length) return '';
    var items = '';
    dels.forEach(function (d) {
      var links = '';
      (d.links || []).forEach(function (l) {
        if (l.url) links += '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label || '查看') + '</a>';
      });
      items += '<li><span class="doc-name">' + DOC_ICON + esc(d.name || '') + '</span>' +
        (links ? '<span class="doc-actions">' + links + '</span>' : '') + '</li>';
    });
    if (!items) return '';
    return '<div class="module module-deliverables"><h3 class="module-title"><span class="mod-no">06</span>相关交付物</h3>' +
      '<ul class="deliverables">' + items + '</ul></div>';
  }

  function renderProjects() {
    var sec = $('projectsGrid'); if (!sec) return;
    var list = D.projects || [];
    if (!list.length) { sec.innerHTML = ''; var as = $('articles'); return; }
    var head = D.sections && D.sections.projects;
    var hsec = $('projectsHead');
    if (hsec && head) {
      hsec.innerHTML = (head.kicker ? '<p class="kicker">' + esc(head.kicker) + '</p>' : '') +
        (head.title ? '<h2 class="section-title" id="projects-title">' + esc(head.title) + '</h2>' : '') +
        (head.sub ? '<p class="section-sub">' + esc(head.sub) + '</p>' : '');
    }
    var html = '';
    list.forEach(function (p, idx) {
      var id = p.id || ('proj' + idx);
      var style = (p.accent ? ' style="--accent:' + esc(p.accent) + ';--accent-soft:' + esc(p.accentSoft || '#EFF6FF') + '"' : '');
      var tags = (p.tags && p.tags.length) ? '<span class="card-tags" aria-label="标签">' +
        p.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</span>' : '';
      var metrics = (p.metrics && p.metrics.length) ? '<span class="card-metrics" aria-label="关键指标">' +
        p.metrics.map(function (m) { return '<span class="mini-metric"><b>' + esc(m.b) + '</b><i>' + esc(m.i) + '</i></span>'; }).join('') + '</span>' : '';
      var actions = '<div class="card-actions"><button type="button" class="prd-export-btn" data-prd="' + esc(id) + '" data-track="export_prd">' + DOC_ICON + '导出 PRD（PDF）</button></div>';
      var bodyInner = renderModules(p.modules) + renderDeliverables(p.deliverables) + actions;
      // 第一个项目默认展开：让 HR 一进来就看到完整 STAR 结构，并意识到卡片可展开
      var open = idx === 0;
      html += '<article class="project-card' + (open ? ' is-open' : '') + '" data-kind="project" data-reveal' + style + '>' +
        '<button type="button" class="card-toggle" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="' + id + '-body" id="' + id + '-toggle">' +
        '<span class="card-toggle-main"><span class="card-name">' + esc(p.name || '') + '</span>' +
        (p.summary ? '<span class="card-summary">' + esc(p.summary) + '</span>' : '') + tags + '</span>' +
        metrics + '<span class="card-chevron" aria-hidden="true">' + (open ? '收起' : '展开') + '</span></button>' +
        '<div class="card-body" id="' + id + '-body" role="region" aria-labelledby="' + id + '-toggle"' + (open ? '' : ' hidden') + '>' +
        '<div class="card-body-inner">' + bodyInner + '</div></div></article>';
    });
    sec.innerHTML = html;
  }

  /* ---------------- 关于我 ---------------- */
  function renderAbout() {
    var g = $('aboutGrid'); if (!g) return;
    var a = D.about || {};
    var head = D.sections && D.sections.about;
    var hsec = $('aboutHead');
    if (hsec && head) {
      hsec.innerHTML = (head.kicker ? '<p class="kicker">' + esc(head.kicker) + '</p>' : '') +
        (head.title ? '<h2 class="section-title" id="about-title">' + esc(head.title) + '</h2>' : '');
    }
    var left = '';
    if (a.statement) left += '<p class="about-statement" data-reveal>' + md(a.statement) + '</p>';
    if (a.goal && a.goal.text) left += '<div class="goal-card" data-reveal><span class="goal-label">' +
      esc(a.goal.label || '职业目标') + '</span><p>' + esc(a.goal.text) + '</p></div>';
    if (a.timeline && a.timeline.length) {
      left += '<div class="timeline" data-reveal aria-label="经历时间线">';
      a.timeline.forEach(function (t) {
        left += '<div class="timeline-item"><span class="timeline-dot" aria-hidden="true"></span>' +
          '<div><b>' + esc(t.period || '') + '</b><span>' + esc(t.text || '') + '</span></div></div>';
      });
      left += '</div>';
    }
    var right = '';
    if (a.skills && a.skills.length) {
      right += '<h3 class="skills-title">技能标签</h3><ul class="skills-grid" aria-label="技能">';
      a.skills.forEach(function (s) { right += '<li>' + esc(s) + '</li>'; });
      right += '</ul>';
    }
    g.innerHTML = '<div class="about-left">' + left + '</div>' +
      (right ? '<div class="about-right" data-reveal>' + right + '</div>' : '');
  }

  /* ---------------- 文章 ---------------- */
  function renderArticles() {
    var sec = $('articlesList'); if (!sec) return;
    var list = D.articles || [];
    var sectionEl = $('articles');
    if (!list.length) { sec.innerHTML = ''; if (sectionEl) sectionEl.hidden = true; return; }
    if (sectionEl) sectionEl.hidden = false;
    var head = D.sections && D.sections.articles;
    var hsec = $('articlesHead');
    if (hsec && head) {
      hsec.innerHTML = (head.kicker ? '<p class="kicker">' + esc(head.kicker) + '</p>' : '') +
        (head.title ? '<h2 class="section-title" id="articles-title">' + esc(head.title) + '</h2>' : '');
    }
    var html = '';
    list.forEach(function (a, idx) {
      var id = a.id || ('art' + idx);
      var paras = (a.paragraphs || []).map(function (p) { return '<p>' + md(p) + '</p>'; }).join('');
      html += '<article class="project-card" data-kind="article" data-reveal>' +
        '<button type="button" class="card-toggle" aria-expanded="false" aria-controls="' + id + '-body" id="' + id + '-toggle">' +
        '<span class="card-toggle-main"><span class="card-name">' + esc(a.title || '') + '</span>' +
        (a.date || a.reading ? '<span class="art-meta"><time>' + esc(a.date || '') + '</time>' +
        (a.reading ? ' · ' + esc(a.reading) : '') + '</span>' : '') + '</span>' +
        '<span class="card-chevron" aria-hidden="true">展开</span></button>' +
        '<div class="card-body" id="' + id + '-body" role="region" aria-labelledby="' + id + '-toggle" hidden>' +
        '<div class="card-body-inner">' + paras + '</div></div></article>';
    });
    sec.innerHTML = html;
  }

  /* ---------------- 联系方式 ---------------- */
  function renderContact() {
    var ci = $('contactInner'); if (!ci) return;
    var c = D.contact || {};
    var head = D.sections && D.sections.contact;
    var hsec = $('contactHead');
    if (hsec && head) {
      hsec.innerHTML = (head.kicker ? '<p class="kicker">' + esc(head.kicker) + '</p>' : '') +
        (head.title ? '<h2 class="section-title" id="contact-title">' + esc(head.title) + '</h2>' : '') +
        (head.sub ? '<p class="section-sub">' + esc(head.sub) + '</p>' : '');
    }
    var list = '';
    if (c.email) list += '<li><span class="contact-icon" aria-hidden="true">' + CONTACT_ICONS.email + '</span>' +
      '<a href="mailto:' + esc(c.email) + '" data-track="email">' + esc(c.email) + '</a></li>';
    if (c.wechat) list += '<li><span class="contact-icon" aria-hidden="true">' + CONTACT_ICONS.wechat + '</span>' +
      '<span data-track="wechat">微信：' + esc(c.wechat) + '</span></li>';
    var socials = '';
    (c.socials || []).forEach(function (s) {
      if (!s.url) return; // 没填链接的社交不渲染
      socials += '<a class="social-btn" href="' + esc(s.url) + '" target="_blank" rel="noopener" ' +
        'data-track="social:' + esc(s.label || s.type) + '" aria-label="' + esc(s.label || s.type) + '">' +
        icon(s.type) + esc(s.label || s.type) + '</a>';
    });
    ci.innerHTML = (list ? '<ul class="contact-list" data-reveal>' + list + '</ul>' : '') +
      (socials ? '<div class="social-row" data-reveal aria-label="社交平台">' + socials + '</div>' : '');
  }

  /* ---------------- 打印简历 ---------------- */
  function renderResume() {
    var r = $('resumeOnly'); if (!r) return;
    var h = D.hero || {}, a = D.about || {}, c = D.contact || {};
    var name = h.name || (D.site && D.site.name) || '作品集';
    var html = '<h1>' + esc(name) + '</h1>';
    html += '<p>' + esc(h.role || '') + '</p>';
    var cl = [];
    if (c.email) cl.push(esc(c.email));
    if (c.wechat) cl.push('微信：' + esc(c.wechat));
    var gh = (c.socials || []).filter(function (s) { return s.type === 'github' && s.url; })[0];
    if (gh) cl.push(esc(gh.url.replace('https://', '')));
    if (cl.length) html += '<p>' + cl.join(' &middot; ') + '</p>';
    if (a.statement) { html += '<h2>个人陈述</h2><p>' + esc(a.statement) + '</p>'; }
    if (a.goal && a.goal.text) { html += '<h2>职业目标</h2><p>' + esc(a.goal.text) + '</p>'; }
    if (D.projects && D.projects.length) {
      html += '<h2>项目经验</h2>';
      D.projects.forEach(function (p) {
        var line = '<b>' + esc(p.name || '') + '</b>：' + esc(p.summary || '');
        if (p.metrics && p.metrics.length) {
          line += '（' + p.metrics.map(function (m) { return esc(m.i) + ' ' + esc(m.b); }).join('；') + '）';
        }
        html += '<p>' + line + '</p>';
        (p.modules || []).forEach(function (m) {
          if (m.table && m.table.rows && m.table.rows.length) {
            html += '<table class="resume-table"><thead><tr>';
            m.table.head.forEach(function (th) { html += '<th>' + esc(th) + '</th>'; });
            html += '</tr></thead><tbody>';
            m.table.rows.forEach(function (row) {
              html += '<tr>'; row.forEach(function (cell) { html += '<td>' + esc(cell) + '</td>'; }); html += '</tr>';
            });
            html += '</tbody></table>';
          }
        });
      });
    }
    if (a.timeline && a.timeline.length) {
      html += '<h2>工作经历</h2>';
      a.timeline.forEach(function (t) { html += '<p><b>' + esc(t.period || '') + '</b> · ' + esc(t.text || '') + '</p>'; });
    }
    if (a.skills && a.skills.length) { html += '<h2>技能</h2><p>' + a.skills.map(esc).join('、') + '</p>'; }
    if (D.articles && D.articles.length) {
      html += '<h2>精选文章</h2>';
      D.articles.forEach(function (ar) { html += '<p>' + esc(ar.title || '') + (ar.date ? '（' + esc(ar.date) + '）' : '') + '</p>'; });
    }
    r.innerHTML = html;
  }

  /* ---------------- 生成单项目 PRD 文档（打印用） ---------------- */
  function renderPRD(p) {
    var r = $('prdPrint'); if (!r || !p) return false;
    var html = '<div class="prd-doc">';
    html += '<h1>' + esc(p.name || '') + '</h1>';
    if (p.tags && p.tags.length) html += '<p class="prd-tags">' + p.tags.map(esc).join(' · ') + '</p>';
    if (p.summary) html += '<p class="prd-summary">' + esc(p.summary) + '</p>';
    if (p.metrics && p.metrics.length) {
      html += '<p class="prd-metrics">' + p.metrics.map(function (m) {
        return '<b>' + esc(m.b) + '</b> ' + esc(m.i);
      }).join(' &nbsp;|&nbsp; ') + '</p>';
    }
    (p.modules || []).forEach(function (m) {
      html += '<h2>' + esc(m.no || '') + '. ' + esc(m.title || '') + '</h2>';
      (m.paragraphs || []).forEach(function (t) { if (t) html += '<p>' + md(t) + '</p>'; });
      var blts = (m.bullets || []).filter(Boolean);
      if (blts.length) {
        html += '<ul>';
        blts.forEach(function (b) { html += '<li>' + md(b) + '</li>'; });
        html += '</ul>';
      }
      if (m.table && m.table.head && m.table.rows && m.table.rows.length) {
        html += '<table class="prd-table"><thead><tr>';
        m.table.head.forEach(function (h) { html += '<th>' + esc(h) + '</th>'; });
        html += '</tr></thead><tbody>';
        m.table.rows.forEach(function (row) {
          html += '<tr>'; row.forEach(function (c) { html += '<td>' + esc(c) + '</td>'; }); html += '</tr>';
        });
        html += '</tbody></table>';
      }
      if (m.note) html += '<p class="prd-note">' + md(m.note) + '</p>';
    });
    if (p.deliverables && p.deliverables.length) {
      html += '<h2>相关交付物</h2><ul>';
      p.deliverables.forEach(function (d) { html += '<li>' + esc(d.name || '') + '</li>'; });
      html += '</ul>';
    }
    var nm = (D.hero && D.hero.name) || (D.site && D.site.name) || '';
    var c = D.contact || {};
    var foot = esc(nm);
    if (c.email) foot += ' · ' + esc(c.email);
    if (c.wechat) foot += ' · 微信 ' + esc(c.wechat);
    html += '<hr class="prd-hr"><p class="prd-foot">' + foot + '</p>';
    html += '</div>';
    r.innerHTML = html;
    return true;
  }

  // 供 main.js 的 [data-prd] 点击调用：生成 PRD → 进入打印模式 → 打印 → 清理
  window.buildPRD = function (pid) {
    var list = D.projects || [];
    var p = null;
    for (var i = 0; i < list.length; i++) {
      if ((list[i].id || ('proj' + i)) === pid) { p = list[i]; break; }
    }
    if (!p || !renderPRD(p)) return;
    document.body.classList.add('print-prd');
    var done = function () {
      document.body.classList.remove('print-prd');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
    // 兜底：部分浏览器 afterprint 不触发（如打印对话框被取消）
    setTimeout(function () { if (document.body.classList.contains('print-prd')) done(); }, 2000);
  };

  /* ---------------- 执行 ---------------- */
  function init() {
    renderMeta();
    renderHero();
    renderProjects();
    renderAbout();
    renderArticles();
    renderContact();
    renderResume();
    // 通知 main.js 重新绑定（卡片是动态生成的）
    document.dispatchEvent(new CustomEvent('content:rendered'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
