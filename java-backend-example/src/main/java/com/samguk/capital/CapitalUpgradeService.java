package com.samguk.capital;

import java.util.Map;

public final class CapitalUpgradeService {
    private static final double COMPOUND_RATE = 1.30;
    private static final Map<Integer,Integer> COSTS = Map.of(2,180,3,320,4,520,5,800);

    public UpgradeResult upgradeCapitalLevel(Capital capital, Faction faction, int availableGold) {
        if (capital == null || faction == null) throw new IllegalArgumentException("capital/faction required");
        if (capital.isMaxLevel()) return new UpgradeResult(false, capital.getCapitalLevel(), 0, "MAX_LEVEL");

        int nextLevel = capital.getCapitalLevel() + 1;
        int cost = COSTS.getOrDefault(nextLevel, 0);
        if (availableGold < cost) return new UpgradeResult(false, capital.getCapitalLevel(), cost, "NOT_ENOUGH_GOLD");

        // Apply permanent global bonuses once per successful level-up.
        capital.setCapitalLevel(nextLevel);
        faction.setMaxActionPoints(faction.getMaxActionPoints() + 1);
        faction.setRecruitmentLimit(faction.getRecruitmentLimit() * COMPOUND_RATE);
        faction.setTaxIncome(faction.getTaxIncome() * COMPOUND_RATE);
        return new UpgradeResult(true, nextLevel, cost, "OK");
    }

    public record UpgradeResult(boolean upgraded, int level, int goldCost, String status) {}
}
