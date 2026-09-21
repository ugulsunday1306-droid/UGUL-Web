# Gluumi Portfolio × artmug.kr — 인수인계 문서

작성일: 2026-09-21

새 대화(브라우저 도구가 있는 환경)에서 이어서 작업할 때 이 문서부터 읽으면 됩니다.

---

## 1. 무엇을 만들었나

VRChat 아바타 커미션 작가(Gluumi)의 포트폴리오 페이지.
자체 호스팅한 정적 페이지를 **artmug.kr 작가 소개란에 iframe으로 삽입**해서 쓰는 구조입니다.

디자인 시스템: **Nocturne** (다크 블루그레이 그라운드, 액센트 #9184d9, Inter)

---

## 2. 파일 구조

| 경로 | 역할 |
| --- | --- |
| `Gluumi Portfolio.dc.html` | **원본 소스.** 여기만 고치고 나머지로 복사. |
| `index.html` | 프로젝트 루트 복사본 (미리보기용) |
| `deploy/index.html` | GitHub Pages 배포본 |
| `cursor-*.png` | 커스텀 커서 스프라이트 5종 (idle / move / hover / click / loading) |
| `facial-1~5.mp4` | 페이셜 데모 영상 |
| `unity-cursor-bridge.html` | Unity WebGL 안에서 커서 상태를 부모로 전달하는 브리지 |
| `github.md` | 콘텐츠 참조용 원본 레포 기록 (배포처 아님) |
| `artmug-host.html` | **artmug 호스트 스크립트 백업** (2026-09-21 라이브 DOM에서 추출) |

> **중요**: 세 HTML은 항상 동기화되어야 합니다. 소스 수정 → `index.html`, `deploy/index.html`에 동일 내용 복사.

### 외부 리소스
- 배포처: `https://ugulsunday1306-droid.github.io/UGUL-Web/` (레포 `ugulsunday1306-droid/UGUL-Web`, branch `main`, **루트 서빙**) — 2026-09-21 브라우저로 확인
  - 루트 `index.html`이 실제 서빙본. `deploy/` 폴더도 그대로 배포돼 `/UGUL-Web/deploy/`로 접근 가능(중복본)
  - `github.md`의 `Gluumi_Web`은 **콘텐츠 참조용 원본 레포**이지 배포처가 아님
- Unity WebGL 아바타 데모: `https://ugulsunday1306-droid.github.io/unity/`
  - MagicaCloth2 + Final IK 사용, Gzip 압축 해제 설정 적용됨
- 문의 페이지: `https://artmug.kr/index.php?channel=view&uid=31692`

---

## 3. 페이지 구성

2페이지 슬라이딩 트랙 구조 (가로 전환):

1. **Main** — 히어로, 작업물 그리드, 페이셜 데모, 아바타 미리보기(Unity WebGL), 보유 아바타/분양 갤러리
2. **Solutions** — 작업 순서, 신청 양식, FAQ, 주의사항 등 아코디언 가이드

주요 동작:
- 스크롤 진입 시 섹션 페이드인 (`data-reveal`, translateY + opacity), 페이지 전환 시 리셋
- 아바타 미리보기는 **첫 클릭 시 lazy-load** — 접어도 iframe은 트리에 남아 재다운로드 안 함
- "내용 더 보기" 아코디언은 로드 시 자동 펼침
- 모든 인터랙티브 요소에 보라색 글로우 호버 하이라이트

---

## 4. artmug.kr 삽입 구조 ⭐ (가장 중요)

artmug.kr 작가 소개란은 HTML 입력이 가능합니다. 거기에 **iframe + 호스트 스크립트**를 넣어 둔 상태입니다.

```
artmug.kr 페이지 (호스트)
 └── <iframe src="https://ugulsunday1306-droid.github.io/?v=12">
      └── 포트폴리오 (임베드)
```

### 호스트 쪽에 들어있는 것
- 포트폴리오 iframe (`height` 고정 5900px 폴백 + postMessage 자동 높이 조정)
- **플로팅 버튼 3개** — iframe 안이 아니라 **artmug 페이지에 `position:fixed`로** 그려집니다
  1. 문의하기 → artmug 네이티브 문의 모달 (`.btn_qna` 클릭 트리거)
  2. 페이지 토글 (Main ↔ Solutions)
  3. 포트폴리오 최상단으로 스크롤 (iframe 시작점이 아니라 artmug 페이지 기준)
- **커스텀 커서 렌더링** — artmug 전체 페이지에서 커서가 보이도록 호스트가 직접 `requestAnimationFrame`으로 그림

> ✅ 2026-09-21: 호스트 스크립트를 라이브 페이지 DOM(`div.showcontent`)에서 그대로 떠서 `artmug-host.html`로 저장해 뒀습니다.
> 관리자 페이지 원문이 아니라 브라우저가 파싱한 결과이므로, 붙여넣기로 되돌릴 때는 관리자 입력란 원문과 한 번 대조하세요.

---

## 5. postMessage 프로토콜

모든 메시지는 `{ __gluumiEmbed: true, type: '...' }` 형태.

### iframe → 호스트

| type | 페이로드 | 의미 |
| --- | --- | --- |
| `hello` | — | 임베드 준비 완료 (호스트는 `host-cursor`로 응답) |
| `height` | `height` | 콘텐츠 높이 변경 → iframe `height` 조정 |
| `cursor` | `x`, `y`, `state`, `seen` | 커서 좌표(페이지 좌표계)와 상태 |
| `cursor-leave` | — | 커서가 iframe 밖으로 나감 |
| `contact` | — | 문의 모달 열어달라 (200ms 내 ack 없으면 iframe이 직접 `window.top.location`으로 이동) |
| `scroll-top` | — | artmug 페이지 최상단으로 스크롤 |

### 호스트 → iframe (실제 구현 기준, 2026-09-21 검증)

| type | 의미 | 상태 |
| --- | --- | --- |
| `scroll` | 호스트의 `window.scrollY` 전달. iframe이 `_hostScrollY`로 받아 커서 좌표 보정에 사용 | ✅ (문서에 누락돼 있었음) |
| `host-cursor` | "커서는 내가 그린다" — iframe은 자기 커서를 숨기고 좌표만 전송 | ✅ |
| `toggle-page` | Main ↔ Solutions 전환 | ✅ |
| `hide-fabs` | iframe 안의 플로팅 버튼 숨김 (호스트가 대신 그림) | ✅ |
| `contact-ack` / `scroll-top-ack` | iframe이 기다리는 ack | ❌ **호스트에 핸들러 없음** |
| 포인터 이동 전달 | — | ❌ **구현 안 돼 있음.** 호스트는 자기 `pointermove`를 자기 커서에만 쓰고 iframe으로 보내지 않음 |

호스트의 `message` 핸들러가 실제로 처리하는 것은 `hello`, `height`, `cursor`, `cursor-leave` 네 개뿐입니다.
iframe이 보내는 `contact` / `scroll-top`은 **호스트가 무시**하므로:
- `contact` → 200ms 후 폴백으로 `window.top.location` 이동 (모달 안 열림)
- `scroll-top` → 아무 일도 안 일어남 (단, 호스트 FAB이 자체 로직으로 스크롤하므로 체감 문제는 없음)

**커서 소유권 규칙**: 시간 기반 조정(time-based arbitration) 없음. **마지막 신호가 즉시 주도권을 가짐** (iframe이든 호스트 pointermove든). 이 방식으로 경계에서 깜빡임/버벅임 제거함.

커서 핫스팟: `HOT_X = 11.47`, `HOT_Y = 7.95` / 스프라이트 크기 97.5×90px

---

## 6. 해결된 이슈 (재발 시 참고)

- **커서 경계 깜빡임** — 시간 기반 조정 → "마지막 신호 우선" 모델로 교체, 150ms 디바운스 제거
- **페이지 토글 버튼 무반응** — 호스트의 `type:'toggle-page'` 핸들러 누락이었음
- **`</script>` 닫는 태그 누락** — 전달 과정에서 잘림. 호스트 스크립트 붙여넣을 때 항상 끝 확인
- **플로팅 버튼이 스크롤 밖으로 사라짐** — 긴 iframe 안에서 `position:fixed`는 iframe 자체 뷰포트에 고정되므로, 버튼은 호스트 페이지로 이동시킴 (IntersectionObserver로 보이는 영역 판단)
- **Unity WebGL 로딩 실패** — Gzip 압축 해제 설정 필요
- **스크롤바 문제** — iframe 자동 높이로 해결 (이중 스크롤바 제거)

---

## 7. 현재 상태 / 다음 할 일

현재 iframe 버전: `?v=12` (캐시 무효화용 — 배포할 때마다 숫자 올리기)
배포본 SHA-256 = 로컬 `index.html` / `deploy/index.html`과 일치 (`6bbb0c49…f995`) — 세 파일 동기화 OK.

### 2026-09-21 브라우저 검증 결과

동작하는 것:
- iframe 로드, `hello` 핸드셰이크, `hide-fabs` + `host-cursor` 응답 ✅
- 호스트 플로팅 버튼 3개 렌더 + IntersectionObserver 기반 표시/숨김 ✅
- 페이지 토글 버튼 → Solutions 전환 ✅
- 커스텀 커서 호스트 렌더 ✅

**🔴 미해결 1 — iframe 자동 높이가 순환 참조로 잠김**
- iframe이 보내는 height가 첫 1회 `5900`뿐이고 이후 갱신 없음. 즉 폴백값에 고정.
- 원인: `#gluumi-top`의 `min-height:100vh`. 임베드 안에서 `100vh` = iframe 엘리먼트 높이(5900px)이므로
  `documentElement.scrollHeight`가 항상 5900 이상 → 높이가 절대 줄지 않는 순환 측정.
- 같은 폭(1180px)에서 독립 실행 시 실제 콘텐츠 높이는 **5705px** → 임베드에서 약 200px 빈 공간.
- 방향: 부모가 있을 때(`window.parent !== window`) `#gluumi-top`의 `min-height`를 해제하거나
  래퍼 엘리먼트 높이로 측정하도록 `_initAutoHeight` 수정.

**🔴 미해결 2 — 임베드에서 `window.innerHeight`가 5900이라 스크롤 연출이 죽음**
- `data-reveal` 페이드인(`vh * 0.94` 판정)과 커서 스텝 계산이 전부 `window.innerHeight` 기준.
- 임베드에선 뷰포트가 5900px로 잡혀 모든 섹션이 즉시 reveal 처리 → 페이드인 효과 사실상 무효.
- 호스트는 `scroll`(y)만 보내고 자기 `innerHeight`는 안 보냄. 프로토콜에 호스트 뷰포트 높이 추가 필요.

**🟡 미해결 3 — `contact` / `scroll-top` 호스트 핸들러 부재** (§5 참고)
- 문의 버튼이 모달 대신 페이지 이동으로 폴백 중.

**🟡 기타**
- 배포본 `<title>`이 비어 있음.
- `deploy/` 폴더가 루트와 중복 배포 중 (`/UGUL-Web/deploy/` 200).

확인이 남은 것:
- 모바일 레이아웃
- 커서 경계(iframe ↔ 호스트) 전환 실제 마우스 이동 테스트 — 자동화 클릭으로는 재현이 어려움, 수동 확인 권장

---

## 8. 작업 방식 메모

이전 환경에는 외부 사이트를 여는 브라우저 도구가 없어서 실제 연동 화면을 직접 볼 수 없었습니다.
브라우저 도구가 있는 환경에서는:
1. `https://artmug.kr/index.php?channel=view&uid=31692` 를 열어 실제 임베드 상태 확인
2. 콘솔에서 `__gluumiEmbed` 메시지 흐름 관찰
3. 수정 → `deploy/index.html` 갱신 → GitHub Pages 푸시 → iframe `?v=` 증가
