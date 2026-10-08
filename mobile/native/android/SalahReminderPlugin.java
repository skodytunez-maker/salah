package com.saadikobilov.salah;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONArray;

@CapacitorPlugin(name = "SalahReminders", permissions = {
        @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
})
public class SalahReminderPlugin extends Plugin {
    private JSObject status() {
        JSObject result = new JSObject();
        result.put("notifications", SalahReminderStore.notificationsAllowed(getContext()));
        result.put("exactAlarms", SalahReminderStore.exactAllowed(getContext()));
        result.put("adhan", false);
        result.put("pending", SalahReminderStore.read(getContext()).length());
        return result;
    }
    @Override public void load() { SalahReminderStore.reschedule(getContext()); }
    @PluginMethod public void getStatus(PluginCall call) { call.resolve(status()); }
    @PluginMethod public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || SalahReminderStore.notificationsAllowed(getContext())) { call.resolve(status()); return; }
        requestPermissionForAlias("notifications", call, "notificationsResult");
    }
    @PermissionCallback private void notificationsResult(PluginCall call) {
        SalahReminderStore.reschedule(getContext()); call.resolve(status());
    }
    @PluginMethod public void requestExactAlarmPermission(PluginCall call) {
        if (SalahReminderStore.exactAllowed(getContext())) { call.resolve(status()); return; }
        if (Build.VERSION.SDK_INT < 31) { call.resolve(status()); return; }
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:" + getContext().getPackageName())));
                call.resolve(status());
            } catch (Exception error) { call.reject("Не удалось открыть разрешение напоминаний.", error); }
        });
    }
    @PluginMethod public void replaceSchedule(PluginCall call) {
        JSArray events = call.getArray("events");
        try { int scheduled = SalahReminderStore.replace(getContext(), events); JSObject result = status(); result.put("scheduled", scheduled); call.resolve(result); }
        catch (Exception error) { call.reject(error.getMessage(), error); }
    }
    @PluginMethod public void clearSchedule(PluginCall call) {
        try {
            SalahReminderStore.replace(getContext(), new JSONArray());
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
