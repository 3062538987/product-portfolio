/* ============================================================
   数据看板 · 渲染层（dashboard.js）
   - 时间范围选择器（7/14/30/90 天 + 自定义起止）
   - KPI 卡
   - SVG 每日访问趋势线图（PV / UV，悬停查看每日明细）
   - 项目热度 / 转化动作 / 面试官打分 / 滚动深度 条状可视化
   - 每日明细表
   - 数据源切换（演示 / 实时），实时 key 存 localStorage
   零依赖：图表用原生 SVG / HTML，不引第三方库。
   ============================================================ */
(function () {
  'use strict';

  var DATA = window.DashboardData;
  var state = { rangeDays: 7, customStart: null, customEnd: null, loading: false };

  function $(sel) { return document.querySelector(sel); }
  function fmt(n) { return (n == null ? '—' : Number(n).toLocaleString('en-US')); }
  function fmtSec(s) { if (s == null) return '—'; return s >= 60 ? (Math.floor(s / 60) + '分' + (s % 60) + '秒') : (s + '秒'); }

  function rangeDates() {
    if (state.customStart && state.customEnd) return { start: state.customStart, end: state.customEnd };
    var end = new Date(); end.setHours(0, 0, 0, 0);
    var start = new Date(end); start.setDate(start.getDate() - (state.rangeDays - 1));
    function p(d) { var m = d.getMonth() + 1, dd = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd); }
    return { start: p(start), end: p(end) };
  }

  /* ---------------- 控件 ---------------- */
  function initControls() {
    var sel = $('#rangeSelect');
    sel.addEventListener('change', function () {
      if (sel.value === 'custom') { $('#customRange').hidden = false; return; }
      $('#customRange').hidden = true;
      state.customStart = null; state.customEnd = null;
      state.rangeDays = parseInt(sel.value, 10);
      load();
    });

    $('#customStart').addEventListener('change', function () { state.customStart = $('#customStart').value || null; if (state.customEnd) load(); });
    $('#customEnd').addEventListener('change', function () { state.customEnd = $('#customEnd').value || null; if (state.customStart) load(); });
    $('#refreshBtn').addEventListener('click', load);

    // 数据源切换
    var modeSel = $('#sourceSelect');
    modeSel.addEventListener('change', function () {
      DATA.setMode(modeSel.value);
      if (modeSel.value === 'live') { showKeyInput(); }
      else { $('#keyBox').hidden = true; }
      load();
    });

    $('#keySave').addEventListener('click', function () {
      var k = $('#keyInput').value.trim();
      if (!k) return;
      DATA.setKey(k);
      $('#keyBox').hidden = true;
      load();
    });

    // 进入页面若已是 live 且无 key，直接弹出 key 输入
    if (DATA.config.mode === 'live' && !DATA.getKey()) showKeyInput();
  }

  function showKeyInput() {
    $('#keyBox').hidden = false;
    var existing = DATA.getKey();
    if (existing) $('#keyInput').value = existing;
    $('#keyInput').focus();
  }

  /* ---------------- 加载 ---------------- */
  function load() {
    if (state.loading) return;
    state.loading = true;
    var r = rangeDates();
    var box = $('#dashBody');
    box.classList.add('is-loading');
    $('#errorBar').hidden = true;

    DATA.get(r.start, r.end).then(function (model) {
      render(model);
      box.classList.remove('is-loading');
      state.loading = false;
    }).catch(function (e) {
      box.classList.remove('is-loading');
      state.loading = false;
      if (e && e.message === 'NO_KEY') { showKeyInput(); return; }
      var bar = $('#errorBar');
      bar.hidden = false;
      bar.textContent = '加载失败：' + (e && e.message || e);
    });
  }

  /* ---------------- 渲染 ---------------- */
  function render(m) {
    renderMeta(m.meta);
    renderKPIs(m.totals, m);
    renderTrend(m.daily);
    renderProjects(m.projects);
    renderFunnel(m.funnel);
    renderScore(m.scoreDist, m.scoreAvg);
    renderScroll(m.scrollDist);
    renderTable(m.daily);
  }

  function renderMeta(meta) {
    $('#metaRange').textContent = meta.rangeLabel + '（' + meta.start + ' ~ ' + meta.end + '）';
    $('#metaNote').textContent = meta.note || '';
    var badge = $('#modeBadge');
    if (meta.mode === 'live') { badge.textContent = '实时'; badge.className = 'dash-badge dash-badge--live'; }
    else if (meta.mode === 'file') { badge.textContent = '快照'; badge.className = 'dash-badge dash-badge--file'; }
    else { badge.textContent = '演示'; badge.className = 'dash-badge dash-badge--mock'; }
  }

  function renderKPIs(t, m) {
    var days = Math.max(1, m.daily.length);
    // UV 不可用（免费套餐 API 不返回 total_unique）时，用去重事件 project_view 作「人数」代理
    var uvCard;
    if (t.uv != null) {
      uvCard = { label: '独立访客 UV', value: fmt(t.uv), sub: '每日均值 ' + fmt(Math.round(t.uv / days)) };
    } else {
      var proxy = t.projViewTotal || 0; // project_view 按会话去重 ≈ 独立互动人数
      uvCard = { label: '去重互动人数', value: fmt(proxy), sub: '事件去重代理（本套餐无 UV）' };
    }
    var cards = [
      { k: 'pv', label: '页面访问 PV', value: fmt(t.pv), sub: '每日均值 ' + fmt(Math.round(t.pv / days)) },
      uvCard,
      { k: 'dl', label: '简历下载', value: fmt(t.downloads), sub: '联系区到达 ' + fmt(t.contactReach) },
      { k: 'sess', label: '平均停留', value: fmtSec(t.avgSessionSec), sub: '早退 ' + fmt(t.bounce) + ' · 未到联系 ' + fmt(t.noContact) }
    ];
    $('#kpis').innerHTML = cards.map(function (c) {
      return '<div class="dash-kpi"><div class="dash-kpi__label">' + c.label + '</div>' +
        '<div class="dash-kpi__value">' + c.value + '</div>' +
        '<div class="dash-kpi__sub">' + c.sub + '</div></div>';
    }).join('');
  }

  /* SVG 每日访问趋势线图（PV / UV） */
  function renderTrend(daily) {
    var mount = $('#trendChart');
    mount.innerHTML = '';
    if (!daily.length) return;
    var W = 760, H = 300, padL = 48, padR = 18, padT = 18, padB = 36;
    var iw = W - padL - padR, ih = H - padT - padB;
    var maxV = 0;
    daily.forEach(function (d) { maxV = Math.max(maxV, d.pv, (typeof d.uv === 'number' ? d.uv : 0)); });
    maxV = niceMax(maxV);

    var n = daily.length;
    var xAt = function (i) { return padL + (n === 1 ? iw / 2 : iw * i / (n - 1)); };
    var yAt = function (v) { return padT + ih - (v / maxV) * ih; };

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'dash-svg');
    svg.setAttribute('preserveAspectRatio', 'none');

    // 网格 + Y 轴标签
    var ticks = 4;
    for (var g = 0; g <= ticks; g++) {
      var v = maxV * g / ticks;
      var y = yAt(v);
      var line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', padL); line.setAttribute('x2', W - padR);
      line.setAttribute('y1', y); line.setAttribute('y2', y);
      line.setAttribute('class', 'dash-grid');
      svg.appendChild(line);
      var tx = document.createElementNS(svgNS, 'text');
      tx.setAttribute('x', padL - 8); tx.setAttribute('y', y + 4); tx.setAttribute('text-anchor', 'end');
      tx.setAttribute('class', 'dash-axis'); tx.textContent = Math.round(v);
      svg.appendChild(tx);
    }

    // X 轴标签（稀疏）
    var stepX = Math.ceil(n / 8);
    daily.forEach(function (d, i) {
      if (i % stepX === 0 || i === n - 1) {
        var tx = document.createElementNS(svgNS, 'text');
        tx.setAttribute('x', xAt(i)); tx.setAttribute('y', H - 12); tx.setAttribute('text-anchor', 'middle');
        tx.setAttribute('class', 'dash-axis'); tx.textContent = d.label;
        svg.appendChild(tx);
      }
    });

    var uvValid = daily.every(function (d) { return typeof d.uv === 'number'; });
    var series = [
      { key: 'pv', color: '#2563EB', fill: 'rgba(37,99,235,.10)' }
    ];
    if (uvValid) series.push({ key: 'uv', color: '#059669', fill: 'rgba(5,150,105,.08)' });

    series.forEach(function (s) {
      var pts = daily.map(function (d, i) { return xAt(i) + ',' + yAt(d[s.key]); });
      // 面积
      var area = document.createElementNS(svgNS, 'polygon');
      area.setAttribute('points', padL + ',' + (padT + ih) + ' ' + pts.join(' ') + ' ' + xAt(n - 1) + ',' + (padT + ih));
      area.setAttribute('fill', s.fill);
      svg.appendChild(area);
      // 线
      var poly = document.createElementNS(svgNS, 'polyline');
      poly.setAttribute('points', pts.join(' '));
      poly.setAttribute('fill', 'none'); poly.setAttribute('stroke', s.color);
      poly.setAttribute('stroke-width', '2.5'); poly.setAttribute('stroke-linejoin', 'round'); poly.setAttribute('stroke-linecap', 'round');
      svg.appendChild(poly);
    });

    // 悬停层
    var guide = document.createElementNS(svgNS, 'line');
    guide.setAttribute('class', 'dash-guide'); guide.setAttribute('y1', padT); guide.setAttribute('y2', padT + ih);
    guide.setAttribute('x1', -10); guide.setAttribute('x2', -10); guide.hidden = true;
    svg.appendChild(guide);

    var overlay = document.createElementNS(svgNS, 'rect');
    overlay.setAttribute('x', padL); overlay.setAttribute('y', padT); overlay.setAttribute('width', iw); overlay.setAttribute('height', ih);
    overlay.setAttribute('fill', 'transparent'); overlay.setAttribute('style', 'cursor:crosshair');
    svg.appendChild(overlay);

    var tip = $('#trendTip');

    function move(ev) {
      var rect = svg.getBoundingClientRect();
      var clientX = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      var relX = (clientX - rect.left) / rect.width * W;
      var i = Math.round((relX - padL) / (iw / Math.max(1, n - 1)));
      i = Math.max(0, Math.min(n - 1, i));
      var d = daily[i];
      guide.setAttribute('x1', xAt(i)); guide.setAttribute('x2', xAt(i)); guide.hidden = false;
      tip.hidden = false;
      tip.innerHTML = '<b>' + d.label + '</b><br>PV ' + fmt(d.pv) + ' · UV ' + fmt(d.uv) +
        (d.downloads ? '<br>简历下载 ' + fmt(d.downloads) : '');
      var tw = tip.offsetWidth;
      var leftPx = xAt(i) / W * rect.width;
      tip.style.left = Math.max(4, Math.min(rect.width - tw - 4, leftPx - tw / 2)) + 'px';
      tip.style.top = '6px';
    }
    function leave() { guide.hidden = true; tip.hidden = true; }
    overlay.addEventListener('mousemove', move);
    overlay.addEventListener('mouseleave', leave);
    overlay.addEventListener('touchmove', move);
    overlay.addEventListener('touchend', leave);

    mount.appendChild(svg);

    // 图例
    $('#trendLegend').innerHTML = series.map(function (s) {
      var lbl = s.key === 'pv' ? 'PV 页面访问' : 'UV 独立访客';
      return '<span class="dash-legend__item"><i style="background:' + s.color + '"></i>' + lbl + '</span>';
    }).join('');
  }

  function niceMax(v) {
    if (v <= 5) return 5;
    var pow = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / pow;
    var step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
  }

  // 通用横向条形图
  function hBars(mount, items, maxVal) {
    mount.innerHTML = '';
    var max = maxVal || Math.max.apply(null, items.map(function (d) { return d.value; })) || 1;
    items.forEach(function (d) {
      var row = document.createElement('div');
      row.className = 'dash-bar';
      var pct = max ? (d.value / max * 100) : 0;
      row.innerHTML = '<div class="dash-bar__label" title="' + (d.full || d.label) + '">' + d.label + '</div>' +
        '<div class="dash-bar__track"><div class="dash-bar__fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
        '<div class="dash-bar__val">' + fmt(d.value) + '</div>';
      mount.appendChild(row);
    });
  }

  function renderProjects(projects) {
    var items = projects.map(function (p) { return { label: p.short, full: p.name, value: p.views }; });
    hBars($('#projChart'), items.length ? items : [{ label: '（暂无数据）', value: 0 }]);
    // 副指标：认真阅读 / 平均停留
    $('#projSub').innerHTML = projects.length
      ? 'Top 项目被认真阅读（≥8s）：<b>' + (projects[0].short) + '</b> ' + fmt(projects[0].reads) + ' 次 · 平均停留 ' + fmtSec(projects[0].avgDwellSec)
      : '（暂无数据）';
  }

  function renderFunnel(funnel) {
    var items = funnel.map(function (f) { return { label: f.label, value: f.value }; });
    hBars($('#funnelChart'), items.length ? items : [{ label: '（暂无数据）', value: 0 }]);
  }

  function renderScore(scoreDist, avg) {
    var mount = $('#scoreChart');
    mount.innerHTML = '';
    var max = Math.max.apply(null, scoreDist.map(function (d) { return d.count; })) || 1;
    scoreDist.forEach(function (d) {
      var col = document.createElement('div');
      col.className = 'dash-score__col';
      var h = max ? (d.count / max * 100) : 0;
      var hot = d.score >= 7 ? 'is-hot' : (d.score <= 3 ? 'is-cold' : '');
      col.innerHTML = '<div class="dash-score__bar ' + hot + '" style="height:' + h.toFixed(1) + '%" title="' + d.score + '分：' + d.count + '"></div>' +
        '<div class="dash-score__x">' + d.score + '</div>';
      mount.appendChild(col);
    });
    $('#scoreAvg').textContent = '平均分 ' + (avg || 0) + ' / 10';
  }

  function renderScroll(scrollDist) {
    var items = scrollDist.map(function (s) { return { label: '滚动至 ' + s.depth + '%', value: s.count }; });
    hBars($('#scrollChart'), items.length ? items : [{ label: '（暂无数据）', value: 0 }]);
  }

  function renderTable(daily) {
    var head = '<tr><th>日期</th><th>PV</th><th>UV</th><th>简历下载</th><th>平均停留</th><th>联系区到达</th></tr>';
    var rows = daily.slice().reverse().map(function (d) {
      return '<tr><td>' + d.date + '</td><td>' + fmt(d.pv) + '</td><td>' + fmt(d.uv) + '</td><td>' +
        fmt(d.downloads) + '</td><td>' + fmtSec(d.sessionSec) + '</td><td>' + fmt(d.contactReach) + '</td></tr>';
    }).join('');
    $('#dashTable').innerHTML = head + rows;
  }

  /* ---------------- 启动 ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initControls();
    load();
  });
})();
