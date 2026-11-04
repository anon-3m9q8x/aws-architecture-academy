export const labQuestions = [
  {
    "id": "lab-n01",
    "prompt": "VPC内のプライベートサブネットに接続したLambda関数から、同一リージョンのDynamoDBテーブルへ読み書きしたい。インターネットゲートウェイとNATゲートウェイは使わず、エンドポイントの追加料金も発生させない構成はどれですか。",
    "domain": "コスト最適化",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "DVA"
    ],
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "DynamoDB用のゲートウェイVPCエンドポイントを作成し、Lambdaが接続するサブネットのルートテーブルに関連付ける",
        "correct": true,
        "explanation": "ゲートウェイエンドポイントはDynamoDB(とS3)にIGWやNATなしで到達でき、追加料金がかからない。ルートテーブルへの関連付けでトラフィックが経路に乗る。"
      },
      {
        "text": "NATゲートウェイを作成し、プライベートサブネットのルートに追加する",
        "correct": false,
        "explanation": "到達はできるが、条件の「NATゲートウェイを使わない」に反する。"
      },
      {
        "text": "Lambdaの接続先をパブリックサブネットへ変更する",
        "correct": false,
        "explanation": "VPC接続のLambdaはパブリックサブネットに接続してもインターネットアクセスを得られない(公式)。条件のIGW不使用にも反する。"
      },
      {
        "text": "Lambdaのセキュリティグループでインバウンド443を許可する",
        "correct": false,
        "explanation": "問題は通信経路(ルート)がないことで、セキュリティグループは経路を提供しない。DynamoDBへの通信はLambdaからのアウトバウンドでもある。"
      }
    ],
    "source": "https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-ddb.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-ddb.html",
        "claim": "DynamoDBへはゲートウェイエンドポイントで到達でき、ルートテーブルに追加し、追加料金がない"
      },
      {
        "url": "https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html",
        "claim": "VPC接続Lambdaはパブリックサブネットに接続してもインターネットアクセスを得られない"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "ゲートウェイVPCエンドポイント(DynamoDB)を作成し、Lambdaのサブネットのルートテーブルに関連付けるのが最適です。",
    "assumptions": [
      "Lambdaはプライベートサブネットのみに接続",
      "DynamoDBは同一リージョン",
      "インターフェースエンドポイントを使う設計はこの問題の検討外"
    ]
  },
  {
    "id": "lab-n02",
    "prompt": "SQS標準キューをイベントソースとするLambda関数(タイムアウト60秒)で、処理中のメッセージが再表示され重複処理される。公式の推奨に沿ったキューの設定はどれですか。",
    "domain": "パフォーマンス",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "DVA"
    ],
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "キューの可視性タイムアウトを、関数タイムアウトの6倍以上(360秒以上)にする",
        "correct": true,
        "explanation": "公式は、バッチ処理の時間を確保するため可視性タイムアウトを関数タイムアウトの少なくとも6倍にするよう推奨している。"
      },
      {
        "text": "キューの可視性タイムアウトを30秒にする",
        "correct": false,
        "explanation": "関数タイムアウト(60秒)より短い設定はLambdaがエラーとして拒否する。短ければ処理中に再表示される問題も悪化する。"
      },
      {
        "text": "メッセージ保持期間を最大にする",
        "correct": false,
        "explanation": "保持期間はメッセージを保存する期間で、処理中メッセージがいつ再表示されるかは可視性タイムアウトで決まる。"
      },
      {
        "text": "キューの配信遅延(DelaySeconds)を設定する",
        "correct": false,
        "explanation": "配信遅延は送信後に見え始めるまでの遅れで、処理中メッセージの再表示を防がない。"
      }
    ],
    "source": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html",
        "claim": "可視性タイムアウトは関数タイムアウトの少なくとも6倍。関数タイムアウトは可視性タイムアウト以下である必要がある"
      },
      {
        "url": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html",
        "claim": "関数のエラー時は可視性タイムアウト経過後にメッセージが再表示される"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "可視性タイムアウトを関数タイムアウトの6倍以上にします(今回は360秒以上)。",
    "assumptions": [
      "標準キュー",
      "イベントソースマッピングで接続",
      "関数タイムアウトは60秒"
    ]
  },
  {
    "id": "lab-n03",
    "prompt": "インターネット向けALBを作成したが、クライアントから接続できない。調べると、ALBのサブネットのルートテーブルにインターネットゲートウェイへのルートがなかった。適切な修正はどれですか。",
    "domain": "セキュリティ",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "CLF"
    ],
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "ALBを、インターネットゲートウェイへのルートを持つパブリックサブネットに配置する",
        "correct": true,
        "explanation": "インターネット向けALBにはパブリックサブネット(IGWへのルートあり)を指定する必要がある(公式のトラブルシューティング)。"
      },
      {
        "text": "ALBのセキュリティグループでアウトバウンドをすべて許可する",
        "correct": false,
        "explanation": "接続できない原因はサブネットの経路で、セキュリティグループの設定では解決しない。"
      },
      {
        "text": "ターゲットのEC2にElastic IPを割り当てる",
        "correct": false,
        "explanation": "クライアントが接続する先はALBで、ALBが到達不能な点は変わらない。"
      },
      {
        "text": "プライベートサブネットにNATゲートウェイを作成する",
        "correct": false,
        "explanation": "NATは内側から外へ出る通信用で、外からALBへ届く経路にはならない。"
      }
    ],
    "source": "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html",
        "claim": "インターネット向けLBがプライベートサブネットにあると接続できない。パブリックサブネットを指定する"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "ALBをIGWへのルートを持つパブリックサブネットに配置します。",
    "assumptions": [
      "インターネット向け(internet-facing)のALB",
      "リスナーポートの許可は設定済み"
    ]
  },
  {
    "id": "lab-n04",
    "prompt": "S3バケットのオブジェクトを別リージョンのバケットへレプリケーションしたい。レプリケーションルールを作成する前に、ソースと宛先の両方のバケットで有効にしておく必要がある機能はどれですか。",
    "domain": "高可用性",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "SAP"
    ],
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "バージョニング",
        "correct": true,
        "explanation": "公式のレプリケーション手順では、ソースと宛先のバケットを作成してバージョニングを有効にすることが前提になっている。"
      },
      {
        "text": "S3 Transfer Acceleration",
        "correct": false,
        "explanation": "レプリケーション手順の前提として挙げられていない。"
      },
      {
        "text": "S3 Inventory",
        "correct": false,
        "explanation": "レプリケーション手順の前提として挙げられていない。"
      },
      {
        "text": "リクエスタ支払い(Requester Pays)",
        "correct": false,
        "explanation": "レプリケーション手順の前提として挙げられていない。"
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html",
        "claim": "レプリケーションの手順で、ソースと宛先のバケットを作成しバージョニングを有効にする"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "ソース・宛先の両バケットでバージョニングを有効にします。",
    "assumptions": [
      "ここでは「バケット側で有効化する機能」だけを問う",
      "IAMロールなどレプリケーション自体の設定は別問題"
    ]
  },
  {
    "id": "lab-n05",
    "prompt": "東京リージョンのALB配下で本番を運用し、障害時にだけ大阪リージョンのALB配下の待機系へDNSで切り替えたい。Route 53の適切な構成はどれですか。",
    "domain": "高可用性",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "SOA"
    ],
    "difficulty": 2,
    "selectCount": 1,
    "choices": [
      {
        "text": "フェールオーバールーティングで、プライマリ(東京)とセカンダリ(大阪)のエイリアスレコードを作り、Evaluate Target Healthを有効にする",
        "correct": true,
        "explanation": "アクティブ-パッシブはフェールオーバールーティングで構成する。プライマリが異常のときにセカンダリを応答する。ALBのエイリアスはEvaluate Target Healthで正常性を判定できる。"
      },
      {
        "text": "加重ルーティングで東京と大阪を50%ずつにする",
        "correct": false,
        "explanation": "通常時から両リージョンに流れるアクティブ-アクティブで、待機系という要件に合わない。"
      },
      {
        "text": "レイテンシールーティングで東京と大阪を登録する",
        "correct": false,
        "explanation": "ユーザーに近いリージョンへ振り分ける構成で、通常時から両方が稼働するアクティブ-アクティブになる。"
      },
      {
        "text": "東京のレコードだけを作成し、障害時に手動で大阪のレコードを追加する",
        "correct": false,
        "explanation": "自動で切り替わらず、DNSの手動作業が必要。要件の「障害時にDNSで切り替え」を自動化できない。"
      }
    ],
    "source": "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html",
        "claim": "アクティブ-パッシブはフェールオーバールーティング。プライマリが異常ならセカンダリを応答。アクティブ-アクティブはフェールオーバー以外のポリシー"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "フェールオーバールーティングのプライマリ/セカンダリ(エイリアス+Evaluate Target Health)を使います。",
    "assumptions": [
      "待機系は大阪に用意済み",
      "データ同期は別途設計"
    ]
  },
  {
    "id": "lab-n06",
    "prompt": "ALBのターゲットがunhealthyのままになっている。アプリはEC2の8080番ポートで待ち受けている。確認して修正すべき点を2つ選んでください。",
    "domain": "高可用性",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "SOA"
    ],
    "difficulty": 2,
    "selectCount": 2,
    "choices": [
      {
        "text": "ヘルスチェックのポートとパスが、アプリが実際に待ち受け・応答する内容(8080、成功コード)と一致している",
        "correct": true,
        "explanation": "ターゲットがヘルスチェックポートで待ち受けて、期待する成功コード(既定は200)を返す必要がある。"
      },
      {
        "text": "EC2のセキュリティグループが、ALBからのヘルスチェックポート(8080)の通信を許可している",
        "correct": true,
        "explanation": "ターゲットのセキュリティグループは、ヘルスチェックのポートとプロトコルでロードバランサーからの通信を許可する必要がある。"
      },
      {
        "text": "ALBのリスナーを443から80へ変更する",
        "correct": false,
        "explanation": "リスナーはクライアントとALB間の設定で、ALBとターゲット間のヘルスチェックには直接関係しない。"
      },
      {
        "text": "EC2にElastic IPを割り当てる",
        "correct": false,
        "explanation": "ALBはVPC内のプライベートな経路でターゲットへ到達する。ヘルスチェックの失敗はElastic IPでは解決しない。"
      },
      {
        "text": "ALBを別のプライベートサブネットへ移す",
        "correct": false,
        "explanation": "経路の問題ではなくポート・パス・セキュリティグループの不一致が疑われる。インターネット向けALBはパブリックサブネットが必要。"
      }
    ],
    "source": "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html",
        "claim": "ターゲットのSGはLBからのヘルスチェックポート・プロトコルを許可する必要がある。ポート、成功コード、パスの確認"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "ヘルスチェックのポート/パス/成功コードの一致と、ターゲットのSGがALBからの通信を許可していることを確認します。",
    "assumptions": [
      "ALBとターゲットは同一VPC",
      "NACLは通信を許可済み"
    ]
  },
  {
    "id": "lab-n07",
    "prompt": "EventBridgeのルールからSQS標準キューへイベントを送り、Lambdaがバッチで取り出してDynamoDBへ書き込む構成。一部の不正データのせいで同じバッチが繰り返し失敗し、成功済みのレコードも再処理されて重複書き込みと滞留が起きている。メッセージを失わず、重複の影響を抑えて処理を継続できる対策を2つ選んでください。",
    "domain": "高可用性",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "DVA",
      "SAP"
    ],
    "difficulty": 3,
    "selectCount": 2,
    "choices": [
      {
        "text": "ソースキューにデッドレターキューとredrive policyを設定し、maxReceiveCountを5以上にする",
        "correct": true,
        "explanation": "繰り返し失敗するメッセージをDLQへ隔離でき、失わずに後から調査・再処理できる。公式は、ソースキューのmaxReceiveCountを少なくとも5にするよう推奨している。"
      },
      {
        "text": "部分バッチ応答(ReportBatchItemFailures)を有効にして失敗したメッセージIDだけを返し、DynamoDBへの書き込みを冪等にする",
        "correct": true,
        "explanation": "既定ではバッチ内の1件の失敗で全メッセージが再表示され、同じメッセージを複数回処理しうる。失敗分だけ返せば成功済み分の再処理を避けられ、冪等な書き込みで残る重複の影響も抑えられる。"
      },
      {
        "text": "Lambdaのメモリを増やす",
        "correct": false,
        "explanation": "原因は不正データによる処理エラーで、処理能力の不足ではない。"
      },
      {
        "text": "キューのメッセージ保持期間を短くする",
        "correct": false,
        "explanation": "滞留した失敗メッセージが期限切れで消え、「メッセージを失わない」に反する。"
      },
      {
        "text": "可視性タイムアウトを0秒にする",
        "correct": false,
        "explanation": "関数タイムアウトは可視性タイムアウト以下である必要があり、0では設定自体が検証エラーになる。"
      }
    ],
    "source": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html",
        "claim": "maxReceiveCountは少なくとも5。関数タイムアウト≦可視性タイムアウト"
      },
      {
        "url": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html",
        "claim": "バッチ失敗時は全メッセージが再表示され複数回処理されうる。ReportBatchItemFailuresで失敗分のみ返せる"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "DLQ+redrive policyで毒メッセージを隔離し、部分バッチ応答と冪等な書き込みで再処理の影響を局所化します。",
    "assumptions": [
      "標準キュー(FIFOではない)",
      "Lambdaはイベントソースマッピングで接続",
      "書き込みは冪等キー等で制御できる"
    ]
  },
  {
    "id": "lab-n08",
    "prompt": "NATゲートウェイもインターネットゲートウェイもないVPCのプライベートサブネットで、ECS Fargate(プラットフォームバージョン1.4.0以上)のサービスを動かす。タスクはECRのイメージをpullし、Secrets Managerからシークレットを取得し、awslogsドライバーでCloudWatch Logsへログを出力する。タスクがイメージをpullできない。必要な構成はどれですか。",
    "domain": "高可用性",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "SAP"
    ],
    "difficulty": 3,
    "selectCount": 1,
    "choices": [
      {
        "text": "ecr.api・ecr.dkr・secretsmanager・logsのインターフェースVPCエンドポイントと、S3のゲートウェイエンドポイントを作成し、プライベートDNSを有効にして、エンドポイントのセキュリティグループでタスクからの443を許可する",
        "correct": true,
        "explanation": "ECRにはecr.apiとecr.dkrが必要で、イメージレイヤーはS3にあるためS3ゲートウェイエンドポイントも必要。Secrets ManagerとCloudWatch Logsにも各インターフェースエンドポイントが必要。"
      },
      {
        "text": "ecr.dkrのインターフェースエンドポイントとS3ゲートウェイエンドポイントだけを作成する",
        "correct": false,
        "explanation": "Fargate 1.4.0以降ではecr.apiも必要。さらにSecrets ManagerとCloudWatch Logsへの経路がない。"
      },
      {
        "text": "S3のゲートウェイエンドポイントだけを作成する",
        "correct": false,
        "explanation": "ECRのAPIとレジストリ、Secrets Manager、CloudWatch Logsへの経路が不足する。"
      },
      {
        "text": "ECR・Secrets Manager・CloudWatch Logsのインターフェースエンドポイントを作成し、S3のエンドポイントは作らない",
        "correct": false,
        "explanation": "ECRはイメージレイヤーの保存にS3を使うため、S3ゲートウェイエンドポイントが必要。"
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html",
        "claim": "ECR利用にはecr.api・ecr.dkrとS3ゲートウェイが必要(Fargate 1.4.0以降)。awslogsにはlogsエンドポイント。SGは443を許可"
      },
      {
        "url": "https://docs.aws.amazon.com/secretsmanager/latest/userguide/vpc-endpoint-overview.html",
        "claim": "Secrets Managerへはインターフェースエンドポイント(com.amazonaws.region.secretsmanager)で接続できる"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "ECR(api/dkr)・Secrets Manager・CloudWatch Logsのインターフェースエンドポイント+S3ゲートウェイエンドポイントが必要です。",
    "assumptions": [
      "Fargateプラットフォームバージョン1.4.0以上",
      "タスク実行ロールにECR・ログ・シークレット取得の権限がある",
      "エンドポイントのSGはタスクからの443を許可する"
    ]
  },
  {
    "id": "lab-n09",
    "prompt": "アカウントAのLambda関数(実行ロール arn:aws:iam::111111111111:role/fn)が、アカウントBのS3バケットのオブジェクトを読み取りたいが、AccessDeniedになる。最小権限で必要な設定を2つ選んでください。",
    "domain": "セキュリティ",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "SAP"
    ],
    "difficulty": 3,
    "selectCount": 2,
    "choices": [
      {
        "text": "アカウントBのバケットポリシーで、アカウントAのロールをPrincipalに指定してs3:GetObjectを許可する",
        "correct": true,
        "explanation": "クロスアカウントでは、リソース側(アカウントB)のポリシーが要求元のプリンシパルを許可する必要がある。"
      },
      {
        "text": "アカウントAのロールのIDベースポリシーで、対象バケットのオブジェクトへのs3:GetObjectを許可する",
        "correct": true,
        "explanation": "要求元アカウントのIDベースポリシーも許可が必要。両方がAllowのときだけ許可される。"
      },
      {
        "text": "アカウントBのバケットのパブリックアクセスをすべて許可する",
        "correct": false,
        "explanation": "最小権限に反し、必要以上に公開される。"
      },
      {
        "text": "アカウントAのLambda関数のリソースベースポリシーで、アカウントBのS3バケットへのアクセスを許可する",
        "correct": false,
        "explanation": "Lambdaのリソースベースポリシーは関数を誰が呼び出せるかを定めるもので、関数がS3へアクセスする許可にはならない。"
      },
      {
        "text": "アカウントBに同名のIAMユーザーを作成する",
        "correct": false,
        "explanation": "アカウントをまたぐ許可は、ユーザーの名前の一致では成立しない。"
      }
    ],
    "source": "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html",
        "claim": "クロスアカウントではIDベースポリシーとリソースベースポリシーの両方の評価がAllowであること"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "アカウントBのバケットポリシーとアカウントAのロールのIDポリシーの両方で許可します。",
    "assumptions": [
      "KMS暗号化は使っていない",
      "SCPなどのガードレールは影響しない"
    ]
  },
  {
    "id": "lab-n10",
    "prompt": "同じLambda関数に2つのSQS標準キュー(AとB)がイベントソースとして接続されている。キューAの処理だけを同時実行数10以内に抑えてRDSを守りたいが、キューBの処理は妨げたくない。最適な設定はどれですか。",
    "domain": "パフォーマンス",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "DVA"
    ],
    "difficulty": 3,
    "selectCount": 1,
    "choices": [
      {
        "text": "キューAのイベントソースマッピングに最大同時実行数10を設定し、関数の予約済み同時実行数が全SQSイベントソースの最大同時実行数の合計以上であることを確認する",
        "correct": true,
        "explanation": "最大同時実行数はSQSイベントソースごとの上限。関数の予約済み同時実行数が合計より小さいとスロットリングされうる。"
      },
      {
        "text": "関数の予約済み同時実行数を10にする",
        "correct": false,
        "explanation": "関数全体に効くため、キューBの処理も制限される。"
      },
      {
        "text": "関数のタイムアウトを短くする",
        "correct": false,
        "explanation": "同時実行数の上限にはならず、処理が打ち切られやすくなるだけ。"
      },
      {
        "text": "キューAの可視性タイムアウトを短くする",
        "correct": false,
        "explanation": "再表示が早まって重複処理が増える可能性があり、同時実行の制御にはならない。"
      }
    ],
    "source": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html",
        "claim": "最大同時実行数はイベントソースごとに設定でき、予約済み同時実行数とは独立。合計以上の予約が必要"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "キューAのイベントソースマッピングに最大同時実行数を設定します。",
    "assumptions": [
      "Provisioned Modeは使用しない",
      "最大同時実行数はコンソールでは2〜1,000の範囲"
    ]
  },
  {
    "id": "lab-n11",
    "prompt": "メッセージの順序保持が必須のSQS FIFOキューをLambdaで処理している。部分バッチ応答(ReportBatchItemFailures)を有効にした。バッチ内でメッセージの処理が途中で失敗した場合、順序を保つための正しい戻し方はどれですか。",
    "domain": "高可用性",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "DVA"
    ],
    "difficulty": 3,
    "selectCount": 1,
    "choices": [
      {
        "text": "最初に失敗したメッセージ以降の、失敗したものと未処理のものをすべてbatchItemFailuresで返し、そこで処理を止める",
        "correct": true,
        "explanation": "FIFOでは最初の失敗後に処理を止め、失敗と未処理のメッセージをすべて返すことで順序を保つ(公式)。"
      },
      {
        "text": "失敗したメッセージだけを返し、後続のメッセージは成功として処理を続ける",
        "correct": false,
        "explanation": "失敗メッセージが後続より後で処理され、順序が崩れる。"
      },
      {
        "text": "例外をスローして関数を異常終了させる",
        "correct": false,
        "explanation": "例外をスローするとバッチ全体が失敗扱いになる。"
      },
      {
        "text": "batchItemFailuresのitemIdentifierを空文字にして返す",
        "correct": false,
        "explanation": "空のitemIdentifierは無効な応答で、バッチ全体が失敗扱いになる。"
      }
    ],
    "source": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html",
        "claim": "FIFOでは最初の失敗後に処理を止め、失敗と未処理を返す。例外スローや無効な応答はバッチ全体の失敗"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "最初の失敗以降の失敗・未処理メッセージをすべてbatchItemFailuresで返します。",
    "assumptions": [
      "FIFOキュー",
      "部分バッチ応答を有効化済み"
    ]
  },
  {
    "id": "lab-n12",
    "prompt": "SQS標準キューのメッセージをLambdaで処理している。ソースキューのredrive policyはmaxReceiveCount=1で、DLQがある。Lambdaが一時的にスロットリングされただけで、正常なメッセージが次々にDLQへ移動してしまう。公式の推奨に沿った対策はどれですか。",
    "domain": "高可用性",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "DVA"
    ],
    "difficulty": 3,
    "selectCount": 1,
    "choices": [
      {
        "text": "ソースキューのmaxReceiveCountを少なくとも5に引き上げる",
        "correct": true,
        "explanation": "公式は、Lambdaに数回再試行の機会を与えてからDLQへ送るため、maxReceiveCountを少なくとも5にするよう推奨している。"
      },
      {
        "text": "DLQを削除して失敗メッセージを破棄する",
        "correct": false,
        "explanation": "本当に処理できないメッセージを隔離・調査できなくなる。"
      },
      {
        "text": "メッセージ保持期間を最大にする",
        "correct": false,
        "explanation": "受信回数がmaxReceiveCountを超えた時点でDLQへ移る動作は変わらない。"
      },
      {
        "text": "Lambdaのタイムアウトを最大にする",
        "correct": false,
        "explanation": "スロットリングは関数が起動できない状態で、タイムアウトの長さでは解決しない。"
      }
    ],
    "source": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html",
        "claim": "maxReceiveCountは少なくとも5を推奨"
      },
      {
        "url": "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html",
        "claim": "スロットリング時は同時実行が段階的に減らされ、メッセージは可視性タイムアウト後に再表示"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "maxReceiveCountを5以上にします。",
    "assumptions": [
      "標準キュー",
      "一時的なスロットリング"
    ]
  },
  {
    "id": "lab-n13",
    "prompt": "ALBがときどきHTTP 504を返す。ターゲットのサブネットにはカスタムのネットワークACLがあり、インバウンドはリスナー用ポートだけを許可している。公式のトラブルシューティングに照らして、最も疑うべき原因はどれですか。",
    "domain": "セキュリティ",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "SOA"
    ],
    "difficulty": 3,
    "selectCount": 1,
    "choices": [
      {
        "text": "ターゲットのサブネットのネットワークACLが、ALBノードへの一時ポート(1024〜65535)宛のアウトバウンドを許可していない",
        "correct": true,
        "explanation": "504の原因として、NACLがターゲットからロードバランサーノードへの一時ポートの通信を許可していないことが挙げられている。"
      },
      {
        "text": "ALBがパブリックサブネットに配置されている",
        "correct": false,
        "explanation": "インターネット向けALBの正しい配置で、504の原因ではない。"
      },
      {
        "text": "ターゲットグループの登録解除の遅延が長い",
        "correct": false,
        "explanation": "登録解除の遅延は、解除されたターゲットで処理中のリクエストが完了する時間に関係する別の話題で、公式の504の原因には挙がっていない。"
      },
      {
        "text": "ALBのリスナーが443ではなく80で待ち受けている",
        "correct": false,
        "explanation": "リスナーのポート選択そのものは504の原因ではない。"
      }
    ],
    "source": "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html",
        "claim": "504の原因: NACLがターゲットからLBノードへの一時ポート(1024-65535)を許可していない"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "NACLのアウトバウンドの一時ポート許可を確認します。",
    "assumptions": [
      "ターゲットへの接続自体は確立できている",
      "SGは許可済み"
    ]
  },
  {
    "id": "lab-n14",
    "prompt": "VPCに接続したLambda関数が、VPC内のRDSと、インターネット上の外部API(HTTPS)の両方へ接続する必要がある。現在、パブリックサブネット2つに接続しており、そのルートテーブルにはIGWへのルートがあるが、外部APIの呼び出しだけタイムアウトする。最小の修正はどれですか。",
    "domain": "セキュリティ",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "DVA"
    ],
    "difficulty": 3,
    "selectCount": 1,
    "choices": [
      {
        "text": "Lambdaの接続先をプライベートサブネットに変更し、そのルートテーブルの0.0.0.0/0を、パブリックサブネット上のNATゲートウェイへ向ける",
        "correct": true,
        "explanation": "パブリックサブネットへ接続してもインターネットアクセスは得られない。プライベートサブネット+NATゲートウェイの経路が必要で、VPC内のRDSにも到達できる。"
      },
      {
        "text": "パブリックサブネットのルートテーブルに、IGWへのルートをもう一度追加する",
        "correct": false,
        "explanation": "すでにIGWへのルートはあるが、VPC接続のLambdaはパブリックサブネットでもインターネットアクセスを得られない。"
      },
      {
        "text": "Lambdaのセキュリティグループのアウトバウンドをすべて許可する",
        "correct": false,
        "explanation": "アウトバウンド許可は必要条件だが、パブリックサブネットに接続しても経路が得られない問題は残る。"
      },
      {
        "text": "Lambdaの接続をVPCなしに戻す",
        "correct": false,
        "explanation": "VPC内のRDSに到達できなくなる。"
      }
    ],
    "source": "https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html",
        "claim": "パブリックサブネットに接続してもインターネットアクセスは得られない。プライベートサブネットはNATゲートウェイ経由"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "Lambdaをプライベートサブネットに接続し、NATゲートウェイ経由で外部へ出します。",
    "assumptions": [
      "NATゲートウェイは未作成またはルート未設定",
      "RDSは同一VPC"
    ]
  },
  {
    "id": "lab-n15",
    "prompt": "ALB配下のEC2上のアプリで、まれにHTTP 502が発生する。調査の結果、ALBが再利用しようとした接続を、アプリ側が先に閉じていることが分かった。ALBの設定は変更できず、アプリ側の設定だけ変更できる。適切な対応はどれですか。",
    "domain": "高可用性",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "SOA"
    ],
    "difficulty": 3,
    "selectCount": 1,
    "choices": [
      {
        "text": "アプリのkeep-alive時間を、ALBのアイドルタイムアウトより長くする",
        "correct": true,
        "explanation": "公式は、ターゲットのkeep-alive時間がロードバランサーのアイドルタイムアウトより短くないかを確認するよう示している。"
      },
      {
        "text": "アプリのkeep-alive時間を、ALBのアイドルタイムアウトより短くする",
        "correct": false,
        "explanation": "アプリが先に接続を閉じる状況がむしろ起きやすくなる。"
      },
      {
        "text": "ヘルスチェック間隔を長くする",
        "correct": false,
        "explanation": "502の原因である接続の先閉じとは無関係。"
      },
      {
        "text": "登録解除の遅延を0秒にする",
        "correct": false,
        "explanation": "登録解除の遅延は、解除されたターゲットで処理中のリクエストに関わる設定で、この原因とは異なる。"
      }
    ],
    "source": "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html",
        "claim": "502の原因: ターゲットがALBの接続を閉じる。ターゲットのkeep-aliveがLBのアイドルタイムアウトより短くないか確認"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "アプリのkeep-aliveをALBのアイドルタイムアウトより長くします。",
    "assumptions": [
      "原因は接続の先閉じと確認済み",
      "ALB側の変更は不可"
    ]
  },
  {
    "id": "lab-n16",
    "prompt": "VPCにS3のゲートウェイエンドポイントを作成した。サブネットAのEC2はS3へ到達できるが、同じVPCのサブネットBのEC2は到達できない。サブネットBはプライベートで、NATもない。適切な修正はどれですか。",
    "domain": "コスト最適化",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "CLF"
    ],
    "difficulty": 3,
    "selectCount": 1,
    "choices": [
      {
        "text": "ゲートウェイエンドポイントに、サブネットBが使うルートテーブルを関連付ける",
        "correct": true,
        "explanation": "ゲートウェイエンドポイントのルートは、関連付けたルートテーブルにだけ追加される。関連付けのないサブネットはエンドポイントを使わない。"
      },
      {
        "text": "別のリージョンにもゲートウェイエンドポイントを作成する",
        "correct": false,
        "explanation": "ゲートウェイエンドポイントは作成したリージョンでのみ利用できる。同一VPCの問題は解決しない。"
      },
      {
        "text": "サブネットBにNATゲートウェイを作成する",
        "correct": false,
        "explanation": "到達はできても追加コストが発生する。ルートテーブルの関連付けだけで解決でき、最小の修正ではない。"
      },
      {
        "text": "オンプレミスからのVPN経由でS3へアクセスさせる",
        "correct": false,
        "explanation": "ゲートウェイエンドポイントはVPNやDirect Connectの先からは使えない。"
      }
    ],
    "source": "https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html",
        "claim": "関連付けたルートテーブルにルートが追加される。関連付けのないサブネットは公開エンドポイントを使う。リージョンごと"
      },
      {
        "url": "https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-ddb.html",
        "claim": "ゲートウェイエンドポイントはVPN・Direct Connect・TGW経由では使えない"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "エンドポイントにサブネットBのルートテーブルを関連付けます。",
    "assumptions": [
      "サブネットBのルートテーブルはAと別",
      "S3は同一リージョン"
    ]
  },
  {
    "id": "lab-n17",
    "prompt": "ALB+EC2 Auto Scaling+RDSで東京リージョンに本番を構築している。要件は(1)単一AZの障害ではサービスを自動継続、(2)リージョン全体の障害時は大阪リージョンで復旧(RPOは数分、RTOは数十分〜数時間まで許容)、(3)平常時の追加コストは最小限。最適な構成はどれですか。",
    "domain": "高可用性",
    "certification": "SAA",
    "certifications": [
      "SAA",
      "SAP"
    ],
    "difficulty": 4,
    "selectCount": 1,
    "choices": [
      {
        "text": "東京はALB・Auto Scaling・RDSをMulti-AZで構成し、大阪へデータを継続的にレプリケーションする。大阪のアプリケーション層はAMIとIaCで準備しておき、通常は停止しておく(パイロットライト)",
        "correct": true,
        "explanation": "AZ障害はMulti-AZで自動継続。リージョン障害にはデータを継続レプリケーションして低RPOを確保し、コンピュートは平常時停止でコストを抑える。"
      },
      {
        "text": "東京はSingle-AZのまま、夜間のスナップショットを大阪へコピーする",
        "correct": false,
        "explanation": "AZ障害で自動継続できず、RPOも最大で1日となって「数分」を満たさない。"
      },
      {
        "text": "東京と大阪の両方にフル構成を常時稼働させる(アクティブ-アクティブ)",
        "correct": false,
        "explanation": "要件は満たすが、平常時の追加コストが最大で「最小限」に反する。"
      },
      {
        "text": "東京だけをMulti-AZで構成し、大阪には何も用意しない",
        "correct": false,
        "explanation": "リージョン障害時の復旧先とデータがなく、要件(2)を満たさない。"
      }
    ],
    "source": "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html",
        "claim": "パイロットライトはデータを他リージョンへ複製し、アプリサーバーは停止。低RPOには継続的レプリケーション。ウォームスタンバイはスケールアップのみで済む"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "東京Multi-AZ+大阪へのデータ継続レプリケーションとアプリ層の停止状態の準備(パイロットライト)が最適です。",
    "assumptions": [
      "RPO・RTOはこの問題文で定義した値",
      "リージョン障害の頻度は低い想定",
      "データストアは継続レプリケーションに対応している"
    ]
  },
  {
    "id": "lab-n18",
    "prompt": "組織のOUに付けているSCPを、FullAWSAccessから「ec2:*のみ許可する許可リストSCP」に差し替えた。OU内のアカウントのロールはAdministratorAccessを持つが、S3の操作がAccessDeniedになる。このOUではEC2に加えてS3も許可し、他のサービスは許可しない。ルートとアカウントにはFullAWSAccessが付いている。最小の変更はどれですか。",
    "domain": "セキュリティ",
    "certification": "SAA",
    "certifications": [
      "SAP",
      "SAA"
    ],
    "difficulty": 4,
    "selectCount": 1,
    "choices": [
      {
        "text": "OUの許可リストSCPにs3:*を追加する",
        "correct": true,
        "explanation": "許可は、ルートから対象アカウントまでの各レベルで明示的にAllowされている必要がある。OUの許可リストにs3:*を足せば、このOUでEC2とS3だけが許可される。"
      },
      {
        "text": "ロールのIAMポリシーにs3:*を追加する",
        "correct": false,
        "explanation": "ロールはすでにAdministratorAccessで、SCPが上限として拒否している。IAMポリシーを足しても超えられない。"
      },
      {
        "text": "アカウントにs3:*を許可するSCPを追加する",
        "correct": false,
        "explanation": "OUレベルにAllowがないと、アカウントレベルにAllowを足しても許可されない(各レベルでAllowが必要)。"
      },
      {
        "text": "OUにs3:*のDenyを持つSCPを追加する",
        "correct": false,
        "explanation": "Denyは禁止を追加するもので、S3を許可する目的と逆。"
      }
    ],
    "source": "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_evaluation.html#strategy_using_scps",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_evaluation.html#strategy_using_scps",
        "claim": "許可はルートからアカウントまでの各レベルで明示的なAllowが必要。FullAWSAccessがない階層ではすべて拒否"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "OUの許可リストSCPにs3:*を追加します。",
    "assumptions": [
      "ルートとアカウントのSCPはFullAWSAccess",
      "S3以外の追加サービスは不要"
    ]
  },
  {
    "id": "lab-n19",
    "prompt": "VPC接続のLambda関数が、(1)パブリックなSaaSのAPI(HTTPS)、(2)DynamoDB、(3)VPC内のRDSへ接続する。現在はパブリックサブネット2つに接続していて、(1)と(2)がタイムアウトする。セキュリティ要件として、DynamoDBへの通信はNATやインターネットの経路に流したくない。すべてを満たす変更を3つ選んでください。",
    "domain": "セキュリティ",
    "certification": "SAA",
    "certifications": [
      "SAP",
      "SAA"
    ],
    "difficulty": 4,
    "selectCount": 3,
    "choices": [
      {
        "text": "Lambdaの接続先を、複数AZのプライベートサブネットに変更する",
        "correct": true,
        "explanation": "パブリックサブネットに接続してもインターネットアクセスは得られない。プライベートサブネットに接続し、NAT経由で外へ出す。"
      },
      {
        "text": "パブリックサブネットにNATゲートウェイを作成し、プライベートサブネットのルートテーブルの0.0.0.0/0をNATへ向ける",
        "correct": true,
        "explanation": "SaaS APIへの外向きHTTPS通信に必要。"
      },
      {
        "text": "DynamoDB用のゲートウェイエンドポイントを作成し、プライベートサブネットのルートテーブルに関連付ける",
        "correct": true,
        "explanation": "DynamoDBへの通信をNATやインターネットを経由させずに行える。"
      },
      {
        "text": "Lambdaが接続するパブリックサブネットのルートテーブルに、IGWへのルートを追加する",
        "correct": false,
        "explanation": "すでにあっても、VPC接続のLambdaはパブリックサブネットではインターネットアクセスを得られない。"
      },
      {
        "text": "LambdaにElastic IPを割り当てる",
        "correct": false,
        "explanation": "VPC接続のLambdaがインターネットへ出る方法として、公式の手順はプライベートサブネット+NATである。"
      },
      {
        "text": "DynamoDBもNAT経由で到達できるので、追加のエンドポイントは不要とする",
        "correct": false,
        "explanation": "到達自体はできるが、「DynamoDBへの通信をNATやインターネットの経路に流さない」という要件に反する。"
      }
    ],
    "source": "https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html",
        "claim": "パブリックサブネットに接続してもインターネットアクセスなし。プライベートサブネット+NATゲートウェイ"
      },
      {
        "url": "https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html",
        "claim": "ゲートウェイエンドポイントはIGWやNAT不要でDynamoDB/S3へ到達"
      },
      {
        "url": "https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-ddb.html",
        "claim": "DynamoDBのゲートウェイエンドポイントをルートテーブルに追加する"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "プライベートサブネットへ接続し、NATゲートウェイで外部APIへ、DynamoDBはゲートウェイエンドポイントで接続します。",
    "assumptions": [
      "RDSは同一VPC内で、到達に追加設定は不要",
      "SaaSはパブリックなHTTPSエンドポイント",
      "選択数3"
    ]
  },
  {
    "id": "lab-n20",
    "prompt": "東京のS3バケット(SSE-KMSで暗号化)を、同一アカウントの大阪のバケットへレプリケーションするルールを作ったが、SSE-KMSで暗号化されたオブジェクトが複製されない。必要な対応を3つ選んでください。",
    "domain": "高可用性",
    "certification": "SAA",
    "certifications": [
      "SAP",
      "SAA"
    ],
    "difficulty": 4,
    "selectCount": 3,
    "choices": [
      {
        "text": "レプリケーションルールで、KMSで暗号化されたオブジェクトのレプリケーション(SseKmsEncryptedObjects)を有効にする",
        "correct": true,
        "explanation": "既定ではSSE-KMSのオブジェクトは複製されない。明示的にオプトインする必要がある。"
      },
      {
        "text": "宛先バケットと同じリージョン(大阪)のKMSキーを、レプリカの暗号化キー(ReplicaKmsKeyID)に指定する",
        "correct": true,
        "explanation": "KMSキーは宛先バケットと同じリージョンで作成されている必要がある。"
      },
      {
        "text": "レプリケーション用IAMロールに、ソースキーへのkms:Decryptと宛先キーへのkms:Encrypt、s3:GetObjectVersionForReplicationを許可する",
        "correct": true,
        "explanation": "ロールには、ソースの復号と、レプリカの暗号化に必要なKMS権限と、レプリケーション用の取得権限が必要。"
      },
      {
        "text": "東京のKMSキーをそのままReplicaKmsKeyIDに指定する",
        "correct": false,
        "explanation": "KMSキーは作成したリージョンの外では共有されず、宛先バケットと同じリージョンのキーが必要。"
      },
      {
        "text": "宛先バケットをパブリックに書き込み可能にする",
        "correct": false,
        "explanation": "レプリケーションはIAMロールで行う。公開は不要で危険。"
      },
      {
        "text": "ソースバケットのバージョニングを無効にして構成を単純にする",
        "correct": false,
        "explanation": "レプリケーションはバージョニングの有効化が前提で、無効にはできない。"
      }
    ],
    "source": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html",
    "sources": [
      {
        "url": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html",
        "claim": "SSE-KMSはオプトインが必要。ReplicaKmsKeyIDは宛先リージョンのキー。ロールにkms:Decrypt/Encryptとs3:GetObjectVersionForReplication。バージョニング前提"
      }
    ],
    "reviewStatus": "添付Lab由来・専門家レビュー未実施",
    "provenance": "AWS Architecture Lab.html",
    "conclusion": "SSE-KMSのオプトイン、宛先リージョンのKMSキーの指定、ロールへのKMS権限の付与が必要です。",
    "assumptions": [
      "同一アカウント",
      "対象は新しくアップロードされるオブジェクト",
      "選択数3"
    ]
  }
];
