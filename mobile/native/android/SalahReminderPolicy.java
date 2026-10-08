package com.saadikobilov.salah;

final class SalahReminderPolicy {
    static final long MAX_FUTURE_MS = 14L * 24 * 60 * 60 * 1000;
    static final long MAX_LATE_MS = 5L * 60 * 1000;
    static boolean valid(long now, long at, String id, String message) {
        return now >= 0 && at > now && at - now <= MAX_FUTURE_MS && id != null && !id.isEmpty()
                && id.length() <= 1024 && message != null && !message.trim().isEmpty() && message.length() <= 240;
    }
    static boolean fresh(long now, long at) { return at >= 0 && now >= at && now - at <= MAX_LATE_MS; }
}
