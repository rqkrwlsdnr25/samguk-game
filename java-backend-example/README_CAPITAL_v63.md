# v63 Capital Upgrade backend example

`CapitalUpgradeService.upgradeCapitalLevel()` mirrors the live client rules:
- Capital Level 1..5
- each successful upgrade: max action +1
- recruitment limit and tax income multiply by 1.30 from their previous values
- default costs: Lv2 180 / Lv3 320 / Lv4 520 / Lv5 800 gold

The current downloadable game remains a static Vanilla JS runtime. These Java 17 classes are dependency-free server-side reference code for an Astra/Java backend.
