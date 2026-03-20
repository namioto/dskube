# dskube 플랜 점검 보고서
Date: 2026-03-20

---

## 요약

**전체 구현 완성도: 38/50 항목 완료 (76%)**

| 기능 영역 | 완료 | 경고 | 미구현 |
|----------|------|------|--------|
| 클러스터 연결 | 5 | 2 | 1 |
| 멀티패널 레이아웃 | 7 | 2 | 0 |
| 리소스 목록 조회 | 6 | 2 | 0 |
| Pod 로그 스트리밍 | 7 | 1 | 1 |
| 리소스 상세/YAML 편집 | 8 | 1 | 0 |
| 에러 처리 | 3 | 1 | 5 |

---

## 기능별 상태

### 1. 클러스터 연결

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | kubeconfig 기본 경로 파싱 → ContextInfo | ✅ | config.rs:12 Kubeconfig::read() |
| 2 | get_contexts Tauri 명령 | ✅ | config_cmd.rs:3-6 |
| 3 | get_namespaces Tauri 명령 | ✅ | config_cmd.rs:8-25 |
| 4 | TopBar context/namespace 전환 UI | ✅ | TopBar.tsx:44-72 |
| 5 | AppState K8s 클라이언트 캐시 | ✅ | state.rs:8, get_or_create_client |
| 6 | clusterStore 테스트 | ✅ | 8개 케이스 |
| 7 | TopBar 테스트 | ⚠️ | 3개 케이스, onChange 인터랙션 미검증 |
| 8 | namespace 전환 시 패널 동기화 | ❌ | TopBar에서 panelStore 동기화 없음 |

**버그:**
- `get_namespaces`(config_cmd.rs:14)가 `AppState`를 받지 않아 클라이언트 캐시 우회. context 전환마다 새 TLS 핸드셰이크 발생
- TopBar namespace 변경 시 열린 패널들이 이전 namespace 데이터를 유지

---

### 2. 멀티패널 레이아웃

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | 최대 4패널 제한 | ✅ | panelStore.ts:27, PanelContainer.tsx:66 |
| 2 | 패널 추가/제거 버튼 UI | ✅ | PanelContainer.tsx:64-80 |
| 3 | 패널 분리(detach) open_panel_window | ✅ | resource_cmd.rs:88-111 |
| 4 | pending_panel_states 전달 | ✅ | resource_cmd.rs:94-98 |
| 5 | get_panel_init_state 명령 | ✅ | resource_cmd.rs:113-123 |
| 6 | App.tsx detachedPanelId URL 처리 | ✅ | App.tsx:54-59 |
| 7 | splitDirection 전환 UI | ✅ | PanelContainer.tsx:81-103 |
| 8 | panelStore 테스트 | ⚠️ | 3개 케이스, updatePanel/setSplitDirection 미검증 |
| 9 | PanelContainer 테스트 | ⚠️ | 5개 케이스, 버튼 클릭 실동작 미검증 |

**버그/누락:**
- "패널 닫기"가 항상 마지막 패널 제거(선택 불가)
- DetachedWindow에서 get_panel_init_state 실패 시 무한 로딩
- 동일 panel_id 창 중복 열기 방어 로직 없음
- 분리 창 → 메인 reattach 기능 없음

---

### 3. 리소스 목록 조회

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | 지원 리소스 10종 | ✅ | resources.rs:29-40 |
| 2 | list_resources Rust 구현 | ✅ | resources.rs:23-41 |
| 3 | watch_resources (Pods watch, 나머지 폴링) | ✅ | resources.rs:118-143 |
| 4 | useResources 훅 (list+watch+cleanup) | ✅ | useResources.ts |
| 5 | ResourceList 빈 상태 처리 | ✅ | ResourceList.tsx:10-15 |
| 6 | Sidebar 리소스 타입 선택 | ✅ | Sidebar.tsx:3-14 |
| 7 | useResources 테스트 | ✅ | 7개 케이스 |
| 8 | ResourceList 테스트 | ⚠️ | onSelect 클릭 콜백, 하이라이트 CSS 미검증 |
| 9 | Sidebar 테스트 | ✅ | 4개 케이스 |

**버그/누락:**
- `resources.rs:103`: status 필드 항상 `None` — Pod phase, Deployment replicas 등 실제 상태 미추출 → UI에서 Status가 항상 "-"
- Pod watch stream 에러 시 재연결 없이 조용히 종료
- useResources.ts의 refresh 이벤트 수신 후 재조회 경로 미테스트

---

### 4. Pod 로그 스트리밍

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | Rust 로그 스트리밍 (follow, tail_lines=100) | ✅ | logs.rs:17-22 |
| 2 | 컨테이너 선택 파라미터 | ✅ | logs.rs:13, log_cmd.rs:11 |
| 3 | useLogs 훅 (invoke+listen+cleanup) | ✅ | useLogs.ts |
| 4 | 5000라인 버퍼 제한 | ✅ | useLogs.ts:29 |
| 5 | LogViewer filter prop | ✅ | LogViewer.tsx:19-21 |
| 6 | 컨테이너 드롭다운 UI | ⚠️ | containers.length > 1 조건, init containers 미포함 |
| 7 | Pod 미선택 시 안내 메시지 | ✅ | Panel.tsx:160-163 |
| 8 | useLogs 테스트 | ⚠️ | error 상태, container 파라미터, 버퍼제한 미검증 |
| 9 | LogViewer 테스트 | ❌ | filter 동작 테스트 전무 (핵심 기능) |

**버그/누락:**
- filter가 case-sensitive — 대소문자 무시 미지원
- init containers(spec.initContainers) 드롭다운 누락
- LogViewer: filter prop 테스트 없음

---

### 5. 리소스 상세/YAML 편집

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | YAML 뷰어 (js-yaml dump) | ✅ | ResourceDetail.tsx:13 |
| 2 | 편집 가능한 textarea | ✅ | ResourceDetail.tsx:71-76 |
| 3 | Apply → cmd_apply_resource (server-side apply) | ✅ | resource_cmd.rs:186-190 |
| 4 | 저장 성공 피드백 (✓ Applied 2초) | ✅ | ResourceDetail.tsx:25-26 |
| 5 | 저장 실패 에러 표시 | ✅ | ResourceDetail.tsx:27-29 |
| 6 | Close 버튼 | ✅ | ResourceDetail.tsx:58-63 |
| 7 | saving 중 Apply disabled | ✅ | ResourceDetail.tsx:51-57 |
| 8 | cmd_apply_resource Rust 구현 | ✅ | resource_cmd.rs:135-192 |
| 9 | 테스트 커버리지 (5케이스) | ✅ | ResourceDetail.test.tsx |

**개선:**
- saving 중 Close 버튼 disabled 없음 (요청 도중 닫기 가능)
- 성공 피드백 "✓ Applied" 표시 테스트 없음
- serde_yaml → JSON Value → DynamicObject 이중 변환 (최적화 여지)

---

### 6. 에러 처리

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | ErrorBoundary React 에러 캐치 | ✅ | ErrorBoundary.tsx:13 |
| 2 | main.tsx ErrorBoundary + StrictMode | ✅ | main.tsx:8-12 |
| 3 | CSP 설정 (ipc:, http://ipc.localhost) | ✅ | tauri.conf.json:23 |
| 4 | useResources 에러 사용자 표시 | ⚠️ | console.error만, 에러 state 없음 |
| 5 | useLogs 에러 → LogViewer 표시 | ✅ | useLogs.ts:26, Panel.tsx:157 |
| 6 | watch 자동 재연결 (exponential backoff) | ❌ | 미구현 |
| 7 | kubeconfig 없을 때 온보딩 화면 | ❌ | 미구현 |
| 8 | 리소스 권한 없음(403) 처리 | ❌ | 미구현 |
| 9 | 연결 실패 시 패널 에러 + 재연결 버튼 | ❌ | 미구현 |

---

## 누락/버그/개선 항목 (우선순위별)

### 🔴 High — 사용성에 직접 영향

1. **[버그] Pod Status 항상 "-"** — `resources.rs:103` status 필드 None 하드코딩. Pod phase, Deployment readyReplicas 추출 필요
2. **[누락] useResources 에러 state 미반환** — 클러스터 연결 실패/권한 오류가 UI에 노출되지 않음
3. **[누락] kubeconfig 없을 때 온보딩 화면** — 신규 사용자 진입 불가 (contexts=[] 시 패널이 빈 상태로만 보임)
4. **[버그] namespace 전환 시 패널 데이터 미갱신** — TopBar namespace 변경이 기존 패널에 반영 안 됨

### 🟡 Medium — 기능 완성도

5. **[버그] get_namespaces 클라이언트 캐시 우회** — `config_cmd.rs:14`에 AppState 미사용
6. **[누락] watch 재연결 로직** — Pod watch stream 끊김 시 자동 재시도 없음
7. **[누락] 패널 특정 선택 닫기** — "패널 닫기"가 항상 마지막 패널 제거
8. **[누락] LogViewer filter 대소문자 무시** — case-insensitive 필터 미지원
9. **[누락] init containers 드롭다운** — sidecar 패턴 Pod에서 컨테이너 목록 불완전

### 🟢 Low — 테스트/개선

10. **[테스트] LogViewer filter 테스트 없음** — 핵심 기능임에도 테스트 전무
11. **[테스트] ResourceList onSelect 클릭 콜백 미검증**
12. **[테스트] useLogs error 상태, 버퍼제한 미검증**
13. **[테스트] panelStore updatePanel/setSplitDirection 미검증**
14. **[개선] 분리 창 중복 열기 방어** — 동일 panel_id 창 재생성 에러 가능
15. **[개선] saving 중 Close 버튼 disabled**

---

## 테스트 커버리지 현황

| 파일 | 케이스 수 | 커버리지 평가 |
|------|-----------|--------------|
| clusterStore.test.ts | 8 | ✅ 양호 |
| panelStore.test.ts | 3 | ⚠️ updatePanel/setSplitDirection 누락 |
| resourceStore.test.ts | 11 | ✅ 양호 (regression 포함) |
| TopBar.test.tsx | 3 | ⚠️ onChange 인터랙션 없음 |
| Sidebar.test.tsx | 4 | ✅ 양호 |
| Panel.test.tsx | 9 | ✅ regression 케이스 포함 |
| PanelContainer.test.tsx | 6 | ⚠️ 실제 클릭 동작 미검증 |
| ResourceList.test.tsx | 3 | ⚠️ onSelect, CSS 하이라이트 미검증 |
| ResourceDetail.test.tsx | 5 | ✅ 양호 (성공 피드백 제외) |
| LogViewer.test.tsx | 3 | ❌ filter 동작 테스트 전무 |
| useResources.test.ts | 7 | ✅ 양호 (refresh/updateResource 경로 제외) |
| useLogs.test.ts | 8 | ⚠️ error/container/버퍼 미검증 |
| App.test.tsx | 6 | ✅ 양호 |

**총계: 79 tests / 13 files**

---

## 디자인 스펙 대비 미구현 항목

디자인 스펙(`2026-03-18-dskube-design.md`) 기준:

| 스펙 항목 | 구현 여부 |
|-----------|----------|
| kubeconfig 없을 때 온보딩 화면 | ❌ |
| 패널 탭 드래그로 창 분리 | ❌ (버튼 방식으로 대체) |
| 분리 창 reattach | ❌ |
| 드래그 리사이즈 분할 | ❌ |
| 2x2 그리드 레이아웃 | ❌ (자유 분할만) |
| watch 자동 재연결 (exponential backoff) | ❌ |
| 클러스터 연결 실패 재연결 버튼 | ❌ |
| 리소스 권한 없음 비활성화 | ❌ |
| 커스텀 kubeconfig 경로 입력 | ❌ |
| 리소스별 최적화된 컬럼 | ⚠️ (Name/NS/Status/Age 고정) |
