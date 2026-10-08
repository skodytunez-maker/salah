package com.saadikobilov.salah;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.UUID;

final class SalahReminderStore {
    static final String PREFS = "salah_native_reminders";
    static final String ACTION = "com.saadikobilov.salah.REMINDER";
    static SharedPreferences prefs(Context context) { return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    static boolean notificationsAllowed(Context context) {
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || Build.VERSION.SDK_INT >= 24 && !manager.areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            android.app.NotificationChannel channel = manager.getNotificationChannel(SalahReminderReceiver.CHANNEL);
            if (channel != null && channel.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
        }
        return true;
    }
    static boolean exactAllowed(Context context) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return manager != null && (Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms());
    }
    static JSONArray read(Context context) {
        try { return new JSONArray(prefs(context).getString("events", "[]")); } catch (Exception error) { return new JSONArray(); }
    }
    private static PendingIntent intent(Context context, JSONObject event, String generation, boolean create) {
        Intent intent = new Intent(context, SalahReminderReceiver.class).setAction(ACTION);
        intent.setData(new Uri.Builder().scheme("salah-reminder").authority("alarm").appendPath(event.optString("id")).build());
        intent.putExtra("id", event.optString("id")); intent.putExtra("generation", generation);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | (create ? PendingIntent.FLAG_UPDATE_CURRENT : PendingIntent.FLAG_NO_CREATE));
    }
    static synchronized int replace(Context context, JSONArray input) throws Exception {
        if (input == null || input.length() > 512) throw new IllegalArgumentException("Invalid reminder queue");
        long now = System.currentTimeMillis(); HashSet<String> ids = new HashSet<>(); JSONArray next = new JSONArray();
        for (int i = 0; i < input.length(); i++) {
            JSONObject event = input.getJSONObject(i);
            String id = event.getString("id"), message = event.getString("message"); long at = event.getLong("at");
            if (!SalahReminderPolicy.valid(now, at, id, message) || !ids.add(id)) throw new IllegalArgumentException("Invalid reminder event");
            if (event.optBoolean("adhan", false)) throw new IllegalArgumentException("Азан в фоне ещё не подключён.");
            JSONObject saved = new JSONObject(); saved.put("id", id); saved.put("at", at); saved.put("message", message); next.put(saved);
        }
        JSONArray previous = read(context); String generation = UUID.randomUUID().toString();
        // Rotate the generation before changing alarms: an old receiver cannot deliver a stale city/settings event.
        if (!prefs(context).edit().putString("events", next.toString()).putString("generation", generation).commit()) throw new IllegalStateException("Cannot save reminder queue");
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return 0;
        for (int i = 0; i < previous.length(); i++) {
            PendingIntent pending = intent(context, previous.getJSONObject(i), "", false);
            if (pending != null) { manager.cancel(pending); pending.cancel(); }
        }
        if (!notificationsAllowed(context) || !exactAllowed(context)) return 0;
        int scheduled = 0;
        try {
            for (int i = 0; i < next.length(); i++) {
                JSONObject event = next.getJSONObject(i);
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, event.getLong("at"), intent(context, event, generation, true));
                scheduled++;
            }
        } catch (SecurityException revoked) {
            // Permission can be revoked between the check and scheduling. Keep saved intent, report no connected delivery.
            for (int i = 0; i < next.length(); i++) { PendingIntent pending = intent(context, next.getJSONObject(i), "", false); if (pending != null) { manager.cancel(pending); pending.cancel(); } }
            return 0;
        }
        if (scheduled > 0) prefs(context).edit().putBoolean("configured", true).commit();
        return scheduled;
    }
    static synchronized void reschedule(Context context) {
        JSONArray stored = read(context), future = new JSONArray(); long now = System.currentTimeMillis();
        for (int i = 0; i < stored.length(); i++) { JSONObject event = stored.optJSONObject(i); if (event != null && SalahReminderPolicy.valid(now, event.optLong("at"), event.optString("id"), event.optString("message"))) future.put(event); }
        try { replace(context, future); } catch (Exception ignored) { /* The app can retry; never crash a boot receiver. */ }
    }
    static synchronized JSONObject take(Context context, String id, String generation) {
        if (generation == null || !generation.equals(prefs(context).getString("generation", ""))) return null;
        JSONArray stored = read(context), remaining = new JSONArray(); JSONObject found = null;
        for (int i = 0; i < stored.length(); i++) { JSONObject event = stored.optJSONObject(i); if (event == null) continue; if (id != null && id.equals(event.optString("id"))) found = event; else remaining.put(event); }
        if (found == null || !prefs(context).edit().putString("events", remaining.toString()).commit()) return null;
        return found;
    }
}
