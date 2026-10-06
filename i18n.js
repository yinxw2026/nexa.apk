/* ============================================================
   i18n.js — Chinese / English dictionary for the whole UI
   ============================================================ */
window.App = window.App || {};
(function () {
  'use strict';

  var D = {
    /* ---------------------------------------------------------- general */
    'app.name': ['Nexa', 'Nexa'],
    'app.tagline': ['本地优先的通用 AI 客户端', 'A local-first universal AI client'],
    'c.cancel': ['取消', 'Cancel'],
    'c.ok': ['确定', 'OK'],
    'c.confirm': ['确认', 'Confirm'],
    'c.delete': ['删除', 'Delete'],
    'c.rename': ['重命名', 'Rename'],
    'c.saved': ['已保存', 'Saved'],
    'c.copied': ['已复制', 'Copied'],
    'c.refresh': ['刷新', 'Refresh'],
    'c.done': ['完成', 'Done'],

    /* ----------------------------------------------------------- drawer */
    'drawer.searchConv': ['搜索对话', 'Search chats'],
    'drawer.noProvider': ['添加供应商', 'Add a provider'],
    'drawer.providerSub': ['点击配置 API 与模型', 'Tap to configure API and models'],
    'drawer.noModel': ['未选择模型', 'No model selected'],
    'drawer.noConv': ['还没有对话记录', 'No conversations yet'],
    'drawer.noMatch': ['没有匹配的对话', 'No matching chats'],
    'drawer.today': ['今天', 'Today'],
    'drawer.yesterday': ['昨天', 'Yesterday'],
    'drawer.month': ['{0}月', 'MMM {0}'],
    'drawer.year': ['{0}年', '{0}'],
    'drawer.lang': ['语言', 'Language'],

    /* ------------------------------------------------------------- chat */
    'chat.new': ['新对话', 'New chat'],
    'chat.placeholder': ['输入消息与 AI 聊天', 'Message the AI'],
    'chat.attach': ['上传文件', 'Attach files'],
    'chat.web': ['联网搜索', 'Web search'],
    'chat.think': ['思考强度', 'Reasoning effort'],
    'chat.send': ['发送', 'Send'],
    'chat.stop': ['停止', 'Stop'],
    'chat.copy': ['复制', 'Copy'],
    'chat.regen': ['重新生成', 'Regenerate'],
    'chat.share': ['分享', 'Share'],
    'chat.reasoning': ['思考过程', 'Reasoning'],
    'chat.expand': ['展开', 'Expand'],
    'chat.collapse': ['收起', 'Collapse'],
    'chat.meta': ['{0} tokens · {1}s', '{0} tokens · {1}s'],
    'chat.stopped': ['（已停止）', '(stopped)'],
    'chat.codeCopied': ['代码已复制', 'Code copied'],
    'chat.empty.title': ['开始新的对话', 'Start a new conversation'],
    'chat.empty.desc': ['已内置加密存储与多供应商支持。选择模型后即可对话。',
                        'Encrypted local storage and multi-provider support are built in. Pick a model to begin.'],
    'chat.empty.addProvider': ['添加供应商', 'Add a provider'],
    'chat.empty.pickModel': ['选择模型', 'Choose a model'],
    'chat.q1': ['帮我规划一份学习计划', 'Plan a study schedule'],
    'chat.q1p': ['帮我规划一份三周的学习计划，每天两小时。', 'Plan a three-week study schedule, two hours a day.'],
    'chat.q2': ['解释一段代码的作用', 'Explain some code'],
    'chat.q2p': ['解释下面这段代码的作用，并指出潜在问题：', 'Explain what the code below does and point out any issues:'],
    'chat.q3': ['联网查询今天的新闻', 'Search today\u2019s news'],
    'chat.q3p': ['帮我搜索并总结今天的科技新闻。', 'Search for and summarise today\u2019s technology news.'],
    'chat.searching': ['正在联网搜索……', 'Searching the web…'],
    'chat.webOn': ['已开启联网搜索', 'Web search on'],
    'chat.webOff': ['已关闭联网搜索', 'Web search off'],
    'chat.addedFiles': ['已添加 {0} 个文件', 'Added {0} file(s)'],
    'chat.needProvider': ['请先添加供应商', 'Add a provider first'],
    'chat.needModel': ['请先选择模型', 'Choose a model first'],
    'chat.generating': ['正在生成中', 'Still generating…'],
    'chat.file': ['文件', 'File'],
    'chat.attachment': ['附件', 'Attachment'],
    'chat.autoSaved': ['输入即自动保存', 'Saved automatically'],

    /* ----------------------------------------------------------- levels */
    'level.off': ['关闭', 'Off'],
    'level.low': ['低', 'Low'],
    'level.mid': ['中', 'Medium'],
    'level.high': ['高', 'High'],
    'level.max': ['极高', 'Max'],
    'level.off.short': ['关', 'Off'],
    'level.low.short': ['低', 'Low'],
    'level.mid.short': ['中', 'Med'],
    'level.high.short': ['高', 'High'],
    'level.max.short': ['极高', 'Max'],
    'level.off.desc': ['不发送思考参数，直接回答，最快最省', 'No reasoning parameters, fastest and cheapest'],
    'level.low.desc': ['使用少量推理来回答问题', 'A small amount of reasoning'],
    'level.mid.desc': ['使用中等推理，适合一般推理题', 'Moderate reasoning for everyday analysis'],
    'level.high.desc': ['使用较多推理，适合复杂问题与代码', 'More reasoning, better for hard problems and code'],
    'level.max.desc': ['使用最多推理，适合极难问题', 'Maximum reasoning, for the hardest problems'],
    'think.title': ['思考强度', 'Reasoning effort'],
    'think.sub': ['各档位对应模型用于思考的 Token 预算', 'Each level maps to a reasoning token budget'],
    'think.custom': ['自定义推理预算', 'Custom reasoning budget'],
    'think.customSub': ['当前 {0} token', 'Currently {0} tokens'],
    'think.customPh': ['输入 token 数，例如 2048', 'Enter a token count, e.g. 2048'],
    'think.customTitle': ['自定义推理预算', 'Custom reasoning budget'],
    'think.applies': ['将附加：{0}', 'Will send: {0}'],
    'think.none': ['不会附加思考参数', 'No reasoning parameters will be sent'],

    /* ------------------------------------------------------------ model */
    'model.title': ['选择模型', 'Choose a model'],
    'model.search': ['搜索模型或服务商', 'Search models or providers'],
    'model.sub': ['每个供应商独立保存模型列表', 'Each provider keeps its own model list'],
    'model.none': ['未配置模型', 'No models configured'],
    'model.goAdd': ['前往供应商设置添加', 'Add them in provider settings'],
    'model.manage': ['管理供应商', 'Manage providers'],
    'model.empty': ['没有匹配的模型', 'No matching models'],
    'provider.switch': ['切换供应商', 'Switch provider'],
    'provider.manage': ['管理供应商', 'Manage providers'],

    /* --------------------------------------------------------- settings */
    'settings.title': ['设置', 'Settings'],
    'group.general': ['通用设置', 'General'],
    'group.model': ['模型与配置', 'Models & services'],
    'group.chat': ['对话', 'Conversation'],
    'group.about': ['关于', 'About'],
    'set.theme': ['颜色模式', 'Color mode'],
    'set.theme.system': ['跟随系统', 'System'],
    'set.theme.light': ['白色', 'Light'],
    'set.theme.dark': ['黑色', 'Dark'],
    'set.providers': ['供应商', 'Providers'],
    'set.defaultModel': ['默认模型', 'Default model'],
    'set.search': ['搜索服务', 'Search service'],
    'set.instruct': ['指令注入', 'Instructions'],
    'set.context': ['上下文轮数', 'Context messages'],
    'set.contextHint': ['每次请求携带的历史消息条数，越大越费 token', 'How many past messages are sent with each request'],
    'set.temperature': ['温度', 'Temperature'],
    'set.temperatureHint': ['0 到 2 之间，越大回答越发散', 'Between 0 and 2, higher is more random'],
    'set.stats': ['统计', 'Usage'],
    'set.docs': ['使用文档', 'Documentation'],
    'set.about': ['关于', 'About'],
    'set.footer': ['Nexa · 数据仅保存在本机', 'Nexa · All data stays on this device'],
    'set.count': ['{0} 个', '{0}'],
    'set.notSet': ['未设置', 'Not set'],
    'set.lang': ['语言', 'Language'],
    'set.langSub': ['中文 / English', '中文 / English'],

    /* -------------------------------------------------------- providers */
    'pv.title': ['供应商', 'Providers'],
    'pv.empty': ['还没有供应商', 'No providers yet'],
    'pv.emptyDesc': ['供应商代表一个 API 服务端点：名称、Base URL、密钥与模型列表。点击右上角加号添加，或从内置预设开始。',
                     'A provider is one API endpoint: name, base URL, key and models. Tap + to add one, or start from a preset.'],
    'pv.add': ['添加供应商', 'Add provider'],
    'pv.sub': ['{0} 个模型 · {1}', '{0} models · {1}'],

    /* ----------------------------------------------------- provider edit */
    'pe.titleAdd': ['添加供应商', 'Add provider'],
    'pe.titleEdit': ['供应商', 'Provider'],
    'pe.presets': ['快速预设', 'Quick presets'],
    'pe.basic': ['基本信息', 'Basics'],
    'pe.name': ['名称', 'Name'],
    'pe.namePh': ['例如 DeepSeek', 'e.g. DeepSeek'],
    'pe.type': ['接口类型', 'API type'],
    'pe.baseUrl': ['Base URL', 'Base URL'],
    'pe.baseUrlPh': ['https://api.deepseek.com', 'https://api.deepseek.com'],
    'pe.baseUrlHint': ['只填到版本号之前即可，例如 https://api.deepseek.com；本机服务可填 http://192.168.x.x:1234/v1',
                       'Fill in up to the version segment, e.g. https://api.deepseek.com. For a local server use http://192.168.x.x:1234/v1'],
    'pe.key': ['API 密钥', 'API key'],
    'pe.keyPh': ['sk-...', 'sk-...'],
    'pe.keyHint': ['密钥使用 Android KeyStore 加密后保存在本机，不会上传到任何服务器',
                   'Keys are encrypted with the Android KeyStore and stay on this device'],
    'pe.models': ['模型列表', 'Models'],
    'pe.modelsPh': ['每行一个模型名', 'One model per line'],
    'pe.modelsHint': ['每行一个模型名称，也可以点下面的按钮从接口自动拉取。',
                      'One model name per line. You can also fetch the list from the API below.'],
    'pe.fetch': ['从接口拉取模型', 'Fetch models from API'],
    'pe.fetching': ['拉取中…', 'Fetching…'],
    'pe.fetched': ['获取到 {0} 个模型', 'Fetched {0} models'],
    'pe.fetchNone': ['未获取到模型', 'No models returned'],
    'pe.fetchFail': ['拉取失败：{0}', 'Fetch failed: {0}'],
    'pe.think': ['思考参数', 'Reasoning parameters'],
    'pe.style': ['参数风格', 'Parameter style'],
    'pe.styleHint': ['不同接口接受的字段不一样。不确定就选「跟随模型自动判断」。',
                     'Different APIs accept different fields. Use automatic when unsure.'],
    'pe.style.auto': ['跟随模型', 'Automatic'],
    'pe.style.effort': ['reasoning_effort', 'reasoning_effort'],
    'pe.style.budget': ['thinking 预算', 'thinking budget'],
    'pe.style.both': ['两者都发', 'Send both'],
    'pe.style.none': ['都不发', 'Send none'],
    'pe.advanced': ['高级', 'Advanced'],
    'pe.extra': ['附加请求体（JSON，可选）', 'Extra request body (JSON, optional)'],
    'pe.extraPh': ['{"top_p": 0.9}', '{"top_p": 0.9}'],
    'pe.extraHint': ['会原样合并进请求体，用于供应商特有的参数。留空即可。',
                     'Merged verbatim into the request body for provider-specific fields. Leave empty if unsure.'],
    'pe.test': ['测试连接', 'Test connection'],
    'pe.testing': ['测试中…', 'Testing…'],
    'pe.testOk': ['连接成功', 'Connected'],
    'pe.testFail': ['连接失败', 'Connection failed'],
    'pe.testProbe': ['只回复：连接成功', 'Reply with exactly: OK'],
    'pe.del': ['删除供应商', 'Delete provider'],
    'pe.delTitle': ['删除供应商', 'Delete provider'],
    'pe.needUrl': ['请填写 Base URL', 'Base URL is required'],
    'pe.needModel': ['请先填写至少一个模型', 'Add at least one model'],
    'pe.presetFilled': ['已填入预设，请补充 API 密钥', 'Preset applied — now add your API key'],
    'pe.preview': ['当前请求会附加：{0}', 'This request will send: {0}'],
    'pe.previewNone': ['当前请求不会附加思考参数', 'No reasoning parameters will be sent'],

    /* ---------------------------------------------------- instructions */
    'ip.title': ['指令注入', 'Instructions'],
    'ip.card': ['系统提示词', 'System prompt'],
    'ip.cardDesc': ['这里填写的内容会作为 system 消息，与你的对话一起发送给模型，用来约束它的角色与输出风格。',
                    'What you write here is sent as the system message together with your conversation, shaping the model\u2019s role and style.'],
    'ip.ph': ['例如：始终使用简体中文回答，代码注释用中文。', 'e.g. Always answer in English and keep code comments short.'],
    'ip.hint': ['输入即自动保存', 'Saved as you type'],
    'ip.tellRounds': ['联网时告知 AI 最多调用次数', 'Tell the AI the search limit'],
    'ip.tellRoundsHint': ['开启后，会在系统提示词末尾附加一句说明，把当前的检索轮数上限告诉模型，帮助它一次性规划好关键词，避免浪费轮数。',
                          'When on, a line stating the current search-round limit is appended to the system prompt so the model can plan its queries instead of wasting rounds.'],
    'sys.searchBudget': ['联网搜索已开启。你最多可以调用 {0} 轮网络检索工具（web_search），请一次性规划好关键词，不要浪费轮数；如果检索没有结果，请直接基于已有信息回答，不要反复重试。',
                         'Web search is enabled. You may call the web_search tool at most {0} times. Plan your queries carefully instead of wasting rounds; if a search returns nothing, answer with what you already have rather than retrying.'],
    'chat.limited': ['已达检索轮数上限（{0} 轮），本轮结束。', 'Search round limit reached ({0}), this reply stopped here.'],

    /* ---------------------------------------------------------- search */
    'ss.title': ['搜索服务', 'Search service'],
    'ss.card': ['联网搜索', 'Web search'],
    'ss.cardDesc': ['开启后，发送消息前会先用所选服务检索网页，把结果作为参考资料注入本次请求。',
                    'When enabled, the app searches the web before sending and injects the results as reference material.'],
    'ss.provider': ['服务', 'Service'],
    'ss.providerHint': ['标记「国内直连」的在境内网络可用；标记「需海外网络」的在国内通常无法访问。',
                        'Entries marked "direct" work on mainland networks; "overseas" ones usually do not.'],
    'ss.maxRounds': ['最多检索轮数', 'Max search rounds'],
    'ss.maxRoundsHint': ['模型在一次回答里最多能连续检索几轮（1 到 10）。轮数越多越费 token，因为每一轮都要重发完整对话。',
                         'How many consecutive search rounds the model may run per answer (1 to 10). More rounds cost more tokens because the whole conversation is resent each time.'],
    'ss.count': ['搜索结果条数', 'Results per search'],
    'ss.countHint': ['注入到提示词中的资料条数，3 到 10 条。', 'How many results are injected, 3 to 10.'],
    'ss.tavilyKey': ['Tavily API 密钥', 'Tavily API key'],
    'ss.searxUrl': ['SearXNG 地址', 'SearXNG URL'],
    'ss.searxHint': ['需要该实例允许 JSON 输出（format=json）。', 'The instance must allow JSON output (format=json).'],
    'ss.test': ['测试检索', 'Test search'],
    'ss.testPh': ['输入关键词', 'Enter keywords'],
    'ss.searching': ['检索中…', 'Searching…'],
    'ss.results': ['检索结果（{0}）', 'Results ({0})'],
    'ss.noResults': ['没有返回结果。', 'No results returned.'],
    'ss.fail': ['检索失败：{0}', 'Search failed: {0}'],
    'ss.needKey': ['未配置 Tavily API 密钥', 'Tavily API key is missing'],
    'ss.needUrl': ['未配置 SearXNG 地址', 'SearXNG URL is missing'],
    'ss.region.cn': ['国内直连', 'Direct in CN'],
    'ss.region.abroad': ['需海外网络', 'Overseas'],
    'ss.region.any': ['需配置', 'Needs setup'],

    /* ----------------------------------------------------------- stats */
    'st.title': ['统计', 'Usage'],
    'st.requests': ['请求次数', 'Requests'],
    'st.input': ['输入 Token', 'Input tokens'],
    'st.output': ['输出 Token', 'Output tokens'],
    'st.total': ['总计 Token', 'Total tokens'],
    'st.hit': ['缓存命中率', 'Cache hit rate'],
    'st.hitDetail': ['命中 {0} / 未命中 {1}', '{0} hit / {1} miss'],
    'st.byModel': ['按模型', 'By model'],
    'st.empty': ['暂无数据', 'No data yet'],
    'st.line': ['入 {0} · 出 {1} · 命中 {2}% · {3} 次', 'in {0} · out {1} · hit {2}% · {3} req'],
    'st.reset': ['重置统计', 'Reset usage'],
    'st.resetTitle': ['重置统计', 'Reset usage'],
    'st.note': ['说明：缓存命中率来自接口返回的用量字段（DeepSeek 的 prompt_cache_hit_tokens、OpenAI 的 cached_tokens、Anthropic 的 cache_read_input_tokens、Gemini 的 cachedContentTokenCount）。供应商不返回该字段时显示为 0%。',
                'The cache hit rate comes from the usage fields returned by the API (prompt_cache_hit_tokens on DeepSeek, cached_tokens on OpenAI, cache_read_input_tokens on Anthropic, cachedContentTokenCount on Gemini). It shows 0% when a provider does not report it.'],

    /* ------------------------------------------------------------ docs */
    'docs.title': ['使用文档', 'Documentation'],
    'docs.missing': ['文档缺失', 'Documentation missing'],

    /* ----------------------------------------------------------- about */
    'ab.title': ['关于', 'About'],
    'ab.sub': ['v1.0 · 本地优先的通用 AI 客户端', 'v1.0 · a local-first universal AI client'],
    'ab.device': ['设备：{0}', 'Device: {0}'],
    'ab.os': ['系统：Android {0}', 'OS: Android {0}'],
    'ab.p1': ['对话均保存在本机，API 密钥使用 Android KeyStore 加密。',
              'Conversations stay on this device and API keys are encrypted with the Android KeyStore.'],
    'ab.p2': ['所有请求由你配置的供应商直接处理，应用不经过任何中转服务器。',
              'Requests go straight to the providers you configure — there is no relay server.'],

    /* ---------------------------------------------------------- errors */
    'err.401': ['认证失败（401）：API 密钥无效或已过期。', 'Unauthorized (401): the API key is invalid or expired.'],
    'err.402': ['账户余额不足（402）。', 'Insufficient balance (402).'],
    'err.403': ['无访问权限（403）：请检查 API 密钥与模型权限。', 'Forbidden (403): check the API key and model permissions.'],
    'err.404': ['接口不存在（404）：请检查 Base URL 是否正确。', 'Not found (404): check the base URL.'],
    'err.400': ['请求参数错误（400）：可能是当前模型不支持所选参数。可在供应商设置里把「参数风格」改为「都不发」后重试。',
                'Bad request (400): the model may reject the parameters being sent. Set the parameter style to "Send none" and retry.'],
    'err.429': ['请求过于频繁或额度受限（429），请稍后重试。', 'Rate limited or out of quota (429). Try again later.'],
    'err.5xx': ['服务端错误，请稍后重试。', 'Server error. Try again later.'],
    'err.timeout': ['连接超时：请检查网络或 Base URL。', 'Connection timed out: check your network and base URL.'],
    'err.dns': ['无法解析域名：请检查网络与 Base URL。', 'Cannot resolve the host: check your network and base URL.'],
    'err.refused': ['无法连接到服务器：请确认 Base URL、端口与服务状态。',
                    'Cannot reach the server: check the base URL, port and whether the service is running.'],
    'err.tls': ['TLS 证书校验失败：请检查地址是否为有效 HTTPS。', 'TLS handshake failed: make sure the address is valid HTTPS.'],
    'err.aborted': ['已停止', 'Stopped'],
    'err.toolLoop': ['工具调用轮数超出上限', 'Tool call limit reached'],

    /* -------------------------------------------------- readme (title) */
    'readme.title': ['使用文档', 'Documentation']
  };

  var ctx = null;

  function get(key) {
    var e = D[key];
    if (!e) return key;
    return ctx === 'en' ? e[1] : e[0];
  }

  function T(key, a, b, c) {
    var s = get(key);
    if (a !== undefined) s = s.replace('{0}', a);
    if (b !== undefined) s = s.replace('{1}', b);
    if (c !== undefined) s = s.replace('{2}', c);
    return s;
  }

  T.set = function (lang) { ctx = lang === 'en' ? 'en' : 'zh'; };
  T.lang = function () { return ctx || 'zh'; };
  T.isEn = function () { return ctx === 'en'; };
  T.has = function (k) { return !!D[k]; };

  App.T = T;
})();
