# AWS Architecture Academy

日本語の AWS 資格学習ワークスペース。依存パッケージ不要の HTML / CSS / JavaScript 製です。

公開サイト: https://banben18-creator.github.io/aws-architecture-academy/

## 学習機能

- 図鑑42項目: AWSサービス・関連項目40件＋一般概念2件。カテゴリ・キーワード検索。S3 Glacier は独立サービスではなくストレージクラスとして分類。
- オリジナル演習40問: 単一選択32問・複数選択8問、全選択肢の解説と公式ドキュメントへの参照。CLF基礎13問・SAA設計27問。資格レベルは教材上の目安で、公式試験問題ではなく全試験範囲の網羅を保証しません。専門家レビュー未実施。
- 出題フィルター: 資格レベル・分野・未回答・直近誤答、5問・10問・該当全問。出題順はセッションごとにシャッフル。
- 学習モード: 各問で回答後に採点と解説を表示。複数選択は正解集合との完全一致で判定。試験スコアへの換算は行いません。
- 回答回数、全回答ベースの正答率、分野別成績、直近の誤答に基づく復習対象。セッション中断時も提出済み回答は保持しますが、未提出の回答はページの再読み込みで失われます。
- PX-02 / HC-01 / LB-01 の3つのステップ教材。再生・停止・前後・先頭・速度・シーク。
- ワンクリックのダーク／ライト切替、OS連動、モバイル対応。テーマ切替で回答や再生位置を初期化しません。

## 起動

```sh
cd /workspace/aws-architecture-academy
python3 -m http.server 3300 --bind 127.0.0.1
```

JSON／ES Modulesを使うため、ファイルの直接オープンではなくHTTP経由で利用します。

## ファイル構成

```text
index.html           共通シェルと各学習ページ
style.css            両テーマとレスポンシブUI
script.js            図鑑・テーマ・アニメーション・ナビゲーション
practice.js          出題・採点・解説・成績・復習
data/catalog.js      追加の図鑑データ
data/questions.js    40問の独自教材（正解・解説を含む公開データ）
data/scenes.json     ステップ教材
assets/              添付資料由来の独自SVG
docs/                要件・検証・出典到達性・画面キャプチャ
```

## 保存データ

ブラウザのlocalStorageを使用します。端末間同期はありません。設定は `aaa.ui.preferences.v1`、既存のアニメーション履歴は `aaa.step1.progress.v1` を維持。問題の回答は `aaa.practice.attempts.v1` に保存します。利用不可時はタブ内のメモリで動作し、警告します。

## 検証

サイト本体に追加依存はありません。ブラウザ検証にはPythonのPlaywrightとChromiumを使用します。ポート3300で起動してから実行してください。

```sh
node --check script.js
node --check practice.js
python3 docs/browser-check.py
python3 docs/browser-edge-check.py
python3 docs/check-sources.py
```

検証結果は `docs/LEARNING_EDITION_REPORT.md` を参照してください。以前のStep 1の結果は `docs/TEST_REPORT.md` に履歴として残しています。

## 配信と制限

mainブランチのルートをGitHub Pagesで公開。相対URLとハッシュナビゲーションに対応。API、DB、管理認証、構成シミュレーター、障害ラボ、比較プレイヤー、公式模擬試験は未実装です。静的学習サイトのため正解は配信ファイル内に含まれます。本物の試験の秘匿採点やパスワード保護を提供するものではありません。AWS認証情報・実環境操作・課金は不要です。
