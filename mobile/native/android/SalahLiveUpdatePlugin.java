package com.saadikobilov.salah;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.*;
@CapacitorPlugin(name="SalahLiveUpdate")
public class SalahLiveUpdatePlugin extends Plugin {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private SalahLiveUpdateStore store;
    private long lastCheck=0;
    private boolean busy=false;
    @Override public void load(){store=new SalahLiveUpdateStore(getContext());}
    @Override protected void handleOnDestroy(){worker.shutdownNow();}
    @PluginMethod public void ready(PluginCall call){
        Integer version=call.getInt("version");
        if(version==null || !store.ready(version)){call.reject("Update version not active");return;}
        worker.execute(()->{try{store.clean();}catch(Exception ignored){}});
        call.resolve();
    }
    @PluginMethod public void check(PluginCall call){
        synchronized(this){
            if(busy){result(call,"loading");return;}
            if(!Boolean.TRUE.equals(call.getBoolean("force",false)) && System.currentTimeMillis()-lastCheck<300000){result(call,"current");return;}
            busy=true;lastCheck=System.currentTimeMillis();
        }
        worker.execute(()->{try{result(call,download());}catch(Exception e){result(call,"unavailable");}finally{synchronized(this){busy=false;}}});
    }
    private void result(PluginCall call,String status){JSObject value=new JSObject();value.put("status",status);call.resolve(value);}
    private byte[] fetch(URL url,long limit) throws Exception {
        if(!SalahLiveUpdatePolicy.allowed(url))throw new Exception("Untrusted update URL");
        HttpURLConnection connection=(HttpURLConnection)url.openConnection();
        connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(15000);connection.setReadTimeout(30000);
        connection.setRequestProperty("Cache-Control","no-cache");
        try {
            if(connection.getResponseCode()!=200 || connection.getContentLengthLong()>limit)throw new Exception("Update unavailable");
            try(InputStream input=connection.getInputStream();ByteArrayOutputStream output=new ByteArrayOutputStream()){
                byte[] buffer=new byte[32768];int count;long size=0;
                while((count=input.read(buffer))!=-1){size+=count;if(size>limit || Thread.currentThread().isInterrupted())throw new Exception("Update too large");output.write(buffer,0,count);}
                return output.toByteArray();
            }
        } finally{connection.disconnect();}
    }
    private String download() throws Exception {
        JSONObject manifest=new JSONObject(new String(fetch(new URL(SalahLiveUpdatePolicy.BASE+"latest.json"),32768),java.nio.charset.StandardCharsets.UTF_8));
        int version=manifest.getInt("version"),minimum=manifest.getInt("minNativeVersion");
        int nativeVersion=getContext().getPackageManager().getPackageInfo(getContext().getPackageName(),0).versionCode;
        int current=Math.max(nativeVersion,Math.max(store.prefs.getInt("confirmed",0),store.prefs.getInt("trial",0)));
        if(minimum>nativeVersion)return "native-required";
        int pending=store.prefs.getInt("pending",0);
        if(pending>current && store.complete(pending))return "available";
        if(!SalahLiveUpdatePolicy.accepts(version,minimum,manifest.getInt("schema"),nativeVersion,current,pending,store.prefs.getInt("failed",0)))return "current";
        String digest=manifest.getString("sha256"),file=manifest.getString("file");
        if(!digest.matches("[0-9a-f]{64}") || !file.equals("web-"+version+"-"+digest+".zip"))throw new Exception("Invalid update descriptor");
        // Immutable hash-addressed archive; a stale manifest can never point to changed bytes.
        store.root.mkdirs();
        File archive=new File(store.root,"download.zip");
        if(!downloadArchive(new URL(SalahLiveUpdatePolicy.BASE+file),archive,manifest.getLong("bytes")).equals(digest)){archive.delete();throw new Exception("Update integrity mismatch");}
        File stage=new File(store.root,"staging"); if(stage.exists())store.remove(stage); if(!stage.mkdirs())throw new Exception("No update storage");
        boolean installed=false;
        try {
            Set<String> names=new HashSet<>();long expanded=0;int entries=0;
            try(ZipInputStream input=new ZipInputStream(new FileInputStream(archive))){
                ZipEntry entry;byte[] buffer=new byte[32768];
                while((entry=input.getNextEntry())!=null){
                    if(++entries>SalahLiveUpdatePolicy.MAX_ENTRIES || !names.add(entry.getName()))throw new Exception("Invalid archive entries");
                    File target=SalahLiveUpdatePolicy.entry(stage,entry.getName());
                    if(entry.isDirectory()){if(!target.isDirectory() && !target.mkdirs())throw new Exception("Cannot create directory");continue;}
                    File parent=target.getParentFile();if(!parent.isDirectory() && !parent.mkdirs())throw new Exception("Cannot create directory");
                    try(FileOutputStream output=new FileOutputStream(target)){
                        int count;while((count=input.read(buffer))!=-1){expanded+=count;if(expanded>SalahLiveUpdatePolicy.MAX_EXPANDED)throw new Exception("Expanded update too large");output.write(buffer,0,count);}output.getFD().sync();
                    }
                }
            }
            for(String required:new String[]{"index.html","js/app.js","js/native-entry.js","js/app-release.js","js/vendor/capacitor-core.js"})if(!new File(stage,required).isFile())throw new Exception("Incomplete update");
            String release;
            try(InputStream input=new FileInputStream(new File(stage,"js/app-release.js"));ByteArrayOutputStream output=new ByteArrayOutputStream()){
                byte[] buffer=new byte[8192];int count;while((count=input.read(buffer))!=-1){if(output.size()+count>32768)throw new Exception("Release descriptor too large");output.write(buffer,0,count);}
                release=new String(output.toByteArray(),java.nio.charset.StandardCharsets.UTF_8);
            }
            if(!release.contains("export const APP_VERSION="+version+";"))throw new Exception("Wrong web version");
            // Native dependency notices stay tied to the APK, even when web assets change.
            File notices=new File(stage,"third-party/Android-NOTICES.txt");notices.getParentFile().mkdirs();
            try(InputStream input=getContext().getAssets().open("public/third-party/Android-NOTICES.txt");FileOutputStream output=new FileOutputStream(notices)){byte[] buffer=new byte[8192];int count;while((count=input.read(buffer))!=-1)output.write(buffer,0,count);}
            File destination=store.version(version);if(destination.exists())store.remove(destination);
            if(!stage.renameTo(destination))throw new Exception("Cannot install update");
            if(!store.prefs.edit().putInt("pending",version).commit())throw new Exception("Cannot record update");
            installed=true;return "available";
        } finally {archive.delete();if(!installed && stage.exists())store.remove(stage);}
    }
    private String downloadArchive(URL url,File file,long expected) throws Exception {
        if(!SalahLiveUpdatePolicy.allowed(url) || expected<=0 || expected>SalahLiveUpdatePolicy.MAX_ZIP)throw new Exception("Invalid download");
        HttpURLConnection connection=(HttpURLConnection)url.openConnection();
        connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(15000);connection.setReadTimeout(30000);
        try {
            if(connection.getResponseCode()!=200 || connection.getContentLengthLong()>SalahLiveUpdatePolicy.MAX_ZIP)throw new Exception("Update unavailable");
            MessageDigest digest=MessageDigest.getInstance("SHA-256");long size=0;
            try(InputStream input=connection.getInputStream();FileOutputStream output=new FileOutputStream(file)){
                byte[] buffer=new byte[32768];int count;
                while((count=input.read(buffer))!=-1){size+=count;if(size>expected || Thread.currentThread().isInterrupted())throw new Exception("Update size mismatch");digest.update(buffer,0,count);output.write(buffer,0,count);}
                if(size!=expected)throw new Exception("Incomplete update");output.getFD().sync();
            }
            return hex(digest.digest());
        } catch(Exception e){file.delete();throw e;} finally{connection.disconnect();}
    }
    private static String hex(byte[] bytes){StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(java.util.Locale.ROOT,"%02x",b & 255));return s.toString();}
}
