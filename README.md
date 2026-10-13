# 다섯 단서로 단지 찾기

Five apartments, five clues, five scored rounds. A Korean static browser game with
optional practice, three difficulty levels, optional shuffled clue order, local
records, downloadable PNG score cards and clipboard sharing. No build step or API
service is required. Read [게임·데이터 안내](about.html) for rules and data limits.

## Publish this directory

1. Copy **all contents of this release directory**, including `.nojekyll`, to the
   root of a separate public repository. `index.html` must be at that root.
2. Commit those files to its publishing branch (for example `main`).
3. In that repository, open **Settings → Pages → Build and deployment**, choose
   **Deploy from a branch**, select the publishing branch and **/(root)**, then Save.
4. Check the URL and deployment status shown by GitHub Pages.

See [GitHub's publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
No custom workflow is needed for this plain static site. Relative asset paths work
under a repository prefix. Do not upload a parent/private project or its history.

The configured share link is the owner's temporary sample:
[https://nobot-kang.github.io/apt-guessing/](https://nobot-kang.github.io/apt-guessing/).
This package does not assert that URL is already deployed. Change `GAME_URL` in
`records.mjs` to the final address before publishing under a different URL.
Prefer making updates in the development source and rebuilding the release.
`release-manifest.json` records current file sizes and SHA256 hashes, not user data.

## Local preview

Serve this directory with a static HTTP server, for example:

```sh
python3 -m http.server 9023 --bind 127.0.0.1
```

Open http://127.0.0.1:9023/. ES modules/data loading require HTTP rather than opening
`index.html` as a local file. A public HTTPS site supports clipboard copying;
manual-copy fallback remains available when clipboard permission is denied.

## Data and local records

The included, fixed Seoul/Gyeonggi pack has 27 questions using 95 selected dwelling
cards. Prices are retrospective modeled sale estimates for **2026-08-27**, not
listings or observed sale prices. Data selection does not represent the whole
market. Full precision is retained for answer checks; displayed prices round to
100만원. Card identifiers are opaque public IDs. No raw transactions, source
fingerprints, databases or private server are included.

Completed scores and integer-second times are stored in localStorage, up to 100
records, on this browser only. The game does not upload them or use analytics.
Clearing browser data removes them. Static answers can be inspected by a determined
player; this is a casual game rather than a secure competition service. Hosting
providers may handle ordinary web-request metadata.

## Rules video

The start screen's **게임 방법 영상 보기** opens `assets/rules-video.mp4` (1280×720 H.264,
Korean narration with burned-in captions) in an in-page dialog; `assets/rules-video.jpg` is its poster.
No external video service or tracking is used.


## Copyright

The penguin character Ttobak (또박) and every image or video depicting it (`assets/mascot-*.webp`,
`assets/turnaround.webp`, `assets/rules-video.mp4`) are © 2026 Nobot Kang. All rights reserved. No open-source license applies;
do not copy, modify or redistribute them without permission. The game pages, score-card images and
video files carry the same notice.
