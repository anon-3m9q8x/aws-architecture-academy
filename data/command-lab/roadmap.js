// コマンド・ポリシー演習: ステップ式の学習ロードマップ。基礎(読む)→ 単一サービス(書く)→ 複数条件 → 複数アカウント・IaC の順に進む。
// 各ステップの問題は、前のステップの知識を前提にする。順番どおりでなくても解けるが、迷ったら上から進める。
export const ROADMAP = [
  { id: "basics", title: "ポリシーとコマンドの読み方", goal: "Action・Resource・Effect の意味と、CLI・API・テンプレートの基本の形を知る", ids: ["iam-s3-002", "iam-s3-001", "cli-sts-001", "api-get-001", "cfn-read-001"] },
  { id: "s3-conditions", title: "S3 と条件の基本", goal: "プレフィックス・ListBucket・Deny による保護と、条件キーの考え方", ids: ["iam-s3-003", "iam-s3-004", "cli-s3ls-002", "cli-s3api-003", "iam-mfa-006", "iam-bp-008"] },
  { id: "roles", title: "ロールと信頼ポリシー", goal: "誰がロールを引き受けられるか(信頼)と、何ができるか(許可)を分けて考える", ids: ["iam-trust-013", "cli-sts-011", "iam-trust-009", "cli-sts-012", "iam-oidc-014", "iam-passrole-015"] },
  { id: "multi-conditions", title: "多段の条件と ABAC", goal: "AND / OR の組み立て、タグ・複数値のキー、明示的な Deny の例外", ids: ["iam-ec2tag-007", "iam-abac-005", "iam-tag-016", "iam-mfaip-017", "iam-deny-027"] },
  { id: "ops-cli", title: "運用の CLI", goal: "--filters と --query、dry-run、メトリクスとログで状況を確かめる", ids: ["cli-ec2-004", "cli-ec2-005", "cli-ec2-006", "cli-cw-007", "cli-cw-008", "cli-vpc-010", "cli-lambda-009"] },
  { id: "api", title: "API Gateway と署名", goal: "ステージ・ルート・オーソライザー・CORS・SigV4 のスコープを、HTTP のレベルで理解する", ids: ["api-path-002", "api-cognito-003", "api-validate-004", "api-key-005", "api-delete-011", "api-cors-010", "api-iam-009", "api-lambda-016", "api-sigv4-018"] },
  { id: "data-messaging", title: "データとメッセージング", goal: "DynamoDB の型・式・条件付き書き込み、SQS FIFO、EventBridge のパターン", ids: ["api-ddb-006", "cli-ddb-014", "cli-ddb-015", "api-ddb-013", "cli-ddb-016", "api-ddb-012", "api-ddb-007", "cli-sqs-022", "api-sqs-014", "iam-sqs-023", "cli-events-017", "cli-events-018", "api-events-015"] },
  { id: "encryption", title: "暗号化とデータの公開範囲", goal: "KMS のキーポリシー・ViaService、S3 の暗号化・公開・CloudFront 経由の配信", ids: ["iam-kms-020", "iam-kms-021", "cli-kms-021", "iam-kms-022", "api-s3sse-008", "api-s3anon-017", "iam-oac-024", "iam-lambdares-025"] },
  { id: "iac", title: "CloudFormation で構成を書く", goal: "参照と依存関係・安全な既定値・条件・エクスポート・最小権限をテンプレートで表す", ids: ["cfn-s3-002", "cfn-sg-003", "cfn-ref-004", "cfn-typo-005", "cli-cfn-020", "cli-cfn-019", "cfn-cond-006", "cfn-read-012", "cfn-output-009", "cfn-cycle-007", "cfn-iam-010", "cfn-rds-008", "cfn-events-011"] },
  { id: "multi-account", title: "複数アカウントとガードレール", goal: "クロスアカウント・組織・アクセス許可の境界・SCP で、権限の上限と委任を設計する", ids: ["iam-cross-012", "iam-org-026", "iam-boundary-011", "iam-boundary-028", "cli-iam-013", "iam-scp-010", "iam-scp-019", "iam-scp-018"] },
];
