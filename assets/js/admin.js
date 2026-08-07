/* ============================================================
   后台管理逻辑
   - 密码进入（软保护）
   - 全量表单：基本信息 / 项目(增删改+交付物) / 关于我 / 文章 / 联系方式 / 设置
   - 头像上传(base64 内嵌)
   - 保存→localStorage 本地预览；发布→GitHub API 提交 content.js
   ============================================================ */
(function () {
  'use strict';

  var LS_DRAFT = 'portfolio-content-v1';
  var LS_ADMIN = 'portfolio-admin-v1';

  var data = loadData();
  var admin = loadAdmin();

  function loadData() {
    var base = window.SITE_CONTENT ? JSON.parse(JSON.stringify(window.SITE_CONTENT)) : {};
    try {
      var d = localStorage.getItem(LS_DRAFT);
      if (d) { var o = JSON.parse(d); if (o && o.site) return o; }
    } catch (e) {}
    return base;
  }
  function loadAdmin() {
    try { var a = localStorage.getItem(LS_ADMIN); if (a) return JSON.parse(a); } catch (e) {}
    return { pat: '' };
  }
  function saveLocal() {
    localStorage.setItem(LS_DRAFT, JSON.stringify(data));
    window.SITE_CONTENT = data;
    toast('已保存到本地预览（打开作品集首页即可看到）');
  }
  function saveAdmin() { localStorage.setItem(LS_ADMIN, JSON.stringify(admin)); }

  /* ---------------- 工具 ---------------- */
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) { return escHtml(s).replace(/"/g, '&quot;'); }
  function trim(s) { return s.trim(); }
  function getPath(o, p) { var ks = p.split('.'); for (var i = 0; i < ks.length; i++) { if (o == null) return ''; o = o[ks[i]]; } return o; }
  function setPath(o, p, v) {
    var ks = p.split('.');
    for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }
  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0F172A;color:#fff;padding:10px 18px;border-radius:999px;font-size:13px;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,.3)';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }

  /* ---------------- 表单字段构造 ---------------- */
  function fText(p, label, val, hint) {
    return '<div class="admin-field"><label>' + escHtml(label) + (hint ? ' <span class="hint">' + escHtml(hint) + '</span>' : '') + '</label>' +
      '<input class="admin-input" data-path="' + p + '" value="' + escAttr(val) + '"></div>';
  }
  function fArea(p, label, val, hint) {
    return '<div class="admin-field"><label>' + escHtml(label) + (hint ? ' <span class="hint">' + escHtml(hint) + '</span>' : '') + '</label>' +
      '<textarea class="admin-textarea" data-path="' + p + '">' + escHtml(val) + '</textarea></div>';
  }
  function fList(p, label, arr, hint) {
    return '<div class="admin-field"><label>' + escHtml(label) + (hint ? ' <span class="hint">' + escHtml(hint) + '</span>' : '') + '</label>' +
      '<textarea class="admin-textarea" data-path="' + p + '" data-list="1">' + escHtml((arr || []).join('\n')) + '</textarea></div>';
  }
  function sectionTitle(t, d) {
    return '<div class="admin-section__title">' + escHtml(t) + '</div>' + (d ? '<div class="admin-section__desc">' + escHtml(d) + '</div>' : '');
  }
  function wrapSection(inner) { return '<div class="admin-section">' + inner + '</div>'; }

  /* ---------------- 工厂 ---------------- */
  function newProject() {
    return { id: 'proj' + Date.now(), name: '新项目', summary: '', tags: [], accent: '#2563EB', accentSoft: '#EFF6FF',
      metrics: [{ b: '', i: '' }], modules: [{ no: '01', title: '背景与挑战', paragraphs: [], bullets: [], note: '', table: null }], deliverables: [] };
  }
  function newModule() { return { no: '', title: '新模块', paragraphs: [], bullets: [], note: '', table: null }; }
  function newArticle() { return { id: 'art' + Date.now(), title: '新文章', date: '', reading: '', paragraphs: [''] }; }

  /* ---------------- 各板块渲染 ---------------- */
  function statHTML(k, st) {
    return '<div class="admin-subitem"><div class="admin-item__head"><span class="idx">指标 ' + (k + 1) + '</span><span class="grow"></span>' +
      '<button class="admin-mini danger" data-action="delStat" data-arg="' + k + '">删除</button></div>' +
      fText('hero.stats.' + k + '.num', '数字', st.num) +
      fText('hero.stats.' + k + '.small', '单位(可选)', st.small) +
      fText('hero.stats.' + k + '.label', '说明', st.label) + '</div>';
  }
  function avatarField() {
    var av = data.hero && data.hero.avatar;
    var prev = av ? '<img class="admin-avatar-prev" src="' + escAttr(av) + '">'
      : '<div class="admin-avatar-prev admin-avatar-prev--empty">' + escHtml((data.hero && data.hero.name || '?').charAt(0)) + '</div>';
    return '<div class="admin-field"><label>头像（上传即内嵌）</label>' + prev +
      '<div><input type="file" accept="image/*" data-upload="hero.avatar"></div>' +
      '<div class="admin-hint-box">不传则公开页显示姓名首字。</div></div>';
  }
  function moduleHTML(i, j, m) {
    var t = m.table;
    var h = '<div class="admin-subitem"><div class="admin-item__head"><span class="idx">模块 ' + (j + 1) + '</span><span class="grow">' + escHtml(m.title || '') + '</span>' +
      '<button class="admin-mini danger" data-action="delModule" data-arg="' + i + ':' + j + '">删除</button></div>';
    h += fText('projects.' + i + '.modules.' + j + '.no', '编号(如 01)', m.no);
    h += fText('projects.' + i + '.modules.' + j + '.title', '标题', m.title);
    h += fArea('projects.' + i + '.modules.' + j + '.paragraphs', '段落（每行一段，可用 **加粗**）', (m.paragraphs || []).join('\n'));
    h += fArea('projects.' + i + '.modules.' + j + '.bullets', '要点列表（每行一条）', (m.bullets || []).join('\n'));
    h += fArea('projects.' + i + '.modules.' + j + '.note', '备注（小字，可选）', m.note || '');
    h += '<div class="admin-field"><label>数据表（可选）</label>';
    h += '<input class="admin-input" data-path="projects.' + i + '.modules.' + j + '.table.head" data-table="head" value="' + escAttr(t ? t.head.join(',') : '') + '" placeholder="表头,逗号分隔">';
    var rowsText = t ? t.rows.map(function (r) { return r.join(' | '); }).join('\n') : '';
    h += '<textarea class="admin-textarea" data-path="projects.' + i + '.modules.' + j + '.table.rows" data-table="rows" placeholder="每行一条，单元格用 | 分隔">' + escHtml(rowsText) + '</textarea></div>';
    return h + '</div>';
  }
  function metricHTML(i, k, m) {
    return '<div class="admin-subitem"><div class="admin-item__head"><span class="idx">指标 ' + (k + 1) + '</span><span class="grow"></span>' +
      '<button class="admin-mini danger" data-action="delMetric" data-arg="' + i + ':' + k + '">删除</button></div>' +
      fText('projects.' + i + '.metrics.' + k + '.b', '数值/对比', m.b) +
      fText('projects.' + i + '.metrics.' + k + '.i', '说明', m.i) + '</div>';
  }
  function deliverableHTML(i, k, d) {
    var links = (d.links || []).map(function (l, kk) {
      return '<div class="admin-row"><div class="admin-field" style="flex:1"><input class="admin-input" data-path="projects.' + i + '.deliverables.' + k + '.links.' + kk + '.label" value="' + escAttr(l.label) + '" placeholder="按钮文字"></div>' +
        '<div class="admin-field" style="flex:2"><input class="admin-input" data-path="projects.' + i + '.deliverables.' + k + '.links.' + kk + '.url" value="' + escAttr(l.url) + '" placeholder="链接(留空不显示)"></div>' +
        '<button class="admin-mini danger" data-action="delLink" data-arg="' + i + ':' + k + ':' + kk + '">删链接</button></div>';
    }).join('');
    return '<div class="admin-subitem"><div class="admin-item__head"><span class="idx">交付物 ' + (k + 1) + '</span><span class="grow">' + escHtml(d.name || '') + '</span>' +
      '<button class="admin-mini danger" data-action="delDeliverable" data-arg="' + i + ':' + k + '">删除</button></div>' +
      fText('projects.' + i + '.deliverables.' + k + '.name', '名称', d.name) +
      '<div class="admin-hint-box">链接（可多个，留空不显示）</div>' + links +
      '<span class="admin-add" data-action="addLink" data-arg="' + i + ':' + k + '">+ 加链接</span></div>';
  }
  function projectHTML(i, p) {
    var h = '<div class="admin-item"><div class="admin-item__head"><span class="idx">项目 ' + (i + 1) + '</span><span class="grow">' + escHtml(p.name || '未命名') + '</span>' +
      '<button class="admin-mini" data-action="moveProject" data-arg="' + i + ':-1">↑</button>' +
      '<button class="admin-mini" data-action="moveProject" data-arg="' + i + ':1">↓</button>' +
      '<button class="admin-mini danger" data-action="delProject" data-arg="' + i + '">删除</button></div>';
    h += fText('projects.' + i + '.name', '项目名称', p.name);
    h += fArea('projects.' + i + '.summary', '一句话简介', p.summary);
    h += fList('projects.' + i + '.tags', '标签（每行一个）', p.tags);
    h += fText('projects.' + i + '.accent', '主题色', p.accent);
    h += fText('projects.' + i + '.accentSoft', '主题浅色', p.accentSoft);
    h += '<div class="admin-field"><label>关键指标徽章</label>';
    (p.metrics || []).forEach(function (m, k) { h += metricHTML(i, k, m); });
    h += '<span class="admin-add" data-action="addMetric" data-arg="' + i + '">+ 加指标</span></div>';
    h += '<div class="admin-field"><label>STAR 模块（背景/角色/方案/数据/复盘…）</label>';
    (p.modules || []).forEach(function (m, j) { h += moduleHTML(i, j, m); });
    h += '<span class="admin-add" data-action="addModule" data-arg="' + i + '">+ 加模块</span></div>';
    h += '<div class="admin-field"><label>交付物（PRD/流程图等，可留空 → 不显示）</label>';
    (p.deliverables || []).forEach(function (d, k) { h += deliverableHTML(i, k, d); });
    h += '<span class="admin-add" data-action="addDeliverable" data-arg="' + i + '">+ 加交付物</span></div>';
    return h + '</div>';
  }
  function sectionBasic() {
    var h = sectionTitle('基本信息 & Hero', '姓名、角色、核心数字、标签、各板块标题等。');
    h += fText('site.name', '站点名（导航/页脚）', data.site && data.site.name);
    h += fText('site.title', '浏览器标题', data.site && data.site.title);
    h += fArea('site.description', '页面描述', data.site && data.site.description);
    h += fText('hero.kicker', 'Hero 小标', data.hero && data.hero.kicker);
    h += fText('hero.name', '姓名(大标题)', data.hero && data.hero.name);
    h += fArea('hero.role', '角色一句话', data.hero && data.hero.role);
    h += avatarField();
    h += '<div class="admin-field"><label>核心指标</label>';
    (data.hero && data.hero.stats || []).forEach(function (st, k) { h += statHTML(k, st); });
    h += '<span class="admin-add" data-action="addStat">+ 加指标</span></div>';
    h += fList('hero.tags', 'Hero 标签（每行一个）', data.hero && data.hero.tags);
    h += fText('hero.cta.primary', '主按钮文字', data.hero && data.hero.cta && data.hero.cta.primary);
    h += fText('hero.cta.secondary', '次按钮文字', data.hero && data.hero.cta && data.hero.cta.secondary);
    ['projects', 'about', 'articles', 'contact'].forEach(function (k) {
      var sec = (data.sections && data.sections[k]) || {};
      h += '<div class="admin-divider"></div><div class="admin-hint-box">板块「' + k + '」标题</div>';
      h += fText('sections.' + k + '.kicker', '小标', sec.kicker);
      h += fText('sections.' + k + '.title', '标题', sec.title);
      if (k !== 'about') h += fArea('sections.' + k + '.sub', '副标题', sec.sub);
    });
    return wrapSection(h);
  }
  function sectionProjects() {
    var h = sectionTitle('项目作品', '支持增 / 删 / 改；交付物留空则该模块不显示（公开页自动折叠）。');
    (data.projects || []).forEach(function (p, i) { h += projectHTML(i, p); });
    h += '<span class="admin-add" data-action="addProject">+ 新增项目</span>';
    return wrapSection(h);
  }
  function sectionAbout() {
    var a = data.about || {};
    var h = sectionTitle('关于我', '');
    h += fArea('about.statement', '自我介绍', a.statement);
    h += fText('about.goal.label', '职业目标标签', a.goal && a.goal.label);
    h += fArea('about.goal.text', '职业目标内容', a.goal && a.goal.text);
    h += '<div class="admin-field"><label>时间线（经历）</label>';
    (a.timeline || []).forEach(function (t, k) {
      h += '<div class="admin-subitem"><div class="admin-item__head"><span class="idx">经历 ' + (k + 1) + '</span><span class="grow"></span>' +
        '<button class="admin-mini danger" data-action="delTimeline" data-arg="' + k + '">删除</button></div>' +
        fText('about.timeline.' + k + '.period', '时间', t.period) +
        fText('about.timeline.' + k + '.text', '内容', t.text) + '</div>';
    });
    h += '<span class="admin-add" data-action="addTimeline">+ 加经历</span></div>';
    h += fList('about.skills', '技能标签（每行一个）', a.skills);
    return wrapSection(h);
  }
  function sectionArticles() {
    var h = sectionTitle('精选文章', '支持增 / 删；0–3 篇，公开页自动折叠空列表。');
    (data.articles || []).forEach(function (ar, i) {
      h += '<div class="admin-item"><div class="admin-item__head"><span class="idx">文章 ' + (i + 1) + '</span><span class="grow">' + escHtml(ar.title || '') + '</span>' +
        '<button class="admin-mini danger" data-action="delArticle" data-arg="' + i + '">删除</button></div>' +
        fText('articles.' + i + '.title', '标题', ar.title) +
        fText('articles.' + i + '.date', '日期', ar.date) +
        fText('articles.' + i + '.reading', '阅读时长', ar.reading) +
        fArea('articles.' + i + '.paragraphs', '正文（每段一行）', (ar.paragraphs || []).join('\n')) + '</div>';
    });
    h += '<span class="admin-add" data-action="addArticle">+ 新增文章</span>';
    return wrapSection(h);
  }
  function sectionContact() {
    var c = data.contact || {};
    var h = sectionTitle('联系方式', '微信 / 邮箱必填；社交链接留空则不显示。');
    h += fText('contact.email', '邮箱', c.email);
    h += fText('contact.wechat', '微信', c.wechat);
    h += '<div class="admin-field"><label>社交媒体</label>';
    (c.socials || []).forEach(function (s, k) {
      h += '<div class="admin-subitem"><div class="admin-item__head"><span class="idx">社交 ' + (k + 1) + '</span><span class="grow"></span>' +
        '<button class="admin-mini danger" data-action="delSocial" data-arg="' + k + '">删除</button></div>' +
        fText('contact.socials.' + k + '.type', '类型(图标: github/linkedin/juejin/zhihu)', s.type) +
        fText('contact.socials.' + k + '.label', '显示名', s.label) +
        fText('contact.socials.' + k + '.url', '链接(留空不显示)', s.url) + '</div>';
    });
    h += '<span class="admin-add" data-action="addSocial">+ 加社交</span></div>';
    return wrapSection(h);
  }
  function sectionSettings() {
    var s = data.site || {}, gh = s.github || {};
    var h = sectionTitle('设置', '密码 / GoatCounter code 会随内容发布；GitHub PAT 仅存你浏览器，不会发布。');
    h += fText('site.password', '编辑密码', s.password);
    h += fText('site.analytics.code', 'GoatCounter 站点代码（goatcounter.com 免费注册后获得）', s.analytics && s.analytics.code);
    h += '<div class="admin-field"><label>GitHub PAT（仅存浏览器，用于一键发布）</label>' +
      '<input class="admin-input" id="patInput" type="password" placeholder="ghp_..." value="' + escAttr(admin.pat) + '">' +
      '<div class="admin-hint-box">需要 repo 权限的 Personal Access Token。获取：GitHub → Settings → Developer settings → Personal access tokens。不填则无法一键发布（可改完用「导出」交给我发布）。</div></div>';
    h += fText('site.github.owner', '仓库 owner', gh.owner);
    h += fText('site.github.repo', '仓库名', gh.repo);
    h += fText('site.github.branch', '分支', gh.branch);
    h += fText('site.github.path', '内容文件路径', gh.path);
    return wrapSection(h);
  }

  function renderAdmin() {
    var h = '';
    h += sectionBasic();
    h += sectionProjects();
    h += sectionAbout();
    h += sectionArticles();
    h += sectionContact();
    h += sectionSettings();
    document.getElementById('adminRoot').innerHTML = h;
  }

  /* ---------------- 结构化操作 ---------------- */
  function doAction(a, arg) {
    var p = (arg || '').split(':').map(Number);
    switch (a) {
      case 'addProject': data.projects.push(newProject()); break;
      case 'delProject': data.projects.splice(p[0], 1); break;
      case 'moveProject': {
        var i = p[0], j = i + p[1];
        if (j >= 0 && j < data.projects.length) { var t = data.projects[i]; data.projects[i] = data.projects[j]; data.projects[j] = t; }
        break;
      }
      case 'addModule': data.projects[p[0]].modules.push(newModule()); break;
      case 'delModule': data.projects[p[0]].modules.splice(p[1], 1); break;
      case 'addMetric': data.projects[p[0]].metrics.push({ b: '', i: '' }); break;
      case 'delMetric': data.projects[p[0]].metrics.splice(p[1], 1); break;
      case 'addDeliverable': data.projects[p[0]].deliverables.push({ name: '', links: [{ label: '', url: '' }] }); break;
      case 'delDeliverable': data.projects[p[0]].deliverables.splice(p[1], 1); break;
      case 'addLink': data.projects[p[0]].deliverables[p[1]].links.push({ label: '', url: '' }); break;
      case 'delLink': data.projects[p[0]].deliverables[p[1]].links.splice(p[2], 1); break;
      case 'addArticle': data.articles.push(newArticle()); break;
      case 'delArticle': data.articles.splice(p[0], 1); break;
      case 'addTimeline': data.about.timeline.push({ period: '', text: '' }); break;
      case 'delTimeline': data.about.timeline.splice(p[0], 1); break;
      case 'addSocial': data.contact.socials.push({ type: '', label: '', url: '' }); break;
      case 'delSocial': data.contact.socials.splice(p[0], 1); break;
      case 'addStat': data.hero.stats.push({ num: '', small: '', label: '' }); break;
      case 'delStat': data.hero.stats.splice(p[0], 1); break;
      default: return;
    }
    renderAdmin();
  }

  /* ---------------- 事件委托 ---------------- */
  document.addEventListener('input', function (e) {
    if (e.target.id === 'patInput') { admin.pat = e.target.value; saveAdmin(); return; }
    var el = e.target.closest('[data-path]'); if (!el) return;
    var p = el.getAttribute('data-path');
    var tbl = el.getAttribute('data-table');
    if (tbl === 'head') { setPath(data, p, el.value.split(',').map(trim).filter(Boolean)); return; }
    if (tbl === 'rows') {
      setPath(data, p, el.value.split('\n').map(function (l) { return l.split('|').map(trim); })
        .filter(function (r) { return r.some(function (c) { return c && c.trim(); }); }));
      return;
    }
    var v = el.value;
    if (el.getAttribute('data-list')) v = v.split('\n').map(trim).filter(Boolean);
    setPath(data, p, v);
  });

  document.addEventListener('change', function (e) {
    var up = e.target.closest('[data-upload]'); if (!up) return;
    var file = up.files && up.files[0]; if (!file) return;
    var rd = new FileReader();
    rd.onload = function () { setPath(data, up.getAttribute('data-upload'), rd.result); saveLocal(); renderAdmin(); };
    rd.readAsDataURL(file);
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-action]'); if (!b) return;
    var a = b.getAttribute('data-action');
    if (a === 'saveLocal') return saveLocal();
    if (a === 'preview') return window.open('index.html', '_blank');
    if (a === 'export') return exportFile();
    if (a === 'import') return document.getElementById('importFile').click();
    if (a === 'publish') return publish();
    if (a === 'logout') return logout();
    doAction(a, b.getAttribute('data-arg'));
  });

  document.getElementById('importFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var txt = String(rd.result);
        var m = txt.match(/=\s*([\s\S]*?);\s*$/);
        var obj = m ? JSON.parse(m[1]) : JSON.parse(txt);
        if (obj && obj.site) { data = obj; saveLocal(); renderAdmin(); toast('导入成功'); }
        else alert('文件格式不正确');
      } catch (err) { alert('导入失败：' + err.message); }
    };
    rd.readAsText(f);
    e.target.value = '';
  });

  /* ---------------- 发布 / 导出 ---------------- */
  function b64(str) { return btoa(unescape(encodeURIComponent(str))); }

  function publish() {
    var gh = data.site.github || {}, pat = admin.pat;
    if (!pat) { alert('请先在「设置」里填写 GitHub PAT（需要 repo 权限）。'); return; }
    if (!confirm('确定发布？将把当前内容提交到 ' + gh.owner + '/' + gh.repo + ' 并触发 GitHub Pages 重新部署。')) return;
    var content = 'window.SITE_CONTENT = ' + JSON.stringify(data, null, 2) + ';\n';
    var api = 'https://api.github.com/repos/' + gh.owner + '/' + gh.repo + '/contents/' + gh.path + '?ref=' + gh.branch;
    fetch(api, { headers: { Authorization: 'token ' + pat, Accept: 'application/vnd.github.v3+json' } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        var sha = res.ok ? res.j.sha : null;
        var body = { message: 'update portfolio content', content: b64(content), branch: gh.branch };
        if (sha) body.sha = sha;
        return fetch(api, { method: 'PUT', headers: { Authorization: 'token ' + pat, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) alert('发布成功！GitHub Pages 正在重新部署，约 1–2 分钟后可访问：\nhttps://' + gh.owner + '.github.io/' + gh.repo + '/');
        else alert('发布失败：' + ((res.j && res.j.message) || '未知错误'));
      })
      .catch(function (e) { alert('发布出错：' + e.message); });
  }

  function exportFile() {
    var content = 'window.SITE_CONTENT = ' + JSON.stringify(data, null, 2) + ';\n';
    var blob = new Blob([content], { type: 'application/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'content.js'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------------- 密码门 ---------------- */
  var gate = document.getElementById('gate');
  var adminEl = document.getElementById('admin');
  function tryUnlock() {
    var v = document.getElementById('gatePwd').value;
    // 用「文件里的权威密码」或「本地草稿里的密码」任一匹配即可，
    // 避免旧草稿把密码记成旧值导致永远进不去后台。
    var pwdFile = window.SITE_CONTENT && window.SITE_CONTENT.site && window.SITE_CONTENT.site.password;
    var pwdDraft = data && data.site && data.site.password;
    if (v === String(pwdFile) || v === String(pwdDraft)) { gate.hidden = true; adminEl.hidden = false; renderAdmin(); }
    else { document.getElementById('gateErr').textContent = '密码错误，请重试'; }
  }
  function logout() { adminEl.hidden = true; gate.hidden = false; document.getElementById('gatePwd').value = ''; }
  document.getElementById('gateBtn').addEventListener('click', tryUnlock);
  document.getElementById('gatePwd').addEventListener('keydown', function (e) { if (e.key === 'Enter') tryUnlock(); });

})();
