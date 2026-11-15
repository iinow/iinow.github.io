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

## 파일

| 파일 | 하는 일 |
|---|---|
| `_posts/` | 글 |
| `index.html` | 첫 화면 (히어로, 글 목록, 저장소) |
| `_layouts/default.html` | 공통 머리·메뉴·바닥 |
| `_layouts/post.html` | 글 화면 틀 |
| `style.css`, `main.js` | 모양, 애니메이션·탭·크게 보기 |

첫 화면 히어로(합쳐지는 애니메이션)는 lite-oc 글 전용이다. 다른 글을 앞세우려면 `index.html` 의 `<section class="hero">` 와 `main.js` 의 `SERVICES` 를 고친다.
