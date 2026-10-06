/* ============================================================
   app.js — bootstrap
   ============================================================ */
(function () {
  'use strict';

  window.__onBack = function () {
    try { return App.handleBack(); } catch (e) { return false; }
  };

  window.__errs = [];
  var shown = 0;
  window.addEventListener('error', function (e) {
    window.__errs.push(String(e.message));
    if (++shown <= 3) { try { App.toast('Error: ' + (e.message || '')); } catch (x) {} }
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    try { App.toast(String((r && r.message) || r).slice(0, 70)); } catch (x) {}
  });

  function boot() {
    try {
      App.Store.loadSettings();
      App.T.set(App.S.settings.lang || 'zh');
      App.P.setLang(App.S.settings.lang || 'zh');
      try { document.documentElement.lang = App.T.isEn() ? 'en' : 'zh-CN'; } catch (e) {}
      App.Store.loadIndex();
      App.Stats.load();
      App.Theme.apply();
      App.UI.init();
      App.UI.openConversation(null);
      App.UI.renderAll();
      document.getElementById('boot-logo').innerHTML =
        '<svg class="i" style="width:34px;height:34px"><use href="#i-bolt"></use></svg>';
      document.getElementById('app').hidden = false;
      setTimeout(function () {
        var b = document.getElementById('boot');
        if (b) b.classList.add('hide');
      }, 140);
      if (!App.S.settings.providers.length) {
        setTimeout(function () { App.toast(App.T('chat.needProvider')); }, 600);
      }
    } catch (e) {
      window.__errs.push(String(e && e.stack || e));
      var b = document.getElementById('boot');
      if (b) b.innerHTML = '<div style="padding:24px;color:#e5484d;font-size:13px;white-space:pre-wrap">Boot failed\n' +
        String(e && e.stack || e) + '</div>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
