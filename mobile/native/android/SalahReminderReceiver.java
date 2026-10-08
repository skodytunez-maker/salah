package com.saadikobilov.salah;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import org.json.JSONObject;

public class SalahReminderReceiver extends BroadcastReceiver {
    static final String CHANNEL = "salah_reminders_v1";
    @Override public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                || "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED".equals(action)) { SalahReminderStore.reschedule(context); return; }
        if (!SalahReminderStore.ACTION.equals(action)) return;
        JSONObject event = SalahReminderStore.take(context, intent.getStringExtra("id"), intent.getStringExtra("generation"));
        if (event == null || !SalahReminderPolicy.fresh(System.currentTimeMillis(), event.optLong("at")) || !SalahReminderStore.notificationsAllowed(context)) return;
        if (event.optBoolean("adhan") && SalahAdhanPolicy.timely(System.currentTimeMillis(), event.optLong("at")) && !SalahReminderPlugin.webAudioBusy) {
            try {
                Intent service = new Intent(context, SalahAdhanService.class).putExtra("event", event.toString());
                if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(service); else context.startService(service);
                return;
            } catch (RuntimeException unavailable) { /* Keep the prayer notification when Android refuses playback. */ }
        }
        post(context, event);
    }
    static void post(Context context, JSONObject event) {
        if (!SalahReminderPolicy.fresh(System.currentTimeMillis(), event.optLong("at")) || !SalahReminderStore.notificationsAllowed(context)) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel(CHANNEL, "Напоминания SALAH", NotificationManager.IMPORTANCE_HIGH));
        Intent open = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(context, CHANNEL) : new Notification.Builder(context);
        builder.setSmallIcon(R.drawable.salah_notification).setContentTitle("SALAH").setContentText(event.optString("message"))
                .setStyle(new Notification.BigTextStyle().bigText(event.optString("message"))).setContentIntent(content).setAutoCancel(true);
        if (Build.VERSION.SDK_INT < 26) builder.setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_SOUND);
        String slot = event.optString("kind") + ":" + event.optString("key");
        try { manager.notify("salah-reminder:" + slot, 0, builder.build()); } catch (SecurityException ignored) { }
    }
}
