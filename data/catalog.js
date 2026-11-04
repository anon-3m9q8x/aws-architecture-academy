export const additions = [
  [
    "AWS Lambda",
    "コンピューティング",
    "サーバー管理なしでイベントに応じてコードを実行。短時間のイベント処理に適します。",
    "network",
    "https://docs.aws.amazon.com/lambda/latest/dg/welcome.html"
  ],
  [
    "Amazon ECS",
    "コンピューティング",
    "コンテナ化したアプリの配置・実行を管理。Fargate または EC2 の実行基盤を選びます。",
    "network",
    "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html"
  ],
  [
    "Amazon EKS",
    "コンピューティング",
    "マネージド Kubernetes。Kubernetes API や既存エコシステムを活用する構成向け。",
    "network",
    "https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html"
  ],
  [
    "AWS Fargate",
    "コンピューティング",
    "ECS や EKS のコンテナをサーバー管理なしで実行するコンピューティングエンジン。",
    "network",
    "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html"
  ],
  [
    "Amazon EBS",
    "ストレージ",
    "EC2 向けの永続ブロックストレージ。ボリュームは特定の AZ に属します。",
    "storage",
    "https://docs.aws.amazon.com/ebs/latest/userguide/what-is-ebs.html"
  ],
  [
    "Amazon EFS",
    "ストレージ",
    "複数クライアントで共有できる NFS ファイルストレージ。Linux ワークロードの共有に利用。",
    "storage",
    "https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html"
  ],
  [
    "Amazon FSx for Windows File Server",
    "ストレージ",
    "Windows 向けのマネージド共有ファイルストレージ。SMB と Active Directory 連携に対応。",
    "storage",
    "https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html"
  ],
  [
    "S3 Glacier ストレージクラス",
    "ストレージ",
    "S3 のアーカイブ向けクラス。取得時間とアクセス頻度に応じてクラスを選びます。",
    "storage",
    "https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html"
  ],
  [
    "Amazon Aurora",
    "データベース",
    "MySQL / PostgreSQL 互換のマネージドリレーショナル DB。読み取りと可用性の設計を区別。",
    "database",
    "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html"
  ],
  [
    "Amazon ElastiCache",
    "データベース",
    "マネージドのインメモリキャッシュ。読み取り高速化やセッション管理で活用。",
    "database",
    "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html"
  ],
  [
    "Amazon Redshift",
    "データベース",
    "データウェアハウス。大量データの分析処理を主眼とし、トランザクション DB と使い分けます。",
    "database",
    "https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html"
  ],
  [
    "Amazon VPC",
    "ネットワーク",
    "AWS 内に論理的に分離したネットワークを構成。サブネットやルートを設計します。",
    "network",
    "https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html"
  ],
  [
    "Amazon Route 53",
    "ネットワーク",
    "DNS、ドメイン登録、ヘルスチェック。DNS の切替は既存 TCP 接続の移動とは異なります。",
    "network",
    "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html"
  ],
  [
    "Network Load Balancer (NLB)",
    "ネットワーク",
    "TCP / UDP などの接続を負荷分散する L4 ロードバランサー。HTTP パスのルールとは区別。",
    "network",
    "https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html"
  ],
  [
    "Amazon API Gateway",
    "ネットワーク",
    "API の作成・公開・管理。Lambda と組み合わせたサーバーレス API などに利用。",
    "network",
    "https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html"
  ],
  [
    "AWS Direct Connect",
    "ネットワーク",
    "オンプレミスと AWS を専用ネットワーク接続で結ぶ。回線の冗長化と暗号化は別途設計。",
    "network",
    "https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html"
  ],
  [
    "AWS Site-to-Site VPN",
    "ネットワーク",
    "拠点と AWS の間に IPsec トンネルを構築。インターネット経由の接続にも利用。",
    "network",
    "https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html"
  ],
  [
    "AWS PrivateLink",
    "ネットワーク",
    "対応サービスへプライベートに接続。インターフェイスエンドポイントは ENI を利用。",
    "network",
    "https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html"
  ],
  [
    "Amazon SQS",
    "アプリ統合",
    "メッセージキューで処理を疎結合化。Standard と FIFO で順序・配信特性が異なります。",
    "network",
    "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html"
  ],
  [
    "Amazon SNS",
    "アプリ統合",
    "トピックを使った publish/subscribe 通知。複数サブスクライバーへの配信に利用。",
    "network",
    "https://docs.aws.amazon.com/sns/latest/dg/welcome.html"
  ],
  [
    "Amazon EventBridge",
    "アプリ統合",
    "イベントバスとルールによりイベントをルーティング。AWS・独自アプリ等の連携に利用。",
    "network",
    "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html"
  ],
  [
    "AWS Step Functions",
    "アプリ統合",
    "ステートマシンで複数処理をオーケストレーション。分岐や再試行を定義できます。",
    "network",
    "https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html"
  ],
  [
    "Amazon Kinesis Data Streams",
    "分析",
    "連続的なストリームデータを収集・処理。コンシューマーによる読み取りに対応。",
    "database",
    "https://docs.aws.amazon.com/streams/latest/dev/introduction.html"
  ],
  [
    "Amazon CloudWatch",
    "運用・管理",
    "メトリクス・ログ・アラームなどでシステムを監視。API 操作監査とは目的を区別。",
    "security",
    "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html"
  ],
  [
    "AWS CloudTrail",
    "運用・管理",
    "AWS アカウントでの API 操作などのイベントを記録。操作主体の監査に利用。",
    "security",
    "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html"
  ],
  [
    "AWS Config",
    "運用・管理",
    "リソース設定と変更履歴を記録し、ルールへの準拠を評価します。",
    "security",
    "https://docs.aws.amazon.com/config/latest/developerguide/WhatIsConfig.html"
  ],
  [
    "AWS KMS",
    "セキュリティ",
    "暗号化キーを作成・制御するマネージドサービス。キーとシークレットの保管目的を区別。",
    "security",
    "https://docs.aws.amazon.com/kms/latest/developerguide/overview.html"
  ],
  [
    "AWS Secrets Manager",
    "セキュリティ",
    "DB パスワード等のシークレットを管理。対応構成でローテーションを自動化。",
    "security",
    "https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html"
  ],
  [
    "AWS WAF",
    "セキュリティ",
    "対応する Web リソースへの HTTP(S) 要求をルールで検査。SQL インジェクション等への対策に。",
    "security",
    "https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html"
  ],
  [
    "AWS Shield",
    "セキュリティ",
    "DDoS 防御。Standard と Advanced の提供範囲を区別し、WAF と組み合わせます。",
    "security",
    "https://docs.aws.amazon.com/waf/latest/developerguide/shield-chapter.html"
  ],
  [
    "AWS Organizations",
    "運用・管理",
    "複数 AWS アカウントを組織で管理。SCP は権限の上限を制約し、それ自体で権限付与しません。",
    "security",
    "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html"
  ],
  [
    "AWS Budgets",
    "運用・管理",
    "コストや使用量の予算を設定して通知。予算設定だけで全リソースを自動停止しません。",
    "security",
    "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html"
  ],
  [
    "AWS CloudFormation",
    "運用・管理",
    "テンプレートで AWS リソースをコードとして定義し、スタックとして管理。",
    "security",
    "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html"
  ]
];
