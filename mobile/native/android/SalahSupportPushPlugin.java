package com.saadikobilov.salah;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailabilityLight;
import com.google.firebase.messaging.FirebaseMessaging;
import java.lang.ref.WeakReference;
import java.util.UUID;

@CapacitorPlugin(name="SalahSupportPush",permissions={@Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class SalahSupportPushPlugin extends Plugin {
    static final String PREFS="salah_support_push";
    static WeakReference<SalahSupportPushPlugin> active=new WeakReference<>(null);
    private boolean foreground=false;
    private JSObject pendingTap;
    static boolean uuid(String value){return value!=null&&value.matches("(?i)[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}");}
    private SharedPreferences prefs(){return getContext().getSharedPreferences(PREFS,0);}
    private boolean supported(){return GoogleApiAvailabilityLight.getInstance().isGooglePlayServicesAvailable(getContext())==ConnectionResult.SUCCESS;}
    private boolean granted(){return NotificationManagerCompat.from(getContext()).areNotificationsEnabled();}
    @Override public void load(){active=new WeakReference<>(this);opened(getActivity().getIntent());}
    @Override protected void handleOnResume(){foreground=true;}
    @Override protected void handleOnPause(){foreground=false;}
    @Override protected void handleOnNewIntent(Intent intent){opened(intent);}
    private void opened(Intent intent){
        if(intent==null)return;String thread=intent.getStringExtra("salah.support.thread"),user=intent.getStringExtra("salah.support.user"),kind=intent.getStringExtra("salah.support.kind");
        intent.removeExtra("salah.support.thread");intent.removeExtra("salah.support.user");intent.removeExtra("salah.support.kind");
        if(!uuid(thread)||!uuid(user)||kind!=null&&!kind.equals("support")&&!kind.equals("staff"))return;
        pendingTap=new JSObject();pendingTap.put("thread",thread);pendingTap.put("user",user);pendingTap.put("kind",kind==null?"support":kind);pendingTap.put("tap",UUID.randomUUID().toString());notifyListeners("open",pendingTap,true);
    }
    @PluginMethod public void consumeTap(PluginCall call){JSObject value=pendingTap;pendingTap=null;call.resolve(value==null?new JSObject():value);}
    @PluginMethod public void setAccount(PluginCall call){
        String user=call.getString("user","");if(!user.isEmpty()&&!uuid(user)){call.reject("invalid_account");return;}
        String previous=prefs().getString("user","");
        if(!previous.equals(user)){prefs().edit().putString("user",user).remove("device").remove("staff_device").putBoolean("staff_enabled",false).putBoolean("enabled",false).apply();FirebaseMessaging.getInstance().setAutoInitEnabled(false);FirebaseMessaging.getInstance().deleteToken();}
        call.resolve();
    }
    @PluginMethod public void getStatus(PluginCall call){JSObject result=new JSObject();result.put("supported",supported());result.put("permission",granted()?"granted":"denied");result.put("enabled",prefs().getBoolean("enabled",false));result.put("staffMessages",true);result.put("staffEnabled",prefs().getBoolean("staff_enabled",false));call.resolve(result);}
    @PluginMethod public void enable(PluginCall call){
        if(!supported()){call.reject("google_services_unavailable");return;}
        String user=call.getString("user","");if(!uuid(user)||!user.equals(prefs().getString("user",""))){call.reject("account_changed");return;}
        if(Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")!=PermissionState.GRANTED){requestPermissionForAlias("notifications",call,"permissionResult");return;}
        registration(call,true);
    }
    @PermissionCallback private void permissionResult(PluginCall call){if(!granted()){call.reject("notifications_denied");return;}registration(call,true);}
    @PluginMethod public void getRegistration(PluginCall call){registration(call,false);}
    private void registration(PluginCall call,boolean enable){registration(call,enable,false);}
    private void registration(PluginCall call,boolean enable,boolean staff){
        String user=call.getString("user","");
        if(!uuid(user)||!user.equals(prefs().getString("user",""))||!granted()||!supported()||(!enable&&!prefs().getBoolean(staff?"staff_enabled":"enabled",false))){call.reject("notifications_unavailable");return;}
        FirebaseMessaging.getInstance().setAutoInitEnabled(true);
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task->{
            if(!task.isSuccessful()||!user.equals(prefs().getString("user",""))){call.reject("registration_unavailable");return;}
            String id=prefs().getString(staff?"staff_device":"device","");if(!uuid(id))id=UUID.randomUUID().toString();
            prefs().edit().putString(staff?"staff_device":"device",id).putBoolean(staff?"staff_enabled":"enabled",true).apply();
            JSObject result=new JSObject();result.put("device",id);result.put("token",task.getResult());call.resolve(result);
        });
    }
    @PluginMethod public void disable(PluginCall call){prefs().edit().putBoolean("enabled",false).apply();if(!prefs().getBoolean("staff_enabled",false)){FirebaseMessaging.getInstance().setAutoInitEnabled(false);FirebaseMessaging.getInstance().deleteToken();}call.resolve();}
    @PluginMethod public void enableStaff(PluginCall call){if(!supported()){call.reject("google_services_unavailable");return;}String user=call.getString("user","");if(!uuid(user)||!user.equals(prefs().getString("user",""))){call.reject("account_changed");return;}if(Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")!=PermissionState.GRANTED){requestPermissionForAlias("notifications",call,"staffPermissionResult");return;}registration(call,true,true);}
    @PermissionCallback private void staffPermissionResult(PluginCall call){if(!granted()){call.reject("notifications_denied");return;}registration(call,true,true);}
    @PluginMethod public void getStaffRegistration(PluginCall call){registration(call,false,true);}
    @PluginMethod public void disableStaff(PluginCall call){prefs().edit().putBoolean("staff_enabled",false).apply();if(!prefs().getBoolean("enabled",false)){FirebaseMessaging.getInstance().setAutoInitEnabled(false);FirebaseMessaging.getInstance().deleteToken();}call.resolve();}
    static boolean foregroundMessage(JSObject message){SalahSupportPushPlugin plugin=active.get();if(plugin==null||!plugin.foreground)return false;plugin.notifyListeners("message",message);return true;}
    static void tokenChanged(){SalahSupportPushPlugin plugin=active.get();if(plugin!=null&&plugin.foreground)plugin.notifyListeners("tokenChanged",new JSObject());}
}
