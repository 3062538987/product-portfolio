/* ============================================================
   访问统计（GoatCounter）—— 隐私友好、免费、支持自定义事件
   - code 来自 content.js 的 site.analytics.code（在后台「设置」里填）
   - code 为空时不加载、不报错
   - track(name, value) 供 main.js / 页面埋点调用
   ============================================================ */
(function () {
  'use strict';
  function code() {
    try {
      var a = window.SITE_CONTENT && window.SITE_CONTENT.site && window.SITE_CONTENT.site.analytics;
      return (a && a.code) || '';
    } catch (e) { return ''; }
  }

  // 默认 no-op，code 就绪后由 GoatCounter 接管
  window.track = function () {};

  var c = code();
  if (!c) return;

  window.track = function (name, value) {
    try {
      if (window.goatcounter) {
        var path = 'event:' + name;
        // 数值型指标可能为 0（如 download_after:0 下载前没看项目、session_duration:0 极短会话），
        // 必须显式保留 ':0'，否则被当 falsy 丢弃、丢失数据
        if (value !== undefined && value !== null && value !== '') {
          path += ':' + value;
        }
        window.goatcounter.count({
          path: path,
          title: name + (value ? (' · ' + value) : '')
        });
      }
    } catch (e) {}
  };

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', 'https://' + c + '.goatcounter.com/count');
  document.head.appendChild(s);
})();
