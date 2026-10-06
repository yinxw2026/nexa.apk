# Nexa Documentation

Nexa is a local-first universal AI chat client. It is not tied to any vendor: you can plug in any OpenAI-compatible endpoint, Anthropic, or Google Gemini and switch between them inside the same app.

All conversations and keys stay on this device.

---

## 1. Quick start

1. Open the app. **New chat** is in the top right, **history** in the top left.
2. Tap the plus button to open settings, then **Providers → Add provider**.
3. Pick a preset (DeepSeek, for example), paste your **API key** and save.
4. Go back, tap the model chip next to the title, choose a model and start chatting.

If you are unsure about the key, use **Test connection** on the provider page to verify the URL and key.

---

## 2. Providers

A provider is one API endpoint configuration:

| Field | Meaning |
| --- | --- |
| Name | Label only, e.g. DeepSeek or Office server |
| API type | OpenAI compatible / Anthropic / Google Gemini |
| Base URL | Service address, e.g. `https://api.deepseek.com` |
| API key | Encrypted and stored on this device |
| Models | One model name per line, or fetch them from the API |
| Parameter style | How reasoning parameters are sent, see section 4 |
| Extra body | Optional JSON merged verbatim into the request |

Fill the Base URL only up to the version segment; the path is added automatically:

- OpenAI compatible: `https://api.deepseek.com` → `.../v1/chat/completions`
- Already versioned: `http://192.168.1.2:1234/v1` → `.../v1/chat/completions`
- Anthropic: `https://api.anthropic.com` → `.../v1/messages`
- Gemini: `https://generativelanguage.googleapis.com`

Presets cover DeepSeek, OpenAI, Kimi, Zhipu GLM, Qwen, SiliconFlow, Claude, Gemini and local / LAN servers.

---

## 3. Chatting

- **New chat**: plus button in the top right.
- **History**: list button in the top left, searchable by title, long press to rename or delete.
- **Regenerate**: refresh button under any assistant message.
- **Stop**: the send button turns into a stop button while generating.
- **Code blocks**: copy button in the top right. Headings, lists, tables, quotes and code blocks are supported.
- **Reasoning**: thinking output appears above the answer, showing only the newest four lines with the top edge fading out and auto-scrolling upward; tap Expand on the right for the full trace. Even if a reply ends because the search round limit was reached, the trace and any text already produced are preserved.
- **Usage per reply**: the total tokens and elapsed time are shown under every finished answer.
- **Context**: the number of past messages sent with each request is configurable.
- **Language**: the 中/En button in the bottom left of the drawer switches the interface language.

---

## 4. Reasoning effort

The icon above the input opens the reasoning panel with a five-stop slider, plus a **custom reasoning budget** entry:

| Level | Budget | Good for |
| --- | --- | --- |
| Off | 0 | Direct answers, fastest and cheapest |
| Low | 2048 tokens | Everyday questions, light rewriting |
| Medium | 4096 tokens | Ordinary analytical questions |
| High | 8192 tokens | Hard reasoning, maths, long code |
| Max | 16384 tokens | The hardest problems |
| Custom | your value | Precise control over thinking cost |

APIs differ in the fields they accept, so each provider has a **parameter style**:

- Follow the model: only send parameters when the model name looks like a reasoning model
- reasoning_effort: send `reasoning_effort: low/high`
- thinking budget: send `thinking: {type: enabled, budget_tokens: N}`
- Send both
- Send none: for strict APIs that reject unknown fields

The provider page shows a **live preview** of exactly what will be sent. If the API answers 400 about an unknown parameter, switch the style to "Send none".

---

## 5. Web search

The globe icon above the input toggles web search. When enabled, the definition of a `web_search` tool is sent with each request and **the model itself decides whether to search and which keywords to use**. While it does, a light green breathing dot and "Searching the web…" appear in the message. The app runs the search and hands the results back to the model.

Two settings control it: **results per search** (1 to 10) and **max search rounds** (1 to 10, default 4). More rounds cost more tokens because the whole conversation is resent each time. When the limit is reached the reply simply ends there — the reasoning trace and whatever was already written are kept, never discarded.

The Instructions page also has a **"Tell the AI the search limit"** switch (on by default). It appends one sentence to the system prompt stating the current round limit so the model can plan its queries. That sentence goes to the model only; it never appears in the input box.

This feature requires a model that supports function calling; turn the toggle off for APIs that do not.

Supported services and their reachability:

| Service | Availability |
| --- | --- |
| **Bing** | Reachable in mainland China, no key, 10 results |
| **Baidu** | Reachable in mainland China, scraped, basic quality |
| Tavily | API key required |
| SearXNG | Self-hosted instance with JSON output |
| DuckDuckGo | Requires an overseas network |
| Wikipedia | Requires an overseas network |

Switch and test them under **Settings → Search service**.

---

## 6. Attachments

The paperclip button above the input lets you pick several files at once:

- Tapping the paperclip offers **Camera / Photos / Files**
- Text files (code, Markdown, JSON, CSV …) are sent as text with the message
- Images are downscaled and sent as image content, for models with vision support
- Other binary files only contribute their name and size

Selected files appear at the top left above the input box and can be removed with the cross button.

---

## 7. Appearance

Settings → Color mode offers **System / Light / Dark**. The moon and sun button in the bottom left of the drawer cycles through them.

---

## 8. Security and privacy

- **Transport**: requests go over HTTPS straight to the endpoint you configured; there is no relay server. Cleartext `http://` is allowed so local and LAN models work, but such addresses are not encrypted in transit.
- **At rest**: API keys, conversations and usage data are encrypted with AES-256-GCM in the app's private directory, with the key held by the Android KeyStore. No other app can read them.
- **No telemetry**: there is no analytics, advertising or data reporting of any kind.

The encryption key is bound to the device: uninstalling the app makes the data unrecoverable, so export anything you need first.

---

## 9. Usage

Settings → Usage shows request count, input / output / total tokens, cache hit rate and a per-model breakdown.

The cache hit rate comes from the usage fields returned by the API: `prompt_cache_hit_tokens` on DeepSeek, `cached_tokens` on OpenAI, `cache_read_input_tokens` on Anthropic, `cachedContentTokenCount` on Gemini. It shows 0% when a provider does not report it.

---

## 10. Troubleshooting

**401 Unauthorized**
The key is wrong or expired. Copy it again and make sure there are no extra spaces.

**404 Not found**
The Base URL is wrong. Most services only need the domain; the path is added automatically.

**400 Unknown parameter**
Set the parameter style to "Send none" in the provider settings.

**Fetch models returns nothing**
Some services have no `/models` endpoint — type the model names manually.

**The model says it cannot see my image**
The selected model has no vision support. Use a multimodal model.

**Search returns nothing**
Check that the chosen service is reachable from your network; on mainland networks use Bing or Baidu.
