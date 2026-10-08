package com.saadikobilov.salah;

final class SalahWidgetSizing {
    static boolean valid(float width, float height) {
        return Float.isFinite(width) && Float.isFinite(height) && width > 0 && height > 0 && width <= 4096 && height <= 4096;
    }
    static boolean schedule(float width, float height) { return width >= 250 && height >= 124; }
    static boolean thin(float height) { return height < 84; }
    static int fallback(boolean landscape, int portrait, int horizontal, int defaultSize) {
        int selected = landscape ? horizontal : portrait;
        return selected > 0 ? selected : defaultSize;
    }
}
