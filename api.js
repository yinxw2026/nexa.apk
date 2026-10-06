/* ============================================================
   api.js — providers, request building, streaming, tool calls,
            web search, usage
   ============================================================ */
window.App = window.App || {};
(function () {
  'use strict';
  var P = App.P;
  function T(k, a, b, c) { return App.T(k, a, b, c); }

  /* -------------------------------------------------- provider metadata */
  var TYPES = [
    { id: 'openai', name: 'OpenAI compatible', desc: 'DeepSeek / OpenAI / Qwen / GLM / Moonshot / Ollama / LM Studio' },
    { id: 'anthropic', name: 'Anthropic', desc: 'Claude · /v1/messages' },
    { id: 'gemini', name: 'Google Gemini', desc: 'generativelanguage.googleapis.com' }
  ];

  var PRESETS = [
    { name: 'DeepSeek', type: 'openai', baseUrl: 'https://api.deepseek.com', models: 'deepseek-chat\ndeepseek-reasoner', reasoning: 'auto' },
    { name: 'OpenAI', type: 'openai', baseUrl: 'https://api.openai.com', models: 'gpt-4o-mini\ngpt-4o\no4-mini', reasoning: 'effort' },
    { name: 'Kimi', type: 'openai', baseUrl: 'https://api.moonshot.cn', models: 'kimi-k2-0905-preview\nmoonshot-v1-8k', reasoning: 'auto' },
    { name: 'Zhipu GLM', type: 'openai', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: 'glm-4.5\nglm-4.5-air\nglm-4-flash', reasoning: 'budget' },
    { name: 'Qwen', type: 'openai', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode', models: 'qwen-plus\nqwen-max\nqwen-turbo', reasoning: 'auto' },
    { name: 'SiliconFlow', type: 'openai', baseUrl: 'https://api.siliconflow.cn', models: 'deepseek-ai/DeepSeek-V3\nQwen/Qwen2.5-72B-Instruct', reasoning: 'auto' },
    { name: 'Local / LAN', type: 'openai', baseUrl: 'http://192.168.1.2:1234/v1', models: '', reasoning: 'none' },
    { name: 'Anthropic Claude', type: 'anthropic', baseUrl: 'https://api.anthropic.com', models: 'claude-sonnet-4-5\nclaude-haiku-4-5', reasoning: 'budget' },
    { name: 'Google Gemini', type: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com', models: 'gemini-2.5-flash\ngemini-2.5-pro', reasoning: 'budget' }
  ];

  /* 5 levels */
  var BUDGET = { off: 0, low: 2048, mid: 4096, high: 8192, max: 16384 };
  var EFFORT = { off: 'none', low: 'low', mid: 'medium', high: 'high', max: 'high' };
  var LEVELS = ['off', 'low', 'mid', 'high', 'max'];

  function budgetOf(level, custom) {
    if (level === 'custom') {
      var v = parseInt(custom, 10);
      return (isNaN(v) || v < 0) ? 0 : Math.min(v, 200000);
    }
    return BUDGET[level] || 0;
  }
  function effortOf(level, budget) {
    if (level === 'custom') return budget >= 8192 ? 'high' : (budget >= 4096 ? 'medium' : 'low');
    return EFFORT[level] || 'none';
  }

  /* -------------------------------------------------------------- tools */
  var WEB_SEARCH_TOOL = {
    name: 'web_search',
    description: 'Search the web for current information. Call this when the question involves recent events, news, live data, prices, or any fact you are not confident about.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords, in the language most likely to return good results' }
      },
      required: ['query']
    }
  };

  function toolsFor(provider, tools) {
    if (!tools || !tools.length) return null;
    var t = provider.type || 'openai';
    if (t === 'anthropic') {
      return tools.map(function (x) {
        return { name: x.name, description: x.description, input_schema: x.parameters };
      });
    }
    if (t === 'gemini') {
      return [{ functionDeclarations: tools.map(function (x) {
        return { name: x.name, description: x.description, parameters: x.parameters };
      }) }];
    }
    return tools.map(function (x) { return { type: 'function', function: x }; });
  }

  function authHeaders(provider) {
    var h = { 'Content-Type': 'application/json' };
    var t = provider.type || 'openai';
    if (t === 'anthropic') {
      if (provider.apiKey) h['x-api-key'] = provider.apiKey;
      h['anthropic-version'] = '2023-06-01';
      h['anthropic-dangerous-direct-browser-access'] = 'true';
    } else if (t !== 'gemini') {
      if (provider.apiKey) h['Authorization'] = 'Bearer ' + provider.apiKey;
    }
    return h;
  }

  function endpoint(provider, kind, model) {
    var b = String(provider.baseUrl || '').trim().replace(/\/+$/, '');
    var t = provider.type || 'openai';
    if (t === 'anthropic') {
      if (/\/v1\/messages$/.test(b)) return b;
      if (/\/v1$/.test(b)) return b + '/messages';
      return b + '/v1/messages';
    }
    if (t === 'gemini') {
      var base = b.replace(/\/v1beta$/, '');
      if (kind === 'models') return base + '/v1beta/models?key=' + encodeURIComponent(provider.apiKey || '');
      return base + '/v1beta/models/' + encodeURIComponent(model) +
        ':streamGenerateContent?alt=sse&key=' + encodeURIComponent(provider.apiKey || '');
    }
    if (kind === 'models') {
      if (/\/models$/.test(b)) return b;
      if (/\/v\d+$/.test(b)) return b + '/models';
      return b + '/v1/models';
    }
    if (/\/chat\/completions$/.test(b)) return b;
    if (/\/v\d+$/.test(b)) return b + '/chat/completions';
    return b + '/v1/chat/completions';
  }

  /* ------------------------------------------------------ content build */
  function splitDataUrl(d) {
    var m = /^data:([^;]+);base64,(.*)$/.exec(d || '');
    if (!m) return null;
    return { mime: m[1], data: m[2] };
  }

  function textOfAttachments(atts) {
    var t = '';
    (atts || []).forEach(function (a) {
      if (a.kind === 'text' && a.text) t += '\n\n[' + a.name + ']\n' + a.text;
      else if (a.kind === 'binary') t += '\n\n[' + a.name + ' (' + App.fmtSize(a.size) + ')]';
    });
    return t;
  }

  function userContent(providerType, txt, imgs) {
    if (!imgs.length) return txt;
    if (providerType === 'anthropic') {
      var c = [];
      imgs.forEach(function (a) {
        var s = splitDataUrl(a.data);
        if (s) c.push({ type: 'image', source: { type: 'base64', media_type: s.mime, data: s.data } });
      });
      c.push({ type: 'text', text: txt || '(image)' });
      return c;
    }
    if (providerType === 'gemini') {
      var pp = [{ text: txt || '(image)' }];
      imgs.forEach(function (a) {
        var s = splitDataUrl(a.data);
        if (s) pp.push({ inline_data: { mime_type: s.mime, data: s.data } });
      });
      return pp;
    }
    var parts = [];
    if (txt) parts.push({ type: 'text', text: txt });
    imgs.forEach(function (a) { parts.push({ type: 'image_url', image_url: { url: a.data } }); });
    return parts;
  }

  function buildMessages(provider, messages) {
    var t = provider.type || 'openai';
    var out = [];
    messages.forEach(function (m) {
      if (m.role === 'system') return;

      if (m.role === 'tool') {
        if (t === 'anthropic') {
          out.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content || '' }] });
        } else if (t === 'gemini') {
          out.push({ role: 'user', parts: [{ functionResponse: { name: m.name, response: { result: m.content || '' } } }] });
        } else {
          out.push({ role: 'tool', tool_call_id: m.toolCallId, content: m.content || '' });
        }
        return;
      }

      if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length) {
        if (t === 'anthropic') {
          var c = [];
          if (m.content) c.push({ type: 'text', text: m.content });
          m.toolCalls.forEach(function (tc) {
            c.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.args || {} });
          });
          out.push({ role: 'assistant', content: c });
        } else if (t === 'gemini') {
          var parts = [];
          if (m.content) parts.push({ text: m.content });
          m.toolCalls.forEach(function (tc) {
            parts.push({ functionCall: { name: tc.name, args: tc.args || {} } });
          });
          out.push({ role: 'model', parts: parts });
        } else {
          out.push({
            role: 'assistant',
            content: m.content || null,
            tool_calls: m.toolCalls.map(function (tc) {
              return {
                id: tc.id, type: 'function',
                function: { name: tc.name, arguments: JSON.stringify(tc.args || {}) }
              };
            })
          });
        }
        return;
      }

      var txt = (m.content || '') + textOfAttachments(m.attachments);
      var imgs = (m.attachments || []).filter(function (a) { return a.kind === 'image' && a.data; });
      var target = (t === 'gemini' && m.role === 'assistant') ? 'model' : m.role;
      out.push({ role: target, content: userContent(t, txt, imgs) });
    });
    return out;
  }

  function shouldReason(provider, model, budget) {
    if (!budget || budget <= 0) return false;
    var style = provider.reasoningStyle || 'auto';
    if (style === 'none') return false;
    if (style === 'effort' || style === 'budget' || style === 'both') return true;
    return /reason|think|o1|o3|o4|glm-4\.5|deepseek-r|qwq|magistral|k2|r1/i.test(model || '');
  }

  function applyExtra(body, provider) {
    var raw = provider && provider.extraBody;
    if (!raw) return body;
    try {
      var o = JSON.parse(raw);
      for (var k in o) body[k] = o[k];
    } catch (e) {}
    return body;
  }

  function buildRequest(provider, opts, stream) {
    var t = provider.type || 'openai';
    var model = opts.model || '';
    var msgs = buildMessages(provider, opts.messages);
    var sys = opts.system || '';
    var level = opts.reasoning || 'off';
    var budget = opts.budget != null ? opts.budget : budgetOf(level, opts.customBudget);
    var temp = (opts.temperature == null ? 1 : Number(opts.temperature));
    var tools = toolsFor(provider, opts.tools);
    var url, body;

    if (t === 'anthropic') {
      url = endpoint(provider, 'chat', model);
      body = {
        model: model,
        max_tokens: opts.maxTokens || 8192,
        messages: msgs,
        stream: !!stream
      };
      if (sys) body.system = sys;
      if (!isNaN(temp)) body.temperature = temp;
      if (budget > 0) {
        body.max_tokens = Math.max(body.max_tokens, budget + 4096);
        body.thinking = { type: 'enabled', budget_tokens: budget };
      }
      if (tools) body.tools = tools;
    } else if (t === 'gemini') {
      url = endpoint(provider, 'chat', model);
      body = { contents: msgs };
      if (sys) body.systemInstruction = { parts: [{ text: sys }] };
      body.generationConfig = {};
      if (!isNaN(temp)) body.generationConfig.temperature = temp;
      if (budget > 0) body.generationConfig.thinkingConfig = { thinkingBudget: budget };
      if (tools) body.tools = tools;
    } else {
      url = endpoint(provider, 'chat', model);
      body = { model: model, messages: msgs, stream: !!stream };
      if (stream) body.stream_options = { include_usage: true };
      if (sys) body.messages = [{ role: 'system', content: sys }].concat(body.messages);
      if (!isNaN(temp)) body.temperature = temp;
      var style = provider.reasoningStyle || 'auto';
      if (shouldReason(provider, model, budget)) {
        if (style === 'budget') {
          body.thinking = { type: 'enabled', budget_tokens: budget };
        } else if (style === 'both') {
          body.reasoning_effort = effortOf(level, budget);
          body.thinking = { type: 'enabled', budget_tokens: budget };
        } else {
          body.reasoning_effort = effortOf(level, budget);
        }
      }
      if (tools) body.tools = tools;
    }
    applyExtra(body, provider);
    return { url: url, method: 'POST', headers: authHeaders(provider), body: JSON.stringify(body) };
  }

  /* --------------------------------------------------------- http plumbing */
  App._http = {};
  window.__http = {
    onStatus: function (id, code) { var h = App._http[id]; if (h && h.onStatus) { try { h.onStatus(code); } catch (e) {} } },
    onChunk: function (id, text) { var h = App._http[id]; if (h && h.onChunk) { try { h.onChunk(text); } catch (e) {} } },
    onDone: function (id) { var h = App._http[id]; delete App._http[id]; if (h && h.onDone) { try { h.onDone(); } catch (e) {} } },
    onErr: function (id, msg) { var h = App._http[id]; delete App._http[id]; if (h && h.onErr) { try { h.onErr(msg); } catch (e) {} } },
    onResp: function (id, code, body) { var h = App._http[id]; delete App._http[id]; if (h && h.onResp) { try { h.onResp(code, body); } catch (e) {} } }
  };

  function fetchText(url, method, headers, body) {
    return new Promise(function (resolve, reject) {
      var id = 'q' + (++App.S.reqSeq);
      App._http[id] = {
        onStatus: function () {},
        onChunk: function () {},
        onDone: function () { reject(new Error('interrupted')); },
        onErr: function (m) { reject(new Error(m)); },
        onResp: function (code, text) {
          if (code >= 200 && code < 300) resolve(text);
          else reject(new Error('HTTP ' + code + ': ' + String(text || '').slice(0, 200)));
        }
      };
      P.httpFetch(id, method || 'GET', url, headers || {}, body || '');
    });
  }

  /* ------------------------------------------------------------- usage */
  function normalizeUsage(u) {
    if (!u) return null;
    var inTok = u.prompt_tokens != null ? u.prompt_tokens
      : (u.input_tokens != null ? u.input_tokens
        : (u.promptTokenCount != null ? u.promptTokenCount : 0));
    var outTok = u.completion_tokens != null ? u.completion_tokens
      : (u.output_tokens != null ? u.output_tokens
        : (u.candidatesTokenCount != null ? u.candidatesTokenCount : 0));
    var cached = 0;
    if (u.prompt_cache_hit_tokens != null) cached = u.prompt_cache_hit_tokens;
    else if (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens != null) cached = u.prompt_tokens_details.cached_tokens;
    else if (u.cache_read_input_tokens != null) cached = u.cache_read_input_tokens;
    else if (u.cachedContentTokenCount != null) cached = u.cachedContentTokenCount;
    var miss = u.prompt_cache_miss_tokens != null ? u.prompt_cache_miss_tokens : Math.max(0, inTok - cached);
    return { in: inTok, out: outTok, cached: cached, miss: miss, total: inTok + outTok };
  }

  var Stats = {
    data: null,
    load: function () {
      var d = null;
      try { d = JSON.parse(P.kvGet('stats') || 'null'); } catch (e) {}
      if (!d) d = { in: 0, out: 0, cached: 0, miss: 0, reqs: 0, byModel: {} };
      if (!d.byModel) d.byModel = {};
      this.data = d;
      return d;
    },
    save: function () { P.kvPut('stats', JSON.stringify(this.data)); },
    add: function (model, usage) {
      if (!usage) return;
      var d = this.data || this.load();
      if (!d) return;
      d.in += usage.in || 0;
      d.out += usage.out || 0;
      d.cached += usage.cached || 0;
      d.miss += usage.miss || 0;
      d.reqs += 1;
      var key = model || 'model';
      var m = d.byModel[key] || { in: 0, out: 0, cached: 0, miss: 0, reqs: 0 };
      m.in += usage.in || 0; m.out += usage.out || 0;
      m.cached += usage.cached || 0; m.miss += usage.miss || 0; m.reqs += 1;
      d.byModel[key] = m;
      this.save();
    },
    reset: function () {
      this.data = { in: 0, out: 0, cached: 0, miss: 0, reqs: 0, byModel: {} };
      this.save();
    },
    hitRate: function (d) {
      d = d || this.data || { cached: 0, miss: 0 };
      var t = (d.cached || 0) + (d.miss || 0);
      return t > 0 ? (d.cached / t) : 0;
    }
  };

  /* --------------------------------------------------- streaming + tools */
  function agent(opts) {
    var provider = opts.provider;
    var maxRounds = opts.maxRounds || 4;
    var aborted = false;
    var current = null;
    var total = { in: 0, out: 0, cached: 0, miss: 0, total: 0 };

    function addUsage(u) {
      if (!u) return;
      total.in += u.in || 0; total.out += u.out || 0;
      total.cached += u.cached || 0; total.miss += u.miss || 0; total.total += u.total || 0;
    }

    function run(msgs, round) {
      if (aborted) return;
      if (round > maxRounds) {
        if (opts.onUsage) opts.onUsage(total);
        if (opts.onLimit) opts.onLimit(maxRounds);
        else opts.onError(T('err.toolLoop'));
        return;
      }
      var req = buildRequest(provider, {
        model: opts.model, messages: msgs, system: opts.system,
        reasoning: opts.reasoning, budget: opts.budget,
        temperature: opts.temperature, tools: opts.tools
      }, true);
      var id = 'r' + (++App.S.reqSeq);
      var buf = '', text = '', usage = null;
      var tcMap = {}, tcOrder = [];
      var finished = false;

      function finish() {
        if (finished) return;
        finished = true;
        if (aborted) return;
        addUsage(usage);
        var calls = tcOrder.map(function (k) { return tcMap[k]; })
          .filter(function (c) { return c && c.name; });
        calls.forEach(function (c) {
          if (c._json != null && c._json !== '') c.args = parseArgs(c._json);
          if (!c.args || typeof c.args !== 'object') c.args = {};
        });
        if (!calls.length) {
          if (opts.onUsage) opts.onUsage(total);
          opts.onDone({ text: text });
          return;
        }
        var assistant = {
          role: 'assistant', content: text,
          toolCalls: calls.map(function (c) { return { id: c.id, name: c.name, args: c.args }; })
        };
        var nextMsgs = msgs.concat([assistant]);
        var chain = Promise.resolve();
        calls.forEach(function (c) {
          chain = chain.then(function () {
            if (aborted) return null;
            if (opts.onToolStart) { try { opts.onToolStart(c.name, c.args); } catch (e) {} }
            return Promise.resolve()
              .then(function () { return opts.executeTool(c.name, c.args); })
              .then(function (res) {
                nextMsgs.push({ role: 'tool', toolCallId: c.id, name: c.name, content: String(res == null ? '' : res) });
              }, function (e) {
                nextMsgs.push({ role: 'tool', toolCallId: c.id, name: c.name,
                  content: 'Search failed: ' + ((e && e.message) || e) +
                           ' — do not retry, answer with the information you already have.' });
              })
              .then(function () { if (opts.onToolEnd) { try { opts.onToolEnd(c.name); } catch (e) {} } });
          });
        });
        chain.then(function () {
          if (aborted) return;
          run(nextMsgs, round + 1);
        });
      }

      function parseArgs(s) {
        if (!s) return {};
        try { return JSON.parse(s); } catch (e) { return {}; }
      }

      function handle(line) {
        line = line.replace(/\r$/, '');
        if (!line || line.charAt(0) === ':') return;
        var payload;
        if (line.indexOf('data:') === 0) payload = line.slice(5).trim();
        else if (line.indexOf('event:') === 0) return;
        else if (line.charAt(0) === '{') payload = line.trim();
        else return;
        if (payload === '[DONE]') { finish(); return; }
        if (!payload) return;
        var j;
        try { j = JSON.parse(payload); } catch (e) { return; }
        var t = provider.type || 'openai';

        if (t === 'anthropic') {
          if (j.type === 'message_start' && j.message && j.message.usage) {
            usage = normalizeUsage(j.message.usage) || usage;
          }
          if (j.type === 'content_block_start' && j.content_block && j.content_block.type === 'tool_use') {
            var idx0 = j.index || 0;
            tcMap[idx0] = { id: j.content_block.id || ('tool_' + idx0), name: j.content_block.name, args: {} };
            tcOrder.push(idx0);
          }
          if (j.type === 'content_block_delta' && j.delta) {
            if (j.delta.type === 'text_delta' && j.delta.text) {
              text += j.delta.text; opts.onDelta(j.delta.text);
            } else if (j.delta.type === 'thinking_delta' && j.delta.thinking) {
              if (opts.onReason) opts.onReason(j.delta.thinking);
            } else if (j.delta.type === 'input_json_delta') {
              var idx1 = j.index || 0;
              if (!tcMap[idx1]) { tcMap[idx1] = { id: 'tool_' + idx1, name: '', args: {} }; tcOrder.push(idx1); }
              tcMap[idx1]._json = (tcMap[idx1]._json || '') + (j.delta.partial_json || '');
            }
          }
          if (j.type === 'message_delta' && j.usage) {
            var n1 = normalizeUsage(j.usage);
            if (n1) {
              usage = usage || { in: 0, out: 0, cached: 0, miss: 0, total: 0 };
              usage.out = n1.out || usage.out;
              if (!usage.in) usage.in = n1.in;
            }
          }
          if (j.type === 'message_stop') finish();
          return;
        }

        if (t === 'gemini') {
          var cand = (j.candidates || [])[0];
          if (cand && cand.content && cand.content.parts) {
            cand.content.parts.forEach(function (p) {
              if (p.text) { text += p.text; opts.onDelta(p.text); }
              if (p.functionCall) {
                var key = tcOrder.length;
                tcMap[key] = { id: 'call_' + key + '_' + Date.now(), name: p.functionCall.name, args: p.functionCall.args || {} };
                tcOrder.push(key);
              }
            });
          }
          if (j.usageMetadata) usage = normalizeUsage(j.usageMetadata) || usage;
          return;
        }

        if (j.usage) usage = normalizeUsage(j.usage) || usage;
        if (j.error) {
          if (opts.onError) opts.onError(j.error.message || JSON.stringify(j.error));
          finished = true;
          return;
        }
        var ch = (j.choices || [])[0];
        if (!ch) return;
        var d = ch.delta || ch.message || {};
        if (d.reasoning_content) { if (opts.onReason) opts.onReason(d.reasoning_content); }
        if (d.reasoning) { if (opts.onReason) opts.onReason(d.reasoning); }
        if (d.content) {
          var piece = typeof d.content === 'string' ? d.content : '';
          if (!piece && Array.isArray(d.content)) {
            d.content.forEach(function (c) { if (c && c.text) piece += c.text; });
          }
          if (piece) { text += piece; opts.onDelta(piece); }
        }
        if (d.tool_calls) {
          d.tool_calls.forEach(function (tc) {
            var k = tc.index == null ? tcOrder.length : tc.index;
            if (!tcMap[k]) { tcMap[k] = { id: '', name: '', args: {} }; tcOrder.push(k); }
            if (tc.id) tcMap[k].id = tc.id;
            if (tc.function && tc.function.name) tcMap[k].name = tc.function.name;
            if (tc.function && tc.function.arguments) tcMap[k]._json = (tcMap[k]._json || '') + tc.function.arguments;
          });
        }
      }

      App._http[id] = {
        onStatus: function (code) { if (opts.onStatus) opts.onStatus(code); },
        onChunk: function (chunk) {
          buf += chunk;
          var i;
          while ((i = buf.indexOf('\n')) >= 0) {
            var line = buf.slice(0, i);
            buf = buf.slice(i + 1);
            try { handle(line); } catch (e) {}
          }
        },
        onDone: function () { finish(); },
        onErr: function (msg) { if (!aborted && opts.onError) opts.onError(msg); }
      };

      P.httpStream(id, req.method, req.url, req.headers, req.body);

      current = {
        abort: function () {
          if (finished) return;
          finished = true;
          aborted = true;
          P.httpCancel(id);
          delete App._http[id];
        }
      };
    }

    run(opts.messages.slice(), 1);
    return {
      abort: function () { if (current) current.abort(); else aborted = true; }
    };
  }

  function chatOnce(opts) {
    var provider = opts.provider;
    var req = buildRequest(provider, opts, false);
    return fetchText(req.url, req.method, req.headers, req.body).then(function (text) {
      var j = JSON.parse(text);
      var t = provider.type || 'openai';
      var out = '';
      if (t === 'anthropic') {
        (j.content || []).forEach(function (c) { if (c.type === 'text') out += c.text; });
      } else if (t === 'gemini') {
        var c = (j.candidates || [])[0];
        if (c && c.content && c.content.parts) c.content.parts.forEach(function (p) { if (p.text) out += p.text; });
      } else {
        if (j.error) throw new Error(j.error.message || 'API error');
        var msg = ((j.choices || [])[0] || {}).message || {};
        out = msg.content || '';
      }
      return { text: out, usage: normalizeUsage(j.usage || j.usageMetadata), raw: j };
    });
  }

  function listModels(provider) {
    var url = endpoint(provider, 'models');
    var headers = authHeaders(provider);
    if ((provider.type || 'openai') === 'gemini' && provider.apiKey) headers = { 'Content-Type': 'application/json' };
    return fetchText(url, 'GET', headers, '').then(function (t) {
      var j = JSON.parse(t);
      var arr = [];
      if (Array.isArray(j.data)) arr = j.data.map(function (m) { return m.id || m.name; });
      else if (Array.isArray(j.models)) arr = j.models.map(function (m) { return (m.name || '').replace(/^models\//, ''); });
      else if (Array.isArray(j)) arr = j.map(function (m) { return m.id || m.name || m; });
      return arr.filter(Boolean);
    });
  }

  /* ----------------------------------------------------------- web search */
  function stripTags(s) { return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
  function decodeEnt(s) {
    return String(s || '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, function (_, d) { return String.fromCharCode(+d); })
      .replace(/&amp;/g, '&');
  }
  function pickTag(block, tag) {
    var m = new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>').exec(block);
    return m ? decodeEnt(m[1]).replace(/\s+/g, ' ').trim() : '';
  }
  function dedupe(list, n) {
    var seen = {}, out = [];
    list.forEach(function (r) {
      if (!r || !r.title) return;
      var k = (r.url || r.title).slice(0, 140);
      if (seen[k]) return;
      seen[k] = 1;
      out.push(r);
    });
    return out.slice(0, n);
  }

  function searchBing(q, n) {
    var url = 'https://cn.bing.com/search?format=rss&count=' + Math.max(1, n) + '&q=' + encodeURIComponent(q);
    return fetchText(url).then(function (xml) {
      var list = [], re = /<item>([\s\S]*?)<\/item>/g, m;
      while ((m = re.exec(xml)) && list.length < n) {
        var blk = m[1];
        var title = pickTag(blk, 'title');
        var link = pickTag(blk, 'link');
        var desc = stripTags(pickTag(blk, 'description'));
        if (title) list.push({ title: title, url: link, snippet: desc });
      }
      return list;
    });
  }

  function searchBaidu(q, n) {
    var url = 'https://www.baidu.com/s?wd=' + encodeURIComponent(q) + '&rn=' + Math.max(10, n);
    return fetchText(url).then(function (html) {
      var list = [];
      var parts = html.split(/class="[^"]*c-container[^"]*"/);
      parts.shift();
      for (var i = 0; i < parts.length && list.length < n; i++) {
        var blk = parts[i].slice(0, 6000);
        var am = /<a[^>]+href="(https?:[^"]+)"[^>]*>[\s\S]{0,400}?<h3[^>]*>([\s\S]*?)<\/h3>/.exec(blk);
        if (!am) continue;
        var title = stripTags(am[2]);
        if (!title || title.length < 2) continue;
        list.push({ title: title, url: decodeEnt(am[1]), snippet: stripTags(blk.replace(/<h3[\s\S]*?<\/h3>/, '')).slice(0, 180) });
      }
      return list;
    });
  }

  function searchDDG(q, n) {
    var url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(q) +
      '&format=json&no_html=1&skip_disambig=1&no_redirect=1';
    return fetchText(url).then(function (t) {
      var j = JSON.parse(t);
      var list = [];
      if (j.AbstractText) list.push({ title: j.Heading || 'Summary', url: j.AbstractURL || '', snippet: j.AbstractText });
      (j.RelatedTopics || []).forEach(function (x) {
        if (x.Topics) x.Topics.forEach(function (s) {
          if (s.Text) list.push({ title: s.Text.split(' - ')[0], url: s.FirstURL || '', snippet: s.Text });
        });
        else if (x.Text) list.push({ title: x.Text.split(' - ')[0], url: x.FirstURL || '', snippet: x.Text });
      });
      return dedupe(list, n);
    });
  }

  function searchWiki(q, n) {
    var url = 'https://zh.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=' +
      Math.max(1, n) + '&srsearch=' + encodeURIComponent(q);
    return fetchText(url).then(function (t) {
      var j = JSON.parse(t);
      return ((j.query || {}).search || []).map(function (s) {
        return { title: s.title, url: 'https://zh.wikipedia.org/wiki/' + encodeURIComponent(s.title), snippet: stripTags(s.snippet) };
      });
    });
  }

  function searchTavily(q, key, n) {
    if (!key) throw new Error(T('ss.needKey'));
    return fetchText('https://api.tavily.com/search', 'POST',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ api_key: key, query: q, max_results: n, search_depth: 'basic' })
    ).then(function (t) {
      var j = JSON.parse(t);
      return (j.results || []).map(function (r) { return { title: r.title, url: r.url, snippet: r.content }; });
    });
  }

  function searchSearx(q, base, n) {
    if (!base) throw new Error(T('ss.needUrl'));
    var url = base.replace(/\/+$/, '') + '/search?format=json&q=' + encodeURIComponent(q);
    return fetchText(url).then(function (t) {
      var j = JSON.parse(t);
      return (j.results || []).map(function (r) { return { title: r.title, url: r.url, snippet: r.content }; }).slice(0, n);
    });
  }

  function webSearch(q, cfg) {
    var p = cfg.provider || 'bing';
    var n = App.clamp(parseInt(cfg.count, 10) || 5, 1, 10);
    if (p === 'baidu') return searchBaidu(q, n);
    if (p === 'wikipedia') return searchWiki(q, n);
    if (p === 'tavily') return searchTavily(q, cfg.tavilyKey, n);
    if (p === 'searxng') return searchSearx(q, cfg.searxUrl, n);
    if (p === 'duckduckgo') return searchDDG(q, n);
    return searchBing(q, n);
  }

  /* text handed back to the model as the tool result */
  function toolResult(list) {
    if (!list || !list.length) return 'No results found.';
    return list.map(function (r, i) {
      return '[' + (i + 1) + '] ' + (r.title || '') + '\n' + (r.snippet || '') + '\n' + (r.url || '');
    }).join('\n\n');
  }

  var ENGINES = [
    { id: 'bing', name: 'Bing', region: 'cn', note: { zh: '国内直连 · 无需密钥', en: 'Direct in CN · no key' } },
    { id: 'baidu', name: 'Baidu', region: 'cn', note: { zh: '国内直连 · 结果一般', en: 'Direct in CN · basic' } },
    { id: 'tavily', name: 'Tavily', region: 'any', note: { zh: '需 API 密钥', en: 'API key required' } },
    { id: 'searxng', name: 'SearXNG', region: 'any', note: { zh: '自建实例', en: 'Self-hosted' } },
    { id: 'duckduckgo', name: 'DuckDuckGo', region: 'abroad', note: { zh: '需海外网络', en: 'Overseas network' } },
    { id: 'wikipedia', name: 'Wikipedia', region: 'abroad', note: { zh: '需海外网络', en: 'Overseas network' } }
  ];

  App.API = {
    TYPES: TYPES, PRESETS: PRESETS, BUDGET: BUDGET, LEVELS: LEVELS, ENGINES: ENGINES,
    WEB_SEARCH_TOOL: WEB_SEARCH_TOOL,
    budgetOf: budgetOf, effortOf: effortOf,
    authHeaders: authHeaders, endpoint: endpoint,
    buildRequest: buildRequest, buildMessages: buildMessages,
    agent: agent, chatOnce: chatOnce, listModels: listModels,
    fetchText: fetchText,
    normalizeUsage: normalizeUsage,
    webSearch: webSearch, toolResult: toolResult,
    shouldReason: shouldReason
  };
  App.Stats = Stats;
})();
