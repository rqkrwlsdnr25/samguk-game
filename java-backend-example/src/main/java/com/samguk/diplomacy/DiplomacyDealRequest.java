package com.samguk.diplomacy;
import java.util.List;
public record DiplomacyDealRequest(int fromFaction, int toFaction, List<DealItem> give, List<DealItem> request) {
    public DiplomacyDealRequest {
        give = give == null ? List.of() : List.copyOf(give);
        request = request == null ? List.of() : List.copyOf(request);
    }
}
