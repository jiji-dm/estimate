# estimate（概算見積アプリ）

素のJS（ビルドなし）。`index.html` + `app.js`（UI/状態）+ `estimate.js`（見積計算）。
保存は localStorage キー `gencho_v4`。Google認証は `auth.js`（vacancorp.com 限定）。

## 3アプリ連携での位置づけ

SiteSurvey から種（現場名・台数・LAN・電源距離など）を受け取り、見積を計算して
`estimate.result`（3分類→小計→15%→総額）を返す。設計は
**`/Users/nh/Apps/shared-bundle/BUNDLE_CONTRACT.md`** に確定済み。
**連携に関わる作業の前に必ず読むこと**（特に §6 estimateスライス・§6.1 マッピング・§6.2 概算見積・§11.4 差分/links）。

## このアプリの実装TODO（契約 §12 から抜粋）

- Step7 UI変更：1グループ1機器種別の排他＋「機器グループ作成」ボタン
- Step9(LAN)/Step10(電源)：「まとめて / 機器グループごと」の選択
- レコードに siteId 保持／差分表示＋更新確認（ID基準・フィールド単位・updatedAt判定）
- estimate.result の計算とpush／編集画面の新設（一覧型・差分ハイライト）
- ローカル消失時の Firestore スライスからの復元

## ルール

- 契約の決定事項（§9）と矛盾する変更はしない。矛盾を見つけたら報告
- 既存レコードのフィールド名（siteName / workDate / kojiType / powerGroups / lanSegments 等）は変えない
- TODO完了時は BUNDLE_CONTRACT.md の該当項目にチェック

## ⚠️ 開発中の運用ルール（厳守）

- **git push 禁止**：本アプリは現行業務で使用中。連携作業の全工程が終わりユーザーが
  明言するまで push しない（ローカル commit は可）。
- **ローカルテスト時はドメイン認証を一時無効化してよい**：`auth.js` をフラグ切り替え
  （例 `DEV_SKIP_AUTH`）で。コード削除はしない。
- **push 前に必ず認証を元に戻す**（最優先チェック項目）。
