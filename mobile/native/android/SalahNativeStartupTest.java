package com.saadikobilov.salah;
import org.junit.Test;
import static org.junit.Assert.*;
public class SalahNativeStartupTest {
 @Test public void onlyLocalNativeDocumentsCanRunRecovery() {
  assertEquals("https://localhost",SalahNativeStartup.localOrigin("https://localhost/#quran"));
  assertEquals("http://localhost",SalahNativeStartup.localOrigin("http://localhost/index.html"));
  for(String url:new String[]{"https://skodytunez-maker.github.io/salah/","https://localhost.evil/","https://user@localhost/","https://localhost:444/","file:///index.html","javascript:alert(1)","invalid",null})
   assertNull(url,SalahNativeStartup.localOrigin(url));
 }
}
