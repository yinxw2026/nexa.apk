package com.nexa.chat;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;

import java.io.File;
import java.io.FileNotFoundException;

/**
 * Minimal file provider used to hand a camera output file to the camera app.
 * Serves only files directly inside cacheDir()/shared.
 */
public class FileProviderLite extends ContentProvider {

    public static final String AUTHORITY = "com.nexa.chat.files";

    public static Uri uriFor(File f) {
        return new Uri.Builder().scheme("content").authority(AUTHORITY)
                .appendPath(f.getName()).build();
    }

    private File base() {
        File d = new File(getContext().getCacheDir(), "shared");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    private File resolve(Uri uri) throws FileNotFoundException {
        String name = uri.getLastPathSegment();
        if (name == null || name.contains("/") || name.contains("..")) throw new FileNotFoundException();
        File f = new File(base(), name);
        if (f.getParentFile() == null || !f.getParentFile().equals(base())) throw new FileNotFoundException();
        return f;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File f = resolve(uri);
        if ("r".equals(mode)) {
            return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
        }
        return ParcelFileDescriptor.open(f,
                ParcelFileDescriptor.MODE_READ_WRITE | ParcelFileDescriptor.MODE_CREATE);
    }

    @Override
    public String getType(Uri uri) {
        String name = uri.getLastPathSegment();
        if (name == null) return "application/octet-stream";
        int dot = name.lastIndexOf('.');
        String ext = dot >= 0 ? name.substring(dot + 1).toLowerCase() : "";
        String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        return m == null ? "application/octet-stream" : m;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] args, String sort) {
        try {
            File f = resolve(uri);
            MatrixCursor c = new MatrixCursor(
                    new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
            c.addRow(new Object[]{f.getName(), f.length()});
            return c;
        } catch (Throwable t) {
            return null;
        }
    }

    @Override
    public int delete(Uri uri, String selection, String[] args) {
        try { return resolve(uri).delete() ? 1 : 0; } catch (Throwable t) { return 0; }
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] args) { return 0; }

    @Override
    public Uri insert(Uri uri, ContentValues values) { return null; }

    @Override
    public boolean onCreate() { return true; }
}
