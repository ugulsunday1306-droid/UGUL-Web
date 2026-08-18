# UGUL Web

VRChat 아바타 커미션 포트폴리오 페이지. GitHub Pages 정적 호스팅 + iframe 임베드용.

## 구조

| 파일 | 설명 |
| --- | --- |
| `index.html` | 페이지 본문 (Claude 디자인 캔버스 `.dc.html` 형식) |
| `support.js` | 디자인 캔버스 런타임. React/ReactDOM/Babel을 unpkg CDN에서 로드 |
| `image-slot.js` | `<image-slot>` 커스텀 엘리먼트 |
| `image-slots.state.json` | 슬롯에 넣은 이미지 (base64 data URL) |
| `ds-bundle.js` | Nocturne 디자인 시스템 번들 |
| `.nojekyll` | Jekyll 비활성화 |

## 로컬 확인

```bash
python3 -m http.server 8000
# http://localhost:8000
```

`file://`로 직접 열면 `fetch()`가 CORS로 막혀 이미지가 안 뜹니다. 반드시 서버로 띄우세요.

## 임베드

```html
<iframe
  src="https://ugulsunday1306-droid.github.io/ugul-web/"
  title="UGUL"
  style="width:100%;height:100vh;border:0"
  loading="lazy"
  allowfullscreen></iframe>
```

높이 고정이 필요하면 `height:900px` 등으로 바꾸세요. 부모 페이지 스크롤과 함께 쓰려면 아래처럼 비율 컨테이너를 쓰는 편이 낫습니다.

```html
<div style="position:relative;width:100%;padding-top:150%">
  <iframe src="https://ugulsunday1306-droid.github.io/ugul-web/"
          style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>
</div>
```

## 알아둘 점

- 이미지 슬롯에 드래그해서 넣는 편집 기능은 **Claude 캔버스 안에서만** 동작합니다. 게시된 사이트에서는 저장이 되지 않습니다. 이미지를 바꾸려면 캔버스에서 수정 후 다시 커밋하세요.
- 아직 채워지지 않은 슬롯은 점선 자리표시자로 보입니다.
- 폰트(`jsdelivr`)와 런타임(`unpkg`)은 외부 CDN에서 로드됩니다.
