# UGUL Web

VRChat 아바타 커미션 포트폴리오 페이지. GitHub Pages 정적 호스팅 + iframe 임베드용.

공개 주소: **https://ugulsunday1306-droid.github.io/UGUL-Web/**

## 업데이트 방법

이 레포는 Claude 디자인 캔버스가 내보내는 zip 구조를 **그대로** 따릅니다. 이름을 바꿀 필요가 없습니다.

1. 캔버스에서 수정 → zip 내보내기 → **압축 풀기**
2. 레포 → **Add file → Upload files** → 압축 푼 폴더를 통째로 드래그 → Commit
3. 1~2분 뒤 공개 주소에 반영됩니다

GitHub 업로드 화면은 폴더 드래그를 받고 하위 폴더 구조도 그대로 보존합니다 (한 번에 100개 파일, 개당 25MiB). 같은 이름은 덮어써지고, `index.html`은 zip에 없으므로 그대로 남습니다.

바뀐 파일만 올려도 됩니다 — 보통은 `Gluumi Portfolio.dc.html`, 이미지를 바꿨다면 `.image-slots.state.json`까지 두 개면 충분합니다.

> ### ⚠️ 이미지가 반영 안 될 때 — 숨김 파일
>
> 이미지 데이터는 HTML이 아니라 **`.image-slots.state.json`** 안에 base64로 들어있습니다.
> 이 파일은 점(`.`)으로 시작해서 탐색기/Finder에서 **숨김 처리**되고, 폴더를 드래그하면 **같이 안 딸려갑니다.**
> 이미지 수정이 사이트에 안 보이면 십중팔구 이것 때문입니다.
>
> 숨김 파일을 먼저 보이게 하세요 — Mac Finder `Cmd+Shift+.` / Windows 탐색기 보기 → 숨긴 항목.

> **GitHub은 zip을 풀지 않습니다.** `.zip`을 그대로 올리면 바이너리 파일 하나로 저장되고 사이트는 갱신되지 않습니다. 반드시 압축을 풀고 올리세요.

> 캔버스에서 **페이지 이름을 바꾸면** `index.html` 안의 `TARGET` 한 줄을 새 파일명으로 고쳐주세요.
>
> 캔버스에서 **디자인 시스템을 바꾸면** `_ds/` 아래 폴더 이름(해시)이 달라집니다. 그때는 새 `_ds/` 폴더도 함께 올려주세요.

## 구조

| 파일 | 설명 |
| --- | --- |
| `index.html` | **고정 진입점.** 아래 `.dc.html`로 넘겨주는 리다이렉트 — 캔버스 zip에는 없는 파일이니 덮어쓰지 마세요 |
| `Gluumi Portfolio.dc.html` | 페이지 본문. 캔버스 원본 그대로 |
| `support.js` | 디자인 캔버스 런타임. React/ReactDOM/Babel을 unpkg CDN에서 로드 |
| `image-slot.js` | `<image-slot>` 커스텀 엘리먼트 |
| `.image-slots.state.json` | 슬롯에 넣은 이미지 (base64 data URL) |
| `_ds/nocturne-…/` | Nocturne 디자인 시스템 번들 |
| `.nojekyll` | Jekyll 비활성화 — **없으면 `_ds/` 폴더가 통째로 무시됨** |

## 로컬 확인

```bash
python3 -m http.server 8000
# http://localhost:8000
```

`file://`로 직접 열면 `fetch()`가 CORS로 막혀 이미지가 안 뜹니다. 반드시 서버로 띄우세요.

## 임베드

```html
<iframe
  src="https://ugulsunday1306-droid.github.io/UGUL-Web/"
  title="UGUL"
  style="width:100%;height:100vh;border:0"
  loading="lazy"
  allowfullscreen></iframe>
```

높이 고정이 필요하면 `height:900px` 등으로 바꾸세요. 부모 페이지 스크롤과 함께 쓰려면 비율 컨테이너가 낫습니다.

```html
<div style="position:relative;width:100%;padding-top:150%">
  <iframe src="https://ugulsunday1306-droid.github.io/UGUL-Web/"
          style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>
</div>
```

## 알아둘 점

- 이미지 슬롯에 드래그해서 넣는 편집은 **Claude 캔버스 안에서만** 저장됩니다. 게시된 사이트에서는 저장되지 않아요.
- 아직 채워지지 않은 슬롯은 점선 자리표시자로 보입니다.
- 폰트(`jsdelivr`)와 런타임(`unpkg`)은 외부 CDN에서 로드됩니다.
- 공개 주소는 **대소문자를 구분**합니다. `.../UGUL-Web/`이어야 하고 `.../ugul-web/`은 404입니다.
