package com.saadikobilov.salah;
final class SalahWidgetDay {
    static int currentIndex(String today, String[] dates) {
        if (today == null || dates == null) return -1;
        for (int i = 0; i < dates.length; i++) if (today.equals(dates[i])) return i;
        return -1;
    }
}
