package com.samguk.history;

import java.util.Map;

/**
 * Existing-object-only historical display-name patch.
 *
 * Integration rule:
 * - Call this after factions/officers have already been loaded from DB/session.
 * - Never creates a Faction or Officer.
 * - Never changes IDs or associations; only Officer.setName(...).
 *
 * In a real backend, make the existing Faction/Officer classes implement these
 * two small views (or replace the interface types below with your existing types).
 */
public final class HistoricalNamePatch {
    private HistoricalNamePatch() {}

    public interface Officer {
        void setName(String name);
    }

    public interface Faction {
        Officer getKing();
        Officer getGeneral();
        Officer getPremier();
    }

    public static void patchHistoricalNames(Map<String, Faction> existingFactions) {
        if (existingFactions == null || existingFactions.isEmpty()) return;

        rename(existingFactions.get("GOGURYEO"), "광개토대왕 (담덕)", "모두루", "연라");
        rename(existingFactions.get("BAEKJE"), "아신왕", "진무", "해충");
        rename(existingFactions.get("SILLA"), "내물 마립간", "석실나", "미사흔");
        rename(existingFactions.get("GAYA"), "이시품왕", "가라파", "정견모주");
        rename(existingFactions.get("WA"), "리추 천황", "카츠라기노 소츠히코", "나카토미노 카마코");
        rename(existingFactions.get("ROURAN"), "욱구려 사륜", "욱구려 대단", "필쇠나");
        rename(existingFactions.get("YILOU"), "아구나", "돌지신", "골속지");
        rename(existingFactions.get("BUYEO"), "잔왕", "위구태", "여울");
        rename(existingFactions.get("EASTERN_JIN"), "안제", "유유", "사안");
        rename(existingFactions.get("NORTHERN_YAN"), "모용보", "고운", "풍발");
        rename(existingFactions.get("SOUTHERN_YAN"), "모용덕", "모용초", "한범");
    }

    private static void rename(Faction faction, String kingName, String generalName, String premierName) {
        if (faction == null) return;
        setName(faction.getKing(), kingName);
        setName(faction.getGeneral(), generalName);
        setName(faction.getPremier(), premierName);
    }

    private static void setName(Officer officer, String name) {
        if (officer != null) officer.setName(name);
    }
}
