package com.samguk.capital;

import com.samguk.authority.FactionRank;

public final class Faction {
    private int maxActionPoints;
    private double recruitmentLimit;
    private double taxIncome;

    // v74 왕권/권위 상태. Existing Faction instance에 보관하며 객체를 재생성하지 않는다.
    private FactionRank factionRank = FactionRank.PROVINCIAL_KING;
    private int authorityScore = 0;
    private boolean emperorChallenge = false;

    public Faction(int maxActionPoints, double recruitmentLimit, double taxIncome) {
        this.maxActionPoints = maxActionPoints;
        this.recruitmentLimit = recruitmentLimit;
        this.taxIncome = taxIncome;
    }

    public int getMaxActionPoints() { return maxActionPoints; }
    public double getRecruitmentLimit() { return recruitmentLimit; }
    public double getTaxIncome() { return taxIncome; }
    public void setMaxActionPoints(int value) { maxActionPoints = value; }
    public void setRecruitmentLimit(double value) { recruitmentLimit = value; }
    public void setTaxIncome(double value) { taxIncome = value; }

    public FactionRank getFactionRank() { return factionRank; }
    public void setFactionRank(FactionRank factionRank) {
        this.factionRank = factionRank == null ? FactionRank.PROVINCIAL_KING : factionRank;
    }
    public int getAuthorityScore() { return authorityScore; }
    public void setAuthorityScore(int authorityScore) { this.authorityScore = Math.max(0, authorityScore); }
    public boolean isEmperorChallenge() { return emperorChallenge; }
    public void setEmperorChallenge(boolean emperorChallenge) { this.emperorChallenge = emperorChallenge; }
}
