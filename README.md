# arbero

HIPHOP アーティスト arbero のオフィシャルサイト。
https://arbero-x.github.io/

## 開発

```bash
npm install
npm run dev
```

`main` に push すると GitHub Actions でビルドされ、GitHub Pages に公開されます。

## 新しいシングルを追加する

1. ジャケット画像（正方形）を `public/covers/` に置く
2. `src/data/releases.json` の末尾に 1 件追加する
   - `bandcampTrackId`：Bandcamp の Share / Embed で出る埋め込みコードの `track=数字`
   - `youtubeId`：MV の URL の `v=` の後ろ
   - `obi`：帯の文字と色（既存の 2 件を参考に）

切替ボタンはリリース順に並び、最初は一番新しいシングルが表示されます。
