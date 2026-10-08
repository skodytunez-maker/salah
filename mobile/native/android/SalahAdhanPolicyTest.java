package com.saadikobilov.salah;
import org.junit.Test;
import static org.junit.Assert.*;
public class SalahAdhanPolicyTest {
    @Test public void fajrRetainsExistingSpecialRecording() { assertEquals(SalahAdhanPolicy.asset("Fajr","mansour"), SalahAdhanPolicy.asset("Fajr","mishary")); assertTrue(SalahAdhanPolicy.asset("Fajr","mishary").endsWith("-fajr.mp3")); }
    @Test public void noArbitraryFilesOrNetworkAudio() { assertNull(SalahAdhanPolicy.asset("../../file","mansour")); assertNull(SalahAdhanPolicy.asset("Isha","https://evil.test/audio")); assertNull(SalahAdhanPolicy.asset("Sunrise","mansour")); assertNotNull(SalahAdhanPolicy.asset("Isha","mishary")); }
    @Test public void staleSoundNeverResumesLater() { assertTrue(SalahAdhanPolicy.timely(61000,1000)); assertFalse(SalahAdhanPolicy.timely(61001,1000)); assertFalse(SalahAdhanPolicy.timely(999,1000)); assertFalse(SalahAdhanPolicy.timely(1000,-1)); }
}
