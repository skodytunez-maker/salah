package com.saadikobilov.salah;

import android.webkit.WebView;
import com.getcapacitor.WebViewListener;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** Recovers old browser workers without deleting any user storage. */
final class SalahNativeStartup extends WebViewListener {
    private final int nativeVersion, webVersion;
    private boolean checked;
    SalahNativeStartup(int nativeVersion, int selected) {
        this.nativeVersion=nativeVersion;
        this.webVersion=selected>0?selected:nativeVersion;
    }
    static String localOrigin(String value) {
        try {
            URI uri=new URI(value);
            if(!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))
                || !"localhost".equals(uri.getHost()) || uri.getUserInfo()!=null
                || uri.getPort()!=-1) return null;
            return uri.getScheme()+"://localhost";
        } catch(Exception ignored) {return null;}
    }
    @Override public void onPageLoaded(WebView view) {
        if(checked)return;
        String origin=localOrigin(view.getUrl());
        if(origin==null)return;
        checked=true;
        try(InputStream input=view.getContext().getAssets().open("public/js/native-startup-recovery.js");
            ByteArrayOutputStream output=new ByteArrayOutputStream()) {
            byte[] buffer=new byte[4096];int count;
            while((count=input.read(buffer))!=-1) {
                if(output.size()+count>16384)return;
                output.write(buffer,0,count);
            }
            JSONObject context=new JSONObject();
            context.put("origin",origin);context.put("versionCode",nativeVersion);context.put("webVersion",webVersion);
            view.evaluateJavascript("("+output.toString(StandardCharsets.UTF_8.name())+")("+context.toString()+").catch(()=>false)",null);
        } catch(Exception ignored) {
            // The normal ready/version handshake and rollback remain authoritative.
        }
    }
}
