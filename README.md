# iinow.github.io

https://iinow.github.io/ 블로그. GitHub Pages 가 Jekyll 로 알아서 빌드한다. `gh-pages` 브랜치에 푸시하면 1분쯤 뒤 반영.

## 새 글 쓰기

```bash
scripts/new-post.sh kafka-retry "카프카 재시도 정리"   # _posts/오늘날짜-kafka-retry.md 생성
# 글 쓰고
git add -A && git commit -m "글: 카프카 재시도" && git push
```

- 주소는 `/posts/kafka-retry/`. 첫 화면 **글** 목록에 최신순으로 자동으로 들어간다.
- 파일 이름은 `_posts/YYYY-MM-DD-영문-주소.md`. 날짜가 미래면 그날까지 안 보인다.
- 아직 안 올릴 글은 `_drafts/` 에 둔다 (공개 안 됨).

## 글 안에서 쓸 수 있는 것

일반 마크다운(소제목 `##`, 표, 목록, 코드 블록, 인용)은 그대로 된다.

| 쓰고 싶은 것 | 쓰는 법 |
|---|---|
| 그림 | `![설명](/img/영문-주소/a.png)`. 누르면 크게 보인다 |
| 그림 + 설명 | `<figure><img src="..." alt="..."><figcaption>설명</figcaption></figure>` |
| 숫자 요약 칸 | `<dl class="facts"><div><dt>이름</dt><dd>12<small>일</small></dd></div>…</dl>` |
| 알약 목록 | 목록 바로 아래 줄에 `{: .stack}` |
| 순서 흐름 | `<ol class="loop"><li>…</li><li class="hot">강조</li></ol>` |
| 탭으로 넘기는 화면 캡처 | `_posts/2026-11-15-lite-oc.md` 의 `<div class="shots">` 를 복사 |
| 작은 회색 글 | 문단 바로 아래 줄에 `{: .note}` |

## 검색 노출

- 글마다 제목·설명(`summary`)·대표 주소·공유 그림·구조화 데이터가 자동으로 붙는다. `summary` 를 꼭 쓴다 (검색 결과·링크 미리보기 설명으로 쓰인다).
- 링크 미리보기(카카오톡·슬랙·디스코드·X)는 페이지마다 그 글의 제목이 박힌 카드 그림을 쓴다. `image: /img/og/<영문-주소>.png`, 설명은 `image_alt`.
- 카드 그림은 `scripts/make-og.py` 로 만든다. `scripts/new-post.sh` 로 글을 만들면 자동으로 하나 만들어진다.
  ```bash
  python3 scripts/make-og.py --out img/og/kafka-retry.png --title "카프카 재시도 정리" --kicker "개발 · 2026.11.27"
  ```
  글 카드가 아니라 사진을 쓰고 싶으면 `image:` 에 사진 경로를 넣고 `image_width`·`image_height` 도 같이 적는다 (기본 1200×630).
- `sitemap.xml`, `robots.txt`, `feed.xml` 은 자동.
- 구글 서치 콘솔·네이버 서치어드바이저 확인 코드는 `_config.yml` 의 `google_site_verification`, `naver_site_verification` 에 넣는다.

## 파일

| 파일 | 하는 일 |
|---|---|
| `_posts/` | 글 |
| `index.html` | 첫 화면 (히어로, 글 목록, 저장소) |
| `_layouts/default.html` | 공통 머리·메뉴·바닥 |
| `_layouts/post.html` | 글 화면 틀 |
| `style.css`, `main.js` | 모양, 애니메이션·탭·크게 보기 |
| `scripts/make-og.py` | 링크 미리보기 카드 그림(1200×630) 생성. 글꼴은 `scripts/fonts/` (Bagel Fat One·Pretendard, OFL) |

합쳐지는 애니메이션은 lite-oc 글 안에 있다 (`<div class="stage">`, 목록은 `main.js` 의 `SERVICES`).
