package com.samguk.authority;

import com.samguk.capital.Faction;

/**
 * Existing battle/build/capital systems call these methods after their own state
 * changes complete. This listener does not replace or recreate faction objects.
 */
public final class AuthorityActivityListener {
    private final AuthorityService authorityService;

    public AuthorityActivityListener(AuthorityService authorityService) {
        this.authorityService = authorityService;
    }

    public AuthorityService.RankUpdate onBattleVictory(Faction existingFaction) {
        return authorityService.addAuthority(existingFaction, AuthorityService.BATTLE_VICTORY_AUTHORITY);
    }

    public AuthorityService.RankUpdate onBuildingCompleted(Faction existingFaction) {
        return authorityService.addAuthority(existingFaction, AuthorityService.BUILDING_COMPLETE_AUTHORITY);
    }

    public AuthorityService.RankUpdate onCapitalUpgradeCompleted(Faction existingFaction) {
        return authorityService.addAuthority(existingFaction, AuthorityService.CAPITAL_UPGRADE_AUTHORITY);
    }
}
