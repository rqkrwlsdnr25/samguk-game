# 삼국쟁패 v64 — 해상칸 제거 / 직접 해상 이동 유지

- `SeaTileSystem` 기반의 바다 중간 정박 노드, 닻 마커, 주둔 함대 패널을 제거했습니다.
- `WORLD.seaRoutes`는 삭제하지 않고 **육지 영토 사이의 해상 이동 가능 연결 정보**로 유지합니다.
- 따라서 부대는 해상 연결 영토 사이를 기존 이동/전투 파이프라인으로 직접 통과합니다.
- 특산품의 `함선 보유`, `함선 제작`, `해상 전투 ×2` 상태와 보너스는 제거했습니다.
- 쌀의 `세금·모집 ×1.5`, `턴 종료 주둔병력 1% 보충` 효과 등 다른 특산품 효과는 그대로 유지합니다.
- 일반 해상 전투의 병과/국가별 패널티와 보너스는 이번 제거 대상이 아니므로 유지합니다.

> 아래의 구버전 항목은 변경 이력입니다. 현재 v64 동작은 위 항목을 기준으로 합니다.

# 삼국쟁패 v63 — 수도증축 글로벌 테크트리

일반 `도시증축`과 완전히 분리된 1~5단계 수도 성장 시스템을 추가했습니다.

- 수도 Level 1~2: `capital_lv1.png`
- 수도 Level 3~4: `capital_lv3.png`
- 수도 Level 5 MAX: `capital_lv5.png`
- 승급할 때마다 세력 최대 행동력 +1, 국가 전체 모집량/세금 수입을 이전 단계 대비 ×1.30 복리 적용합니다.
- 수도에서는 일반 농업/상업/군사 `도시증축` 버튼 대신 전용 `수도증축` 버튼과 Level/비용/영구 효과 패널이 표시됩니다.
- 수도 이미지는 3개만 `CapitalUpgradeSystem.js`에서 각 1개의 `Image` 객체로 프리로드하며 레벨에 따라 교체됩니다.
- 실제 SVG+GPU 카메라 지도에서는 레벨별 직사각형 크기를 중심 기준으로 유지하고, 요청 사양의 Canvas API `drawCapitalCity(ctx, x, y, level, currentZoom)`도 제공합니다.
- Astra/Java 서버 연동용 `Capital`, `Faction`, `CapitalUpgradeService.upgradeCapitalLevel()` 예제를 포함합니다.
- 기본 승급 비용은 Lv2 180 / Lv3 320 / Lv4 520 / Lv5 800금이며 `CapitalUpgradeSystem.js` / Java 서비스에서 쉽게 조정할 수 있습니다.
- 상세: `PATCH_NOTES_v63.txt`, 검증: `TEST_RESULTS_v63.txt`.

# 삼국쟁패 v62

인물 중심 외교 패널과 외교 관계 판도 지도를 통합한 버전입니다. 외교창을 열면 좌측 40%에는 군주/협상 UI가, 우측 60%에는 기존 Pan/Zoom 카메라를 그대로 사용하는 외교 전용 지도 viewport가 나타납니다.

# 삼국쟁패 v61 — 고배율 지역 복합 UI 콤팩트 정렬

- Zoom 3.74x 부근에서 지역명 → 성/도시 → 특산품 → 병력 HUD 전체 세트를 영토 중심 위쪽으로 자동 보정합니다.
- 도시가 커지며 아래쪽으로 늘어난 픽셀(`cityExtraY`)을 먼저 상쇄하고, 고배율에서 최대 18px만 추가로 부드럽게 들어 올립니다.
- 3.74x에서 40px 도시 아이콘(최대 2.2배)은 약 66px 상향되어 한성처럼 세로 공간이 좁은 영토에서도 하단 국경 이탈을 크게 줄입니다.
- 간격은 줌 배율을 통째로 곱하지 않고 5→3px, 6→3px, 11→7px처럼 제한적으로만 압축합니다.
- SVG 지역명/도시/특산품과 별도 Canvas 병력 스프라이트가 같은 보정식을 공유하여 서로 어긋나지 않습니다.
- `RegionCompositeUILayout.js`에 요청 사양의 `drawRegionCompositeUI(ctx, region, currentZoom)` Canvas 예제를 포함했습니다.
- 세부 튜닝값은 `MapZoomConfig.js`의 `regionComposite*` 항목에서 조절할 수 있습니다.
- 상세: `PATCH_NOTES_v61.txt`, 검증: `TEST_RESULTS_v61.txt`.

# 삼국쟁패 v57 — 최대 줌 15x + 거대 국가명 실시간 페이드

- 월드맵 최대 확대 배율을 기존 `6.0x`에서 `15.0x`로 확장했습니다.
- 확대 중 `백제`, `신라`, `가야` 등 `#atlas-labels`의 거대 국가명만 1.25x부터 서서히 사라지고 2.40x에서 완전히 투명해집니다.
- 지역명, 수도/성 이미지, 전문도시 이미지, 세력 깃발/병력 HUD는 페이드 대상에서 완전히 분리했습니다.
- 기존 HUD 확대 곡선은 6.0x에서 포화되도록 분리하여 MAX_ZOOM을 15x로 늘려도 UI 크기 감각이 약해지지 않습니다.
- SVG 게임 본체는 전체 지도를 다시 그리지 않고 GPU 카메라 프레임에서 CSS 변수 하나만 갱신합니다. 요청 사양의 Canvas 예제 `drawLargeCountryNames(ctx, countryList, currentZoom)`도 `LargeCountryNameZoomFade.js`에 포함했습니다.
- 상세: `PATCH_NOTES_v57.txt`, 검증: `TEST_RESULTS_v57.txt`.

# 삼국쟁패 v55 — 영토 라벨 히트박스 오버레이 제거

- 지역명/성 이미지/병력 HUD가 올라가는 `#mapUiOverlay`를 순수 표시 레이어로 고정했습니다.
- `territoryLabels()`가 만들던 투명 사각형 `<rect pointer-events="all">` 클릭 히트박스를 완전히 제거했습니다.
- 라벨 SVG 그룹의 `role="button"` / `tabindex="0"`를 제거하여 클릭·포커스 시 브라우저가 Bounding Box를 표시할 여지를 차단했습니다.
- 기존 `.map-marker:hover rect` / focus rect 강조 규칙을 제거했습니다.
- 실제 영토 선택/hover는 기존 `#map .territory-shape` Polygon에서 그대로 동작하므로 한성 지역명, 성 그래픽, `백 36` 병력 HUD 및 영토 클릭 기능은 유지됩니다.
- 상세: `PATCH_NOTES_v55.txt`, 검증: `TEST_RESULTS_v55.txt`.

# 삼국쟁패 v53 — 렌더링 최적화

- 외교창이 닫혀 있을 때 Canvas `requestAnimationFrame`을 완전히 정지합니다.
- 외교 화살표 수도 좌표를 캐시하여 매 프레임 `getBoundingClientRect()`를 호출하지 않습니다.
- 일반 `render()`와 전체 `drawMap()`을 분리하고 영토/병력/선택 상태는 Dirty Update로 반영합니다.
- 외교 SVG `filter`/`backdrop-filter` 합성 부하를 제거하고 opacity/stroke 강조로 대체합니다.
- 줌/진군 카메라 이동에서 전체 SVG geometry를 재생성하지 않습니다.
- 상세: `PATCH_NOTES_v53.txt`, 검증: `TEST_RESULTS_v53.txt`.

# 삼국쟁패 v50 — 고배율 마우스 피벗 줌

- 월드맵 최대 확대를 기존 2.5x에서 6.0x로 확장했습니다.
- 빠른 휠 연속 입력에서도 현재 커서 위치를 targetView 기준으로 재투영해 피벗 드리프트를 막습니다.
- 고배율 드래그는 pointerdown 당시 view의 pixels-per-world-unit로 보정합니다.
- 고배율에서 영토명과 세력 깃발/병력 HUD가 점진적으로 더 크게 표시됩니다.
- SVG 경계/텍스트 geometricPrecision, 래스터 crisp-edges 렌더링 힌트를 추가했습니다.
- 상세: `PATCH_NOTES_v50.txt`.

# 삼국쟁패 v42

삼국지13 스타일의 **세력 깃발 + 병력 수치 결합 HUD**를 월드맵 영토와 진군 부대에 통합한 버전입니다. v41의 왜구/해상칸 시스템과 v40 GPU 카메라 구조를 그대로 유지합니다.

- 좌측 오각형 방패: 세력 고유색 + 세력/군주 심볼 1글자.
- 우측 캡슐: 반투명 흑색 + 현재 병력 숫자.
- 영토와 진군 부대가 `FactionTroopHud.js` 렌더러를 공유합니다.
- `territory-screen-space`와 GPU 카메라의 전역 CSS 스칼라를 이용해 줌 중 개별 마커 재계산을 하지 않습니다.
- 자세한 내용: `PATCH_NOTES_v42.txt`.

# 삼국쟁패 v41

왜구 독립 적대 세력과 해상칸 2턴 이동 시스템 통합 버전입니다. v40의 GPU 월드맵 최적화 구조를 그대로 유지하면서, 기존 대마도를 왜구 본거지로 분리하고 모든 해상 항로를 `육지 → 해상칸 → 육지` 그래프로 전환했습니다.

핵심 파일: `WakoFactionData.js`, `SeaTileSystem.js`, `SeaRoutePathfinder.js`, `WakoEncounterSystem.js`, `WakoNameGenerator.js`. 자세한 내용은 `PATCH_NOTES_v41.txt`를 참고하세요.

- 왜구: 외교 불가/상시 적대, 해상 공격 +50%, 영지 점령 시 50금 약탈, 성장 +30%.
- 대마도: 왜구 수도. 두목 1 + 수비장 3.
- 해상칸: 진입 즉시 동일 턴 재이동 하드락, 다음 턴에만 목적지 이동.
- 해상 Encounter: 18%/턴, 왜구 25~35명 기습.
- A* 확장: 해상 직통 간선을 가상 해상 노드 1개를 거치는 2-edge 경로로 변환.

# 삼국쟁패 최신 버전 전체 소스

버전: v28 (2026-09-12 만리장성 패치)
기준 소스: v27 + 만리장성 랜드마크/증축 시스템 추가

## 이번 패치 핵심
- 지도에 만리장성 랜드마크 추가
- 만리장성 클릭 시 소형 관리 메뉴 오픈
- 기본 방어 효과 +30%
- 증축 1회당 100금 소비, 방어 효과 +3%
- 최대 10회 증축, 최종 방어 효과 +60%
- 북쪽 → 남쪽으로 장성을 넘어 공격할 때만 방어 보너스 적용
- 대규모 전투에도 동일한 방어 보너스 적용
- 장성 남쪽 접경 영토를 하나 이상 보유한 국가만 증축 가능
- 장성 전체가 wallUpgradeCount 하나를 공유

## 실행
1. ZIP 전체를 한 폴더에 압축 해제합니다. 파일들의 상대 위치를 유지하세요.
2. 최신 데스크톱 브라우저에서 index.html을 엽니다.
3. 로컬 웹 서버로 실행하려면 이 폴더에서 `python -m http.server 8000`을 실행하고 http://localhost:8000 에 접속하세요.

Node/npm 설치나 빌드가 필요 없는 정적 게임입니다. CSS와 JavaScript는 별도 파일에 있으며 모두 수정 가능한 원본입니다. 게임 실행에 외부 AI API가 필요하지 않습니다.

## 이번에 수정된 주요 파일
- game.js: 만리장성 상태값, 클릭 메뉴, 증축 처리, 전투 방어 multiplier 적용
- map.js: 만리장성 지도 그래픽 및 클릭 가능한 성벽/성루 표시
- terrain-rules.js: 전투 미리보기 문구에 만리장성 방어 보너스 표시

## 전체 파일 안내
- index.html: 화면 구성 및 스크립트 로딩 순서
- style.css, command-theme.css: 기본 스타일과 지휘 화면 스타일
- game.js: 게임 상태, 턴, 행동, 건설, 모병 및 화면 갱신
- world.js: 현재 영토명·소유 세력·경계·중심 좌표·인접 관계·해상 연결·특산품 데이터
- geography.js, terrain.js: 지도와 지형 표현 데이터
- map.js: 지도 렌더링, 줌, 라벨, 수도, 이동 표시
- terrain-rules-data.js, terrain-rules.js: 지형 판정 데이터와 고정 효과
- unit-rules.js, national-rules.js: 병과 및 국가 특성
- diplomacy.js: 외교, 전쟁, 전쟁 피로도
- resources.js: 특산품 및 궁전 관련 고정 규칙
- capital.png: 모든 수도가 공유하는 기존 성 이미지
- map-original.png: 기존 지도 원본 리소스
- MANIFEST.json: 버전 및 파일별 SHA-256 검증값

## 다른 채팅이나 환경에서 이어서 수정
이 ZIP을 업로드하고 다음처럼 요청하세요.

“이 ZIP에 담긴 삼국쟁패 최신 소스를 기준으로 수정해줘. index.html이 실행 진입점이고 별도 빌드 과정은 없어. 기존 게임 시스템을 유지하고 요청한 파일만 수정해줘.”

현재 ZIP은 세이브 데이터를 포함하지 않으며, 실행 시 국가 선택부터 시작합니다.

## v33 전문도시 월드맵 그래픽
- 전문도시 III 달성 시 농업/상업/군사 전용 일러스트가 영지 중앙에 표시됩니다.
- 영토명/병력/문무관 아이콘은 도시 그래픽보다 위 레이어에 유지됩니다.
- 자세한 내용: PATCH_NOTES_v33.txt

## v34 전문도시 이미지 계층 통합
전문도시 이미지는 더 이상 별도 월드맵 레이어를 사용하지 않습니다. 수도와 동일한 territory label hierarchy에서 `<image>`로 그려지며, 전문도시 I 단계부터 지역명 바로 아래에 표시됩니다. 상세 내용은 PATCH_NOTES_v34.txt를 참고하세요.


## v35 국가별 인물 스타팅 재편
- 초기 영지를 가진 각 국가는 수도에서 군주·대장군·재상 3인으로 시작합니다.
- 인물 데이터의 기본 능력치는 무력·통솔·지력·매력 4종입니다. 기존 내정 계산의 정치값은 지력+매력 평균으로 호환됩니다.
- v35의 비수도 영지당 수비무관 1명 규칙은 v39에서 폐기되었습니다.
- 자세한 내용: PATCH_NOTES_v35.txt

## v37 인사 / 인재 찾기
- 영토 행동에 `인사` 버튼 추가: `인재 목록` / `인재 찾기`.
- `인재소`(90금, 유지비 1금/턴)를 지은 영지에서 50금으로 인재를 탐색할 수 있습니다.
- 확률 합계 오류를 방지하기 위해 단일 추첨 합계는 정확히 100%로 보정했습니다: 인 68.9 / 지 20 / 천 10 / 신 1 / 선인 0.1.
- 신규 인재는 별도 복사 데이터가 아니라 기존 `Officer` 배열과 영지 인덱스에 직접 등록됩니다.
- 선인급 연출 시 `samguk:personnel-sfx` CustomEvent가 발생하므로 추후 실제 음원만 연결하면 됩니다.

## v38 관직 아이콘 줌 스무딩
- 휠 이벤트는 카메라 목표 배율만 변경하고, 실제 viewBox/관직 아이콘 크기는 RAF Update가 추적합니다.
- 문/무관 아이콘은 `smoothingSpeed=10`의 프레임 독립 보간을 사용하며 0.001 deadzone에서 정확히 고정됩니다.
- 기존 줌 아웃 culling(1.05) / 재표시(1.12) / 최대 40px 규칙은 유지합니다.
- drawMap 재생성 시 이전 프레임 transform을 새 아이콘 DOM에 즉시 이식해 1-frame pop-in을 차단합니다.
- 자세한 내용: PATCH_NOTES_v38.txt


## v39 국경 수비장 / 랜덤 이름 개편
- 모든 일반 영지에 수비무관을 자동 배치하던 규칙을 폐기했습니다.
- `WORLD.neighbors`에서 실제 육상으로 타 세력/중립과 맞닿은 영지만 국경으로 판정합니다. `WORLD.seaRoutes`는 국경 판정에서 제외됩니다.
- 국가별 최대 3개 국경 영지에만 수비장을 배치하며, BFS 최단거리 기반으로 서로 멀리 떨어진 최전선을 우선 선택합니다.
- 국경 수비장의 무력/통솔은 각각 70 이하로 유지됩니다.
- 수도 군주·대장군·재상과 국경 수비장 이름은 성씨+이름 조합에서 게임 시작마다 중복 없이 무작위 생성됩니다.
- 자세한 내용: PATCH_NOTES_v39.txt


## v40 GPU 월드맵 카메라 최적화
- 휠/줌 중 `viewBox` 변경과 전국 라벨 `innerHTML` 재생성을 제거했습니다.
- 월드 레이어와 UI 오버레이를 분리하고 둘 다 단일 `matrix3d()` compositor transform으로 이동합니다.
- 관직 아이콘은 `getScreenCTM()` 대신 공유 카메라 snapshot을 사용합니다.
- 고주파 wheel 이벤트는 한 RAF 프레임에 한 번으로 병합됩니다.
- 자세한 내용: `PATCH_NOTES_v40.txt`


## v43 — 월드맵 관직 아이콘 제거
文/武/均 원형 아이콘 시각 시스템과 전용 줌 RAF 루프를 제거했습니다. 장수 데이터와 전투/내정 계산은 유지됩니다.


## v44 — 줌 단계별 병력 HUD 컬링 / GSAP 전환
- 전체 지도 수준(`zoomRatio <= 1.25`)에서는 병력 숫자 캡슐을 GSAP로 우측 페이드아웃한 뒤 `display:none` 처리하고 세력 깃발만 남깁니다.
- `zoomRatio >= 1.45`에서 숫자 HUD를 다시 1회 동기화한 뒤 부드럽게 복귀시킵니다. 두 임계값 사이에는 상태를 유지해 트윈 반복을 방지합니다.
- 병력 캡슐은 `rgba(0,0,0,.55)` 기반 glass 스타일이며 `backdrop-filter: blur(4px)`는 지원 SVG 엔진에서만 progressive enhancement로 동작합니다.
- GSAP 3.15.0 CDN을 사용하며 네트워크가 없는 환경에서는 기능이 깨지지 않도록 RAF/CSS fallback이 동작합니다.
- Compact Mode 중 숨겨진 병력 숫자 `textContent` 갱신을 건너뛰고 확대 복귀 시 1회만 재동기화합니다.
- 자세한 내용: `PATCH_NOTES_v44.txt`


## v45 — 월드맵 좌측 잘림 / 반응형 카메라 경계 수정
- GPU 카메라가 더 이상 가로 폭만으로 배율을 계산하지 않고, 뷰포트의 폭·높이를 모두 사용해 `xMidYMid meet` 방식으로 전체 지도를 맞춥니다.
- 고정 드래그 제한 `-300~1000 / -300~1200`을 제거하고 `WORLD.minX/minY/width/height`에서 동적으로 경계를 계산합니다.
- 전체 지도를 넘어 줌 아웃하면 월드가 자동으로 중앙 고정되어 서쪽/동쪽 한쪽만 사라지는 현상을 막습니다.
- `#mapViewport`는 반응형 `width:100%` / 최대 `100vh` 높이를 사용하고 `.map-panel`의 중복 clipping을 제거했습니다.
- 첫 렌더 및 `동아시아 전도` 버튼에서 `CenterMap()`이 전체 WORLD bounds를 정확히 중앙 정렬합니다.
- 자세한 내용: `PATCH_NOTES_v45.txt`


## v46 — 서쪽 월드맵 배경/깃발 좌표계 완전 동기화
- **근본 원인 수정:** `window.WORLD` 오참조를 실제 공개 객체인 `window.SAMGUK_WORLD`로 교체하여 카메라 `minX=0` fallback을 제거했습니다.
- 카메라 bounds를 `WORLD.minX` 고정값이 아니라 실제 `territory.path + landPath` 좌표에서 다시 계산합니다.
- 현재 geometry 기준 서쪽 끝은 약 `X=-180.5`이며 stroke 안전 여백까지 포함한 카메라 최소 X는 `-181.25`입니다.
- 전체 월드보다 더 줌아웃하는 것을 금지하여 서쪽에 가짜 남색 빈 공간이 생기지 않습니다.
- `#mapViewport` 종횡비를 실제 월드 geometry 비율과 동일하게 고정하고, `#map`/`#mapUiOverlay`가 동일한 viewBox와 GPU matrix를 공유합니다.
- 지형/영토 `image-bounds` clip도 같은 동적 bounds를 사용하므로 깃발만 살아 있고 배경만 잘리는 좌표계 분리를 차단합니다.
- 자세한 내용: `PATCH_NOTES_v46.txt`

## v48 하단 스크롤 복구
- 남쪽 드래그 경계를 줌 배율에 따라 동적으로 확장했습니다.
- 하단 UI에 가려지는 남쪽 영토를 위로 끌어올릴 수 있도록 남쪽 Overscan을 추가했습니다.
- mapViewport 높이를 100dvh 기반으로 제한해 브라우저 화면 아래로 캔버스가 잘리는 문제를 줄였습니다.

## v49 — 화면 공간 최적화
- 하단 mapStatus 안내 바 DOM 삭제
- 하단 설명 footer를 제거하고 세력 범례만 작은 지도 오버레이로 유지
- 지도 컨트롤(+/−/한반도/동아시아 전도/지형 보기)을 브라우저 top:0에 고정
- mapViewport가 현재 브라우저의 남은 세로 공간을 화면 하단까지 자동 사용
- 컨트롤 위 pointer/wheel 이벤트는 지도 카메라로 전파되지 않도록 차단


## v54 — 영토 정중앙 Centroid 라벨/HUD
- `WORLD.territories[].path`에서 Shoelace 공식으로 각 영토의 면적 중심을 1회 계산해 캐시합니다.
- 기존 수동 seed 좌표가 아니라 `region.center`를 지역명과 부대 HUD의 공통 anchor로 사용합니다.
- 국내성 동부·옥저처럼 길쭉한 영토도 실제 polygon 질량 중심에 맞춰 라벨/HUD가 이동합니다.
- gameplay 이동/AI/전투 경로용 seed 좌표는 그대로 유지하여 밸런스와 로직에는 영향을 주지 않습니다.
- Canvas/Astra용 `renderRegionLabels(ctx, region)`과 Java `Region#setVertices` centroid 예제도 함께 포함합니다.
- 자세한 내용: `PATCH_NOTES_v54.txt`

## v56 — 국경선 고정 두께 / 저배율 LOD 최적화
- 국가 경계선은 SVG `vector-effect="non-scaling-stroke"` 기반으로 최종 화면 두께를 약 2px로 고정했습니다.
- 기존 4.2px 이중 외곽선을 2.0px 외곽 + 0.72px 안쪽 선으로 줄여 전체 지도 축소 시 경계가 과도하게 두꺼워 보이던 문제를 완화했습니다.
- 전체 지도/저배율에서는 224개 공유 국경선에 Douglas–Peucker LOD를 적용해 선분 수를 최대 약 87.6% 줄입니다.
- `zoomRatio <= 0.70`에서는 세부 프로빈스 공유선을 생략하고 국가 경계만 유지합니다.
- 줌 애니메이션 중에는 path를 매 프레임 갱신하지 않고 기존 GPU compositor 캐시를 유지하며, sharp viewBox commit 시점에만 LOD를 교체합니다.
- 강줄기 외곽선도 `non-scaling-stroke` + 0.72px 고정 화면 두께를 사용합니다.
- Canvas 호환용 `drawCountryBorders(ctx, regions, currentZoom)` 및 선택적 `CanvasBorderCache` 예제는 `BorderRenderOptimizer.js`에 포함되어 있습니다.
- 자세한 내용: `PATCH_NOTES_v56.txt`

## v58 — 병력 라벨 Sprite Sheet Canvas 렌더링
- 제공된 1536×1024 통이미지를 `assets/images/ui/faction_labels_sheet.png` 한 장으로만 로드합니다.
- 고/유/신/탐/우/읍/북/남/가/왜/부 11개 정적 영토 병력 HUD를 하나의 Canvas에서 9-parameter `drawImage` source slicing으로 렌더링합니다.
- 검은 막대 중앙의 병력 숫자만 Canvas text overlay로 갱신하여 SVG path/rect 배경 재생성을 없앴습니다.
- 지역명·도시/수도 이미지·자원·영토 Polygon hit-test는 기존 SVG를 그대로 유지합니다.
- 제공 시트에 없는 백제·거란·동진은 표시 누락 방지를 위해 기존 경량 SVG HUD fallback을 유지합니다.
- 자세한 내용: `PATCH_NOTES_v58.txt`

## v59 — 도시 아이콘 크기 통일 / 줌 연동
- 수도와 농업·상업·군사 전문도시의 기본 표시 박스를 40px로 통일했습니다.
- 기존 전문도시 1.55배 고정 확대를 제거했습니다.
- 카메라 줌은 개별 SVG width/height 재작성 대신 전역 CSS 변수로 도시 아이콘만 부드럽게 확대/축소합니다.
- 지역명은 고정하고, 자원/병력 HUD는 커진 도시 아이콘의 하단을 따라 상대 오프셋으로 이동합니다.
- v58 Canvas 병력 스프라이트도 동일한 오프셋 보정을 사용합니다.
- Canvas 호환 함수 `drawMapCities(ctx, cityList, currentZoom)`를 `TerritoryCityUIManager.js`에서 제공합니다.



## v68 — 섬 거점 아이콘 50% 축소
- 탐라·우산·대마도 도시/수도 시각 아이콘만 일반 도시 대비 50%로 축소합니다.
- 줌 연동은 유지하며, 자원/병력 HUD 및 고배율 composite Y offset도 작은 아이콘 크기에 맞춰 별도 보정합니다.
- 다른 영토 크기와 수도 판정, 도시 시스템에는 영향을 주지 않습니다.
- Canvas 호환 함수 `drawMapCitiesWithIslandCheck(ctx, cityList, currentZoom)`를 제공합니다.

## v72 기존 장수 객체 역사 인물명 패치
- 요청된 11개 세력의 군주/대장군/재상 33명은 스타팅 Officer 객체가 생성된 직후 `name` 필드만 지정 이름으로 덮어씁니다.
- 기존 Officer ID, 소속, 관직, 능력치, 외교/세력선택 참조는 그대로 유지합니다.
- 매핑과 서버 연동 예시는 `HistoricalNamePatch.js` 및 `java-backend-example/src/main/java/com/samguk/history/HistoricalNamePatch.java`를 참고하세요.

## v73 — 점령/공성 연기 VFX (GC 최적화)
- 영토 점령/공성/대규모 전투 점령 직후 영토 중심에서 잿빛 연기 발생.
- 420 particle / 24 emitter 고정 풀 재사용으로 런타임 파티클 객체 생성/삭제 제거.
- 배치 arc 렌더링, 그라데이션/blur/shadow 미사용, 화면 밖 컬링, 유휴 rAF 완전 정지.
- Pan/Zoom은 GPU 카메라 snapshot과 동기화되어 연기가 영토 중심에서 이탈하지 않음.

## v74 - 왕권 / 권위(Prestige)
- 지방왕(0) → 왕(100) → 대왕(300) → 황제(600)의 4단계 전역 왕권 시스템.
- 전투 승리 +20, 건설 +10, 수도 증축 +50 권위.
- 왕: 모집/수입 x1.30, 대왕: 행동 +2 및 외교 압박, 황제: 추가 행동 +3 및 천하통일 관계 감산.
- 영토 행동 패널 [왕권] 탭과 승격 VFX/북소리 포함.

## v78 내정/모병 UI 개편
- 행동 버튼 기능별 컬러 테두리
- 모집 슬롯 얇은 바 + 설명 레이어 구조
- 특산품 UI를 우측 선택 영토 정보창으로 이동
- 상세: PATCH_NOTES_v78.txt

## v79 아군 인재 카드 목록
- 인사 > ① 인재 목록에서 현재 플레이어 세력의 장수만 4열 카드로 표시합니다.
- 제공된 금빛 비취 프레임은 `hero_frame.png`로 사용합니다.
- Java API 연동 시 `window.SAMGUK_MY_OFFICER_API_URL='/api/me/officers'`를 지정할 수 있습니다.
