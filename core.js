/* ============================================================
   core.js — platform bridge, storage, state, nav, ui primitives
   ============================================================ */
window.App = window.App || {};
(function () {
  'use strict';

  var hasNative = (typeof Native !== 'undefined' && Native !== null);
  function T(k, a, b, c) { return App.T(k, a, b, c); }

  /* ------------------------------------------------------------ helpers */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function uid(p) {
    return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function fmtNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
    return String(n);
  }
  function fmtSize(b) {
    if (b == null || b < 0) return '—';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(2) + ' MB';
  }
  function fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var now = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    if (d.toDateString() === now.toDateString()) return p(d.getHours()) + ':' + p(d.getMinutes());
    if (T.isEn()) {
      var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return M[d.getMonth()] + ' ' + d.getDate();
    }
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function icon(name, cls) {
    return '<svg class="i ' + (cls || '') + '"><use href="#i-' + name + '"></use></svg>';
  }
  function debounce(fn, ms) {
    var t; return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms || 200);
    };
  }

  /* ------------------------------------------------------------ platform */
  var P = {
    native: hasNative,
    info: function () {
      try { return hasNative ? JSON.parse(Native.info()) : { version: 'web', model: 'browser' }; }
      catch (e) { return {}; }
    },
    kvGet: function (k) {
      if (hasNative) { try { return Native.kvGet(k) || ''; } catch (e) { return ''; } }
      try { return localStorage.getItem('nx_' + k) || ''; } catch (e) { return ''; }
    },
    kvPut: function (k, v) {
      if (hasNative) { try { Native.kvPut(k, v); return; } catch (e) { return; } }
      try { localStorage.setItem('nx_' + k, v); } catch (e) {}
    },
    kvDel: function (k) {
      if (hasNative) { try { Native.kvDel(k); return; } catch (e) { return; } }
      try { localStorage.removeItem('nx_' + k); } catch (e) {}
    },
    bars: function (light) { if (hasNative) { try { Native.applyBars(light); } catch (e) {} } },
    copy: function (t) {
      if (hasNative) { try { Native.copyText(t); return; } catch (e) {} }
      try { navigator.clipboard.writeText(t); } catch (e) {}
    },
    openUrl: function (u) { if (hasNative) { try { Native.openUrl(u); return; } catch (e) {} } window.open(u, '_blank'); },
    share: function (t) { if (hasNative) { try { Native.shareText(t); } catch (e) {} } },
    toast: function (m) { if (hasNative) { try { Native.toast(m); return; } catch (e) {} } toast(m); },
    setLang: function (l) { if (hasNative) { try { Native.setLang(l); } catch (e) {} } },
    httpStream: function (id, method, url, headers, body) {
      if (hasNative) { Native.httpStream(id, method, url, JSON.stringify(headers || {}), body || ''); return; }
      WebHttp.stream(id, method, url, headers, body);
    },
    httpFetch: function (id, method, url, headers, body) {
      if (hasNative) { Native.httpFetch(id, method, url, JSON.stringify(headers || {}), body || ''); return; }
      WebHttp.fetch(id, method, url, headers, body);
    },
    httpCancel: function (id) { if (hasNative) { try { Native.httpCancel(id); } catch (e) {} } else WebHttp.cancel(id); }
  };

  /* ------------------------------------------------------- toast / sheet */
  function toast(msg) {
    var host = $('#toasts');
    var t = el('div', 'toast', msg);
    host.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .2s';
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 220);
    }, 1900);
  }

  var Sheet = {
    open: function (opts) {
      var host = $('#sheet');
      host.hidden = false;
      host.innerHTML = '';
      var scrim = el('div', 'sheet-scrim');
      scrim.onclick = function () { Sheet.close(); };
      var sh = el('div', 'sheet');
      sh.appendChild(el('div', 'sheet-handle'));
      if (opts.title) sh.appendChild(el('div', 'sheet-title', opts.title));
      if (opts.sub) sh.appendChild(el('div', 'sheet-sub', opts.sub));
      var body = el('div', 'sheet-body');
      if (opts.tight) body.style.padding = '0';
      sh.appendChild(body);
      host.appendChild(scrim);
      host.appendChild(sh);
      opts.build(body);
    },
    close: function () {
      var host = $('#sheet');
      host.hidden = true;
      host.innerHTML = '';
    }
  };

  /* ------------------------------------------------------------- confirm */
  function confirmBox(opts) {
    return new Promise(function (resolve) {
      Sheet.open({
        title: opts.title || T('c.confirm'),
        sub: opts.sub,
        build: function (body) {
          var row = el('div', 'btn-row');
          var cancel = el('button', 'btn ghost block', opts.cancelText || T('c.cancel'));
          cancel.onclick = function () { Sheet.close(); resolve(false); };
          var ok = el('button', 'btn block ' + (opts.danger ? 'danger' : ''), opts.okText || T('c.ok'));
          ok.onclick = function () { Sheet.close(); resolve(true); };
          row.appendChild(cancel); row.appendChild(ok);
          body.appendChild(row);
        }
      });
    });
  }

  function promptBox(opts) {
    return new Promise(function (resolve) {
      Sheet.open({
        title: opts.title || T('c.ok'),
        sub: opts.sub,
        build: function (body) {
          var f = el('div', 'field');
          var inp = el('input');
          inp.type = opts.number ? 'number' : 'text';
          inp.value = opts.value == null ? '' : opts.value;
          inp.placeholder = opts.placeholder || '';
          f.appendChild(inp);
          body.appendChild(f);
          var row = el('div', 'btn-row');
          var cancel = el('button', 'btn ghost block', T('c.cancel'));
          cancel.onclick = function () { Sheet.close(); resolve(null); };
          var ok = el('button', 'btn block', T('c.ok'));
          ok.onclick = function () { Sheet.close(); resolve(inp.value); };
          row.appendChild(cancel); row.appendChild(ok);
          body.appendChild(row);
          setTimeout(function () { inp.focus(); }, 60);
        }
      });
    });
  }

  /* ------------------------------------------------------------- storage */
  var DEFAULT_SETTINGS = {
    theme: 'system',
    lang: 'zh',
    providers: [],
    activeProviderId: '',
    activeModel: '',
    systemPrompt: '',
    reasoning: 'off',
    reasoningBudget: 2048,
    webSearch: false,
    searchProvider: 'bing',
    searchCount: 5,
    maxSearchRounds: 4,
    tellSearchLimit: true,
    tavilyKey: '',
    searxUrl: '',
    temperature: 1,
    historyLimit: 24,
    favorites: []
  };

  function readJSON(k, dflt) {
    var raw = P.kvGet(k);
    if (!raw) return dflt;
    try { return JSON.parse(raw); } catch (e) { return dflt; }
  }
  function writeJSON(k, v) { P.kvPut(k, JSON.stringify(v)); }

  var S = {
    settings: null,
    index: [],
    conv: null,
    attachments: [],
    reqSeq: 0,
    streaming: null
  };

  function loadSettings() {
    var s = readJSON('settings', null);
    if (!s) s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    for (var k in DEFAULT_SETTINGS) {
      if (!(k in s)) s[k] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[k]));
    }
    // drop settings from older builds
    delete s.prompts;
    delete s.activePromptId;
    delete s.workspace;
    S.settings = s;
    App.T.set(s.lang);
    return s;
  }
  function saveSettings() { writeJSON('settings', S.settings); }

  function loadIndex() { S.index = readJSON('conv_index', []); return S.index; }
  function saveIndex() { writeJSON('conv_index', S.index); }

  function loadConv(id) { return readJSON('conv_' + id, null); }
  function saveConv(c) {
    c.updatedAt = Date.now();
    writeJSON('conv_' + c.id, c);
    var found = false;
    for (var i = 0; i < S.index.length; i++) {
      if (S.index[i].id === c.id) {
        S.index[i].title = c.title; S.index[i].updatedAt = c.updatedAt;
        S.index[i].model = c.model; S.index[i].providerId = c.providerId;
        found = true; break;
      }
    }
    if (!found) {
      S.index.unshift({ id: c.id, title: c.title, updatedAt: c.updatedAt, model: c.model, providerId: c.providerId });
    }
    S.index.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    saveIndex();
  }
  function deleteConv(id) {
    P.kvDel('conv_' + id);
    S.index = S.index.filter(function (x) { return x.id !== id; });
    saveIndex();
  }

  function newConv() {
    var s = S.settings;
    return {
      id: uid('c'),
      title: '',
      providerId: s.activeProviderId,
      model: s.activeModel,
      reasoning: s.reasoning,
      reasoningBudget: s.reasoningBudget,
      webSearch: s.webSearch,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };
  }

  /* -------------------------------------------------------------- theme */
  function resolveDark() {
    var t = S.settings ? S.settings.theme : 'system';
    if (t === 'dark') return true;
    if (t === 'light') return false;
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
  }
  function applyTheme() {
    var dark = resolveDark();
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    P.bars(!dark);
  }

  /* ---------------------------------------------------------------- nav */
  var Nav = {
    stack: [],
    push: function (screen) { this.stack.push(screen); this.render(); },
    pop: function () {
      if (!this.stack.length) return false;
      this.stack.pop(); this.render(); return true;
    },
    top: function () { return this.stack[this.stack.length - 1]; },
    reset: function () { this.stack = []; this.render(); },
    render: function () {
      var host = $('#page');
      var cur = this.top();
      if (!cur) { host.hidden = true; host.innerHTML = ''; return; }
      host.hidden = false;
      host.innerHTML = '';
      var page = el('section', 'page');
      var head = el('div', 'page-head');
      var back = el('button', 'iconbtn');
      back.innerHTML = icon('back');
      back.onclick = function () { Nav.pop(); };
      head.appendChild(back);
      head.appendChild(el('div', 'page-title', typeof cur.title === 'function' ? cur.title() : (cur.title || '')));
      if (cur.action) {
        var a = el('button', 'iconbtn');
        a.innerHTML = icon(cur.action.icon);
        a.onclick = function () { cur.action.run(); };
        head.appendChild(a);
      }
      page.appendChild(head);
      var body = el('div', 'page-body');
      page.appendChild(body);
      host.appendChild(page);
      cur.build(body);
    }
  };

  function handleBack() {
    if (!$('#sheet').hidden) { Sheet.close(); return true; }
    if (Nav.stack.length) { Nav.pop(); return true; }
    if ($('#drawer').classList.contains('open')) { closeDrawer(); return true; }
    return false;
  }

  function openDrawer() {
    $('#drawer').classList.add('open');
    $('#scrim').classList.add('on');
  }
  function closeDrawer() {
    $('#drawer').classList.remove('open');
    $('#scrim').classList.remove('on');
  }

  /* -------------------------------------------------------- browser http */
  var WebHttp = {
    live: {},
    stream: function (id, method, url, headers, body) {
      var ctl = new AbortController();
      this.live[id] = ctl;
      var self = this;
      fetch(url, { method: method, headers: headers, body: body || undefined, signal: ctl.signal })
        .then(function (r) {
          window.__http.onStatus(id, r.status);
          if (r.status >= 400) return r.text().then(function (t) { window.__http.onErr(id, 'HTTP ' + r.status + '\n' + t); });
          var reader = r.body.getReader();
          var dec = new TextDecoder();
          function pump() {
            return reader.read().then(function (res) {
              if (res.done) { window.__http.onDone(id); return; }
              window.__http.onChunk(id, dec.decode(res.value, { stream: true }));
              return pump();
            });
          }
          return pump();
        })
        .catch(function (e) { window.__http.onErr(id, String(e && e.message || e)); })
        .then(function () { delete self.live[id]; });
    },
    fetch: function (id, method, url, headers, body) {
      var ctl = new AbortController();
      this.live[id] = ctl;
      var self = this;
      fetch(url, { method: method, headers: headers, body: body || undefined, signal: ctl.signal })
        .then(function (r) { return r.text().then(function (t) { window.__http.onResp(id, r.status, t); }); })
        .catch(function (e) { window.__http.onErr(id, String(e && e.message || e)); })
        .then(function () { delete self.live[id]; });
    },
    cancel: function (id) { if (this.live[id]) this.live[id].abort(); }
  };

  /* -------------------------------------------------------------- export */
  App.P = P;
  App.$ = $; App.$$ = $$; App.el = el; App.esc = esc; App.uid = uid;
  App.clamp = clamp; App.fmtNum = fmtNum; App.fmtSize = fmtSize; App.fmtTime = fmtTime;
  App.icon = icon; App.debounce = debounce;
  App.S = S;
  App.Store = {
    loadSettings: loadSettings, saveSettings: saveSettings,
    loadIndex: loadIndex, saveIndex: saveIndex,
    loadConv: loadConv, saveConv: saveConv, deleteConv: deleteConv,
    newConv: newConv, DEFAULT_SETTINGS: DEFAULT_SETTINGS
  };
  App.Theme = { apply: applyTheme, isDark: resolveDark };
  App.Nav = Nav;
  App.Sheet = Sheet;
  App.toast = toast;
  App.confirmBox = confirmBox;
  App.promptBox = promptBox;
  App.openDrawer = openDrawer;
  App.closeDrawer = closeDrawer;
  App.handleBack = handleBack;
  App.WebHttp = WebHttp;
})();
