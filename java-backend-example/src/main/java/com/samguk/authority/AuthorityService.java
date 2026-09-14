package com.samguk.authority;

import com.samguk.capital.Faction;

public final class AuthorityService {
    public static final int BATTLE_VICTORY_AUTHORITY = 20;
    public static final int BUILDING_COMPLETE_AUTHORITY = 10;
    public static final int CAPITAL_UPGRADE_AUTHORITY = 50;
    public static final double KING_ECONOMY_MULTIPLIER = 1.30;
    public static final int GREAT_KING_ACTION_BONUS = 2;
    public static final int EMPEROR_ADDITIONAL_ACTION_BONUS = 3;
    public static final int GREAT_KING_DIPLOMACY_WEIGHT = 15;
    public static final int EMPEROR_DIPLOMACY_WEIGHT = 25;
    public static final int EMPEROR_RELATION_DECAY = -2;

    public RankUpdate addAuthority(Faction faction, int amount) {
        if (faction == null) throw new IllegalArgumentException("faction required");
        if (amount <= 0) return new RankUpdate(false, faction.getFactionRank(), faction.getFactionRank(), faction.getAuthorityScore());

        FactionRank before = faction.getFactionRank();
        faction.setAuthorityScore(Math.max(0, faction.getAuthorityScore() + amount));
        FactionRank after = updateFactionRank(faction);
        return new RankUpdate(before != after, before, after, faction.getAuthorityScore());
    }

    public FactionRank updateFactionRank(Faction faction) {
        if (faction == null) throw new IllegalArgumentException("faction required");
        FactionRank before = faction.getFactionRank();
        FactionRank next = FactionRank.fromAuthority(faction.getAuthorityScore());

        // Apply only the bonuses of ranks crossed in this update. This prevents
        // repeated updateFactionRank() calls from multiplying session values again.
        if (before.ordinal() < FactionRank.KING.ordinal() && next.ordinal() >= FactionRank.KING.ordinal()) {
            faction.setRecruitmentLimit(faction.getRecruitmentLimit() * KING_ECONOMY_MULTIPLIER);
            faction.setTaxIncome(faction.getTaxIncome() * KING_ECONOMY_MULTIPLIER);
        }
        if (before.ordinal() < FactionRank.GREAT_KING.ordinal() && next.ordinal() >= FactionRank.GREAT_KING.ordinal()) {
            faction.setMaxActionPoints(faction.getMaxActionPoints() + GREAT_KING_ACTION_BONUS);
        }
        if (before.ordinal() < FactionRank.EMPEROR.ordinal() && next.ordinal() >= FactionRank.EMPEROR.ordinal()) {
            faction.setMaxActionPoints(faction.getMaxActionPoints() + EMPEROR_ADDITIONAL_ACTION_BONUS);
        }

        faction.setFactionRank(next);
        faction.setEmperorChallenge(next == FactionRank.EMPEROR);
        return next;
    }

    public int getActionPointBonus(Faction faction) {
        return switch (faction.getFactionRank()) {
            case GREAT_KING -> GREAT_KING_ACTION_BONUS;
            case EMPEROR -> GREAT_KING_ACTION_BONUS + EMPEROR_ADDITIONAL_ACTION_BONUS;
            default -> 0;
        };
    }

    public double getRecruitmentMultiplier(Faction faction) {
        return faction.getFactionRank().ordinal() >= FactionRank.KING.ordinal() ? KING_ECONOMY_MULTIPLIER : 1.0;
    }

    public double getTaxIncomeMultiplier(Faction faction) {
        return faction.getFactionRank().ordinal() >= FactionRank.KING.ordinal() ? KING_ECONOMY_MULTIPLIER : 1.0;
    }

    public boolean canAppointHighestOffices(Faction faction) {
        return faction.getFactionRank().ordinal() >= FactionRank.KING.ordinal();
    }

    public int getDiplomacyDemandWeight(Faction faction) {
        return switch (faction.getFactionRank()) {
            case GREAT_KING -> GREAT_KING_DIPLOMACY_WEIGHT;
            case EMPEROR -> EMPEROR_DIPLOMACY_WEIGHT;
            default -> 0;
        };
    }

    public record RankUpdate(boolean rankChanged, FactionRank previousRank, FactionRank currentRank, int authorityScore) {}
}
