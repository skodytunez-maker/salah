package com.saadikobilov.salah;
import android.content.SharedPreferences;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.lang.reflect.Proxy;
import java.util.*;
public class SalahLiveUpdateStoreTest {
 static SharedPreferences memory() {
  Map<String,Integer> values=new HashMap<>();
  final SharedPreferences.Editor[] editor=new SharedPreferences.Editor[1];
  editor[0]=(SharedPreferences.Editor)Proxy.newProxyInstance(SharedPreferences.Editor.class.getClassLoader(),new Class[]{SharedPreferences.Editor.class},(p,m,a)->{
   switch(m.getName()){case "putInt": values.put((String)a[0],(Integer)a[1]);return editor[0];case "remove": values.remove((String)a[0]);return editor[0];case "commit": return true;case "apply":return null;default:throw new UnsupportedOperationException(m.getName());}
  });
  return (SharedPreferences)Proxy.newProxyInstance(SharedPreferences.class.getClassLoader(),new Class[]{SharedPreferences.class},(p,m,a)->{if(m.getName().equals("getInt"))return values.getOrDefault((String)a[0],(Integer)a[1]);if(m.getName().equals("edit"))return editor[0];throw new UnsupportedOperationException(m.getName());});
 }
 static void bundle(SalahLiveUpdateStore store,int version) throws Exception {File dir=store.version(version);new File(dir,"js").mkdirs();new File(dir,"index.html").createNewFile();new File(dir,"js/native-entry.js").createNewFile();}
 @Test public void failedTrialRestoresConfirmedWithoutClearingUserData() throws Exception {
  File root=java.nio.file.Files.createTempDirectory("salah-update-store").toFile();SalahLiveUpdateStore store=new SalahLiveUpdateStore(root,memory());
  bundle(store,333);bundle(store,334);store.prefs.edit().putInt("confirmed",333).putInt("pending",334).commit();
  assertEquals(334,store.launch(332));assertFalse(store.ready(333));assertEquals(334,store.prefs.getInt("trial",0));
  // Process died before ready: relaunch records failed release and restores confirmed.
  assertEquals(333,store.launch(332));assertEquals(334,store.prefs.getInt("failed",0));assertTrue(store.complete(333));
  store.remove(store.version(333));store.remove(store.version(334));root.delete();
 }
 @Test public void readyCommitsOnlyExactTrialAndNewApkSupersedesOldWeb() throws Exception {
  File root=java.nio.file.Files.createTempDirectory("salah-update-store").toFile();SalahLiveUpdateStore store=new SalahLiveUpdateStore(root,memory());
  bundle(store,333);store.prefs.edit().putInt("pending",333).commit();assertEquals(333,store.launch(332));assertTrue(store.ready(333));assertEquals(333,store.launch(332));
  assertEquals(0,store.launch(334));assertEquals(0,store.prefs.getInt("confirmed",0));
  store.remove(store.version(333));root.delete();
 }
 @Test public void incompleteDownloadIsNeverLaunched() throws Exception {
  File root=java.nio.file.Files.createTempDirectory("salah-update-store").toFile();SalahLiveUpdateStore store=new SalahLiveUpdateStore(root,memory());
  store.prefs.edit().putInt("pending",333).commit();assertEquals(0,store.launch(332));assertEquals(0,store.prefs.getInt("pending",0));root.delete();
 }
}
