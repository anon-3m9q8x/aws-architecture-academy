// コマンド・ポリシー演習: CloudFormation テンプレート(12 問)。模擬デプロイ(検証・組み込み関数の解決・作成順序)のあと、
// 作られるリソースの設定を checks で確かめる。security: true のチェックを満たさないと「セキュリティ警告」。
// 実際の AWS にはデプロイしない。RESOURCE_SPECS に無いリソースタイプは「判定対象外」。
import { evaluate } from "../../lab-engine/simulator-iam.js";
import { matchPattern } from "../../lab-engine/events.js";

const ACCOUNT = "111122223333";
const R = {
  anatomy: { title: "CloudFormation テンプレートの構造", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-anatomy.html" },
  intrinsic: { title: "組み込み関数のリファレンス", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference.html" },
  ref: { title: "Ref(リソースごとの戻り値)", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-ref.html" },
  getatt: { title: "Fn::GetAtt", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-getatt.html" },
  dependsOn: { title: "DependsOn 属性", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-dependson.html" },
  deletion: { title: "DeletionPolicy 属性", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html" },
  s3: { title: "AWS::S3::Bucket", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-bucket.html" },
  s3sec: { title: "Amazon S3 のセキュリティのベストプラクティス", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html" },
  sg: { title: "AWS::EC2::SecurityGroup", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroup.html" },
  sgIngress: { title: "AWS::EC2::SecurityGroupIngress(循環参照を避ける)", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroupingress.html" },
  lambda: { title: "AWS::Lambda::Function", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html" },
  conditions: { title: "Conditions セクション", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/conditions-section-structure.html" },
  params: { title: "Parameters セクション", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html" },
  rds: { title: "AWS::RDS::DBInstance", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbinstance.html" },
  rdsSecret: { title: "RDS と Secrets Manager によるパスワード管理(ManageMasterUserPassword)", url: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html" },
  outputs: { title: "Outputs セクションとエクスポート", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html" },
  crossStack: { title: "スタック間の参照(Fn::ImportValue)", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/walkthrough-crossstackref.html" },
  iamRole: { title: "AWS::IAM::Role", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iam-role.html" },
  ddbArn: { title: "DynamoDB のリソースの ARN(テーブル・インデックス)", url: "https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondynamodb.html" },
  rule: { title: "AWS::Events::Rule", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-events-rule.html" },
  ebSqs: { title: "EventBridge のターゲットに SQS を使うときのアクセス許可", url: "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html#eb-sqs-permissions" },
  deputy: { title: "サービス間の混乱した代理の防止", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html" },
  validate: { title: "テンプレートの検証", url: "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-validate-template.html" },
};

/* ---------- checks 用の小さな部品 ---------- */
const all = (st, type) => Object.entries(st.resources).filter(([, r]) => r.type === type).map(([lid, r]) => ({ lid, ...r }));
const one = (st, type) => all(st, type)[0];
const isTrue = (v) => v === true || v === "true";
/** インライン・単独の両方のセキュリティグループのルールを集める */
function ingress(st) {
  const out = [];
  for (const sg of all(st, "AWS::EC2::SecurityGroup")) for (const r of [].concat(sg.props.SecurityGroupIngress || [])) out.push({ group: sg.physicalId, ...r });
  for (const r of all(st, "AWS::EC2::SecurityGroupIngress")) out.push({ group: r.props.GroupId, ...r.props });
  return out;
}
const covers = (r, port) => String(r.IpProtocol) === "-1" || (Number(r.FromPort) <= port && port <= Number(r.ToPort));
const sgOf = (st, lid) => st.resources[lid]?.physicalId;

export const CFN_QUESTIONS = [
  {
    id: "cfn-read-001", category: "cfn", mode: "read", level: 1, examTags: ["SOA", "DVA", "DOP"], services: ["cfn", "lambda", "s3", "iam"],
    title: "作成の順序と、Ref・GetAtt が返す値",
    scenario: "次のテンプレートをデプロイします。正しい説明をすべて選んでください。右の「模擬デプロイ」で、作成の順序と、参照が解決された値を確かめられます。",
    environment: ["スタック名: lab-stack", "リージョン ap-northeast-1、アカウント 111122223333"],
    code: `AWSTemplateFormatVersion: "2010-09-09"
Description: アップロードされたファイルを処理する関数
Resources:
  DataBucket:
    Type: AWS::S3::Bucket
  FnRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: lambda.amazonaws.com }
            Action: sts:AssumeRole
  ProcessFn:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: python3.13
      Handler: app.handler
      Role: !GetAtt FnRole.Arn
      Code:
        ZipFile: "def handler(event, context): return 'ok'"
      Environment:
        Variables:
          BUCKET_NAME: !Ref DataBucket
  FnLogs:
    Type: AWS::Logs::LogGroup
    DependsOn: ProcessFn
    Properties:
      RetentionInDays: 30
`,
    codeKind: "cfn",
    multi: true,
    choices: [
      { text: "ProcessFn は、DataBucket と FnRole の作成が終わってから作られる", correct: true, why: "!Ref DataBucket と !GetAtt FnRole.Arn の参照が、暗黙の依存関係になる。" },
      { text: "DataBucket と FnRole は、互いに依存しないので並行して作られうる", correct: true, why: "どちらも他のリソースを参照していない。CloudFormation は依存の無いリソースを並行して作る。" },
      { text: "環境変数 BUCKET_NAME には、バケットの ARN(arn:aws:s3:::…)が入る", correct: false, why: "AWS::S3::Bucket の Ref はバケット名を返す。ARN は !GetAtt DataBucket.Arn。" },
      { text: "FnLogs は参照を持たないので、最初に作られる", correct: false, why: "DependsOn: ProcessFn があるため、ProcessFn の作成後に作られる(この例では最後)。" },
    ],
    hints: ["!Ref や !GetAtt で別のリソースを参照すると、参照先が先に作られます(暗黙の依存関係)。", "参照の無い順序の指定は DependsOn で書きます。", "Ref が返す値はリソースタイプごとに決まっています(S3 バケットはバケット名)。"],
    explain: {
      point: "CloudFormation はテンプレートの参照(Ref・GetAtt・Sub)と DependsOn から依存関係のグラフを作り、依存の無いリソースは並行に、依存のあるリソースは参照先の完了後に作ります。削除はその逆順です。Ref の戻り値はリソースタイプごとに違い、S3 バケットは名前、IAM ロールはロール名、Lambda 関数は関数名です。",
      compare: "Lambda の Role プロパティにはロールの ARN が必要なので !GetAtt FnRole.Arn を使います(!Ref FnRole はロール名で、作成時にエラーになる)。DependsOn は、参照は無いが順序が必要な場合(例: ルートテーブルのルートより先にゲートウェイのアタッチ)に使います。",
      pitfalls: ["テンプレートに書いた順に作られると考える", "Ref は常に ID や ARN を返すと考える"],
    },
    references: [R.dependsOn, R.ref, R.getatt], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cfn-s3-002", category: "cfn", mode: "write", level: 2, examTags: ["SAA", "SCS", "SOA"], services: ["cfn", "s3", "kms"],
    title: "安全な既定値の S3 バケットをテンプレートで作る",
    scenario: "監査ログを保存するバケット AuditBucket を、テンプレートで作ります。バージョニング・SSE-KMS による既定の暗号化・パブリックアクセスのブロック(4 項目すべて)を有効にし、スタックを削除してもバケットが残るようにしてください。",
    environment: ["リソースの論理 ID: AuditBucket", "暗号化のキーは AWS 管理キー(aws/s3)でよい(KMSMasterKeyID は省略可)"],
    requirements: ["VersioningConfiguration の Status を Enabled", "BucketEncryption の既定の暗号化を aws:kms", "PublicAccessBlockConfiguration の 4 項目をすべて true", "DeletionPolicy を Retain"],
    editor: { language: "yaml", stackName: "audit-stack", starter: `AWSTemplateFormatVersion: "2010-09-09"
Description: 監査ログ用のバケット
Resources:
  AuditBucket:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - Key: Purpose
          Value: audit
` },
    checks: [
      { label: "バージョニングが有効", test: (s) => one(s, "AWS::S3::Bucket")?.props.VersioningConfiguration?.Status === "Enabled" },
      { label: "既定の暗号化が SSE-KMS(aws:kms)", test: (s) => [].concat(one(s, "AWS::S3::Bucket")?.props.BucketEncryption?.ServerSideEncryptionConfiguration || []).some((c) => c.ServerSideEncryptionByDefault?.SSEAlgorithm === "aws:kms") },
      { label: "パブリックアクセスのブロック 4 項目がすべて有効", security: true, test: (s) => { const p = one(s, "AWS::S3::Bucket")?.props.PublicAccessBlockConfiguration || {}; return ["BlockPublicAcls", "BlockPublicPolicy", "IgnorePublicAcls", "RestrictPublicBuckets"].every((k) => isTrue(p[k])); } },
      { label: "スタックを削除してもバケットが残る(DeletionPolicy: Retain)", test: (s) => one(s, "AWS::S3::Bucket")?.deletionPolicy === "Retain" },
    ],
    hints: ["DeletionPolicy は Properties の中ではなく、Type と同じ階層に書きます。", "BucketEncryption → ServerSideEncryptionConfiguration(リスト)→ ServerSideEncryptionByDefault → SSEAlgorithm: aws:kms", "PublicAccessBlockConfiguration には BlockPublicAcls・BlockPublicPolicy・IgnorePublicAcls・RestrictPublicBuckets を書きます。"],
    model: `AWSTemplateFormatVersion: "2010-09-09"
Description: 監査ログ用のバケット
Resources:
  AuditBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain
    UpdateReplacePolicy: Retain
    Properties:
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: aws:kms
            BucketKeyEnabled: true
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      Tags:
        - Key: Purpose
          Value: audit
`,
    explain: {
      point: "DeletionPolicy はリソースの属性で、スタックの削除時にリソースを消すか(Delete・既定)、残すか(Retain)、スナップショットを取るか(Snapshot)を決めます。UpdateReplacePolicy は、更新でリソースが置き換えられるときの古いリソースの扱いです。暗号化・バージョニング・パブリックアクセスのブロックはプロパティで指定します。",
      compare: "現在の S3 は、新しいバケットで SSE-S3 の暗号化とパブリックアクセスのブロックが既定で有効です。それでもテンプレートに明示しておくと、意図が読み取れ、ドリフトの検出や設定の監査がしやすくなります。BucketKeyEnabled は KMS の呼び出し回数(コスト)を減らします。",
      pitfalls: ["DeletionPolicy を Properties の中に書く → 不明なプロパティのエラー", "SSEAlgorithm を AES256 にする(SSE-S3)", "パブリックアクセスのブロックを一部だけ有効にする"],
    },
    references: [R.s3, R.deletion, R.s3sec], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cfn-sg-003", category: "cfn", mode: "fix", level: 2, examTags: ["SAA", "SCS", "SOA"], services: ["cfn", "ec2", "vpc"],
    title: "【障害対応】SSH がインターネットに開いている",
    scenario: "セキュリティ診断で「web-sg が SSH(22 番)を 0.0.0.0/0 に公開している」と指摘されました。HTTPS(443)は今までどおり全体に公開し、SSH は社内ネットワーク 198.51.100.0/24 からだけにしてください。",
    environment: ["VPC: vpc-0a1b2c3d4e5f00001(パラメーター VpcId の既定値)", "社内ネットワーク: 198.51.100.0/24", "現在のテンプレートが右のエディターに入っています"],
    requirements: ["443 は 0.0.0.0/0 から許可", "22 は 198.51.100.0/24 からだけ", "0.0.0.0/0 から 22 番に届くルールを残さない(ポートの範囲指定にも注意)"],
    editor: { language: "yaml", stackName: "web-stack", starter: `AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
    Default: vpc-0a1b2c3d4e5f00001
Resources:
  WebSg:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: web servers
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0
` },
    checks: [
      { label: "443 が 0.0.0.0/0 から許可されている", test: (s) => ingress(s).some((r) => covers(r, 443) && r.CidrIp === "0.0.0.0/0") },
      { label: "22 が 198.51.100.0/24 から許可されている", test: (s) => ingress(s).some((r) => covers(r, 22) && r.CidrIp === "198.51.100.0/24") },
      { label: "0.0.0.0/0 から 22 番に届くルールが無い", security: true, test: (s) => !ingress(s).some((r) => covers(r, 22) && (r.CidrIp === "0.0.0.0/0" || r.CidrIpv6 === "::/0")) },
    ],
    hints: ["SSH のルールの CidrIp を社内ネットワークの CIDR に変えます。", "IpProtocol: -1(すべて)や FromPort 0〜ToPort 65535 のルールも 22 番を含みます。"],
    model: `AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
    Default: vpc-0a1b2c3d4e5f00001
Resources:
  WebSg:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: web servers
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 198.51.100.0/24
          Description: SSH from corporate network
`,
    explain: {
      point: "セキュリティグループのインバウンドルールは許可だけを書き、どれか 1 つに一致すれば通信が許可されます。0.0.0.0/0 から 22 番を開けると、インターネット全体から SSH のログイン試行を受けます。範囲のルール(0〜65535 や -1)も 22 番を含む点に注意します。",
      compare: "より安全なのは SSH を開けず、Systems Manager の Session Manager で接続する方法です(インバウンドのルールが不要で、操作のログも残る)。AWS Config のマネージドルール restricted-ssh で、このような設定を継続的に検出できます。",
      pitfalls: ["443 のルールまで消してしまう", "IPv6(::/0)のルールを見落とす", "セキュリティグループに Deny を書こうとする(書けない。拒否はネットワーク ACL)"],
    },
    references: [R.sg, { title: "Session Manager(SSH を開けずに接続)", url: "https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html" }], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cfn-ref-004", category: "cfn", mode: "fix", level: 2, examTags: ["DVA", "SOA"], services: ["cfn", "lambda", "iam"],
    title: "【障害対応】Lambda の Role に !Ref を渡している",
    scenario: "スタックの作成で、関数 ReportFn が「Role の値が ARN ではない」という理由で失敗します。テンプレートを直して、関数にロールの ARN を渡してください。関数名をほかのリソースに渡している箇所はそのままにします。",
    environment: ["ロール ReportRole(論理 ID)", "関数 ReportFn(論理 ID)", "スケジュール用のルール NightlyRule が関数を呼び出す"],
    requirements: ["ReportFn の Role にロールの ARN を渡す", "NightlyRule のターゲットは関数の ARN のまま"],
    editor: { language: "yaml", stackName: "report-stack", starter: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  ReportRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: lambda.amazonaws.com }
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  ReportFn:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: python3.13
      Handler: app.handler
      Role: !Ref ReportRole
      Code:
        ZipFile: "def handler(event, context): return 'ok'"
  NightlyRule:
    Type: AWS::Events::Rule
    Properties:
      ScheduleExpression: cron(0 15 * * ? *)
      Targets:
        - Id: report
          Arn: !GetAtt ReportFn.Arn
` },
    checks: [
      { label: "ReportFn の Role がロールの ARN", test: (s) => /^arn:aws:iam::\d{12}:role\//.test(String(s.resources.ReportFn?.props.Role)) },
      { label: "NightlyRule のターゲットが関数の ARN", test: (s) => /^arn:aws:lambda:/.test(String(s.resources.NightlyRule?.props.Targets?.[0]?.Arn)) },
    ],
    hints: ["模擬デプロイの結果で、ReportFn の Role に解決された値を見ましょう。", "AWS::IAM::Role の Ref はロール名を返します。", "ARN は !GetAtt ReportRole.Arn で取得します。"],
    model: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  ReportRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: lambda.amazonaws.com }
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  ReportFn:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: python3.13
      Handler: app.handler
      Role: !GetAtt ReportRole.Arn
      Code:
        ZipFile: "def handler(event, context): return 'ok'"
  NightlyRule:
    Type: AWS::Events::Rule
    Properties:
      ScheduleExpression: cron(0 15 * * ? *)
      Targets:
        - Id: report
          Arn: !GetAtt ReportFn.Arn
`,
    explain: {
      point: "Ref と GetAtt はリソースタイプごとに返す値が決まっています。IAM ロールの Ref はロール名、GetAtt の Arn は ARN です。Lambda の Role プロパティは ARN を要求するため、!Ref では作成時に失敗します。テンプレートの検証(ValidateTemplate)では値の形式までは確かめないので、デプロイして初めて分かる誤りです。",
      compare: "スケジュールで関数を呼ぶ実際の構成では、EventBridge が関数を呼べるよう AWS::Lambda::Permission(Principal events.amazonaws.com、SourceArn にルールの ARN)も必要です。cfn-lint を使うと、このようなプロパティの値の誤りをデプロイ前に検出できます。",
      pitfalls: ["!Ref ReportRole.Arn と書く(Ref に属性は付けられない)", "!GetAtt ReportRole.RoleName を使う(名前であり ARN ではない)"],
    },
    references: [R.ref, R.getatt, R.lambda], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cfn-typo-005", category: "cfn", mode: "fix", level: 2, examTags: ["SOA", "DVA", "DOP"], services: ["cfn", "s3"],
    title: "【障害対応】テンプレートのエラーを行番号から順に直す",
    scenario: "ログ用バケットとそのバケットポリシーのテンプレートが、検証の段階で失敗します。エラーの行番号を手掛かりに、すべての誤りを直してデプロイできるようにしてください。",
    environment: ["バケット LogBucket(バージョニングを有効にする意図)", "バケットポリシー LogBucketPolicy(HTTPS 以外を拒否)"],
    requirements: ["テンプレートのエラーをすべて直す", "LogBucket のバージョニングが有効", "LogBucketPolicy が LogBucket に付く"],
    editor: { language: "yaml", stackName: "log-stack", starter: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  LogBucket:
    Type: AWS::S3::Bucket
    Properties:
      VersioningConfig:
        Status: Enabled
  LogBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref LogsBucket
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Sid: DenyInsecureTransport
            Effect: Deny
            Principal: "*"
            Action: s3:*
            Resource:
              - !GetAtt LogBucket.Arn
              - !Sub "\${LogBucket.Arn}/*"
            Condition:
              Bool:
                aws:SecureTransport: "false"
` },
    checks: [
      { label: "LogBucket のバージョニングが有効", test: (s) => s.resources.LogBucket?.props.VersioningConfiguration?.Status === "Enabled" },
      { label: "LogBucketPolicy が LogBucket に付いている", test: (s) => s.resources.LogBucketPolicy?.props.Bucket === s.resources.LogBucket?.physicalId },
      { label: "HTTPS 以外を拒否するステートメントが残っている", security: true, test: (s) => [].concat(s.resources.LogBucketPolicy?.props.PolicyDocument?.Statement || []).some((x) => x.Effect === "Deny" && String(x.Condition?.Bool?.["aws:SecureTransport"]) === "false") },
    ],
    hints: ["エラーは 1 つずつ表示されます。直したら、もう一度「模擬デプロイ」を実行します。", "プロパティ名は大文字・小文字も含めて正確に書きます(VersioningConfiguration)。", "Unresolved resource dependencies は、存在しない論理 ID を参照しているという意味です。"],
    model: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  LogBucket:
    Type: AWS::S3::Bucket
    Properties:
      VersioningConfiguration:
        Status: Enabled
  LogBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref LogBucket
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Sid: DenyInsecureTransport
            Effect: Deny
            Principal: "*"
            Action: s3:*
            Resource:
              - !GetAtt LogBucket.Arn
              - !Sub "\${LogBucket.Arn}/*"
            Condition:
              Bool:
                aws:SecureTransport: "false"
`,
    explain: {
      point: "CloudFormation のエラーは段階的に見つかります。まずテンプレートの形式(セクション・プロパティ名・必須項目)、次に参照の解決(論理 ID の存在)、最後に実際の作成時のエラーです。エラーメッセージの「extraneous key」は不明なプロパティ、「Unresolved resource dependencies」は存在しない論理 ID への参照です。",
      compare: "!Sub \"${LogBucket.Arn}/*\" は GetAtt の値を文字列に埋め込む書き方で、!Join を使うより読みやすくなります。エディターの拡張機能や cfn-lint を使うと、プロパティ名の誤りは入力の時点で分かります。",
      pitfalls: ["エラーを 1 つ直したら完了と考える(次の段階のエラーが出る)", "Bool の値 \"false\" を引用符なしの false にする(YAML の真偽値になる。ポリシーでは文字列が推奨)"],
    },
    references: [R.validate, R.anatomy, R.ref], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cfn-cond-006", category: "cfn", mode: "write", level: 3, examTags: ["SOA", "DOP", "SAA"], services: ["cfn", "dynamodb", "cloudwatch"],
    title: "パラメーターと条件で、本番だけ保護と監視を有効にする",
    scenario: "同じテンプレートで開発(dev)と本番(prod)の環境を作ります。テーブル OrdersTable のポイントインタイムリカバリ(PITR)と削除保護は本番だけ有効にし、スロットリングのアラーム ThrottleAlarm は本番だけ作ってください。",
    environment: ["パラメーター Env(dev / prod、既定 dev)", "採点では Env=dev と Env=prod の両方でデプロイして確かめる"],
    requirements: ["条件 IsProd(Env が prod)を定義する", "prod: PITR 有効・DeletionProtectionEnabled true・ThrottleAlarm を作る", "dev: PITR 無効・削除保護なし・アラームを作らない", "テンプレートは 1 つで、環境ごとに分けない"],
    editor: { language: "yaml", stackName: "orders-stack", params: { Env: "dev" }, variants: { dev: { Env: "dev" }, prod: { Env: "prod" } }, starter: `AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  Env:
    Type: String
    AllowedValues: [dev, prod]
    Default: dev
Resources:
  OrdersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: orderId
          AttributeType: S
      KeySchema:
        - AttributeName: orderId
          KeyType: HASH
  ThrottleAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      Namespace: AWS/DynamoDB
      MetricName: ThrottledRequests
      Dimensions:
        - Name: TableName
          Value: !Ref OrdersTable
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
` },
    checks: (() => {
      const tbl = (st) => one(st, "AWS::DynamoDB::Table")?.props || {};
      const pitr = (st) => isTrue(tbl(st).PointInTimeRecoverySpecification?.PointInTimeRecoveryEnabled);
      const alarm = (st) => all(st, "AWS::CloudWatch::Alarm").length > 0;
      return [
        { label: "prod: PITR が有効", test: (s) => pitr(s.variants.prod) },
        { label: "prod: 削除保護が有効", test: (s) => isTrue(tbl(s.variants.prod).DeletionProtectionEnabled) },
        { label: "prod: ThrottleAlarm が作られる", test: (s) => alarm(s.variants.prod) },
        { label: "dev: PITR・削除保護が無効", test: (s) => !pitr(s.variants.dev) && !isTrue(tbl(s.variants.dev).DeletionProtectionEnabled) },
        { label: "dev: アラームが作られない", test: (s) => !alarm(s.variants.dev) },
      ];
    })(),
    hints: ["Conditions セクションに IsProd: !Equals [!Ref Env, prod] を書きます。", "プロパティの値の切り替えは !If [IsProd, 本番の値, 開発の値] です。", "リソースごと作るかどうかは、リソースに Condition: IsProd を付けます(Type と同じ階層)。"],
    model: `AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  Env:
    Type: String
    AllowedValues: [dev, prod]
    Default: dev
Conditions:
  IsProd: !Equals [!Ref Env, prod]
Resources:
  OrdersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: orderId
          AttributeType: S
      KeySchema:
        - AttributeName: orderId
          KeyType: HASH
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: !If [IsProd, true, false]
      DeletionProtectionEnabled: !If [IsProd, true, false]
  ThrottleAlarm:
    Type: AWS::CloudWatch::Alarm
    Condition: IsProd
    Properties:
      Namespace: AWS/DynamoDB
      MetricName: ThrottledRequests
      Dimensions:
        - Name: TableName
          Value: !Ref OrdersTable
      Statistic: Sum
      Period: 60
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
`,
    explain: {
      point: "Conditions は、パラメーター(と疑似パラメーター)から真偽値を計算するセクションです。リソースに Condition を付けると、条件が偽のときそのリソースは作られません。プロパティの値だけを変えたいときは Fn::If を使います。値を省略したい場合は !Ref AWS::NoValue を返します。",
      compare: "環境ごとに別のテンプレートを持つと、差分が増えて片方だけ修正されがちです。値の表(インスタンスサイズなど)は Mappings と Fn::FindInMap で持つ方法もあります。条件で作らないリソースを、ほかのリソースから参照しているとエラーになる点に注意します。",
      pitfalls: ["Condition を Properties の中に書く", "!If の条件名に !Ref を付ける(条件名をそのまま書く)", "Conditions の中でリソースを Ref する(パラメーターだけが使える)"],
    },
    references: [R.conditions, R.params, R.intrinsic], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cfn-cycle-007", category: "cfn", mode: "fix", level: 3, examTags: ["SOA", "SAP", "DOP"], services: ["cfn", "ec2", "vpc"],
    title: "【障害対応】セキュリティグループの循環依存",
    scenario: "ウェブ層(WebSg)からアプリ層(AppSg)の 8080 番へ、アプリ層からウェブ層の管理用の 9090 番へ、互いに通信できるようにしたところ、Circular dependency between resources で失敗しました。同じ通信を許可したまま、循環依存を解消してください。",
    environment: ["VPC: vpc-0a1b2c3d4e5f00001", "ルールの送信元は、相手のセキュリティグループ(CIDR ではない)"],
    requirements: ["AppSg は WebSg からの 8080 を許可", "WebSg は AppSg からの 9090 を許可", "WebSg は 0.0.0.0/0 からの 443 を許可(今のまま)", "循環依存のエラーを解消する"],
    editor: { language: "yaml", stackName: "app-stack", starter: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  WebSg:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: web tier
      VpcId: vpc-0a1b2c3d4e5f00001
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 9090
          ToPort: 9090
          SourceSecurityGroupId: !GetAtt AppSg.GroupId
  AppSg:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: app tier
      VpcId: vpc-0a1b2c3d4e5f00001
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 8080
          ToPort: 8080
          SourceSecurityGroupId: !GetAtt WebSg.GroupId
` },
    checks: [
      { label: "AppSg が WebSg からの 8080 を許可", test: (s) => ingress(s).some((r) => r.group === sgOf(s, "AppSg") && r.SourceSecurityGroupId === sgOf(s, "WebSg") && covers(r, 8080)) },
      { label: "WebSg が AppSg からの 9090 を許可", test: (s) => ingress(s).some((r) => r.group === sgOf(s, "WebSg") && r.SourceSecurityGroupId === sgOf(s, "AppSg") && covers(r, 9090)) },
      { label: "WebSg が 0.0.0.0/0 からの 443 を許可", test: (s) => ingress(s).some((r) => r.group === sgOf(s, "WebSg") && r.CidrIp === "0.0.0.0/0" && covers(r, 443)) },
      { label: "相互参照のルール以外に、全ポートを開けるルールが無い", security: true, test: (s) => !ingress(s).some((r) => String(r.IpProtocol) === "-1" || (Number(r.FromPort) === 0 && Number(r.ToPort) === 65535)) },
    ],
    hints: ["WebSg が AppSg を、AppSg が WebSg を参照しているため、どちらも先に作れません。", "片方(または両方)のルールを、別のリソース AWS::EC2::SecurityGroupIngress に切り出します。", "切り出したルールには GroupId(付け先)と SourceSecurityGroupId(送信元)を書きます。"],
    model: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  WebSg:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: web tier
      VpcId: vpc-0a1b2c3d4e5f00001
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
  AppSg:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: app tier
      VpcId: vpc-0a1b2c3d4e5f00001
  AppFromWeb8080:
    Type: AWS::EC2::SecurityGroupIngress
    Properties:
      GroupId: !GetAtt AppSg.GroupId
      IpProtocol: tcp
      FromPort: 8080
      ToPort: 8080
      SourceSecurityGroupId: !GetAtt WebSg.GroupId
  WebFromApp9090:
    Type: AWS::EC2::SecurityGroupIngress
    Properties:
      GroupId: !GetAtt WebSg.GroupId
      IpProtocol: tcp
      FromPort: 9090
      ToPort: 9090
      SourceSecurityGroupId: !GetAtt AppSg.GroupId
`,
    explain: {
      point: "参照は依存関係になるため、2 つのリソースが互いに参照すると、どちらも先に作れず循環依存のエラーになります。セキュリティグループのルールを AWS::EC2::SecurityGroupIngress として切り出すと、依存は「グループ 2 つ → ルール」になり、循環が解けます。",
      compare: "この解き方は、相互に参照する構成の定番です(Lambda と、その関数を呼ぶ権限・バケット通知の組み合わせなどでも起きる)。片方だけ切り出しても循環は解けますが、両方を切り出しておくと、インラインのルールと独立のルールの混在による更新時の競合も避けられます。",
      pitfalls: ["DependsOn を足して順序を指定しようとする(循環は解けない)", "送信元を CIDR に変えて広げてしまう", "インラインと独立のルールで同じルールを二重に書く"],
    },
    references: [R.sgIngress, R.dependsOn], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cfn-rds-008", category: "cfn", mode: "fix", level: 3, examTags: ["SAA", "SCS", "SOA"], services: ["cfn", "rds", "secrets", "kms"],
    title: "【レビュー指摘】RDS のテンプレートを安全な設定に直す",
    scenario: "RDS(MySQL)のテンプレートのレビューで、次の指摘を受けました。①パスワードがテンプレートに平文で書かれている ②ストレージが暗号化されていない ③インターネットから到達できる設定 ④スタックの削除でデータが消える。すべて直してください。可用性のため マルチ AZ も有効にします。",
    environment: ["DB インスタンス OrdersDb(論理 ID)", "パスワードは Secrets Manager で RDS に管理させる(ManageMasterUserPassword)", "サブネットグループ・セキュリティグループは既存のもの(パラメーター)"],
    requirements: ["MasterUserPassword を削除し、ManageMasterUserPassword: true にする", "StorageEncrypted: true", "PubliclyAccessible: false", "DeletionPolicy・UpdateReplacePolicy を Snapshot にし、DeletionProtection: true", "MultiAZ: true"],
    editor: { language: "yaml", stackName: "db-stack", starter: `AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  DbSubnetGroup:
    Type: String
    Default: app-db-subnets
  DbSecurityGroup:
    Type: AWS::EC2::SecurityGroup::Id
    Default: sg-0db000000000000a1
Resources:
  OrdersDb:
    Type: AWS::RDS::DBInstance
    Properties:
      Engine: mysql
      EngineVersion: "8.0.39"
      DBInstanceClass: db.t4g.medium
      AllocatedStorage: 50
      MasterUsername: admin
      MasterUserPassword: Passw0rd-Example-123
      StorageEncrypted: false
      PubliclyAccessible: true
      MultiAZ: false
      DBSubnetGroupName: !Ref DbSubnetGroup
      VPCSecurityGroups:
        - !Ref DbSecurityGroup
` },
    checks: (() => {
      const db = (s) => one(s, "AWS::RDS::DBInstance") || { props: {} };
      return [
        { label: "パスワードがテンプレートに無く、RDS が Secrets Manager で管理する", security: true, test: (s) => !("MasterUserPassword" in db(s).props) && isTrue(db(s).props.ManageMasterUserPassword) },
        { label: "ストレージが暗号化される", security: true, test: (s) => isTrue(db(s).props.StorageEncrypted) },
        { label: "インターネットから到達できない(PubliclyAccessible: false)", security: true, test: (s) => db(s).props.PubliclyAccessible === false || db(s).props.PubliclyAccessible === "false" },
        { label: "削除・置き換え時にスナップショットを残し、削除保護が有効", test: (s) => db(s).deletionPolicy === "Snapshot" && db(s).updateReplacePolicy === "Snapshot" && isTrue(db(s).props.DeletionProtection) },
        { label: "マルチ AZ が有効", test: (s) => isTrue(db(s).props.MultiAZ) },
      ];
    })(),
    hints: ["ManageMasterUserPassword: true にすると、RDS がパスワードを生成して Secrets Manager に保存します(MasterUserPassword と同時には指定できない)。", "DeletionPolicy: Snapshot と UpdateReplacePolicy: Snapshot は Type と同じ階層に書きます。", "StorageEncrypted は作成後に変更できない(置き換えになる)ため、最初から true にします。"],
    model: `AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  DbSubnetGroup:
    Type: String
    Default: app-db-subnets
  DbSecurityGroup:
    Type: AWS::EC2::SecurityGroup::Id
    Default: sg-0db000000000000a1
Resources:
  OrdersDb:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Snapshot
    UpdateReplacePolicy: Snapshot
    Properties:
      Engine: mysql
      EngineVersion: "8.0.39"
      DBInstanceClass: db.t4g.medium
      AllocatedStorage: 50
      MasterUsername: admin
      ManageMasterUserPassword: true
      StorageEncrypted: true
      PubliclyAccessible: false
      MultiAZ: true
      DeletionProtection: true
      DBSubnetGroupName: !Ref DbSubnetGroup
      VPCSecurityGroups:
        - !Ref DbSecurityGroup
`,
    explain: {
      point: "テンプレートに書いたパスワードは、スタックの情報やリポジトリの履歴から読めてしまいます。ManageMasterUserPassword を使うと、RDS がパスワードを生成し、Secrets Manager で保管・ローテーションします。ストレージの暗号化は作成時にしか有効にできないため、テンプレートの初版から true にしておきます。",
      compare: "パラメーターで受け取る場合は NoEcho: true にしても、テンプレートの外(パラメーターの入力)に値が残ります。動的参照 {{resolve:secretsmanager:…}} で既存のシークレットを参照する方法もあります。DeletionPolicy: Snapshot は削除時に最終スナップショットを取り、DeletionProtection は API での削除自体を止めます。",
      pitfalls: ["MasterUserPassword を NoEcho のパラメーターにしただけで安全と考える", "StorageEncrypted を後から true にする(置き換えでデータが消えるおそれ)", "DeletionPolicy を Properties の中に書く"],
    },
    references: [R.rds, R.rdsSecret, R.deletion], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cfn-output-009", category: "cfn", mode: "write", level: 2, examTags: ["SOA", "DOP", "SAP"], services: ["cfn", "vpc"],
    title: "VPC の ID をエクスポートして、別のスタックから使えるようにする",
    scenario: "ネットワーク用のスタック network-stack が作る VPC とプライベートサブネットの ID を、アプリのスタックから Fn::ImportValue で使えるようにします。Outputs にエクスポートを追加してください。エクスポート名はスタック名を頭に付けて、<スタック名>-VpcId・<スタック名>-PrivateSubnetId にします。",
    environment: ["スタック名: network-stack", "リソース: AppVpc(AWS::EC2::VPC)・PrivateSubnet(AWS::EC2::Subnet)"],
    requirements: ["出力 VpcId: AppVpc の ID、エクスポート名 network-stack-VpcId", "出力 PrivateSubnetId: PrivateSubnet の ID、エクスポート名 network-stack-PrivateSubnetId", "エクスポート名はスタック名を直接書かず、疑似パラメーターから作る"],
    editor: { language: "yaml", stackName: "network-stack", variants: { renamed: { stackName: "network-stack-2" } }, starter: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  AppVpc:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.20.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
  PrivateSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref AppVpc
      CidrBlock: 10.20.1.0/24
      AvailabilityZone: !Select [0, !GetAZs ""]
Outputs:
` },
    checks: [
      { label: "network-stack-VpcId が AppVpc の ID", test: (s) => Object.values(s.outputs).some((o) => o.export === "network-stack-VpcId" && o.value === s.resources.AppVpc?.physicalId) },
      { label: "network-stack-PrivateSubnetId が PrivateSubnet の ID", test: (s) => Object.values(s.outputs).some((o) => o.export === "network-stack-PrivateSubnetId" && o.value === s.resources.PrivateSubnet?.physicalId) },
      { label: "別のスタック名(network-stack-2)でデプロイすると、エクスポート名も変わる", test: (s) => { const ex = Object.values(s.variants.renamed?.outputs || {}).map((o) => o.export); return ex.includes("network-stack-2-VpcId") && ex.includes("network-stack-2-PrivateSubnetId"); } },
    ],
    hints: ["Outputs の各項目に Value と Export(Name)を書きます。", "AWS::EC2::VPC・AWS::EC2::Subnet の Ref は ID を返します。", "Name: !Sub \"${AWS::StackName}-VpcId\""],
    model: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  AppVpc:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.20.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
  PrivateSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref AppVpc
      CidrBlock: 10.20.1.0/24
      AvailabilityZone: !Select [0, !GetAZs ""]
Outputs:
  VpcId:
    Value: !Ref AppVpc
    Export:
      Name: !Sub "\${AWS::StackName}-VpcId"
  PrivateSubnetId:
    Value: !Ref PrivateSubnet
    Export:
      Name: !Sub "\${AWS::StackName}-PrivateSubnetId"
`,
    explain: {
      point: "Outputs の Export に付けた名前は、同じアカウント・リージョンの別のスタックから !ImportValue で参照できます。エクスポート名はリージョン内で一意でなければならないため、${AWS::StackName} を頭に付けて、同じテンプレートから複数のスタックを作っても衝突しないようにします。",
      compare: "エクスポートを参照しているスタックがある間は、エクスポート元の値を変更・削除できません(スタック間の強い結合)。疎結合にしたい場合は、SSM パラメーターストアに値を書き、参照側で動的参照する方法もあります。ネストされたスタックは、親子の関係で値を受け渡す仕組みです。",
      pitfalls: ["Export の名前に network-stack を直接書く → 別名でデプロイすると衝突", "!GetAtt AppVpc.Arn と書く(VPC に Arn 属性は無い)"],
    },
    references: [R.outputs, R.crossStack], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cfn-iam-010", category: "cfn", mode: "fix", level: 3, examTags: ["SCS", "DVA", "SAP"], services: ["cfn", "iam", "dynamodb", "lambda"],
    title: "【レビュー指摘】ロールのポリシーを、作ったテーブルだけに絞る",
    scenario: "関数用のロール OrdersFnRole に dynamodb:* と Resource \"*\" が付いていると指摘されました。同じテンプレートで作るテーブル OrdersTable と、そのインデックスに対する GetItem・PutItem・Query だけを許可するように直してください。テーブル名はテンプレートで固定しません。",
    environment: ["テーブル OrdersTable(テーブル名は CloudFormation が自動で付ける)", "インデックス StatusIndex", "ロールのインラインポリシー(Policies)を直す"],
    requirements: ["OrdersTable の GetItem・PutItem・Query を許可", "インデックスへの Query を許可(<テーブルの ARN>/index/*)", "DeleteTable などの操作・ほかのテーブルは拒否", "テーブルの ARN は !GetAtt で参照する"],
    editor: { language: "yaml", stackName: "orders-stack", starter: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  OrdersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: orderId
          AttributeType: S
        - AttributeName: status
          AttributeType: S
      KeySchema:
        - AttributeName: orderId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: StatusIndex
          KeySchema:
            - AttributeName: status
              KeyType: HASH
          Projection:
            ProjectionType: ALL
  OrdersFnRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: lambda.amazonaws.com }
            Action: sts:AssumeRole
      Policies:
        - PolicyName: orders-table
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action: dynamodb:*
                Resource: "*"
` },
    checks: (() => {
      const sim = (s, action, resource) => {
        const r = s.resources.OrdersFnRole;
        if (!r) return "none";
        const name = r.physicalId;
        const policies = [].concat(r.props.Policies || []).map((p) => ({ kind: "identity", name: p.PolicyName, to: [`role:${name}`], doc: p.PolicyDocument }));
        return evaluate({ principal: { kind: "iam-role", name, account: ACCOUNT, session: "fn" }, action, resource }, policies).decision;
      };
      const t = (s) => s.resources.OrdersTable?.arn;
      return [
        { label: "OrdersTable の GetItem・PutItem・Query が許可", test: (s) => ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"].every((a) => sim(s, a, t(s)) === "allow") },
        { label: "StatusIndex への Query が許可", test: (s) => sim(s, "dynamodb:Query", `${t(s)}/index/StatusIndex`) === "allow" },
        { label: "DeleteTable は拒否", security: true, test: (s) => sim(s, "dynamodb:DeleteTable", t(s)) !== "allow" },
        { label: "ほかのテーブルには使えない", security: true, test: (s) => sim(s, "dynamodb:GetItem", `arn:aws:dynamodb:ap-northeast-1:${ACCOUNT}:table/Customers`) !== "allow" },
      ];
    })(),
    hints: ["!GetAtt OrdersTable.Arn でテーブルの ARN を参照できます。", "インデックスの ARN は !Sub \"${OrdersTable.Arn}/index/*\" と書けます。", "Action は 3 つの操作を列挙します。"],
    model: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  OrdersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: orderId
          AttributeType: S
        - AttributeName: status
          AttributeType: S
      KeySchema:
        - AttributeName: orderId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: StatusIndex
          KeySchema:
            - AttributeName: status
              KeyType: HASH
          Projection:
            ProjectionType: ALL
  OrdersFnRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal: { Service: lambda.amazonaws.com }
            Action: sts:AssumeRole
      Policies:
        - PolicyName: orders-table
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:GetItem
                  - dynamodb:PutItem
                  - dynamodb:Query
                Resource:
                  - !GetAtt OrdersTable.Arn
                  - !Sub "\${OrdersTable.Arn}/index/*"
`,
    explain: {
      point: "同じテンプレートで作るリソースは、!GetAtt で ARN を参照すると、自動で付く名前でも正確に絞れます。参照によりロールはテーブルの後に作られます。インデックスへの Query は、インデックスの ARN(<テーブルの ARN>/index/<名前>)に対して認可されるため、別に指定します。",
      compare: "AWS SAM のポリシーテンプレート(DynamoDBCrudPolicy など)を使うと、同様の最小権限のポリシーを短く書けます。IAM Access Analyzer のポリシーの検証や、CloudTrail の履歴からのポリシー生成も、最小権限に近づけるのに役立ちます。",
      pitfalls: ["Resource に !Ref OrdersTable を書く(テーブル名であり ARN ではない)", "インデックスの ARN を忘れて、Query が AccessDenied になる", "dynamodb:* を残す"],
    },
    references: [R.getatt, R.ddbArn, R.iamRole], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cfn-events-011", category: "cfn", mode: "write", level: 4, examTags: ["SAP", "DVA", "SAA"], services: ["cfn", "eventbridge", "sqs"],
    title: "EventBridge のルールから SQS へ、キューポリシーまで含めて作る",
    scenario: "注文のキャンセル(source app.orders、detail-type OrderCancelled)のイベントを、キュー CancelQueue に送る仕組みをテンプレートで作ります。ルール CancelRule・キュー・キューポリシーを書いてください。キューポリシーでは、このルールからの送信だけを許可します。",
    environment: ["リソース: CancelQueue(AWS::SQS::Queue)、CancelRule(AWS::Events::Rule)、CancelQueuePolicy(AWS::SQS::QueuePolicy)", "EventBridge のサービスプリンシパル: events.amazonaws.com", "採点では、サンプルのイベント(OrderCancelled・OrderPlaced)でパターンを照合し、キューポリシーを模擬評価する"],
    requirements: ["CancelRule のパターンは OrderCancelled だけに一致(OrderPlaced には一致しない)", "CancelRule のターゲットは CancelQueue の ARN", "キューポリシーで events.amazonaws.com の sqs:SendMessage を許可", "aws:SourceArn で CancelRule からの送信だけに限定"],
    editor: { language: "yaml", stackName: "cancel-stack", starter: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  CancelQueue:
    Type: AWS::SQS::Queue
    Properties:
      MessageRetentionPeriod: 345600
` },
    checks: (() => {
      const ev = (type) => ({ version: "0", id: "1", "detail-type": type, source: "app.orders", account: ACCOUNT, time: "2026-11-08T06:00:00Z", region: "ap-northeast-1", resources: [], detail: { orderId: "o-5001" } });
      const rule = (s) => one(s, "AWS::Events::Rule");
      const q = (s) => one(s, "AWS::SQS::Queue");
      const send = (s, sourceArn) => {
        const pol = one(s, "AWS::SQS::QueuePolicy");
        if (!pol || !q(s) || ![].concat(pol.props.Queues || []).includes(q(s).physicalId)) return "none";
        return evaluate({ principal: { kind: "service", service: "events.amazonaws.com" }, action: "sqs:SendMessage", resource: q(s).arn, resourceAccount: ACCOUNT, context: { "aws:SourceArn": sourceArn, "aws:SourceAccount": ACCOUNT } }, [{ kind: "resource", name: "キューポリシー", doc: pol.props.PolicyDocument, account: ACCOUNT }]).decision;
      };
      return [
        { label: "パターンが OrderCancelled に一致する", test: (s) => !!rule(s)?.props.EventPattern && matchPattern(rule(s).props.EventPattern, ev("OrderCancelled")) },
        { label: "パターンが OrderPlaced には一致しない", test: (s) => !!rule(s)?.props.EventPattern && !matchPattern(rule(s).props.EventPattern, ev("OrderPlaced")) },
        { label: "ターゲットが CancelQueue の ARN", test: (s) => [].concat(rule(s)?.props.Targets || []).some((t) => t.Arn === q(s)?.arn) },
        { label: "キューポリシーが CancelRule からの送信を許可", test: (s) => send(s, rule(s)?.arn) === "allow" },
        { label: "ほかのルールからの送信は拒否", security: true, test: (s) => send(s, `arn:aws:events:ap-northeast-1:${ACCOUNT}:rule/other-rule`) !== "allow" },
      ];
    })(),
    hints: ["EventPattern は YAML のマッピングで書けます。値は配列: source: [app.orders]", "Targets の Arn は !GetAtt CancelQueue.Arn、Id は任意の名前です。", "AWS::SQS::QueuePolicy の Queues には !Ref CancelQueue(キューの URL)、条件は ArnEquals: { aws:SourceArn: !GetAtt CancelRule.Arn } です。"],
    model: `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  CancelQueue:
    Type: AWS::SQS::Queue
    Properties:
      MessageRetentionPeriod: 345600
  CancelRule:
    Type: AWS::Events::Rule
    Properties:
      EventPattern:
        source: [app.orders]
        detail-type: [OrderCancelled]
      Targets:
        - Id: cancel-queue
          Arn: !GetAtt CancelQueue.Arn
  CancelQueuePolicy:
    Type: AWS::SQS::QueuePolicy
    Properties:
      Queues:
        - !Ref CancelQueue
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Sid: AllowCancelRule
            Effect: Allow
            Principal: { Service: events.amazonaws.com }
            Action: sqs:SendMessage
            Resource: !GetAtt CancelQueue.Arn
            Condition:
              ArnEquals:
                aws:SourceArn: !GetAtt CancelRule.Arn
`,
    explain: {
      point: "EventBridge から SQS に届けるには、ルールのターゲットの設定に加えて、キューのリソースベースのポリシーで events.amazonaws.com の送信を許可する必要があります(コンソールでは自動で付くが、テンプレートでは自分で書く)。aws:SourceArn でルールを限定すると、ほかのルール(他人のアカウントのルールを含む)からの送信を防げます。",
      compare: "Lambda をターゲットにする場合は AWS::Lambda::Permission、SNS なら AWS::SNS::TopicPolicy で同様に許可します。届かなかったイベントは、ターゲットのデッドレターキュー(DeadLetterConfig)と再試行ポリシーで扱います。",
      pitfalls: ["キューポリシーを書かず、ルールは一致するのにメッセージが届かない", "Principal \"*\" で許可する", "パターンの値を配列にしない(detail-type: OrderCancelled)"],
    },
    references: [R.rule, R.ebSqs, R.deputy], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "cfn-read-012", category: "cfn", mode: "read", level: 3, examTags: ["SOA", "DOP", "SAP"], services: ["cfn", "sqs", "cloudwatch"],
    title: "条件(Conditions)で作られるリソースを読み解く",
    scenario: "次のテンプレートを、パラメーター Env=prod・EnableDlq=false でデプロイします。正しい説明をすべて選んでください。右の「模擬デプロイ」はパラメーターの既定値(Env=dev・EnableDlq=true)で動きます。",
    environment: ["パラメーター: Env(dev / prod)、EnableDlq(true / false)", "スタック名: jobs-stack"],
    code: `AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  Env:
    Type: String
    AllowedValues: [dev, prod]
    Default: dev
  EnableDlq:
    Type: String
    AllowedValues: ["true", "false"]
    Default: "true"
Conditions:
  IsProd: !Equals [!Ref Env, prod]
  UseDlq: !Or [!Condition IsProd, !Equals [!Ref EnableDlq, "true"]]
Resources:
  JobsDlq:
    Type: AWS::SQS::Queue
    Condition: UseDlq
    Properties:
      MessageRetentionPeriod: 1209600
  JobsQueue:
    Type: AWS::SQS::Queue
    Properties:
      VisibilityTimeout: !If [IsProd, 300, 60]
      RedrivePolicy: !If
        - UseDlq
        - deadLetterTargetArn: !GetAtt JobsDlq.Arn
          maxReceiveCount: 5
        - !Ref AWS::NoValue
  BacklogAlarm:
    Type: AWS::CloudWatch::Alarm
    Condition: IsProd
    Properties:
      Namespace: AWS/SQS
      MetricName: ApproximateNumberOfMessagesVisible
      Dimensions:
        - Name: QueueName
          Value: !GetAtt JobsQueue.QueueName
      Statistic: Maximum
      Period: 300
      EvaluationPeriods: 3
      Threshold: 1000
      ComparisonOperator: GreaterThanThreshold
`,
    codeKind: "cfn",
    deployParams: { prod: { Env: "prod", EnableDlq: "false" }, devNoDlq: { Env: "dev", EnableDlq: "false" } },
    multi: true,
    choices: [
      { text: "JobsDlq は作られる(IsProd が真なので UseDlq も真)", correct: true, why: "UseDlq は Or なので、IsProd が真なら EnableDlq が false でも真。" },
      { text: "JobsQueue の VisibilityTimeout は 300 秒になる", correct: true, why: "!If [IsProd, 300, 60] で IsProd が真。" },
      { text: "BacklogAlarm は作られない", correct: false, why: "Condition: IsProd で、Env=prod なので作られる。" },
      { text: "Env=dev・EnableDlq=false なら、JobsQueue には RedrivePolicy が設定されない", correct: true, why: "UseDlq が偽になり、!Ref AWS::NoValue でプロパティ自体が省略される。" },
    ],
    hints: ["!Or は、どれか 1 つが真なら真です。!Condition で別の条件を参照できます。", "!Ref AWS::NoValue は「このプロパティを指定しない」という意味です。"],
    explain: {
      point: "条件は、ほかの条件を !Condition で参照して組み合わせられます(!And・!Or・!Not)。!If の結果に AWS::NoValue を使うと、条件によってプロパティそのものを省略できます。条件で作られない JobsDlq を、UseDlq が偽のときに参照しない書き方(!If の中で参照)になっている点がポイントです。",
      compare: "!If の外で !GetAtt JobsDlq.Arn を書くと、UseDlq が偽のときに「作られないリソースへの参照」でデプロイが失敗します。パラメーターの真偽値は文字列として扱われるため、\"true\" と引用符付きで比較します。",
      pitfalls: ["AllowedValues の true を引用符なしで書き、比較が合わない", "Or と And を取り違える"],
    },
    references: [R.conditions, R.intrinsic, R.params], reviewedAt: "2026-11-08", contentVersion: 1,
  },
];
