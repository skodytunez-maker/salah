package com.saadikobilov.salah;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.File;
import java.net.URL;
public class SalahLiveUpdatePolicyTest {
 @Test public void transportIsPinned() throws Exception {
  assertTrue(SalahLiveUpdatePolicy.allowed(new URL(SalahLiveUpdatePolicy.BASE+"latest.json")));
  for(String url:new String[]{"http://skodytunez-maker.github.io/salah/mobile-updates/latest.json","https://evil.example/salah/mobile-updates/latest.json","https://skodytunez-maker.github.io:444/salah/mobile-updates/latest.json","https://user@skodytunez-maker.github.io/salah/mobile-updates/latest.json","https://skodytunez-maker.github.io/another/latest.json"})assertFalse(SalahLiveUpdatePolicy.allowed(new URL(url)));
 }
 @Test public void versionsAndNativeCompatibility() {
  assertTrue(SalahLiveUpdatePolicy.accepts(333,332,1,332,332,0,0));
  assertFalse(SalahLiveUpdatePolicy.accepts(333,334,1,332,332,0,0));
  assertFalse(SalahLiveUpdatePolicy.accepts(333,332,2,332,332,0,0));
  assertFalse(SalahLiveUpdatePolicy.accepts(332,332,1,332,332,0,0));
  assertFalse(SalahLiveUpdatePolicy.accepts(333,332,1,332,332,333,0));
  assertFalse(SalahLiveUpdatePolicy.accepts(333,332,1,332,332,0,333));
 }
 @Test public void archiveCannotEscapeOrInstallNativeCode() throws Exception {
  File root=new File(System.getProperty("java.io.tmpdir"),"salah-update-test");
  assertEquals(new File(root,"js/app.js").getCanonicalPath(),SalahLiveUpdatePolicy.entry(root,"js/app.js").getCanonicalPath());
  for(String name:new String[]{"../outside","/absolute","js/../../outside","x.dex","x.so","private.jks","js/./app.js","js//app.js","x:y"}) {
   try { SalahLiveUpdatePolicy.entry(root,name);fail(name); } catch(Exception expected) {}
  }
 }
 @Test public void failedOrUnsupportedUpdatesNeverClaimCurrent() {
  assertEquals("rolled-back",SalahLiveUpdatePolicy.status(444,332,1,338,338,0,false,444));
  assertEquals("native-required",SalahLiveUpdatePolicy.status(445,445,1,338,338,0,false,0));
  assertEquals("unavailable",SalahLiveUpdatePolicy.status(444,332,2,436,436,0,false,0));
  assertEquals("current",SalahLiveUpdatePolicy.status(444,332,1,445,445,0,false,444));
  assertEquals("download",SalahLiveUpdatePolicy.status(446,445,1,445,445,446,false,0));
  assertEquals("available",SalahLiveUpdatePolicy.status(446,445,1,445,445,446,true,0));
  assertEquals("download",SalahLiveUpdatePolicy.status(447,445,1,445,445,0,false,446));
 }
}
