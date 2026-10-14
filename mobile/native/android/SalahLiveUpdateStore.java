package com.saadikobilov.salah;
import android.content.Context;
import android.content.SharedPreferences;
import java.io.File;
final class SalahLiveUpdateStore {
    final File root;
    final SharedPreferences prefs;
    SalahLiveUpdateStore(Context context) {
        root = new File(context.getFilesDir(),"salah-web-updates");
        prefs = context.getSharedPreferences("salah-web-updates",Context.MODE_PRIVATE);
    }
    SalahLiveUpdateStore(File root,SharedPreferences prefs) {this.root=root;this.prefs=prefs;}
    File version(int version) { return new File(root,"v"+version); }
    boolean complete(int v) { return v > 0 && new File(version(v),"index.html").isFile() && new File(version(v),"js/native-entry.js").isFile(); }
    synchronized int launch(int nativeVersion) {
        int trial=prefs.getInt("trial",0);
        if(trial>0) prefs.edit().putInt("failed",trial).remove("trial").commit();
        int confirmed=prefs.getInt("confirmed",0), pending=prefs.getInt("pending",0);
        if(confirmed<=nativeVersion || !complete(confirmed)) { confirmed=0; prefs.edit().remove("confirmed").commit(); }
        if(pending>Math.max(nativeVersion,confirmed) && complete(pending)) {
            if(prefs.edit().putInt("trial",pending).remove("pending").commit()) return pending;
        } else if(pending>0) prefs.edit().remove("pending").commit();
        return confirmed;
    }
    synchronized boolean ready(int version) {
        int trial=prefs.getInt("trial",0);
        if(trial==0) return true;
        if(version!=trial) return false;
        int previous=prefs.getInt("confirmed",0);
        return prefs.edit().putInt("confirmed",trial).putInt("previous",previous).remove("trial").commit();
    }
    synchronized void rejectTrial() {
        int trial=prefs.getInt("trial",0);
        if(trial>0) prefs.edit().putInt("failed",trial).remove("trial").commit();
    }
    synchronized void clean() throws Exception {
        File[] files=root.listFiles(); if(files==null)return;
        int confirmed=prefs.getInt("confirmed",0),previous=prefs.getInt("previous",0),pending=prefs.getInt("pending",0),trial=prefs.getInt("trial",0);
        for(File f:files) if(f.getName().matches("v[0-9]+") && !f.equals(version(confirmed)) && !f.equals(version(previous)) && !f.equals(version(pending)) && !f.equals(version(trial))) remove(f);
    }
    void remove(File file) throws Exception {
        if(!file.getCanonicalPath().startsWith(root.getCanonicalPath()+File.separator)) throw new Exception("Refusing external deletion");
        File[] children=file.listFiles(); if(children!=null)for(File child:children)remove(child);
        if(file.exists() && !file.delete())throw new Exception("Cannot remove incomplete update");
    }
}
