package com.saadikobilov.salah;
import org.junit.Test;
import static org.junit.Assert.*;
public class SalahWidgetTimingTest {
    @Test public void countdownUsesMonotonicClockEvenAcrossSleep() {
        assertEquals(65000, SalahWidgetTiming.chronometerBase(100000,160000,5000));
        assertEquals(65000, SalahWidgetTiming.chronometerBase(130000,160000,35000));
        assertEquals(-1, SalahWidgetTiming.chronometerBase(160000,160000,65000));
        assertEquals(-1, SalahWidgetTiming.chronometerBase(100000,160000,Long.MAX_VALUE));
    }
    @Test public void dayBoundaryRefreshesBeforeTomorrowPrayer() {
        assertEquals(2000, SalahWidgetTiming.refreshAt(1000,3000,2000));
        assertEquals(2000, SalahWidgetTiming.refreshAt(1000,2000,3000));
        assertEquals(-1, SalahWidgetTiming.refreshAt(3000,2000,4000));
        assertEquals(-1, SalahWidgetTiming.refreshAt(1000,Long.MAX_VALUE,2000));
    }
}
