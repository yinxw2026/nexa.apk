package com.nexa.chat;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

import java.security.KeyStore;

/**
 * AES-256-GCM encrypted key/value store. The master key lives in the Android
 * KeyStore and never leaves it, so the encrypted payload on disk is useless
 * without the device.
 *
 * NOTE: the key is generated with setRandomizedEncryptionRequired(true), which
 * forbids a caller supplied IV — the IV therefore comes from Cipher itself.
 */
public final class SecureStore {

    private static final String ALIAS = "nexa_master_key_v1";
    private static final String TRANSFORM = "AES/GCM/NoPadding";
    private static final int IV_LEN = 12;
    private static final int TAG_BITS = 128;

    private final File dir;

    public SecureStore(Context ctx) {
        dir = new File(ctx.getFilesDir(), "vault");
        if (!dir.exists()) dir.mkdirs();
    }

    private SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (!ks.containsAlias(ALIAS)) {
            KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(
                    ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .setRandomizedEncryptionRequired(true)
                    .build();
            kg.init(spec);
            kg.generateKey();
        }
        return (SecretKey) ks.getKey(ALIAS, null);
    }

    private File fileFor(String k) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < k.length(); i++) {
            char c = k.charAt(i);
            if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_' || c == '-') {
                sb.append(c);
            } else {
                sb.append('_').append(Integer.toHexString(c));
            }
            if (sb.length() > 180) break;
        }
        return new File(dir, sb.toString() + ".enc");
    }

    public synchronized void put(String k, String value) throws Exception {
        Cipher c = Cipher.getInstance(TRANSFORM);
        c.init(Cipher.ENCRYPT_MODE, key());
        byte[] iv = c.getIV();
        byte[] ct = c.doFinal(value.getBytes("UTF-8"));
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        bos.write(iv);
        bos.write(ct);
        FileOutputStream os = new FileOutputStream(fileFor(k));
        os.write(bos.toByteArray());
        os.flush();
        os.close();
    }

    public synchronized String get(String k) {
        File f = fileFor(k);
        if (!f.exists()) return "";
        try {
            FileInputStream is = new FileInputStream(f);
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) > 0) bos.write(buf, 0, n);
            is.close();
            byte[] all = bos.toByteArray();
            if (all.length < IV_LEN + 1) return "";
            byte[] iv = new byte[IV_LEN];
            System.arraycopy(all, 0, iv, 0, IV_LEN);
            Cipher c = Cipher.getInstance(TRANSFORM);
            c.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] pt = c.doFinal(all, IV_LEN, all.length - IV_LEN);
            return new String(pt, "UTF-8");
        } catch (Throwable t) {
            return "";
        }
    }

    public synchronized void remove(String k) {
        File f = fileFor(k);
        if (f.exists()) f.delete();
    }

    public synchronized void clear() {
        File[] fs = dir.listFiles();
        if (fs == null) return;
        for (File f : fs) f.delete();
    }
}
