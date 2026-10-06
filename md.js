/* ============================================================
   md.js — compact markdown renderer (no external deps)
   ============================================================ */
window.App = window.App || {};
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function inline(s) {
    var codes = [];
    s = s.replace(/`([^`\n]+)`/g, function (_, c) {
      codes.push(c);
      return '\u0001C' + (codes.length - 1) + '\u0001';
    });
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
    s = s.replace(/\[([^\]\n]*)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    s = s.replace(/\u0001C(\d+)\u0001/g, function (_, i) { return '<code>' + codes[+i] + '</code>'; });
    return s;
  }

  function render(src) {
    src = String(src == null ? '' : src).replace(/\r\n?/g, '\n');
    var text = esc(src);
    var lines = text.split('\n');
    var out = [];
    var i = 0;

    function isBlockStart(l) {
      var t = l.trim();
      if (!t) return true;
      if (/^```/.test(t)) return true;
      if (/^#{1,6}\s/.test(t)) return true;
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) return true;
      if (/^>/.test(t)) return true;
      if (/^&gt;/.test(t)) return true;
      if (/^([-*+]|\d+\.)\s/.test(t)) return true;
      if (t.indexOf('|') >= 0) return true;
      return false;
    }

    while (i < lines.length) {
      var raw = lines[i];
      var t = raw.trim();

      if (!t) { i++; continue; }

      /* fenced code */
      if (/^```/.test(t)) {
        var lang = t.replace(/^```/, '').trim();
        var buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
        i++;
        out.push('<pre data-lang="' + esc(lang) + '"><div class="code-bar"><span class="code-lang">'
          + (lang ? esc(lang) : 'code') + '</span><button class="code-copy" type="button">'
          + '<svg class="i i12"><use href="#i-copy"></use></svg>复制</button></div><code>'
          + buf.join('\n') + '</code></pre>');
        continue;
      }

      /* heading */
      var h = /^(#{1,6})\s+(.*)$/.exec(t);
      if (h) {
        var lv = Math.min(h[1].length, 4);
        out.push('<h' + lv + '>' + inline(h[2].replace(/\s+#+\s*$/, '')) + '</h' + lv + '>');
        i++; continue;
      }

      /* hr */
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { out.push('<hr>'); i++; continue; }

      /* blockquote */
      if (/^(&gt;|>)/.test(t)) {
        var q = [];
        while (i < lines.length && /^(&gt;|>)/.test(lines[i].trim())) {
          q.push(lines[i].trim().replace(/^(&gt;|>)\s?/, '')); i++;
        }
        out.push('<blockquote>' + inline(q.join('<br>')) + '</blockquote>');
        continue;
      }

      /* table */
      if (t.indexOf('|') >= 0 && i + 1 < lines.length &&
          /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
        var head = splitRow(t);
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].trim().indexOf('|') >= 0) {
          rows.push(splitRow(lines[i].trim())); i++;
        }
        var html = '<table><thead><tr>';
        head.forEach(function (c) { html += '<th>' + inline(c) + '</th>'; });
        html += '</tr></thead><tbody>';
        rows.forEach(function (r) {
          html += '<tr>';
          r.forEach(function (c) { html += '<td>' + inline(c) + '</td>'; });
          html += '</tr>';
        });
        html += '</tbody></table>';
        out.push(html);
        continue;
      }

      /* list */
      if (/^([-*+]|\d+\.)\s/.test(t)) {
        var ordered = /^\d+\./.test(t);
        var items = [];
        while (i < lines.length) {
          var lt = lines[i];
          var ltt = lt.trim();
          if (!ltt) break;
          var mm = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(lt);
          if (mm) {
            items.push({ ind: mm[1].length, txt: mm[3], ord: /\d/.test(mm[2]) });
            i++;
          } else if (/^\s{2,}\S/.test(lt) && items.length) {
            items[items.length - 1].txt += '<br>' + lt.trim();
            i++;
          } else break;
        }
        var listHtml = '<' + (ordered ? 'ol' : 'ul') + '>';
        items.forEach(function (it) {
          listHtml += '<li' + (it.ind >= 2 ? ' class="sub"' : '') + '>' + inline(it.txt) + '</li>';
        });
        listHtml += '</' + (ordered ? 'ol' : 'ul') + '>';
        out.push(listHtml);
        continue;
      }

      /* paragraph */
      var para = [];
      while (i < lines.length && !isBlockStart(lines[i])) { para.push(lines[i].trim()); i++; }
      if (!para.length) { para.push(lines[i] ? lines[i].trim() : ''); i++; }
      out.push('<p>' + inline(para.join('<br>')) + '</p>');
    }

    return out.join('');
  }

  function splitRow(line) {
    line = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '');
    return line.split('|').map(function (c) { return c.trim(); });
  }

  App.md = render;
  App.mdInline = inline;
})();
