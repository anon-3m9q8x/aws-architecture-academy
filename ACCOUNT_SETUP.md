# 学習アカウント・端末間同期

メール・パスワード認証と学習データ保存に、NutriPathで作成済みのSupabaseプロジェクトを使います。
既存のNutriPathアカウントでログインできます。パスワードの変更・再設定は両サイトで共通です。
各サイトのログイン状態と端末キャッシュは分けています。Supabase管理画面でユーザーを削除すると、両サイトのそのユーザーの記録も削除されます。
学習データは `academy_accounts`、NutriPathの記録は `nutripath_accounts` です。

## 本番の有効化

### 1. 学習サイト用のSQLを実行

1. [Supabaseプロジェクト](https://supabase.com/dashboard/project/qsbrnnlmyoadtcvoqldy)を開きます。
2. **SQL Editor → New query** を選びます。
3. [`supabase/schema.sql`](supabase/schema.sql) の全文を貼り付け、**Run** を押します。
4. `Success. No rows returned` を確認します。

このSQLは学習サイト専用のテーブル・関数・アクセスルールを作ります。
`DROP POLICY` と `REVOKE` は学習テーブルのアクセスルールの更新です。テーブルや記録を削除しません。
NutriPath用のテーブル・関数は変更しません。初期設定は繰り返し実行できます。

### 2. 認証の戻り先を追加

**Authentication → URL Configuration → Redirect URLs → Add URL** に、次を追加・保存します。

```text
https://anon-3m9q8x.github.io/aws-architecture-academy/
```

NutriPathのRedirect URLは残してください。Site URLもNutriPathの設定のままで構いません。
Academyの登録・再設定メールは、アプリから上記URLを指定します。
ローカル認証の確認が必要な場合は `http://127.0.0.1:3300/` も追加します。

### 3. アカウント機能を有効にする

上記を終えた後、`config.js` の `enabled` を `true` にしてコミット・Pushします。
Project URLと公開用publishable keyは設定済みです。
DBパスワード・service_role・sb_secret_キー・個人のパスワードは不要です。
接続先のSQLが未適用の間は `enabled: false` とし、従来の端末内保存で利用できます。

```js
window.ACADEMY_CONFIG = {
  enabled: true,
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabasePublishableKey: 'sb_publishable_...'
};
```

GitHub Pagesは既存のmain / root配信をそのまま利用できます。ビルド済みSDKは `vendor/supabase.js` にあります。

## 保存と同期

- 同期対象：個人メモ・学習済み・既存のお気に入りデータ、提出済み回答・正答率の元データ、構築問題の採点履歴、構築中のサービス配置・接続、図鑑の閲覧済み記録、前回開いた教材。
- 画面の開閉・一覧の表示モードなどのUI設定は端末ごとです。
- 未ログインの従来データは元のlocalStorageキーを維持します。ログイン時のアカウントデータに自動で混ぜません。
- 「端末データを取り込む」は確認後、**アカウントの学習データ全体を端末の内容で置き換えます**。結合ではありません。必要なら先に「学習データを書き出す」でJSONを保存してください。元の未ログイン時のデータは残ります。
- メモ入力と構築中の配置は直ちに端末へ保存し、クラウド送信だけをまとめます。ネットワーク障害中の変更もアカウントごとに保持し、再接続時に再送します。
- 初めてログインする端末ではオンライン接続が必要です。認証メールの配送・制限はSupabase側の設定に依存します。
- 別端末の内容は、ホームで約15秒ごと、または「同期する」で確認します。新しい内容を読み込む際はページを再読み込みします。学習中の手動読み込みでは未提出回答・再生位置が失われる旨を確認します。提出済み回答・保存済み配置は保持します。
- 複数端末で更新が重なると、自動上書きを停止します。未送信データをJSONに保存してから、「クラウドの内容を使う」か「この端末の内容で置き換える」を選びます。
- ログアウトすると、そのアカウントのAcademy用端末キャッシュを削除します。未同期の変更は破棄前に確認します。NutriPathの記録は削除しません。
- ユーザーごとのRLSにより別アカウントのデータの読み書きを拒否します。学習教材自体は公開です。アカウント登録を閲覧の必須条件にはしていません。
- 保存方式は1アカウント1つのJSON、約4MiB上限です。未提出の回答やアニメーションの再生位置は同期しません。
- 「学習データを書き出す」は全学習キーのJSONエクスポートです。従来のメモのみのバックアップ／非破壊取り込みも図鑑に残しています。

## 開発・検証

通常の静的配信では依存関係のインストールは不要です。SDK再生成・テストは次を使用します。

```sh
cd /workspace/aws-architecture-academy
npm ci --ignore-scripts
npm run build
npm test
npm run serve
```

Chromiumの標準パスは `/usr/bin/chromium` です。異なる環境は `CHROMIUM_PATH` を指定します。
ブラウザテストは公式Supabase SDKに対してHTTPレスポンスを模擬し、実際の学習UIと保存処理を検証します。
DBテストはPGliteでSQLを実行し、RLS・匿名アクセス拒否・アカウント分離・古いリビジョンの更新拒否を検証します。
実際のSupabaseへのSQL適用、メール配送、本番の端末間同期は、有効化後に別途確認が必要です。

### 本番の確認

1. NutriPathと同じメール・パスワードでAcademyにログインします。
2. 図鑑のEC2などでメモを入力し、学習済みにします。「同期済み」を待ちます。
3. スマホで同じアカウントにログインし、同じサービスのメモと学習済みを確認します。
4. 資格演習の提出済み回答と構築問題の配置も、別端末で読み込めることを確認します。
5. 別アカウントでは記録が混ざらないことを確認します。
