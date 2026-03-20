# dskube UI/UX 분석 보고서
Date: 2026-03-20

---

## 전체 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│ TopBar: dskube  | cluster [select▼] | namespace [select▼]           │
│ (bg-gray-900, border-b border-gray-700)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──── Panel 1 ────────────────────┬──── Panel 2 ────────────────┐  │
│  │ [ctx▼][ns▼]   list|detail|logs⬡ │ [ctx▼][ns▼] list|detail|logs│  │
│  │ (bg-gray-800 toolbar)           │                             │  │
│  ├────────┬───────────────────────┤ ├───────┬────────────────────┤  │
│  │Sidebar │  ResourceList         │ │Side   │  ResourceList /    │  │
│  │ Pods   │  ┌Name──NS──Status─Age│ │bar    │  ResourceDetail /  │  │
│  │ Deploy │  │ pod-1  default  ●  │ │       │  LogViewer         │  │
│  │ Svc    │  │ pod-2  kube     ●  │ │       │                    │  │
│  │ CFMap  │  │ pod-3  default  ○  │ │       │                    │  │
│  │ Secret │  └───────────────────┘ │ │       │                    │  │
│  │ STS    │                        │ │       │                    │  │
│  │ DSet   │                        │ │       │                    │  │
│  │ Ingress│                        │ │       │                    │  │
│  │ NS     │                        │ │       │                    │  │
│  │ Nodes  │                        │ │       │                    │  │
│  └────────┴───────────────────────┘ └───────┴────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Bottom: [+ 패널 추가] [패널 닫기] [⟺ 좌우] [⟟ 상하]   2/4 panels  │
│ (bg-gray-800, border-t border-gray-700)                             │
└─────────────────────────────────────────────────────────────────────┘
```

**패널 없는 초기 상태:**
```
┌─────────────────────────────────────────────────────┐
│ TopBar                                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│                    ⎈                                │
│          패널을 추가하여 클러스터를 관리하세요          │
│              [ + 첫 패널 추가 ]                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│ [+ 패널 추가] [패널 닫기] [⟺][⟟]        0/4 panels │
└─────────────────────────────────────────────────────┘
```

---

## 컴포넌트별 UI 설계

### TopBar (`TopBar.tsx`)

**외관**
- 전체 너비, 높이 약 36px (`px-4 py-2`)
- 배경: `bg-gray-900` / 하단 구분선: `border-b border-gray-700`
- 앱 로고 텍스트 "dskube": `text-blue-400 font-bold tracking-wide`

**요소 구성 (왼쪽 → 오른쪽)**
1. 브랜드명 "dskube" — 파란색 굵은 텍스트
2. "cluster" 라벨 (`text-gray-500 text-xs`) + context 셀렉트박스
3. "namespace" 라벨 (`text-gray-500 text-xs`) + namespace 셀렉트박스

**셀렉트박스 스타일**
- 배경: `bg-gray-800`, 테두리: `border border-gray-600 rounded`
- 포커스 시: `focus:border-blue-500`
- 텍스트: `text-sm`

**인터랙션**
- context 변경 → 해당 context의 namespace 목록 자동 갱신 (useEffect 연동)
- context 없을 시 "No clusters" 플레이스홀더 표시
- 전체 영역 `select-none` (텍스트 드래그 방지)

**상태**
- 초기: `invoke("get_contexts")` 호출 → contexts 로드, 첫 번째 context 자동 선택
- context 변경 시: `invoke("get_namespaces")` 재호출 → namespaces 로드, 첫 번째 namespace 자동 선택

---

### PanelContainer (`PanelContainer.tsx`)

**외관**
- 전체 남은 높이를 차지하는 flex column 컨테이너
- 패널 영역: `splitDirection`에 따라 `flex-row`(좌우) 또는 `flex-col`(상하) 전환
- 패널 간 구분선: `border-r border-gray-700`(좌우) 또는 `border-b border-gray-700`(상하)

**하단 툴바**
- 배경: `bg-gray-800`, 상단 구분선: `border-t border-gray-700`
- 높이: `py-1.5` (약 28px)
- 버튼 배치: `[+ 패널 추가]` / `[패널 닫기]` / `[⟺]` / `[⟟]` / `{n}/4 panels` (우측 정렬)

**버튼 스타일**
- "+ 패널 추가": `bg-blue-600 hover:bg-blue-500 text-white rounded px-2 py-1 text-xs`
- "패널 닫기": `bg-gray-700 hover:bg-gray-600 text-gray-300 rounded px-2 py-1 text-xs`
- 분할 방향 버튼: 활성 `bg-gray-600 text-white`, 비활성 `text-gray-400 hover:text-white`
- 비활성화(4패널 초과 또는 0패널): `disabled:opacity-40`

**빈 상태 (panels.length === 0)**
- 중앙 정렬, Kubernetes 헬름 아이콘 `⎈` (`text-4xl`)
- 안내 문구: `text-gray-500 text-sm`
- "+ 첫 패널 추가" 버튼: `bg-blue-600 rounded px-4 py-2 text-white text-sm`

---

### Panel (`Panel.tsx`)

**패널 툴바 (상단)**
- 배경: `bg-gray-800`, 높이: `px-3 py-1`
- 좌측: context 셀렉트 (`max-w-[120px] truncate`) + namespace 셀렉트
  - 배경: `bg-gray-700 border border-gray-600 rounded`, 텍스트: `text-xs`
- 우측: viewMode 탭 버튼 3개 + 분리(⬡) 버튼
  - 활성 탭: `bg-blue-600 text-white`
  - 비활성 탭: `text-gray-400 hover:text-white`
  - 분리 버튼: `text-gray-500 hover:text-white`, tooltip "새 창으로 분리"

**viewMode별 콘텐츠 영역**
- `list` 모드: Sidebar + ResourceList 나란히 배치
- `detail` 모드: Sidebar + ResourceDetail (또는 "리소스를 선택하세요" 안내)
- `logs` 모드: Sidebar 숨김, 로그 서브툴바 + LogViewer

**로그 모드 서브툴바**
- Pod 이름 표시 (`text-xs text-gray-400`)
- 멀티 컨테이너 Pod의 경우 컨테이너 셀렉트 (`bg-gray-700 text-xs`)
- 우측: 필터 입력창 (`w-40 bg-gray-700 focus:border-blue-500 text-xs`)

---

### Sidebar (`Sidebar.tsx`)

**외관**
- 너비: `w-40` (160px), 배경: `bg-gray-900`, 우측 구분선: `border-r border-gray-700`
- 상하 패딩: `py-1`

**메뉴 항목 (10개)**
Pods / Deployments / Services / ConfigMaps / Secrets / StatefulSets / DaemonSets / Ingress / Namespaces / Nodes

**버튼 스타일**
- 기본: `px-3 py-1.5 text-xs text-gray-400 text-left hover:bg-gray-700`
- 선택됨: `bg-gray-700 text-blue-400 font-medium`
- 전환 애니메이션: `transition-colors`

---

### ResourceList (`ResourceList.tsx`)

**외관**
- 전체 너비 테이블 (`w-full border-collapse`)
- 헤더: `bg-gray-800 sticky top-0` — `text-xs text-gray-400 uppercase`
- 컬럼: Name / Namespace / Status / Age

**행 스타일**
- 기본: `border-b border-gray-800 cursor-pointer hover:bg-gray-700 text-sm text-gray-300`
- 선택됨: `bg-gray-700`
- 셀 패딩: `px-4 py-1.5`
- Name: `font-medium text-white`
- Namespace/Age: `text-gray-400`

**Status 배지 (색상 코딩)**
| 상태 | 배경 | 텍스트 |
|------|------|--------|
| Running | `bg-green-900` | `text-green-400` |
| Pending | `bg-yellow-900` | `text-yellow-400` |
| Failed | `bg-red-900` | `text-red-400` |
| 기타 | `bg-gray-800` | `text-gray-400` |

**빈 상태**: "No resources found" — `text-gray-500 text-sm` 중앙 정렬

---

### ResourceDetail (`ResourceDetail.tsx`)

**외관**
- flex column 전체 높이
- 상단 헤더 바: `bg-gray-800 border-b border-gray-700 px-4 py-2`
  - 좌측: 리소스명 (`font-medium text-sm`) + namespace 배지 (`bg-gray-700 text-xs rounded px-1.5 py-0.5`)
  - 우측: "✓ Applied" 상태 텍스트 + Apply 버튼 + Close 버튼

**버튼**
- Apply: `bg-blue-600 hover:bg-blue-500 rounded px-3 py-1 text-xs`
- Close: `bg-gray-700 hover:bg-gray-600 rounded px-3 py-1 text-xs`
- 저장 중: `disabled:opacity-40`, 텍스트 "Applying..."

**YAML 에디터**
- `<textarea>` 전체 영역 차지
- 배경: `bg-gray-950` (가장 어두운 배경), 텍스트: `text-green-300 font-mono text-xs`
- `resize-none outline-none spellCheck={false}`

**에러 표시**: `text-red-400 text-xs bg-red-900/20 border-b border-red-800 px-4 py-2`

**성공 표시**: "✓ Applied" — `text-green-400 text-xs`, 2초 후 자동 숨김

---

### LogViewer (`LogViewer.tsx`)

**외관**
- flex column 전체 높이

**상단 메타 바**
- `bg-gray-900 border-b border-gray-700 px-2 py-1 text-xs text-gray-400`
- 좌측: `{n} lines` 카운트
- 우측: Auto-scroll 체크박스 (`accent-blue-500`)

**로그 영역**
- 배경: `bg-black` (순수 검정), 텍스트: `text-green-400 font-mono text-xs`
- 패딩: `p-2`, 각 줄: `whitespace-pre-wrap leading-5`
- Auto-scroll: 새 라인 추가 시 자동으로 맨 아래로 스크롤

**에러 상태**: `text-red-400 text-sm p-4`

---

## 디자인 일관성

### 색상 팔레트

| 용도 | 클래스 | 설명 |
|------|--------|------|
| 앱 최상위 배경 | `bg-gray-900` | 주 배경, 가장 많이 사용 |
| 서브 배경 (툴바, 헤더) | `bg-gray-800` | 한 단계 밝은 배경 |
| 인터랙티브 요소 배경 | `bg-gray-700` | 셀렉트, hover 상태 |
| YAML 에디터 배경 | `bg-gray-950` | 가장 어두운 배경 |
| 로그 에디터 배경 | `bg-black` | 터미널 느낌 강조 |
| 구분선 | `border-gray-700` | 일관된 구분선 색상 |
| 주요 액션 (강조) | `bg-blue-600 / hover:bg-blue-500` | 패널 추가, Apply 버튼 |
| 보조 액션 | `bg-gray-700 / hover:bg-gray-600` | 닫기, 기타 버튼 |
| 텍스트: 브랜드 | `text-blue-400` | 앱 이름, 선택된 사이드바 항목 |
| 텍스트: 주요 | `text-white` | 리소스 이름, 활성 탭 |
| 텍스트: 보조 | `text-gray-300 / text-gray-400` | 일반 텍스트 |
| 텍스트: 비활성 | `text-gray-500` | 라벨, 비활성 요소 |
| 텍스트: YAML | `text-green-300` | 에디터 전용 |
| 텍스트: 로그 | `text-green-400` | 터미널 로그 전용 |
| 상태: 성공/Running | `bg-green-900 text-green-400` | |
| 상태: 경고/Pending | `bg-yellow-900 text-yellow-400` | |
| 상태: 오류/Failed | `bg-red-900 text-red-400` | |

### 타이포그래피

| 레벨 | 클래스 | 사용 위치 |
|------|--------|---------|
| 브랜드 | `text-sm font-bold` | TopBar 앱명 |
| 본문 | `text-sm` | 리소스 목록, 버튼 |
| 소형 | `text-xs` | 라벨, 툴바, 사이드바, YAML, 로그 |
| 헤더 | `text-xs uppercase font-medium` | 테이블 헤더 |
| 이름 강조 | `font-medium text-white` | 리소스명 |
| 모노스페이스 | `font-mono text-xs` | YAML, 로그 |

### 간격 패턴

| 패턴 | 사용 위치 |
|------|---------|
| `px-4 py-2` | TopBar, ResourceDetail 헤더 |
| `px-3 py-1` / `px-3 py-1.5` | Panel 툴바, Sidebar 항목 |
| `px-2 py-1` | 하단 툴바 버튼, LogViewer 메타 바 |
| `px-4 py-1.5` | ResourceList 셀 |
| `px-1.5 py-0.5` | 상태 배지, namespace 배지 |
| `px-1 py-0.5` | Panel 내 셀렉트, viewMode 탭 |

### 버튼/인풋 스타일 패턴

- **모든 버튼**: `rounded transition-colors` 기본
- **주요 버튼**: `bg-blue-600 hover:bg-blue-500 text-white`
- **보조 버튼**: `bg-gray-700 hover:bg-gray-600 text-gray-300`
- **고스트 버튼**: `text-gray-400 hover:text-white` (배경 없음)
- **비활성 버튼**: `disabled:opacity-40`
- **셀렉트/인풋**: `bg-gray-700 border border-gray-600 rounded focus:border-blue-500 outline-none`

---

## UX 흐름 시나리오

### 시나리오 1: 첫 실행 — 클러스터 연결 및 Pod 목록 확인

1. 앱 실행 → TopBar에서 `get_contexts` 자동 호출
2. kubeconfig의 context 목록이 "cluster" 셀렉트에 로드됨, 첫 번째 자동 선택
3. context 선택 → `get_namespaces` 자동 호출, 첫 번째 namespace 자동 선택
4. `currentContext` 설정됨 → `panels.length === 0`이므로 `addPanel(currentContext)` 자동 실행
5. 패널 생성됨 → Sidebar에서 기본 리소스 타입(Pods) 표시
6. 패널 내 `useResources` 훅이 watch 시작 → Pod 목록 실시간 표시

### 시나리오 2: 멀티패널 — Pod 로그와 ConfigMap 동시 확인

1. 하단 "+ 패널 추가" 클릭 → 두 번째 패널 생성 (좌우 분할)
2. 패널 1: Sidebar에서 "Pods" 선택 → Pod 목록 표시 → Pod 행 클릭 → `selectedResource` 설정
3. 패널 1: 우상단 "logs" 탭 클릭 → LogViewer 모드 전환, Sidebar 숨겨짐
4. 패널 2: Sidebar에서 "ConfigMaps" 선택 → ConfigMap 목록 표시
5. 두 패널이 독립적으로 각자의 리소스를 실시간 표시

### 시나리오 3: YAML 편집 및 Apply

1. ResourceList에서 리소스 행 클릭 → `selectedResource` 설정
2. 패널 toolbar의 "detail" 탭 클릭 → ResourceDetail 표시
3. YAML 에디터(`bg-gray-950 text-green-300`)에서 직접 수정
4. "Apply" 버튼 클릭 → `saving = true`, 버튼 텍스트 "Applying..."
5. 성공: "✓ Applied" 녹색 텍스트 2초 표시 후 숨김
6. 실패: 에러 메시지 `bg-red-900/20` 배너로 상단에 표시

### 시나리오 4: 패널 창 분리 (Detach)

1. 패널 toolbar 우측의 ⬡ 버튼 클릭
2. `invoke("open_panel_window", { panelId, panelState })` 호출
3. 새 OS 창 생성 → URL에 `?panel={panelId}` 파라미터 포함
4. 새 창은 `DetachedWindow` 컴포넌트 렌더링 → 단일 패널만 표시 (TopBar 없음)
5. 분리된 창이 독립적으로 동작

### 시나리오 5: 멀티 컨테이너 Pod 로그 확인

1. Sidebar에서 "Pods" 선택 → Pod 목록 표시
2. 멀티 컨테이너 Pod 클릭 → `selectedResource` 설정
3. "logs" 탭 클릭 → 로그 모드 전환
4. `spec.containers`가 2개 이상인 경우 컨테이너 셀렉트 자동 표시
5. 컨테이너 선택 → 해당 컨테이너 로그만 스트리밍
6. 필터 입력 → `lines.filter(l => l.includes(filter))` 실시간 필터링
7. Auto-scroll 체크박스로 자동 스크롤 ON/OFF 제어

---

## 현재 UX 문제점

### 1. 패널 닫기가 항상 마지막 패널을 제거함

**문제**: `PanelContainer.tsx:73` — "패널 닫기" 버튼이 `panels[panels.length - 1]`을 무조건 삭제한다. 사용자가 특정 패널을 선택적으로 닫을 방법이 없다.

**개선 제안**: 각 패널 toolbar에 개별 닫기 버튼(×) 추가. 현재 ⬡ 분리 버튼이 있는 자리 옆에 배치.

---

### 2. TopBar의 context/namespace 변경이 기존 패널에 전파되지 않음

**문제**: `TopBar.tsx:46` — TopBar에서 context를 변경해도 이미 생성된 패널들의 context는 변경되지 않는다. `App.tsx:40` — `panels.length === 0`일 때만 `addPanel(currentContext)` 호출. TopBar 변경과 Panel 상태가 분리되어 있어 사용자 혼란 유발.

**개선 제안**: TopBar는 글로벌 기본값 역할임을 명확히 표시("새 패널 기본값")하거나, 변경 시 기존 패널 동기화 여부를 묻는 확인 다이얼로그 추가.

---

### 3. viewMode "detail" 전환 시 리소스 미선택 상태 처리 미흡

**문제**: `Panel.tsx:121-124` — "detail" 탭을 먼저 누르면 "리소스를 선택하세요" 안내만 표시. 사용자가 리스트에서 클릭하면 viewMode가 자동으로 "detail"로 전환되지 않아서 수동으로 탭을 눌러야 한다.

**개선 제안**: `Panel.tsx:109` — ResourceList의 `onSelect` 핸들러에서 리소스 선택 시 `viewMode`를 자동으로 "detail"로 전환.

---

### 4. 로그 모드에서 리소스 미선택 안내 문구가 부정확함

**문제**: `Panel.tsx:159-162` — "로그를 볼 Pod를 리스트에서 선택 후 logs 모드로 전환하세요"라는 안내인데, logs 모드에서는 Sidebar가 숨겨져(`Panel.tsx:98`) 리스트에 접근할 방법이 없다.

**개선 제안**: "list 탭에서 Pod를 선택한 후 logs 탭으로 전환하세요"로 안내 문구 수정. 또는 logs 모드에서도 Sidebar를 표시하여 리소스 선택 가능하게 변경.

---

### 5. ResourceList 선택 상태와 패널 viewMode 간 비직관적 연동

**문제**: `Panel.tsx:106-113` — list 모드에서 리소스를 클릭하면 `selectedResource`는 설정되지만 화면은 list 모드 그대로다. 사용자는 detail 탭을 별도로 눌러야 상세 내용을 볼 수 있다. 두 단계 클릭이 요구된다.

**개선 제안**: 행 클릭 시 viewMode를 "detail"로 자동 전환하거나, list 뷰 우측에 detail 패널을 슬라이드인 형태로 표시하는 master-detail 레이아웃 도입.

---

### 6. 패널 context/namespace 셀렉트와 TopBar 셀렉트의 중복

**문제**: `Panel.tsx:46-71` — 각 패널 toolbar에 이미 context/namespace 셀렉트가 있는데, TopBar에도 동일한 셀렉트가 있다. 패널이 독립적인 context를 가질 수 있으므로 TopBar의 namespace 셀렉트는 역할이 모호해진다.

**개선 제안**: TopBar의 namespace 셀렉트를 "새 패널 기본 namespace" 역할로 라벨을 명확화하거나, 단일 패널 환경에서만 TopBar로 제어하고 다중 패널 환경에서는 패널별 제어로 전환.

---

### 7. 분리 창(DetachedWindow)에 TopBar가 없음

**문제**: `App.tsx:23-31` — 분리된 창은 Panel 컴포넌트만 렌더링하므로 TopBar가 없다. 분리 창 내 패널 toolbar에서 context/namespace 변경은 가능하지만, 전체 화면을 차지하는 단일 패널에서 context 정보가 툴바 드롭다운에만 작게 표시된다.

**개선 제안**: 분리 창에도 최소한의 상태 표시 바(context명, namespace명, 앱명) 추가. 또는 패널 toolbar를 분리 창에서 더 크게 표시.

---

### 8. 패널 분할 방향 전환 시 레이아웃 점프

**문제**: `PanelContainer.tsx:27-29` — `splitDirection` 변경 시 `flex-row`↔`flex-col` 전환이 즉시 일어나며 패딩/애니메이션 없이 레이아웃이 갑자기 바뀐다.

**개선 제안**: CSS transition 추가 또는 전환 전 확인 다이얼로그 제공.

---

## 미구현 UX 요소

디자인 스펙(`2026-03-18-dskube-design.md`)과 현재 구현을 비교한 누락 항목:

### 핵심 미구현 항목

| 스펙 항목 | 스펙 위치 | 현재 상태 |
|-----------|----------|---------|
| **드래그로 패널 크기 조절** | `멀티패널 레이아웃 - 드래그로 크기 조절` | 미구현. 현재 모든 패널이 `flex-1`로 균등 분할만 됨 |
| **패널 탭 드래그 → 창 분리** | `패널 탭을 드래그 → 별도 OS 창으로 분리 (VSCode 스타일)` | 미구현. 현재 ⬡ 버튼 클릭으로 분리하나 드래그 방식 아님 |
| **분리 창 reattach** | `분리된 창을 다시 메인으로 reattach` | 미구현. 분리 창 닫기 시 메인 패널 복원 로직 없음 |
| **2x2 그리드 분할** | `최대 4패널 (2x2 그리드 또는 자유 분할)` | 미구현. 현재 1D(좌우 또는 상하)만 지원 |
| **클러스터 연결 실패 재연결 버튼** | `Error Handling - 클러스터 연결 실패: 패널에 오류 표시 + 재연결 버튼` | 미구현. 에러 처리 로직 자체가 없음 (`console.error`만) |
| **리소스 권한 없음 처리** | `Error Handling - 리소스 권한 없음: 해당 리소스 타입 비활성화 + 안내 메시지` | 미구현. 권한 오류 별도 처리 없음 |
| **watch 자동 재연결** | `Error Handling - 네트워크 끊김: watch 자동 재연결 (exponential backoff)` | 미구현. 연결 끊김 감지 및 재연결 UI 없음 |
| **kubeconfig 없음 온보딩** | `Error Handling - kubeconfig 없음: 온보딩 화면으로 안내` | 미구현. context가 없을 때 "No clusters" 셀렉트만 표시 |
| **커스텀 kubeconfig 경로** | `~/.kube/config 기본 경로 + 커스텀 경로 지원` | 미구현. 커스텀 경로 입력 UI 없음 |
| **리소스별 최적화 컬럼** | `컬럼: Name, Status, Age, Namespace 등 리소스별 적합한 정보` | 미구현. 모든 리소스가 동일한 4컬럼(Name/Namespace/Status/Age) 사용 |

### 부분 구현 항목

| 스펙 항목 | 현재 상태 | 부족한 부분 |
|-----------|---------|-----------|
| **실시간 watch** | 기반 구조 있음 (`useResources` 훅) | 연결 상태 표시 UI 없음, 재연결 UI 없음 |
| **YAML 편집** | 기본 에디터 구현됨 | 읽기 전용/편집 모드 전환 없음, 신택스 하이라이팅 없음 |
| **로그 필터링** | 키워드 필터 구현됨 | 정규식 미지원, 필터 히스토리 없음, 하이라이팅 없음 |
| **멀티 패널** | 최대 4패널 구현됨 | 드래그 크기 조절 없음, 2x2 그리드 없음 |
