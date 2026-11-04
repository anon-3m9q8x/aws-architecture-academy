export const notebook = {
  "services": [
    {
      "id": "ec2",
      "name": "EC2",
      "category": "コンピューティング",
      "tip": "購入オプション(RI/Savings Plans/スポット)とプレイスメントグループを押さえる",
      "features": [
        "仮想サーバー(Linux/Windows)",
        "インスタンスタイプでCPU/メモリを選択",
        "SGでアクセス制御"
      ],
      "purpose": "OSやミドルウェアまで自分で制御できる仮想サーバーを使う",
      "useCases": "Webサーバー、業務アプリ、常時稼働システム、既存オンプレ資産の移行先",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "asg",
      "name": "Auto Scaling",
      "category": "コンピューティング",
      "tip": "ターゲット追跡/ステップ/スケジュール。複数AZ配置でAZ障害に耐える",
      "features": [
        "負荷に応じてEC2を自動増減",
        "ヘルスチェックで異常台数を置換",
        "複数AZに分散配置"
      ],
      "purpose": "負荷変動に合わせて台数を自動調整し、可用性とコストを両立する",
      "useCases": "Webアプリのアクセス増減対応、AZ障害時の自動復旧",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "lambda",
      "name": "Lambda",
      "category": "コンピューティング",
      "tip": "実行時間の上限は15分・同時実行数制限。VPC接続やプロビジョニング済み同時実行も出題",
      "features": [
        "サーバー管理不要でコード実行",
        "S3/SQS/APIなどのイベントで起動",
        "リクエストや実行時間等に応じて課金"
      ],
      "purpose": "サーバーを管理せず、イベントに応じて小さな処理を実行する",
      "useCases": "S3アップロード時の加工、APIバックエンド、定期バッチ、ログ処理",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "ecs",
      "name": "ECS/Fargate",
      "category": "コンピューティング",
      "tip": "サーバー管理不要はFargate。タスクロールとBlue/Green(CodeDeploy)が頻出",
      "features": [
        "Dockerコンテナの実行・管理",
        "Fargateならサーバー管理不要",
        "ALBと連携してサービス公開"
      ],
      "purpose": "Dockerコンテナを運用・オーケストレーションする",
      "useCases": "マイクロサービス、Webアプリのコンテナ化、CI/CDによる継続デプロイ",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "s3",
      "name": "S3",
      "category": "ストレージ",
      "tip": "ストレージクラス、ライフサイクル、CRR、オブジェクトロック、署名付きURL",
      "features": [
        "オブジェクトストレージ(高耐久)",
        "ストレージクラスで階層化",
        "バージョニング・レプリケーション・暗号化"
      ],
      "purpose": "大容量で高耐久なデータの置き場を使う",
      "useCases": "静的サイト、データレイク、バックアップ、ログ保管、アーカイブ",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "backup",
      "name": "AWS Backup",
      "category": "ストレージ",
      "tip": "バックアップの一元管理とクロスリージョン/クロスアカウントコピー",
      "features": [
        "バックアップの一元管理",
        "EBS/RDS/DynamoDB等に対応",
        "クロスリージョン/アカウントコピー"
      ],
      "purpose": "複数サービスのバックアップを一元管理・自動化する",
      "useCases": "バックアップポリシーの統一、クロスリージョンのDR、監査対応",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "rds",
      "name": "RDS",
      "category": "データベース",
      "tip": "通常のMulti-AZ DBインスタンス配置のstandbyは可用性向け。読み取り分散のRead Replica、読み取り可能なMulti-AZ DBクラスターと区別する",
      "features": [
        "マネージドRDB(MySQL/PostgreSQL等)",
        "Multi-AZで自動フェイルオーバー",
        "リードレプリカで読み取り分散"
      ],
      "purpose": "DBの運用(パッチ・バックアップ・冗長化)をAWSに任せる",
      "useCases": "業務システムのRDB、Multi-AZによる高可用、リードレプリカでの読み取り分散",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "aurora",
      "name": "Aurora",
      "category": "データベース",
      "tip": "6コピー3AZ。Global Databaseは低RPOのDR、Serverless v2も押さえる",
      "features": [
        "MySQL/PostgreSQL互換の高性能DB",
        "6コピーを3AZに保存・自動拡張",
        "Global Databaseでリージョン間複製"
      ],
      "purpose": "クラウド向けに設計されたクラウド向けRDBを使う",
      "useCases": "高負荷のRDB、グローバル展開、低RPOのDR、可変負荷(Serverless v2)",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "dynamodb",
      "name": "DynamoDB",
      "category": "データベース",
      "tip": "オンデマンド/プロビジョンド、DAX、Streams、グローバルテーブル",
      "features": [
        "フルマネージドNoSQL",
        "ミリ秒応答・自動スケール",
        "Streams・TTL・グローバルテーブル"
      ],
      "purpose": "低レイテンシーを目指して設計されたNoSQLを使う",
      "useCases": "セッション管理、ゲームのスコア、IoTデータ、サーバーレスAPIのデータ層",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "elasticache",
      "name": "ElastiCache",
      "category": "データベース",
      "tip": "Redis(永続化・Multi-AZ)とMemcached(マルチスレッド)の違い",
      "features": [
        "インメモリキャッシュ(Redis/Memcached)",
        "DB負荷軽減・低遅延化",
        "セッション管理にも利用"
      ],
      "purpose": "頻繁に読むデータをメモリに置き、DBの負荷を下げる",
      "useCases": "DBキャッシュ、セッションストア、ランキング、リアルタイム集計",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "vpc",
      "name": "VPC",
      "category": "ネットワーク",
      "tip": "パブリック/プライベートサブネット、SG(ステートフル)とNACL(ステートレス)",
      "features": [
        "論理的に分離された仮想ネットワーク",
        "サブネット・ルートテーブル・IGW/NAT",
        "SG・NACL・フローログ"
      ],
      "purpose": "AWS上に自分専用の隔離されたネットワークを作る",
      "useCases": "すべての構成の土台。パブリック/プライベート分離、環境の分離",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "alb",
      "name": "ALB",
      "category": "ネットワーク",
      "tip": "L7。パスベース/ホストベースルーティング。固定IPが必要ならNLB",
      "features": [
        "HTTP/HTTPSのL7負荷分散",
        "パス/ホストベースルーティング",
        "WAF・Cognito認証と連携"
      ],
      "purpose": "HTTP/HTTPSの通信を複数のターゲットへ振り分ける",
      "useCases": "Webアプリの負荷分散、パスやホスト名ごとの振り分け、認証・WAFの付与",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "cloudfront",
      "name": "CloudFront",
      "category": "ネットワーク",
      "tip": "OAC、署名付きURL、エッジキャッシュ。WAFやShieldと組み合わせ",
      "features": [
        "グローバルCDN(エッジキャッシュ)",
        "OACでS3を非公開化",
        "署名付きURL・WAF連携"
      ],
      "purpose": "世界中のエッジから高速にコンテンツを配信する",
      "useCases": "静的サイト配信、動画配信、S3の非公開配信(OAC)、DDoS・WAF対策の前段",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "route53",
      "name": "Route 53",
      "category": "ネットワーク",
      "tip": "ルーティングポリシー(フェイルオーバー/レイテンシー/加重/地理)",
      "features": [
        "高可用なDNS",
        "フェイルオーバー/加重/レイテンシー等のルーティング",
        "ヘルスチェック・Aliasレコード"
      ],
      "purpose": "ドメイン名とIPアドレスを対応づけ、トラフィックを制御する",
      "useCases": "独自ドメイン運用、フェイルオーバー、リージョン間の振り分け、プライベートDNS",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "apigw",
      "name": "API Gateway",
      "category": "ネットワーク",
      "tip": "スロットリング、キャッシュ、Cognito/Lambdaオーソライザー",
      "features": [
        "REST/HTTP/WebSocket APIの公開",
        "スロットリング・キャッシュ",
        "Cognito等で認証"
      ],
      "purpose": "APIの公開・認証・流量制御を一括で行う",
      "useCases": "サーバーレスAPI、外部公開API、モバイルアプリのバックエンド",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "tgw",
      "name": "Transit Gateway",
      "category": "ネットワーク",
      "tip": "多数のVPC/オンプレをハブ&スポークで接続。VPCピアリングは推移的不可",
      "features": [
        "多数のVPC/オンプレを集約するハブ",
        "ルートテーブルで経路を分離",
        "VPN/DXを接続"
      ],
      "purpose": "多数のVPCやオンプレを1か所のハブで接続する",
      "useCases": "マルチVPC・マルチアカウントの接続集約、オンプレとの統合接続",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "dx",
      "name": "Direct Connect",
      "category": "ネットワーク",
      "tip": "専用線。冗長化とVPNバックアップ、Direct Connect Gatewayを理解",
      "features": [
        "オンプレとの専用線接続",
        "安定した帯域・低遅延",
        "冗長化+VPNバックアップが定番"
      ],
      "purpose": "オンプレとAWSを安定した専用線でつなぐ",
      "useCases": "大容量・低遅延のハイブリッド接続、閉域網でのデータ転送",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "vpn",
      "name": "Site-to-Site VPN",
      "category": "ネットワーク",
      "tip": "IPsec。短期間で構築可能。DXのバックアップ経路として定番",
      "features": [
        "インターネット経由のIPsec VPN",
        "短期間で構築可能",
        "2本のトンネルで冗長化"
      ],
      "purpose": "インターネット経由で暗号化された接続を短期間で用意する",
      "useCases": "オンプレ接続の初期構築、Direct Connectのバックアップ経路",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "vpce",
      "name": "VPCエンドポイント",
      "category": "ネットワーク",
      "tip": "ゲートウェイ型(S3/DynamoDB)とインターフェース型(PrivateLink)の違い",
      "features": [
        "インターネットを経由せずAWSへ接続",
        "ゲートウェイ型(S3/DynamoDB)",
        "インターフェース型(PrivateLink)"
      ],
      "purpose": "AWSサービスへ、インターネットを経由せず接続する",
      "useCases": "プライベートサブネットからS3/DynamoDBへ、SaaSやサービスのPrivateLink提供",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "sqs",
      "name": "SQS",
      "category": "アプリ統合",
      "tip": "疎結合・バッファリング。標準とFIFO、DLQ、可視性タイムアウト",
      "features": [
        "フルマネージドのメッセージキュー",
        "標準とFIFO(順序保証)",
        "DLQ・可視性タイムアウト"
      ],
      "purpose": "処理の依頼を一時的にためて、システム同士を疎結合にする",
      "useCases": "非同期処理、急なアクセスの平準化、バッチ処理の取りこぼし防止",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "sns",
      "name": "SNS",
      "category": "アプリ統合",
      "tip": "Pub/Sub。SQSとのファンアウト構成が定番",
      "features": [
        "Pub/Subで通知を配信",
        "Email/SMS/SQS/Lambdaへ送信",
        "SQSとのファンアウト"
      ],
      "purpose": "1つのメッセージを複数の宛先へ同時に配信する",
      "useCases": "アラーム通知、メール/SMS配信、SQSへのファンアウト",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "eventbridge",
      "name": "EventBridge",
      "category": "アプリ統合",
      "tip": "イベント駆動の中心。AWSサービス/SaaSイベントをルールで振り分け",
      "features": [
        "イベントをルールで振り分け",
        "AWS/SaaSのイベントを受信",
        "スケジュール実行(cron)"
      ],
      "purpose": "イベントをルールで判定し、適切な処理へ振り分ける",
      "useCases": "AWSサービスのイベント検知、スケジュール実行、SaaS連携、自動対応",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "stepfn",
      "name": "Step Functions",
      "category": "アプリ統合",
      "tip": "ワークフロー制御。リトライ/並列/人手承認などの長時間処理",
      "features": [
        "ワークフローの制御・可視化",
        "順次/並列/分岐/リトライ",
        "Lambda等と直接統合"
      ],
      "purpose": "複数の処理をつなぐ業務フローを定義・実行する",
      "useCases": "承認フロー、並列処理、リトライ付きのバッチ、サーバーレスのオーケストレーション",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "iam",
      "name": "IAM",
      "category": "セキュリティ",
      "tip": "最小権限、ロール、信頼ポリシー、Permissions Boundary、SCPとの違い",
      "features": [
        "ユーザー/ロール/ポリシー管理",
        "最小権限の原則",
        "ロールで一時認証情報を付与"
      ],
      "purpose": "誰が何を操作できるかを制御する",
      "useCases": "権限設計、ロールによる一時認証、クロスアカウントアクセス",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "kms",
      "name": "KMS",
      "category": "セキュリティ",
      "tip": "CMK/キーポリシー、エンベロープ暗号化、リージョン限定(マルチリージョンキー)",
      "features": [
        "暗号鍵の作成・管理",
        "エンベロープ暗号化",
        "キーポリシーと監査ログ"
      ],
      "purpose": "データを暗号化する鍵を安全に管理する",
      "useCases": "S3/EBS/RDSの暗号化、鍵の利用監査、シークレットの保護",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "waf",
      "name": "WAF",
      "category": "セキュリティ",
      "tip": "SQLi/XSS対策、レートベースルール。ALB/CloudFront/API Gatewayに付与",
      "features": [
        "L7のWebアプリ防御",
        "SQLi/XSS対策・レートベースルール",
        "ALB/CloudFront/API Gatewayに付与"
      ],
      "purpose": "Webアプリへの攻撃を、L7のルールで遮断する",
      "useCases": "SQLi/XSS対策、レート制限、特定IPやGeoのブロック",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "cognito",
      "name": "Cognito",
      "category": "セキュリティ",
      "tip": "ユーザープール(認証)とIDプール(AWS認証情報)の違い",
      "features": [
        "ユーザープール=認証(サインイン)",
        "IDプール=AWS一時認証情報",
        "ソーシャル/SAML連携・MFA"
      ],
      "purpose": "アプリ利用者のサインインと認証を任せる",
      "useCases": "会員サイトのログイン、ソーシャルログイン、モバイルアプリの認証",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "orgs",
      "name": "Organizations",
      "category": "セキュリティ",
      "tip": "SCPによる権限の上限設定。マルチアカウント戦略とControl Tower",
      "features": [
        "複数アカウントの一元管理",
        "OUで階層化・一括請求",
        "SCPで権限の上限を設定"
      ],
      "purpose": "複数のAWSアカウントをまとめて管理・統制する",
      "useCases": "アカウント分離、SCPでの権限の上限設定、一括請求",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "cloudwatch",
      "name": "CloudWatch",
      "category": "運用・管理",
      "tip": "メトリクス/ログ/アラーム。Logs Insights、サブスクリプションフィルター",
      "features": [
        "メトリクス・ログ・アラーム",
        "Logs Insightsでログ分析",
        "アラームでScaling/SNSと連携"
      ],
      "purpose": "システムの状態を監視し、異常を知らせる",
      "useCases": "メトリクス監視、ログ収集・分析、アラームによる通知とスケーリング",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "cloudtrail",
      "name": "CloudTrail",
      "category": "運用・管理",
      "tip": "API操作の監査ログ。組織トレイルとログファイル整合性検証",
      "features": [
        "API操作の監査ログを記録",
        "誰が・いつ・何をしたか追跡",
        "組織トレイルで全アカウント対象"
      ],
      "purpose": "AWS上の操作履歴(誰が何をしたか)を記録する",
      "useCases": "監査証跡、セキュリティ調査、不正操作の検知",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "config",
      "name": "AWS Config",
      "category": "運用・管理",
      "tip": "構成変更の記録とコンプライアンス評価。自動修復はSSM Automation",
      "features": [
        "リソース構成の変更を記録",
        "ルールで準拠状況を評価",
        "自動修復(SSM Automation)"
      ],
      "purpose": "リソース設定の変更履歴と、ルールへの準拠を管理する",
      "useCases": "構成の履歴確認、コンプライアンス評価、違反の自動修復",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "ssm",
      "name": "Systems Manager",
      "category": "運用・管理",
      "tip": "Session Manager、Patch Manager、Parameter Store、Automation",
      "features": [
        "Session Managerで踏み台なし接続",
        "Patch Managerでパッチ適用",
        "Parameter Store・Automation"
      ],
      "purpose": "サーバーの運用作業を一元的に行う",
      "useCases": "踏み台なしの接続、パッチ適用、パラメータ管理、運用の自動化",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "cfn",
      "name": "CloudFormation",
      "category": "運用・管理",
      "tip": "StackSets、ドリフト検出、変更セット、DeletionPolicy",
      "features": [
        "インフラをコード化(IaC)",
        "スタック単位で作成/更新/削除",
        "StackSets・ドリフト検出"
      ],
      "purpose": "インフラ構成をコードで定義し、再現・管理する",
      "useCases": "環境の複製、マルチアカウント展開(StackSets)、構成のバージョン管理",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "codepipeline",
      "name": "CodePipeline",
      "category": "運用・管理",
      "tip": "CI/CDのオーケストレーション。承認アクションやクロスアカウント配信",
      "features": [
        "CI/CDの流れを自動化",
        "ソース→ビルド→デプロイ",
        "承認アクションを挿入可能"
      ],
      "purpose": "ビルドからデプロイまでの流れを自動化する",
      "useCases": "CI/CDパイプラインの構築、承認ステップ付きのリリース",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "codebuild",
      "name": "CodeBuild",
      "category": "運用・管理",
      "tip": "マネージドビルド。buildspec.yml、キャッシュ、VPC内ビルド",
      "features": [
        "マネージドなビルド実行",
        "buildspec.ymlで手順定義",
        "テスト・成果物出力"
      ],
      "purpose": "ビルドとテストを、サーバー管理なしで実行する",
      "useCases": "ソースのビルド、単体テスト、コンテナイメージ作成",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "codedeploy",
      "name": "CodeDeploy",
      "category": "運用・管理",
      "tip": "In-place/Blue-Green、ECS/Lambdaのカナリア/リニア、ロールバック",
      "features": [
        "EC2/Lambda/ECSへ自動デプロイ",
        "In-place・Blue/Green",
        "アラームで自動ロールバック"
      ],
      "purpose": "アプリのデプロイを自動化し、安全に切り替える",
      "useCases": "Blue/Greenデプロイ、カナリアリリース、ロールバック",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "ecr",
      "name": "ECR",
      "category": "運用・管理",
      "tip": "コンテナレジストリ。脆弱性スキャンとクロスリージョンレプリケーション",
      "features": [
        "コンテナイメージのレジストリ",
        "イメージスキャンで脆弱性検出",
        "ライフサイクルで古いイメージ削除"
      ],
      "purpose": "コンテナイメージを安全に保管・配布する",
      "useCases": "ECS/EKSへのイメージ提供、脆弱性スキャン、イメージのライフサイクル管理",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "igw",
      "name": "Internet Gateway",
      "category": "ネットワーク",
      "tip": "VPCとインターネットの出入口。パブリックサブネットのルートに0.0.0.0/0を向ける",
      "features": [
        "VPCにインターネット接続を提供",
        "水平スケールで高可用",
        "パブリックIP/EIPのリソースと双方向通信"
      ],
      "purpose": "VPCとインターネットを接続する出入口を用意する",
      "useCases": "パブリックサブネットのインターネット通信、パブリック公開",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "natgw",
      "name": "NAT Gateway",
      "category": "ネットワーク",
      "tip": "プライベートサブネットから外向きのみIPv4通信。AZごとに冗長化して配置",
      "features": [
        "プライベートサブネットの外向き通信",
        "外部起点の通信は遮断",
        "AZごとに配置して冗長化"
      ],
      "purpose": "プライベートなリソースが、外向きだけインターネットに出られるようにする",
      "useCases": "プライベートサブネットのアップデート取得、外部API呼び出し",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "eigw",
      "name": "Egress-Only IGW",
      "category": "ネットワーク",
      "tip": "IPv6専用の出口。アウトバウンドのみ許可し外部起点の通信は遮断(IPv4のNAT相当)",
      "features": [
        "IPv6のアウトバウンド専用ゲートウェイ",
        "戻り通信は許可・外部起点は遮断",
        "時間・転送の追加課金なし"
      ],
      "purpose": "IPv6で、外向き通信だけを許可する出口を用意する",
      "useCases": "IPv6のプライベートサブネットからの外向き通信",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "internet",
      "name": "インターネット",
      "category": "一般概念",
      "tip": "外部ネットワーク。構成図の外部との境界として配置",
      "features": [
        "外部ネットワークを表す",
        "IGW/CloudFront/Route 53の先に置く",
        "構成図の境界の説明用"
      ],
      "purpose": "構成図で、外部ネットワーク(インターネット)を表す",
      "useCases": "VPCの外側との境界を示す",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "user",
      "name": "ユーザー",
      "category": "一般概念",
      "tip": "エンドユーザーやクライアント端末を表す",
      "features": [
        "エンドユーザー/クライアントを表す",
        "ALB/CloudFront/API Gatewayの前段",
        "認証(Cognito)の起点"
      ],
      "purpose": "構成図で、利用者やクライアント端末を表す",
      "useCases": "アクセスの起点を示す",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "onprem",
      "name": "オンプレミス",
      "category": "一般概念",
      "tip": "自社データセンター。VPN/Direct Connect/TGWで接続",
      "features": [
        "自社データセンターを表す",
        "VPN/Direct Connect/TGWで接続",
        "ハイブリッド構成の起点"
      ],
      "purpose": "構成図で、自社のデータセンターを表す",
      "useCases": "ハイブリッド構成の接続元を示す",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "acm",
      "name": "ACM",
      "category": "セキュリティ",
      "tip": "SSL/TLS証明書の発行・自動更新。CloudFrontで使う証明書はus-east-1で発行",
      "features": [
        "SSL/TLS証明書の発行・管理",
        "自動更新",
        "ALB/CloudFront/API Gatewayに適用"
      ],
      "purpose": "HTTPS用のSSL/TLS証明書を発行・自動更新する",
      "useCases": "ALB/CloudFront/API GatewayのHTTPS化",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "eks",
      "name": "EKS",
      "category": "コンピューティング",
      "tip": "マネージドKubernetes。Kubernetes互換の要件ならEKSを検討。FargateやノードグループでPodを実行",
      "features": [
        "Kubernetesコントロールプレーンの管理",
        "EC2ノード/Fargateで実行",
        "IAMロール(IRSA)でPodの権限を制御"
      ],
      "purpose": "Kubernetesを、AWS上のマネージド環境で動かす",
      "useCases": "K8s互換が必要なコンテナ基盤、マルチクラウド・オンプレとの統一運用",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "beanstalk",
      "name": "Elastic Beanstalk",
      "category": "コンピューティング",
      "tip": "コードをアップロードするだけで環境を構築。ローリング/Blue-Greenデプロイに対応",
      "features": [
        "コードをアップロードするだけでデプロイ",
        "ELB/ASG/RDSを自動構成",
        "ローリング/Blue-Greenデプロイ"
      ],
      "purpose": "アプリのコードを置くだけで、実行環境ごと構築する",
      "useCases": "小規模Webアプリの素早い公開、インフラ構築の省力化",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "ebs",
      "name": "EBS",
      "category": "ストレージ",
      "tip": "EC2用ブロックストレージ。AZ内のみ。スナップショットで別AZ/リージョンへ。gp3/io2の使い分け",
      "features": [
        "EC2用のブロックストレージ(AZ内)",
        "スナップショットで他AZ/リージョンへ複製",
        "gp3/io2などボリュームタイプを選択"
      ],
      "purpose": "EC2につなぐ、サーバー用のディスク(ブロック)を用意する",
      "useCases": "OS・DBのデータ領域、スナップショットによるバックアップ",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "efs",
      "name": "EFS",
      "category": "ストレージ",
      "tip": "複数AZ・複数EC2から共有できるNFS。Linux向けでWindowsにはFSx for Windows",
      "features": [
        "複数EC2から同時に共有するNFS",
        "容量が自動で伸縮",
        "複数AZに冗長保存"
      ],
      "purpose": "複数サーバーから同時に使える共有ファイル領域を持つ",
      "useCases": "Linuxサーバー間のファイル共有、CMSの共有コンテンツ",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "fsx",
      "name": "FSx",
      "category": "ストレージ",
      "tip": "Windows File Server/Lustre/ONTAPなどのマネージドFS。SMB要件はFSx for Windows",
      "features": [
        "Windows/Lustre/ONTAP/OpenZFSのマネージドFS",
        "SMB共有はFSx for Windows",
        "HPCはFSx for Lustre"
      ],
      "purpose": "Windows/高性能計算向けなど、用途別のマネージドファイル基盤を使う",
      "useCases": "Windowsのファイルサーバー(SMB)、HPC(Lustre)、NetApp互換",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "storagegw",
      "name": "Storage Gateway",
      "category": "ストレージ",
      "tip": "オンプレとAWSをつなぐハイブリッドストレージ。ファイル/ボリューム/テープの3種類",
      "features": [
        "オンプレからS3/EBSを利用するゲートウェイ",
        "ファイル/ボリューム/テープの3種",
        "ローカルキャッシュで低遅延"
      ],
      "purpose": "オンプレから、AWSのストレージを使えるようにつなぐ",
      "useCases": "ファイル共有のクラウド化、テープ置き換え、バックアップ先のS3化",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "redshift",
      "name": "Redshift",
      "category": "データベース",
      "tip": "列指向のDWH。大規模分析とBI。SpectrumでS3を直接クエリ",
      "features": [
        "列指向のデータウェアハウス",
        "大規模な分析クエリを高速化",
        "Spectrumで直接S3をクエリ"
      ],
      "purpose": "大量のデータを高速に集計・分析する",
      "useCases": "DWH、BIの分析基盤、S3とあわせた大規模分析",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "kinesis",
      "name": "Kinesis Data Streams",
      "category": "分析",
      "tip": "リアルタイムのストリーム処理。シャードで順序保証、複数コンシューマーとリプレイが可能",
      "features": [
        "ストリームデータの収集・保持",
        "シャードで並列処理・順序保証",
        "複数コンシューマーとリプレイが可能"
      ],
      "purpose": "大量のリアルタイムデータを取り込み、処理する",
      "useCases": "ログ・クリックストリーム、IoTのストリーム処理、リアルタイム分析",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "firehose",
      "name": "Data Firehose",
      "category": "分析",
      "tip": "ストリームをS3/Redshift/OpenSearchへ自動配信(ほぼリアルタイム)。変換はLambda",
      "features": [
        "ストリームをS3/Redshift/OpenSearchへ自動配信",
        "Lambdaでデータ変換",
        "管理不要でスケール"
      ],
      "purpose": "ストリームデータを、保管先へ自動で届ける",
      "useCases": "ログのS3保存、OpenSearchへの取り込み、Redshiftへのロード",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "athena",
      "name": "Athena",
      "category": "分析",
      "tip": "S3のデータをSQLで直接クエリ(サーバーレス)。Parquetとパーティションでコスト削減",
      "features": [
        "S3のデータをSQLで直接クエリ",
        "サーバーレス・スキャン量課金",
        "Parquet/パーティションでコスト削減"
      ],
      "purpose": "S3のデータを、サーバー構築なしにSQLで分析する",
      "useCases": "ログ分析、アドホック分析、データレイクのクエリ",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "glue",
      "name": "AWS Glue",
      "category": "分析",
      "tip": "サーバーレスETLとデータカタログ。クローラーでスキーマを自動検出",
      "features": [
        "サーバーレスのETLジョブ",
        "データカタログでスキーマを管理",
        "クローラーでスキーマ自動検出"
      ],
      "purpose": "データの変換(ETL)と、データの目録(カタログ)を管理する",
      "useCases": "S3データの整形、スキーマ管理、分析前処理",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "opensearch",
      "name": "OpenSearch Service",
      "category": "分析",
      "tip": "全文検索とログ分析。Firehose/CloudWatch Logsから取り込む構成が定番",
      "features": [
        "全文検索とログ分析",
        "ダッシュボードで可視化",
        "Multi-AZでの高可用構成"
      ],
      "purpose": "データの全文検索と、ログの分析・可視化を行う",
      "useCases": "ログ分析、サイト内検索、リアルタイムの監視ダッシュボード",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "nlb",
      "name": "NLB",
      "category": "ネットワーク",
      "tip": "L4の超高性能ロードバランサー。固定IP(EIP)が使え、PrivateLinkの前段にも使う",
      "features": [
        "L4(TCP/UDP/TLS)の超高性能負荷分散",
        "AZごとに固定IP(EIP)が使える",
        "PrivateLinkの前段に利用"
      ],
      "purpose": "TCP/UDPの通信を、高速かつ固定IPで振り分ける",
      "useCases": "固定IPが必要な接続、超低遅延、PrivateLinkの前段",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "globalacc",
      "name": "Global Accelerator",
      "category": "ネットワーク",
      "tip": "エニーキャストIPでAWSバックボーンへ誘導。キャッシュなし。TCP/UDPや高速フェイルオーバー",
      "features": [
        "エニーキャストIPで最寄りのエッジへ",
        "AWSバックボーンで低遅延",
        "リージョン間のフェイルオーバー"
      ],
      "purpose": "世界中のユーザーを、最寄りの正常なエンドポイントへ誘導する",
      "useCases": "グローバル公開サービスの高速化、リージョン間の高速フェイルオーバー",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "vpcpeer",
      "name": "VPCピアリング",
      "category": "ネットワーク",
      "tip": "2つのVPCを1対1で接続。CIDR重複不可・推移的ルーティング不可。多数ならTGW",
      "features": [
        "2つのVPCを1対1で接続",
        "リージョン間・アカウント間も可",
        "CIDR重複不可・推移的ルーティング不可"
      ],
      "purpose": "2つのVPCを、1対1でプライベート接続する",
      "useCases": "少数のVPC間通信、アカウント間・リージョン間の接続",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "secrets",
      "name": "Secrets Manager",
      "category": "セキュリティ",
      "tip": "DB認証情報などの保管と自動ローテーション。Parameter Storeとの違いはローテーション機能",
      "features": [
        "DB認証情報・APIキーの保管",
        "自動ローテーション(Lambda)",
        "KMSで暗号化"
      ],
      "purpose": "パスワードやAPIキーを安全に保管し、自動で更新する",
      "useCases": "DB認証情報の保管、ローテーション、アプリからの安全な取得",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "shield",
      "name": "Shield",
      "category": "セキュリティ",
      "tip": "DDoS対策。Standardは自動・無料、AdvancedはL7対応・コスト保護・DRTサポート",
      "features": [
        "DDoS防御(Standardは自動・無料)",
        "Advancedは追加防御とDRTサポート",
        "コスト保護"
      ],
      "purpose": "DDoS攻撃からシステムを守る",
      "useCases": "DDoS対策(Standardは自動適用)、攻撃時の追加支援(Advanced)",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "guardduty",
      "name": "GuardDuty",
      "category": "セキュリティ",
      "tip": "CloudTrail/VPCフローログ/DNSログから脅威を検知。有効化だけで使える",
      "features": [
        "ログから脅威を自動検知",
        "CloudTrail/VPCフローログ/DNSログを分析",
        "有効化のみでエージェント不要"
      ],
      "purpose": "ログを分析して、不審な動きや脅威を自動で検知する",
      "useCases": "不正アクセス・マルウェア・認証情報の漏えい検知",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "sso",
      "name": "IAM Identity Center",
      "category": "セキュリティ",
      "tip": "複数アカウント/アプリへのシングルサインオン。外部IdP(AD/SAML)と連携",
      "features": [
        "複数アカウント/アプリへのシングルサインオン",
        "外部IdP(AD/SAML)と連携",
        "権限セットでアカウント権限を一括管理"
      ],
      "purpose": "複数のアカウントやアプリへ、1回のログインで入れるようにする",
      "useCases": "社員のAWSアカウントへのログイン統合、外部IdP連携",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "controltower",
      "name": "Control Tower",
      "category": "セキュリティ",
      "tip": "マルチアカウント環境の自動構築とガードレール。Organizationsが土台",
      "features": [
        "マルチアカウント環境の自動構築",
        "ガードレール(予防/検出)",
        "アカウントファクトリー"
      ],
      "purpose": "安全なマルチアカウント環境を、ベストプラクティスで自動構築する",
      "useCases": "新規アカウントの量産、ガードレールによる統制",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "xray",
      "name": "X-Ray",
      "category": "運用・管理",
      "tip": "分散アプリのトレース。マイクロサービスのレイテンシーとボトルネックを可視化",
      "features": [
        "分散アプリのリクエストをトレース",
        "サービスマップで依存関係を可視化",
        "レイテンシーのボトルネックを特定"
      ],
      "purpose": "分散アプリの処理の流れを追跡し、遅延の原因を探す",
      "useCases": "マイクロサービスのボトルネック特定、依存関係の可視化",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "trustedadvisor",
      "name": "Trusted Advisor",
      "category": "運用・管理",
      "tip": "コスト・セキュリティ・耐障害性などのベストプラクティスを自動チェック",
      "features": [
        "コスト/セキュリティ/耐障害性等の自動チェック",
        "ベストプラクティスの推奨事項",
        "全チェックはBusiness以上のサポート"
      ],
      "purpose": "AWS環境を自動チェックし、改善点を提案する",
      "useCases": "コスト削減、セキュリティ・耐障害性の定期点検",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "mq",
      "name": "Amazon MQ",
      "category": "アプリ統合",
      "tip": "ActiveMQ/RabbitMQのマネージド。既存アプリをMQTT/AMQPのまま移行する用途",
      "features": [
        "ActiveMQ/RabbitMQのマネージド",
        "既存のMQTT/AMQP/JMSアプリを移行",
        "Multi-AZでの高可用"
      ],
      "purpose": "既存のメッセージング(ActiveMQ/RabbitMQ)を、そのままAWSで動かす",
      "useCases": "MQTT/AMQP/JMSを使うオンプレアプリの移行",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "dms",
      "name": "DMS",
      "category": "移行",
      "tip": "DBの移行(CDCで継続レプリケーション)。異種DBはSCTでスキーマ変換と併用",
      "features": [
        "DBの移行(同種・異種)",
        "CDCで継続的にレプリケーション",
        "SCTでスキーマ変換と併用"
      ],
      "purpose": "データベースを、止めずにAWSへ移行する",
      "useCases": "オンプレDBのAWS移行、異種DB間の移行(SCT併用)",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "datasync",
      "name": "DataSync",
      "category": "移行",
      "tip": "オンプレ/他クラウドとS3/EFS/FSx間の自動データ転送。差分同期と帯域制御",
      "features": [
        "オンプレ/他クラウドとS3・EFS・FSxのデータ転送",
        "差分同期と整合性検証",
        "帯域制御・スケジュール実行"
      ],
      "purpose": "オンプレやほかのクラウドから、AWSへデータを自動転送する",
      "useCases": "ファイルサーバーのS3/EFS移行、定期的な差分同期",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "snowball",
      "name": "Snowball Edge",
      "category": "移行",
      "tip": "物理デバイスによる大容量データ移行。回線が細い・期間が短いときに有効。利用可能な提供形態・新規利用可否は公式情報で確認する",
      "features": [
        "物理デバイスで大容量データを移行",
        "エッジでの処理も可能",
        "回線が細い・期間が短いときに有効"
      ],
      "purpose": "回線では運べない大容量データを、物理デバイスで運ぶ",
      "useCases": "数十TB〜PB級の移行、回線が細い拠点のデータ搬入",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "mgn",
      "name": "Application Migration Service",
      "category": "移行",
      "tip": "サーバーをそのままAWSへ移行(リホスト)。継続レプリケーションと切替前テスト",
      "features": [
        "サーバーをそのままAWSへ移行(リホスト)",
        "継続的なブロックレベルレプリケーション",
        "切替前にテスト起動"
      ],
      "purpose": "サーバーをそのまま(リホスト)AWSへ移行する",
      "useCases": "オンプレサーバーのEC2への移行、切替前のテスト起動",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "fargate",
      "name": "Fargate",
      "category": "コンピューティング",
      "tip": "サーバー管理不要のコンテナ実行基盤",
      "features": [
        "ECS/EKSで利用",
        "タスク単位で課金",
        "サーバー管理が不要"
      ],
      "purpose": "コンテナを、サーバー管理なしで実行する",
      "useCases": "ECS/EKSの運用省力化、タスク単位の課金",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "batch",
      "name": "AWS Batch",
      "category": "コンピューティング",
      "tip": "バッチジョブを自動でスケジュール・実行",
      "features": [
        "ジョブキューで管理",
        "EC2/スポット/Fargateで実行",
        "大量の並列処理"
      ],
      "purpose": "大量のバッチジョブを、自動で計算資源を確保して実行する",
      "useCases": "科学技術計算、夜間バッチ、大量並列処理",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "apprunner",
      "name": "App Runner",
      "category": "コンピューティング",
      "tip": "コンテナ/ソースからWebアプリを簡単公開",
      "features": [
        "ソースかイメージから自動デプロイ",
        "自動スケール",
        "HTTPS対応"
      ],
      "purpose": "コンテナやソースから、Webアプリを最短で公開する",
      "useCases": "小規模Web/APIの素早い公開、インフラ知識を最小限に",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "glacier",
      "name": "S3 Glacier",
      "category": "ストレージ",
      "tip": "低頻度アクセスのアーカイブ向けS3クラス",
      "features": [
        "Instant/Flexible/Deep Archive",
        "低コストで長期保管",
        "取り出し時間で選択"
      ],
      "purpose": "ほとんど読まないデータを、低コストで長期保管する",
      "useCases": "コンプライアンス用の長期保存、アーカイブ",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "neptune",
      "name": "Neptune",
      "category": "データベース",
      "tip": "グラフデータベース",
      "features": [
        "関係性のクエリが高速",
        "Gremlin/SPARQL対応",
        "Multi-AZ構成"
      ],
      "purpose": "データ同士の関係(つながり)を、高速に検索する",
      "useCases": "SNSの関係分析、不正検知、レコメンド",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "timestream",
      "name": "Timestream",
      "category": "データベース",
      "tip": "時系列データ専用のサーバーレスDB",
      "features": [
        "IoT/メトリクスの時系列を保存",
        "自動で階層化",
        "SQLでクエリ"
      ],
      "purpose": "時間とともに増える計測データを、効率よく保存・分析する",
      "useCases": "IoTセンサー、システムメトリクス",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "emr",
      "name": "EMR",
      "category": "分析",
      "tip": "Hadoop/Sparkのビッグデータ処理基盤",
      "features": [
        "Spark/Hive/Prestoを実行",
        "スポットでコスト削減",
        "S3をデータレイクに利用"
      ],
      "purpose": "Hadoop/Sparkなどで、大規模データを分散処理する",
      "useCases": "ビッグデータ処理、機械学習の前処理",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "msk",
      "name": "MSK",
      "category": "分析",
      "tip": "マネージドApache Kafka",
      "features": [
        "Kafkaクラスターを管理",
        "Multi-AZで高可用",
        "既存Kafkaアプリを移行"
      ],
      "purpose": "Apache Kafkaを、マネージドで使う",
      "useCases": "既存Kafkaアプリの移行、ストリーミング基盤",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "quicksight",
      "name": "QuickSight",
      "category": "分析",
      "tip": "サーバーレスのBI・可視化サービス",
      "features": [
        "ダッシュボード作成",
        "SPICEで高速化",
        "アプリへの埋め込み"
      ],
      "purpose": "データをグラフやダッシュボードで可視化する",
      "useCases": "BIレポート、経営ダッシュボード、アプリへの埋め込み",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "lakeformation",
      "name": "Lake Formation",
      "category": "分析",
      "tip": "データレイクの構築とアクセス制御",
      "features": [
        "S3データレイクの権限管理",
        "列/行レベルの制御",
        "Glueカタログと連携"
      ],
      "purpose": "データレイクの権限を、列・行単位で細かく制御する",
      "useCases": "S3データレイクの統制、部門ごとのデータ共有",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "networkfirewall",
      "name": "Network Firewall",
      "category": "ネットワーク",
      "tip": "VPC向けのマネージドファイアウォール",
      "features": [
        "ステートフル/ステートレス検査",
        "IPSとドメインフィルタ",
        "VPC境界で防御"
      ],
      "purpose": "VPCの出入りの通信を、細かく検査・制御する",
      "useCases": "ドメインフィルタ、IPS、VPC境界の防御",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "inspector",
      "name": "Inspector",
      "category": "セキュリティ",
      "tip": "脆弱性を自動スキャン",
      "features": [
        "EC2/ECR/Lambdaをスキャン",
        "CVEを検出",
        "Security Hubへ集約"
      ],
      "purpose": "EC2やコンテナの脆弱性を、自動でスキャンする",
      "useCases": "CVE検出、パッチ適用の優先度付け",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "macie",
      "name": "Macie",
      "category": "セキュリティ",
      "tip": "S3内の機密データを自動検出",
      "features": [
        "個人情報(PII)を検出",
        "S3バケットを評価",
        "結果をEventBridgeへ"
      ],
      "purpose": "S3内の個人情報などの機密データを、自動で見つける",
      "useCases": "PII検出、データ漏えいリスクの把握",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "securityhub",
      "name": "Security Hub",
      "category": "セキュリティ",
      "tip": "セキュリティ検知結果の一元管理",
      "features": [
        "GuardDuty/Inspector等を集約",
        "コンプライアンスチェック",
        "複数アカウントを統合"
      ],
      "purpose": "セキュリティ検知結果を集約し、状態を一元的に把握する",
      "useCases": "複数アカウントのセキュリティ統合、標準への準拠確認",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "cloudhsm",
      "name": "CloudHSM",
      "category": "セキュリティ",
      "tip": "専用ハードウェアで鍵を管理",
      "features": [
        "FIPS 140-2 Level 3",
        "顧客が鍵を完全管理",
        "KMSのカスタムキーストアに利用"
      ],
      "purpose": "専用ハードウェアで、鍵を自分で完全に管理する",
      "useCases": "厳格な規制対応、自社管理の鍵が必要な要件",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "directory",
      "name": "Directory Service",
      "category": "セキュリティ",
      "tip": "マネージドなActive Directory",
      "features": [
        "Managed Microsoft AD",
        "AD Connector",
        "オンプレADと連携"
      ],
      "purpose": "Active Directoryを、マネージドで使う",
      "useCases": "Windowsワークロードのドメイン参加、オンプレADとの連携",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "appsync",
      "name": "AppSync",
      "category": "アプリ統合",
      "tip": "マネージドなGraphQL API",
      "features": [
        "GraphQLとリアルタイム購読",
        "DynamoDB/Lambdaに接続",
        "Cognito認証"
      ],
      "purpose": "GraphQLのAPIを、サーバーレスで提供する",
      "useCases": "モバイル/Webのリアルタイム更新、複数データ源の統合",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "ses",
      "name": "SES",
      "category": "アプリ統合",
      "tip": "大量メールの送信サービス",
      "features": [
        "トランザクション/マーケティングメール",
        "SMTPまたはAPI",
        "送信評価の管理"
      ],
      "purpose": "大量のメールを、確実に送受信する",
      "useCases": "通知メール、マーケティングメール、メール受信処理",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "servicecatalog",
      "name": "Service Catalog",
      "category": "運用・管理",
      "tip": "承認済みリソースをカタログ化して提供",
      "features": [
        "CloudFormationテンプレートを配布",
        "ガバナンスの統制",
        "セルフサービス提供"
      ],
      "purpose": "承認済みのAWS構成を、セルフサービスで提供する",
      "useCases": "ガバナンスを保った環境提供、標準構成の配布",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "ce",
      "name": "Cost Explorer",
      "category": "運用・管理",
      "tip": "コストと使用量の可視化・予測",
      "features": [
        "コストの推移を分析",
        "予測とRI推奨",
        "タグで分類"
      ],
      "purpose": "AWSのコストと使用量を、可視化・予測する",
      "useCases": "コスト分析、タグ別集計、削減余地の発見",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "budgets",
      "name": "AWS Budgets",
      "category": "運用・管理",
      "tip": "予算を設定し超過を通知",
      "features": [
        "コスト/使用量の予算",
        "しきい値アラート",
        "Savings Plansの利用率"
      ],
      "purpose": "予算を決めて、超えそうなときに知らせる",
      "useCases": "コスト超過の早期検知、利用率のアラート",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "transfer",
      "name": "Transfer Family",
      "category": "移行",
      "tip": "SFTP/FTPSでS3/EFSへファイル転送",
      "features": [
        "SFTP/FTPS/FTP対応",
        "S3/EFSへ直接保存",
        "AD等で認証"
      ],
      "purpose": "SFTP/FTPSで、S3/EFSへファイル転送できるようにする",
      "useCases": "取引先とのファイル授受、既存SFTP運用の移行",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "migrationhub",
      "name": "Migration Hub",
      "category": "移行",
      "tip": "移行の進捗を一元管理",
      "features": [
        "移行ツールの進捗を集約",
        "サーバーの検出と評価",
        "移行計画の作成"
      ],
      "purpose": "複数の移行作業の進捗を、一か所で管理する",
      "useCases": "大規模移行の計画・進捗管理",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "bedrock",
      "name": "Bedrock",
      "category": "AI・機械学習",
      "tip": "生成AIの基盤モデルをAPIで利用",
      "features": [
        "複数の基盤モデルから選択",
        "RAG(ナレッジベース)",
        "ガードレール"
      ],
      "purpose": "生成AIの基盤モデルを、APIで使う",
      "useCases": "チャットボット、文章生成・要約、RAG(社内文書の検索回答)",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "sagemaker",
      "name": "SageMaker",
      "category": "AI・機械学習",
      "tip": "機械学習の開発・学習・デプロイ基盤",
      "features": [
        "ノートブック/学習/推論",
        "マネージドな学習ジョブ",
        "モデルのデプロイ"
      ],
      "purpose": "機械学習のモデルを、開発・学習・デプロイする",
      "useCases": "需要予測、分類・推論、MLOps",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "rekognition",
      "name": "Rekognition",
      "category": "AI・機械学習",
      "tip": "画像・動画の分析AI",
      "features": [
        "物体・顔の検出",
        "不適切コンテンツの検出",
        "API呼び出しのみで利用"
      ],
      "purpose": "画像・動画の内容を、AIで分析する",
      "useCases": "顔認識、物体検出、不適切コンテンツの検出",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "textract",
      "name": "Textract",
      "category": "AI・機械学習",
      "tip": "文書から文字・表を抽出",
      "features": [
        "OCRと表/フォームの抽出",
        "PDF/画像に対応",
        "手書き文字にも対応"
      ],
      "purpose": "文書から、文字や表を自動で読み取る",
      "useCases": "帳票のデータ化、PDFからの情報抽出",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "transcribe",
      "name": "Transcribe",
      "category": "AI・機械学習",
      "tip": "音声をテキストへ変換",
      "features": [
        "音声認識(文字起こし)",
        "リアルタイム/バッチ",
        "話者の識別"
      ],
      "purpose": "音声を、テキストに変換する",
      "useCases": "会議の議事録、コールセンターの通話分析",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "iotcore",
      "name": "IoT Core",
      "category": "IoT・エンドユーザー",
      "tip": "IoTデバイスの接続とメッセージ基盤",
      "features": [
        "MQTTでデバイス接続",
        "ルールエンジン",
        "デバイスシャドウ"
      ],
      "purpose": "IoTデバイスを、安全にAWSへ接続する",
      "useCases": "センサーデータの収集、デバイスの遠隔制御",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "connect",
      "name": "Amazon Connect",
      "category": "IoT・エンドユーザー",
      "tip": "クラウド型のコンタクトセンター",
      "features": [
        "電話/チャット対応",
        "Lambdaで拡張",
        "通話の録音と分析"
      ],
      "purpose": "クラウド型のコンタクトセンターを構築する",
      "useCases": "電話・チャット窓口、通話の録音と分析",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "fwm",
      "name": "Firewall Manager",
      "category": "セキュリティ",
      "tip": "組織全体やOU単位でセキュリティポリシーを一括適用。WAF・Shield Advanced・SG・Network Firewallなどを統制",
      "features": [
        "組織全体や特定OUを対象に、追加アカウントにもセキュリティポリシー(セキュリティ上のルール)を自動適用・伝播できる",
        "WAFルール・Shield Advanced・セキュリティグループ・Network Firewall・DNS Firewallなどのポリシーを一元管理",
        "Organizationsと連携し、新規アカウントにも自動で適用"
      ],
      "purpose": "複数アカウントのファイアウォール系ルールを、1か所から一括で適用・統制する",
      "useCases": "組織全体のWAFルールの統一、セキュリティグループの標準化、新規アカウントへの自動適用",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "grafana",
      "name": "Grafana",
      "category": "運用・管理",
      "tip": "オープンソースの監視・ダッシュボードツール。AWSではManaged Grafanaで利用できる",
      "features": [
        "アプリケーションが正常に動作しているかを、グラフや数値としてリアルタイムに可視化する",
        "オープンソースの監視・ダッシュボードツール",
        "さまざまなデータソースを1つの画面にまとめて表示できる"
      ],
      "purpose": "システムの状態を、グラフや数値でわかりやすく可視化する",
      "useCases": "運用監視ダッシュボード、複数データソースの横断表示",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "mgrafana",
      "name": "Managed Grafana",
      "category": "運用・管理",
      "tip": "Grafanaをフルマネージドで提供。CloudWatch/X-Rayなどを可視化",
      "features": [
        "Grafanaをフルマネージドで提供するサービス",
        "CloudWatch・X-Ray・Timestream・OpenSearchなどをデータソースにして可視化",
        "サーバーの構築・パッチ適用などの運用が不要"
      ],
      "purpose": "Grafanaの運用(構築・パッチ・可用性)をAWSに任せて使う",
      "useCases": "CloudWatchなどのメトリクス可視化、チームでのダッシュボード共有",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "lambdaedge",
      "name": "Lambda@Edge",
      "category": "ネットワーク",
      "tip": "CloudFrontのエッジロケーションでコードを実行。認証・URL書き換え・ヘッダー操作など",
      "features": [
        "CloudFrontのキャッシュサーバー(エッジロケーション)の拠点で、直接プログラムを実行できる",
        "ビューワーリクエスト/レスポンス、オリジンリクエスト/レスポンスのイベントで起動",
        "認証・URL書き換え・ヘッダー操作・A/Bテストなどをエッジで処理"
      ],
      "purpose": "ユーザーに近いエッジで、リクエスト/レスポンスを加工・制御する",
      "useCases": "エッジでの認証、URLの書き換え・リダイレクト、ヘッダー操作、A/Bテスト",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "rdsproxy",
      "name": "RDS Proxy",
      "category": "データベース",
      "tip": "RDS/Auroraの前段で接続をプール。Lambdaなどの大量接続とフェイルオーバーに強くする",
      "features": [
        "AuroraやRDSの前段に配置するフルマネージドのデータベースプロキシ",
        "接続をプールして多重化し、DBの接続数の急増を抑える",
        "フェイルオーバー時にもアプリの接続を維持し、切り替え時間を短縮",
        "IAM認証・Secrets Managerの認証情報を利用できる"
      ],
      "purpose": "DB接続を集約して、接続数の枯渇とフェイルオーバー時の影響を減らす",
      "useCases": "Lambdaなど大量の短命な接続、接続数が多いアプリ、フェイルオーバー時間の短縮",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    },
    {
      "id": "dax",
      "name": "DynamoDB Accelerator(DAX)",
      "category": "データベース",
      "tip": "DynamoDB向けの読み取りキャッシュ。DAX対応クライアント、ネットワーク、アクセス制御も設計する",
      "features": [
        "DynamoDB専用に設計された、フルマネージドで高可用なインメモリキャッシュ",
        "読み取りレイテンシーをミリ秒未満へ短縮する要件に直接応える",
        "DAX対応クライアントを使用する。VPC内の到達性、認証、利用するAPIの対応状況も確認する"
      ],
      "purpose": "DynamoDBの読み取りを、ミリ秒未満(マイクロ秒)に高速化する",
      "useCases": "読み取りが多いワークロード、同じデータを繰り返し読むアプリ、ゲーム・ランキング",
      "provenance": "AWS学習ノート.html / 教材ドラフト・最新仕様の専門家レビュー未実施"
    }
  ],
  "edges": [
    {
      "from": "ec2",
      "to": "alb",
      "label": "負荷分散の対象"
    },
    {
      "from": "ec2",
      "to": "asg",
      "label": "台数を自動増減"
    },
    {
      "from": "ec2",
      "to": "vpc",
      "label": "VPC内に配置"
    },
    {
      "from": "asg",
      "to": "ec2",
      "label": "管理対象"
    },
    {
      "from": "asg",
      "to": "alb",
      "label": "ALBに登録"
    },
    {
      "from": "asg",
      "to": "cloudwatch",
      "label": "指標で拡張"
    },
    {
      "from": "lambda",
      "to": "apigw",
      "label": "APIから呼出"
    },
    {
      "from": "lambda",
      "to": "sqs",
      "label": "キューを処理"
    },
    {
      "from": "lambda",
      "to": "dynamodb",
      "label": "データ読み書き"
    },
    {
      "from": "lambda",
      "to": "eventbridge",
      "label": "イベントで起動"
    },
    {
      "from": "ecs",
      "to": "alb",
      "label": "サービス公開"
    },
    {
      "from": "ecs",
      "to": "ecr",
      "label": "イメージ取得"
    },
    {
      "from": "ecs",
      "to": "codedeploy",
      "label": "Blue/Green配備"
    },
    {
      "from": "s3",
      "to": "cloudfront",
      "label": "配信元"
    },
    {
      "from": "s3",
      "to": "lambda",
      "label": "イベント通知"
    },
    {
      "from": "s3",
      "to": "kms",
      "label": "SSE-KMS暗号化"
    },
    {
      "from": "s3",
      "to": "vpce",
      "label": "非インターネット接続"
    },
    {
      "from": "backup",
      "to": "rds",
      "label": "バックアップ対象"
    },
    {
      "from": "backup",
      "to": "dynamodb",
      "label": "バックアップ対象"
    },
    {
      "from": "backup",
      "to": "s3",
      "label": "保管先"
    },
    {
      "from": "rds",
      "to": "backup",
      "label": "一元バックアップ"
    },
    {
      "from": "rds",
      "to": "kms",
      "label": "暗号化"
    },
    {
      "from": "rds",
      "to": "elasticache",
      "label": "読み取り軽減"
    },
    {
      "from": "aurora",
      "to": "route53",
      "label": "DR切替"
    },
    {
      "from": "aurora",
      "to": "kms",
      "label": "暗号化"
    },
    {
      "from": "aurora",
      "to": "backup",
      "label": "バックアップ"
    },
    {
      "from": "dynamodb",
      "to": "lambda",
      "label": "Streamsで処理"
    },
    {
      "from": "dynamodb",
      "to": "apigw",
      "label": "APIのデータ層"
    },
    {
      "from": "dynamodb",
      "to": "backup",
      "label": "バックアップ"
    },
    {
      "from": "elasticache",
      "to": "rds",
      "label": "DB負荷を軽減"
    },
    {
      "from": "elasticache",
      "to": "dynamodb",
      "label": "読み取り高速化"
    },
    {
      "from": "elasticache",
      "to": "ec2",
      "label": "セッション保管"
    },
    {
      "from": "vpc",
      "to": "igw",
      "label": "インターネット接続"
    },
    {
      "from": "vpc",
      "to": "natgw",
      "label": "外向き通信"
    },
    {
      "from": "vpc",
      "to": "vpce",
      "label": "AWSサービス接続"
    },
    {
      "from": "vpc",
      "to": "tgw",
      "label": "多VPC接続"
    },
    {
      "from": "alb",
      "to": "ec2",
      "label": "ターゲット"
    },
    {
      "from": "alb",
      "to": "ecs",
      "label": "ターゲット"
    },
    {
      "from": "alb",
      "to": "waf",
      "label": "L7防御"
    },
    {
      "from": "alb",
      "to": "acm",
      "label": "HTTPS証明書"
    },
    {
      "from": "alb",
      "to": "cognito",
      "label": "認証連携"
    },
    {
      "from": "cloudfront",
      "to": "s3",
      "label": "オリジン"
    },
    {
      "from": "cloudfront",
      "to": "alb",
      "label": "オリジン"
    },
    {
      "from": "cloudfront",
      "to": "waf",
      "label": "L7防御"
    },
    {
      "from": "cloudfront",
      "to": "acm",
      "label": "HTTPS証明書"
    },
    {
      "from": "route53",
      "to": "cloudfront",
      "label": "Aliasで向ける"
    },
    {
      "from": "route53",
      "to": "alb",
      "label": "Aliasで向ける"
    },
    {
      "from": "route53",
      "to": "vpc",
      "label": "プライベートゾーン"
    },
    {
      "from": "apigw",
      "to": "lambda",
      "label": "バックエンド"
    },
    {
      "from": "apigw",
      "to": "cognito",
      "label": "認証"
    },
    {
      "from": "apigw",
      "to": "waf",
      "label": "防御"
    },
    {
      "from": "tgw",
      "to": "vpc",
      "label": "VPCを接続"
    },
    {
      "from": "tgw",
      "to": "dx",
      "label": "オンプレ接続"
    },
    {
      "from": "tgw",
      "to": "vpn",
      "label": "オンプレ接続"
    },
    {
      "from": "dx",
      "to": "tgw",
      "label": "ハブ接続"
    },
    {
      "from": "dx",
      "to": "vpn",
      "label": "バックアップ"
    },
    {
      "from": "dx",
      "to": "onprem",
      "label": "専用線"
    },
    {
      "from": "vpn",
      "to": "tgw",
      "label": "接続先"
    },
    {
      "from": "vpn",
      "to": "dx",
      "label": "冗長化"
    },
    {
      "from": "vpn",
      "to": "onprem",
      "label": "IPsec接続"
    },
    {
      "from": "vpce",
      "to": "s3",
      "label": "ゲートウェイ型"
    },
    {
      "from": "vpce",
      "to": "dynamodb",
      "label": "ゲートウェイ型"
    },
    {
      "from": "vpce",
      "to": "vpc",
      "label": "VPC内に作成"
    },
    {
      "from": "sqs",
      "to": "lambda",
      "label": "消費側"
    },
    {
      "from": "sqs",
      "to": "sns",
      "label": "ファンアウト"
    },
    {
      "from": "sqs",
      "to": "s3",
      "label": "通知先"
    },
    {
      "from": "sns",
      "to": "sqs",
      "label": "ファンアウト"
    },
    {
      "from": "sns",
      "to": "lambda",
      "label": "通知先"
    },
    {
      "from": "sns",
      "to": "eventbridge",
      "label": "イベント連携"
    },
    {
      "from": "eventbridge",
      "to": "lambda",
      "label": "ターゲット"
    },
    {
      "from": "eventbridge",
      "to": "sns",
      "label": "通知"
    },
    {
      "from": "eventbridge",
      "to": "stepfn",
      "label": "ターゲット"
    },
    {
      "from": "eventbridge",
      "to": "config",
      "label": "違反を検知"
    },
    {
      "from": "stepfn",
      "to": "lambda",
      "label": "処理を実行"
    },
    {
      "from": "stepfn",
      "to": "sqs",
      "label": "非同期連携"
    },
    {
      "from": "stepfn",
      "to": "eventbridge",
      "label": "起動元"
    },
    {
      "from": "iam",
      "to": "lambda",
      "label": "実行ロール"
    },
    {
      "from": "iam",
      "to": "ec2",
      "label": "インスタンスプロファイル"
    },
    {
      "from": "iam",
      "to": "orgs",
      "label": "SCPと併用"
    },
    {
      "from": "kms",
      "to": "s3",
      "label": "暗号化"
    },
    {
      "from": "kms",
      "to": "rds",
      "label": "暗号化"
    },
    {
      "from": "kms",
      "to": "cloudtrail",
      "label": "鍵利用を記録"
    },
    {
      "from": "waf",
      "to": "alb",
      "label": "付与先"
    },
    {
      "from": "waf",
      "to": "cloudfront",
      "label": "付与先"
    },
    {
      "from": "waf",
      "to": "apigw",
      "label": "付与先"
    },
    {
      "from": "cognito",
      "to": "apigw",
      "label": "認証"
    },
    {
      "from": "cognito",
      "to": "alb",
      "label": "認証アクション"
    },
    {
      "from": "cognito",
      "to": "iam",
      "label": "一時認証情報"
    },
    {
      "from": "acm",
      "to": "alb",
      "label": "証明書"
    },
    {
      "from": "acm",
      "to": "cloudfront",
      "label": "証明書"
    },
    {
      "from": "acm",
      "to": "apigw",
      "label": "証明書"
    },
    {
      "from": "orgs",
      "to": "iam",
      "label": "SCPで上限"
    },
    {
      "from": "orgs",
      "to": "cloudtrail",
      "label": "組織トレイル"
    },
    {
      "from": "orgs",
      "to": "config",
      "label": "組織ルール"
    },
    {
      "from": "cloudwatch",
      "to": "asg",
      "label": "スケーリング指標"
    },
    {
      "from": "cloudwatch",
      "to": "sns",
      "label": "アラーム通知"
    },
    {
      "from": "cloudwatch",
      "to": "lambda",
      "label": "ログ・指標を処理"
    },
    {
      "from": "cloudtrail",
      "to": "s3",
      "label": "ログ保管"
    },
    {
      "from": "cloudtrail",
      "to": "kms",
      "label": "ログ暗号化"
    },
    {
      "from": "cloudtrail",
      "to": "eventbridge",
      "label": "API操作の検知"
    },
    {
      "from": "config",
      "to": "eventbridge",
      "label": "違反を通知"
    },
    {
      "from": "config",
      "to": "ssm",
      "label": "自動修復"
    },
    {
      "from": "config",
      "to": "s3",
      "label": "履歴保管"
    },
    {
      "from": "ssm",
      "to": "ec2",
      "label": "管理対象"
    },
    {
      "from": "ssm",
      "to": "config",
      "label": "修復アクション"
    },
    {
      "from": "ssm",
      "to": "iam",
      "label": "権限"
    },
    {
      "from": "cfn",
      "to": "codepipeline",
      "label": "デプロイ段階"
    },
    {
      "from": "cfn",
      "to": "vpc",
      "label": "リソース作成"
    },
    {
      "from": "cfn",
      "to": "orgs",
      "label": "StackSets展開"
    },
    {
      "from": "codepipeline",
      "to": "codebuild",
      "label": "ビルド"
    },
    {
      "from": "codepipeline",
      "to": "codedeploy",
      "label": "デプロイ"
    },
    {
      "from": "codepipeline",
      "to": "cfn",
      "label": "IaC展開"
    },
    {
      "from": "codebuild",
      "to": "ecr",
      "label": "イメージをpush"
    },
    {
      "from": "codebuild",
      "to": "s3",
      "label": "成果物保管"
    },
    {
      "from": "codebuild",
      "to": "codepipeline",
      "label": "ステージ"
    },
    {
      "from": "codedeploy",
      "to": "ecs",
      "label": "Blue/Green"
    },
    {
      "from": "codedeploy",
      "to": "ec2",
      "label": "In-place"
    },
    {
      "from": "codedeploy",
      "to": "lambda",
      "label": "トラフィック切替"
    },
    {
      "from": "ecr",
      "to": "ecs",
      "label": "イメージ取得"
    },
    {
      "from": "ecr",
      "to": "codebuild",
      "label": "push先"
    },
    {
      "from": "ecr",
      "to": "kms",
      "label": "暗号化"
    },
    {
      "from": "igw",
      "to": "vpc",
      "label": "VPCに関連付け"
    },
    {
      "from": "igw",
      "to": "ec2",
      "label": "パブリック通信"
    },
    {
      "from": "igw",
      "to": "alb",
      "label": "公開"
    },
    {
      "from": "natgw",
      "to": "vpc",
      "label": "パブリックサブネットに配置"
    },
    {
      "from": "natgw",
      "to": "igw",
      "label": "出口"
    },
    {
      "from": "natgw",
      "to": "ec2",
      "label": "外向き通信"
    },
    {
      "from": "eigw",
      "to": "vpc",
      "label": "VPCに関連付け"
    },
    {
      "from": "eigw",
      "to": "ec2",
      "label": "IPv6の外向き"
    },
    {
      "from": "eigw",
      "to": "internet",
      "label": "外部起点は遮断"
    },
    {
      "from": "internet",
      "to": "igw",
      "label": "VPCの出入口"
    },
    {
      "from": "internet",
      "to": "cloudfront",
      "label": "配信"
    },
    {
      "from": "internet",
      "to": "route53",
      "label": "名前解決"
    },
    {
      "from": "user",
      "to": "cloudfront",
      "label": "アクセス"
    },
    {
      "from": "user",
      "to": "alb",
      "label": "アクセス"
    },
    {
      "from": "user",
      "to": "cognito",
      "label": "サインイン"
    },
    {
      "from": "onprem",
      "to": "dx",
      "label": "専用線"
    },
    {
      "from": "onprem",
      "to": "vpn",
      "label": "IPsec"
    },
    {
      "from": "onprem",
      "to": "tgw",
      "label": "接続先"
    },
    {
      "from": "fargate",
      "to": "ecs",
      "label": "実行基盤"
    },
    {
      "from": "fargate",
      "to": "alb",
      "label": "前段に配置"
    },
    {
      "from": "batch",
      "to": "ec2",
      "label": "実行基盤"
    },
    {
      "from": "batch",
      "to": "s3",
      "label": "入出力"
    },
    {
      "from": "apprunner",
      "to": "ecr",
      "label": "イメージ取得"
    },
    {
      "from": "apprunner",
      "to": "vpc",
      "label": "VPC接続"
    },
    {
      "from": "glacier",
      "to": "s3",
      "label": "ストレージクラス"
    },
    {
      "from": "glacier",
      "to": "backup",
      "label": "長期保管"
    },
    {
      "from": "neptune",
      "to": "s3",
      "label": "バルクロード"
    },
    {
      "from": "neptune",
      "to": "kms",
      "label": "暗号化"
    },
    {
      "from": "timestream",
      "to": "iotcore",
      "label": "データ取り込み"
    },
    {
      "from": "timestream",
      "to": "quicksight",
      "label": "可視化"
    },
    {
      "from": "emr",
      "to": "s3",
      "label": "データ保管"
    },
    {
      "from": "emr",
      "to": "glue",
      "label": "カタログ共有"
    },
    {
      "from": "msk",
      "to": "lambda",
      "label": "コンシューマー"
    },
    {
      "from": "msk",
      "to": "kinesis",
      "label": "類似サービス"
    },
    {
      "from": "quicksight",
      "to": "athena",
      "label": "データソース"
    },
    {
      "from": "quicksight",
      "to": "redshift",
      "label": "データソース"
    },
    {
      "from": "lakeformation",
      "to": "s3",
      "label": "データレイク"
    },
    {
      "from": "lakeformation",
      "to": "glue",
      "label": "カタログ"
    },
    {
      "from": "networkfirewall",
      "to": "vpc",
      "label": "保護対象"
    },
    {
      "from": "networkfirewall",
      "to": "tgw",
      "label": "集約検査"
    },
    {
      "from": "inspector",
      "to": "ec2",
      "label": "スキャン対象"
    },
    {
      "from": "inspector",
      "to": "ecr",
      "label": "スキャン対象"
    },
    {
      "from": "macie",
      "to": "s3",
      "label": "検査対象"
    },
    {
      "from": "macie",
      "to": "securityhub",
      "label": "結果を集約"
    },
    {
      "from": "securityhub",
      "to": "guardduty",
      "label": "結果を集約"
    },
    {
      "from": "securityhub",
      "to": "eventbridge",
      "label": "自動対応"
    },
    {
      "from": "cloudhsm",
      "to": "kms",
      "label": "キーストア"
    },
    {
      "from": "cloudhsm",
      "to": "vpc",
      "label": "VPC内に配置"
    },
    {
      "from": "directory",
      "to": "sso",
      "label": "ID連携"
    },
    {
      "from": "directory",
      "to": "onprem",
      "label": "AD連携"
    },
    {
      "from": "appsync",
      "to": "dynamodb",
      "label": "データ源"
    },
    {
      "from": "appsync",
      "to": "cognito",
      "label": "認証"
    },
    {
      "from": "ses",
      "to": "sns",
      "label": "通知連携"
    },
    {
      "from": "ses",
      "to": "lambda",
      "label": "受信処理"
    },
    {
      "from": "servicecatalog",
      "to": "cfn",
      "label": "製品の実体"
    },
    {
      "from": "servicecatalog",
      "to": "orgs",
      "label": "共有"
    },
    {
      "from": "ce",
      "to": "budgets",
      "label": "予算連携"
    },
    {
      "from": "ce",
      "to": "orgs",
      "label": "一括請求"
    },
    {
      "from": "budgets",
      "to": "sns",
      "label": "通知"
    },
    {
      "from": "budgets",
      "to": "ce",
      "label": "分析"
    },
    {
      "from": "transfer",
      "to": "s3",
      "label": "保存先"
    },
    {
      "from": "transfer",
      "to": "iam",
      "label": "権限"
    },
    {
      "from": "migrationhub",
      "to": "mgn",
      "label": "進捗を集約"
    },
    {
      "from": "migrationhub",
      "to": "dms",
      "label": "進捗を集約"
    },
    {
      "from": "bedrock",
      "to": "lambda",
      "label": "呼び出し"
    },
    {
      "from": "bedrock",
      "to": "s3",
      "label": "データ源"
    },
    {
      "from": "sagemaker",
      "to": "s3",
      "label": "学習データ"
    },
    {
      "from": "sagemaker",
      "to": "ecr",
      "label": "コンテナイメージ"
    },
    {
      "from": "rekognition",
      "to": "s3",
      "label": "画像の入力"
    },
    {
      "from": "rekognition",
      "to": "lambda",
      "label": "結果を処理"
    },
    {
      "from": "textract",
      "to": "s3",
      "label": "文書の入力"
    },
    {
      "from": "textract",
      "to": "lambda",
      "label": "結果を処理"
    },
    {
      "from": "transcribe",
      "to": "s3",
      "label": "音声の入力"
    },
    {
      "from": "transcribe",
      "to": "lambda",
      "label": "結果を処理"
    },
    {
      "from": "iotcore",
      "to": "kinesis",
      "label": "転送先"
    },
    {
      "from": "iotcore",
      "to": "lambda",
      "label": "ルール処理"
    },
    {
      "from": "connect",
      "to": "lambda",
      "label": "拡張"
    },
    {
      "from": "connect",
      "to": "s3",
      "label": "録音保管"
    },
    {
      "from": "eks",
      "to": "ecr",
      "label": "イメージ取得"
    },
    {
      "from": "eks",
      "to": "alb",
      "label": "公開"
    },
    {
      "from": "beanstalk",
      "to": "ec2",
      "label": "実体"
    },
    {
      "from": "beanstalk",
      "to": "alb",
      "label": "前段"
    },
    {
      "from": "ebs",
      "to": "ec2",
      "label": "アタッチ"
    },
    {
      "from": "ebs",
      "to": "backup",
      "label": "スナップショット"
    },
    {
      "from": "efs",
      "to": "ec2",
      "label": "共有マウント"
    },
    {
      "from": "efs",
      "to": "lambda",
      "label": "共有FS"
    },
    {
      "from": "fsx",
      "to": "ec2",
      "label": "共有FS"
    },
    {
      "from": "fsx",
      "to": "directory",
      "label": "AD連携"
    },
    {
      "from": "storagegw",
      "to": "s3",
      "label": "保存先"
    },
    {
      "from": "storagegw",
      "to": "onprem",
      "label": "接続元"
    },
    {
      "from": "redshift",
      "to": "s3",
      "label": "Spectrum"
    },
    {
      "from": "redshift",
      "to": "quicksight",
      "label": "可視化"
    },
    {
      "from": "kinesis",
      "to": "firehose",
      "label": "配信"
    },
    {
      "from": "kinesis",
      "to": "lambda",
      "label": "コンシューマー"
    },
    {
      "from": "firehose",
      "to": "s3",
      "label": "配信先"
    },
    {
      "from": "firehose",
      "to": "redshift",
      "label": "配信先"
    },
    {
      "from": "athena",
      "to": "s3",
      "label": "クエリ対象"
    },
    {
      "from": "athena",
      "to": "glue",
      "label": "カタログ"
    },
    {
      "from": "glue",
      "to": "s3",
      "label": "ETL対象"
    },
    {
      "from": "glue",
      "to": "athena",
      "label": "カタログ共有"
    },
    {
      "from": "opensearch",
      "to": "firehose",
      "label": "取り込み"
    },
    {
      "from": "opensearch",
      "to": "cloudwatch",
      "label": "ログ"
    },
    {
      "from": "nlb",
      "to": "ec2",
      "label": "ターゲット"
    },
    {
      "from": "nlb",
      "to": "vpce",
      "label": "PrivateLink前段"
    },
    {
      "from": "globalacc",
      "to": "alb",
      "label": "エンドポイント"
    },
    {
      "from": "globalacc",
      "to": "nlb",
      "label": "エンドポイント"
    },
    {
      "from": "vpcpeer",
      "to": "vpc",
      "label": "VPCを接続"
    },
    {
      "from": "vpcpeer",
      "to": "tgw",
      "label": "多数ならTGW"
    },
    {
      "from": "secrets",
      "to": "lambda",
      "label": "ローテーション"
    },
    {
      "from": "secrets",
      "to": "rds",
      "label": "認証情報"
    },
    {
      "from": "shield",
      "to": "cloudfront",
      "label": "保護対象"
    },
    {
      "from": "shield",
      "to": "route53",
      "label": "保護対象"
    },
    {
      "from": "guardduty",
      "to": "securityhub",
      "label": "結果を集約"
    },
    {
      "from": "guardduty",
      "to": "eventbridge",
      "label": "自動対応"
    },
    {
      "from": "sso",
      "to": "iam",
      "label": "権限セット"
    },
    {
      "from": "sso",
      "to": "orgs",
      "label": "全アカウント"
    },
    {
      "from": "controltower",
      "to": "orgs",
      "label": "土台"
    },
    {
      "from": "controltower",
      "to": "cloudtrail",
      "label": "ログ集約"
    },
    {
      "from": "xray",
      "to": "lambda",
      "label": "トレース"
    },
    {
      "from": "xray",
      "to": "apigw",
      "label": "トレース"
    },
    {
      "from": "trustedadvisor",
      "to": "cloudwatch",
      "label": "アラーム"
    },
    {
      "from": "trustedadvisor",
      "to": "orgs",
      "label": "組織ビュー"
    },
    {
      "from": "mq",
      "to": "ec2",
      "label": "ブローカー"
    },
    {
      "from": "mq",
      "to": "vpc",
      "label": "VPC内"
    },
    {
      "from": "dms",
      "to": "rds",
      "label": "移行先"
    },
    {
      "from": "dms",
      "to": "aurora",
      "label": "移行先"
    },
    {
      "from": "datasync",
      "to": "s3",
      "label": "転送先"
    },
    {
      "from": "datasync",
      "to": "onprem",
      "label": "転送元"
    },
    {
      "from": "snowball",
      "to": "s3",
      "label": "取り込み先"
    },
    {
      "from": "snowball",
      "to": "onprem",
      "label": "データ元"
    },
    {
      "from": "mgn",
      "to": "ec2",
      "label": "移行先"
    },
    {
      "from": "mgn",
      "to": "migrationhub",
      "label": "進捗"
    },
    {
      "from": "fwm",
      "to": "orgs",
      "label": "対象のOU/組織を指定"
    },
    {
      "from": "fwm",
      "to": "waf",
      "label": "WAFルールを一括適用"
    },
    {
      "from": "fwm",
      "to": "shield",
      "label": "Shield Advancedを一括適用"
    },
    {
      "from": "fwm",
      "to": "networkfirewall",
      "label": "ポリシーを一括適用"
    },
    {
      "from": "grafana",
      "to": "mgrafana",
      "label": "AWSのマネージド版"
    },
    {
      "from": "mgrafana",
      "to": "cloudwatch",
      "label": "データソース"
    },
    {
      "from": "mgrafana",
      "to": "xray",
      "label": "データソース"
    },
    {
      "from": "mgrafana",
      "to": "timestream",
      "label": "データソース"
    },
    {
      "from": "mgrafana",
      "to": "opensearch",
      "label": "データソース"
    },
    {
      "from": "lambdaedge",
      "to": "cloudfront",
      "label": "エッジで実行"
    },
    {
      "from": "lambdaedge",
      "to": "lambda",
      "label": "Lambda関数をエッジに配置"
    },
    {
      "from": "rdsproxy",
      "to": "rds",
      "label": "前段に配置"
    },
    {
      "from": "rdsproxy",
      "to": "aurora",
      "label": "前段に配置"
    },
    {
      "from": "rdsproxy",
      "to": "lambda",
      "label": "接続を集約"
    },
    {
      "from": "rdsproxy",
      "to": "secrets",
      "label": "認証情報を取得"
    },
    {
      "from": "dax",
      "to": "dynamodb",
      "label": "前段のキャッシュ"
    }
  ],
  "comparisons": [
    {
      "a": "sqs",
      "b": "sns",
      "text": "SQSはキュー(受信側が取りに行く)、SNSはPub/Sub(宛先へプッシュ配信)。SNS→SQSのファンアウトで併用する"
    },
    {
      "a": "sqs",
      "b": "kinesis",
      "text": "SQSは1メッセージを1つの消費者が処理して削除。Kinesisは順序保証・複数消費者・リプレイが可能"
    },
    {
      "a": "sqs",
      "b": "mq",
      "text": "SQSはAWS独自のキュー。Amazon MQはActiveMQ/RabbitMQ互換で、既存アプリをそのまま移行する用途"
    },
    {
      "a": "sqs",
      "b": "eventbridge",
      "text": "SQSはメッセージの一時保管と平準化。EventBridgeはルールでイベントを振り分けて起動する"
    },
    {
      "a": "sns",
      "b": "eventbridge",
      "text": "SNSは単純な通知の配信。EventBridgeはルールによる振り分けとSaaS/AWSイベントの受信"
    },
    {
      "a": "kinesis",
      "b": "msk",
      "text": "どちらもストリーム基盤。KinesisはAWS独自、MSKはApache Kafka互換(既存Kafkaの移行向け)"
    },
    {
      "a": "kinesis",
      "b": "firehose",
      "text": "Data Streamsは自前のコンシューマーで処理。Firehoseは宛先(S3など)へ自動配信するだけ"
    },
    {
      "a": "alb",
      "b": "nlb",
      "text": "ALBはL7(パス/ホスト・HTTP)、NLBはL4(TCP/UDP)で固定IP・超低遅延"
    },
    {
      "a": "alb",
      "b": "apigw",
      "text": "ALBはサーバーへの負荷分散。API Gatewayは認証・スロットリング・キャッシュなどAPI管理"
    },
    {
      "a": "cloudfront",
      "b": "globalacc",
      "text": "CloudFrontはキャッシュでコンテンツを配信(HTTP中心)。Global Acceleratorはキャッシュなしで経路を最適化(TCP/UDPも可)"
    },
    {
      "a": "cloudfront",
      "b": "lambdaedge",
      "text": "CloudFrontは配信とキャッシュ。Lambda@Edgeはそのエッジで処理を実行する拡張"
    },
    {
      "a": "route53",
      "b": "globalacc",
      "text": "Route 53はDNSで振り分け(DNSキャッシュの影響あり)。Global Acceleratorは固定のエニーキャストIPで即時に切り替え"
    },
    {
      "a": "vpcpeer",
      "b": "tgw",
      "text": "ピアリングは1対1(推移的ルーティング不可)。TGWはハブ&スポークで多数のVPC・オンプレを集約"
    },
    {
      "a": "dx",
      "b": "vpn",
      "text": "Direct Connectは専用線(安定・低遅延、構築に時間)。VPNはインターネット経由のIPsec(短期間で構築、品質は変動)"
    },
    {
      "a": "vpce",
      "b": "natgw",
      "text": "VPCエンドポイントはAWSサービスへ内部接続。NATゲートウェイはインターネットへの外向き通信"
    },
    {
      "a": "igw",
      "b": "natgw",
      "text": "IGWは双方向(パブリック)。NATゲートウェイは外向きのみ(プライベートサブネット用)"
    },
    {
      "a": "natgw",
      "b": "eigw",
      "text": "NATゲートウェイはIPv4の外向き。Egress-Only IGWはIPv6の外向き専用"
    },
    {
      "a": "waf",
      "b": "shield",
      "text": "WAFはL7のWeb攻撃(SQLi/XSSなど)。ShieldはDDoS対策"
    },
    {
      "a": "waf",
      "b": "networkfirewall",
      "text": "WAFはALB/CloudFront等に付けるHTTP(S)向け。Network FirewallはVPC境界のネットワーク検査"
    },
    {
      "a": "waf",
      "b": "fwm",
      "text": "WAFはルールの定義と適用。Firewall Managerは複数アカウントへ一括適用・統制"
    },
    {
      "a": "guardduty",
      "b": "inspector",
      "text": "GuardDutyは脅威(不審な動き)の検知。Inspectorは脆弱性のスキャン"
    },
    {
      "a": "guardduty",
      "b": "macie",
      "text": "GuardDutyは不審なアクセスの検知。Macieは機密データ(PII)の検出"
    },
    {
      "a": "securityhub",
      "b": "guardduty",
      "text": "GuardDutyは検知する側。Security Hubは各サービスの検知結果を集約する側"
    },
    {
      "a": "kms",
      "b": "cloudhsm",
      "text": "KMSはマネージドな鍵管理。CloudHSMは専用HSMで、顧客が鍵を完全に管理"
    },
    {
      "a": "kms",
      "b": "secrets",
      "text": "KMSは暗号鍵の管理。Secrets Managerは認証情報などの秘密情報の保管と自動ローテーション"
    },
    {
      "a": "secrets",
      "b": "ssm",
      "text": "Secrets Managerは自動ローテーションあり(有料)。Parameter Storeは設定値や簡易な機密値の保管(標準は無料)"
    },
    {
      "a": "iam",
      "b": "sso",
      "text": "IAMは各アカウント内の権限。IAM Identity Centerは複数アカウント・アプリへのシングルサインオン"
    },
    {
      "a": "iam",
      "b": "orgs",
      "text": "IAMは権限を付与する。SCP(Organizations)は付与できる権限の上限を決める"
    },
    {
      "a": "cognito",
      "b": "sso",
      "text": "Cognitoはアプリの利用者(顧客)の認証。IAM Identity Centerは従業員のAWS/業務アプリのSSO"
    },
    {
      "a": "cloudtrail",
      "b": "config",
      "text": "CloudTrailはAPI操作の履歴(誰が何を)。Configはリソースの構成の履歴と準拠評価"
    },
    {
      "a": "cloudtrail",
      "b": "cloudwatch",
      "text": "CloudTrailは監査ログ。CloudWatchは監視(メトリクス・ログ・アラーム)"
    },
    {
      "a": "cloudwatch",
      "b": "xray",
      "text": "CloudWatchはメトリクス/ログ。X-Rayはリクエスト単位のトレースでボトルネックを特定"
    },
    {
      "a": "cloudwatch",
      "b": "mgrafana",
      "text": "CloudWatchは収集・アラーム。Managed Grafanaは複数データソースを美しく可視化"
    },
    {
      "a": "grafana",
      "b": "mgrafana",
      "text": "Grafanaはオープンソースのツール(自前運用)。Managed GrafanaはAWSが運用するマネージド版"
    },
    {
      "a": "quicksight",
      "b": "grafana",
      "text": "QuickSightはBI(業務データの分析・レポート)。Grafanaは運用監視ダッシュボード"
    },
    {
      "a": "cfn",
      "b": "beanstalk",
      "text": "CloudFormationは任意のインフラをコード化。Beanstalkはアプリの実行環境を自動構築"
    },
    {
      "a": "cfn",
      "b": "servicecatalog",
      "text": "CloudFormationはテンプレートの実体。Service Catalogは承認済みの製品として配布・統制"
    },
    {
      "a": "codepipeline",
      "b": "codedeploy",
      "text": "CodePipelineは全体の流れの制御。CodeDeployはデプロイの実行"
    },
    {
      "a": "codebuild",
      "b": "codepipeline",
      "text": "CodeBuildはビルド・テストの実行。CodePipelineはそれらをつなぐ流れ"
    },
    {
      "a": "ecs",
      "b": "eks",
      "text": "ECSはAWS独自のオーケストレーション。EKSはKubernetes互換(K8sの知識・資産を活かす)"
    },
    {
      "a": "ecs",
      "b": "apprunner",
      "text": "ECSは細かく制御するコンテナ基盤。App Runnerは最短でWebアプリを公開"
    },
    {
      "a": "lambda",
      "b": "fargate",
      "text": "Lambdaは短時間(最大15分)のイベント処理。Fargateは長時間・常時稼働のコンテナ"
    },
    {
      "a": "lambda",
      "b": "batch",
      "text": "Lambdaは軽量・短時間。Batchは長時間・大量のバッチジョブ"
    },
    {
      "a": "ebs",
      "b": "efs",
      "text": "EBSは1台のEC2に接続するブロック(AZ内)。EFSは複数EC2で共有するファイル(NFS)"
    },
    {
      "a": "efs",
      "b": "fsx",
      "text": "EFSはLinux向けNFS。FSxはWindows(SMB)・Lustre・ONTAPなど用途別"
    },
    {
      "a": "s3",
      "b": "ebs",
      "text": "S3はオブジェクトストレージ(HTTP経由)。EBSはEC2に直接つなぐディスク"
    },
    {
      "a": "storagegw",
      "b": "datasync",
      "text": "Storage Gatewayは継続的なハイブリッド利用。DataSyncは一括・定期のデータ転送"
    },
    {
      "a": "datasync",
      "b": "snowball",
      "text": "DataSyncは回線でオンライン転送。Snowballは物理デバイスでオフライン転送"
    },
    {
      "a": "dms",
      "b": "mgn",
      "text": "DMSはデータベースの移行。MGNはサーバー丸ごとの移行(リホスト)"
    },
    {
      "a": "rds",
      "b": "aurora",
      "text": "RDSは汎用マネージドRDB。Auroraはクラウド向けに再設計した高性能・高可用なRDB"
    },
    {
      "a": "rds",
      "b": "dynamodb",
      "text": "RDSはSQL・リレーショナル。DynamoDBはNoSQL・キーバリューで自動スケール"
    },
    {
      "a": "rds",
      "b": "rdsproxy",
      "text": "RDSはDB本体。RDS Proxyはその前段で接続を集約する"
    },
    {
      "a": "dynamodb",
      "b": "elasticache",
      "text": "DynamoDBは永続的なDB。ElastiCacheはデータの一時保持(キャッシュ)"
    },
    {
      "a": "dax",
      "b": "elasticache",
      "text": "DAXはDynamoDB専用で互換API(置き換えるだけ)。ElastiCacheは汎用で、アプリ側の実装が必要"
    },
    {
      "a": "dax",
      "b": "dynamodb",
      "text": "DynamoDBは本体のデータストア。DAXは前段で読み取りを高速化するキャッシュ"
    },
    {
      "a": "redshift",
      "b": "athena",
      "text": "Redshiftは専用クラスターのDWH(高速・大規模)。AthenaはS3を直接クエリするサーバーレス"
    },
    {
      "a": "athena",
      "b": "emr",
      "text": "Athenaは手軽なSQL分析。EMRはSpark/Hadoopで大規模な分散処理を自分で制御"
    },
    {
      "a": "glue",
      "b": "emr",
      "text": "Glueはサーバーレスで運用が少ないETL。EMRはクラスターを自分で制御する分散処理"
    },
    {
      "a": "apigw",
      "b": "appsync",
      "text": "API GatewayはREST/HTTP/WebSocket。AppSyncはGraphQLとリアルタイム購読"
    },
    {
      "a": "ses",
      "b": "sns",
      "text": "SESはメール送信に特化。SNSは汎用の通知配信(メール/SMS/プッシュなど)"
    },
    {
      "a": "directory",
      "b": "sso",
      "text": "Directory ServiceはAD互換のディレクトリ。IAM Identity CenterはSSOの入口"
    },
    {
      "a": "sagemaker",
      "b": "bedrock",
      "text": "SageMakerは自前のモデルを開発・学習。Bedrockは既存の基盤モデルをAPIで利用"
    },
    {
      "a": "rekognition",
      "b": "textract",
      "text": "Rekognitionは画像・動画の分析。Textractは文書の文字・表の抽出"
    },
    {
      "a": "controltower",
      "b": "orgs",
      "text": "Organizationsはアカウント管理の土台。Control Towerはその上でガードレールと環境構築を自動化"
    },
    {
      "a": "ce",
      "b": "budgets",
      "text": "Cost Explorerはコストの分析・予測。Budgetsは予算を決めて超過を通知"
    },
    {
      "a": "trustedadvisor",
      "b": "config",
      "text": "Trusted Advisorはベストプラクティスの点検。Configは構成の履歴とルール準拠"
    },
    {
      "a": "fwm",
      "b": "orgs",
      "text": "Organizationsはアカウント管理。Firewall Managerはその上でセキュリティポリシーを一括適用"
    }
  ]
};
