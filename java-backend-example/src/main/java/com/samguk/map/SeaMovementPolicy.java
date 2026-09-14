package com.samguk.map;

import java.util.Set;

/**
 * v64 서버 연동 참고 모델.
 * 별도 정박 세션을 만들지 않고, 해상 연결을 통과 가능한 간선으로만 취급한다.
 */
public final class SeaMovementPolicy {
    public record RouteKey(int a, int b) {
        public RouteKey {
            if (a > b) {
                int t = a;
                a = b;
                b = t;
            }
        }
    }

    private final Set<RouteKey> seaPassableRoutes;

    public SeaMovementPolicy(Set<RouteKey> seaPassableRoutes) {
        this.seaPassableRoutes = Set.copyOf(seaPassableRoutes);
    }

    /** 바다 통과 가능 여부만 반환하며 별도 중간 노드 상태는 생성하지 않는다. */
    public boolean isSeaPassable(int fromTerritoryId, int toTerritoryId) {
        return seaPassableRoutes.contains(new RouteKey(fromTerritoryId, toTerritoryId));
    }
}
