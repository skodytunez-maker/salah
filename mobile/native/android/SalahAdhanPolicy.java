package com.saadikobilov.salah;

final class SalahAdhanPolicy {
    static String asset(String key, String voice) {
        if (!"mansour".equals(voice) && !"mishary".equals(voice)) return null;
        if ("Fajr".equals(key)) return "public/assets/audio/adhan-mansour-fajr.mp3";
        if (!"Dhuhr".equals(key) && !"Asr".equals(key) && !"Maghrib".equals(key) && !"Isha".equals(key)) return null;
        return "public/assets/audio/adhan-" + voice + ".mp3";
    }
    static boolean timely(long now, long at) { return at >= 0 && now >= at && now - at <= 60000; }
}
