package com.samguk.diplomacy;
public final class DiplomacyService {
    private final DiplomacySessionStore store;
    public DiplomacyService(DiplomacySessionStore store){ this.store=store; }
    public DiplomacyDealResult evaluate(DiplomacyDealRequest deal, int proposerPower, int targetPower){
        var relation=store.relation(deal.fromFaction(),deal.toFaction());
        int score=value(deal.give())-value(deal.request())+(int)Math.round(relation.relation()*0.28)+(proposerPower-targetPower)/20;
        boolean accepted=score>=-8;
        if(accepted) relation.setRelation(relation.relation()+Math.max(3,score/5));
        else relation.setRelation(relation.relation()-4);
        return new DiplomacyDealResult(accepted,score,accepted?"accepted":"rejected");
    }
    private int value(java.util.List<DealItem> items){
        int total=0;for(var i:items)total+=switch(i.type()){
            case GOLD -> i.amount(); case FOOD -> (int)Math.round(i.amount()*1.2); case TROOPS -> (int)Math.round(i.amount()*2.4);
            case TRIBUTE -> 34; case NON_AGGRESSION -> 24; case TRADE -> 18; case ALLIANCE -> 46; case TERRITORY -> 85; case VASSAL -> 120;
        };return total;
    }
}
