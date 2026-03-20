# dskube 릴리즈 체크리스트

## 사전 확인

- [ ] `npx tsc --noEmit` — 에러 0
- [ ] `npm test` — 전체 테스트 통과
- [ ] `cargo check` (src-tauri 디렉토리) — 에러/경고 0
- [ ] 주요 기능 로컬 `tauri dev`로 smoke test

---

## 버전 번프 (3곳 동기화 필수)

세 파일 모두 같은 버전으로 맞춰야 한다. 어느 하나라도 다르면 빌드 결과물 버전이 틀어진다.

| 파일 | 필드 |
|------|------|
| `package.json` | `"version"` |
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `version` (package 섹션) |

> GitHub Actions에서 git 태그(`v0.1.0`)로 자동 동기화하지만, 로컬 빌드 시엔 수동으로 맞춰야 한다.

---

## 릴리즈 노트 작성

파일: `CHANGELOG.md` (없으면 새로 생성)

```markdown
## v0.x.x — YYYY-MM-DD

### 새 기능
- ...

### 버그 수정
- ...

### 변경사항
- ...
```

---

## 랜딩 페이지 업데이트

파일: `landing/public/index.html`

- [ ] 버전 표기 업데이트 (페이지 내 버전 문자열)
- [ ] 새 기능 항목 추가/수정
- [ ] 스크린샷 또는 데모 이미지 필요 시 교체
- [ ] DMG 다운로드 링크 버전 확인

---

## Git 태그 & GitHub Actions 트리거

```bash
git add -A
git commit -m "chore: release v0.x.x"
git tag v0.x.x
git push origin main
git push origin v0.x.x   # 이 push가 GitHub Actions 빌드 트리거
```

GitHub Actions (`build-macos.yml`) 자동 실행:
1. 프론트엔드 테스트 (Ubuntu)
2. macOS aarch64 빌드
3. 버전 자동 동기화 (태그 → package.json, tauri.conf.json)
4. GitHub Releases에 두 파일 업로드:
   - `dskube_{버전}_aarch64.dmg` (버전별 영구 보관용)
   - `dskube_latest_aarch64.dmg` (랜딩 페이지 고정 링크용)

---

## 빌드 산출물 배포

GitHub Actions 완료 후:

- [ ] GitHub Releases에서 `dskube_latest_aarch64.dmg` 다운로드
- [ ] `landing/public/downloads/dskube_latest_aarch64.dmg` 교체
- [ ] 랜딩 페이지 서버에서 파일 확인:
  ```bash
  ls -lh /home/namioto/dskube/landing/public/downloads/
  ```
- [ ] https://dskube.dspark.kro.kr 접속해서 다운로드 버튼 정상 동작 확인

---

## 파일명 규칙

| 파일 | 용도 |
|------|------|
| `dskube_{버전}_aarch64.dmg` | GitHub Releases 영구 보관 (예: `dskube_0.2.0_aarch64.dmg`) |
| `dskube_latest_aarch64.dmg` | 랜딩 페이지 고정 다운로드 링크 |

> `latest` 파일은 항상 최신 버전으로 덮어쓴다. 랜딩 페이지 링크를 버전마다 바꾸지 않아도 된다.

---

## DMG 설정 (tauri.conf.json 참조)

```json
"macOS": {
  "dmg": {
    "background": "../assets/dmg-background.png",
    "windowSize": { "width": 660, "height": 400 },
    "iconSize": 80,
    "appPosition": { "x": 180, "y": 210 },
    "applicationFolderPosition": { "x": 480, "y": 210 }
  }
}
```

배경 이미지 수정 시: `assets/dmg-background.png` (1320×800, 레티나 2x)
변환 도구: `rsvg-convert` (ImageMagick 사용 금지)

---

## 로컬 빌드 (CI 없이)

```bash
cd /home/namioto/dskube
npm run tauri build
# 산출물: src-tauri/target/release/bundle/dmg/dskube_*.dmg
```

---

## 체크 완료 기준

- GitHub Releases 페이지에 새 릴리즈 생성됨
- 랜딩 페이지에서 DMG 다운로드 성공
- DMG 마운트 시 배경 이미지 + 아이콘 위치 정상
- 앱 실행 후 kubeconfig 연결 smoke test 통과
