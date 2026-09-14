# v64 Sea Node cleanup

현재 배포본의 실제 게임 상태는 Vanilla JS 클라이언트가 관리합니다. 기존 Java 예제 폴더에는 `SeaNode`, `stayAtSea()`, `lockSeaMovement()` 구현이 존재하지 않아 삭제할 서버 클래스는 없었습니다.

서버 상태를 별도 구현할 경우 `SeaMovementPolicy`처럼 `seaRoutes`를 **통과 가능 간선**으로만 저장하고, 바다 중간 노드/정박 상태/함선 보유 플래그는 영속화하지 않는 구조를 사용하면 됩니다.
