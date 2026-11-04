# Step 1 検証結果

## PASS

- `node --check script.js`: 終了コード 0。
- `python /tmp/test_academy.py`: Chromium / Playwright で終了コード 0。再実行用スクリプトは browser-check.py。検証用環境には Python Playwright と /usr/bin/chromium が必要。サイト本体には追加依存なし。
- 図鑑9件、ALB検索、該当なし表示、DBカテゴリ2件。
- PX-02 / HC-01 / LB-01: 再生、完了時停止、前後操作、最終ステップのみ学習記録可。
- 学習済み3件の表示とリロード後の保存確認。
- light/dark と設定復元、systemでOSテーマ変更に追従、ステップ保持。
- 375px幅: 5画面 × light/dark でドキュメント全体の横スクロールなし。
- reduced-motion: 自動再生せず1ステップ進む。
- ブラウザの未処理 JavaScript エラーなし。
- 親リポジトリ git status --short に変更なし。

## 修正と再検証

初回検索検証で ALB 略称が検索できなかったため教材名に略称を追加し再検証 PASS。非表示ページを可視状態まで待つ検証スクリプトとOSテーマイベントを同期的に判定する検証スクリプトを修正し、最終全体実行で PASS。

## 未実施・対象外

GitHub Pages の実デプロイ、公開URLの疎通、AWS公式資料の最新レビュー、全仕様受け入れ試験 UI-001〜042、密度切替、DB/API/認証/サーバー採点、全教材の移行、完全なアクセシビリティ監査。

スクリーンショット: desktop.png、mobile-dark.png、mobile-light.png。デスクトップ撮影はシステムテーマ（ライト）、モバイル撮影時は検証で記録した履歴3件を表示。
