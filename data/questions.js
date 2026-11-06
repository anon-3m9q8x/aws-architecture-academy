import { labQuestions } from './lab-questions.js';
const baseQuestions = [
  {
    "id": "aws-001",
    "prompt": "静的画像をオブジェクトとして保存し、キーを指定して取得したい。最も適したサービスは？",
    "domain": "ストレージ",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon S3",
        "explanation": "S3 はバケット内のオブジェクトをキーで管理します。",
        "correct": true
      },
      {
        "text": "Amazon EBS",
        "explanation": "EBS は EC2 用のブロックストレージです。",
        "correct": false
      },
      {
        "text": "Amazon RDS",
        "explanation": "RDS はリレーショナルデータベースです。",
        "correct": false
      },
      {
        "text": "Amazon EFS",
        "explanation": "EFS は共有ファイルストレージです。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-002",
    "prompt": "仮想マシンの OS を自分で設定し、アプリケーションを実行したい。利用するサービスは？",
    "domain": "コンピューティング",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon S3",
        "explanation": "S3 はオブジェクト保存用です。",
        "correct": false
      },
      {
        "text": "Amazon EC2",
        "explanation": "EC2 では仮想サーバーの OS やソフトウェアを管理できます。",
        "correct": true
      },
      {
        "text": "AWS Lambda",
        "explanation": "Lambda はサーバーの OS 管理を利用者に提供する方式ではありません。",
        "correct": false
      },
      {
        "text": "Amazon Route 53",
        "explanation": "Route 53 は DNS などのサービスです。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-003",
    "prompt": "ユーザーやロールに対して、AWS リソースへの操作権限を定義したい。使うサービスは？",
    "domain": "セキュリティ",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon VPC",
        "explanation": "VPC のネットワーク設定と API 操作権限は別です。",
        "correct": false
      },
      {
        "text": "Amazon CloudFront",
        "explanation": "CloudFront はコンテンツ配信サービスです。",
        "correct": false
      },
      {
        "text": "AWS IAM",
        "explanation": "IAM ポリシーで操作とリソースへのアクセスを制御します。",
        "correct": true
      },
      {
        "text": "AWS Budgets",
        "explanation": "Budgets は予算管理です。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-004",
    "prompt": "Web サイトの画像を世界中の利用者へエッジから配信し、オリジンへの要求を減らしたい。適切なサービスは？",
    "domain": "ネットワーク",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon CloudFront",
        "explanation": "CloudFront はエッジロケーションでコンテンツをキャッシュして配信します。",
        "correct": true
      },
      {
        "text": "AWS Direct Connect",
        "explanation": "Direct Connect は専用ネットワーク接続です。",
        "correct": false
      },
      {
        "text": "AWS CloudTrail",
        "explanation": "CloudTrail は操作監査です。",
        "correct": false
      },
      {
        "text": "Amazon EBS",
        "explanation": "EBS はエッジ配信を提供しません。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-005",
    "prompt": "複数の AWS アカウントをまとめて管理し、一括請求を利用したい。適切なサービスは？",
    "domain": "運用・管理",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 1,
    "choices": [
      {
        "text": "AWS Config",
        "explanation": "Config はリソース設定の記録・評価を行います。",
        "correct": false
      },
      {
        "text": "Amazon SQS",
        "explanation": "SQS はメッセージキューです。",
        "correct": false
      },
      {
        "text": "AWS IAM",
        "explanation": "IAM のユーザー管理だけでは組織の一括請求になりません。",
        "correct": false
      },
      {
        "text": "AWS Organizations",
        "explanation": "Organizations はマルチアカウント管理と一括請求を支援します。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-006",
    "prompt": "月額コストが設定した予算に近づいたとき、担当者へ通知したい。適切なサービスは？",
    "domain": "運用・管理",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon Route 53",
        "explanation": "DNS のサービスであり予算通知には使いません。",
        "correct": false
      },
      {
        "text": "AWS WAF",
        "explanation": "WAF は Web リクエストの検査です。",
        "correct": false
      },
      {
        "text": "AWS Budgets",
        "explanation": "予算の実績・予測に基づくしきい値通知を設定できます。",
        "correct": true
      },
      {
        "text": "Amazon EFS",
        "explanation": "EFS は共有ファイルシステムです。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-007",
    "prompt": "誰が EC2 インスタンスを停止する API を呼び出したか調査したい。最も適切な記録は？",
    "domain": "運用・管理",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 1,
    "choices": [
      {
        "text": "CloudWatch の CPU 使用率",
        "explanation": "CPU メトリクスだけでは API の実行主体を特定できません。",
        "correct": false
      },
      {
        "text": "S3 のストレージクラス",
        "explanation": "保存クラスは操作主体の監査ではありません。",
        "correct": false
      },
      {
        "text": "Route 53 の DNS レコード",
        "explanation": "DNS レコードから API 実行者は分かりません。",
        "correct": false
      },
      {
        "text": "AWS CloudTrail のイベント",
        "explanation": "CloudTrail は API 操作やその実行主体の調査に利用します。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-008",
    "prompt": "CPU 使用率がしきい値を超えたらアラームを発報したい。利用するサービスは？",
    "domain": "運用・管理",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon CloudWatch",
        "explanation": "CloudWatch メトリクスとアラームでしきい値を監視します。",
        "correct": true
      },
      {
        "text": "AWS Secrets Manager",
        "explanation": "シークレットの管理サービスです。",
        "correct": false
      },
      {
        "text": "Amazon SNS のトピックだけ",
        "explanation": "SNS は通知先になれますが、CPU メトリクス自体のしきい値評価には CloudWatch 等が必要です。",
        "correct": false
      },
      {
        "text": "AWS CloudFormation",
        "explanation": "CloudFormation はリソースの宣言的な作成・更新です。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-009",
    "prompt": "共通の DNS 名でサービスを公開し、名前解決を管理したい。最も適切なサービスは？",
    "domain": "ネットワーク",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon Redshift",
        "explanation": "Redshift はデータウェアハウスです。",
        "correct": false
      },
      {
        "text": "Amazon EKS",
        "explanation": "EKS は Kubernetes のマネージドサービスです。",
        "correct": false
      },
      {
        "text": "AWS Shield",
        "explanation": "Shield は DDoS 防御です。",
        "correct": false
      },
      {
        "text": "Amazon Route 53",
        "explanation": "Route 53 は権威 DNS 等の機能を提供します。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-010",
    "prompt": "AWS リソースをテンプレートで定義し、同じ構成を繰り返し作成したい。適切なサービスは？",
    "domain": "運用・管理",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 1,
    "choices": [
      {
        "text": "AWS Budgets",
        "explanation": "Budgets は予算管理です。",
        "correct": false
      },
      {
        "text": "Amazon ElastiCache",
        "explanation": "ElastiCache はインメモリデータストアです。",
        "correct": false
      },
      {
        "text": "AWS CloudFormation",
        "explanation": "CloudFormation で Infrastructure as Code を実現できます。",
        "correct": true
      },
      {
        "text": "AWS CloudTrail",
        "explanation": "CloudTrail は操作を記録しますが構成を作成するテンプレートエンジンではありません。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-011",
    "prompt": "SQL を利用する既存アプリの DB を、OS 管理の負担を減らして運用したい。まず検討するサービスは？",
    "domain": "データベース",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon Route 53",
        "explanation": "DNS サービスです。",
        "correct": false
      },
      {
        "text": "Amazon SQS",
        "explanation": "メッセージキューです。",
        "correct": false
      },
      {
        "text": "Amazon RDS",
        "explanation": "RDS は対応するリレーショナル DB エンジンをマネージドで提供します。",
        "correct": true
      },
      {
        "text": "Amazon S3",
        "explanation": "オブジェクトストレージであり既存 SQL DB の直接代替ではありません。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-012",
    "prompt": "サービス利用者の近くにコンテンツを配置するエッジロケーションを主に利用するサービスは？",
    "domain": "ネットワーク",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon RDS",
        "explanation": "DB インスタンスはリージョン内の AZ に配置されます。",
        "correct": false
      },
      {
        "text": "Amazon EBS",
        "explanation": "EBS ボリュームは AZ に属します。",
        "correct": false
      },
      {
        "text": "Amazon VPC",
        "explanation": "VPC 自体はコンテンツのエッジ配信サービスではありません。",
        "correct": false
      },
      {
        "text": "Amazon CloudFront",
        "explanation": "CloudFront はエッジロケーションから配信します。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-013",
    "prompt": "同じドメインへの HTTP 要求を /api と /images のパスで別のターゲットグループへ振り分けたい。適切なものは？",
    "domain": "ネットワーク",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon EBS",
        "explanation": "ストレージでありロードバランサーではありません。",
        "correct": false
      },
      {
        "text": "Application Load Balancer",
        "explanation": "ALB は HTTP パスなどに基づくルーティングを提供します。",
        "correct": true
      },
      {
        "text": "Network Load Balancer",
        "explanation": "NLB は HTTP パスを評価する L7 ルーターではありません。",
        "correct": false
      },
      {
        "text": "AWS Site-to-Site VPN",
        "explanation": "拠点間の暗号化トンネルです。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-014",
    "prompt": "UDP を使用するゲームサービスの接続を負荷分散したい。適切なサービスは？",
    "domain": "ネットワーク",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "Application Load Balancer",
        "explanation": "ALB は HTTP/HTTPS の L7 負荷分散です。",
        "correct": false
      },
      {
        "text": "Amazon CloudFront",
        "explanation": "汎用 UDP 接続を負荷分散するサービスではありません。",
        "correct": false
      },
      {
        "text": "Amazon API Gateway HTTP API",
        "explanation": "汎用 UDP のリスナーを提供しません。",
        "correct": false
      },
      {
        "text": "Network Load Balancer",
        "explanation": "NLB は UDP のリスナーに対応します。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-listeners.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-015",
    "prompt": "複数 AZ の Linux EC2 から同じ NFS ファイルシステムにアクセスしたい。適切なものは？",
    "domain": "ストレージ",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon EBS の通常の単一アタッチ",
        "explanation": "単一 EC2 向けブロックストレージであり NFS 共有ではありません。",
        "correct": false
      },
      {
        "text": "Amazon RDS",
        "explanation": "リレーショナル DB です。",
        "correct": false
      },
      {
        "text": "Amazon EFS",
        "explanation": "EFS は NFS による共有アクセスに対応します。",
        "correct": true
      },
      {
        "text": "Amazon S3 をブロックデバイスとして接続",
        "explanation": "S3 はブロックデバイスではありません。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-016",
    "prompt": "Windows アプリに SMB 共有と Active Directory 統合が必要。適切なファイルストレージは？",
    "domain": "ストレージ",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon EFS",
        "explanation": "EFS は NFS を利用します。",
        "correct": false
      },
      {
        "text": "Amazon S3",
        "explanation": "S3 API は SMB ファイルサーバーではありません。",
        "correct": false
      },
      {
        "text": "Amazon EBS のスナップショット",
        "explanation": "バックアップ用であり稼働中の SMB 共有ではありません。",
        "correct": false
      },
      {
        "text": "Amazon FSx for Windows File Server",
        "explanation": "Windows 用の SMB ファイル共有と AD 統合に対応します。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-017",
    "prompt": "利用頻度が極めて低い長期保存データで、復元に数時間以上かかってよい。最も適した S3 クラスは？",
    "domain": "ストレージ",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "S3 Glacier Deep Archive",
        "explanation": "低頻度の長期アーカイブ用で、取得には復元処理が必要です。",
        "correct": true
      },
      {
        "text": "S3 Standard",
        "explanation": "即時アクセス向けであり、この条件で長期アーカイブを主目的とするクラスではありません。",
        "correct": false
      },
      {
        "text": "S3 Glacier Instant Retrieval",
        "explanation": "即時取得が必要なアーカイブ向けで、今回の取得時間の緩和を活用しません。",
        "correct": false
      },
      {
        "text": "S3 Express One Zone",
        "explanation": "低レイテンシー・高頻度アクセス向けです。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-018",
    "prompt": "通常の RDS Multi-AZ DB インスタンス配置で standby を置く主な目的は？",
    "domain": "データベース",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "DB の認証を不要にする",
        "explanation": "認証要件はなくなりません。",
        "correct": false
      },
      {
        "text": "障害時の可用性を高める",
        "explanation": "通常の Multi-AZ DB インスタンス配置の standby はフェイルオーバー向けです。",
        "correct": true
      },
      {
        "text": "standby へ SELECT を振り分ける",
        "explanation": "この配置の standby は読み取り用エンドポイントではありません。Multi-AZ DB クラスターとは区別します。",
        "correct": false
      },
      {
        "text": "すべてのクエリを自動で並列実行する",
        "explanation": "standby 配置はクエリ並列化機能ではありません。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-019",
    "prompt": "RDS のプライマリへの読み取り負荷を分散したい。アプリから接続先を分ける前提で適切な構成は？",
    "domain": "データベース",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "AWS WAF を追加",
        "explanation": "WAF は DB の読み取り処理を分散しません。",
        "correct": false
      },
      {
        "text": "Read Replica",
        "explanation": "読み取りレプリカへ読み取りトラフィックを分散できます。複製遅延にも留意します。",
        "correct": true
      },
      {
        "text": "DB のバックアップ保存期間だけを延長",
        "explanation": "バックアップ期間の変更では読み取り負荷を分散しません。",
        "correct": false
      },
      {
        "text": "通常の Multi-AZ standby へ直接接続",
        "explanation": "通常の standby は読み取り処理に利用できません。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-020",
    "prompt": "毎回同じ DB 読み取りを行うアプリで、許容する鮮度の範囲内で応答を高速化したい。適切なサービスは？",
    "domain": "データベース",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon ElastiCache",
        "explanation": "キャッシュにより DB への繰り返しアクセスを減らせます。無効化戦略が必要です。",
        "correct": true
      },
      {
        "text": "AWS CloudTrail",
        "explanation": "監査用イベント記録です。",
        "correct": false
      },
      {
        "text": "Amazon Route 53",
        "explanation": "DNS の管理です。",
        "correct": false
      },
      {
        "text": "AWS Config",
        "explanation": "リソース設定の追跡・評価です。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-021",
    "prompt": "日次集計のため、大量の構造化データを SQL で分析するデータウェアハウスを構築したい。適切なサービスは？",
    "domain": "データベース",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon ElastiCache",
        "explanation": "低レイテンシーキャッシュが主目的です。",
        "correct": false
      },
      {
        "text": "Amazon SQS",
        "explanation": "キューでありデータウェアハウスではありません。",
        "correct": false
      },
      {
        "text": "AWS IAM",
        "explanation": "アクセス権管理です。",
        "correct": false
      },
      {
        "text": "Amazon Redshift",
        "explanation": "Redshift は分析ワークロード向けのデータウェアハウスです。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-022",
    "prompt": "アップロードされた画像をイベントに応じて短時間処理したい。サーバー管理を避ける構成で適切なのは？",
    "domain": "コンピューティング",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon S3 のイベント通知と AWS Lambda",
        "explanation": "S3 イベントを契機に Lambda 関数を実行できます。重複通知等への冪等性も考慮します。",
        "correct": true
      },
      {
        "text": "Route 53 の DNS レコードを追加する",
        "explanation": "DNS レコードでは画像処理を実行しません。",
        "correct": false
      },
      {
        "text": "AWS Budgets の通知だけを使う",
        "explanation": "予算通知はオブジェクトの処理トリガーではありません。",
        "correct": false
      },
      {
        "text": "EBS だけを作成する",
        "explanation": "ブロックストレージだけではイベント処理を実行しません。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-023",
    "prompt": "ECS のコンテナを実行したいが、EC2 インスタンスの容量や OS 管理を避けたい。実行基盤は？",
    "domain": "コンピューティング",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "AWS Direct Connect",
        "explanation": "ネットワーク接続用です。",
        "correct": false
      },
      {
        "text": "AWS Fargate",
        "explanation": "Fargate は ECS のコンテナをサーバー管理なしで実行します。",
        "correct": true
      },
      {
        "text": "Amazon EBS",
        "explanation": "ストレージでありコンテナ実行エンジンではありません。",
        "correct": false
      },
      {
        "text": "AWS CloudFormation だけ",
        "explanation": "リソースを定義しますが、実行基盤自体の選択は必要です。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-024",
    "prompt": "既存の Kubernetes マニフェストや API を活用し、コントロールプレーンの運用負荷を減らしたい。適切なものは？",
    "domain": "コンピューティング",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon S3",
        "explanation": "ストレージです。",
        "correct": false
      },
      {
        "text": "Amazon ECS",
        "explanation": "コンテナ管理サービスですが Kubernetes API の互換先ではありません。",
        "correct": false
      },
      {
        "text": "Amazon EKS",
        "explanation": "EKS は Kubernetes のマネージドコントロールプレーンを提供します。",
        "correct": true
      },
      {
        "text": "Amazon SNS",
        "explanation": "通知サービスです。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-025",
    "prompt": "注文受付と非同期処理を分離し、処理側が一時停止しても注文メッセージを保持したい。適切なサービスは？",
    "domain": "アプリ統合",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "Amazon Route 53",
        "explanation": "DNS サービスはメッセージを保持しません。",
        "correct": false
      },
      {
        "text": "AWS WAF",
        "explanation": "Web 要求の検査用です。",
        "correct": false
      },
      {
        "text": "Amazon EBS のみ",
        "explanation": "キューの可視性タイムアウト等を提供するサービスではありません。",
        "correct": false
      },
      {
        "text": "Amazon SQS",
        "explanation": "SQS キューで非同期処理を疎結合化し、メッセージを保持できます。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-026",
    "prompt": "1つの業務イベントを複数の SQS キューへ配信したい。基本的なファンアウト構成は？",
    "domain": "アプリ統合",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "1つの SQS キューを複数ワーカーで消費する",
        "explanation": "競合コンシューマー方式であり、各ワーカーへ同じメッセージを必ず配信する構成ではありません。",
        "correct": false
      },
      {
        "text": "EBS にトピックを設定する",
        "explanation": "EBS は pub/sub トピックを提供しません。",
        "correct": false
      },
      {
        "text": "SNS トピックに複数の SQS キューを購読させる",
        "explanation": "SNS は複数の購読先への配信に対応します。",
        "correct": true
      },
      {
        "text": "CloudFront の TTL を短くする",
        "explanation": "TTL はメッセージのファンアウトを実現しません。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-027",
    "prompt": "複数 Lambda 処理を順番に実行し、失敗時の再試行や分岐を可視化して定義したい。適切なサービスは？",
    "domain": "アプリ統合",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "AWS Shield",
        "explanation": "DDoS 防御です。",
        "correct": false
      },
      {
        "text": "Amazon EFS",
        "explanation": "ファイルストレージです。",
        "correct": false
      },
      {
        "text": "Amazon Route 53",
        "explanation": "DNS による名前解決等を提供します。",
        "correct": false
      },
      {
        "text": "AWS Step Functions",
        "explanation": "ステートマシンで処理の順序・分岐・再試行を定義できます。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-028",
    "prompt": "EC2 が実際に使うルートテーブルを通じ、NAT を使わず S3 へ Gateway Endpoint 経由で接続したい。必要な設定は？",
    "domain": "ネットワーク",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "無関係なサブネットのルートテーブルだけに関連付ける",
        "explanation": "EC2 の実際の経路が変更されません。",
        "correct": false
      },
      {
        "text": "IAM ロールの付与だけで経路を作る",
        "explanation": "権限とネットワーク経路は別です。",
        "correct": false
      },
      {
        "text": "S3 バケットを常に公開する",
        "explanation": "公開は不要であり、エンドポイント経路の設定にもなりません。",
        "correct": false
      },
      {
        "text": "S3 Gateway Endpoint をそのルートテーブルに関連付ける",
        "explanation": "利用経路のルートテーブルへの関連付けが必要です。IAM やポリシーの許可も別途必要です。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-029",
    "prompt": "DB のパスワードをアプリのソースから分離し、対応する仕組みで自動ローテーションしたい。適切なサービスは？",
    "domain": "セキュリティ",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "Route 53 の公開 TXT レコードに保存する",
        "explanation": "公開 DNS への保存は機密性を保てません。",
        "correct": false
      },
      {
        "text": "AWS KMS のキーだけにパスワードを直接保存する",
        "explanation": "KMS はシークレット保管 API の代替ではありません。",
        "correct": false
      },
      {
        "text": "GitHub の公開リポジトリに保存する",
        "explanation": "秘密情報の公開につながります。",
        "correct": false
      },
      {
        "text": "AWS Secrets Manager",
        "explanation": "シークレットの保管・取得とローテーションに対応します。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-030",
    "prompt": "Web API に対する SQL インジェクションをルールで検査・遮断したい。対応するリソースに関連付けるサービスは？",
    "domain": "セキュリティ",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "AWS WAF",
        "explanation": "WAF の SQL インジェクションルール等で HTTP リクエストを検査できます。",
        "correct": true
      },
      {
        "text": "AWS Shield だけ",
        "explanation": "DDoS 防御と SQL インジェクション対策は同一ではありません。",
        "correct": false
      },
      {
        "text": "AWS Budgets",
        "explanation": "予算管理です。",
        "correct": false
      },
      {
        "text": "Amazon EBS",
        "explanation": "ストレージです。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-031",
    "prompt": "組織内アカウントの利用可能な操作を SCP で制約した。メンバーアカウントの IAM ロールへ権限を与える方法として正しいのは？",
    "domain": "セキュリティ",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "SCP の Allow だけでロールの操作権限が必ず付く",
        "explanation": "SCP 自体は権限付与のポリシーではありません。",
        "correct": false
      },
      {
        "text": "すべての拒否はルートユーザーで回避できる",
        "explanation": "メンバーアカウントのルートユーザーも SCP の制約対象です。",
        "correct": false
      },
      {
        "text": "SCP がネットワークルートを自動作成する",
        "explanation": "権限制約とネットワーク構築は異なります。",
        "correct": false
      },
      {
        "text": "SCP の範囲内で IAM ポリシー等による許可も必要",
        "explanation": "SCP は権限の上限を定めるもので、それ自体は権限を付与しません。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-032",
    "prompt": "AWS リソースの設定変更履歴と、設定ルールへの準拠状況を継続的に確認したい。適切なサービスは？",
    "domain": "運用・管理",
    "certification": "SAA",
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "AWS Direct Connect",
        "explanation": "専用接続のサービスです。",
        "correct": false
      },
      {
        "text": "CloudTrail のログだけ",
        "explanation": "API 操作の監査はできますが、Config の設定ルール評価機能の代替ではありません。",
        "correct": false
      },
      {
        "text": "Amazon SNS だけ",
        "explanation": "通知先にはできますが設定状態を評価しません。",
        "correct": false
      },
      {
        "text": "AWS Config",
        "explanation": "Config はリソース設定の記録とルール評価を行います。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/config/latest/developerguide/WhatIsConfig.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-033",
    "prompt": "AWS の共有責任モデルで、通常 EC2 利用者側が担当するものを2つ選んでください。",
    "domain": "セキュリティ",
    "certification": "CLF",
    "difficulty": 1,
    "selectCount": 2,
    "choices": [
      {
        "text": "AWS データセンターの物理入館管理",
        "explanation": "物理設備の管理は AWS 側の責任です。",
        "correct": false
      },
      {
        "text": "ゲスト OS のパッチ適用",
        "explanation": "EC2 のゲスト OS 管理は利用者側です。",
        "correct": true
      },
      {
        "text": "アプリに与える IAM 権限の設定",
        "explanation": "ワークロードのアクセス制御は利用者が設計します。",
        "correct": true
      },
      {
        "text": "基盤ハイパーバイザーの保守",
        "explanation": "AWS 側が管理する基盤の責任です。",
        "correct": false
      },
      {
        "text": "物理サーバーの交換",
        "explanation": "物理ハードウェアの管理は AWS が行います。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-034",
    "prompt": "SQS Standard の処理で考慮するべき特性を2つ選んでください。",
    "domain": "アプリ統合",
    "certification": "SAA",
    "difficulty": 3,
    "selectCount": 2,
    "choices": [
      {
        "text": "厳密な順序が常に保証される",
        "explanation": "Standard はベストエフォートの順序です。",
        "correct": false
      },
      {
        "text": "同じメッセージが再配信されることはない",
        "explanation": "重複配信の可能性があります。",
        "correct": false
      },
      {
        "text": "処理時間に応じた可視性タイムアウトを設定する",
        "explanation": "処理中の不要な再配信を抑えるために重要です。",
        "correct": true
      },
      {
        "text": "受信した瞬間にメッセージが自動で完全削除される",
        "explanation": "通常は処理後に削除 API を呼びます。",
        "correct": false
      },
      {
        "text": "少なくとも1回の配信を前提に冪等な処理を設計する",
        "explanation": "重複による二重処理を避ける必要があります。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-035",
    "prompt": "プライベートサブネットの EC2 から IPv4 インターネットへの発信を NAT Gateway 経由で行う。必要な構成を2つ選んでください。",
    "domain": "ネットワーク",
    "certification": "SAA",
    "difficulty": 3,
    "selectCount": 2,
    "choices": [
      {
        "text": "パブリック NAT Gateway に Elastic IP を関連付け、配置先から IGW への経路を用意する",
        "explanation": "インターネット向け変換と外部への経路を確保します。",
        "correct": true
      },
      {
        "text": "全 EC2 のセキュリティグループに全受信を許可する",
        "explanation": "全受信許可は NAT の必要条件ではありません。",
        "correct": false
      },
      {
        "text": "NAT Gateway をプライベートサブネットに置くだけ",
        "explanation": "インターネットへの発信にはパブリック NAT と IGW 側の経路が必要です。",
        "correct": false
      },
      {
        "text": "プライベート側のデフォルトルートを NAT Gateway に向ける",
        "explanation": "発信トラフィックを NAT へ転送する経路が必要です。",
        "correct": true
      },
      {
        "text": "プライベート側に IGW への直接経路だけを設定する",
        "explanation": "プライベート IPv4 のみでは IGW 経由で直接インターネット接続できません。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-036",
    "prompt": "EC2 アプリの可用性を1つの AZ の障害に対して高める構成を2つ選んでください。",
    "domain": "コンピューティング",
    "certification": "SAA",
    "difficulty": 3,
    "selectCount": 2,
    "choices": [
      {
        "text": "ALB で複数 AZ の正常なターゲットへルーティングする",
        "explanation": "複数 AZ のターゲットを利用して障害影響を抑えます。",
        "correct": true
      },
      {
        "text": "複数 AZ にまたがる Auto Scaling グループを使う",
        "explanation": "AZ を分散して冗長性を高められます。",
        "correct": true
      },
      {
        "text": "全 EC2 を同じ AZ に集約する",
        "explanation": "AZ 障害が共通障害点になります。",
        "correct": false
      },
      {
        "text": "DNS TTL を無限にする",
        "explanation": "障害ドメインの分離にならず、切替にも不適切です。",
        "correct": false
      },
      {
        "text": "全インスタンスを同じ配置先で大型化する",
        "explanation": "スケールアップだけでは AZ 障害への冗長化になりません。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/autoscaling/ec2/userguide/auto-scaling-benefits.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-037",
    "prompt": "S3 のデータを誤削除から守る設計として適切なものを2つ選んでください。",
    "domain": "ストレージ",
    "certification": "SAA",
    "difficulty": 3,
    "selectCount": 2,
    "choices": [
      {
        "text": "バケットを公開読み書き可能にする",
        "explanation": "誤削除・不正操作のリスクを高めます。",
        "correct": false
      },
      {
        "text": "CloudFront の TTL だけを延長する",
        "explanation": "キャッシュはオブジェクトの保護や復元ポリシーの代替ではありません。",
        "correct": false
      },
      {
        "text": "削除操作を必要最小限の IAM 権限に制限する",
        "explanation": "不要な削除権限を減らすことは保護の基本です。",
        "correct": true
      },
      {
        "text": "バージョニングを使えば過去バージョンも絶対に削除されないと判断する",
        "explanation": "権限があればバージョンを指定した恒久削除等が可能です。",
        "correct": false
      },
      {
        "text": "バージョニングを有効にする",
        "explanation": "過去バージョンの保持により誤上書きや削除への復元手段になります。",
        "correct": true
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-038",
    "prompt": "IAM ロールを使って EC2 上のアプリから S3 にアクセスする利点を2つ選んでください。",
    "domain": "セキュリティ",
    "certification": "SAA",
    "difficulty": 3,
    "selectCount": 2,
    "choices": [
      {
        "text": "ネットワーク経路の設定が不要になる",
        "explanation": "権限と経路は独立した条件です。",
        "correct": false
      },
      {
        "text": "ソースコードに長期アクセスキーを埋め込まずに済む",
        "explanation": "ロールの一時認証情報を利用できます。",
        "correct": true
      },
      {
        "text": "すべての S3 オブジェクトが自動で公開される",
        "explanation": "IAM ロールの利用はパブリック公開を意味しません。",
        "correct": false
      },
      {
        "text": "一時認証情報の更新を AWS SDK 等で扱える",
        "explanation": "対応する認証情報プロバイダーで自動的に取得・更新できます。",
        "correct": true
      },
      {
        "text": "アプリが必要とする権限の設計が不要になる",
        "explanation": "最小権限の設計は引き続き必要です。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-039",
    "prompt": "DynamoDB の設計について正しいものを2つ選んでください。",
    "domain": "データベース",
    "certification": "SAA",
    "difficulty": 3,
    "selectCount": 2,
    "choices": [
      {
        "text": "全データを同じパーティションキー値へ集中させるのが常に最善",
        "explanation": "負荷が偏り、ホットパーティションの原因になります。",
        "correct": false
      },
      {
        "text": "すべてのアクセスは SQL JOIN が基本になる",
        "explanation": "キーやインデックスを利用したアクセスパターンを設計します。",
        "correct": false
      },
      {
        "text": "アクセスパターンに基づいてキーを設計する",
        "explanation": "取得方法を先に考えることが重要です。",
        "correct": true
      },
      {
        "text": "特定のキーへの負荷集中を考慮する",
        "explanation": "パーティションキーの分散は性能設計上の重要事項です。",
        "correct": true
      },
      {
        "text": "NoSQL のためトランザクション API はない",
        "explanation": "DynamoDB にもトランザクション API があります。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  },
  {
    "id": "aws-040",
    "prompt": "AWS の暗号化と秘密情報管理について正しいものを2つ選んでください。",
    "domain": "セキュリティ",
    "certification": "SAA",
    "difficulty": 3,
    "selectCount": 2,
    "choices": [
      {
        "text": "KMS があればすべてのアプリ通信が自動で TLS 化される",
        "explanation": "KMS の利用だけで通信経路は暗号化されません。",
        "correct": false
      },
      {
        "text": "Secrets Manager は DB パスワード等の保存・取得に使える",
        "explanation": "アプリは適切な権限でシークレットを取得します。",
        "correct": true
      },
      {
        "text": "Secrets Manager のシークレットを公開 JavaScript に埋め込む",
        "explanation": "クライアント配信で秘密は公開されてしまいます。",
        "correct": false
      },
      {
        "text": "KMS は暗号化キーの管理と暗号操作を支援する",
        "explanation": "KMS はキーの制御を提供します。",
        "correct": true
      },
      {
        "text": "S3 の暗号化を有効にすると IAM 認可は不要になる",
        "explanation": "暗号化とアクセス権の制御は別です。",
        "correct": false
      }
    ],
    "source": "https://docs.aws.amazon.com/kms/latest/developerguide/overview.html",
    "reviewStatus": "独自教材・公式出典付き（専門家レビュー未実施）"
  }
];

import { Q_FOUNDATIONAL } from "./q-foundational.js";
import { Q_ASSOCIATE } from "./q-associate.js";
import { Q_PROFESSIONAL } from "./q-professional.js";

// 既存 60 問に、試験ガイドの分野と論点の重要度を付ける(分野は問題の領域から対応付け)
const AREA_TO_DOMAIN = {
  "CLF-C02": (a) => (a === "セキュリティ" ? 2 : a === "コスト最適化" ? 4 : 3),
  "SAA-C03": (a) => (a === "セキュリティ" ? 1 : a === "高可用性" ? 2 : a === "コスト最適化" ? 4 : 3),
  "DVA-C03": (a) => (a === "セキュリティ" ? 2 : a === "高可用性" || a === "パフォーマンス" ? 4 : 1),
  "DVA-C02": (a) => (a === "セキュリティ" ? 2 : a === "高可用性" || a === "パフォーマンス" ? 4 : 1),
  "SAP-C03": (a) => (a === "セキュリティ" ? 2 : a === "高可用性" ? 4 : a === "コスト最適化" ? 3 : 1),
  "SAP-C02": (a) => (a === "セキュリティ" ? 1 : a === "高可用性" || a === "コスト最適化" ? 3 : 2),
  "SOA-C03": (a) => (a === "セキュリティ" ? 4 : a === "高可用性" ? 2 : 1),
};
const FAMILY_TO_CODES = { CLF: ["CLF-C02"], SAA: ["SAA-C03"], DVA: ["DVA-C03", "DVA-C02"], SAP: ["SAP-C03", "SAP-C02"], SOA: ["SOA-C03"] };
function withExams(q) {
  if (q.exams) return q;
  const tier = q.difficulty <= 2 ? "core" : "common";
  const exams = {};
  for (const f of q.certifications || [q.certification])
    for (const code of FAMILY_TO_CODES[f] || []) exams[code] = [AREA_TO_DOMAIN[code](q.domain), tier];
  return { ...q, exams, certifications: q.certifications || [q.certification] };
}
export const questions = [...baseQuestions, ...labQuestions, ...Q_FOUNDATIONAL, ...Q_ASSOCIATE, ...Q_PROFESSIONAL].map(withExams);
