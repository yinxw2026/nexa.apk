/* ============================================================
   ui.js — chat view, drawer, composer, messages
   ============================================================ */
window.App = window.App || {};
(function () {
  'use strict';
  var P = App.P, S = App.S, $ = App.$, el = App.el, icon = App.icon;
  var U = App.UI = {};
  function T(k, a, b, c) { return App.T(k, a, b, c); }

  var TEXT_EXT = /\.(txt|md|markdown|json|xml|csv|tsv|ya?ml|js|ts|jsx|tsx|py|java|kt|c|h|cpp|cs|go|rs|rb|php|sh|bat|sql|html?|css|scss|ini|toml|conf|log|properties|gradle|env|vue|svelte|lua|r)$/i;
  var IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|heic)$/i;

  /* ------------------------------------------------------------ helpers */
  function activeProvider() {
    var s = S.settings;
    for (var i = 0; i < s.providers.length; i++) if (s.providers[i].id === s.activeProviderId) return s.providers[i];
    return s.providers[0] || null;
  }
  function reasoningOf(conv) {
    if (!conv) return { level: S.settings.reasoning || 'off', budget: S.settings.reasoningBudget || 2048 };
    return { level: conv.reasoning || 'off', budget: conv.reasoningBudget || 2048 };
  }
  function levelLabel(level) { return T('level.' + (level || 'off') + '.short'); }
  function longLevelLabel(level) { return level === 'custom' ? T('think.custom') : T('level.' + (level || 'off')); }
  function levelDesc(level) { return T('level.' + (level || 'off') + '.desc'); }
  function longPress(node, fn, ms) {
    var t = null, moved = false;
    function start() { moved = false; t = setTimeout(function () { if (!moved) fn(); }, ms || 520); }
    function cancel() { if (t) { clearTimeout(t); t = null; } }
    node.addEventListener('touchstart', start, { passive: true });
    node.addEventListener('touchend', cancel);
    node.addEventListener('touchmove', function () { moved = true; cancel(); }, { passive: true });
    node.addEventListener('touchcancel', cancel);
    node.addEventListener('mousedown', start);
    node.addEventListener('mouseup', cancel);
    node.addEventListener('mouseleave', cancel);
  }

  /* --------------------------------------------------------- file input */
  function shrinkDataUrl(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () {
        var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
        var m = Math.max(w, h);
        var k = m > 1280 ? 1280 / m : 1;
        var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
        var cv = document.createElement('canvas');
        cv.width = cw; cv.height = ch;
        var cx = cv.getContext('2d');
        cx.fillStyle = '#ffffff';
        cx.fillRect(0, 0, cw, ch);
        cx.drawImage(im, 0, 0, cw, ch);
        try { resolve(cv.toDataURL('image/jpeg', 0.82)); } catch (e) { reject(e); }
      };
      im.onerror = function () { reject(new Error('image')); };
      im.src = src;
    });
  }

  function readOneFile(f) {
    return new Promise(function (resolve) {
      var name = f.name || 'file';
      var type = f.type || '';
      var size = f.size || 0;
      if (/^image\//.test(type) || IMG_EXT.test(name)) {
        var fr = new FileReader();
        fr.onload = function () {
          var raw = String(fr.result || '');
          shrinkDataUrl(raw).then(function (d) {
            resolve({ kind: 'image', name: name, data: d, size: size });
          }, function () {
            resolve({ kind: 'image', name: name, data: raw, size: size });
          });
        };
        fr.onerror = function () { resolve({ kind: 'binary', name: name, size: size }); };
        fr.readAsDataURL(f);
        return;
      }
      var looksText = /^text\//.test(type) || /(json|xml|javascript|csv|yaml|x-sh|x-python|x-java)/.test(type) || TEXT_EXT.test(name);
      if (!looksText && size > 512 * 1024) { resolve({ kind: 'binary', name: name, size: size }); return; }
      var fr2 = new FileReader();
      fr2.onload = function () {
        var txt = String(fr2.result || '');
        if (!looksText && txt.slice(0, 4096).indexOf('\u0000') >= 0) {
          resolve({ kind: 'binary', name: name, size: size });
          return;
        }
        if (txt.length > 400000) txt = txt.slice(0, 400000) + '\n...';
        resolve({ kind: 'text', name: name, text: txt, size: size });
      };
      fr2.onerror = function () { resolve({ kind: 'binary', name: name, size: size }); };
      fr2.readAsText(f);
    });
  }

  function handleFileInput(inp) {
    var files = inp.files;
    if (!files || !files.length) return;
    var arr = Array.prototype.slice.call(files);
    Promise.all(arr.map(readOneFile)).then(function (items) {
      var added = 0;
      items.forEach(function (it) { if (it) { S.attachments.push(it); added++; } });
      renderAttachments(); updateSend();
      if (added) App.toast(T('chat.addedFiles', added));
      inp.value = '';
    });
  }

  function openFilePicker() {
    var inp = $('#file-input');
    inp.value = '';
    inp.click();
  }

  /* ------------------------------------------------------------- render */
  function scrollBottom(force) {
    var s = $('#stream');
    if (!s) return;
    var near = s.scrollHeight - s.scrollTop - s.clientHeight < 160;
    if (force || near) s.scrollTop = s.scrollHeight;
  }

  function renderTitle() {
    $('#chat-title').textContent = (S.conv && S.conv.title) ? S.conv.title : T('chat.new');
  }

  function renderChip() {
    var p = activeProvider();
    var label = $('#chip-model');
    var m = (S.conv && S.conv.model) || S.settings.activeModel || '';
    if (!p) label.textContent = T('drawer.noProvider');
    else if (!m) label.textContent = p.name + ' · ' + T('drawer.noModel');
    else label.textContent = m;
    $('#chip-model').parentNode.classList.toggle('on', !!p);
  }

  function renderProviderRow() {
    var p = activeProvider();
    $('#provider-avatar').textContent = p ? (p.name || 'N').slice(0, 1) : 'N';
    $('#provider-name').textContent = p ? p.name : T('drawer.noProvider');
    var m = S.settings.activeModel || '';
    $('#provider-sub').textContent = p ? (m || ((p.models || [])[0] || T('drawer.noModel'))) : T('drawer.providerSub');
  }

  function renderThinkCap() {
    var cap = $('#think-cap');
    if (!cap) return;
    var r = reasoningOf(S.conv);
    cap.textContent = levelLabel(r.level);
    $('#btn-think').classList.toggle('on', r.level !== 'off');
    $('#btn-web').classList.toggle('on', !!(S.conv && S.conv.webSearch));
  }

  function attachmentStrip(atts) {
    var box = el('div', 'attach-inline');
    (atts || []).forEach(function (a) {
      if (a.kind === 'image') {
        var im = el('img', 'attach-thumb');
        im.src = a.data;
        box.appendChild(im);
      } else {
        var c = el('span', 'attach-file');
        c.innerHTML = icon('doc', 'i12');
        c.appendChild(el('span', null, a.name || T('chat.file')));
        box.appendChild(c);
      }
    });
    return box;
  }

  function buildThink(m) {
    var th = el('div', 'think');
    if (m.reason) th.classList.add('show');
    if (m.thinkOpen) th.classList.add('open');
    var head = el('div', 'think-head');
    head.innerHTML = icon('brain', 'i12');
    head.appendChild(el('span', null, T('chat.reasoning')));
    head.appendChild(el('span', 'grow'));
    var tog = el('span', 'think-toggle');
    tog.innerHTML = '<span class="tlabel"></span>' + icon('down', 'i12');
    head.appendChild(tog);
    var tb = el('div', 'think-body');
    tb.textContent = m.reason || '';
    th.__body = tb;
    function sync() {
      var open = th.classList.contains('open');
      var lab = tog.querySelector('.tlabel');
      if (lab) lab.textContent = open ? T('chat.collapse') : T('chat.expand');
      var sv = tog.querySelector('svg');
      if (sv) sv.style.transform = open ? 'rotate(180deg)' : '';
      if (!open) tb.scrollTop = tb.scrollHeight;
    }
    head.onclick = function () {
      m.thinkOpen = th.classList.toggle('open');
      sync();
    };
    th.appendChild(head);
    th.appendChild(tb);
    sync();
    setTimeout(function () {
      if (!th.classList.contains('open')) tb.scrollTop = tb.scrollHeight;
    }, 0);
    return th;
  }

  function messageNode(m, streaming) {
    var wrap = el('div', 'msg ' + (m.role === 'user' ? 'user' : 'ai') + (m.err ? ' error' : ''));
    wrap.dataset.id = m.id;
    var body = el('div', 'msg-body');

    if (m.role === 'user') {
      if (m.attachments && m.attachments.length) body.appendChild(attachmentStrip(m.attachments));
      if (m.content) {
        var t = el('div');
        t.style.whiteSpace = 'pre-wrap';
        t.textContent = m.content;
        body.appendChild(t);
      }
    } else {
      if (m.reason) body.appendChild(buildThink(m));
      if (m.content) {
        var mdBox = el('div', 'md');
        mdBox.dataset.md = '1';
        mdBox.innerHTML = App.md(m.content || '');
        body.appendChild(mdBox);
        if (streaming) mdBox.appendChild(el('span', 'cursor'));
      } else if (streaming) {
        var mdEmpty = el('div', 'md');
        mdEmpty.dataset.md = '1';
        mdEmpty.appendChild(el('span', 'cursor'));
        body.appendChild(mdEmpty);
      }
      if (m.err) body.appendChild(el('div', 'err-note', m.err));
      if (m.notice) body.appendChild(el('div', 'msg-note', m.notice));
    }
    wrap.appendChild(body);

    if (m.role === 'assistant' && !m.err) {
      var bits = [];
      if (m.usage && m.usage.total) bits.push(App.fmtNum(m.usage.total) + ' tokens');
      if (m.ms) bits.push((m.ms / 1000).toFixed(1) + 's');
      if (bits.length && !streaming) wrap.appendChild(el('div', 'msg-meta', bits.join(' · ')));
    }

    if ((!streaming || m.role === 'user') && !m.err) {
      var acts = el('div', 'msg-actions');
      if (m.role === 'assistant') {
        acts.appendChild(actionBtn('copy', T('chat.copy'), function () { P.copy(m.content || ''); App.toast(T('c.copied')); }));
        acts.appendChild(actionBtn('refresh', T('chat.regen'), function () { regenerate(m.id); }));
        acts.appendChild(actionBtn('share', T('chat.share'), function () { P.share(m.content || ''); }));
      } else {
        acts.appendChild(actionBtn('copy', T('chat.copy'), function () { P.copy(m.content || ''); App.toast(T('c.copied')); }));
      }
      wrap.appendChild(acts);
    }
    return wrap;
  }

  function actionBtn(ic, title, fn) {
    var b = el('button', 'iconbtn');
    b.innerHTML = icon(ic, 'i16');
    b.title = title;
    b.onclick = fn;
    return b;
  }

  function renderStream() {
    var inner = $('#stream-inner');
    inner.innerHTML = '';
    var msgs = (S.conv && S.conv.messages) || [];
    if (!msgs.length) inner.appendChild(emptyState());
    else msgs.forEach(function (m) { inner.appendChild(messageNode(m, false)); });
  }

  function emptyState() {
    var e = el('div', 'empty');
    var lg = el('div', 'empty-logo');
    lg.innerHTML = icon('brain');
    e.appendChild(lg);
    e.appendChild(el('h2', null, T('chat.empty.title')));
    e.appendChild(el('p', null, T('chat.empty.desc')));
    var tips = el('div');
    var p = activeProvider();
    if (!p) {
      var q0 = el('button', 'quick', T('chat.empty.addProvider'));
      q0.onclick = function () { App.Settings.openProviderEdit(null); };
      tips.appendChild(q0);
    } else if (!(S.conv && S.conv.model)) {
      var q1 = el('button', 'quick', T('chat.empty.pickModel'));
      q1.onclick = pickModel;
      tips.appendChild(q1);
    }
    [['chat.q1', 'chat.q1p'], ['chat.q2', 'chat.q2p'], ['chat.q3', 'chat.q3p']].forEach(function (x) {
      var q = el('button', 'quick', T(x[0]));
      q.onclick = function () { $('#input').value = T(x[1]); autoGrow(); updateSend(); $('#input').focus(); };
      tips.appendChild(q);
    });
    e.appendChild(tips);
    return e;
  }

  /* ------------------------------------------------- searching indicator */
  var thinkTick = {};
  function msgBody(ai) {
    var node = $('#stream-inner').querySelector('[data-id="' + ai.id + '"]');
    return node ? node.querySelector('.msg-body') : null;
  }
  function ensureThinkBox(ai) {
    var body = msgBody(ai);
    if (!body) return null;
    var th = body.querySelector('.think');
    if (!th) {
      th = buildThink(ai);
      var md = body.querySelector('.md');
      body.insertBefore(th, md || body.firstChild);
    }
    th.classList.add('show');
    return th;
  }
  function paintReason(ai) {
    var th = ensureThinkBox(ai);
    if (!th) return;
    var tb = th.__body;
    if (!tb) return;
    tb.textContent = ai.reason || '';
    if (!th.classList.contains('open')) tb.scrollTop = tb.scrollHeight;
  }
  function appendReason(ai, chunk) {
    ai.reason = (ai.reason || '') + chunk;
    var now = Date.now();
    if (thinkTick[ai.id] && now - thinkTick[ai.id] < 90) return;
    thinkTick[ai.id] = now;
    paintReason(ai);
  }
  function showSearching(ai) {
    var body = msgBody(ai);
    if (!body || body.querySelector('.searching')) return;
    var s = el('div', 'searching');
    s.appendChild(el('span', 'dot'));
    s.appendChild(el('span', null, T('chat.searching')));
    body.insertBefore(s, body.firstChild);
  }
  function hideSearching(ai) {
    var body = msgBody(ai);
    if (!body) return;
    var s = body.querySelector('.searching');
    if (s) s.remove();
  }

  /* ------------------------------------------------------------ composer */
  function autoGrow() {
    var t = $('#input');
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 132) + 'px';
  }
  function updateSend() {
    var t = $('#input').value.trim();
    var b = $('#btn-send');
    if (S.streaming) {
      b.classList.remove('off'); b.classList.add('stop');
      b.innerHTML = icon('stop');
    } else {
      b.classList.remove('stop');
      b.classList.toggle('off', !t && !S.attachments.length);
      b.innerHTML = icon('arrow-up');
    }
  }
  function renderAttachments() {
    var row = $('#attach-row');
    row.innerHTML = '';
    S.attachments.forEach(function (a, i) {
      var c = el('div', 'attach-chip');
      if (a.kind === 'image') {
        var im = el('img'); im.src = a.data; c.appendChild(im);
      } else {
        c.innerHTML = icon('doc', 'i16');
      }
      var g = el('span');
      g.appendChild(el('div', 'nm', a.name || T('chat.file')));
      g.appendChild(el('div', 'tg', a.kind === 'binary' ? App.fmtSize(a.size) : (a.kind === 'image' ? 'image' : 'text')));
      c.appendChild(g);
      var rm = el('button', 'rm');
      rm.innerHTML = icon('x', 'i12');
      rm.onclick = function () { S.attachments.splice(i, 1); renderAttachments(); updateSend(); };
      c.appendChild(rm);
      row.appendChild(c);
    });
  }

  /* -------------------------------------------------------------- drawer */
  function renderDrawer() {
    var list = $('#conv-list');
    list.innerHTML = '';
    var q = ($('#conv-search').value || '').trim().toLowerCase();
    var items = S.index.filter(function (c) {
      if (!q) return true;
      return (c.title || T('chat.new')).toLowerCase().indexOf(q) >= 0;
    });
    if (!items.length) list.appendChild(el('div', 'conv-empty', q ? T('drawer.noMatch') : T('drawer.noConv')));
    var groups = {}, order = [];
    items.forEach(function (c) {
      var d = new Date(c.updatedAt || 0);
      var now = new Date();
      var key;
      if (d.toDateString() === now.toDateString()) key = T('drawer.today');
      else {
        var y = new Date(now.getTime() - 86400000);
        if (d.toDateString() === y.toDateString()) key = T('drawer.yesterday');
        else if (d.getFullYear() === now.getFullYear()) key = T('drawer.month', d.getMonth() + 1);
        else key = T('drawer.year', d.getFullYear());
      }
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(c);
    });
    order.forEach(function (k) {
      list.appendChild(el('div', 'conv-group', k));
      groups[k].forEach(function (c) {
        var it = el('div', 'conv-item' + (S.conv && S.conv.id === c.id ? ' active' : ''));
        it.appendChild(el('span', 't', c.title || T('chat.new')));
        it.onclick = function () { App.closeDrawer(); openConversation(c.id); };
        longPress(it, function () { convMenu(c); });
        list.appendChild(it);
      });
    });
  }

  function convMenu(c) {
    App.Sheet.open({
      title: c.title || T('chat.new'),
      build: function (body) {
        App.Settings.optRow(body, 'edit', T('c.rename'), function () {
          App.Sheet.close();
          App.promptBox({ title: T('c.rename'), value: c.title || '' }).then(function (v) {
            if (v == null) return;
            c.title = v.trim() || T('chat.new');
            var conv = App.Store.loadConv(c.id);
            if (conv) { conv.title = c.title; App.Store.saveConv(conv); }
            App.Store.saveIndex();
            renderDrawer(); renderTitle();
          });
        });
        App.Settings.optRow(body, 'trash', T('c.delete'), function () {
          App.Sheet.close();
          App.confirmBox({ title: T('c.delete'), sub: c.title || T('chat.new'), danger: true, okText: T('c.delete') })
            .then(function (ok) {
              if (!ok) return;
              App.Store.deleteConv(c.id);
              if (S.conv && S.conv.id === c.id) { S.conv = null; openConversation(null); }
              renderDrawer();
            });
        }, true);
      }
    });
  }

  /* --------------------------------------------------------- conversation */
  function openConversation(id) {
    if (S.streaming) stopStream();
    S.conv = id ? (App.Store.loadConv(id) || App.Store.newConv()) : App.Store.newConv();
    S.attachments = [];
    renderTitle(); renderChip(); renderStream(); renderAttachments(); renderThinkCap();
    S.index = App.Store.loadIndex();
    renderDrawer();
    scrollBottom(true);
  }

  function newConversation() {
    App.closeDrawer();
    openConversation(null);
  }

  /* ------------------------------------------------------------ pickers */
  function modelTags(name) {
    var tags = [{ t: 'Chat', acc: true }];
    if (/reason|think|o1|o3|o4|r1|qwq|glm-4\.5|k2|deepseek-r/i.test(name)) tags.push({ t: 'Reasoning' });
    if (/vl|vision|omni|4o|gemini|claude|glm-4v|qwen-vl/i.test(name)) tags.push({ t: 'Vision' });
    if (!/embed|rerank|tts|whisper|image|dall|moderation/i.test(name)) tags.push({ t: 'Tools' });
    return tags.slice(0, 3);
  }
  function isFav(pid, m) { return (S.settings.favorites || []).indexOf(pid + '::' + m) >= 0; }
  function toggleFav(pid, m) {
    var f = S.settings.favorites || (S.settings.favorites = []);
    var k = pid + '::' + m;
    var i = f.indexOf(k);
    if (i >= 0) f.splice(i, 1); else f.push(k);
    App.Store.saveSettings();
  }

  function pickModel() {
    var provs = S.settings.providers;
    if (!provs.length) { App.Settings.openProviderEdit(null); return; }
    App.Sheet.open({
      tight: true,
      build: function (body) {
        var sw = el('div', 'msheet-search');
        var box = el('div', 'searchbox');
        box.innerHTML = icon('search');
        var inp = el('input');
        inp.placeholder = T('model.search');
        box.appendChild(inp);
        sw.appendChild(box);
        body.appendChild(sw);
        var listWrap = el('div');
        listWrap.style.padding = '0 8px 10px';
        body.appendChild(listWrap);
        var foot = el('div', 'btn-row');
        var mg = el('button', 'btn ghost block', T('model.manage'));
        mg.onclick = function () { App.Sheet.close(); App.Settings.openProviders(); };
        foot.appendChild(mg);
        body.appendChild(foot);

        function render() {
          var q = (inp.value || '').trim().toLowerCase();
          listWrap.innerHTML = '';
          var cur = S.conv ? S.conv.model : S.settings.activeModel;
          var any = false;
          function row(pid, pname, m) {
            var on = cur === m && S.settings.activeProviderId === pid;
            var r = el('div', 'mrow' + (on ? ' on' : ''));
            r.appendChild(el('span', 'mavatar', (pname || 'N').slice(0, 1)));
            var g = el('span', 'grow');
            g.appendChild(el('div', 'mname', m));
            var tg = el('div', 'mtags');
            modelTags(m).forEach(function (t) { tg.appendChild(el('span', 'tag' + (t.acc ? ' acc' : ''), t.t)); });
            g.appendChild(tg);
            r.appendChild(g);
            var fav = el('button', 'fav' + (isFav(pid, m) ? ' on' : ''));
            fav.innerHTML = icon('heart', 'i18');
            fav.onclick = function (ev) { ev.stopPropagation(); toggleFav(pid, m); fav.classList.toggle('on'); };
            r.appendChild(fav);
            r.onclick = function () {
              S.settings.activeProviderId = pid;
              S.settings.activeModel = m;
              App.Store.saveSettings();
              if (S.conv) { S.conv.providerId = pid; S.conv.model = m; App.Store.saveConv(S.conv); }
              App.Sheet.close();
              renderChip(); renderProviderRow();
              if (!S.streaming) renderStream();
            };
            listWrap.appendChild(r);
            any = true;
          }
          var favs = [];
          provs.forEach(function (p) {
            (p.models || []).forEach(function (m) { if (isFav(p.id, m)) favs.push([p, m]); });
          });
          var favShown = favs.filter(function (x) {
            return !q || x[1].toLowerCase().indexOf(q) >= 0 || (x[0].name || '').toLowerCase().indexOf(q) >= 0;
          });
          if (favShown.length) {
            listWrap.appendChild(el('div', 'mgroup', 'Favorites'));
            favShown.forEach(function (x) { row(x[0].id, x[0].name, x[1]); });
          }
          provs.forEach(function (p) {
            var models = (p.models || []).filter(function (m) {
              if (!q) return true;
              return m.toLowerCase().indexOf(q) >= 0 || (p.name || '').toLowerCase().indexOf(q) >= 0;
            });
            if (!models.length) return;
            listWrap.appendChild(el('div', 'mgroup', p.name));
            models.forEach(function (m) { row(p.id, p.name, m); });
          });
          if (!any) listWrap.appendChild(el('div', 'conv-empty', T('model.empty')));
        }
        inp.oninput = render;
        render();
        setTimeout(function () { try { inp.focus(); } catch (e) {} }, 80);
      }
    });
  }

  function pickProvider() {
    App.Sheet.open({
      title: T('provider.switch'),
      build: function (body) {
        (S.settings.providers || []).forEach(function (p) {
          var cur = S.settings.activeProviderId === p.id;
          var o = el('div', 'opt' + (cur ? ' on' : ''));
          o.appendChild(el('span', 'avatar', (p.name || 'N').slice(0, 1)));
          var g = el('span', 'grow');
          g.appendChild(document.createTextNode(p.name));
          g.appendChild(el('span', 'sub', (p.models || []).join(' / ') || T('model.none')));
          o.appendChild(g);
          if (cur) { var c = el('span'); c.innerHTML = icon('check', 'i12'); o.appendChild(c); }
          o.onclick = function () {
            S.settings.activeProviderId = p.id;
            var models = p.models || [];
            S.settings.activeModel = models.indexOf(S.settings.activeModel) >= 0 ? S.settings.activeModel : (models[0] || '');
            App.Store.saveSettings();
            App.Sheet.close();
            if (S.conv) { S.conv.providerId = p.id; S.conv.model = S.settings.activeModel; App.Store.saveConv(S.conv); }
            renderChip(); renderProviderRow();
          };
          body.appendChild(o);
        });
        var row = el('div', 'btn-row');
        var b = el('button', 'btn ghost block', T('provider.manage'));
        b.onclick = function () { App.Sheet.close(); App.Settings.openProviders(); };
        row.appendChild(b);
        body.appendChild(row);
      }
    });
  }

  /* ------------------------------------------------------ reasoning slide */
  function setReasoning(level, custom) {
    if (custom != null) {
      S.settings.reasoningBudget = custom;
      if (S.conv) S.conv.reasoningBudget = custom;
    }
    S.settings.reasoning = level;
    if (S.conv) S.conv.reasoning = level;
    App.Store.saveSettings();
    if (S.conv) App.Store.saveConv(S.conv);
    renderThinkCap();
  }

  function pickReasoning() {
    var levels = App.API.LEVELS;
    var n = levels.length;
    var cur = reasoningOf(S.conv);
    var startIdx = levels.indexOf(cur.level === 'custom' ? 'mid' : cur.level);
    if (startIdx < 0) startIdx = 0;

    App.Sheet.open({
      tight: true,
      build: function (body) {
        var top = el('div', 'think-top');
        var nameEl = el('div', 'think-name');
        var descEl = el('div', 'think-desc');
        var budgetEl = el('div', 'think-budget');
        top.appendChild(nameEl);
        top.appendChild(descEl);
        top.appendChild(budgetEl);
        body.appendChild(top);

        var sl = el('div', 'think-slider');
        var track = el('div', 'track');
        var fill = el('div', 'fill');
        track.appendChild(fill);
        var dots = el('div', 'dots');
        var dotEls = [];
        for (var i = 0; i < n; i++) { var dd = el('i'); dots.appendChild(dd); dotEls.push(dd); }
        var inp = document.createElement('input');
        inp.type = 'range';
        inp.min = '0'; inp.max = String(n - 1); inp.step = '1';
        inp.value = String(startIdx);
        sl.appendChild(track);
        sl.appendChild(dots);
        sl.appendChild(inp);
        body.appendChild(sl);

        body.appendChild(el('div', 'think-sep'));
        var row = el('div', 'think-custom');
        var ic = el('span', 'item-ic'); ic.innerHTML = icon('layers', 'i18');
        row.appendChild(ic);
        var g = el('span', 'grow');
        g.appendChild(el('div', 'item-label', T('think.custom')));
        var subEl = el('div', 'item-val');
        subEl.style.cssText = 'display:block;max-width:none;text-align:left;font-size:12px';
        g.appendChild(subEl);
        row.appendChild(g);
        var chev = el('span'); chev.innerHTML = icon('right', 'i12');
        row.appendChild(chev);
        body.appendChild(row);

        function paint(level, customBudget) {
          var budget = App.API.budgetOf(level, customBudget);
          nameEl.innerHTML = icon('brain', 'i18') + '<span>' + App.esc(longLevelLabel(level)) + '</span>';
          descEl.textContent = levelDesc(level === 'custom' ? 'mid' : level);
          budgetEl.textContent = budget > 0 ? '≈ ' + budget + ' tokens' : '';
          var pos;
          if (level === 'custom') {
            pos = budget >= 16384 ? 4 : budget >= 8192 ? 3 : budget >= 4096 ? 2 : budget > 0 ? 1 : 0;
          } else {
            pos = levels.indexOf(level);
          }
          if (pos < 0) pos = 0;
          fill.style.width = (pos / (n - 1) * 100) + '%';
          dotEls.forEach(function (d, i) {
            d.classList.toggle('past', i <= pos);
            d.classList.toggle('at', i === pos);
          });
          subEl.textContent = T('think.customSub', customBudget);
        }

        inp.oninput = function () {
          var lv = levels[parseInt(inp.value, 10)] || 'off';
          var rr = reasoningOf(S.conv);
          setReasoning(lv);
          var budget = App.API.budgetOf(lv, rr.budget);
          paint(lv, rr.budget);
          nameEl.style.transition = 'none';
          setTimeout(function () { nameEl.style.transition = ''; }, 20);
          budgetEl.style.transform = 'scale(1.06)';
          setTimeout(function () { budgetEl.style.transform = ''; }, 140);
          if (budget === 0) { /* off */ }
        };

        row.onclick = function () {
          var rr = reasoningOf(S.conv);
          App.promptBox({
            title: T('think.customTitle'),
            value: String(rr.budget),
            placeholder: T('think.customPh'),
            number: true
          }).then(function (v) {
            if (v == null) return;
            var num = parseInt(v, 10);
            if (isNaN(num) || num < 0) return;
            num = App.clamp(num, 0, 200000);
            setReasoning('custom', num);
            paint('custom', num);
            inp.value = String(num >= 16384 ? 4 : num >= 8192 ? 3 : num >= 4096 ? 2 : num > 0 ? 1 : 0);
          });
        };

        paint(cur.level, cur.budget);
      }
    });
  }

  /* ---------------------------------------------------------------- send */
  function stopStream() {
    if (!S.streaming) return;
    var st = S.streaming;
    S.streaming = null;
    try { if (st.handle) st.handle.abort(); } catch (e) {}
    var m = findMsg(st.msgId);
    if (m) {
      var mb = msgBody(m);
      var s = mb && mb.querySelector('.searching');
      if (s) s.remove();
      m.content = (m.content || '') + (m.content ? '\n\n' : '') + T('chat.stopped');
    }
    renderStream(); updateSend(); renderThinkCap();
  }

  function findMsg(id) {
    if (!S.conv) return null;
    for (var i = 0; i < S.conv.messages.length; i++) if (S.conv.messages[i].id === id) return S.conv.messages[i];
    return null;
  }

  function historyMessages(conv, uptoId) {
    var out = [];
    var limit = S.settings.historyLimit || 24;
    var src = conv.messages.filter(function (m) { return m.content && !m.err; });
    if (uptoId) {
      var idx = -1;
      for (var i = 0; i < src.length; i++) if (src[i].id === uptoId) { idx = i; break; }
      if (idx >= 0) src = src.slice(0, idx);
    }
    src = src.slice(-limit);
    src.forEach(function (m) {
      out.push({ role: m.role, content: m.content, attachments: m.attachments });
    });
    return out;
  }

  function systemText(conv) {
    var parts = [];
    if (S.settings.systemPrompt) parts.push(S.settings.systemPrompt);
    if (conv && conv.webSearch && S.settings.tellSearchLimit) {
      var n = App.clamp(parseInt(S.settings.maxSearchRounds, 10) || 4, 1, 10);
      parts.push(T('sys.searchBudget', n));
    }
    return parts.join('\n\n');
  }

  function send() {
    if (S.streaming) { stopStream(); return; }
    var input = $('#input');
    var text = input.value.trim();
    if (!text && !S.attachments.length) return;
    var p = activeProvider();
    if (!p) { App.toast(T('chat.needProvider')); App.Settings.openProviderEdit(null); return; }
    if (!S.conv) openConversation(null);
    if (!S.conv.model) { pickModel(); return; }

    var msg = {
      id: App.uid('m'), role: 'user', content: text,
      attachments: S.attachments.slice(), ts: Date.now()
    };
    S.conv.messages.push(msg);
    if (!S.conv.title) {
      S.conv.title = (text || (S.attachments[0] && S.attachments[0].name) || T('chat.new')).slice(0, 34);
      renderTitle();
    }
    S.conv.providerId = p.id;
    input.value = '';
    autoGrow();
    S.attachments = [];
    renderAttachments();
    App.Store.saveConv(S.conv);
    renderStream();
    scrollBottom(true);
    updateSend();
    runCompletion();
  }

  function runCompletion() {
    var conv = S.conv;
    var prov = activeProvider();
    var model = conv.model || S.settings.activeModel;
    if (!prov) return;
    var r = reasoningOf(conv);

    var started = Date.now();
    var ai = { id: App.uid('m'), role: 'assistant', content: '', reason: '', ts: Date.now() };
    conv.messages.push(ai);
    renderStream();
    scrollBottom(true);

    var node = $('#stream-inner').querySelector('[data-id="' + ai.id + '"]');
    var mdBox = node ? node.querySelector('[data-md]') : null;
    var lastPaint = 0;

    function paint(force) {
      if (!mdBox) return;
      var now = Date.now();
      if (!force && now - lastPaint < 110) return;
      lastPaint = now;
      if ((ai.content || '').length > 14000) {
        mdBox.textContent = ai.content;
        mdBox.appendChild(el('span', 'cursor'));
      } else {
        mdBox.innerHTML = App.md(ai.content || '');
        mdBox.appendChild(el('span', 'cursor'));
      }
      scrollBottom(false);
    }
    paint(true);

    var done = false;
    function finish(err, notice) {
      if (done) return;
      done = true;
      S.streaming = null;
      hideSearching(ai);
      ai.ms = Date.now() - started;
      if (err) ai.err = err;
      if (notice) {
        if (ai.content) ai.notice = notice;
        else ai.content = notice;      // 让这一轮仍进入下一轮的历史
      }
      if (ai.reason) paintReason(ai);
      if (ai.usage) App.Stats.add(model, ai.usage);
      App.Store.saveConv(conv);
      renderStream();
      updateSend(); renderThinkCap(); renderDrawer();
    }

    S.streaming = { msgId: ai.id, handle: null };
    updateSend();

    var opts = {
      provider: prov,
      model: model,
      messages: historyMessages(conv, ai.id),
      system: systemText(conv),
      reasoning: r.level,
      customBudget: r.budget,
      budget: App.API.budgetOf(r.level, r.budget),
      temperature: S.settings.temperature,
      maxRounds: App.clamp(parseInt(S.settings.maxSearchRounds, 10) || 4, 1, 10),
      tools: conv.webSearch ? [App.API.WEB_SEARCH_TOOL] : null,
      executeTool: function (name, args) {
        if (name !== 'web_search') return Promise.reject(new Error('unsupported tool: ' + name));
        var q = (args && args.query) ? String(args.query) : lastUserText(conv, ai.id);
        if (!q) return Promise.resolve('No query given.');
        return App.API.webSearch(q, {
          provider: S.settings.searchProvider,
          count: S.settings.searchCount,
          tavilyKey: S.settings.tavilyKey,
          searxUrl: S.settings.searxUrl
        }).then(function (list) { return App.API.toolResult(list); });
      },
      onToolStart: function () { paint(true); showSearching(ai); },
      onToolEnd: function () { hideSearching(ai); },
      onDelta: function (t) { ai.content += t; paint(false); },
      onReason: function (t) { appendReason(ai, t); },
      onUsage: function (u) { ai.usage = u; },
      onError: function (msg) { finish(prettyError(msg)); },
      onLimit: function (n) { finish(null, T('chat.limited', n)); },
      onStatus: function () {},
      onDone: function () { paint(true); finish(null); }
    };

    var h = App.API.agent(opts);
    if (S.streaming) S.streaming.handle = h; else h.abort();
  }

  function lastUserText(conv, beforeId) {
    for (var i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].id === beforeId) continue;
      if (conv.messages[i].role === 'user') return conv.messages[i].content || '';
    }
    return '';
  }

  function prettyError(msg) {
    var m = String(msg || '');
    function wrap(k) { return T(k) + '\n\n' + m; }
    if (/401/.test(m)) return wrap('err.401');
    if (/402/.test(m)) return wrap('err.402');
    if (/403/.test(m)) return wrap('err.403');
    if (/404/.test(m)) return wrap('err.404');
    if (/400/.test(m)) return wrap('err.400');
    if (/429/.test(m)) return wrap('err.429');
    if (/5\d\d/.test(m)) return wrap('err.5xx');
    if (/timeout|timed out|SocketTimeout|ETIMEDOUT/i.test(m)) return wrap('err.timeout');
    if (/Unable to resolve host|UnknownHost|ENOTFOUND/i.test(m)) return wrap('err.dns');
    if (/Failed to connect|Connection refused|ECONNREFUSED|ECONNRESET|connect failed|Failed to fetch/i.test(m)) return wrap('err.refused');
    if (/certificate|SSL|Trust/i.test(m)) return wrap('err.tls');
    return m;
  }

  function regenerate(assistantId) {
    if (S.streaming) { App.toast(T('chat.generating')); return; }
    var conv = S.conv;
    if (!conv) return;
    var idx = -1;
    for (var i = 0; i < conv.messages.length; i++) if (conv.messages[i].id === assistantId) { idx = i; break; }
    if (idx < 0) return;
    conv.messages.splice(idx);
    App.Store.saveConv(conv);
    renderStream();
    runCompletion();
  }

  /* --------------------------------------------------------- native hooks */
  window.__native = { onReady: function () {} };

  /* ---------------------------------------------------------------- init */
  U.init = function () {
    $('#btn-drawer').onclick = function () { renderDrawer(); App.openDrawer(); };
    $('#scrim').onclick = function () { App.closeDrawer(); };
    $('#btn-newchat').onclick = newConversation;
    $('#btn-refresh-list').onclick = function () { S.index = App.Store.loadIndex(); renderDrawer(); App.toast(T('c.refresh')); };
    $('#btn-model').onclick = pickModel;
    $('#btn-provider').onclick = pickProvider;
    $('#btn-settings').onclick = function () { App.closeDrawer(); App.Settings.openSettings(); };
    $('#btn-lang').onclick = function () { U.toggleLang(); };
    $('#btn-theme').onclick = function () {
      var order = ['system', 'light', 'dark'];
      var cur = S.settings.theme || 'system';
      var next = order[(order.indexOf(cur) + 1) % 3];
      S.settings.theme = next;
      App.Store.saveSettings();
      App.Theme.apply();
      syncThemeIcon();
      App.toast(T('set.theme') + ': ' + T('set.theme.' + next));
    };
    $('#conv-search').oninput = App.debounce(renderDrawer, 150);
    $('#btn-attach').onclick = openFilePicker;
    $('#file-input').onchange = function () { handleFileInput(this); };
    $('#btn-web').onclick = function () {
      if (!S.conv) openConversation(null);
      S.conv.webSearch = !S.conv.webSearch;
      S.settings.webSearch = S.conv.webSearch;
      App.Store.saveSettings(); App.Store.saveConv(S.conv);
      renderThinkCap();
      App.toast(S.conv.webSearch ? T('chat.webOn') : T('chat.webOff'));
    };
    $('#btn-think').onclick = pickReasoning;
    $('#btn-send').onclick = send;
    $('#input').addEventListener('input', function () { autoGrow(); updateSend(); });
    $('#input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    });
    $('#stream').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.code-copy') : null;
      if (!btn) return;
      var pre = btn.closest('pre');
      var code = pre ? pre.querySelector('code') : null;
      if (code) { P.copy(code.textContent); App.toast(T('chat.codeCopied')); }
    });
  };

  function syncThemeIcon() {
    var t = S.settings.theme || 'system';
    $('#btn-theme').innerHTML = icon(t === 'dark' ? 'moon' : (t === 'light' ? 'sun' : 'monitor'));
  }
  function syncLangBtn() {
    var lang = S.settings.lang || 'zh';
    App.$$('#btn-lang span[data-lang]').forEach(function (s) {
      s.classList.toggle('on', s.getAttribute('data-lang') === lang);
    });
  }

  U.toggleLang = function () {
    var next = (S.settings.lang === 'en') ? 'zh' : 'en';
    S.settings.lang = next;
    App.Store.saveSettings();
    App.T.set(next);
    try { document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN'; } catch (e) {}
    P.setLang(next);
    App.Nav.reset();
    App.Sheet.close();
    U.renderAll();
  };

  U.syncThemeIcon = syncThemeIcon;

  U.renderAll = function () {
    syncLangBtn(); syncThemeIcon();
    $('#conv-search').placeholder = T('drawer.searchConv');
    $('#input').placeholder = T('chat.placeholder');
    $('#btn-attach').title = T('chat.attach');
    $('#btn-web').title = T('chat.web');
    $('#btn-think').title = T('chat.think');
    renderTitle(); renderChip(); renderProviderRow(); renderStream();
    renderAttachments(); renderThinkCap(); renderDrawer(); updateSend();
  };
  U.openConversation = openConversation;
  U.newConversation = newConversation;
  U.renderDrawer = renderDrawer;
  U.renderStream = renderStream;
  U.scrollBottom = scrollBottom;
  U.activeProvider = activeProvider;
  U.reasoningOf = reasoningOf;
  U.levelLabel = levelLabel;
  U.pickModel = pickModel;
  U.pickReasoning = pickReasoning;
  U.pickProvider = pickProvider;
})();
