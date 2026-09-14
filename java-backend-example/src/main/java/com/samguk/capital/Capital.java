package com.samguk.capital;

public final class Capital {
    public static final int MAX_LEVEL = 5;
    private int capitalLevel = 1;

    public int getCapitalLevel() { return capitalLevel; }

    public void setCapitalLevel(int capitalLevel) {
        this.capitalLevel = Math.max(1, Math.min(MAX_LEVEL, capitalLevel));
    }

    public boolean isMaxLevel() { return capitalLevel >= MAX_LEVEL; }
}
