/* ============================================================
   数据看板 · 数据适配层（DashboardData）
   ------------------------------------------------------------
   设计目标：
   - 现在：默认返回「演示数据（框架）」，看板即可可视化运行。
   - 将来：把真实埋点接进来，只需切换 config.mode，无需改 UI。
   三种数据源（config.mode，默认 'file'）：
     1) 'file'  —— 读取本地导出的 JSON 快照（由 .workbuddy/export_dashboard_json.py 生成，
                    key 留在本地不进仓库，数字随站点发布；看板按所选时间范围切片重算）
     2) 'live'  —— 从 GoatCounter 实时拉取（在页面粘贴只读 key，存 localStorage，不进仓库）
     3) 'mock'  —— 演示数据（框架占位，文件缺失/范围无数据时回退）
   真实埋点事件命名（与 site 现有 analytics 对齐）：
     event:project_view:<项目名> / event:project_read:<项目名> /
     event:project_dwell:<项目名>:<秒> / event:download_resume /
     event:resume_recommend:<0-10> / event:scroll_depth:<25|50|75|100> /
     event:section_view:<projects|about|articles|contact> /
     event:hero_cta:view_projects|about / event:email / event:wechat /
     event:export_prd / event:deliverable_link / event:download_after:<N> /
     event:exit_bounce / event:exit_no_contact / event:session_duration:<秒>
   ============================================================ */
window.DashboardData = (function () {
  'use strict';

  var CONFIG = {
    // 'file' | 'live' | 'mock'  —— 默认 file：读取本地导出快照，无需每次粘贴 key
    mode: 'file',
    siteCode: '3062538987',
    // file 模式：导出数据（结构同 get() 返回值）放置路径
    dataFile: 'assets/js/dashboard-data.json',
    // live 模式：只读 key 存于浏览器 localStorage（避免泄露到公开仓库）
    keyStorageKey: 'gc-dashboard-key',
    // 实时拉取逐日并发上限（避免触发限流）
    liveConcurrency: 3
  };

  /* ---------------- 工具函数 ---------------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function mmdd(d) { return pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function round1(n) { return Math.round(n * 10) / 10; }
  function sum(arr, f) { return arr.reduce(function (a, b) { return a + (f ? f(b) : b); }, 0); }

  // 已知项目（用于把事件里的完整项目名映射成短名展示）
  var KNOWN_PROJECTS = [
    { name: 'Bloom OS：AI Native 跨境电商业务操作系统（S0–S6）', short: 'Bloom OS' },
    { name: '供应链自动化：双轨方案（模拟人工 RPA + 订小蜜 ERP API 直推）', short: '供应链自动化' },
    { name: 'TEMU 运营自动化：11 项需求 PRD + 通用自动化框架', short: 'TEMU 运营自动化' },
    { name: '绩效超时管控自动化：PRD + 7 项自动化 + Q3 绩效数据化', short: '绩效超时管控' },
    { name: '选品开款飞书工作流：5 表串联 + 计划 ID 贯穿端到端', short: '选品开款工作流' },
    { name: 'AI 心理健康平台（毕业设计）：记录 → 分析 → 干预 → 追踪闭环', short: 'AI 心理健康平台' },
    { name: '畅读内容生产链：作者 → 网编 → 责编 的数据治理与选书闭环', short: '畅读内容生产链' }
  ];
  function shortName(full) {
    for (var i = 0; i < KNOWN_PROJECTS.length; i++) {
      if (full.indexOf(KNOWN_PROJECTS[i].short) === 0 || full.indexOf(KNOWN_PROJECTS[i].name) >= 0) return KNOWN_PROJECTS[i].short;
    }
    return full.length > 10 ? full.slice(0, 10) + '…' : full;
  }

  function rangeLabel(days) {
    if (days <= 7) return '近 7 天';
    if (days <= 14) return '近 14 天';
    if (days <= 30) return '近 30 天';
    if (days <= 90) return '近 90 天';
    return days + ' 天';
  }

  /* ---------------- 演示数据（框架默认） ---------------- */
  function buildMock(startStr, endStr) {
    var start = new Date(startStr + 'T00:00:00');
    var end = new Date(endStr + 'T00:00:00');
    var rangeDays = Math.round((end - start) / 86400000) + 1;
    var rng = mulberry32(hashStr(startStr + '|' + endStr)); // 同一区间数据稳定

    var daily = [];
    var pvTot = 0, uvTot = 0, dlTot = 0, sessSum = 0, contactTot = 0;
    for (var i = 0; i < rangeDays; i++) {
      var day = addDays(start, i);
      var dow = day.getDay();
      var weekendFactor = (dow === 0 || dow === 6) ? 0.55 : 1;
      var trend = 1 + i / (rangeDays * 3); // 缓慢增长趋势
      var pv = Math.round(18 * weekendFactor * trend * (0.7 + 0.6 * rng()));
      var uv = Math.round(pv * (0.55 + 0.2 * rng()));
      var dl = Math.round(pv * 0.12 * (0.5 + rng()));
      var sess = Math.round(45 + 90 * rng());
      var contact = Math.round(uv * 0.35 * (0.5 + rng()));
      daily.push({ date: ymd(day), label: mmdd(day), pv: pv, uv: uv, downloads: dl, sessionSec: sess, contactReach: contact });
      pvTot += pv; uvTot += uv; dlTot += dl; sessSum += sess; contactTot += contact;
    }

    var projOut = KNOWN_PROJECTS.map(function (p, idx) {
      var views = Math.round(40 + (KNOWN_PROJECTS.length - idx) * 22 * (0.6 + 0.8 * rng()));
      var reads = Math.round(views * (0.4 + 0.3 * rng()));
      var dwell = Math.round(8 + (KNOWN_PROJECTS.length - idx) * 3 * (0.6 + rng()));
      return { name: p.name, short: p.short, views: views, reads: reads, avgDwellSec: dwell };
    }).sort(function (a, b) { return b.views - a.views; });

    var scoreDist = [];
    for (var s = 0; s <= 10; s++) {
      var w = Math.exp(-Math.pow(s - 7, 2) / 8);
      scoreDist.push({ score: s, count: Math.round(w * 30 * (0.5 + rng()) + (s >= 7 ? 8 : 1)) });
    }
    var recTot = sum(scoreDist, function (d) { return d.count; });
    var recHigh = sum(scoreDist.filter(function (d) { return d.score >= 7; }), function (d) { return d.count; });

    var scrollDist = [
      { depth: 25, count: Math.round(uvTot * 0.5 * (0.7 + rng())) },
      { depth: 50, count: Math.round(uvTot * 0.3 * (0.7 + rng())) },
      { depth: 75, count: Math.round(uvTot * 0.15 * (0.7 + rng())) },
      { depth: 100, count: Math.round(uvTot * 0.08 * (0.7 + rng())) }
    ];

    var funnel = [
      { label: '简历下载', value: dlTot },
      { label: '导出 PRD', value: Math.round(dlTot * 0.7 * (0.6 + rng())) },
      { label: '交付物外链', value: Math.round(dlTot * 0.9 * (0.6 + rng())) },
      { label: '微信', value: Math.round(dlTot * 0.5 * (0.6 + rng())) },
      { label: '邮箱', value: Math.round(dlTot * 0.4 * (0.6 + rng())) }
    ];

    return {
      meta: {
        mode: 'mock',
        rangeLabel: rangeLabel(rangeDays),
        start: startStr, end: endStr,
        generatedAt: new Date().toISOString(),
        note: '演示数据（框架）— 在右上角「数据源」切换为「实时」即可接入真实埋点。'
      },
      totals: {
        pv: pvTot, uv: uvTot, downloads: dlTot,
        avgSessionSec: Math.round(sessSum / rangeDays),
        contactReach: contactTot,
        projViewTotal: sum(projOut, function (p) { return p.views; }),
        bounce: Math.round(uvTot * 0.12 * (0.6 + rng())),
        noContact: Math.max(0, uvTot - contactTot),
        recommendTotal: recTot, recommendHigh: recHigh
      },
      daily: daily,
      projects: projOut,
      scoreDist: scoreDist,
      scrollDist: scrollDist,
      funnel: funnel,
      scoreAvg: recTot ? round1(sum(scoreDist, function (d) { return d.score * d.count; }) / recTot) : 0,
      downloadAfterAvg: round1(1.8 + 1.2 * rng())
    };
  }

  /* ---------------- 事件聚合（与 GoatCounter 返回结构对齐） ---------------- */
  function aggregateHits(hits) {
    var m = {
      projView: {}, projRead: {}, projDwell: [], downloadAfter: [], sessionDur: [],
      section: {}, scroll: {}, heroCta: {}, recommend: {},
      downloadResume: 0, exitBounce: 0, exitNoContact: 0, email: 0, wechat: 0,
      exportPrd: 0, deliverableLink: 0
    };
    (hits || []).forEach(function (h) {
      var p = (h.path || '').replace(/^\//, ''), c = h.count || 0; // GoatCounter 事件路径带前导斜杠，需去掉
      if (p.indexOf('event:') !== 0) return;
      var rest = p.slice(6);
      if (rest.indexOf('project_view:') === 0) m.projView[rest.slice(13)] = (m.projView[rest.slice(13)] || 0) + c;
      else if (rest.indexOf('project_read:') === 0) m.projRead[rest.slice(13)] = (m.projRead[rest.slice(13)] || 0) + c;
      else if (rest.indexOf('project_dwell:') === 0) { var t = rest.slice(13); var k = t.lastIndexOf(':'); if (k > 0) { var s = parseInt(t.slice(k + 1), 10); if (!isNaN(s)) m.projDwell.push(s); } }
      else if (rest.indexOf('download_after:') === 0) { var da = parseInt(rest.slice(15), 10); if (!isNaN(da)) m.downloadAfter.push(da); } // 'download_after:' = 15 字符
      else if (rest.indexOf('session_duration:') === 0) { var sd = parseInt(rest.slice(17), 10); if (!isNaN(sd)) m.sessionDur.push(sd); }
      else if (rest.indexOf('resume_recommend:') === 0) { var r = parseInt(rest.slice(17), 10); if (!isNaN(r)) m.recommend[r] = (m.recommend[r] || 0) + c; }
      else if (rest.indexOf('section_view:') === 0) m.section[rest.slice(13)] = (m.section[rest.slice(13)] || 0) + c;
      else if (rest.indexOf('scroll_depth:') === 0) m.scroll[rest.slice(13)] = (m.scroll[rest.slice(13)] || 0) + c; // 'scroll_depth:' = 13 字符
      else if (rest.indexOf('hero_cta:') === 0) m.heroCta[rest.slice(9)] = (m.heroCta[rest.slice(9)] || 0) + c;
      else if (rest === 'download_resume') m.downloadResume += c;
      else if (rest === 'exit_bounce') m.exitBounce += c;
      else if (rest === 'exit_no_contact') m.exitNoContact += c;
      else if (rest === 'email') m.email += c;
      else if (rest === 'wechat') m.wechat += c;
      else if (rest === 'export_prd') m.exportPrd += c;
      else if (rest === 'deliverable_link') m.deliverableLink += c;
    });
    return m;
  }

  /* ---------------- 实时拉取（GoatCounter API） ---------------- */
  function apiGet(base, path, params, key) {
    var url = base + path;
    var qs = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    if (qs) url += '?' + qs;
    return fetch(url, { headers: { 'Authorization': 'Bearer ' + key, 'Accept': 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function mapLimit(arr, limit, fn) {
    var i = 0, results = [];
    function next() {
      if (i >= arr.length) return Promise.resolve();
      var idx = i++;
      return Promise.resolve(fn(arr[idx], idx)).then(function (r) { results[idx] = r; }).catch(function (e) { results[idx] = { error: e.message }; }).then(next);
    }
    var runners = [];
    for (var k = 0; k < limit; k++) runners.push(next());
    return Promise.all(runners).then(function () { return results; });
  }

  function fetchLive(startStr, endStr, key) {
    var base = 'https://' + CONFIG.siteCode + '.goatcounter.com/api/v0';
    var days = [];
    var cur = new Date(startStr + 'T00:00:00');
    var end = new Date(endStr + 'T00:00:00');
    while (cur <= end) { days.push(ymd(cur)); cur.setDate(cur.getDate() + 1); }
    // API 的 end 是排他的，往后推 1 天确保最后一天被包含
    var apiEnd = ymd(addDays(new Date(endStr + 'T00:00:00'), 1));

    // 1) 一次拉全量逐日 PV；daily 字段会随查询窗口/站点时区偏移（同一天可能返回 4/20/24），
    //    不可靠 → 改用每个桶的 hourly[24] 数组求和（= 当天真实 pageview 总和，跨查询稳定）。
    return apiGet(base, '/stats/total', { start: startStr, end: apiEnd }, key).then(function (total) {
      var pvByDay = {};
      (total.stats || []).forEach(function (s) {
        var hh = s.hourly;
        pvByDay[s.day] = (hh && hh.length) ? hh.reduce(function (a, b) { return a + (b || 0); }, 0) : (s.daily || 0);
      });
      var activeDays = days.filter(function (d) { return (pvByDay[d] || 0) > 0; });
      // 2) 仅对 PV>0 的天拉事件明细，省请求、躲限流
      return mapLimit(activeDays, CONFIG.liveConcurrency, function (day) {
        var nextDay = ymd(addDays(new Date(day + 'T00:00:00'), 1));
        return apiGet(base, '/stats/hits', { start: day, end: nextDay, limit: 1000 }, key).then(function (hitsObj) {
          return { day: day, hits: (hitsObj && hitsObj.hits) || [] };
        });
      }).then(function (hitResults) {
        var hitsByDay = {};
        hitResults.forEach(function (r) { hitsByDay[r.day] = r.hits; });
        var dayResults = days.map(function (day) {
          var agg = aggregateHits(hitsByDay[day] || []);
          return { day: day, label: day.slice(5), pv: pvByDay[day] || 0, uv: null, agg: agg };
        });
        return buildFromDayResults(dayResults, startStr, endStr);
      });
    });
  }

  function buildFromDayResults(dayResults, startStr, endStr) {
    var daily = [], pvTot = 0, uvTot = 0, contactTot = 0, sessAll = [], uvNull = false;
    var projViews = {}, projReads = {}, projDwell = [];
    var scoreDist = {}, scrollDist = {}, funnelAgg = { downloadResume: 0, wechat: 0, email: 0, exportPrd: 0, deliverableLink: 0 };
    var recommendTotal = 0, recommendHigh = 0;

    dayResults.forEach(function (d) {
      var a = d.agg || aggregateHits([]);
      daily.push({ date: d.day, label: d.label, pv: d.pv, uv: d.uv, downloads: a.downloadResume, sessionSec: avg(a.sessionDur), contactReach: a.section.contact || 0 });
      pvTot += d.pv; if (d.uv == null) uvNull = true; else uvTot += d.uv; contactTot += (a.section.contact || 0); sessAll = sessAll.concat(a.sessionDur);
      Object.keys(a.projView).forEach(function (k) { projViews[k] = (projViews[k] || 0) + a.projView[k]; });
      Object.keys(a.projRead).forEach(function (k) { projReads[k] = (projReads[k] || 0) + a.projRead[k]; });
      projDwell = projDwell.concat(a.projDwell);
      Object.keys(a.recommend).forEach(function (k) { scoreDist[k] = (scoreDist[k] || 0) + a.recommend[k]; });
      [25, 50, 75, 100].forEach(function (dp) { scrollDist[dp] = (scrollDist[dp] || 0) + (a.scroll[dp] || 0); });
      funnelAgg.downloadResume += a.downloadResume; funnelAgg.wechat += a.wechat; funnelAgg.email += a.email;
      funnelAgg.exportPrd += a.exportPrd; funnelAgg.deliverableLink += a.deliverableLink;
      recommendTotal += sum(Object.keys(a.recommend).map(function (k) { return a.recommend[k]; }));
      recommendHigh += sum(Object.keys(a.recommend).filter(function (k) { return +k >= 7; }).map(function (k) { return a.recommend[k]; }));
    });

    if (uvNull) uvTot = null;
    var projects = Object.keys(projViews).map(function (k) {
      return { name: k, short: shortName(k), views: projViews[k], reads: projReads[k] || 0, avgDwellSec: avg(projDwell) }; // 真实数据停留取整体均值（可按项目细化）
    }).sort(function (a, b) { return b.views - a.views; });

    var scoreArr = []; for (var s = 0; s <= 10; s++) scoreArr.push({ score: s, count: scoreDist[s] || 0 });
    var scrollArr = [25, 50, 75, 100].map(function (dp) { return { depth: dp, count: scrollDist[dp] || 0 }; });
    var funnel = [
      { label: '简历下载', value: funnelAgg.downloadResume },
      { label: '导出 PRD', value: funnelAgg.exportPrd },
      { label: '交付物外链', value: funnelAgg.deliverableLink },
      { label: '微信', value: funnelAgg.wechat },
      { label: '邮箱', value: funnelAgg.email }
    ];

    return {
      meta: {
        mode: 'live',
        rangeLabel: rangeLabel(daily.length),
        start: startStr, end: endStr,
        generatedAt: new Date().toISOString(),
        note: '来自 GoatCounter 实时数据（站点 ' + CONFIG.siteCode + '）。' + (uvTot == null ? '（当前套餐不返回 UV，UV 以 — 显示）' : '')
      },
      totals: {
        pv: pvTot, uv: uvTot, downloads: funnelAgg.downloadResume,
        avgSessionSec: avg(sessAll),
        contactReach: contactTot,
        projViewTotal: sum(projects, function (p) { return p.views; }),
        bounce: sum(dayResults, function (d) { return (d.agg || {}).exitBounce || 0; }),
        noContact: sum(dayResults, function (d) { return (d.agg || {}).exitNoContact || 0; }),
        recommendTotal: recommendTotal, recommendHigh: recommendHigh
      },
      daily: daily,
      projects: projects,
      scoreDist: scoreArr,
      scrollDist: scrollArr,
      funnel: funnel,
      scoreAvg: recommendTotal ? round1(sum(scoreArr, function (d) { return d.score * d.count; }) / recommendTotal) : 0,
      downloadAfterAvg: 0
    };
  }

  function avg(arr) { return arr.length ? Math.round(sum(arr) / arr.length) : 0; }

  /* ---------------- 本地导出 JSON（快照，默认） ----------------
     快照里 daily[] 每天带 detail（项目查看/打分/滚动/转化/停留 等逐日明细），
     看板按所选时间范围切片后，复用 buildFromDayResults 重算聚合，保证与实时口径一致。 */
  function dayToAggResult(d) {
    var dt = d.detail || {};
    var f = dt.funnel || {};
    return {
      day: d.date, label: d.label, pv: d.pv, uv: d.uv,
      agg: {
        projView: dt.projViews || {},
        projRead: dt.projReads || {},
        projDwell: [],                       // 快照不存逐条停留，按日均值近似（见 buildFromDayResults）
        downloadAfter: [],
        sessionDur: dt.sessionDur || [],
        section: dt.section || {},
        scroll: dt.scroll || {},
        heroCta: dt.heroCta || {},
        recommend: dt.recommend || {},
        downloadResume: f.downloadResume || 0,
        exitBounce: dt.exitBounce || 0,
        exitNoContact: dt.exitNoContact || 0,
        email: f.email || 0,
        wechat: f.wechat || 0,
        exportPrd: f.exportPrd || 0,
        deliverableLink: f.deliverableLink || 0
      }
    };
  }

  function loadSnapshot(startStr, endStr) {
    return fetch(CONFIG.dataFile, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (snap) {
      var sliced = (snap.daily || []).filter(function (d) {
        return d.date >= startStr && d.date <= endStr;
      });
      if (!sliced.length) {
        var mock = buildMock(startStr, endStr);
        mock.meta.note = '所选时间范围在快照中无数据（快照覆盖 ' + (snap.meta && snap.meta.start) +
          ' ~ ' + (snap.meta && snap.meta.end) + '）。可放宽范围，或重跑 .workbuddy/export_dashboard_json.py 刷新快照。已回退演示数据。';
        mock.meta.mode = 'mock';
        return mock;
      }
      var model = buildFromDayResults(sliced.map(dayToAggResult), startStr, endStr);
      model.meta.mode = 'file';
      model.meta.rangeLabel = rangeLabel(sliced.length);
      model.meta.note = (snap.meta && snap.meta.note) || '';
      return model;
    });
  }

  /* ---------------- 对外入口 ---------------- */
  function get(startStr, endStr) {
    if (CONFIG.mode === 'live') {
      var key = (typeof localStorage !== 'undefined') ? localStorage.getItem(CONFIG.keyStorageKey) : '';
      if (!key) return Promise.reject(new Error('NO_KEY'));
      return fetchLive(startStr, endStr, key).catch(function (e) {
        // CORS / 网络 / key 失效：回退演示数据，并在 note 标注
        var mock = buildMock(startStr, endStr);
        mock.meta.note = '实时拉取失败（' + (e && e.message || e) + '），已回退演示数据。请检查 key 或 CORS。';
        mock.meta.mode = 'mock';
        return mock;
      });
    }
    if (CONFIG.mode === 'file') {
      return loadSnapshot(startStr, endStr).catch(function (e) {
        var mock = buildMock(startStr, endStr);
        mock.meta.note = '本地快照读取失败（' + (e && e.message || e) + '）。请确认 site/assets/js/dashboard-data.json 存在，' +
          '或重跑 .workbuddy/export_dashboard_json.py 生成。已回退演示数据。';
        mock.meta.mode = 'mock';
        return mock;
      });
    }
    return Promise.resolve(buildMock(startStr, endStr));
  }

  return {
    config: CONFIG,
    get: get,
    // 供页面调用：切换数据源模式
    setMode: function (m) { CONFIG.mode = m; },
    getKey: function () { return (typeof localStorage !== 'undefined') ? localStorage.getItem(CONFIG.keyStorageKey) : ''; },
    setKey: function (k) { if (typeof localStorage !== 'undefined') localStorage.setItem(CONFIG.keyStorageKey, k); }
  };
})();
