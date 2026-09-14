# Java 외교 상태 모델 예시
현재 삼국쟁패는 정적 HTML/Vanilla JS로 바로 실행되므로 실제 런타임은 `DiplomacyTradeSystem.js`가 담당합니다.
이 폴더는 Astra/Java 서버를 붙일 때 사용할 수 있도록 DTO, 세션 상태 저장소, 거래 평가 서비스를 의존성 없는 Java 17 코드로 분리한 예시입니다.
프론트에서 서버 연동 시 기존 `window.SAMGUK_DIPLOMACY_ADAPTER` 패턴을 유지하고 `proposeDeal()` API를 추가하면 됩니다.


## v63 수도 증축
`src/main/java/com/samguk/capital/`의 `CapitalUpgradeService.upgradeCapitalLevel()`이 수도 Level 1~5, 행동력 +1, 모집/수입 ×1.30 복리 규칙을 제공합니다. 상세는 `README_CAPITAL_v63.md`를 참고하세요.
