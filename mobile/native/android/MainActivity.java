package com.saadikobilov.salah;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.ServerPath;
import android.os.Handler;
import android.os.Looper;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register before BridgeActivity creates the WebView and native plugin headers.
        registerPlugin(SalahWidgetPlugin.class);
        registerPlugin(SalahReminderPlugin.class);
        registerPlugin(SalahSupportPhotoPlugin.class);
        registerPlugin(SalahSupportPushPlugin.class);
        registerPlugin(SalahLiveUpdatePlugin.class);
        SalahLiveUpdateStore updates = new SalahLiveUpdateStore(this);
        int nativeVersion = BuildConfig.VERSION_CODE;
        int selected = updates.launch(nativeVersion);
        if(selected > 0) bridgeBuilder.setServerPath(new ServerPath(ServerPath.PathType.BASE_PATH, updates.version(selected).getAbsolutePath()));
        super.onCreate(savedInstanceState);
        // A broken web release cannot strand the app; retain the original APK assets.
        if(updates.prefs.getInt("trial",0) > 0) new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if(isFinishing() || isDestroyed() || updates.prefs.getInt("trial",0) == 0) return;
            updates.rejectTrial();
            int confirmed=updates.prefs.getInt("confirmed",0);
            if(confirmed>nativeVersion && updates.complete(confirmed)) bridge.setServerBasePath(updates.version(confirmed).getAbsolutePath());
            else bridge.setServerAssetPath("public");
        }, 30000);
    }
}
