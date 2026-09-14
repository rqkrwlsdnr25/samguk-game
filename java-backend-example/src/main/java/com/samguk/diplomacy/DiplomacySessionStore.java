package com.samguk.diplomacy;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
public final class DiplomacySessionStore {
    private final Map<String, DiplomacyRelationState> relations = new ConcurrentHashMap<>();
    public DiplomacyRelationState relation(int a,int b){ return relations.computeIfAbsent(key(a,b),k->new DiplomacyRelationState()); }
    private static String key(int a,int b){ return Math.min(a,b)+":"+Math.max(a,b); }
}
