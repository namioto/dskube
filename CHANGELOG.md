# Changelog

## v0.2.0 — 2026-03-20

### 새 기능
- **Pod Exec** — xterm.js 기반 인터랙티브 터미널. Pod 선택 후 터미널 탭으로 바로 접속
- **Port Forward** — 로컬 포트 → Pod 포트 터널링. ResourceDetail에서 Port Forward 버튼으로 실행
- **CRD 지원** — 클러스터에 설치된 Custom Resource Definition 목록 조회 및 커스텀 리소스 관리
- **리소스별 이벤트 필터링** — detail 뷰에서 이벤트 버튼 클릭 시 해당 리소스 이벤트만 표시
- **RBAC 권한 체크** — SelfSubjectAccessReview 기반. 권한 없는 사용자는 Apply/Delete 버튼 비활성화
- **페이지네이션** — 대규모 클러스터에서 100개씩 로드. "더 불러오기" 버튼으로 추가 조회
- **DMG 배경 이미지** — 설치 화면 커스텀 배경 (1320×800 레티나)

### 버그 수정
- `cmd_apply_resource` / `cmd_delete_resource` — cluster-scoped 리소스에 잘못된 API 경로 사용하던 문제 수정
- watch task 에러(`let _ =`)가 프론트엔드에 전달되지 않던 문제 수정
- Pod 외 13개 리소스가 30초 폴링으로 동작하던 문제 수정 → kube-rs DynamicObject watch로 전환
- namespace 전환 시 기존 열린 패널 데이터가 갱신되지 않던 문제 수정
- watch 스트림 끊김 시 재연결 없이 종료되던 문제 수정 → exponential backoff 재시도

### 개선
- Apply 전 확인 다이얼로그 추가 (실수 방지)
- `Panel.tsx` 338줄 → 198줄로 분리 (`ListView`, `LogsView` 컴포넌트 추출)
- 리소스 타입 매핑 6곳 분산 → `resource_api_info_by_kind` 단일화
- `useRbac` 캐시 5분 TTL 추가 (권한 변경 최대 5분 이내 반영)
- Tauri capabilities `core:default` → 필요한 권한만 명시적으로 설정
- `Terminal.tsx` `@ts-ignore` 제거, xterm 타입 명시
- Secret `data`/`stringData` 필드 자동 제거 (민감정보 보호)
- 패널 닫기 시 백엔드 watch/log 태스크 정리 (리소스 누수 수정)
- 테스트 79개 → 167개

---

## v0.1.0 — 2026-03-18

### 첫 릴리즈
- kubeconfig 자동 감지 및 컨텍스트/네임스페이스 전환
- 14종 Kubernetes 리소스 목록 조회 (Pod, Deployment, Service, ConfigMap, Secret, StatefulSet, DaemonSet, Ingress, Namespace, Node, Job, CronJob, PV, PVC)
- Pod watch 실시간 업데이트
- Pod 로그 스트리밍 (multi-container 지원)
- YAML 뷰어 및 편집 (server-side apply)
- 멀티패널 레이아웃 (최대 4패널, 수평/수직 분할)
- 패널 별도 창 분리
- 이벤트 뷰어
- 온보딩 화면 (kubeconfig 없을 때)
