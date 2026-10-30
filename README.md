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
   - `obi`：帯の文字と色（既存の曲を参考に）
   - 発売前で Bandcamp / YouTube がまだないときは、`bandcampTrackId` と `youtubeId` を `null` にし、`bandcampUrl` を `https://arbero.bandcamp.com/` にする。試聴と MV の欄に COMING SOON と出る

切替ボタンはリリース順に並び、最初は一番新しいシングルが表示されます。

## Discord のダイヤルロック

フッターの Discord は、4 桁の番号が合うと招待リンクが出ます。招待 URL は番号を鍵にして暗号化し、`src/data/discordLock.json` に置いてあります（番号も URL もリポジトリには平文で残りません）。

番号か招待 URL を変えるときは、次を実行して質問に答え、できた `src/data/discordLock.json` をコミットします。

```bash
npm run lock
```
