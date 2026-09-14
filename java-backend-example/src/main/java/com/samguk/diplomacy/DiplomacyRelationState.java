package com.samguk.diplomacy;
import java.util.HashSet;
import java.util.Set;
public final class DiplomacyRelationState {
    private int relation;
    private DiplomacyStatus status = DiplomacyStatus.NEUTRAL;
    private final Set<String> treaties = new HashSet<>();
    public int relation(){ return relation; }
    public void setRelation(int value){ relation=Math.max(-100,Math.min(100,value)); }
    public DiplomacyStatus status(){ return status; }
    public void setStatus(DiplomacyStatus value){ status=value==null?DiplomacyStatus.NEUTRAL:value; }
    public Set<String> treaties(){ return Set.copyOf(treaties); }
    public void addTreaty(String treaty){ if(treaty!=null&&!treaty.isBlank()) treaties.add(treaty); }
}
