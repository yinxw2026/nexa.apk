package com.nexa.chat;

import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Iterator;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Generic HTTP engine. Runs requests off the UI thread and pushes results back
 * into the WebView through window.__http callbacks.
 */
public final class Http {

    private static final ExecutorService POOL = Executors.newCachedThreadPool();
    private static final ConcurrentHashMap<String, HttpURLConnection> LIVE = new ConcurrentHashMap<>();
    private static final Handler UI = new Handler(Looper.getMainLooper());

    private Http() {}

    public static void cancel(String id) {
        HttpURLConnection c = LIVE.remove(id);
        if (c != null) {
            try { c.disconnect(); } catch (Throwable ignored) {}
        }
    }

    public static void cancelAll() {
        for (String k : new java.util.ArrayList<>(LIVE.keySet())) cancel(k);
    }

    private static String quote(String s) {
        if (s == null) return "null";
        String q = JSONObject.quote(s);
        q = q.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029");
        return q;
    }

    private static void emit(WebView web, String js) {
        if (web == null) return;
        UI.post(new Runnable() {
            @Override public void run() {
                try { web.evaluateJavascript(js, null); } catch (Throwable ignored) {}
            }
        });
    }

    private static String stack(Throwable t) {
        String m = t.getMessage();
        if (m == null || m.isEmpty()) m = t.getClass().getSimpleName();
        return m;
    }

    private static void applyHeaders(HttpURLConnection c, String headersJson) {
        if (headersJson == null || headersJson.isEmpty()) return;
        try {
            JSONObject o = new JSONObject(headersJson);
            Iterator<String> it = o.keys();
            while (it.hasNext()) {
                String k = it.next();
                String v = o.optString(k, "");
                try { c.setRequestProperty(k, v); } catch (Throwable ignored) {}
            }
        } catch (Throwable ignored) {}
    }

    /** Streaming request: emits onStatus / onChunk* / onDone, or onErr. */
    public static void stream(final WebView web, final String id, final String method,
                              final String url, final String headersJson, final String body) {
        POOL.execute(new Runnable() {
            @Override public void run() {
                HttpURLConnection conn = null;
                try {
                    conn = (HttpURLConnection) new URL(url).openConnection();
                    conn.setRequestMethod(method == null || method.isEmpty() ? "POST" : method);
                    conn.setConnectTimeout(25000);
                    conn.setReadTimeout(600000);
                    conn.setDoInput(true);
                    conn.setInstanceFollowRedirects(true);
                    LIVE.put(id, conn);
                    applyHeaders(conn, headersJson);
                    if (body != null && !body.isEmpty()) {
                        conn.setDoOutput(true);
                        byte[] raw = body.getBytes("UTF-8");
                        conn.setFixedLengthStreamingMode(raw.length);
                        OutputStream os = conn.getOutputStream();
                        os.write(raw);
                        os.flush();
                        try { os.close(); } catch (Throwable ignored) {}
                    }
                    int code = conn.getResponseCode();
                    emit(web, "window.__http&&window.__http.onStatus(" + quote(id) + "," + code + ")");

                    InputStream in = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
                    if (code >= 400) {
                        String err = readAll(in);
                        emit(web, "window.__http&&window.__http.onErr(" + quote(id) + "," + quote("HTTP " + code + (err.isEmpty() ? "" : "\n" + err)) + ")");
                        return;
                    }
                    if (in == null) {
                        emit(web, "window.__http&&window.__http.onErr(" + quote(id) + "," + quote("空响应") + ")");
                        return;
                    }
                    BufferedReader r = new BufferedReader(new InputStreamReader(in, "UTF-8"), 8192);
                    char[] buf = new char[4096];
                    StringBuilder acc = new StringBuilder();
                    long last = System.currentTimeMillis();
                    int n;
                    while ((n = r.read(buf)) > 0) {
                        acc.append(buf, 0, n);
                        long now = System.currentTimeMillis();
                        if (acc.length() >= 1200 || (acc.length() > 0 && now - last >= 60)) {
                            emit(web, "window.__http&&window.__http.onChunk(" + quote(id) + "," + quote(acc.toString()) + ")");
                            acc.setLength(0);
                            last = now;
                        }
                    }
                    if (acc.length() > 0) {
                        emit(web, "window.__http&&window.__http.onChunk(" + quote(id) + "," + quote(acc.toString()) + ")");
                    }
                    try { r.close(); } catch (Throwable ignored) {}
                    emit(web, "window.__http&&window.__http.onDone(" + quote(id) + ")");
                } catch (Throwable t) {
                    LIVE.remove(id);
                    emit(web, "window.__http&&window.__http.onErr(" + quote(id) + "," + quote(stack(t)) + ")");
                } finally {
                    LIVE.remove(id);
                    if (conn != null) { try { conn.disconnect(); } catch (Throwable ignored) {} }
                }
            }
        });
    }

    /** Buffered request used for search / model list / connection test. */
    public static void fetch(final WebView web, final String id, final String method,
                             final String url, final String headersJson, final String body) {
        POOL.execute(new Runnable() {
            @Override public void run() {
                HttpURLConnection conn = null;
                try {
                    conn = (HttpURLConnection) new URL(url).openConnection();
                    conn.setRequestMethod(method == null || method.isEmpty() ? "GET" : method);
                    conn.setConnectTimeout(25000);
                    conn.setReadTimeout(120000);
                    conn.setDoInput(true);
                    conn.setInstanceFollowRedirects(true);
                    LIVE.put(id, conn);
                    applyHeaders(conn, headersJson);
                    if (body != null && !body.isEmpty()) {
                        conn.setDoOutput(true);
                        byte[] raw = body.getBytes("UTF-8");
                        conn.setFixedLengthStreamingMode(raw.length);
                        OutputStream os = conn.getOutputStream();
                        os.write(raw);
                        os.flush();
                        try { os.close(); } catch (Throwable ignored) {}
                    }
                    int code = conn.getResponseCode();
                    InputStream in = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
                    String text = readAll(in);
                    emit(web, "window.__http&&window.__http.onResp(" + quote(id) + "," + code + "," + quote(text) + ")");
                } catch (Throwable t) {
                    emit(web, "window.__http&&window.__http.onErr(" + quote(id) + "," + quote(stack(t)) + ")");
                } finally {
                    LIVE.remove(id);
                    if (conn != null) { try { conn.disconnect(); } catch (Throwable ignored) {} }
                }
            }
        });
    }

    private static String readAll(InputStream in) {
        if (in == null) return "";
        try {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            int total = 0;
            while ((n = in.read(buf)) > 0) {
                bos.write(buf, 0, n);
                total += n;
                if (total > 6 * 1024 * 1024) break;
            }
            return new String(bos.toByteArray(), "UTF-8");
        } catch (Throwable t) {
            return "";
        } finally {
            try { in.close(); } catch (Throwable ignored) {}
        }
    }
}
