# UGUL Web

VRChat 아바타 커미션 포트폴리오 페이지. GitHub Pages 정적 호스팅 + iframe 임베드용.

공개 주소: **https://ugulsunday1306-droid.github.io/UGUL-Web/**

## 업데이트 방법

이 레포는 Claude 디자인 캔버스가 내보내는 zip 구조를 **그대로** 따릅니다. 그래서 수정 후 절차가 짧습니다.

1. 캔버스에서 수정 → zip 내보내기 → 압축 풀기
2. `Gluumi Portfolio.dc.html` → **`index.html`** 로 이름만 변경 (내용은 손대지 않음)
3. 레포 → **Add file → Upload files** → 아래 파일을 드래그 → Commit
   - `index.html` (항상)
   - `.image-slots.state.json` (이미지를 바꿨을 때만)
4. 1~2분 뒤 공개 주소에 반영됩니다

같은 이름으로 올리면 덮어써집니다. `support.js` / `image-slot.js` / `_ds/`는 캔버스 원본과 동일하므로 평소엔 올릴 필요가 없고, 올려도 문제되지 않습니다.

> 캔버스에서 **디자인 시스템을 바꾸면** `_ds/` 아래 폴더 이름(해시)이 달라집니다. 그때는 새 `_ds/` 폴더도 함께 올려주세요.

## 구조

| 파일 | 설명 |
| --- | --- |
| `index.html` | 페이지 본문. 캔버스의 `Gluumi Portfolio.dc.html`과 내용 동일 |
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
