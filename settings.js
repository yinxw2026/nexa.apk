/* ============================================================
   settings.js — providers, instructions, search, usage, docs, about
   ============================================================ */
window.App = window.App || {};
(function () {
  'use strict';
  var P = App.P, S = App.S, el = App.el, icon = App.icon;
  var St = App.Settings = {};
  function T(k, a, b, c) { return App.T(k, a, b, c); }

  /* ----------------------------------------------------------- primitives */
  function groupLabel(txt) { return el('div', 'group-label', txt); }
  function listBox() { return el('div', 'list'); }

  function item(ic, label, value, onclick, extra) {
    var it = el('div', 'item' + (extra && extra.danger ? ' danger' : ''));
    var i = el('span', 'item-ic');
    i.innerHTML = icon(ic, 'i18');
    it.appendChild(i);
    it.appendChild(el('span', 'item-label', label));
    if (value != null) it.appendChild(el('span', 'item-val', value));
    var chev = el('span');
    chev.innerHTML = icon('right', 'i12');
    it.appendChild(chev);
    if (onclick) it.onclick = onclick;
    return it;
  }

  function card(title) {
    var c = el('div', 'card');
    if (title) c.appendChild(el('h3', null, title));
    return c;
  }

  function field(label, input, hint) {
    var f = el('div', 'field');
    f.appendChild(el('label', 'field-label', label));
    f.appendChild(input);
    if (hint) f.appendChild(el('div', 'hint', hint));
    return f;
  }
  function textInput(value, placeholder, type) {
    var i = el('input');
    i.type = type || 'text';
    i.value = value == null ? '' : value;
    if (placeholder) i.placeholder = placeholder;
    return i;
  }
  function areaInput(value, placeholder, rows) {
    var a = el('textarea');
    a.value = value == null ? '' : value;
    if (placeholder) a.placeholder = placeholder;
    a.rows = rows || 5;
    return a;
  }
  function seg(options, current, onPick) {
    var box = el('div', 'seg');
    options.forEach(function (o) {
      var b = el('button', o.id === current ? 'on' : '');
      b.dataset.id = o.id;
      b.textContent = o.name;
      b.onclick = function () {
        Array.prototype.slice.call(box.children).forEach(function (c) { c.classList.remove('on'); });
        b.classList.add('on');
        onPick(o.id);
      };
      box.appendChild(b);
    });
    return box;
  }

  function optRow(body, ic, label, fn, danger) {
    var o = el('div', 'opt' + (danger ? ' danger' : ''));
    var i = el('span', 'item-ic'); i.innerHTML = icon(ic, 'i18');
    if (danger) i.style.color = 'var(--danger)';
    o.appendChild(i);
    var g = el('span', 'grow', label);
    if (danger) g.style.color = 'var(--danger)';
    o.appendChild(g);
    o.onclick = fn;
    body.appendChild(o);
    return o;
  }
  St.optRow = optRow;

  /* ------------------------------------------------------------- main page */
  St.openSettings = function () {
    App.Nav.push({
      title: T('settings.title'),
      build: function (root) {
        var inner = el('div', 'page-inner');
        root.appendChild(inner);

        inner.appendChild(groupLabel(T('group.general')));
        var g1 = listBox();
        g1.appendChild(item('palette', T('set.theme'), T('set.theme.' + (S.settings.theme || 'system')), function () {
          App.Sheet.open({
            title: T('set.theme'),
            build: function (body) {
              ['system', 'light', 'dark'].forEach(function (id) {
                var on = (S.settings.theme || 'system') === id;
                optRow(body, on ? 'check' : 'palette', T('set.theme.' + id), function () {
                  S.settings.theme = id;
                  App.Store.saveSettings();
                  App.Theme.apply();
                  App.UI.syncThemeIcon();
                  App.Sheet.close();
                  App.Nav.render();
                });
              });
            }
          });
        }));
        g1.appendChild(item('globe2', T('set.lang'), S.settings.lang === 'en' ? 'English' : '中文', function () {
          App.Sheet.open({
            title: T('set.lang'),
            build: function (body) {
              [['zh', '中文'], ['en', 'English']].forEach(function (x) {
                var on = (S.settings.lang || 'zh') === x[0];
                optRow(body, on ? 'check' : 'globe2', x[1], function () {
                  App.Sheet.close();
                  if ((S.settings.lang || 'zh') !== x[0]) App.UI.toggleLang();
                });
              });
            }
          });
        }));
        inner.appendChild(g1);

        inner.appendChild(groupLabel(T('group.model')));
        var g2 = listBox();
        g2.appendChild(item('server', T('set.providers'), T('set.count', (S.settings.providers || []).length),
          function () { St.openProviders(); }));
        var prov = App.UI.activeProvider();
        g2.appendChild(item('brain', T('set.defaultModel'),
          S.settings.activeModel || (prov ? prov.name + ' · ' + T('drawer.noModel') : T('set.notSet')),
          function () { App.UI.pickModel(); }));
        g2.appendChild(item('globe', T('set.search'), searchName() + ' · ' + (S.settings.searchCount || 5),
          function () { St.openSearch(); }));
        inner.appendChild(g2);

        inner.appendChild(groupLabel(T('group.chat')));
        var g3 = listBox();
        g3.appendChild(item('layers', T('set.instruct'),
          S.settings.systemPrompt ? String(S.settings.systemPrompt).slice(0, 16) : T('set.notSet'),
          function () { St.openInstructions(); }));
        g3.appendChild(item('refresh', T('set.context'), String(S.settings.historyLimit || 24), function () {
          App.promptBox({ title: T('set.context'), sub: T('set.contextHint'), value: String(S.settings.historyLimit || 24), number: true })
            .then(function (v) {
              if (v == null) return;
              var n = parseInt(v, 10);
              if (isNaN(n)) return;
              S.settings.historyLimit = App.clamp(n, 0, 100);
              App.Store.saveSettings(); App.Nav.render();
            });
        }));
        g3.appendChild(item('chart', T('set.temperature'), String(S.settings.temperature), function () {
          App.promptBox({ title: T('set.temperature'), sub: T('set.temperatureHint'), value: String(S.settings.temperature), number: true })
            .then(function (v) {
              if (v == null) return;
              var n = parseFloat(v);
              if (isNaN(n)) return;
              S.settings.temperature = App.clamp(n, 0, 2);
              App.Store.saveSettings(); App.Nav.render();
            });
        }));
        inner.appendChild(g3);

        inner.appendChild(groupLabel(T('group.about')));
        var g4 = listBox();
        g4.appendChild(item('chart', T('set.stats'), null, function () { St.openStats(); }));
        g4.appendChild(item('book', T('set.docs'), 'readme.md', function () { St.openReadme(); }));
        g4.appendChild(item('info', T('set.about'), 'Nexa 1.0', function () { St.openAbout(); }));
        inner.appendChild(g4);

        var foot = el('div');
        foot.style.cssText = 'text-align:center;color:var(--text-3);font-size:12px;padding:22px 0 10px;';
        foot.textContent = T('set.footer');
        inner.appendChild(foot);
      }
    });
  };

  function searchName() {
    var id = S.settings.searchProvider || 'bing';
    var e = App.API.ENGINES.filter(function (x) { return x.id === id; })[0];
    return e ? e.name : id;
  }

  /* ------------------------------------------------------------ providers */
  St.openProviders = function () {
    App.Nav.push({
      title: T('pv.title'),
      action: { icon: 'plus', run: function () { St.openProviderEdit(null); } },
      build: function (root) {
        var inner = el('div', 'page-inner');
        root.appendChild(inner);
        var provs = S.settings.providers || [];
        if (!provs.length) {
          var c = card(T('pv.empty'));
          c.appendChild(el('p', null, T('pv.emptyDesc')));
          inner.appendChild(c);
        }
        var list = listBox();
        provs.forEach(function (p) {
          var it = el('div', 'item');
          it.appendChild(el('span', 'avatar', (p.name || 'N').slice(0, 1)));
          var g = el('span', 'grow');
          var l = el('span', 'item-label', p.name);
          l.style.display = 'block';
          g.appendChild(l);
          var sub = el('span', 'item-val');
          sub.style.cssText = 'display:block;max-width:none;text-align:left;';
          sub.textContent = T('pv.sub', (p.models || []).length, p.baseUrl || T('set.notSet'));
          g.appendChild(sub);
          it.appendChild(g);
          var chev = el('span');
          chev.innerHTML = icon('right', 'i12');
          it.appendChild(chev);
          it.onclick = function () { St.openProviderEdit(p.id); };
          list.appendChild(it);
        });
        inner.appendChild(list);
        var row = el('div', 'btn-row');
        var add = el('button', 'btn block', T('pv.add'));
        add.onclick = function () { St.openProviderEdit(null); };
        row.appendChild(add);
        inner.appendChild(row);
      }
    });
  };

  St.openProviderEdit = function (id) {
    var isNew = !id;
    var src = null;
    (S.settings.providers || []).forEach(function (p) { if (p.id === id) src = p; });
    var model = src ? JSON.parse(JSON.stringify(src)) : {
      id: App.uid('p'), name: '', type: 'openai', baseUrl: '', apiKey: '',
      models: [], reasoningStyle: 'auto', extraBody: ''
    };
    if (isNew) model.models = [];
    var saveForm = null;

    App.Nav.push({
      title: isNew ? T('pe.titleAdd') : (src ? src.name : T('pe.titleEdit')),
      action: { icon: 'check', run: function () { if (saveForm) saveForm(); } },
      build: function (root) {
        var inner = el('div', 'page-inner');
        root.appendChild(inner);

        if (isNew) {
          var pc = card(T('pe.presets'));
          var pk = el('div');
          App.API.PRESETS.forEach(function (pre) {
            var b = el('button', 'quick');
            b.textContent = pre.name;
            b.style.cssText = 'display:inline-block;margin:4px 5px 0 0;padding:7px 13px;border-radius:16px;background:var(--bg-soft);font-size:13px;';
            b.onclick = function () {
              model.type = pre.type;
              model.reasoningStyle = pre.reasoning;
              nameI.value = pre.name;
              urlI.value = pre.baseUrl;
              modelsArea.value = String(pre.models || '').split('\n')
                .map(function (s) { return s.trim(); }).filter(Boolean).join('\n');
              setSegOn(typeSeg, pre.type);
              updateHint(); updatePreview();
              App.toast(T('pe.presetFilled'));
            };
            pk.appendChild(b);
          });
          pc.appendChild(pk);
          inner.appendChild(pc);
        }

        inner.appendChild(el('div', 'group-label', T('pe.basic')));
        var box = el('div', 'list');
        var nameI = textInput(model.name, T('pe.namePh'));
        box.appendChild(field(T('pe.name'), nameI));

        var typeSeg = seg(App.API.TYPES.map(function (t) { return { id: t.id, name: t.name }; }), model.type, function (v) {
          model.type = v; updateHint();
        });
        var typeField = field(T('pe.type'), typeSeg,
          (App.API.TYPES.filter(function (t) { return t.id === model.type; })[0] || {}).desc);
        var typeHint = typeField.querySelector('.hint');
        box.appendChild(typeField);

        var urlI = textInput(model.baseUrl, T('pe.baseUrlPh'));
        box.appendChild(field(T('pe.baseUrl'), urlI, T('pe.baseUrlHint')));

        var keyWrap = el('div', 'field-row');
        var keyI = textInput(model.apiKey, T('pe.keyPh'), 'password');
        var eye = el('button', 'iconbtn');
        eye.innerHTML = icon('key', 'i18');
        eye.onclick = function () { keyI.type = keyI.type === 'password' ? 'text' : 'password'; };
        keyWrap.appendChild(keyI); keyWrap.appendChild(eye);
        box.appendChild(field(T('pe.key'), keyWrap, T('pe.keyHint')));

        var modelsArea = areaInput((model.models || []).join('\n'), T('pe.modelsPh'), 5);
        modelsArea.addEventListener('input', updatePreview);
        box.appendChild(field(T('pe.models'), modelsArea, T('pe.modelsHint')));

        var fetchRow = el('div', 'field-row');
        var fetchBtn = el('button', 'btn ghost');
        fetchBtn.textContent = T('pe.fetch');
        fetchBtn.style.flex = '1';
        fetchBtn.onclick = function () {
          var prov = collect();
          if (!prov.baseUrl) { App.toast(T('pe.needUrl')); return; }
          fetchBtn.textContent = T('pe.fetching');
          fetchBtn.disabled = true;
          App.API.listModels(prov).then(function (list) {
            if (!list.length) App.toast(T('pe.fetchNone'));
            else { modelsArea.value = list.join('\n'); App.toast(T('pe.fetched', list.length)); updatePreview(); }
          }).catch(function (e) {
            App.toast(T('pe.fetchFail', String(e.message || e).slice(0, 60)));
          }).then(function () {
            fetchBtn.textContent = T('pe.fetch'); fetchBtn.disabled = false;
          });
        };
        fetchRow.appendChild(fetchBtn);
        box.appendChild(fetchRow);
        inner.appendChild(box);

        inner.appendChild(el('div', 'group-label', T('pe.think')));
        var box2 = el('div', 'list');
        var styleSeg = seg([
          { id: 'auto', name: T('pe.style.auto') },
          { id: 'effort', name: T('pe.style.effort') },
          { id: 'budget', name: T('pe.style.budget') },
          { id: 'both', name: T('pe.style.both') },
          { id: 'none', name: T('pe.style.none') }
        ], model.reasoningStyle || 'auto', function (v) { model.reasoningStyle = v; updatePreview(); });
        box2.appendChild(field(T('pe.style'), styleSeg, T('pe.styleHint')));
        var prevField = el('div', 'field');
        prevField.appendChild(el('label', 'field-label', 'Preview'));
        var prevEl = el('div', 'hint');
        prevEl.style.cssText = 'font-size:13px;color:var(--accent);line-height:1.6';
        prevField.appendChild(prevEl);
        box2.appendChild(prevField);
        inner.appendChild(box2);

        inner.appendChild(el('div', 'group-label', T('pe.advanced')));
        var box3 = el('div', 'list');
        var extraArea = areaInput(model.extraBody, T('pe.extraPh'), 4);
        box3.appendChild(field(T('pe.extra'), extraArea, T('pe.extraHint')));
        inner.appendChild(box3);

        var row = el('div', 'btn-row');
        var test = el('button', 'btn ghost block', T('pe.test'));
        test.onclick = function () {
          var prov = collect();
          if (!prov.baseUrl) { App.toast(T('pe.needUrl')); return; }
          var m = (prov.models || [])[0];
          if (!m) { App.toast(T('pe.needModel')); return; }
          test.textContent = T('pe.testing'); test.disabled = true;
          var t0 = Date.now();
          App.API.chatOnce({
            provider: prov, model: m,
            messages: [{ role: 'user', content: T('pe.testProbe') }],
            system: '', reasoning: 'off', budget: 0, temperature: 0
          }).then(function () {
            App.toast(T('pe.testOk') + ' · ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
          }).catch(function (e) {
            var mm = /HTTP (\d{3})/.exec(String(e.message || e));
            App.toast(T('pe.testFail') + (mm ? ' · ' + mm[1] : '') + ' · ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
          }).then(function () {
            test.textContent = T('pe.test'); test.disabled = false;
          });
        };
        row.appendChild(test);
        inner.appendChild(row);

        if (!isNew) {
          var row2 = el('div', 'btn-row');
          var del = el('button', 'btn danger block', T('pe.del'));
          del.onclick = function () {
            App.confirmBox({ title: T('pe.delTitle'), sub: src.name, danger: true, okText: T('c.delete') })
              .then(function (ok) {
                if (!ok) return;
                S.settings.providers = (S.settings.providers || []).filter(function (p) { return p.id !== id; });
                if (S.settings.activeProviderId === id) {
                  S.settings.activeProviderId = (S.settings.providers[0] || {}).id || '';
                  S.settings.activeModel = ((S.settings.providers[0] || {}).models || [])[0] || '';
                }
                S.settings.favorites = (S.settings.favorites || []).filter(function (k) { return k.indexOf(id + '::') !== 0; });
                App.Store.saveSettings();
                App.Nav.pop();
                if (!App.Nav.top()) St.openProviders();
                App.UI.renderAll();
              });
          };
          row2.appendChild(del);
          inner.appendChild(row2);
        }
        var spacer = el('div');
        spacer.style.height = '34px';
        inner.appendChild(spacer);

        function updateHint() {
          if (!typeHint) return;
          var t = App.API.TYPES.filter(function (x) { return x.id === model.type; })[0];
          typeHint.textContent = t ? t.desc : '';
        }

        function updatePreview() {
          var models = modelsArea.value.split(/[\n,]/).map(function (s) { return s.trim(); }).filter(Boolean);
          var sample = models[0] || '';
          var prov = { type: model.type, reasoningStyle: model.reasoningStyle, sendEffort: true };
          var r = App.UI.reasoningOf(null);
          var budget = App.API.budgetOf(r.level, r.budget);
          var will = App.API.shouldReason(prov, sample, budget);
          if (!will) { prevEl.textContent = T('pe.previewNone'); return; }
          var style = model.reasoningStyle || 'auto';
          var what;
          if (model.type === 'anthropic' || style === 'budget') what = 'thinking.budget_tokens = ' + budget;
          else if (style === 'both') what = 'reasoning_effort = ' + App.API.effortOf(r.level, budget) + ' + thinking.budget_tokens = ' + budget;
          else what = 'reasoning_effort = ' + App.API.effortOf(r.level, budget);
          prevEl.textContent = T('pe.preview', what);
        }

        function collect() {
          return {
            id: model.id,
            name: nameI.value.trim() || 'Provider',
            type: model.type,
            baseUrl: urlI.value.trim(),
            apiKey: keyI.value,
            models: modelsArea.value.split(/[\n,]/).map(function (s) { return s.trim(); }).filter(Boolean),
            reasoningStyle: model.reasoningStyle,
            extraBody: extraArea.value.trim()
          };
        }

        function save() {
          var p = collect();
          if (!p.baseUrl) { App.toast(T('pe.needUrl')); return; }
          if (isNew) S.settings.providers.push(p);
          else {
            for (var i = 0; i < S.settings.providers.length; i++) {
              if (S.settings.providers[i].id === p.id) S.settings.providers[i] = p;
            }
          }
          if (!S.settings.activeProviderId) {
            S.settings.activeProviderId = p.id;
            S.settings.activeModel = (p.models || [])[0] || '';
          }
          if (S.settings.activeProviderId === p.id &&
              (!S.settings.activeModel || (p.models || []).indexOf(S.settings.activeModel) < 0)) {
            S.settings.activeModel = (p.models || [])[0] || '';
          }
          App.Store.saveSettings();
          App.toast(T('c.saved'));
          App.Nav.pop();
          if (!App.Nav.top()) St.openProviders();
          App.UI.renderAll();
        }
        saveForm = save;
        updatePreview();
      }
    });
  };

  function setSegOn(box, id) {
    Array.prototype.slice.call(box.children).forEach(function (c) {
      c.classList.toggle('on', c.dataset.id === id);
    });
  }

  /* ----------------------------------------------------- instructions */
  St.openInstructions = function () {
    App.Nav.push({
      title: T('ip.title'),
      build: function (root) {
        var inner = el('div', 'page-inner');
        root.appendChild(inner);
        var c = card(T('ip.card'));
        c.appendChild(el('p', null, T('ip.cardDesc')));
        inner.appendChild(c);
        var box = el('div', 'list');
        var area = areaInput(S.settings.systemPrompt, T('ip.ph'), 9);
        var f = field('', area, T('ip.hint'));
        f.querySelector('.field-label').remove();
        area.addEventListener('input', App.debounce(function () {
          S.settings.systemPrompt = area.value;
          App.Store.saveSettings();
        }, 400));
        box.appendChild(f);
        inner.appendChild(box);

        inner.appendChild(el('div', 'group-label', T('ss.card')));
        var box2 = listBox();
        var trow = el('div', 'item');
        var tic = el('span', 'item-ic');
        tic.innerHTML = icon('globe', 'i18');
        trow.appendChild(tic);
        var tg = el('span', 'grow');
        var tl = el('span', 'item-label', T('ip.tellRounds'));
        tl.style.display = 'block';
        tg.appendChild(tl);
        var tsub = el('span', 'item-val');
        tsub.style.cssText = 'display:block;max-width:none;text-align:left;font-size:11.5px';
        tsub.textContent = T('ip.tellRoundsHint');
        tg.appendChild(tsub);
        trow.appendChild(tg);
        var sw = el('div', 'switch' + (S.settings.tellSearchLimit !== false ? ' on' : ''));
        trow.appendChild(sw);
        trow.onclick = function () {
          var on = !sw.classList.contains('on');
          sw.classList.toggle('on', on);
          S.settings.tellSearchLimit = on;
          App.Store.saveSettings();
        };
        box2.appendChild(trow);
        inner.appendChild(box2);

        var spacer = el('div');
        spacer.style.height = '30px';
        inner.appendChild(spacer);
      }
    });
  };

  /* ----------------------------------------------------------- search */
  St.openSearch = function () {
    App.Nav.push({
      title: T('ss.title'),
      build: function (root) {
        var inner = el('div', 'page-inner');
        root.appendChild(inner);
        var c = card(T('ss.card'));
        c.appendChild(el('p', null, T('ss.cardDesc')));
        inner.appendChild(c);

        var list = listBox();
        App.API.ENGINES.forEach(function (e) {
          var on = (S.settings.searchProvider || 'bing') === e.id;
          var it = el('div', 'item');
          var i = el('span', 'item-ic');
          i.innerHTML = icon(on ? 'check' : 'globe', 'i18');
          if (on) i.style.color = 'var(--accent)';
          it.appendChild(i);
          var g = el('span', 'grow');
          var l = el('span', 'item-label', e.name);
          l.style.display = 'block';
          g.appendChild(l);
          var sub = el('span', 'item-val');
          sub.style.cssText = 'display:block;max-width:none;text-align:left;';
          sub.textContent = e.note[App.T.isEn() ? 'en' : 'zh'];
          g.appendChild(sub);
          it.appendChild(g);
          var badge = el('span', 'tag' + (e.region === 'cn' ? ' acc' : ''));
          badge.textContent = e.region === 'cn' ? T('ss.region.cn') : (e.region === 'abroad' ? T('ss.region.abroad') : '');
          if (badge.textContent) it.appendChild(badge);
          it.onclick = function () {
            S.settings.searchProvider = e.id;
            App.Store.saveSettings();
            App.Nav.pop();
            St.openSearch();
          };
          list.appendChild(it);
        });
        inner.appendChild(list);

        var b2 = el('div', 'list');
        var cnt = textInput(String(S.settings.searchCount || 5), '5', 'number');
        cnt.addEventListener('input', function () {
          var n = parseInt(cnt.value, 10);
          if (!isNaN(n)) { S.settings.searchCount = App.clamp(n, 1, 10); App.Store.saveSettings(); }
        });
        b2.appendChild(field(T('ss.count'), cnt, T('ss.countHint')));
        var rounds = textInput(String(S.settings.maxSearchRounds || 4), '4', 'number');
        rounds.addEventListener('input', function () {
          var n = parseInt(rounds.value, 10);
          if (!isNaN(n)) { S.settings.maxSearchRounds = App.clamp(n, 1, 10); App.Store.saveSettings(); }
        });
        b2.appendChild(field(T('ss.maxRounds'), rounds, T('ss.maxRoundsHint')));
        inner.appendChild(b2);

        var extra = el('div', 'list');
        if (S.settings.searchProvider === 'tavily') {
          var k = textInput(S.settings.tavilyKey, 'tvly-...', 'password');
          k.addEventListener('input', function () { S.settings.tavilyKey = k.value.trim(); App.Store.saveSettings(); });
          extra.appendChild(field(T('ss.tavilyKey'), k));
        }
        if (S.settings.searchProvider === 'searxng') {
          var u = textInput(S.settings.searxUrl, 'https://searx.example.com');
          u.addEventListener('input', function () { S.settings.searxUrl = u.value.trim(); App.Store.saveSettings(); });
          extra.appendChild(field(T('ss.searxUrl'), u, T('ss.searxHint')));
        }
        if (extra.children.length) inner.appendChild(extra);

        var row = el('div', 'btn-row');
        var t = el('button', 'btn ghost block', T('ss.test'));
        t.onclick = function () {
          App.promptBox({ title: T('ss.test'), value: 'AI', placeholder: T('ss.testPh') }).then(function (q) {
            if (!q) return;
            t.textContent = T('ss.searching'); t.disabled = true;
            App.API.webSearch(q, {
              provider: S.settings.searchProvider,
              count: S.settings.searchCount,
              tavilyKey: S.settings.tavilyKey,
              searxUrl: S.settings.searxUrl
            }).then(function (list) {
              App.Sheet.open({
                title: T('ss.results', list.length),
                build: function (body) {
                  var cc = card();
                  if (!list.length) cc.appendChild(el('p', null, T('ss.noResults')));
                  list.forEach(function (r, i) {
                    var p = el('p');
                    p.innerHTML = '<strong>' + (i + 1) + '. ' + App.esc(r.title) + '</strong><br>' +
                      App.esc(String(r.snippet || '').slice(0, 160)) + '<br>' +
                      '<span style="color:var(--text-3);font-size:12px">' + App.esc(r.url || '') + '</span>';
                    cc.appendChild(p);
                  });
                  body.appendChild(cc);
                }
              });
            }).catch(function (e) {
              App.toast(T('ss.fail', String(e.message || e).slice(0, 70)));
            }).then(function () { t.textContent = T('ss.test'); t.disabled = false; });
          });
        };
        row.appendChild(t);
        inner.appendChild(row);
      }
    });
  };

  /* ------------------------------------------------------------ stats */
  St.openStats = function () {
    App.Nav.push({
      title: T('st.title'),
      build: function (root) {
        var d = App.Stats.load();
        var inner = el('div', 'page-inner');
        root.appendChild(inner);
        var grid = el('div', 'stat-grid');
        function stat(k, v, s) {
          var c = el('div', 'stat');
          c.appendChild(el('div', 'k', k));
          c.appendChild(el('div', 'v', v));
          if (s) c.appendChild(el('div', 's', s));
          return c;
        }
        grid.appendChild(stat(T('st.requests'), App.fmtNum(d.reqs)));
        grid.appendChild(stat(T('st.input'), App.fmtNum(d.in)));
        grid.appendChild(stat(T('st.output'), App.fmtNum(d.out)));
        grid.appendChild(stat(T('st.total'), App.fmtNum((d.in || 0) + (d.out || 0))));
        var rate = App.Stats.hitRate(d);
        var hc = el('div', 'stat');
        hc.style.gridColumn = '1 / span 2';
        hc.appendChild(el('div', 'k', T('st.hit')));
        hc.appendChild(el('div', 'v', (rate * 100).toFixed(1) + '%'));
        var track = el('div', 'bar-track');
        var fill = el('div', 'bar-fill');
        fill.style.width = Math.round(rate * 100) + '%';
        track.appendChild(fill);
        hc.appendChild(track);
        hc.appendChild(el('div', 's', T('st.hitDetail', App.fmtNum(d.cached), App.fmtNum(d.miss))));
        grid.appendChild(hc);
        inner.appendChild(grid);

        inner.appendChild(groupLabel(T('st.byModel')));
        var box = listBox();
        var keys = Object.keys(d.byModel || {});
        if (!keys.length) box.appendChild(el('div', 'item', T('st.empty')));
        keys.forEach(function (k) {
          var m = d.byModel[k];
          var it = el('div', 'item');
          var g = el('span', 'grow');
          var l = el('span', 'item-label', k);
          l.style.display = 'block';
          g.appendChild(l);
          var sub = el('span', 'item-val');
          sub.style.cssText = 'display:block;max-width:none;text-align:left;';
          sub.textContent = T('st.line', App.fmtNum(m.in), App.fmtNum(m.out),
            (App.Stats.hitRate(m) * 100).toFixed(0), m.reqs);
          g.appendChild(sub);
          it.appendChild(g);
          box.appendChild(it);
        });
        inner.appendChild(box);

        var c2 = card();
        c2.appendChild(el('p', null, T('st.note')));
        inner.appendChild(c2);

        var row = el('div', 'btn-row');
        var r = el('button', 'btn danger block', T('st.reset'));
        r.onclick = function () {
          App.confirmBox({ title: T('st.resetTitle'), danger: true, okText: T('st.reset') }).then(function (ok) {
            if (!ok) return;
            App.Stats.reset();
            App.Nav.pop(); St.openStats();
          });
        };
        row.appendChild(r);
        inner.appendChild(row);
      }
    });
  };

  /* ------------------------------------------------------------ readme */
  St.openReadme = function () {
    App.Nav.push({
      title: T('docs.title'),
      action: { icon: 'share', run: function () { P.share(App.readme()); } },
      build: function (root) {
        var inner = el('div', 'page-inner');
        inner.style.padding = '14px';
        var c = el('div', 'md');
        c.innerHTML = App.md(App.readme() || T('docs.missing'));
        inner.appendChild(c);
        root.appendChild(inner);
      }
    });
  };

  /* ------------------------------------------------------------- about */
  St.openAbout = function () {
    var info = P.info();
    App.Sheet.open({
      title: 'Nexa',
      sub: T('ab.sub'),
      build: function (body) {
        var c = card();
        c.appendChild(el('p', null, T('ab.device', (info.brand || '') + ' ' + (info.model || ''))));
        c.appendChild(el('p', null, T('ab.os', info.sdk || '')));
        c.appendChild(el('p', null, T('ab.p1')));
        c.appendChild(el('p', null, T('ab.p2')));
        body.appendChild(c);
      }
    });
  };
})();
