package com.saadikobilov.salah;
import org.junit.Test;
import static org.junit.Assert.*;
public class SalahWidgetSizingTest {
    @Test public void oneCellPortraitRetainsNamesAndCountdown() { assertFalse(SalahWidgetSizing.thin(102)); assertFalse(SalahWidgetSizing.schedule(130,102)); }
    @Test public void oneCellLandscapeUsesThinRow() { assertTrue(SalahWidgetSizing.thin(51)); assertFalse(SalahWidgetSizing.schedule(269,51)); }
    @Test public void scheduleRequiresBothAvailableDimensions() { assertFalse(SalahWidgetSizing.schedule(249,200)); assertFalse(SalahWidgetSizing.schedule(350,123)); assertTrue(SalahWidgetSizing.schedule(250,124)); assertTrue(SalahWidgetSizing.schedule(500,250)); }
    @Test public void malformedLauncherSizesAreRejected() { assertFalse(SalahWidgetSizing.valid(Float.NaN,100)); assertFalse(SalahWidgetSizing.valid(100,Float.POSITIVE_INFINITY)); assertFalse(SalahWidgetSizing.valid(0,100)); assertFalse(SalahWidgetSizing.valid(100,-1)); assertFalse(SalahWidgetSizing.valid(5000,100)); assertTrue(SalahWidgetSizing.valid(130,102)); }
    @Test public void oldLauncherRangesFollowCurrentOrientation() { assertEquals(130,SalahWidgetSizing.fallback(false,130,269,160)); assertEquals(269,SalahWidgetSizing.fallback(true,130,269,160)); assertEquals(102,SalahWidgetSizing.fallback(false,102,51,84)); assertEquals(51,SalahWidgetSizing.fallback(true,102,51,84)); assertEquals(84,SalahWidgetSizing.fallback(true,102,0,84)); }
    @Test public void expiredOrFutureScheduleDoesNotPretendToBeToday() { assertEquals(-1,SalahWidgetDay.currentIndex("2026-10-08",new String[]{"2026-10-06","2026-10-07"})); assertEquals(-1,SalahWidgetDay.currentIndex("2026-10-08",new String[]{"2026-10-09"})); assertEquals(1,SalahWidgetDay.currentIndex("2026-10-08",new String[]{"2026-10-07","2026-10-08","2026-10-09"})); assertEquals(-1,SalahWidgetDay.currentIndex("2026-10-08",null)); }
}
