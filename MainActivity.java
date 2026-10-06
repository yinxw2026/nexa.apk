package com.nexa.chat;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.File;

public class MainActivity extends Activity {

    private static final int REQ_CAMERA = 7001;
    private static final int REQ_GALLERY = 7002;
    private static final int REQ_FILES = 7003;

    private WebView web;
    private Bridge bridge;
    private FrameLayout root;
    private ValueCallback<Uri[]> fileCb;
    private Uri cameraUri;
    private String lang = "zh";

    static final String[] LABELS_ZH = {"拍摄", "照片", "文件"};
    static final String[] LABELS_EN = {"Camera", "Photos", "Files"};

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.WHITE);

        web = new WebView(this);
        web.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setSupportZoom(false);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try { s.setSafeBrowsingEnabled(false); } catch (Throwable ignored) {}
        }
        web.setBackgroundColor(Color.TRANSPARENT);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req == null ? null : req.getUrl();
                String sc = u == null ? null : u.getScheme();
                if (sc != null && (sc.equals("http") || sc.equals("https"))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Throwable ignored) {}
                    return true;
                }
                return false;
            }
            @Override
            public void onPageFinished(WebView v, String url) {
                if (bridge != null) bridge.onPageReady();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb,
                                             FileChooserParams params) {
                if (fileCb != null) { try { fileCb.onReceiveValue(null); } catch (Throwable ignored) {} }
                fileCb = cb;
                showSourceDialog();
                return true;
            }
        });

        bridge = new Bridge(this, web, root);
        web.addJavascriptInterface(bridge, "Native");

        root.addView(web);
        setContentView(root);
        bridge.applyBars(true);
        web.loadUrl("file:///android_asset/www/index.html");
    }

    void setLang(String l) { lang = l; }

    private void showSourceDialog() {
        final String[] items = "en".equals(lang) ? LABELS_EN : LABELS_ZH;
        try {
            new AlertDialog.Builder(this)
                    .setItems(items, (d, which) -> {
                        if (which == 0) launchCamera();
                        else if (which == 1) launchGallery();
                        else launchFiles();
                    })
                    .setOnCancelListener(d -> cancelPick())
                    .show();
        } catch (Throwable t) {
            launchFiles();
        }
    }

    private void cancelPick() {
        if (fileCb != null) {
            try { fileCb.onReceiveValue(null); } catch (Throwable ignored) {}
            fileCb = null;
        }
    }

    private void launchCamera() {
        try {
            File dir = new File(getCacheDir(), "shared");
            if (!dir.exists()) dir.mkdirs();
            File out = new File(dir, "photo_" + System.currentTimeMillis() + ".jpg");
            cameraUri = FileProviderLite.uriFor(out);
            Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            i.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
            i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(i, REQ_CAMERA);
        } catch (Throwable t) {
            cameraUri = null;
            launchFiles();
        }
    }

    private void launchGallery() {
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                Intent i = new Intent("android.provider.action.PICK_IMAGES");
                i.setType("image/*");
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                startActivityForResult(i, REQ_GALLERY);
                return;
            }
            Intent i = new Intent(Intent.ACTION_GET_CONTENT);
            i.setType("image/*");
            i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            startActivityForResult(Intent.createChooser(i, "Photos"), REQ_GALLERY);
        } catch (Throwable t) {
            launchFiles();
        }
    }

    private void launchFiles() {
        try {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(Intent.createChooser(i, "Files"), REQ_FILES);
        } catch (Throwable t) {
            cancelPick();
        }
    }

    private static Uri[] collect(Intent data) {
        if (data == null) return null;
        ClipData cd = data.getClipData();
        if (cd != null && cd.getItemCount() > 0) {
            Uri[] out = new Uri[cd.getItemCount()];
            for (int i = 0; i < cd.getItemCount(); i++) out[i] = cd.getItemAt(i).getUri();
            return out;
        }
        if (data.getData() != null) return new Uri[]{ data.getData() };
        return null;
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_CAMERA || req == REQ_GALLERY || req == REQ_FILES) {
            Uri[] result = null;
            if (res == RESULT_OK) {
                if (req == REQ_CAMERA) {
                    if (cameraUri != null) result = new Uri[]{ cameraUri };
                } else {
                    result = collect(data);
                }
            }
            if (fileCb != null) {
                try { fileCb.onReceiveValue(result); } catch (Throwable ignored) {}
                fileCb = null;
            }
            cameraUri = null;
            return;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public void onBackPressed() {
        if (web == null) { finish(); return; }
        try {
            web.evaluateJavascript("(window.__onBack&&window.__onBack())?1:0", value -> {
                if (!"1".equals(value)) finish();
            });
        } catch (Throwable t) {
            finish();
        }
    }

    @Override
    protected void onDestroy() {
        Http.cancelAll();
        super.onDestroy();
    }
}
