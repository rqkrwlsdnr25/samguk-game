package com.samguk.map;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * v65: SeaNode 없이 해안 영토끼리 직접 연결하는 서버측 그래프 설정 예시.
 * 실제 프로젝트의 Territory ID와 동일하게 맞춘다.
 */
public final class DirectSeaAdjacencyConfig {
    public static final int HANSEONG = 8;
    public static final int WOONGJIN_WEST = 9;
    public static final int SANDUNG = 40;
    public static final int TANGJEONG = 66;

    private DirectSeaAdjacencyConfig() {}

    /**
     * 산둥반도 ↔ 한성 / 웅진 서부 / 탕정성을 양방향 인접 간선으로 등록한다.
     * 중간 해상 노드나 정박 세션은 생성하지 않는다.
     */
    public static void apply(Map<Integer, Set<Integer>> adjacency) {
        addBidirectional(adjacency, SANDUNG, HANSEONG);
        addBidirectional(adjacency, SANDUNG, WOONGJIN_WEST);
        addBidirectional(adjacency, SANDUNG, TANGJEONG);
    }

    public static Set<SeaMovementPolicy.RouteKey> directSeaRoutes() {
        return Set.of(
            new SeaMovementPolicy.RouteKey(SANDUNG, HANSEONG),
            new SeaMovementPolicy.RouteKey(SANDUNG, WOONGJIN_WEST),
            new SeaMovementPolicy.RouteKey(SANDUNG, TANGJEONG)
        );
    }

    private static void addBidirectional(Map<Integer, Set<Integer>> adjacency, int a, int b) {
        adjacency.computeIfAbsent(a, ignored -> new HashSet<>()).add(b);
        adjacency.computeIfAbsent(b, ignored -> new HashSet<>()).add(a);
    }
}
