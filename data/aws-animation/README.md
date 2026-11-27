# AWS サービス間通信アニメーションデータ

先行チャットの5構成を再利用可能なJSONへ整理。実AWSには接続しない学習モデル。

- aws_architectures.json: 全構成統合版
- web / serverless / cdn / event / hybrid.json: 個別データ

## データ仕様
- nodes: ID、名称、中心座標、役割
- zones: 背景領域（左上座標と幅・高さ）
- steps: 再生順、送信元・宛先ID、処理名、操作ラベル、時間(ms)、色
- extra_connections: 通常再生に含まれない関連付け・代替経路
- notes: 簡略化や非同期処理に関する注意

## 実装方法
1. nodes と zones を SVG 等に描画。
2. steps を order 順に読み、source と target のノード間に矢印を描く。
3. パケットを duration_ms / speed の時間で移動させる。
4. title と operation を表示しログに追加する。
5. ノード選択時に description を表示する。

元の画面コードそのものではなく、描画と再生のためのデータセット。操作ラベルは実際の通信プロトコルとAPI操作名を含む。障害シナリオは未収録。
