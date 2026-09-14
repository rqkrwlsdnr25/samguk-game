package com.samguk.authority;

import com.samguk.capital.Faction;
import java.util.Map;

public final class EmperorChallengeService {
    /**
     * relationByFactionId contains the emperor's current relation scores with living AI factions.
     * The caller remains responsible for persisting the changed relation values in the existing diplomacy store.
     */
    public int applyTurnDecay(Faction emperor, Map<String, Integer> relationByFactionId) {
        if (emperor == null || relationByFactionId == null || !emperor.isEmperorChallenge()) return 0;
        int changed = 0;
        for (Map.Entry<String, Integer> entry : relationByFactionId.entrySet()) {
            int oldValue = entry.getValue() == null ? 0 : entry.getValue();
            int nextValue = Math.max(-100, Math.min(100, oldValue + AuthorityService.EMPEROR_RELATION_DECAY));
            if (nextValue != oldValue) {
                entry.setValue(nextValue);
                changed++;
            }
        }
        return changed;
    }
}
