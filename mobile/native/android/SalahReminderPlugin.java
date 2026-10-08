package com.saadikobilov.salah;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONArray;
import java.lang.ref.WeakReference;

@CapacitorPlugin(name = "SalahReminders", permissions = {
        @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
})
public class SalahReminderPlugin extends Plugin {
    private static WeakReference<SalahReminderPlugin> current = new WeakReference<>(null);
    static volatile boolean webAudioBusy = false;
    static void audioState(boolean playing) { SalahReminderPlugin plugin = current.get(); if (plugin != null) { JSObject state = new JSObject(); state.put("playing", playing); plugin.notifyListeners("nativeAdhanState", state, true); } }
    private boolean audioAvailable() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            android.app.NotificationChannel channel = manager == null ? null : manager.getNotificationChannel(SalahAdhanService.CHANNEL);
            if (channel != null && channel.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
        }
        try { for (String name : new String[]{"adhan-mansour.mp3", "adhan-mishary.mp3", "adhan-mansour-fajr.mp3"}) { try (android.content.res.AssetFileDescriptor ignored = getContext().getAssets().openFd("public/assets/audio/" + name)) {} } return true; }
        catch (Exception missing) { return false; }
    }
    private JSObject status() {
        JSObject result = new JSObject();
        result.put("notifications", SalahReminderStore.notificationsAllowed(getContext()));
        result.put("permission", SalahReminderStore.notificationsAllowed(getContext()) ? "granted" :
                Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED || getPermissionState("notifications") == PermissionState.DENIED || getPermissionState("notifications") == PermissionState.PROMPT_WITH_RATIONALE ? "denied" : "default");
        result.put("exactAlarms", SalahReminderStore.exactAllowed(getContext()));
        result.put("adhan", audioAvailable());
        result.put("playing", SalahAdhanService.active);
        result.put("pending", SalahReminderStore.read(getContext()).length());
        result.put("configured", SalahReminderStore.prefs(getContext()).getBoolean("configured", false));
        return result;
    }
    private void opened(Intent intent) { if (intent != null && SalahReminderReceiver.OPEN.equals(intent.getAction())) { JSObject value = new JSObject(); value.put("kind", intent.getStringExtra("kind")); value.put("key", intent.getStringExtra("key")); intent.setAction(Intent.ACTION_MAIN); intent.removeExtra("kind"); intent.removeExtra("key"); notifyListeners("openReminder", value, true); } }
    @Override public void load() { current = new WeakReference<>(this); webAudioBusy = false; SalahReminderStore.reschedule(getContext()); audioState(SalahAdhanService.active); opened(getActivity().getIntent()); }
    @Override protected void handleOnNewIntent(Intent intent) { opened(intent); }
    @Override protected void handleOnDestroy() { if (current.get() == this) { current.clear(); webAudioBusy = false; } }
    @PluginMethod public void setWebAudioBusy(PluginCall call) { webAudioBusy = call.getBoolean("busy", false); if (webAudioBusy) getContext().stopService(new Intent(getContext(), SalahAdhanService.class)); call.resolve(); }
    @PluginMethod public void stopAdhan(PluginCall call) { getContext().stopService(new Intent(getContext(), SalahAdhanService.class)); call.resolve(); }
    @PluginMethod public void getStatus(PluginCall call) { call.resolve(status()); }
    @PluginMethod public void requestNotificationPermission(PluginCall call) {
        if (SalahReminderStore.notificationsAllowed(getContext())) { call.resolve(status()); return; }
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.DENIED && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationsResult"); return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = Build.VERSION.SDK_INT >= 26 ? new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName())
                        : new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
                startActivityForResult(call, intent, "notificationSettingsResult");
            } catch (Exception error) { call.reject("Не удалось открыть настройки уведомлений.", error); }
        });
    }
    @PermissionCallback private void notificationsResult(PluginCall call) {
        SalahReminderStore.reschedule(getContext()); call.resolve(status());
    }
    @ActivityCallback private void notificationSettingsResult(PluginCall call, ActivityResult result) {
        SalahReminderStore.reschedule(getContext()); call.resolve(status());
    }
    @PluginMethod public void requestExactAlarmPermission(PluginCall call) {
        if (SalahReminderStore.exactAllowed(getContext())) { call.resolve(status()); return; }
        if (Build.VERSION.SDK_INT < 31) { call.resolve(status()); return; }
        getActivity().runOnUiThread(() -> {
            try {
                startActivityForResult(call, new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:" + getContext().getPackageName())), "exactAlarmResult");
            } catch (Exception error) { call.reject("Не удалось открыть разрешение напоминаний.", error); }
        });
    }
    @ActivityCallback private void exactAlarmResult(PluginCall call, ActivityResult result) {
        SalahReminderStore.reschedule(getContext()); call.resolve(status());
    }
    @PluginMethod public void replaceSchedule(PluginCall call) {
        JSArray events = call.getArray("events");
        try { SalahReminderStore.Replacement replaced = SalahReminderStore.replace(getContext(), events); JSObject result = status(); result.put("scheduled", replaced.scheduled); result.put("skippedExpired", replaced.skippedExpired); call.resolve(result); }
        catch (Exception error) { call.reject(error.getMessage(), error); }
    }
    @PluginMethod public void clearSchedule(PluginCall call) {
        try {
            SalahReminderStore.replace(getContext(), new JSONArray());
            getContext().stopService(new Intent(getContext(), SalahAdhanService.class));
            NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null && Build.VERSION.SDK_INT >= 23) {
                for (android.service.notification.StatusBarNotification notification : manager.getActiveNotifications()) {
                    String tag = notification.getTag();
                    if (tag != null && tag.startsWith("salah-reminder:")) manager.cancel(tag, notification.getId());
                }
            }
            call.resolve(status());
        } catch (Exception error) { call.reject("Не удалось отключить напоминания.", error); }
    }
}
