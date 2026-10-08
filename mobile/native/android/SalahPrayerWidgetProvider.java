package com.saadikobilov.salah;

import android.app.PendingIntent;
import android.app.AlarmManager;
import android.os.SystemClock;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.content.res.Configuration;
import android.util.SizeF;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import android.view.View;
import android.widget.RemoteViews;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.json.JSONArray;
import org.json.JSONObject;

public class SalahPrayerWidgetProvider extends AppWidgetProvider {
    private static final String REFRESH = "com.saadikobilov.salah.WIDGET_REFRESH";
    private static final String[] KEYS = {"Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"};
    private static final String[] NAMES = {"Фаджр", "Зухр", "Аср", "Магриб", "Иша"};
    private static final int[] NAME_IDS = {
        R.id.widget_fajr_name, R.id.widget_dhuhr_name, R.id.widget_asr_name,
        R.id.widget_maghrib_name, R.id.widget_isha_name
    };
    private static final int[] TIME_IDS = {
        R.id.widget_fajr_time, R.id.widget_dhuhr_time, R.id.widget_asr_time,
        R.id.widget_maghrib_time, R.id.widget_isha_time
    };

    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, SalahPrayerWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) update(context, manager, id);
        scheduleRefresh(context, ids.length > 0);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        refresh(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int appWidgetId, Bundle newOptions) {
        update(context, manager, appWidgetId);
        scheduleRefresh(context, true);
    }

    @Override public void onEnabled(Context context) { refresh(context); }
    @Override public void onDisabled(Context context) { scheduleRefresh(context, false); }
    @Override public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (REFRESH.equals(action) || Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) || Intent.ACTION_TIME_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action) || AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED.equals(action)) { refresh(context); return; }
        super.onReceive(context, intent);
    }
    private static boolean exact(Context context) {
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return alarm != null && (Build.VERSION.SDK_INT < 31 || alarm.canScheduleExactAlarms());
    }
    private static void scheduleRefresh(Context context, boolean hasWidgets) {
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarm == null) return;
        PendingIntent pending = PendingIntent.getBroadcast(context, 0, new Intent(context, SalahPrayerWidgetProvider.class).setAction(REFRESH), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        alarm.cancel(pending);
        if (!hasWidgets) { pending.cancel(); return; }
        try {
            String raw = context.getSharedPreferences(SalahWidgetPlugin.PREFS, Context.MODE_PRIVATE).getString(SalahWidgetPlugin.SNAPSHOT, null);
            if (raw == null) return;
            JSONObject snapshot = new JSONObject(raw);
            if (snapshot.optInt("schemaVersion", -1) != 1) return;
            long now = System.currentTimeMillis();
            ZoneId zone = ZoneId.of(snapshot.getString("timezone"));
            NextPrayer next = findNext(snapshot.getJSONArray("days"), now);
            if (next == null) return;
            long midnight = Instant.ofEpochMilli(now).atZone(zone).toLocalDate().plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli();
            long at = SalahWidgetTiming.refreshAt(now, next.time, midnight);
            if (at <= now) return;
            // Refresh visible widgets at prayer/day boundaries without waking the device.
            if (exact(context)) alarm.setExact(AlarmManager.RTC, at, pending);
            else alarm.setWindow(AlarmManager.RTC, at, 10 * 60 * 1000L, pending);
        } catch (SecurityException revoked) { /* Periodic launcher updates remain available. */ }
        catch (Exception invalid) { /* Invalid/expired snapshots never create alarms. */ }
    }

    private static void update(Context context, AppWidgetManager manager, int id) {
        Bundle options = manager.getAppWidgetOptions(id);
        String raw = context.getSharedPreferences(SalahWidgetPlugin.PREFS, Context.MODE_PRIVATE).getString(SalahWidgetPlugin.SNAPSHOT, null);
        long now = System.currentTimeMillis();
        if (Build.VERSION.SDK_INT >= 31) {
            ArrayList<SizeF> sizes = options.getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES);
            if (sizes != null && sizes.size() <= 16) {
                LinkedHashMap<SizeF, RemoteViews> variants = new LinkedHashMap<>();
                for (SizeF size : sizes) if (size != null && SalahWidgetSizing.valid(size.getWidth(), size.getHeight()))
                    variants.put(size, createViews(context, id, size.getWidth(), size.getHeight(), now, raw));
                if (!variants.isEmpty()) { manager.updateAppWidget(id, new RemoteViews(variants)); return; }
            }
        }
        boolean landscape = context.getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;
        int width = SalahWidgetSizing.fallback(landscape, options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0), options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0), 160);
        int height = SalahWidgetSizing.fallback(landscape, options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0), options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0), 84);
        manager.updateAppWidget(id, createViews(context, id, width, height, now, raw));
    }

    private static RemoteViews createViews(Context context, int id, float width, float height, long now, String raw) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.salah_widget);
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pending = PendingIntent.getActivity(
                context, id, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_root, pending);
        }

        boolean medium = SalahWidgetSizing.schedule(width, height);
        boolean thin = SalahWidgetSizing.thin(height);
        views.setViewVisibility(R.id.widget_header, thin ? View.GONE : View.VISIBLE);
        views.setViewVisibility(R.id.widget_countdown, thin ? View.GONE : View.VISIBLE);
        views.setViewVisibility(R.id.widget_timer, View.GONE);
        views.setChronometer(R.id.widget_timer, 0, null, false);
        views.setViewVisibility(R.id.widget_schedule, medium ? View.VISIBLE : View.GONE);
        float density = context.getResources().getDisplayMetrics().density;
        int horizontalPadding = Math.round((thin ? 8 : 12) * density);
        int verticalPadding = Math.round((thin ? 6 : 8) * density);
        views.setViewPadding(R.id.widget_root, horizontalPadding, verticalPadding, horizontalPadding, verticalPadding);

        if (raw == null) {
            empty(views);
            return views;
        }

        try {
            JSONObject snapshot = new JSONObject(raw);
            if (snapshot.optInt("schemaVersion", -1) != 1) throw new IllegalArgumentException("schema");
            String city = snapshot.optString("cityName", "SALAH");
            ZoneId zone = ZoneId.of(snapshot.getString("timezone"));
            JSONArray days = snapshot.getJSONArray("days");

            NextPrayer next = findNext(days, now);
            JSONObject schedule = currentSchedule(days, zone, now);
            views.setTextViewText(R.id.widget_city, city);
            if (next == null) {
                views.setTextViewText(R.id.widget_prayer, "Откройте SALAH");
                views.setTextViewText(R.id.widget_time, "—");
                views.setTextViewText(R.id.widget_countdown, "Обновим расписание");
            } else {
                views.setTextViewText(R.id.widget_prayer, next.name);
                views.setTextViewText(R.id.widget_time, format(next.time, zone));
                views.setViewVisibility(R.id.widget_countdown, View.GONE);
                long base = SalahWidgetTiming.chronometerBase(now, next.time, SystemClock.elapsedRealtime());
                if (!thin && Build.VERSION.SDK_INT >= 24 && exact(context) && base >= 0) {
                    views.setViewVisibility(R.id.widget_timer, View.VISIBLE);
                    views.setChronometerCountDown(R.id.widget_timer, true);
                    views.setChronometer(R.id.widget_timer, base, "через %s", true);
                }
            }
            bindSchedule(views, schedule, zone);
        } catch (Exception error) {
            empty(views);
        }
        return views;
    }

    private static void empty(RemoteViews views) {
        views.setTextViewText(R.id.widget_city, "");
        views.setTextViewText(R.id.widget_prayer, "Откройте SALAH");
        views.setTextViewText(R.id.widget_time, "—");
        views.setTextViewText(R.id.widget_countdown, "Чтобы обновить времена намаза");
        for (int i = 0; i < TIME_IDS.length; i++) {
            views.setTextViewText(NAME_IDS[i], NAMES[i]);
            views.setTextViewText(TIME_IDS[i], "—");
        }
    }

    private static NextPrayer findNext(JSONArray days, long now) throws Exception {
        NextPrayer next = null;
        for (int d = 0; d < days.length(); d++) {
            JSONObject prayers = days.getJSONObject(d).getJSONObject("prayers");
            for (int i = 0; i < KEYS.length; i++) {
                long time = prayers.optLong(KEYS[i], Long.MIN_VALUE);
                if (time > now && (next == null || time < next.time)) next = new NextPrayer(NAMES[i], time);
            }
        }
        return next;
    }

    private static JSONObject currentSchedule(JSONArray days, ZoneId zone, long now) throws Exception {
        String today = DateTimeFormatter.ISO_LOCAL_DATE.withZone(zone).format(Instant.ofEpochMilli(now));
        String[] dates = new String[days.length()];
        for (int d = 0; d < days.length(); d++) dates[d] = days.getJSONObject(d).optString("date");
        int index = SalahWidgetDay.currentIndex(today, dates);
        return index < 0 ? null : days.getJSONObject(index).getJSONObject("prayers");
    }

    private static void bindSchedule(RemoteViews views, JSONObject prayers, ZoneId zone) {
        for (int i = 0; i < KEYS.length; i++) {
            views.setTextViewText(NAME_IDS[i], NAMES[i]);
            long time = prayers == null ? Long.MIN_VALUE : prayers.optLong(KEYS[i], Long.MIN_VALUE);
            views.setTextViewText(TIME_IDS[i], time == Long.MIN_VALUE ? "—" : format(time, zone));
        }
    }

    private static String format(long value, ZoneId zone) {
        return DateTimeFormatter.ofPattern("HH:mm").withZone(zone).format(Instant.ofEpochMilli(value));
    }

    private static final class NextPrayer {
        final String name;
        final long time;
        NextPrayer(String name, long time) { this.name = name; this.time = time; }
    }
}
