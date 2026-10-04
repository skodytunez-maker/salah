package com.saadikobilov.salah;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SalahWidget")
public class SalahWidgetPlugin extends Plugin {
    static final String PREFS = "salah_widget";
    static final String SNAPSHOT = "snapshot";

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void updateSnapshot(PluginCall call) {
        JSObject snapshot = call.getObject("snapshot");
        if (snapshot == null) {
            call.reject("Prayer widget snapshot is required");
            return;
        }
        prefs().edit().putString(SNAPSHOT, snapshot.toString()).apply();
        SalahPrayerWidgetProvider.refresh(getContext());
        call.resolve();
    }

    @PluginMethod
    public void clearSnapshot(PluginCall call) {
        prefs().edit().remove(SNAPSHOT).apply();
        SalahPrayerWidgetProvider.refresh(getContext());
        call.resolve();
    }
}
