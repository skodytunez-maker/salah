package com.saadikobilov.salah;

import android.app.PendingIntent;
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
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) update(context, manager, id);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int appWidgetId, Bundle newOptions) {
        update(context, manager, appWidgetId);
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
                views.setTextViewText(R.id.widget_countdown, remaining(next.time - now));
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

    private static String remaining(long millis) {
        long minutes = Math.max(0, (millis + 59999) / 60000);
        if (minutes < 60) return "через " + minutes + " мин";
        long hours = minutes / 60;
        long rest = minutes % 60;
        return rest == 0 ? "через " + hours + " ч" : "через " + hours + " ч " + rest + " мин";
    }

    private static final class NextPrayer {
        final String name;
        final long time;
        NextPrayer(String name, long time) { this.name = name; this.time = time; }
    }
}
