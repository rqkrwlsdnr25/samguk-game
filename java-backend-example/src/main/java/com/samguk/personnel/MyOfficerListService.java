package com.samguk.personnel;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Returns only officers already owned by the current player's faction.
 * The service never enumerates the global officer repository, so enemy and
 * unrecruited officers cannot leak into the response.
 */
public final class MyOfficerListService {

    public interface PlayerSession {
        FactionView getPlayerFaction();
    }

    public interface FactionView {
        int getId();
        String getCode();
        String getName();
        List<? extends OfficerView> getOfficers();
    }

    public interface OfficerView {
        String getId();
        String getName();
        String getRole();
        String getOffice();
        int getTerritoryId();
        int getWar();
        int getLeadership();
        int getIntelligence();
        int getCharisma();
        Map<String, String> getAptitude();
        int getPortraitVariant();
    }

    public record OfficerDto(
        String id,
        String name,
        String role,
        String office,
        int territoryId,
        StatsDto stats,
        Map<String, String> aptitude,
        int portraitVariant
    ) {}

    public record StatsDto(int war, int leadership, int intelligence, int charisma) {}

    public record OfficerListResponse(
        int factionId,
        String factionCode,
        String factionName,
        List<OfficerDto> officers
    ) {}

    public OfficerListResponse getMyOfficers(PlayerSession session) {
        if (session == null || session.getPlayerFaction() == null) {
            throw new IllegalArgumentException("player session/faction required");
        }

        FactionView faction = session.getPlayerFaction();
        List<OfficerDto> result = new ArrayList<>();

        // Important: use only playerFaction.getOfficers().
        // Never load all officers and filter on the client.
        List<? extends OfficerView> owned = faction.getOfficers();
        if (owned != null) {
            for (OfficerView officer : owned) {
                if (officer == null) continue;
                result.add(new OfficerDto(
                    officer.getId(),
                    officer.getName(),
                    officer.getRole(),
                    officer.getOffice(),
                    officer.getTerritoryId(),
                    new StatsDto(
                        officer.getWar(),
                        officer.getLeadership(),
                        officer.getIntelligence(),
                        officer.getCharisma()
                    ),
                    officer.getAptitude() == null ? Map.of() : Map.copyOf(officer.getAptitude()),
                    officer.getPortraitVariant()
                ));
            }
        }

        return new OfficerListResponse(
            faction.getId(),
            faction.getCode(),
            faction.getName(),
            List.copyOf(result)
        );
    }
}
