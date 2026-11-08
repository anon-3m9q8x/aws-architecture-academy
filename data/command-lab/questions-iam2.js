// コマンド・ポリシー演習: IAM・S3 の JSON ポリシー(Phase 2 の 16 問)。信頼ポリシー・SCP・KMS のキーポリシー・多段の条件。
// 各問: 要件・検証ケース(許可すべき / 拒否すべき)・よくある誤答・根拠資料をセットにする。模範解答は唯一の正解ではない。
import { ACCOUNT, PARTNER, alice } from "./environments.js";

const V = "2012-10-17";
const j = (o) => JSON.stringify(o, null, 2);
const role = (name, extra = {}) => ({ kind: "iam-role", name, account: ACCOUNT, session: "work", ...extra });
const svc = (service) => ({ kind: "service", service });
const obj = (b, k) => `arn:aws:s3:::${b}/${k}`;
const roleArn = (n) => `arn:aws:iam::${ACCOUNT}:role/${n}`;
const EMPTY = `{\n  "Version": "2012-10-17",\n  "Statement": [\n    \n  ]\n}`;
const ORG = "o-a1b2c3d4e5";
const OIDC = `arn:aws:iam::${ACCOUNT}:oidc-provider/token.actions.githubusercontent.com`;
const KEY = `arn:aws:kms:ap-northeast-1:${ACCOUNT}:key/1234abcd-12ab-34cd-56ef-1234567890ab`;
const ROOT_KEY_STMT = { Sid: "EnableIAMPolicies", Effect: "Allow", Principal: { AWS: `arn:aws:iam::${ACCOUNT}:root` }, Action: "kms:*", Resource: "*" };

const R = {
  logic: { title: "ポリシーの評価論理", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html" },
  keys: { title: "AWS グローバル条件コンテキストキー", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html" },
  ops: { title: "IAM の条件演算子", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html" },
  multi: { title: "複数のキーまたは値を持つ条件(ForAllValues・ForAnyValue)", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-single-vs-multi-valued-context-keys.html" },
  service: { title: "AWS サービスにアクセス許可を委任するロールの作成", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-service.html" },
  lambdaRole: { title: "Lambda の実行ロール", url: "https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html" },
  oidc: { title: "GitHub Actions の OIDC で AWS のロールを引き受ける(IAM ユーザーガイド)", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html#idp_oidc_Create_GitHub" },
  passrole: { title: "AWS サービスにロールを渡す許可(iam:PassRole)", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_passrole.html" },
  tags: { title: "タグによる AWS リソースへのアクセス制御(aws:RequestTag・aws:TagKeys)", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_tags.html" },
  mfa: { title: "MFA で保護された API アクセス", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_configure-api-require.html" },
  scp: { title: "サービスコントロールポリシー(SCP)", url: "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html" },
  scpEx: { title: "SCP の例", url: "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_examples.html" },
  scpStrategy: { title: "SCP の戦略(拒否リストと許可リスト)", url: "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_evaluation.html" },
  keyPolicy: { title: "AWS KMS のキーポリシー", url: "https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html" },
  keyDefault: { title: "既定のキーポリシー(アカウントのルートへの委任)", url: "https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html" },
  viaService: { title: "kms:ViaService 条件キー", url: "https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html#conditions-kms-via-service" },
  sqsSns: { title: "SNS トピックから SQS キューへの送信を許可する", url: "https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html" },
  deputy: { title: "サービス間の混乱した代理の防止(aws:SourceArn・aws:SourceAccount)", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html" },
  oac: { title: "CloudFront のオリジンアクセスコントロール(OAC)で S3 へのアクセスを制限", url: "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html" },
  lambdaRes: { title: "Lambda のリソースベースのポリシー", url: "https://docs.aws.amazon.com/lambda/latest/dg/access-control-resource-based.html" },
  orgId: { title: "aws:PrincipalOrgID で組織内のアカウントに限定する", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-principalorgid" },
  bucketEx: { title: "Amazon S3 のバケットポリシーの例", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html" },
  boundary: { title: "IAM エンティティのアクセス許可の境界(委任の例)", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html" },
};

/* ---------- 共通の環境 ---------- */
const FULL_SCP = { kind: "scp", name: "FullAWSAccess", accounts: [ACCOUNT], doc: { Version: V, Statement: [{ Effect: "Allow", Action: "*", Resource: "*" }] } };
const ADMIN = (who) => ({ kind: "identity", name: "AdministratorAccess", to: who, doc: { Version: V, Statement: [{ Effect: "Allow", Action: "*", Resource: "*" }] } });

export const IAM_QUESTIONS_2 = [
  {
    id: "iam-trust-013", category: "iam", mode: "write", level: 2, examTags: ["SAA", "DVA", "SCS"], services: ["iam", "lambda", "sts"],
    title: "Lambda 関数の実行ロールの信頼ポリシー",
    scenario: "Lambda 関数 order-total に付ける実行ロール order-total-role を作ります。Lambda のサービスだけがこのロールを引き受けられるように、信頼ポリシーを書いてください。",
    environment: ["ロール order-total-role(アカウント 111122223333)", "引き受けるのは Lambda のサービス(lambda.amazonaws.com)", "同じアカウントの IAM ユーザー alice もいる"],
    requirements: ["Lambda のサービスが sts:AssumeRole で引き受けられる", "EC2 など、ほかのサービスは引き受けられない", "IAM ユーザー(alice)は引き受けられない"],
    editor: { language: "json", policyKind: "trust", policyName: "order-total-role の信頼ポリシー", account: ACCOUNT, starter: EMPTY },
    tests: [
      { label: "Lambda(lambda.amazonaws.com)が引き受ける", principal: svc("lambda.amazonaws.com"), action: "sts:AssumeRole", resource: roleArn("order-total-role"), resourceAccount: ACCOUNT, expect: "allow" },
      { label: "EC2(ec2.amazonaws.com)が引き受ける", principal: svc("ec2.amazonaws.com"), action: "sts:AssumeRole", resource: roleArn("order-total-role"), resourceAccount: ACCOUNT, expect: "deny" },
      { label: "IAM ユーザー alice が引き受ける", principal: alice, action: "sts:AssumeRole", resource: roleArn("order-total-role"), resourceAccount: ACCOUNT, expect: "deny" },
    ],
    hints: ["信頼ポリシーには Principal・Action を書き、Resource は書きません。", "AWS のサービスを主体にするときは {\"Service\": \"サービスのプリンシパル名\"} と書きます。", "Lambda のサービスプリンシパルは lambda.amazonaws.com です。"],
    model: j({ Version: V, Statement: [{ Sid: "LambdaAssume", Effect: "Allow", Principal: { Service: "lambda.amazonaws.com" }, Action: "sts:AssumeRole" }] }),
    explain: {
      point: "ロールには「誰が引き受けられるか」を決める信頼ポリシーと、「引き受けた後に何ができるか」を決めるアクセス許可ポリシーの 2 つがあります。Lambda の実行ロールでは、Lambda のサービスが関数の実行時にロールを引き受け、一時的な認証情報を関数のコードに渡します。",
      compare: "関数がログを書くには、別途アクセス許可ポリシー(AWSLambdaBasicExecutionRole など)が必要です。信頼ポリシーだけでは何の操作も許可されません。複数の関数で同じロールを共有すると、どれか 1 つの侵害で全関数の権限が使えるため、関数ごとにロールを分けるのが基本です。",
      pitfalls: ["Principal に {\"AWS\": \"lambda.amazonaws.com\"} と書く → サービスは Service で指定する", "信頼ポリシーに Resource を書く", "Action を lambda:InvokeFunction にする(ロールの引き受けは sts:AssumeRole)"],
    },
    references: [R.lambdaRole, R.service], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-oidc-014", category: "iam", mode: "write", level: 3, examTags: ["SCS", "DOP", "SAP"], services: ["iam", "sts"],
    title: "GitHub Actions の main ブランチだけがデプロイ用ロールを引き受ける",
    scenario: "GitHub Actions から長期のアクセスキーを使わずにデプロイするため、OIDC でロール gha-deploy を引き受けます。リポジトリ acme/web-app の main ブランチのワークフローだけが引き受けられる信頼ポリシーを書いてください。",
    environment: [`IAM の OIDC プロバイダー: ${OIDC}`, "トークンの aud(対象者)は sts.amazonaws.com", "トークンの sub の形: repo:<組織>/<リポジトリ>:ref:refs/heads/<ブランチ>", "ロール gha-deploy(アカウント 111122223333)"],
    requirements: ["acme/web-app の main ブランチのトークンで引き受けられる", "ほかのブランチ・ほかのリポジトリ・プルリクエストのトークンでは引き受けられない", "aud が sts.amazonaws.com でないトークンは拒否", "IAM ユーザーは引き受けられない"],
    editor: { language: "json", policyKind: "trust", policyName: "gha-deploy の信頼ポリシー", account: ACCOUNT, starter: EMPTY },
    tests: (() => {
      const gh = { kind: "federated", provider: OIDC };
      const t = (label, sub, aud, expect) => ({ label, principal: gh, action: "sts:AssumeRoleWithWebIdentity", resource: roleArn("gha-deploy"), resourceAccount: ACCOUNT, context: { "token.actions.githubusercontent.com:sub": sub, "token.actions.githubusercontent.com:aud": aud }, expect });
      return [
        t("acme/web-app の main ブランチ", "repo:acme/web-app:ref:refs/heads/main", "sts.amazonaws.com", "allow"),
        t("acme/web-app の feature/x ブランチ", "repo:acme/web-app:ref:refs/heads/feature/x", "sts.amazonaws.com", "deny"),
        t("acme/web-app のプルリクエスト", "repo:acme/web-app:pull_request", "sts.amazonaws.com", "deny"),
        t("別のリポジトリ acme/other の main", "repo:acme/other:ref:refs/heads/main", "sts.amazonaws.com", "deny"),
        t("似た名前の evil/web-app の main", "repo:evil/web-app:ref:refs/heads/main", "sts.amazonaws.com", "deny"),
        t("aud が違うトークン(main)", "repo:acme/web-app:ref:refs/heads/main", "https://example.com", "deny"),
        { label: "IAM ユーザー alice が AssumeRole", principal: alice, action: "sts:AssumeRole", resource: roleArn("gha-deploy"), resourceAccount: ACCOUNT, expect: "deny" },
      ];
    })(),
    hints: ["OIDC のプロバイダーは {\"Federated\": \"プロバイダーの ARN\"} で指定し、Action は sts:AssumeRoleWithWebIdentity です。", "トークンの値は条件キー token.actions.githubusercontent.com:aud と token.actions.githubusercontent.com:sub で確認します。", "sub は StringEquals で repo:acme/web-app:ref:refs/heads/main と完全に一致させるのが最も安全です。"],
    model: j({ Version: V, Statement: [{ Sid: "GitHubMainOnly", Effect: "Allow", Principal: { Federated: OIDC }, Action: "sts:AssumeRoleWithWebIdentity", Condition: { StringEquals: { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com", "token.actions.githubusercontent.com:sub": "repo:acme/web-app:ref:refs/heads/main" } } }] }),
    explain: {
      point: "GitHub の OIDC プロバイダーは、すべての GitHub のリポジトリのトークンを発行できます。sub の条件が無い、または repo:acme/* のように広いと、意図しないリポジトリやブランチからもロールを引き受けられます。aud と sub を StringEquals で確認するのが公式の推奨です。",
      compare: "複数のブランチを許可するなら StringLike と repo:acme/web-app:ref:refs/heads/release-* のように書けますが、* を使うほど範囲は広がります。GitHub の environment(例: repo:acme/web-app:environment:production)で絞ると、承認ルールと組み合わせられます。",
      pitfalls: ["sub の条件を書かない → GitHub のどのリポジトリからでも引き受けられる", "StringLike で repo:*/web-app:* のように書く → 他の組織の同名リポジトリも一致", "Action を sts:AssumeRole にする(OIDC は AssumeRoleWithWebIdentity)"],
    },
    references: [R.oidc, R.keys], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-passrole-015", category: "iam", mode: "write", level: 3, examTags: ["SCS", "SAP", "DVA"], services: ["iam", "lambda"],
    title: "PassRole を Lambda 用のロールと Lambda のサービスに限定する",
    scenario: "開発者 alice が Lambda 関数を作れるようにします。関数の作成時には実行ロールを渡す(iam:PassRole)必要がありますが、管理者用のロールを渡して権限を昇格されないよう、名前が lambda- で始まるロールを、Lambda のサービスにだけ渡せるようにしてください。",
    environment: ["IAM ユーザー alice(このポリシー以外の許可は無い)", "ロール: lambda-orders・lambda-reports(Lambda 用)、AdminRole(管理者用)", "関数の ARN: arn:aws:lambda:ap-northeast-1:111122223333:function:<名前>"],
    requirements: ["lambda:CreateFunction・lambda:UpdateFunctionConfiguration を許可", "lambda-* のロールを Lambda(lambda.amazonaws.com)に渡せる", "lambda-* のロールを EC2 など別のサービスには渡せない", "AdminRole はどのサービスにも渡せない"],
    editor: { language: "json", policyKind: "identity", policyName: "LambdaDeveloper", attachTo: ["user:alice"], starter: EMPTY },
    tests: (() => {
      const pass = (label, r, to, expect) => ({ label, principal: alice, action: "iam:PassRole", resource: roleArn(r), context: { "iam:PassedToService": to }, expect });
      return [
        { label: "関数を作成する", principal: alice, action: "lambda:CreateFunction", resource: `arn:aws:lambda:ap-northeast-1:${ACCOUNT}:function:orders-api`, expect: "allow" },
        { label: "関数の設定を変更する", principal: alice, action: "lambda:UpdateFunctionConfiguration", resource: `arn:aws:lambda:ap-northeast-1:${ACCOUNT}:function:orders-api`, expect: "allow" },
        pass("lambda-orders を Lambda に渡す", "lambda-orders", "lambda.amazonaws.com", "allow"),
        pass("lambda-reports を Lambda に渡す", "lambda-reports", "lambda.amazonaws.com", "allow"),
        pass("lambda-orders を EC2 に渡す", "lambda-orders", "ec2.amazonaws.com", "deny"),
        pass("AdminRole を Lambda に渡す", "AdminRole", "lambda.amazonaws.com", "deny"),
        { label: "関数を削除する", principal: alice, action: "lambda:DeleteFunction", resource: `arn:aws:lambda:ap-northeast-1:${ACCOUNT}:function:orders-api`, expect: "deny" },
      ];
    })(),
    hints: ["iam:PassRole の Resource は、渡すロールの ARN です。arn:aws:iam::111122223333:role/lambda-* のようにワイルドカードを使えます。", "どのサービスに渡すかは条件キー iam:PassedToService で確認できます。", "PassRole と Lambda の操作は Resource が違うので、ステートメントを分けます。"],
    model: j({ Version: V, Statement: [
      { Sid: "ManageFunctions", Effect: "Allow", Action: ["lambda:CreateFunction", "lambda:UpdateFunctionConfiguration"], Resource: `arn:aws:lambda:ap-northeast-1:${ACCOUNT}:function:*` },
      { Sid: "PassLambdaRolesToLambdaOnly", Effect: "Allow", Action: "iam:PassRole", Resource: `arn:aws:iam::${ACCOUNT}:role/lambda-*`, Condition: { StringEquals: { "iam:PassedToService": "lambda.amazonaws.com" } } },
    ] }),
    explain: {
      point: "iam:PassRole は「ロールをサービスに渡して、そのサービスにロールの権限で動いてもらう」許可です。Resource \"*\" で許可すると、自分より強い権限のロール(AdminRole)を関数に付け、関数経由で権限を昇格できてしまいます。渡せるロールを名前(パス)で、渡し先を iam:PassedToService で絞ります。",
      compare: "ロールにパス(例: /lambda/)を付けて arn:aws:iam::111122223333:role/lambda/* と絞る方法もあります。PassRole は API の名前ではなく許可の名前で、CloudTrail には CreateFunction などの呼び出しとして記録されます。",
      pitfalls: ["iam:PassRole を Resource \"*\" で許可する → 管理者ロールも渡せる(権限昇格)", "iam:PassedToService を書かない → EC2 のインスタンスプロファイルなどにも渡せる", "Action に iam:* を書く"],
    },
    references: [R.passrole, R.keys], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-tag-016", category: "iam", mode: "write", level: 3, examTags: ["SCS", "SOA", "SAP"], services: ["iam", "ec2"],
    title: "作成時のタグを必須にし、使えるタグキーも制限する",
    scenario: "コスト管理のため、EBS ボリュームの作成時にタグ Project=alpha を必ず付けさせます。また、勝手なタグを増やさないよう、付けられるタグキーは Project と Owner だけにします。alice のポリシーを書いてください。",
    environment: ["IAM ユーザー alice(このポリシー以外の許可は無い)", "ボリュームの ARN: arn:aws:ec2:ap-northeast-1:111122223333:volume/*", "作成時のタグは aws:RequestTag/<キー>、タグキーの一覧は aws:TagKeys(複数値)で参照できる"],
    requirements: ["Project=alpha のタグ付きなら ec2:CreateVolume を許可", "Project タグが無い・alpha 以外なら拒否", "Project・Owner 以外のタグキー(例: CostCenter)を含むと拒否"],
    editor: { language: "json", policyKind: "identity", policyName: "TaggedVolumeCreator", attachTo: ["user:alice"], starter: EMPTY },
    tests: (() => {
      const vol = `arn:aws:ec2:ap-northeast-1:${ACCOUNT}:volume/*`;
      const t = (label, tags, expect) => ({ label, principal: alice, action: "ec2:CreateVolume", resource: vol, context: { ...Object.fromEntries(Object.entries(tags).map(([k, v]) => [`aws:RequestTag/${k}`, v])), ...(Object.keys(tags).length ? { "aws:TagKeys": Object.keys(tags) } : {}) }, expect });
      return [
        t("Project=alpha だけ", { Project: "alpha" }, "allow"),
        t("Project=alpha と Owner=alice", { Project: "alpha", Owner: "alice" }, "allow"),
        t("Project=beta", { Project: "beta" }, "deny"),
        t("タグなし", {}, "deny"),
        t("Owner=alice だけ", { Owner: "alice" }, "deny"),
        t("Project=alpha と CostCenter=123", { Project: "alpha", CostCenter: "123" }, "deny"),
      ];
    })(),
    hints: ["作成時のタグの値は \"aws:RequestTag/Project\" を StringEquals で確認します。", "aws:TagKeys は複数の値を持つキーです。「すべてのキーが一覧に含まれる」は ForAllValues:StringEquals で書きます。", "1 つの Condition に 2 つの条件を並べると、両方を満たすとき(AND)だけ一致します。"],
    model: j({ Version: V, Statement: [{ Sid: "CreateTaggedVolumes", Effect: "Allow", Action: "ec2:CreateVolume", Resource: `arn:aws:ec2:ap-northeast-1:${ACCOUNT}:volume/*`, Condition: { StringEquals: { "aws:RequestTag/Project": "alpha" }, "ForAllValues:StringEquals": { "aws:TagKeys": ["Project", "Owner"] } } }] }),
    explain: {
      point: "aws:RequestTag/<キー> は作成・タグ付けの要求に含まれるタグの値、aws:TagKeys は要求に含まれるタグキーの一覧です。ForAllValues:StringEquals は「要求のすべてのキーが、ポリシーの一覧のどれかと等しい」ときに成り立ちます。RequestTag の条件と同じ Condition に並べると AND になります。",
      compare: "ForAllValues はキーが要求に無い(タグなし)と true になるため、それだけでは「タグ必須」になりません。この問題では aws:RequestTag/Project の条件があるのでタグなしは拒否されます。ForAnyValue:StringEquals にすると「どれか 1 つでも一覧にあれば」になり、CostCenter を含む要求も通ります。実際の EC2 では、作成時のタグ付けに ec2:CreateTags の許可(ec2:CreateAction 条件付き)も必要です。",
      pitfalls: ["ForAnyValue を使う → 余計なタグキーを含む要求も一致", "ForAllValues だけで書く → タグなしの要求も一致(空集合は常に true)", "aws:ResourceTag を使う → 作成前のリソースにはまだタグが無い"],
    },
    references: [R.tags, R.multi, R.ops], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-mfaip-017", category: "iam", mode: "fix", level: 3, examTags: ["SCS", "SAA"], services: ["iam"],
    title: "【障害対応】MFA と社内 IP の「両方」を必須にしたはずが",
    scenario: "IAM の管理操作は「MFA 認証済み」かつ「社内ネットワーク(198.51.100.0/24)から」のときだけ許可する方針です。ところが監査で、社外から MFA 付きで IAM ユーザーが作られていたことが分かりました。ポリシー IamAdminConditional を直してください。",
    environment: ["ロール IamOperator(このポリシー以外の許可は無い)", "社内ネットワーク: 198.51.100.0/24", "現在のポリシーが右のエディターに入っています"],
    requirements: ["MFA あり かつ 社内 IP のときだけ iam:CreateUser・iam:AttachRolePolicy を許可", "どちらか一方だけを満たす要求は拒否", "許可する操作は増やさない"],
    editor: { language: "json", policyKind: "identity", policyName: "IamAdminConditional", attachTo: ["role:IamOperator"], starter: j({ Version: V, Statement: [
      { Sid: "RequireMfa", Effect: "Allow", Action: ["iam:CreateUser", "iam:AttachRolePolicy"], Resource: "*", Condition: { Bool: { "aws:MultiFactorAuthPresent": "true" } } },
      { Sid: "RequireCorpIp", Effect: "Allow", Action: ["iam:CreateUser", "iam:AttachRolePolicy"], Resource: "*", Condition: { IpAddress: { "aws:SourceIp": "198.51.100.0/24" } } },
    ] }) },
    tests: (() => {
      const op = role("IamOperator");
      const t = (label, action, ctx, expect) => ({ label, principal: op, action, resource: `arn:aws:iam::${ACCOUNT}:user/new-hire`, context: ctx, expect });
      return [
        t("MFA あり・社内 IP で CreateUser", "iam:CreateUser", { "aws:MultiFactorAuthPresent": "true", "aws:SourceIp": "198.51.100.20" }, "allow"),
        t("MFA あり・社内 IP で AttachRolePolicy", "iam:AttachRolePolicy", { "aws:MultiFactorAuthPresent": "true", "aws:SourceIp": "198.51.100.21" }, "allow"),
        t("MFA あり・社外 IP で CreateUser", "iam:CreateUser", { "aws:MultiFactorAuthPresent": "true", "aws:SourceIp": "203.0.113.9" }, "deny"),
        t("MFA なし・社内 IP で CreateUser", "iam:CreateUser", { "aws:MultiFactorAuthPresent": "false", "aws:SourceIp": "198.51.100.20" }, "deny"),
        t("MFA の情報なし・社内 IP で CreateUser", "iam:CreateUser", { "aws:SourceIp": "198.51.100.20" }, "deny"),
        t("MFA あり・社内 IP で DeleteUser", "iam:DeleteUser", { "aws:MultiFactorAuthPresent": "true", "aws:SourceIp": "198.51.100.20" }, "deny"),
      ];
    })(),
    hints: ["「テスト実行」で、どのケースが過剰に許可されているかを確認しましょう。", "Allow のステートメントが 2 つあると、どちらか一方に一致すれば許可されます(OR)。", "1 つのステートメントの Condition に、Bool と IpAddress の 2 つの演算子を並べると AND になります。"],
    model: j({ Version: V, Statement: [{ Sid: "RequireMfaAndCorpIp", Effect: "Allow", Action: ["iam:CreateUser", "iam:AttachRolePolicy"], Resource: "*", Condition: { Bool: { "aws:MultiFactorAuthPresent": "true" }, IpAddress: { "aws:SourceIp": "198.51.100.0/24" } } }] }),
    explain: {
      point: "ステートメント同士は OR、1 つの Condition の中の演算子同士・キー同士は AND、1 つのキーに並べた値同士は OR です。2 つの Allow に条件を分けると「MFA があれば社外からでも」「社内なら MFA なしでも」許可されます。両方を必須にするには、同じ Condition に並べます。",
      compare: "Deny で「MFA なしを拒否」「社外を拒否」を別々に書く方法(ガードレール)は OR で拒否されるので、両方必須の意図に合います。aws:SourceIp は AWS のサービスが代理で呼び出す場合(CloudFormation など)には要求元の IP にならない点に注意します。",
      pitfalls: ["条件ごとに Allow を分ける → OR になり、片方だけで許可", "Bool の値を true(真偽値)ではなく文字列で書くかどうかを気にしすぎる(どちらも同じ)", "MFA の情報が無い要求を考慮しない"],
    },
    references: [R.mfa, R.ops, R.logic], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-scp-018", category: "iam", mode: "write", level: 4, examTags: ["SAP", "SCS"], services: ["orgs", "cloudtrail", "guardduty", "config"],
    title: "SCP で監査・検知の仕組みを止められないようにする",
    scenario: "メンバーアカウント 111122223333 で、CloudTrail の停止・削除、GuardDuty の検知器の削除、AWS Config の記録の停止を禁止する SCP を書きます。ただしセキュリティチームのロール SecurityAdmin だけは、保守のために実行できるようにします。",
    environment: ["SCP: FullAWSAccess(Allow */*)が付いている", "ロール AdminRole・SecurityAdmin: どちらも AdministratorAccess", "ロールの ARN: arn:aws:iam::111122223333:role/<名前>"],
    requirements: ["cloudtrail:StopLogging・cloudtrail:DeleteTrail・guardduty:DeleteDetector・config:StopConfigurationRecorder を拒否", "SecurityAdmin はこれらを実行できる", "AdminRole のほかの操作(例: ec2:RunInstances)は妨げない"],
    editor: { language: "json", policyKind: "scp", policyName: "ProtectSecurityServices", accounts: [ACCOUNT], starter: EMPTY },
    envPolicies: [FULL_SCP, ADMIN(["role:AdminRole", "role:SecurityAdmin"])],
    tests: (() => {
      const t = (label, who, action, resource, expect) => ({ label, principal: role(who), action, resource, expect });
      const trail = `arn:aws:cloudtrail:ap-northeast-1:${ACCOUNT}:trail/org-trail`;
      return [
        t("AdminRole が CloudTrail を停止", "AdminRole", "cloudtrail:StopLogging", trail, "explicit-deny"),
        t("AdminRole が証跡を削除", "AdminRole", "cloudtrail:DeleteTrail", trail, "explicit-deny"),
        t("AdminRole が GuardDuty の検知器を削除", "AdminRole", "guardduty:DeleteDetector", `arn:aws:guardduty:ap-northeast-1:${ACCOUNT}:detector/12abc34d567e8fa901bc2d34e56789f0`, "explicit-deny"),
        t("AdminRole が Config の記録を停止", "AdminRole", "config:StopConfigurationRecorder", "*", "explicit-deny"),
        t("SecurityAdmin が CloudTrail を停止", "SecurityAdmin", "cloudtrail:StopLogging", trail, "allow"),
        t("SecurityAdmin が Config の記録を停止", "SecurityAdmin", "config:StopConfigurationRecorder", "*", "allow"),
        t("AdminRole が EC2 を起動", "AdminRole", "ec2:RunInstances", `arn:aws:ec2:ap-northeast-1:${ACCOUNT}:instance/*`, "allow"),
      ];
    })(),
    hints: ["SCP は権限を付与しません。禁止したい操作を Deny で書きます(FullAWSAccess が許可の上限を広げている)。", "例外の主体は Condition で除外します。条件キー aws:PrincipalArn はロールの ARN(arn:aws:iam::…:role/名前)になります。", "ArnNotLike は「一致しないとき」に成り立つ否定の演算子です。"],
    model: j({ Version: V, Statement: [{ Sid: "ProtectSecurityServices", Effect: "Deny", Action: ["cloudtrail:StopLogging", "cloudtrail:DeleteTrail", "guardduty:DeleteDetector", "config:StopConfigurationRecorder"], Resource: "*", Condition: { ArnNotLike: { "aws:PrincipalArn": "arn:aws:iam::*:role/SecurityAdmin" } } }] }),
    explain: {
      point: "SCP の Deny はアカウント内の管理者(ルートユーザーを含む)にも効くため、監査・検知の仕組みを守るガードレールの定番です。例外は aws:PrincipalArn と ArnNotLike で「SecurityAdmin 以外を拒否」と書きます。aws:PrincipalArn は、引き受けたロールのセッションでもロールの ARN になるので、ロール名で判定できます。",
      compare: "NotPrincipal を SCP で使うことはできません(SCP は Principal 要素を持たない)。aws:userid や aws:username は、ロールのセッションではセッション名に依存するため例外の判定には向きません。例外のロール自体を誰でも作れると抜け道になるため、そのロールの作成・変更も SCP で守ります。",
      pitfalls: ["Allow で書く → SCP は許可を付与しないので意味がない", "条件に StringNotEquals と aws:username を使う → ロールでは効かない", "Resource を特定の証跡に限定し、新しい証跡を守れない"],
    },
    references: [R.scpEx, R.scp, R.keys], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-scp-019", category: "iam", mode: "read", level: 4, examTags: ["SAP", "SCS"], services: ["orgs", "iam"],
    title: "許可リスト方式の SCP で、管理者ができることは?",
    scenario: "サンドボックス用 OU のアカウント 111122223333 では、既定の FullAWSAccess を外し、次の SCP だけを付けています。AdministratorAccess を持つロール AdminRole が実行できる操作をすべて選んでください。",
    environment: ["SCP: 下の SandboxAllowList だけ(FullAWSAccess は外している)", "ロール AdminRole: AdministratorAccess(Allow */*)"],
    code: j({ Version: V, Statement: [{ Sid: "SandboxAllowList", Effect: "Allow", Action: ["s3:*", "ec2:Describe*", "ec2:RunInstances", "cloudwatch:*", "sts:GetCallerIdentity"], Resource: "*" }] }),
    codeKind: "scp", codeAccounts: [ACCOUNT],
    envPolicies: [ADMIN(["role:AdminRole"])],
    multi: true,
    choices: [
      { text: "s3:DeleteBucket", correct: true, why: "s3:* が SCP の許可の範囲に含まれ、AdminRole の Allow もある。" },
      { text: "ec2:TerminateInstances", correct: false, why: "SCP が許可しているのは Describe* と RunInstances だけ。許可リストに無い操作は、管理者でも暗黙的に拒否される。" },
      { text: "dynamodb:CreateTable", correct: false, why: "DynamoDB の操作は SCP の許可リストに無い。" },
      { text: "ec2:DescribeInstances", correct: true, why: "ec2:Describe* のワイルドカードに一致する。" },
    ],
    tests: [
      { label: "s3:DeleteBucket", principal: role("AdminRole"), action: "s3:DeleteBucket", resource: "arn:aws:s3:::sandbox-bucket", expect: "allow" },
      { label: "ec2:TerminateInstances", principal: role("AdminRole"), action: "ec2:TerminateInstances", resource: `arn:aws:ec2:ap-northeast-1:${ACCOUNT}:instance/i-0a1b2c3d4e5f60001`, expect: "implicit-deny" },
      { label: "dynamodb:CreateTable", principal: role("AdminRole"), action: "dynamodb:CreateTable", resource: `arn:aws:dynamodb:ap-northeast-1:${ACCOUNT}:table/test`, expect: "implicit-deny" },
      { label: "ec2:DescribeInstances", principal: role("AdminRole"), action: "ec2:DescribeInstances", resource: "*", expect: "allow" },
    ],
    hints: ["SCP は「アカウント内で使える権限の上限」です。SCP の Allow に無い操作は、IAM で許可しても使えません。", "Describe* のようなワイルドカードは、その名前で始まるすべての操作に一致します。"],
    explain: {
      point: "SCP の戦略には、FullAWSAccess を残して禁止したい操作を Deny する「拒否リスト」と、FullAWSAccess を外して使ってよい操作だけを Allow する「許可リスト」があります。許可リストでは、SCP にも IAM にも Allow がある操作だけが使えます。",
      compare: "許可リストは厳しく管理できますが、新しいサービスや必要な操作を追加し忘れると業務が止まります。多くの組織は拒否リストを基本にしています。SCP の Allow には Condition が使えないなどの制約が以前はありましたが、現在は Allow でも条件・Resource を指定できます(最新の仕様は公式ドキュメントを確認)。",
      pitfalls: ["AdministratorAccess があれば何でもできると考える", "SCP の Allow が権限を付与すると考える(IAM の Allow も必要)"],
    },
    references: [R.scpStrategy, R.scp, R.logic], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-kms-020", category: "iam", mode: "write", level: 3, examTags: ["SCS", "SAP", "SAA"], services: ["kms", "iam"],
    title: "KMS のキーポリシー: 管理はアカウント、利用はアプリのロールだけ",
    scenario: "アプリのデータ用の KMS キーのキーポリシーを書きます。キーの管理は IAM ポリシーで制御できるようにアカウントへ委任し、暗号化・復号はアプリのロール AppRole に直接許可します。AppRole にはキーの削除などの管理操作をさせません。",
    environment: [`キー: ${KEY}`, "ロール AppRole(IAM ポリシーでの KMS の許可は無い)", "ロール KeyAdmin(IAM ポリシーで kms:* を許可済み)", "IAM ユーザー alice(KMS の許可は無い)"],
    requirements: ["アカウントのルートへの委任(IAM ポリシーで管理できるようにする)", "AppRole は Encrypt・Decrypt・GenerateDataKey ができる", "AppRole は ScheduleKeyDeletion・PutKeyPolicy ができない", "KeyAdmin は IAM ポリシーの許可でキーを管理できる", "alice は使えない"],
    editor: { language: "json", policyKind: "key", policyName: "app-data キーのキーポリシー", account: ACCOUNT, starter: EMPTY },
    envPolicies: [{ kind: "identity", name: "KeyAdminAccess", to: ["role:KeyAdmin"], doc: { Version: V, Statement: [{ Effect: "Allow", Action: "kms:*", Resource: KEY }] } }],
    tests: [
      { label: "AppRole が Decrypt", principal: role("AppRole"), action: "kms:Decrypt", resource: KEY, resourceAccount: ACCOUNT, expect: "allow" },
      { label: "AppRole が GenerateDataKey", principal: role("AppRole"), action: "kms:GenerateDataKey", resource: KEY, resourceAccount: ACCOUNT, expect: "allow" },
      { label: "AppRole が Encrypt", principal: role("AppRole"), action: "kms:Encrypt", resource: KEY, resourceAccount: ACCOUNT, expect: "allow" },
      { label: "AppRole が ScheduleKeyDeletion", principal: role("AppRole"), action: "kms:ScheduleKeyDeletion", resource: KEY, resourceAccount: ACCOUNT, expect: "deny" },
      { label: "AppRole が PutKeyPolicy", principal: role("AppRole"), action: "kms:PutKeyPolicy", resource: KEY, resourceAccount: ACCOUNT, expect: "deny" },
      { label: "KeyAdmin が PutKeyPolicy", principal: role("KeyAdmin"), action: "kms:PutKeyPolicy", resource: KEY, resourceAccount: ACCOUNT, expect: "allow" },
      { label: "alice が Decrypt", principal: alice, action: "kms:Decrypt", resource: KEY, resourceAccount: ACCOUNT, expect: "deny" },
    ],
    hints: ["キーポリシーは KMS のリソースベースのポリシーで、Principal が必要です。Resource は \"*\"(このキー自身)と書きます。", "IAM ポリシーで管理できるようにするには、Principal {\"AWS\": \"arn:aws:iam::111122223333:root\"} に kms:* を許可します(既定のキーポリシー)。", "AppRole には Principal にロールの ARN を書き、必要な操作だけを許可します。"],
    model: j({ Version: V, Statement: [
      ROOT_KEY_STMT,
      { Sid: "AllowAppUse", Effect: "Allow", Principal: { AWS: roleArn("AppRole") }, Action: ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey"], Resource: "*" },
    ] }),
    explain: {
      point: "KMS では、キーポリシーが許可しない限り、IAM ポリシーだけではキーを使えません。アカウントのルートに kms:* を許可するステートメントは「このアカウントの IAM ポリシーで許可された主体に使わせてよい」という委任で、ルートユーザーだけに許可する意味ではありません。キーポリシーで主体を直接指定した場合は、その主体の IAM ポリシーが無くても使えます。",
      compare: "ルートへの委任を書かないと、IAM ポリシーでの管理ができなくなり、キーポリシーに書いた主体以外は誰も管理できない「管理不能なキー」になるおそれがあります(AWS サポートへの依頼が必要)。逆に Principal \"*\" で許可するのは危険です。",
      pitfalls: ["AppRole に kms:* を許可する → キーの削除予約もできる", "ルートへの委任を省く → IAM ポリシーでは管理できなくなる", "Resource にキーの ARN を書かなければならないと考える(キーポリシーでは \"*\" がそのキー自身)"],
    },
    references: [R.keyPolicy, R.keyDefault], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-kms-021", category: "iam", mode: "fix", level: 3, examTags: ["SCS", "SOA"], services: ["kms", "iam"],
    title: "【障害対応】IAM ポリシーで kms:* を許可したのにキーを管理できない",
    scenario: "キー管理者のロール KeyAdmin には IAM ポリシーで kms:* が許可されていますが、キーポリシーの変更やローテーションの設定で AccessDeniedException になります。キーポリシーを直してください。アプリの AppRole の利用は今のまま続けます。",
    environment: [`キー: ${KEY}`, "ロール KeyAdmin: IAM ポリシーで kms:*(このキー)を許可済み", "ロール AppRole: キーポリシーで Encrypt・Decrypt を許可", "IAM ユーザー alice: KMS の許可なし"],
    requirements: ["KeyAdmin が IAM ポリシーの許可でキーを管理できる", "AppRole は Encrypt・Decrypt を続けられる", "alice は使えない", "キーポリシーで新しく広い許可(Principal \"*\" など)を与えない"],
    editor: { language: "json", policyKind: "key", policyName: "app-data キーのキーポリシー", account: ACCOUNT, starter: j({ Version: V, Statement: [{ Sid: "AllowAppUse", Effect: "Allow", Principal: { AWS: roleArn("AppRole") }, Action: ["kms:Encrypt", "kms:Decrypt"], Resource: "*" }] }) },
    envPolicies: [{ kind: "identity", name: "KeyAdminAccess", to: ["role:KeyAdmin"], doc: { Version: V, Statement: [{ Effect: "Allow", Action: "kms:*", Resource: KEY }] } }],
    tests: [
      { label: "KeyAdmin が PutKeyPolicy", principal: role("KeyAdmin"), action: "kms:PutKeyPolicy", resource: KEY, resourceAccount: ACCOUNT, expect: "allow" },
      { label: "KeyAdmin が DescribeKey", principal: role("KeyAdmin"), action: "kms:DescribeKey", resource: KEY, resourceAccount: ACCOUNT, expect: "allow" },
      { label: "AppRole が Decrypt", principal: role("AppRole"), action: "kms:Decrypt", resource: KEY, resourceAccount: ACCOUNT, expect: "allow" },
      { label: "AppRole が ScheduleKeyDeletion", principal: role("AppRole"), action: "kms:ScheduleKeyDeletion", resource: KEY, resourceAccount: ACCOUNT, expect: "deny" },
      { label: "alice が Decrypt", principal: alice, action: "kms:Decrypt", resource: KEY, resourceAccount: ACCOUNT, expect: "deny" },
    ],
    hints: ["「テスト実行」の判定の流れで、KeyAdmin の要求がどこで止まっているかを見ましょう。", "キーポリシーが許可していない主体は、IAM ポリシーでいくら許可してもキーを使えません。", "既定のキーポリシーには、アカウントのルートに kms:* を許可するステートメントがあります。"],
    model: j({ Version: V, Statement: [
      ROOT_KEY_STMT,
      { Sid: "AllowAppUse", Effect: "Allow", Principal: { AWS: roleArn("AppRole") }, Action: ["kms:Encrypt", "kms:Decrypt"], Resource: "*" },
    ] }),
    explain: {
      point: "KMS のキーポリシーは、IAM ポリシーを効かせるかどうかの入り口です。ルートへの委任(Principal がアカウントのルート)が無いと、このアカウントの IAM ポリシーはキーに対して一切効きません。委任を戻すと、KeyAdmin の IAM ポリシーの kms:* が有効になり、alice のように IAM の許可が無い主体は引き続き使えません。",
      compare: "KeyAdmin をキーポリシーに直接書く方法でも直りますが、管理者が増えるたびにキーポリシーの変更が必要になります。委任しておけば、IAM のポリシーとグループで管理できます。",
      pitfalls: ["IAM ポリシーをさらに広げようとする(キーポリシー側の問題)", "Principal \"*\" で許可して直す → 誰でも使える危険なキーになる"],
    },
    references: [R.keyDefault, R.keyPolicy], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-kms-022", category: "iam", mode: "write", level: 4, examTags: ["SCS", "SAP"], services: ["kms", "s3", "iam"],
    title: "KMS キーを「S3 経由のときだけ」使えるようにする",
    scenario: "アプリのロール AppRole は、SSE-KMS で暗号化された S3 のオブジェクトを読み書きします。キーを直接呼び出してデータを復号されないよう、S3 が AppRole の代わりに KMS を呼ぶときだけキーの利用を許可する IAM ポリシーを書いてください。",
    environment: [`キー: ${KEY}(キーポリシーはアカウントのルートへの委任のみ)`, "S3 の SSE-KMS では、S3 が呼び出し元の権限で kms:Decrypt・kms:GenerateDataKey を呼ぶ", "S3 経由の要求には kms:ViaService = s3.ap-northeast-1.amazonaws.com が含まれる"],
    requirements: ["S3 経由の kms:Decrypt・kms:GenerateDataKey を許可", "AppRole が直接(SDK・CLI で)Decrypt するのは拒否", "DynamoDB など、ほかのサービス経由でも拒否", "ほかのキーには使えない"],
    editor: { language: "json", policyKind: "identity", policyName: "AppKmsViaS3", attachTo: ["role:AppRole"], starter: EMPTY },
    envPolicies: [{ kind: "key", name: "app-data キーのキーポリシー", account: ACCOUNT, doc: { Version: V, Statement: [ROOT_KEY_STMT] } }],
    tests: (() => {
      const app = role("AppRole");
      const via = (s) => ({ "kms:ViaService": s, "kms:CallerAccount": ACCOUNT });
      return [
        { label: "S3 経由で GenerateDataKey(アップロード)", principal: app, action: "kms:GenerateDataKey", resource: KEY, resourceAccount: ACCOUNT, context: via("s3.ap-northeast-1.amazonaws.com"), expect: "allow" },
        { label: "S3 経由で Decrypt(ダウンロード)", principal: app, action: "kms:Decrypt", resource: KEY, resourceAccount: ACCOUNT, context: via("s3.ap-northeast-1.amazonaws.com"), expect: "allow" },
        { label: "直接 Decrypt(ViaService なし)", principal: app, action: "kms:Decrypt", resource: KEY, resourceAccount: ACCOUNT, context: { "kms:CallerAccount": ACCOUNT }, expect: "deny" },
        { label: "DynamoDB 経由で Decrypt", principal: app, action: "kms:Decrypt", resource: KEY, resourceAccount: ACCOUNT, context: via("dynamodb.ap-northeast-1.amazonaws.com"), expect: "deny" },
        { label: "別のキーを S3 経由で Decrypt", principal: app, action: "kms:Decrypt", resource: `arn:aws:kms:ap-northeast-1:${ACCOUNT}:key/9999ffff-0000-1111-2222-333344445555`, resourceAccount: ACCOUNT, context: via("s3.ap-northeast-1.amazonaws.com"), expect: "deny" },
        { label: "S3 経由で ScheduleKeyDeletion", principal: app, action: "kms:ScheduleKeyDeletion", resource: KEY, resourceAccount: ACCOUNT, context: via("s3.ap-northeast-1.amazonaws.com"), expect: "deny" },
      ];
    })(),
    hints: ["Resource にはキーの ARN を書きます。", "条件キー kms:ViaService は、AWS のサービスが代理で KMS を呼んだとき、そのサービスのエンドポイント名になります。直接の呼び出しには含まれません。", "StringEquals で s3.ap-northeast-1.amazonaws.com と比較します。"],
    model: j({ Version: V, Statement: [{ Sid: "UseKeyViaS3Only", Effect: "Allow", Action: ["kms:Decrypt", "kms:GenerateDataKey"], Resource: KEY, Condition: { StringEquals: { "kms:ViaService": "s3.ap-northeast-1.amazonaws.com" } } }] }),
    explain: {
      point: "SSE-KMS では、S3 が呼び出し元の ID で KMS を呼び出し、その要求に kms:ViaService が付きます。ViaService で S3 に限定すると、同じロールの認証情報が漏れても、キーを直接呼んでデータキーを復号することはできません。キーポリシーはルートへの委任なので、この IAM ポリシーで利用範囲が決まります。",
      compare: "キーポリシー側に ViaService の条件を書く方法もあります(複数のアカウント・ロールに共通の制限をかけたいとき)。S3 バケットキーを有効にすると、KMS の呼び出し回数(コスト)を減らせます。",
      pitfalls: ["Resource \"*\" にする → ほかのキーにも使える", "ViaService の値を s3.amazonaws.com とする(リージョン付きのエンドポイント名)", "StringLike で *.amazonaws.com とする → すべてのサービス経由で使える"],
    },
    references: [R.viaService, R.keyPolicy], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-sqs-023", category: "iam", mode: "write", level: 3, examTags: ["SAA", "DVA", "SCS"], services: ["sqs", "sns"],
    title: "SNS トピックからだけメッセージを受け付けるキューポリシー",
    scenario: "SNS トピック order-events をキュー order-worker にサブスクライブしました。SNS がキューにメッセージを送れるよう、キューポリシーを書いてください。ほかのトピック(他人のトピックを含む)からは送らせません。",
    environment: [`トピック: arn:aws:sns:ap-northeast-1:${ACCOUNT}:order-events`, `キュー: arn:aws:sqs:ap-northeast-1:${ACCOUNT}:order-worker`, "SNS のサービスプリンシパル: sns.amazonaws.com", "SNS からの送信には、送信元のトピックの ARN が aws:SourceArn として付く"],
    requirements: ["order-events トピックからの sqs:SendMessage を許可", "ほかのトピック(別アカウントを含む)からの送信は拒否", "S3 のイベント通知など、ほかのサービスからの送信は拒否", "匿名の利用者は送れない"],
    editor: { language: "json", policyKind: "resource", policyName: "order-worker のキューポリシー", account: ACCOUNT, starter: EMPTY },
    tests: (() => {
      const q = `arn:aws:sqs:ap-northeast-1:${ACCOUNT}:order-worker`;
      return [
        { label: "order-events から SendMessage", principal: svc("sns.amazonaws.com"), action: "sqs:SendMessage", resource: q, resourceAccount: ACCOUNT, context: { "aws:SourceArn": `arn:aws:sns:ap-northeast-1:${ACCOUNT}:order-events`, "aws:SourceAccount": ACCOUNT }, expect: "allow" },
        { label: "別のトピック marketing から SendMessage", principal: svc("sns.amazonaws.com"), action: "sqs:SendMessage", resource: q, resourceAccount: ACCOUNT, context: { "aws:SourceArn": `arn:aws:sns:ap-northeast-1:${ACCOUNT}:marketing`, "aws:SourceAccount": ACCOUNT }, expect: "deny" },
        { label: "別アカウントの同名トピックから SendMessage", principal: svc("sns.amazonaws.com"), action: "sqs:SendMessage", resource: q, resourceAccount: ACCOUNT, context: { "aws:SourceArn": "arn:aws:sns:ap-northeast-1:999988887777:order-events", "aws:SourceAccount": "999988887777" }, expect: "deny" },
        { label: "S3 のイベント通知から SendMessage", principal: svc("s3.amazonaws.com"), action: "sqs:SendMessage", resource: q, resourceAccount: ACCOUNT, context: { "aws:SourceArn": "arn:aws:s3:::uploads-bucket", "aws:SourceAccount": ACCOUNT }, expect: "deny" },
        { label: "匿名の利用者が SendMessage", principal: { kind: "anonymous" }, action: "sqs:SendMessage", resource: q, resourceAccount: ACCOUNT, expect: "deny" },
        { label: "order-events からキューを削除(PurgeQueue)", principal: svc("sns.amazonaws.com"), action: "sqs:PurgeQueue", resource: q, resourceAccount: ACCOUNT, context: { "aws:SourceArn": `arn:aws:sns:ap-northeast-1:${ACCOUNT}:order-events` }, expect: "deny" },
      ];
    })(),
    hints: ["Principal は {\"Service\": \"sns.amazonaws.com\"} です。", "どのトピックからの送信かは、条件キー aws:SourceArn で確認します。ARN の比較には ArnEquals(または ArnLike)を使います。", "Resource はキューの ARN です。"],
    model: j({ Version: V, Statement: [{ Sid: "AllowOrderEventsTopic", Effect: "Allow", Principal: { Service: "sns.amazonaws.com" }, Action: "sqs:SendMessage", Resource: `arn:aws:sqs:ap-northeast-1:${ACCOUNT}:order-worker`, Condition: { ArnEquals: { "aws:SourceArn": `arn:aws:sns:ap-northeast-1:${ACCOUNT}:order-events` } } }] }),
    explain: {
      point: "サービスプリンシパル(sns.amazonaws.com)はすべてのアカウントの SNS を表します。aws:SourceArn の条件が無いと、他人のトピックをこのキューにサブスクライブさせてメッセージを送り込めます(混乱した代理の問題)。SourceArn でトピックまで限定するのが公式の推奨です。",
      compare: "aws:SourceAccount だけで絞ると、同じアカウントのほかのトピックからは送れます。古いドキュメントでは Principal \"*\" と aws:SourceArn の組み合わせも見られますが、サービスプリンシパルを指定するほうが意図が明確です。",
      pitfalls: ["条件を付けずに sns.amazonaws.com を許可する", "Principal を \"*\" にして条件を付け忘れる", "Action に sqs:* を書く"],
    },
    references: [R.sqsSns, R.deputy], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-oac-024", category: "iam", mode: "write", level: 3, examTags: ["SAA", "SCS", "SAP"], services: ["s3", "cloudfront"],
    title: "CloudFront(OAC)経由でだけ S3 の静的サイトを配信する",
    scenario: "静的サイトのバケット www-acme-assets を、CloudFront のディストリビューション E2QWRUHAPOMQZL からだけ読めるようにします。オリジンアクセスコントロール(OAC)を使うので、バケットポリシーを書いてください。",
    environment: ["バケット www-acme-assets(ブロックパブリックアクセスは有効のまま)", `ディストリビューションの ARN: arn:aws:cloudfront::${ACCOUNT}:distribution/E2QWRUHAPOMQZL`, "OAC で署名した要求は、CloudFront のサービスプリンシパル cloudfront.amazonaws.com から届く"],
    requirements: ["E2QWRUHAPOMQZL からの s3:GetObject を許可", "ほかのディストリビューション(別アカウントを含む)からは読めない", "匿名の利用者が S3 の URL で直接読むのは拒否", "書き込み(PutObject)は許可しない"],
    editor: { language: "json", policyKind: "resource", policyName: "www-acme-assets のバケットポリシー", account: ACCOUNT, starter: EMPTY },
    tests: (() => {
      const cf = svc("cloudfront.amazonaws.com");
      const dist = (id, acct = ACCOUNT) => ({ "aws:SourceArn": `arn:aws:cloudfront::${acct}:distribution/${id}` });
      return [
        { label: "E2QWRUHAPOMQZL が index.html を取得", principal: cf, action: "s3:GetObject", resource: obj("www-acme-assets", "index.html"), resourceAccount: ACCOUNT, context: dist("E2QWRUHAPOMQZL"), expect: "allow" },
        { label: "別のディストリビューションが取得", principal: cf, action: "s3:GetObject", resource: obj("www-acme-assets", "index.html"), resourceAccount: ACCOUNT, context: dist("E1OTHERDIST000"), expect: "deny" },
        { label: "別アカウントのディストリビューションが取得", principal: cf, action: "s3:GetObject", resource: obj("www-acme-assets", "index.html"), resourceAccount: ACCOUNT, context: dist("E2QWRUHAPOMQZL", "999988887777"), expect: "deny" },
        { label: "匿名の利用者が S3 から直接取得", principal: { kind: "anonymous" }, action: "s3:GetObject", resource: obj("www-acme-assets", "index.html"), resourceAccount: ACCOUNT, expect: "deny" },
        { label: "E2QWRUHAPOMQZL が PutObject", principal: cf, action: "s3:PutObject", resource: obj("www-acme-assets", "index.html"), resourceAccount: ACCOUNT, context: dist("E2QWRUHAPOMQZL"), expect: "deny" },
      ];
    })(),
    hints: ["Principal は {\"Service\": \"cloudfront.amazonaws.com\"} です。", "どのディストリビューションからかは aws:SourceArn で確認します(StringEquals でも ArnEquals でもよい)。", "Resource は arn:aws:s3:::www-acme-assets/* です。"],
    model: j({ Version: V, Statement: [{ Sid: "AllowCloudFrontServicePrincipalReadOnly", Effect: "Allow", Principal: { Service: "cloudfront.amazonaws.com" }, Action: "s3:GetObject", Resource: "arn:aws:s3:::www-acme-assets/*", Condition: { StringEquals: { "AWS:SourceArn": `arn:aws:cloudfront::${ACCOUNT}:distribution/E2QWRUHAPOMQZL` } } }] }),
    explain: {
      point: "OAC では、CloudFront がサービスプリンシパルとして SigV4 で署名して S3 を呼びます。aws:SourceArn でディストリビューションを限定しないと、他人のディストリビューションのオリジンにこのバケットを指定して中身を読まれるおそれがあります。バケットは公開しないので、ブロックパブリックアクセスは有効のままで構いません。",
      compare: "旧方式のオリジンアクセスアイデンティティ(OAI)は Principal に OAI の ID を書く方式で、SSE-KMS や全リージョンの新機能に対応していないため、新規には OAC が推奨です。S3 の静的ウェブサイトホスティングのエンドポイントは OAC と組み合わせられません。",
      pitfalls: ["Principal \"*\" で公開する → S3 の URL で直接読まれる", "aws:SourceArn の条件を付けない", "ディストリビューションの ARN にリージョンを入れる(CloudFront の ARN はリージョンが空)"],
    },
    references: [R.oac, R.deputy], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-lambdares-025", category: "iam", mode: "read", level: 3, examTags: ["DVA", "SCS", "SAA"], services: ["lambda", "s3"],
    title: "Lambda のリソースベースのポリシー: 誰が関数を呼べる?",
    scenario: "関数 thumbnail-maker に次のリソースベースのポリシーが付いています(aws lambda add-permission で追加したもの)。関数を呼び出せる(lambda:InvokeFunction が許可される)ものをすべて選んでください。",
    environment: ["関数: arn:aws:lambda:ap-northeast-1:111122223333:function:thumbnail-maker", "バケット uploads-111122223333(アカウント 111122223333)", "IAM ユーザー alice には IAM ポリシーでの許可が無い"],
    code: j({ Version: V, Statement: [{ Sid: "s3-invoke", Effect: "Allow", Principal: { Service: "s3.amazonaws.com" }, Action: "lambda:InvokeFunction", Resource: `arn:aws:lambda:ap-northeast-1:${ACCOUNT}:function:thumbnail-maker`, Condition: { ArnLike: { "AWS:SourceArn": "arn:aws:s3:::uploads-111122223333" }, StringEquals: { "AWS:SourceAccount": ACCOUNT } } }] }),
    codeKind: "resource",
    multi: true,
    choices: [
      { text: "バケット uploads-111122223333 のイベント通知(S3)", correct: true, why: "Principal が s3.amazonaws.com で、SourceArn と SourceAccount の両方が一致する。" },
      { text: "別アカウントの同名のバケット uploads-111122223333(S3)", correct: false, why: "バケット名はグローバルに一意だが、削除後に他人が同じ名前で作り直すことはありうる。SourceAccount が一致しないため拒否される。" },
      { text: "EventBridge のルール(events.amazonaws.com)", correct: false, why: "Principal が S3 のサービスだけ。" },
      { text: "IAM ユーザー alice が aws lambda invoke で呼ぶ", correct: false, why: "このポリシーは alice を許可しておらず、alice の IAM ポリシーにも許可が無い。" },
    ],
    tests: (() => {
      const fn = `arn:aws:lambda:ap-northeast-1:${ACCOUNT}:function:thumbnail-maker`;
      return [
        { label: "uploads-111122223333 から(自アカウント)", principal: svc("s3.amazonaws.com"), action: "lambda:InvokeFunction", resource: fn, resourceAccount: ACCOUNT, context: { "aws:SourceArn": "arn:aws:s3:::uploads-111122223333", "aws:SourceAccount": ACCOUNT }, expect: "allow" },
        { label: "同名バケット(別アカウント)から", principal: svc("s3.amazonaws.com"), action: "lambda:InvokeFunction", resource: fn, resourceAccount: ACCOUNT, context: { "aws:SourceArn": "arn:aws:s3:::uploads-111122223333", "aws:SourceAccount": "999988887777" }, expect: "deny" },
        { label: "EventBridge から", principal: svc("events.amazonaws.com"), action: "lambda:InvokeFunction", resource: fn, resourceAccount: ACCOUNT, context: { "aws:SourceArn": `arn:aws:events:ap-northeast-1:${ACCOUNT}:rule/nightly`, "aws:SourceAccount": ACCOUNT }, expect: "deny" },
        { label: "alice が直接呼ぶ", principal: alice, action: "lambda:InvokeFunction", resource: fn, resourceAccount: ACCOUNT, expect: "deny" },
      ];
    })(),
    hints: ["Condition の 2 つの演算子は AND です。", "S3 の ARN にはアカウント ID が含まれません。どのアカウントのバケットかは aws:SourceAccount で確認します。"],
    explain: {
      point: "Lambda のリソースベースのポリシーは、ほかのサービスやアカウントが関数を呼ぶための許可です。S3 のバケットの ARN にはアカウント ID が入らないため、SourceArn だけでなく SourceAccount も付けるのが推奨です(バケットが削除され、他人に同じ名前で作られた場合の対策)。",
      compare: "同じアカウントの IAM ユーザーやロールが関数を呼ぶ場合は、通常はアイデンティティベースのポリシーで lambda:InvokeFunction を許可します。API Gateway からの呼び出しも、同様にリソースベースのポリシー(Principal apigateway.amazonaws.com と SourceArn)で許可します。",
      pitfalls: ["SourceAccount を省略しても安全と考える", "リソースベースのポリシーがあれば IAM ユーザーも呼べると考える"],
    },
    references: [R.lambdaRes, R.deputy], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-org-026", category: "iam", mode: "write", level: 4, examTags: ["SAP", "SCS"], services: ["s3", "orgs"],
    title: "組織内のすべてのアカウントに、成果物バケットの読み取りを許可",
    scenario: "ビルドの成果物を置くバケット shared-artifacts(アカウント 111122223333)を、組織 o-a1b2c3d4e5 のすべてのアカウントから読めるようにします。アカウントは今後も増えるので、アカウント ID を列挙せずにバケットポリシーを書いてください。",
    environment: [`組織 ID: ${ORG}`, "取引先のアカウント 444455556666 は組織のメンバー(ロール Builder が shared-artifacts/* の GetObject を IAM で許可済み)", "アカウント 999988887777 は組織外(ロール Outsider が同様の IAM の許可を持つ)"],
    requirements: ["組織内のアカウントの主体は s3:GetObject ができる", "組織外のアカウントの主体・匿名の利用者は読めない", "書き込み(PutObject)は許可しない"],
    editor: { language: "json", policyKind: "resource", policyName: "shared-artifacts のバケットポリシー", account: ACCOUNT, starter: EMPTY },
    envPolicies: [
      { kind: "identity", name: "BuilderArtifacts", account: PARTNER, to: ["role:Builder"], doc: { Version: V, Statement: [{ Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: "arn:aws:s3:::shared-artifacts/*" }] } },
      { kind: "identity", name: "OutsiderArtifacts", account: "999988887777", to: ["role:Outsider"], doc: { Version: V, Statement: [{ Effect: "Allow", Action: "s3:GetObject", Resource: "arn:aws:s3:::shared-artifacts/*" }] } },
    ],
    tests: (() => {
      const builder = { kind: "iam-role", name: "Builder", account: PARTNER, session: "ci", org: ORG };
      const outsider = { kind: "iam-role", name: "Outsider", account: "999988887777", session: "x", org: "o-zzzzzzzzzz" };
      const res = obj("shared-artifacts", "builds/web-1.4.2.zip");
      return [
        { label: "組織内の Builder が GetObject", principal: builder, action: "s3:GetObject", resource: res, resourceAccount: ACCOUNT, expect: "allow" },
        { label: "組織内の Builder が PutObject", principal: builder, action: "s3:PutObject", resource: res, resourceAccount: ACCOUNT, expect: "deny" },
        { label: "組織外の Outsider が GetObject", principal: outsider, action: "s3:GetObject", resource: res, resourceAccount: ACCOUNT, expect: "deny" },
        { label: "匿名の利用者が GetObject", principal: { kind: "anonymous" }, action: "s3:GetObject", resource: res, resourceAccount: ACCOUNT, expect: "deny" },
      ];
    })(),
    hints: ["アカウントを列挙せずに全員を対象にするには Principal \"*\" を使い、条件で絞ります。", "主体が属する組織は条件キー aws:PrincipalOrgID で確認できます。", "匿名の利用者にはこのキーが無いため、StringEquals は一致しません。"],
    model: j({ Version: V, Statement: [{ Sid: "AllowOrgRead", Effect: "Allow", Principal: "*", Action: "s3:GetObject", Resource: "arn:aws:s3:::shared-artifacts/*", Condition: { StringEquals: { "aws:PrincipalOrgID": ORG } } }] }),
    explain: {
      point: "aws:PrincipalOrgID は、要求した主体のアカウントが属する組織の ID です。Principal \"*\" と組み合わせると、組織に加わったアカウントは自動で対象になり、組織外や匿名の利用者は条件に一致しません。別アカウントの主体には、相手側の IAM ポリシーの許可も必要です。",
      compare: "aws:PrincipalOrgPaths を使うと、特定の OU 配下のアカウントだけに絞れます。条件を付け忘れた Principal \"*\" は公開と同じで、ブロックパブリックアクセスが有効ならポリシーの保存自体が拒否されます。",
      pitfalls: ["Principal にアカウント ID を列挙する → アカウントが増えるたびに変更が必要", "Principal \"*\" で条件を付け忘れる → 公開", "aws:SourceOrgID と混同する(こちらはサービスが代理で呼ぶときの送信元の組織)"],
    },
    references: [R.orgId, R.bucketEx], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-deny-027", category: "iam", mode: "fix", level: 3, examTags: ["SCS", "SOA"], services: ["s3"],
    title: "【障害対応】削除禁止の Deny で、バックアップ担当まで止まった",
    scenario: "監査ログのバケット audit-logs で、誤削除を防ぐために削除を禁止しました。ところが、保存期間を過ぎたログを整理するバックアップ担当のロール BackupAdmin まで AccessDenied になります。BackupAdmin だけは削除できるように、バケットポリシーを直してください。",
    environment: ["バケット audit-logs(アカウント 111122223333)", "ロール BackupAdmin: IAM で audit-logs/* の GetObject・DeleteObject を許可済み", "IAM ユーザー alice: IAM で audit-logs/* の GetObject・DeleteObject を許可済み", "現在のバケットポリシーが右のエディターに入っています"],
    requirements: ["BackupAdmin は削除できる", "alice など、ほかの主体は削除できない(IAM で許可されていても)", "読み取りは従来どおり IAM の許可に従う"],
    editor: { language: "json", policyKind: "resource", policyName: "audit-logs のバケットポリシー", account: ACCOUNT, starter: j({ Version: V, Statement: [{ Sid: "DenyDeletes", Effect: "Deny", Principal: "*", Action: ["s3:DeleteObject", "s3:DeleteObjectVersion"], Resource: "arn:aws:s3:::audit-logs/*" }] }) },
    envPolicies: [{ kind: "identity", name: "AuditLogsAccess", to: ["role:BackupAdmin", "user:alice"], doc: { Version: V, Statement: [{ Effect: "Allow", Action: ["s3:GetObject", "s3:DeleteObject"], Resource: "arn:aws:s3:::audit-logs/*" }] } }],
    tests: (() => {
      const res = obj("audit-logs", "2025/01/trail.json.gz");
      return [
        { label: "BackupAdmin が DeleteObject", principal: role("BackupAdmin"), action: "s3:DeleteObject", resource: res, expect: "allow" },
        { label: "alice が DeleteObject", principal: alice, action: "s3:DeleteObject", resource: res, expect: "explicit-deny" },
        { label: "alice が GetObject", principal: alice, action: "s3:GetObject", resource: res, expect: "allow" },
        { label: "BackupAdmin が GetObject", principal: role("BackupAdmin"), action: "s3:GetObject", resource: res, expect: "allow" },
      ];
    })(),
    hints: ["明示的な Deny は、どの Allow よりも優先されます。例外は Deny の側で作ります。", "Condition の aws:PrincipalArn は、ロールのセッションでもロールの ARN(arn:aws:iam::111122223333:role/BackupAdmin)になります。", "ArnNotEquals(または ArnNotLike)で「BackupAdmin 以外なら拒否」と書きます。"],
    model: j({ Version: V, Statement: [{ Sid: "DenyDeletesExceptBackupAdmin", Effect: "Deny", Principal: "*", Action: ["s3:DeleteObject", "s3:DeleteObjectVersion"], Resource: "arn:aws:s3:::audit-logs/*", Condition: { ArnNotEquals: { "aws:PrincipalArn": roleArn("BackupAdmin") } } }] }),
    explain: {
      point: "条件の無い Deny は全員に効き、例外を Allow で作ることはできません。Deny に「BackupAdmin 以外」という条件を付けると、BackupAdmin には Deny が一致せず、IAM の Allow で削除できます。否定の演算子(ArnNotEquals)は、キーが無い要求(匿名など)では true になるため、匿名の利用者も拒否されます。",
      compare: "NotPrincipal と Deny の組み合わせでも書けますが、ロールのセッションの ARN(assumed-role)も列挙する必要があり、誤りやすいため公式は aws:PrincipalArn の条件を推奨しています。誤削除の対策としては、S3 のバージョニングや Object Lock も併用します。",
      pitfalls: ["Allow のステートメントを追加して直そうとする → Deny が優先されて効かない", "aws:userid や aws:username で例外を作る → ロールではセッション名に依存する", "Deny ごと削除する → alice も削除できるようになる"],
    },
    references: [R.logic, R.keys, R.bucketEx], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-boundary-028", category: "iam", mode: "write", level: 4, examTags: ["SAP", "SCS", "DOP"], services: ["iam"],
    title: "権限の委任: 境界を付けたロールだけを作らせる",
    scenario: "開発チームのリーダー(ロール TeamLead)が、アプリ用のロール(名前が app- で始まる)を自分で作れるようにします。ただし権限の昇格を防ぐため、アクセス許可の境界 DevBoundary を付けたロールしか作れず、付けた境界を外したり変えたりもできないようにしてください。",
    environment: ["ロール TeamLead(このポリシー以外の許可は無い)", "境界のポリシー: arn:aws:iam::111122223333:policy/DevBoundary", "作るロールの ARN: arn:aws:iam::111122223333:role/app-*", "作成・境界の設定の要求には iam:PermissionsBoundary(付ける境界の ARN)が含まれる"],
    requirements: ["DevBoundary を付けるときだけ iam:CreateRole・iam:PutRolePermissionsBoundary を許可", "境界なし・別の境界では作れない", "iam:DeleteRolePermissionsBoundary は許可しない", "app- 以外の名前のロールは作れない"],
    editor: { language: "json", policyKind: "identity", policyName: "TeamLeadRoleCreation", attachTo: ["role:TeamLead"], starter: EMPTY },
    tests: (() => {
      const lead = role("TeamLead");
      const B = `arn:aws:iam::${ACCOUNT}:policy/DevBoundary`;
      const t = (label, action, name, boundary, expect) => ({ label, principal: lead, action, resource: roleArn(name), context: boundary ? { "iam:PermissionsBoundary": boundary } : {}, expect });
      return [
        t("DevBoundary 付きで app-orders を作成", "iam:CreateRole", "app-orders", B, "allow"),
        t("境界なしで app-orders を作成", "iam:CreateRole", "app-orders", null, "deny"),
        t("別の境界(AdminBoundary)で作成", "iam:CreateRole", "app-orders", `arn:aws:iam::${ACCOUNT}:policy/AdminBoundary`, "deny"),
        t("DevBoundary 付きで admin-x を作成", "iam:CreateRole", "admin-x", B, "deny"),
        t("既存の app-orders に DevBoundary を設定", "iam:PutRolePermissionsBoundary", "app-orders", B, "allow"),
        t("app-orders の境界を削除", "iam:DeleteRolePermissionsBoundary", "app-orders", null, "deny"),
      ];
    })(),
    hints: ["Resource は arn:aws:iam::111122223333:role/app-* です。", "条件キー iam:PermissionsBoundary を StringEquals で境界のポリシーの ARN と比較します(キーが無い要求は一致しません)。", "DeleteRolePermissionsBoundary は Action に含めません。"],
    model: j({ Version: V, Statement: [{ Sid: "CreateRolesWithDevBoundary", Effect: "Allow", Action: ["iam:CreateRole", "iam:PutRolePermissionsBoundary"], Resource: `arn:aws:iam::${ACCOUNT}:role/app-*`, Condition: { StringEquals: { "iam:PermissionsBoundary": `arn:aws:iam::${ACCOUNT}:policy/DevBoundary` } } }] }),
    explain: {
      point: "ロールを作れる人は、自分より強い権限のロールを作って引き受けることで権限を昇格できます。作成時に特定の境界を必須にすると、作ったロールの権限は境界の範囲を超えられません。境界を外す操作(DeleteRolePermissionsBoundary)や、境界のポリシー自体の変更も禁止しておくのが委任の定石です。",
      compare: "実際の運用では、作ったロールへのポリシーの付与(AttachRolePolicy・PutRolePolicy)にも同じ条件を付け、DevBoundary のポリシー(CreatePolicyVersion など)を変更できないよう Deny します。SCP で組織全体に同じ制限をかける方法もあります。",
      pitfalls: ["条件を StringLike と * にする → どの境界でもよくなる", "Resource \"*\" にする → 管理者用の名前のロールも作れる", "境界を外す操作を許可する → 作成後に外して昇格できる"],
    },
    references: [R.boundary, R.keys], reviewedAt: "2026-11-08", contentVersion: 1,
  },
];
