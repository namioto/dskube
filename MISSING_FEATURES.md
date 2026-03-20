# dskube 미구현 기능 목록

> 비판적 코드 분석 결과 도출. 다음 세션에서 우선순위 순으로 구현.

---

## 우선순위 1 — 핵심 운영 기능

### Pod exec (터미널)
- Pod 내 컨테이너에 shell 접속
- Rust: kube-rs `Api::exec` + pty 스트림
- Frontend: xterm.js 컴포넌트, Tauri IPC event stream 브릿지
- 참고: `kube::api::AttachParams`

### Port Forward
- 로컬 포트 → Pod/Service 포트 터널링
- Rust: kube-rs `Api::portforward` + tokio TCP listener
- Frontend: 포트 포워드 목록 UI, 시작/중지 버튼

### 리소스별 이벤트
- 특정 Pod/Deployment/Service의 k8s 이벤트만 필터링해서 보기
- 현재: 전체 네임스페이스 이벤트만 조회됨
- 구현: `field_selector=involvedObject.name=<name>` 쿼리 추가

---

## 우선순위 2 — 데이터 정확성 / 안전성

### Apply dry-run 미리보기
- 현재 apply가 dry-run 없이 즉시 적용됨
- Rust: `PatchParams::apply("dskube").dry_run()` 먼저 실행 후 diff 보여주기
- Frontend: 변경 내용 diff 모달 → 확인 후 실제 apply

### Real watch for non-Pod resources
- 현재 Pod 이외 13개 리소스는 30초 polling
- 구현: kube-rs `DynamicObject` watcher로 통일
- `resource_type_info()`의 ApiResource 정보 활용해서 generic watcher 구현

### 페이지네이션
- 현재 `ListParams::default()` → 전체 리소스 한번에 조회
- 대규모 클러스터(ConfigMap 수천개)에서 타임아웃/OOM 위험
- 구현: `ListParams::default().limit(100)` + continue token 처리

### RBAC 권한 체크
- 읽기 전용 유저에게도 Delete/Apply 버튼 노출됨
- 구현: `SelfSubjectAccessReview` API로 권한 확인 후 UI에서 버튼 비활성화

---

## 우선순위 3 — 아키텍처 개선

### Panel god component 분리
- `Panel.tsx` 259줄에 list/detail/logs/events 4개 view mode + 10개 상태 혼재
- 각 viewMode를 별도 컴포넌트로 분리 (`ListView`, `DetailView`, `LogsView`, `EventsView`)

### 리소스 타입 매핑 통합
- 동일 매핑이 Rust 3곳 + TS 3곳 = 6군데에 분산
- Rust: `resource_type_info()` 단일 registry로 통합, `kind_to_resource_type()` 제거
- 새 리소스 추가 시 1곳만 수정하도록

### 리스트/로그 가상화
- 현재 모든 row를 DOM에 직접 렌더링
- `react-virtual` 또는 `@tanstack/react-virtual` 적용
- 파드 수백개, 로그 5000줄 시 성능 문제 방지

---

## 우선순위 4 — 편의 기능

### Multi-document YAML apply
- 현재 `---`로 구분된 다중 문서 YAML 붙여넣기 시 에러
- `serde_yaml::Deserializer::from_str` 로 다중 파싱 처리

### CRD / 커스텀 리소스 지원
- 현재 14개 고정 리소스 타입만 지원
- `GET /apis` → API discovery로 동적 리소스 목록 구성

### 리소스 정렬
- 이름/나이/상태 컬럼 클릭 정렬 미지원

### 키보드 단축키
- `j/k` 네비게이션, `/` 검색, `d` delete, `e` edit 등

### kubeconfig 경로 직접 지정
- 현재 `~/.kube/config` 고정
- `KUBECONFIG` env var 또는 파일 picker 지원

### 인증 토큰 자동 갱신
- OIDC/exec 기반 인증에서 토큰 만료 시 자동 재발급
- 현재는 10분 TTL 만료까지 기다려야 함
