package com.samguk.diplomacy;
public record DealItem(DealItemType type, int amount, Integer territoryId) {
    public DealItem {
        if (amount < 0) throw new IllegalArgumentException("amount must be >= 0");
    }
}
