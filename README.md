# arbero

HIPHOP アーティスト arbero のオフィシャルサイト。
https://arbero-x.github.io/

## 開発

```bash
npm install
npm run dev
```

`main` に push すると GitHub Actions でビルドされ、GitHub Pages に公開されます。

## ページの作り

トップページは、ドット絵の arbero を操作してフィールドを歩くゲーム（`src/main.js`、Canvas 2D）。右上の LIST から、ゲームを遊ばなくても全リリース（Bandcamp 試聴・MV）とリンクを一覧できます。

- 操作：WASD で移動、SPACE で調べる（矢印キー、Z / Enter でも動く）。スマホは画面の WASD キーと赤い SPACE ボタン。物や床をクリック / タップすると、そこまで歩く（氷の上は滑り方も考えて道を探す）。そばにいる物をもう一度クリックすると調べる
- スタート部屋の下段：ポスト＝マシュマロ、ノート＝note、スピーカー＝SoundCloud、鍵のかかった扉＝Discord（ダイヤルロック）。左上の配信コーナー：カメラ＝ツイキャスのアーカイブ、モニター＝YouTube
- Penguin の部屋と通路は氷の床（壁やペンギンにぶつかるまで滑る）。ペンギンに話しかけると `PENGUIN_LINES` の台詞を言う

## 新しいシングルを追加する

1. ジャケット画像（正方形）を `public/covers/` に置く
2. `src/data/releases.json` の末尾に 1 件追加する
   - `blurb`：一言の紹介文（LIST とゲームのダイアログに出る）
   - `catNo`：品番（例：ARB-004）
   - `bandcampTrackId`：Bandcamp の Share / Embed で出る埋め込みコードの `track=数字`
   - `youtubeId`：MV の URL の `v=` の後ろ
   - 発売前で Bandcamp / YouTube がまだないときは、`bandcampTrackId` と `youtubeId` を `null` にし、`bandcampUrl` を `https://arbero.bandcamp.com/` にする。試聴と MV の欄に COMING SOON と出る
3. LIST には自動で載ります。フィールドに CD を置くときは、`src/main.js` の地図（`RAW`）に部屋と番号を、`CD` に表記と色を、`CD_LINE` に調べたあと arbero が言うひとことを足す（CD を調べると頭の上に「！」が出て、曲の説明 → ひとことの順に出る）

## Discord のダイヤルロック

ゲームの鍵のかかった扉と LIST の Discord は、4 桁の番号が合うと招待リンクが出ます。招待 URL は番号を鍵にして暗号化し、`src/data/discordLock.json` に置いてあります（番号も URL もリポジトリには平文で残りません）。

番号か招待 URL を変えるときは、次を実行して質問に答え、できた `src/data/discordLock.json` をコミットします。

```bash
npm run lock
```
