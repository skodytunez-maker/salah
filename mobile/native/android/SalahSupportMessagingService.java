package com.saadikobilov.salah;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class SalahSupportMessagingService extends FirebaseMessagingService {
    @Override public void onNewToken(String token){SharedPreferences prefs=getSharedPreferences(SalahSupportPushPlugin.PREFS,0);prefs.edit().putBoolean("token_changed",true).apply();SalahSupportPushPlugin.tokenChanged();}
    @Override public void onMessageReceived(RemoteMessage remote){
        Map<String,String> data=remote.getData();String thread=data.get("thread"),user=data.get("user"),id=data.get("message");
        SharedPreferences prefs=getSharedPreferences(SalahSupportPushPlugin.PREFS,0);
        if(!"support".equals(data.get("kind"))||!SalahSupportPushPlugin.uuid(thread)||!SalahSupportPushPlugin.uuid(user)||!SalahSupportPushPlugin.uuid(id)||!prefs.getBoolean("enabled",false)||!user.equals(prefs.getString("user","")))return;
        long expires;try{expires=Long.parseLong(data.get("expires"));}catch(Exception error){return;}
        long now=System.currentTimeMillis();if(expires<=now||expires-now>86400000L)return;
        JSObject message=new JSObject();message.put("thread",thread);message.put("id",id);message.put("user",user);
        if(SalahSupportPushPlugin.foregroundMessage(message))return;
        if(!NotificationManagerCompat.from(this).areNotificationsEnabled())return;
        String channel="salah_support";
        if(Build.VERSION.SDK_INT>=26){NotificationManager manager=getSystemService(NotificationManager.class);manager.createNotificationChannel(new NotificationChannel(channel,"Сообщения поддержки",NotificationManager.IMPORTANCE_DEFAULT));}
        Intent intent=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("salah.support.thread",thread).putExtra("salah.support.user",user);
        PendingIntent tap=PendingIntent.getActivity(this,thread.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder builder=new NotificationCompat.Builder(this,channel).setSmallIcon(com.saadikobilov.salah.R.drawable.salah_notification).setContentTitle("SALAH").setContentText("Новое сообщение поддержки").setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setAutoCancel(true).setContentIntent(tap);
        try{NotificationManagerCompat.from(this).notify("salah-support-"+thread,0,builder.build());}catch(SecurityException ignored){}
    }
}
