package com.nexa.chat;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONObject;

public class Bridge {

    private final Activity act;
    private final WebView web;
    private final FrameLayout root;
    private final SecureStore vault;

    public Bridge(Activity act, WebView web, FrameLayout root) {
        this.act = act;
        this.web = web;
        this.root = root;
        this.vault = new SecureStore(act);
    }

    // ---------------------------------------------------------------- helpers

    private void call(final String fn, final String argsJson) {
        final String js = "window.__native&&window.__native." + fn + "(" + argsJson + ")";
        act.runOnUiThread(new Runnable() {
            @Override public void run() {
                try { web.evaluateJavascript(js, null); } catch (Throwable ignored) {}
            }
        });
    }

    private void ui(Runnable r) { act.runOnUiThread(r); }

    // ------------------------------------------------------------- lifecycle

    public void onPageReady() {
        call("onReady", "");
    }

    @JavascriptInterface
    public String info() {
        try {
            JSONObject o = new JSONObject();
            o.put("version", "1.0");
            o.put("brand", Build.MANUFACTURER);
            o.put("model", Build.MODEL);
            o.put("sdk", Build.VERSION.SDK_INT);
            return o.toString();
        } catch (Throwable t) {
            return "{}";
        }
    }

    @JavascriptInterface
    public void setLang(String l) {
        try { ((MainActivity) act).setLang("en".equals(l) ? "en" : "zh"); } catch (Throwable ignored) {}
    }

    @JavascriptInterface
    public void toast(final String msg) {
        ui(() -> Toast.makeText(act, msg == null ? "" : msg, Toast.LENGTH_SHORT).show());
    }

    @JavascriptInterface
    public void applyBars(final boolean light) {
        ui(() -> {
            try {
                Window w = act.getWindow();
                int bg = light ? 0xFFFFFFFF : 0xFF000000;
                w.setStatusBarColor(bg);
                w.setNavigationBarColor(bg);
                if (root != null) root.setBackgroundColor(bg);
                View d = w.getDecorView();
                int f = d.getSystemUiVisibility();
                if (light) {
                    f |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    f |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                } else {
                    f &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    f &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                }
                d.setSystemUiVisibility(f);
            } catch (Throwable ignored) {}
        });
    }

    // ------------------------------------------------------------- clipboard

    @JavascriptInterface
    public void copyText(final String t) {
        ui(() -> {
            try {
                ClipboardManager cm = (ClipboardManager) act.getSystemService(Context.CLIPBOARD_SERVICE);
                cm.setPrimaryClip(ClipData.newPlainText("text", t == null ? "" : t));
            } catch (Throwable ignored) {}
        });
    }

    @JavascriptInterface
    public String pasteText() {
        try {
            ClipboardManager cm = (ClipboardManager) act.getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm == null || cm.getPrimaryClip() == null || cm.getPrimaryClip().getItemCount() == 0) return "";
            CharSequence cs = cm.getPrimaryClip().getItemAt(0).coerceToText(act);
            return cs == null ? "" : cs.toString();
        } catch (Throwable t) {
            return "";
        }
    }

    @JavascriptInterface
    public void shareText(final String t) {
        ui(() -> {
            try {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_TEXT, t == null ? "" : t);
                act.startActivity(Intent.createChooser(i, "Share"));
            } catch (Throwable ignored) {}
        });
    }

    @JavascriptInterface
    public void openUrl(final String u) {
        ui(() -> {
            try { act.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u))); } catch (Throwable ignored) {}
        });
    }

    // ----------------------------------------------------------- encrypted kv

    @JavascriptInterface
    public String kvGet(String k) {
        try { return vault.get(k); } catch (Throwable t) { return ""; }
    }

    @JavascriptInterface
    public void kvPut(String k, String v) {
        try { vault.put(k, v == null ? "" : v); } catch (Throwable ignored) {}
    }

    @JavascriptInterface
    public void kvDel(String k) {
        try { vault.remove(k); } catch (Throwable ignored) {}
    }

    @JavascriptInterface
    public void kvClear() {
        try { vault.clear(); } catch (Throwable ignored) {}
    }

    // ------------------------------------------------------------------ http

    @JavascriptInterface
    public void httpStream(String id, String method, String url, String headersJson, String body) {
        Http.stream(web, id, method, url, headersJson, body);
    }

    @JavascriptInterface
    public void httpFetch(String id, String method, String url, String headersJson, String body) {
        Http.fetch(web, id, method, url, headersJson, body);
    }

    @JavascriptInterface
    public void httpCancel(String id) {
        Http.cancel(id);
    }
}
