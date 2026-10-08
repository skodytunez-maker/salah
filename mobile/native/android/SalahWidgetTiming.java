package com.saadikobilov.salah;
final class SalahWidgetTiming {
    private static final long MAX = 14L * 86400000;
    static long chronometerBase(long now, long next, long elapsed) {
        if (now < 0 || elapsed < 0 || next <= now || next - now > MAX || elapsed > Long.MAX_VALUE - (next - now)) return -1;
        return elapsed + (next - now);
    }
    static long refreshAt(long now, long next, long midnight) {
        if (now < 0 || next <= now || next - now > MAX) return -1;
        return midnight > now && midnight < next ? midnight : next;
    }
}
