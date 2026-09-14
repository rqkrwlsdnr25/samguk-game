package com.samguk.authority;

public enum FactionRank {
    PROVINCIAL_KING(0, "지방왕"),
    KING(100, "왕"),
    GREAT_KING(300, "대왕"),
    EMPEROR(600, "황제");

    private final int threshold;
    private final String displayName;

    FactionRank(int threshold, String displayName) {
        this.threshold = threshold;
        this.displayName = displayName;
    }

    public int getThreshold() { return threshold; }
    public String getDisplayName() { return displayName; }

    public static FactionRank fromAuthority(int authorityScore) {
        if (authorityScore >= EMPEROR.threshold) return EMPEROR;
        if (authorityScore >= GREAT_KING.threshold) return GREAT_KING;
        if (authorityScore >= KING.threshold) return KING;
        return PROVINCIAL_KING;
    }
}
