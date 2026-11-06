// SAP 学習マスター(47 パターン)で必要になった、図鑑に無かった補助項目。形式は services-extra.js と同じ。
// 提供状況・仕様は変わるため、利用前に公式ドキュメントで確認すること。
const D = "https://docs.aws.amazon.com/";
export const EXTRA_SAP = {
  sct: { n: "Schema Conversion Tool", f: "AWS Schema Conversion Tool (AWS SCT)", c: "移行", d: D + "SchemaConversionTool/latest/userguide/CHAP_Welcome.html",
    s: "異なるエンジン間で、データベースのスキーマ・ビュー・ストアドプロシージャ・関数などのコードを評価・変換するツールです。変換できない箇所は評価レポートに示されます。",
    p: "異種 DB 移行で、スキーマとコードをターゲットエンジン向けに変換する", ft: ["移行評価レポート(自動変換できない箇所の特定)", "スキーマ・PL/SQL などのコード変換", "変換後 DDL のターゲット適用"], u: "Oracle / SQL Server から Aurora PostgreSQL などへの異種移行",
    t: "SCT はスキーマ・コードの変換、実データの移行と差分同期は DMS。「SCT だけでデータが移る」は誤り。DMS にはマネージド版の DMS Schema Conversion もある",
    l: [["dms", "スキーマ変換後、データは DMS で移行"], ["aurora", "変換したスキーマを適用"], ["onprem", "移行元 DB のスキーマを評価"]] },
  dlm: { n: "Data Lifecycle Manager", f: "Amazon Data Lifecycle Manager (DLM)", c: "ストレージ", d: D + "ebs/latest/userguide/snapshot-lifecycle.html",
    s: "タグで選んだ EBS ボリュームや EC2 インスタンスについて、EBS スナップショットと EBS-backed AMI の作成・保持・削除・リージョン間コピーを自動化する機能です。",
    p: "EBS スナップショット / AMI の作成と世代管理を標準機能で自動化する", ft: ["タグベースの対象選択", "スケジュールと保持ルール", "クロスリージョン / クロスアカウントのコピー"], u: "EBS だけを低コストで世代管理し、別リージョンへ複製したいとき",
    t: "DLM の対象は EBS スナップショットと AMI。RDS・EFS・DynamoDB などを横断して保護するなら AWS Backup",
    l: [["ebs", "タグ付きボリュームのスナップショットを作成・コピー"], ["kms", "コピー先で暗号化キーを使用"], ["backup", "役割分担(EBS 特化 vs 横断保護)"]] },
  migeval: { n: "Migration Evaluator", f: "Migration Evaluator", c: "移行", d: D + "migrationevaluator/latest/userguide/what-is.html",
    s: "オンプレミス環境の利用状況を収集し、AWS へ移行した場合のコスト(TCO)を試算するためのアセスメントサービスです。",
    p: "移行のビジネスケース(TCO)を、実際の利用率から作る", ft: ["エージェントレスの収集(vCenter など)", "CMDB などのインポート", "適正サイズでのコスト試算"], u: "移行の初期段階で、費用対効果を経営に示すとき",
    t: "「エージェントを入れずに利用率と費用を把握」→ Migration Evaluator。プロセスや TCP の依存関係までは分からない(→ Discovery Agent)",
    l: [["onprem", "vCenter / CMDB から利用状況を収集"], ["ads", "依存関係の詳細は Discovery Agent で補う"], ["migrationhub", "移行計画へつなぐ"]] },
};
