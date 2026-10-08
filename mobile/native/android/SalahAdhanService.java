package com.saadikobilov.salah;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import org.json.JSONObject;

public class SalahAdhanService extends Service {
    static final String STOP = "com.saadikobilov.salah.STOP_ADHAN";
    static final String CHANNEL = "salah_adhan_v1";
    static volatile boolean active = false;
    private static final int NOTICE = 6107;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private AudioManager audioManager;
    private AudioFocusRequest focus;
    private boolean focusHeld = false;
    private JSONObject event;
    private final AudioManager.OnAudioFocusChangeListener focusChanged = change -> { if (change < 0) stopSelf(); };
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || STOP.equals(intent.getAction())) { stopSelf(); return START_NOT_STICKY; }
        releaseAudio(); handler.removeCallbacksAndMessages(null); event = null;
        try {
            event = new JSONObject(intent.getStringExtra("event"));
            String asset = SalahAdhanPolicy.asset(event.optString("key"), event.optString("voice"));
            if (asset == null || !SalahAdhanPolicy.timely(System.currentTimeMillis(), event.optLong("at"))
                    || !SalahReminderStore.notificationsAllowed(this) || SalahReminderPlugin.webAudioBusy) { fail(); return START_NOT_STICKY; }
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel channel = new NotificationChannel(CHANNEL, "Азан SALAH", NotificationManager.IMPORTANCE_LOW);
                channel.setSound(null, null); manager.createNotificationChannel(channel);
                if (manager.getNotificationChannel(CHANNEL).getImportance() == NotificationManager.IMPORTANCE_NONE) { fail(); return START_NOT_STICKY; }
            }
            PendingIntent content = SalahReminderReceiver.content(this, event);
            PendingIntent stop = PendingIntent.getService(this, 6107, new Intent(this, SalahAdhanService.class).setAction(STOP), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            Notification.Builder notice = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
            notice.setSmallIcon(R.drawable.salah_notification).setContentTitle("Азан · SALAH").setContentText(event.optString("message"))
                    .setContentIntent(content).setOngoing(true).addAction(new Notification.Action.Builder(R.drawable.salah_notification, "Остановить", stop).build());
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTICE, notice.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            else startForeground(NOTICE, notice.build());
            active = true; SalahReminderPlugin.audioState(true);
            handler.postDelayed(this::stopSelf, 10 * 60 * 1000);
            AudioAttributes attributes = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();
            audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
            int result;
            if (Build.VERSION.SDK_INT >= 26) {
                focus = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attributes)
                        .setAcceptsDelayedFocusGain(false).setWillPauseWhenDucked(true).setOnAudioFocusChangeListener(focusChanged, handler).build();
                result = audioManager.requestAudioFocus(focus);
            } else result = audioManager.requestAudioFocus(focusChanged, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
            focusHeld = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
            if (!focusHeld) { fail(); return START_NOT_STICKY; }
            player = new MediaPlayer(); player.setAudioAttributes(attributes); player.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);
            try (AssetFileDescriptor descriptor = getAssets().openFd(asset)) { player.setDataSource(descriptor.getFileDescriptor(), descriptor.getStartOffset(), descriptor.getLength()); }
            final MediaPlayer preparing = player;
            player.setOnPreparedListener(ready -> {
                if (ready != player || !active) return;
                if (SalahReminderPlugin.webAudioBusy || !SalahAdhanPolicy.timely(System.currentTimeMillis(), event.optLong("at")) || !SalahReminderStore.notificationsAllowed(this)) { fail(); return; }
                try { ready.start(); } catch (RuntimeException error) { fail(); }
            });
            player.setOnCompletionListener(done -> { if (done == player) stopSelf(); });
            player.setOnErrorListener((failed, what, extra) -> { if (failed == player) fail(); return true; });
            player.prepareAsync();
            handler.postDelayed(() -> { if (player == preparing) try { if (!player.isPlaying()) fail(); } catch (RuntimeException error) { fail(); } }, 30000);
        } catch (Exception error) { fail(); }
        return START_NOT_STICKY;
    }
    private void fail() { if (event != null) SalahReminderReceiver.post(this, event); stopSelf(); }
    private void releaseAudio() {
        if (player != null) { player.setOnPreparedListener(null); player.setOnCompletionListener(null); player.setOnErrorListener(null); player.release(); player = null; }
        if (focusHeld && audioManager != null) {
            if (Build.VERSION.SDK_INT >= 26 && focus != null) audioManager.abandonAudioFocusRequest(focus); else audioManager.abandonAudioFocus(focusChanged);
        }
        focusHeld = false; focus = null;
    }
    @Override public void onDestroy() { handler.removeCallbacksAndMessages(null); releaseAudio(); active = false; SalahReminderPlugin.audioState(false); stopForeground(true); super.onDestroy(); }
}
