package com.saadikobilov.salah;
import org.junit.Test;
import static org.junit.Assert.*;

public class SalahReminderPolicyTest {
    @Test public void rejectsPastEmptyAndUnboundedEvents() {
        assertFalse(SalahReminderPolicy.valid(1000,1000,"id","text"));
        assertFalse(SalahReminderPolicy.valid(1000,999,"id","text"));
        assertFalse(SalahReminderPolicy.valid(1000,2000,"","text"));
        assertFalse(SalahReminderPolicy.valid(1000,2000,"id"," "));
        assertFalse(SalahReminderPolicy.valid(1000,Long.MAX_VALUE,"id","text"));
        assertFalse(SalahReminderPolicy.valid(Long.MIN_VALUE,1000,"id","text"));
        assertTrue(SalahReminderPolicy.valid(1000,2000,"id","text"));
    }
    @Test public void lateDeliveryNeverBecomesACatchUpAlarm() {
        assertTrue(SalahReminderPolicy.fresh(1000,1000));
        assertTrue(SalahReminderPolicy.fresh(301000,1000));
        assertFalse(SalahReminderPolicy.fresh(301001,1000));
        assertFalse(SalahReminderPolicy.fresh(999,1000));
        assertFalse(SalahReminderPolicy.fresh(1000,-1));
    }
}
