// コマンド・ポリシー演習: IAM・S3 の JSON ポリシー(12 問)。
// 各問: 要件・検証ケース(許可すべき / 拒否すべき)・よくある誤答・根拠資料をセットにする。模範解答は唯一の正解ではない。
import { ACCOUNT, PARTNER, alice, bob } from "./environments.js";

const V = "2012-10-17";
const j = (o) => JSON.stringify(o, null, 2);
const user = (name) => ({ kind: "iam-user", name, account: ACCOUNT });
const role = (name, extra = {}) => ({ kind: "iam-role", name, account: ACCOUNT, session: "work", ...extra });
const prole = (name) => ({ kind: "iam-role", name, account: PARTNER, session: "sync" });
const obj = (b, k) => `arn:aws:s3:::${b}/${k}`;
const bkt = (b) => `arn:aws:s3:::${b}`;
const EMPTY = `{\n  "Version": "2012-10-17",\n  "Statement": [\n    \n  ]\n}`;

const R = {
  elements: { title: "IAM JSON ポリシーの要素", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html" },
  logic: { title: "ポリシーの評価論理", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html" },
  home: { title: "IAM ユーザーの S3 ホームディレクトリ(ポリシー例)", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_s3_home-directory-console.html" },
  s3ex: { title: "Amazon S3 のアイデンティティベースのポリシー例", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-policies-s3.html" },
  keys: { title: "AWS グローバル条件コンテキストキー", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html" },
  vars: { title: "IAM ポリシーの要素: 変数とタグ", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html" },
  ops: { title: "IAM の条件演算子", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html" },
  abac: { title: "IAM の ABAC(属性ベースのアクセス制御)", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_attribute-based-access-control.html" },
  tags: { title: "タグによる AWS リソースへのアクセス制御", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_tags.html" },
  bucketEx: { title: "Amazon S3 のバケットポリシーの例", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html" },
  trust: { title: "ロールの信頼ポリシーと外部 ID(第三者へのアクセス許可)", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html" },
  scp: { title: "サービスコントロールポリシー(SCP)", url: "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html" },
  boundary: { title: "IAM エンティティのアクセス許可の境界", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html" },
  cross: { title: "クロスアカウントのポリシーの評価論理", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html" },
  mfa: { title: "MFA で保護された API アクセス", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_configure-api-require.html" },
  sim: { title: "IAM Policy Simulator によるポリシーのテスト(公式ツール)", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html" },
};

const OWN_MODEL = j({ Version: V, Statement: [{ Sid: "AllowOwnObjectsReadWrite", Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: "arn:aws:s3:::my-bucket/users/${aws:username}/*" }] });
const ownTests = [
  { label: "alice が自分の users/alice/report.pdf を読む", principal: alice, action: "s3:GetObject", resource: obj("my-bucket", "users/alice/report.pdf"), expect: "allow" },
  { label: "alice が自分の users/alice/new.txt に書く", principal: alice, action: "s3:PutObject", resource: obj("my-bucket", "users/alice/new.txt"), expect: "allow" },
  { label: "bob が自分の users/bob/plan.xlsx を読む", principal: bob, action: "s3:GetObject", resource: obj("my-bucket", "users/bob/plan.xlsx"), expect: "allow" },
  { label: "alice が bob の users/bob/secret.txt を読む", principal: alice, action: "s3:GetObject", resource: obj("my-bucket", "users/bob/secret.txt"), expect: "deny" },
  { label: "bob が alice の users/alice/new.txt に書く", principal: bob, action: "s3:PutObject", resource: obj("my-bucket", "users/alice/new.txt"), expect: "deny" },
  { label: "alice が自分のファイルを削除する", principal: alice, action: "s3:DeleteObject", resource: obj("my-bucket", "users/alice/report.pdf"), expect: "deny" },
  { label: "alice がバケットの一覧を取得する(この問題では不要)", principal: alice, action: "s3:ListBucket", resource: bkt("my-bucket"), context: { "s3:prefix": "users/alice/" }, expect: "deny" },
];

export const IAM_QUESTIONS = [
  {
    id: "iam-s3-001", category: "iam", mode: "write", level: 2, examTags: ["SAA", "SAP", "SCS"], services: ["s3", "iam"],
    title: "ユーザー専用の S3 プレフィックスへの読み書き",
    scenario: "IAM ユーザー alice と bob が同じバケット my-bucket を使います。それぞれが users/<自分のユーザー名>/ の配下だけを読み書きできる、1 つの共通ポリシーを書いてください。",
    environment: ["アカウント 111122223333、バケット my-bucket", "IAM ユーザー alice・bob(ほかのポリシーによる追加の許可は無い)", "書いたポリシーは alice と bob の両方に付けます(アイデンティティベース)", "オブジェクト: users/alice/report.pdf・users/bob/secret.txt など"],
    requirements: ["自分のプレフィックス配下の読み取り(GetObject)と書き込み(PutObject)を許可", "他人のプレフィックスは読み書きできない", "削除(DeleteObject)は許可しない", "バケットの一覧(ListBucket)はこの問題では不要", "ユーザーごとに別のポリシーを作らず、1 つで済ませる"],
    editor: { language: "json", policyKind: "identity", policyName: "SharedUserPrefixPolicy", attachTo: ["user:alice", "user:bob"], starter: EMPTY },
    tests: ownTests,
    hints: ["オブジェクトの操作の Resource は arn:aws:s3:::バケット名/キー の形です。", "ユーザー名ごとに書き分けず、ポリシー変数 ${aws:username} を使えます(Version は 2012-10-17 が必要)。", "Resource の末尾を users/${aws:username}/* にすると、そのプレフィックス配下のすべてのキーに一致します。"],
    model: OWN_MODEL,
    explain: {
      point: "${aws:username} は、リクエストした IAM ユーザーの名前に置き換わります。alice のリクエストでは arn:aws:s3:::my-bucket/users/alice/* になり、bob のオブジェクトの ARN とは一致しません。一致する Allow が無い操作は、暗黙的に拒否されます。",
      compare: "Resource を arn:aws:s3:::my-bucket/* にすると全員のオブジェクトに一致し、他人のファイルも読めてしまいます。s3:* を使うと DeleteObject も含まれます。一覧(ListBucket)はバケットの ARN が対象で、オブジェクトの ARN では許可できません(発展は iam-s3-003)。",
      pitfalls: ["Resource を arn:aws:s3:::my-bucket(バケットの ARN)にする → オブジェクトの操作に一致しない", "Version を省略する → ${aws:username} が文字どおりの文字列として扱われ、何にも一致しない", "S3 の「フォルダ」はキーのプレフィックスで、ファイルシステムのフォルダそのものではない"],
    },
    references: [R.home, R.s3ex, R.vars, R.logic], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-s3-002", category: "iam", mode: "read", level: 1, examTags: ["CLF", "SAA"], services: ["s3", "iam"],
    title: "このポリシーで、できる操作はどれ?",
    scenario: "IAM ユーザー carol に次のポリシーだけが付いています。carol ができる操作をすべて選んでください。",
    environment: ["IAM ユーザー carol(このポリシー以外の許可は無い)", "バケット reports-bucket・other-bucket"],
    code: j({ Version: V, Statement: [{ Sid: "ReadReports", Effect: "Allow", Action: ["s3:GetObject", "s3:ListBucket"], Resource: "arn:aws:s3:::reports-bucket/*" }] }),
    codeKind: "identity", codeAttachTo: ["user:carol"],
    multi: true,
    choices: [
      { text: "reports-bucket/2026/q3.pdf をダウンロードする(GetObject)", correct: true, why: "Resource の reports-bucket/* がオブジェクトの ARN に一致し、Action に GetObject がある。" },
      { text: "reports-bucket のオブジェクトの一覧を表示する(ListBucket)", correct: false, why: "ListBucket の対象はバケットの ARN(arn:aws:s3:::reports-bucket)。reports-bucket/* はオブジェクトの ARN なので一致しない。" },
      { text: "reports-bucket/2026/q3.pdf を削除する(DeleteObject)", correct: false, why: "Action に DeleteObject が無い。許可されていない操作は暗黙的に拒否される。" },
      { text: "other-bucket/a.csv をダウンロードする", correct: false, why: "Resource が reports-bucket に限られている。" },
    ],
    tests: [
      { label: "GetObject reports-bucket/2026/q3.pdf", principal: user("carol"), action: "s3:GetObject", resource: obj("reports-bucket", "2026/q3.pdf"), expect: "allow" },
      { label: "ListBucket reports-bucket", principal: user("carol"), action: "s3:ListBucket", resource: bkt("reports-bucket"), expect: "deny" },
      { label: "DeleteObject reports-bucket/2026/q3.pdf", principal: user("carol"), action: "s3:DeleteObject", resource: obj("reports-bucket", "2026/q3.pdf"), expect: "deny" },
      { label: "GetObject other-bucket/a.csv", principal: user("carol"), action: "s3:GetObject", resource: obj("other-bucket", "a.csv"), expect: "deny" },
    ],
    hints: ["Action と Resource の両方が一致したときだけ、そのステートメントが使われます。", "s3:ListBucket はどの ARN に対する操作でしょうか。"],
    explain: {
      point: "ステートメントは Action・Resource(・Condition)がすべて一致したときに効きます。ListBucket は Action には書かれていますが、対象がバケットの ARN なので、オブジェクトの ARN だけの Resource とは一致しません。",
      compare: "一覧も許可するには、Resource に arn:aws:s3:::reports-bucket を加えた別のステートメントが必要です。1 つのステートメントに両方の ARN を並べると、GetObject がバケットの ARN にも(意味はないが)書かれた形になるため、操作ごとにステートメントを分けると読みやすくなります。",
      pitfalls: ["Action に書いてあれば必ず使える、と考える", "reports-bucket/* がバケット自体も含むと考える"],
    },
    references: [R.elements, R.s3ex], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-s3-003", category: "iam", mode: "write", level: 2, examTags: ["SAA", "SCS", "DVA"], services: ["s3", "iam"],
    title: "一覧(ListBucket)も自分のプレフィックスだけに絞る",
    scenario: "iam-s3-001 のポリシーに、自分のプレフィックス配下だけを一覧できる許可を追加してください。aws s3 ls s3://my-bucket/users/alice/ が成功し、他人のプレフィックスやバケットの最上位の一覧は失敗するようにします。",
    environment: ["バケット my-bucket、IAM ユーザー alice・bob", "一覧の対象は、リクエストの s3:prefix 条件キー(一覧の先頭の文字列)で判断できます"],
    requirements: ["自分のプレフィックス users/<名前>/ とその配下の一覧を許可", "他人のプレフィックス・バケット全体(プレフィックスなし)の一覧は拒否", "読み書き(GetObject・PutObject)は引き続き自分の配下だけ", "削除は許可しない"],
    editor: { language: "json", policyKind: "identity", policyName: "SharedUserPrefixPolicy", attachTo: ["user:alice", "user:bob"], starter: OWN_MODEL },
    tests: [
      { label: "alice が users/alice/ を一覧", principal: alice, action: "s3:ListBucket", resource: bkt("my-bucket"), context: { "s3:prefix": "users/alice/", "s3:delimiter": "/" }, expect: "allow" },
      { label: "alice が users/alice/notes/ を一覧", principal: alice, action: "s3:ListBucket", resource: bkt("my-bucket"), context: { "s3:prefix": "users/alice/notes/", "s3:delimiter": "/" }, expect: "allow" },
      { label: "bob が users/bob/ を一覧", principal: bob, action: "s3:ListBucket", resource: bkt("my-bucket"), context: { "s3:prefix": "users/bob/" }, expect: "allow" },
      { label: "alice が users/bob/ を一覧", principal: alice, action: "s3:ListBucket", resource: bkt("my-bucket"), context: { "s3:prefix": "users/bob/" }, expect: "deny" },
      { label: "alice がバケットの最上位を一覧(prefix が空)", principal: alice, action: "s3:ListBucket", resource: bkt("my-bucket"), context: { "s3:prefix": "" }, expect: "deny" },
      { label: "alice がプレフィックスなしで一覧", principal: alice, action: "s3:ListBucket", resource: bkt("my-bucket"), expect: "deny" },
      ...ownTests.slice(0, 6),
    ],
    hints: ["ListBucket の Resource はバケットの ARN(arn:aws:s3:::my-bucket)です。", "一覧の範囲は Condition の \"s3:prefix\" で絞ります。ワイルドカードを使うので StringLike を使います。", "users/${aws:username}/ と users/${aws:username}/* の 2 つの値を並べると、自分の直下と配下の両方に一致します。"],
    model: j({ Version: V, Statement: [
      { Sid: "AllowOwnObjectsReadWrite", Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: "arn:aws:s3:::my-bucket/users/${aws:username}/*" },
      { Sid: "AllowListOwnPrefix", Effect: "Allow", Action: "s3:ListBucket", Resource: "arn:aws:s3:::my-bucket", Condition: { StringLike: { "s3:prefix": ["users/${aws:username}/", "users/${aws:username}/*"] } } },
    ] }),
    explain: {
      point: "ListBucket はバケット単位の操作なので、Resource にはバケットの ARN を書き、どこを一覧するかは s3:prefix 条件キーで判断します。条件キーがリクエストに無い(プレフィックスなしの一覧)場合、StringLike は一致しないため拒否されます。",
      compare: "条件を付けずに ListBucket を許可すると、全員がバケット全体のキー名(他人のファイル名)を見られます。コンソールで画面をたどるには、最上位(\"\")や users/ の一覧も別途許可する必要があります(公式のホームディレクトリの例を参照)。",
      pitfalls: ["ListBucket の Resource を arn:aws:s3:::my-bucket/users/${aws:username}/* にする → 一致しない", "StringEquals を使う → ワイルドカードの * が文字として扱われ、配下の一覧に一致しない", "s3 ls の URI の末尾の / を忘れる → prefix が users/alice になり条件に一致しない"],
    },
    references: [R.home, R.ops, R.s3ex], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-s3-004", category: "iam", mode: "fix", level: 2, examTags: ["SAA", "SCS"], services: ["s3", "iam"],
    title: "【障害対応】他人のファイルが読めてしまう",
    scenario: "問い合わせ:「alice が bob のファイルを開けてしまう。しかも削除までできる」。共通ポリシー SharedUserPrefixPolicy を、要件どおりに直してください。",
    environment: ["チケット #4412: users/bob/secret.txt が alice から閲覧可能", "現在のポリシーが右のエディターに入っています"],
    requirements: ["自分のプレフィックス配下の読み書きだけを許可", "他人のプレフィックスは読み書きできない", "削除は許可しない"],
    editor: { language: "json", policyKind: "identity", policyName: "SharedUserPrefixPolicy", attachTo: ["user:alice", "user:bob"], starter: j({ Version: V, Statement: [{ Sid: "UserFiles", Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"], Resource: "arn:aws:s3:::my-bucket/*" }] }) },
    tests: ownTests,
    hints: ["まず「テスト実行」で、どのケースが過剰に許可されているかを確認しましょう。", "Resource が全員のオブジェクトに一致していないか、Action に不要な操作がないかを見直します。"],
    model: OWN_MODEL,
    explain: {
      point: "Resource が arn:aws:s3:::my-bucket/* だと、バケット内のすべてのオブジェクト(他人のプレフィックスを含む)に一致します。${aws:username} で自分のプレフィックスに限定し、不要な DeleteObject を外すと、過剰な許可がなくなります。",
      compare: "明示的な Deny で他人のプレフィックスを拒否する方法もありますが、まず Allow の範囲を正しく絞るのが基本です(最小権限)。",
      pitfalls: ["DeleteObject だけを外して Resource を直さない → 他人のファイルは読めたまま", "users/* にする → まだ全員のプレフィックスに一致する"],
    },
    references: [R.home, R.logic], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-abac-005", category: "iam", mode: "fix", level: 3, examTags: ["SAP", "SCS"], services: ["iam", "sso", "s3"],
    title: "【障害対応】ロールでは ${aws:username} が使えない",
    scenario: "IAM Identity Center から IAM ロール DataAnalyst を引き受けて作業する体制に変えたところ、全員が projects-bucket で AccessDenied になりました。セッションにはプリンシパルタグ project(alpha / beta)が付きます。自分のプロジェクトのプレフィックスだけを読み書きできるように直してください。",
    environment: ["ロール DataAnalyst(全員が同じロールを使う)", "セッションのプリンシパルタグ: project=alpha または project=beta", "バケット projects-bucket(プレフィックス alpha/・beta/)"],
    requirements: ["タグ project=alpha のセッションは alpha/ 配下の読み書きができる(beta も同様)", "他のプロジェクトのプレフィックスは読み書きできない", "project タグの無いセッションは何もできない", "削除は許可しない"],
    editor: { language: "json", policyKind: "identity", policyName: "ProjectPrefixPolicy", attachTo: ["role:DataAnalyst"], starter: j({ Version: V, Statement: [{ Sid: "OwnPrefix", Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: "arn:aws:s3:::projects-bucket/${aws:username}/*" }] }) },
    tests: [
      { label: "project=alpha のセッションが alpha/data.csv を読む", principal: role("DataAnalyst", { session: "alice@example.com", tags: { project: "alpha" } }), action: "s3:GetObject", resource: obj("projects-bucket", "alpha/data.csv"), expect: "allow" },
      { label: "project=alpha のセッションが alpha/out.csv に書く", principal: role("DataAnalyst", { session: "alice@example.com", tags: { project: "alpha" } }), action: "s3:PutObject", resource: obj("projects-bucket", "alpha/out.csv"), expect: "allow" },
      { label: "project=beta のセッションが beta/data.csv を読む", principal: role("DataAnalyst", { session: "bob@example.com", tags: { project: "beta" } }), action: "s3:GetObject", resource: obj("projects-bucket", "beta/data.csv"), expect: "allow" },
      { label: "project=alpha のセッションが beta/data.csv を読む", principal: role("DataAnalyst", { session: "alice@example.com", tags: { project: "alpha" } }), action: "s3:GetObject", resource: obj("projects-bucket", "beta/data.csv"), expect: "deny" },
      { label: "タグの無いセッションが alpha/data.csv を読む", principal: role("DataAnalyst", { session: "guest@example.com" }), action: "s3:GetObject", resource: obj("projects-bucket", "alpha/data.csv"), expect: "deny" },
      { label: "project=alpha のセッションが alpha/data.csv を削除", principal: role("DataAnalyst", { session: "alice@example.com", tags: { project: "alpha" } }), action: "s3:DeleteObject", resource: obj("projects-bucket", "alpha/data.csv"), expect: "deny" },
    ],
    hints: ["aws:username はリクエストした主体が IAM ユーザーのときだけ存在する条件キーです。ロールのセッションにはありません。", "セッションのタグは ${aws:PrincipalTag/タグキー} で参照できます。", "存在しない変数を含む Resource は何にも一致しないため、タグの無いセッションは自動的に拒否されます。"],
    model: j({ Version: V, Statement: [{ Sid: "OwnProjectPrefix", Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: "arn:aws:s3:::projects-bucket/${aws:PrincipalTag/project}/*" }] }),
    explain: {
      point: "IAM ロールのセッション(Identity Center 経由を含む)には aws:username がありません。ポリシー変数が解決できないと、その Resource は一致せず全員が拒否されます。セッションタグ(プリンシパルタグ)を使う ABAC に切り替えると、1 つのポリシーでプロジェクトごとに範囲を分けられます。",
      compare: "aws:userid(ロール ID:セッション名)を使う方法もありますが、セッション名は引き受ける側が指定できる場合があるため、信頼できる属性(IdP から渡るタグ)で判断するのが安全です。タグを利用者が自分で付け替えられないようにすることも前提です。",
      pitfalls: ["${aws:username} をそのまま使う → ロールでは常に拒否", "${aws:PrincipalTag/Project} と大文字・小文字を変える → タグキーの違いに注意", "Resource を projects-bucket/* にして解決する → 他プロジェクトにも一致する"],
    },
    references: [R.vars, R.abac, R.keys], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-mfa-006", category: "iam", mode: "read", level: 2, examTags: ["SAA", "SCS"], services: ["iam", "s3"],
    title: "MFA が無い削除はどう判定される?",
    scenario: "IAM ユーザー dave に次のポリシーが付いています。dave が長期のアクセスキー(MFA なし)で team-bucket/old.log を削除しようとしました。aws:MultiFactorAuthPresent はリクエストに含まれません。結果はどれですか。",
    environment: ["IAM ユーザー dave(このポリシーのみ)", "長期のアクセスキーによるリクエストには aws:MultiFactorAuthPresent が含まれない"],
    code: j({ Version: V, Statement: [
      { Sid: "AllowBucketObjects", Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"], Resource: "arn:aws:s3:::team-bucket/*" },
      { Sid: "DenyDeleteWithoutMfa", Effect: "Deny", Action: "s3:DeleteObject", Resource: "arn:aws:s3:::team-bucket/*", Condition: { BoolIfExists: { "aws:MultiFactorAuthPresent": "false" } } },
    ] }),
    codeKind: "identity", codeAttachTo: ["user:dave"],
    multi: false,
    choices: [
      { text: "許可される(Allow があるため)", correct: false, why: "Allow があっても、一致した明示的な Deny が優先される。" },
      { text: "明示的に拒否される", correct: true, why: "BoolIfExists はキーが無いとき true になるため、Deny のステートメントが一致する。" },
      { text: "暗黙的に拒否される", correct: false, why: "暗黙的な拒否は、一致する Allow が無い場合。ここでは Deny が一致している。" },
      { text: "条件キーが無いので Deny は無視され、許可される", correct: false, why: "それは Bool(IfExists なし)を使った場合の動作。" },
    ],
    tests: [
      { label: "MFA なし(キーなし)で削除", principal: user("dave"), action: "s3:DeleteObject", resource: obj("team-bucket", "old.log"), expect: "explicit-deny" },
      { label: "MFA なし(false)で削除", principal: user("dave"), action: "s3:DeleteObject", resource: obj("team-bucket", "old.log"), context: { "aws:MultiFactorAuthPresent": "false" }, expect: "explicit-deny" },
      { label: "MFA あり(true)で削除", principal: user("dave"), action: "s3:DeleteObject", resource: obj("team-bucket", "old.log"), context: { "aws:MultiFactorAuthPresent": "true" }, expect: "allow" },
      { label: "MFA なしで読み取り", principal: user("dave"), action: "s3:GetObject", resource: obj("team-bucket", "old.log"), expect: "allow" },
    ],
    hints: ["評価の順番は「明示的な Deny → Allow」です。", "...IfExists は、キーがリクエストに無いとき条件を true として扱います。"],
    explain: {
      point: "長期のアクセスキーで署名したリクエストには aws:MultiFactorAuthPresent が含まれません。BoolIfExists は「キーがあれば比較し、無ければ true」なので、Deny が一致して明示的に拒否されます。明示的な Deny はどの Allow よりも優先されます。",
      compare: "Bool だけだと、キーが無いリクエストでは条件が false になり Deny が効かず、MFA なしでも削除できてしまいます。MFA を必須にする Deny では BoolIfExists(または Null 条件との組み合わせ)を使います。",
      pitfalls: ["Allow があるので許可と考える", "Bool と BoolIfExists の違いを区別しない"],
    },
    references: [R.mfa, R.ops, R.logic], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-ec2tag-007", category: "iam", mode: "write", level: 3, examTags: ["SAA", "SOA", "SCS"], services: ["ec2", "iam"],
    title: "タグ Environment=dev の EC2 だけを停止・起動できる",
    scenario: "運用担当の alice が、開発用の EC2 インスタンスだけを停止・起動できるようにします。本番のインスタンスには触れさせません。一覧の表示はすべて許可します。",
    environment: ["IAM ユーザー alice(このポリシー以外の許可は無い)", "開発用: タグ Environment=dev、本番: タグ Environment=prod", "インスタンスの ARN: arn:aws:ec2:ap-northeast-1:111122223333:instance/<ID>"],
    requirements: ["Environment=dev のインスタンスの停止(StopInstances)・起動(StartInstances)を許可", "Environment=prod やタグの無いインスタンスは停止・起動できない", "DescribeInstances(一覧)はすべて許可", "終了(TerminateInstances)は許可しない"],
    editor: { language: "json", policyKind: "identity", policyName: "DevInstanceOperator", attachTo: ["user:alice"], starter: EMPTY },
    tests: (() => {
      const dev = { "aws:ResourceTag/Environment": "dev", "ec2:ResourceTag/Environment": "dev" };
      const prod = { "aws:ResourceTag/Environment": "prod", "ec2:ResourceTag/Environment": "prod" };
      const ins = (id) => `arn:aws:ec2:ap-northeast-1:${ACCOUNT}:instance/${id}`;
      return [
        { label: "dev のインスタンスを停止", principal: alice, action: "ec2:StopInstances", resource: ins("i-0a1b2c3d4e5f60001"), context: dev, expect: "allow" },
        { label: "dev のインスタンスを起動", principal: alice, action: "ec2:StartInstances", resource: ins("i-0a1b2c3d4e5f60004"), context: dev, expect: "allow" },
        { label: "prod のインスタンスを停止", principal: alice, action: "ec2:StopInstances", resource: ins("i-0a1b2c3d4e5f60002"), context: prod, expect: "deny" },
        { label: "タグの無いインスタンスを停止", principal: alice, action: "ec2:StopInstances", resource: ins("i-0a1b2c3d4e5f60099"), expect: "deny" },
        { label: "インスタンスの一覧を表示", principal: alice, action: "ec2:DescribeInstances", resource: "*", expect: "allow" },
        { label: "dev のインスタンスを終了", principal: alice, action: "ec2:TerminateInstances", resource: ins("i-0a1b2c3d4e5f60001"), context: dev, expect: "deny" },
      ];
    })(),
    hints: ["DescribeInstances のような一覧の操作は、リソースを絞れないため Resource \"*\" を使います。", "インスタンスに付いたタグは条件キー aws:ResourceTag/Environment(または ec2:ResourceTag/Environment)で参照できます。", "停止・起動と一覧は、Resource と Condition が違うので別のステートメントに分けます。"],
    model: j({ Version: V, Statement: [
      { Sid: "DescribeAll", Effect: "Allow", Action: "ec2:DescribeInstances", Resource: "*" },
      { Sid: "StopStartDevOnly", Effect: "Allow", Action: ["ec2:StopInstances", "ec2:StartInstances"], Resource: "arn:aws:ec2:ap-northeast-1:111122223333:instance/*", Condition: { StringEquals: { "aws:ResourceTag/Environment": "dev" } } },
    ] }),
    explain: {
      point: "停止・起動の要求には、対象インスタンスのタグが aws:ResourceTag/<キー> として含まれます。StringEquals で dev と比較すると、dev のインスタンスだけに Allow が一致します。タグの無いインスタンスはキーが無いので一致せず、暗黙的に拒否されます。",
      compare: "インスタンス ID を Resource に列挙する方法は、インスタンスが増えるたびにポリシーの変更が必要です。タグを使う ABAC なら、正しくタグを付ければ自動で対象になります。ただし、利用者が自分でタグを変更できる(ec2:CreateTags を持つ)とすり抜けられるため、タグの変更権限も管理します。",
      pitfalls: ["Condition を一覧のステートメントにも付ける → DescribeInstances が失敗する", "ec2:* を許可して Condition で絞る → Terminate などにも dev なら一致する"],
    },
    references: [R.tags, R.abac, R.keys], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-bp-008", category: "iam", mode: "write", level: 3, examTags: ["SCS", "SAP", "SAA"], services: ["s3", "iam", "vpc"],
    title: "バケットポリシーで、社内ネットワークと HTTPS 以外を拒否",
    scenario: "経理のバケット finance-bucket は、社内ネットワーク(198.51.100.0/24)から HTTPS でアクセスされたときだけ使えるようにします。社員への読み書きの許可は、すでにアイデンティティベースのポリシーで付いています。バケットポリシーを書いてください。",
    environment: ["バケット finance-bucket(アカウント 111122223333)", "alice には GetObject・PutObject の許可(アイデンティティベース)がある", "bob には finance-bucket の許可が無い", "社内ネットワーク: 198.51.100.0/24"],
    requirements: ["社内ネットワーク以外の IP からのアクセスは拒否", "HTTPS 以外(aws:SecureTransport が false)のアクセスは拒否", "社内から HTTPS で、許可を持つ人は従来どおり使える", "バケットポリシーで新しく誰かに許可を与えない"],
    editor: { language: "json", policyKind: "resource", policyName: "finance-bucket のバケットポリシー", account: ACCOUNT, starter: EMPTY },
    envPolicies: [{ kind: "identity", name: "FinanceStaff", to: ["user:alice"], doc: { Version: V, Statement: [{ Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: "arn:aws:s3:::finance-bucket/*" }] } }],
    tests: [
      { label: "alice が社内から HTTPS で読む", principal: alice, action: "s3:GetObject", resource: obj("finance-bucket", "2026/ledger.xlsx"), context: { "aws:SourceIp": "198.51.100.20", "aws:SecureTransport": "true" }, expect: "allow" },
      { label: "alice が社内から HTTPS で書く", principal: alice, action: "s3:PutObject", resource: obj("finance-bucket", "2026/new.xlsx"), context: { "aws:SourceIp": "198.51.100.20", "aws:SecureTransport": "true" }, expect: "allow" },
      { label: "alice が社外(203.0.113.5)から読む", principal: alice, action: "s3:GetObject", resource: obj("finance-bucket", "2026/ledger.xlsx"), context: { "aws:SourceIp": "203.0.113.5", "aws:SecureTransport": "true" }, expect: "explicit-deny" },
      { label: "alice が社内から HTTP で読む", principal: alice, action: "s3:GetObject", resource: obj("finance-bucket", "2026/ledger.xlsx"), context: { "aws:SourceIp": "198.51.100.20", "aws:SecureTransport": "false" }, expect: "explicit-deny" },
      { label: "許可を持たない bob が社内から HTTPS で読む", principal: bob, action: "s3:GetObject", resource: obj("finance-bucket", "2026/ledger.xlsx"), context: { "aws:SourceIp": "198.51.100.30", "aws:SecureTransport": "true" }, expect: "deny" },
    ],
    hints: ["許可は付けず、条件に合わない要求を Deny するステートメントを書きます。", "バケットポリシーには Principal が必要です。全員を対象にする Deny は \"Principal\": \"*\" と書けます。", "IP の範囲外は NotIpAddress の aws:SourceIp、HTTPS 以外は Bool の aws:SecureTransport: \"false\" で判定できます。"],
    model: j({ Version: V, Statement: [
      { Sid: "DenyOutsideCorpNetwork", Effect: "Deny", Principal: "*", Action: "s3:*", Resource: ["arn:aws:s3:::finance-bucket", "arn:aws:s3:::finance-bucket/*"], Condition: { NotIpAddress: { "aws:SourceIp": "198.51.100.0/24" } } },
      { Sid: "DenyInsecureTransport", Effect: "Deny", Principal: "*", Action: "s3:*", Resource: ["arn:aws:s3:::finance-bucket", "arn:aws:s3:::finance-bucket/*"], Condition: { Bool: { "aws:SecureTransport": "false" } } },
    ] }),
    explain: {
      point: "Deny で「条件に合わないものを拒否」すると、どこで付けた Allow よりも優先されるため、確実にガードレールになります。2 つの条件は別のステートメントにすると「どちらか一方でも満たさなければ拒否」(OR)になります。1 つの Condition に並べると両方を満たすときだけ(AND)Deny になる点に注意します。",
      compare: "Allow + IpAddress の条件で書くと、そのバケットポリシーが新しく許可を与えることになり、許可を持たない人まで使えるようになりがちです。VPC エンドポイント経由のアクセスでは aws:SourceIp ではなく aws:SourceVpce で判定します。",
      pitfalls: ["NotIpAddress と Bool を同じ Condition に入れる → 社外かつ HTTP のときしか拒否されない", "Allow + Principal \"*\" を書く → 許可を持たない人まで許可される", "Resource にバケットの ARN を入れ忘れる → 一覧などバケットの操作が対象外になる"],
    },
    references: [R.bucketEx, R.ops, R.keys], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-trust-009", category: "iam", mode: "write", level: 3, examTags: ["SAP", "SCS"], services: ["iam", "sts"],
    title: "取引先のロールだけが、外部 ID 付きで引き受けられる信頼ポリシー",
    scenario: "取引先(アカウント 444455556666)のロール PartnerSync が、自社のロール PartnerReadRole を引き受けてデータを読みます。混乱した代理(confused deputy)を防ぐため、取り決めた外部 ID pr-7f3k9 を必須にします。PartnerReadRole の信頼ポリシーを書いてください。",
    environment: ["自社アカウント 111122223333 のロール PartnerReadRole", "取引先 444455556666 のロール PartnerSync・PartnerIntern(どちらも sts:AssumeRole の許可を持つ)", "外部 ID: pr-7f3k9"],
    requirements: ["PartnerSync が外部 ID pr-7f3k9 付きで引き受けられる", "外部 ID が無い・違う場合は引き受けられない", "同じ取引先アカウントでも PartnerIntern は引き受けられない", "自社のユーザー(alice)も引き受けられない"],
    editor: { language: "json", policyKind: "trust", policyName: "PartnerReadRole の信頼ポリシー", account: ACCOUNT, starter: EMPTY },
    envPolicies: [
      { kind: "identity", name: "PartnerSyncAssume", account: PARTNER, to: ["role:PartnerSync", "role:PartnerIntern"], doc: { Version: V, Statement: [{ Effect: "Allow", Action: "sts:AssumeRole", Resource: "arn:aws:iam::111122223333:role/PartnerReadRole" }] } },
    ],
    tests: [
      { label: "PartnerSync が外部 ID pr-7f3k9 で引き受ける", principal: prole("PartnerSync"), action: "sts:AssumeRole", resource: "arn:aws:iam::111122223333:role/PartnerReadRole", resourceAccount: ACCOUNT, context: { "sts:ExternalId": "pr-7f3k9" }, expect: "allow" },
      { label: "PartnerSync が外部 ID なしで引き受ける", principal: prole("PartnerSync"), action: "sts:AssumeRole", resource: "arn:aws:iam::111122223333:role/PartnerReadRole", resourceAccount: ACCOUNT, expect: "deny" },
      { label: "PartnerSync が違う外部 ID で引き受ける", principal: prole("PartnerSync"), action: "sts:AssumeRole", resource: "arn:aws:iam::111122223333:role/PartnerReadRole", resourceAccount: ACCOUNT, context: { "sts:ExternalId": "guess-123" }, expect: "deny" },
      { label: "PartnerIntern が正しい外部 ID で引き受ける", principal: prole("PartnerIntern"), action: "sts:AssumeRole", resource: "arn:aws:iam::111122223333:role/PartnerReadRole", resourceAccount: ACCOUNT, context: { "sts:ExternalId": "pr-7f3k9" }, expect: "deny" },
      { label: "自社の alice が引き受ける", principal: alice, action: "sts:AssumeRole", resource: "arn:aws:iam::111122223333:role/PartnerReadRole", resourceAccount: ACCOUNT, context: { "sts:ExternalId": "pr-7f3k9" }, expect: "deny" },
    ],
    hints: ["信頼ポリシーは Principal(誰が)と Action(sts:AssumeRole)を書き、Resource は書きません。", "アカウント全体(444455556666 や :root)ではなく、ロールの ARN を Principal に指定します。", "外部 ID は条件キー sts:ExternalId で、StringEquals を使って確認します。"],
    model: j({ Version: V, Statement: [{ Sid: "AllowPartnerSyncWithExternalId", Effect: "Allow", Principal: { AWS: "arn:aws:iam::444455556666:role/PartnerSync" }, Action: "sts:AssumeRole", Condition: { StringEquals: { "sts:ExternalId": "pr-7f3k9" } } }] }),
    explain: {
      point: "別アカウントからロールを引き受けるには、①相手側の主体に sts:AssumeRole を許可するアイデンティティベースのポリシーと、②こちらのロールの信頼ポリシーの両方が必要です。Principal にロールの ARN を書けばそのロールだけが対象になり、外部 ID の条件で取り決めた値を持つ要求だけに絞れます。",
      compare: "Principal を \"444455556666\"(:root)にすると、相手アカウント側で sts:AssumeRole を許可されたすべての主体が対象になります(PartnerIntern も引き受けられる)。外部 ID は秘密の値ではなく、第三者サービスが顧客ごとに区別するための識別子です。",
      pitfalls: ["Principal をアカウント ID にする → アカウント内の誰でも対象になりうる", "信頼ポリシーに Resource を書く → 構文上のエラー", "Condition に StringLike と * を使う → 外部 ID の意味がなくなる"],
    },
    references: [R.trust, R.cross, R.keys], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-scp-010", category: "iam", mode: "read", level: 4, examTags: ["SAP", "SCS"], services: ["orgs", "iam", "ec2"],
    title: "リージョン制限の SCP で、管理者でもできないことは?",
    scenario: "メンバーアカウント 111122223333 に次の SCP が付いています(既定の FullAWSAccess も付いています)。ロール AdminRole には AdministratorAccess(すべて許可)が付いています。AdminRole が実行できる操作をすべて選んでください。",
    environment: ["SCP: FullAWSAccess(Allow */*)と、下のリージョン制限", "ロール AdminRole: AdministratorAccess", "IAM などのグローバルサービスは us-east-1 などのエンドポイントで処理される"],
    code: j({ Version: V, Statement: [{ Sid: "DenyOutsideApprovedRegions", Effect: "Deny", NotAction: ["iam:*", "organizations:*", "sts:*", "support:*", "cloudfront:*", "route53:*"], Resource: "*", Condition: { StringNotEquals: { "aws:RequestedRegion": ["ap-northeast-1", "us-east-1"] } } }] }),
    codeKind: "scp", codeAccounts: [ACCOUNT],
    envPolicies: [
      { kind: "scp", name: "FullAWSAccess", accounts: [ACCOUNT], doc: { Version: V, Statement: [{ Effect: "Allow", Action: "*", Resource: "*" }] } },
      { kind: "identity", name: "AdministratorAccess", to: ["role:AdminRole"], doc: { Version: V, Statement: [{ Effect: "Allow", Action: "*", Resource: "*" }] } },
    ],
    multi: true,
    choices: [
      { text: "ap-northeast-1 で ec2:RunInstances", correct: true, why: "許可されたリージョンなので Deny の条件(StringNotEquals)が成り立たない。" },
      { text: "eu-west-1 で ec2:RunInstances", correct: false, why: "eu-west-1 は一覧に無く、Deny が一致する。管理者でも SCP の明示的な Deny は超えられない。" },
      { text: "eu-west-1 を指定した iam:CreateUser", correct: true, why: "NotAction に iam:* があるため、IAM の操作はこの Deny の対象外。" },
      { text: "ap-northeast-1 で s3:DeleteBucket(SCP があるので管理者でも拒否)", correct: false, why: "SCP は許可の上限を決めるだけ。許可されたリージョンなら、Admin の Allow で実行できる。" },
    ],
    tests: [
      { label: "ap-northeast-1 で RunInstances", principal: role("AdminRole"), action: "ec2:RunInstances", resource: `arn:aws:ec2:ap-northeast-1:${ACCOUNT}:instance/*`, context: { "aws:RequestedRegion": "ap-northeast-1" }, expect: "allow" },
      { label: "eu-west-1 で RunInstances", principal: role("AdminRole"), action: "ec2:RunInstances", resource: `arn:aws:ec2:eu-west-1:${ACCOUNT}:instance/*`, context: { "aws:RequestedRegion": "eu-west-1" }, expect: "explicit-deny" },
      { label: "eu-west-1 を指定した iam:CreateUser", principal: role("AdminRole"), action: "iam:CreateUser", resource: `arn:aws:iam::${ACCOUNT}:user/new-user`, context: { "aws:RequestedRegion": "eu-west-1" }, expect: "allow" },
      { label: "ap-northeast-1 で s3:DeleteBucket", principal: role("AdminRole"), action: "s3:DeleteBucket", resource: bkt("old-bucket"), context: { "aws:RequestedRegion": "ap-northeast-1" }, expect: "allow" },
    ],
    hints: ["Deny + NotAction は「列挙した以外のすべての操作」を拒否の対象にします。", "StringNotEquals は、リクエストのリージョンが一覧のどれとも等しくないときに成り立ちます。"],
    explain: {
      point: "SCP はアカウント内の主体(ルートユーザーを含む)が使える権限の上限です。明示的な Deny は、アカウント内の管理者の Allow でも上書きできません。NotAction で IAM などのグローバルサービスを除外しないと、us-east-1 で処理されるグローバルサービスまで止めてしまうおそれがあります。",
      compare: "SCP 自体は権限を付与しません。許可するには、アカウント内で IAM ポリシーの Allow が必要です。AWS Control Tower のリージョン拒否のコントロールも、同じ考え方の SCP を使います。",
      pitfalls: ["SCP があれば管理者でも何もできない、と考える", "NotAction を「列挙したものだけを拒否」と読み違える"],
    },
    references: [R.scp, R.logic, R.keys], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-boundary-011", category: "iam", mode: "fix", level: 4, examTags: ["SAP", "SCS", "DOP"], services: ["iam", "dynamodb", "s3"],
    title: "【障害対応】アクセス許可の境界で DynamoDB が拒否される",
    scenario: "開発者のロール Developer には s3:* と dynamodb:* を許可するポリシーが付いていますが、アクセス許可の境界 DeveloperBoundary で範囲を絞っています。開発者から「dev-orders テーブルに書き込めない」と報告がありました。境界を直して、dev-orders テーブルの読み書き(GetItem・PutItem・Query)だけを追加してください。",
    environment: ["ロール Developer のアイデンティティベースのポリシー: Allow s3:* と dynamodb:*(Resource *)", "アクセス許可の境界 DeveloperBoundary(右のエディター)", "テーブル: dev-orders(開発)、prod-orders(本番)"],
    requirements: ["dev-orders の GetItem・PutItem・Query を許可", "prod-orders には何もできない", "dev-orders でもテーブルの削除(DeleteTable)などはできない", "S3 は従来どおり dev-bucket の読み書きだけ(削除は不可)"],
    editor: { language: "json", policyKind: "boundary", policyName: "DeveloperBoundary", attachTo: ["role:Developer"], starter: j({ Version: V, Statement: [{ Sid: "DevBucketReadWrite", Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: "arn:aws:s3:::dev-bucket/*" }] }) },
    envPolicies: [{ kind: "identity", name: "DeveloperPowerUser", to: ["role:Developer"], doc: { Version: V, Statement: [{ Effect: "Allow", Action: ["s3:*", "dynamodb:*"], Resource: "*" }] } }],
    tests: (() => {
      const t = (n) => `arn:aws:dynamodb:ap-northeast-1:${ACCOUNT}:table/${n}`;
      const dev = role("Developer");
      return [
        { label: "dev-orders に PutItem", principal: dev, action: "dynamodb:PutItem", resource: t("dev-orders"), expect: "allow" },
        { label: "dev-orders に GetItem", principal: dev, action: "dynamodb:GetItem", resource: t("dev-orders"), expect: "allow" },
        { label: "dev-orders に Query", principal: dev, action: "dynamodb:Query", resource: t("dev-orders"), expect: "allow" },
        { label: "prod-orders に PutItem", principal: dev, action: "dynamodb:PutItem", resource: t("prod-orders"), expect: "deny" },
        { label: "dev-orders を DeleteTable", principal: dev, action: "dynamodb:DeleteTable", resource: t("dev-orders"), expect: "deny" },
        { label: "dev-bucket に PutObject", principal: dev, action: "s3:PutObject", resource: obj("dev-bucket", "a.json"), expect: "allow" },
        { label: "dev-bucket から DeleteObject", principal: dev, action: "s3:DeleteObject", resource: obj("dev-bucket", "a.json"), expect: "deny" },
      ];
    })(),
    hints: ["実際に使える権限は「アイデンティティベースのポリシー」と「境界」の両方が許可する範囲(共通部分)です。", "境界に dynamodb:* を足すと、Developer のポリシーの dynamodb:* がそのまま有効になってしまいます。", "テーブルの ARN は arn:aws:dynamodb:ap-northeast-1:111122223333:table/dev-orders です。"],
    model: j({ Version: V, Statement: [
      { Sid: "DevBucketReadWrite", Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: "arn:aws:s3:::dev-bucket/*" },
      { Sid: "DevOrdersTable", Effect: "Allow", Action: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"], Resource: "arn:aws:dynamodb:ap-northeast-1:111122223333:table/dev-orders" },
    ] }),
    explain: {
      point: "アクセス許可の境界は、アイデンティティベースのポリシーで付けられる権限の上限です。両方が許可した操作だけが実行できます。Developer 側は dynamodb:* を持っているので、境界に必要な操作だけを足せば、その操作だけが使えるようになります。",
      compare: "Developer のポリシーを直す方法もありますが、開発者が自分でロールのポリシーを変えられる運用では、境界で上限を決めておくのが委任の定石です。SCP は組織(アカウント)単位、境界は IAM エンティティ単位の上限です。",
      pitfalls: ["境界に dynamodb:* や Resource * を足す → 本番テーブルやテーブル削除まで許可される", "境界だけで権限が付くと考える(境界は付与しない)"],
    },
    references: [R.boundary, R.logic], reviewedAt: "2026-11-08", contentVersion: 1,
  },
  {
    id: "iam-cross-012", category: "iam", mode: "write", level: 4, examTags: ["SAP", "SCS", "SAA"], services: ["s3", "iam"],
    title: "別アカウントのロールにだけ、レポートの読み取りを許可",
    scenario: "自社(111122223333)のバケット shared-reports の reports/ 配下を、取引先(444455556666)のロール Analyst だけが読めるようにします。取引先側では、Analyst と Intern の両方に shared-reports への GetObject・PutObject が許可されています。自社側のバケットポリシーを書いてください。",
    environment: ["バケット shared-reports(アカウント 111122223333)、プレフィックス reports/・private/", "取引先 444455556666 のロール Analyst・Intern(どちらも shared-reports/* の Get・Put をアイデンティティベースで許可済み)"],
    requirements: ["Analyst は reports/ 配下を読める", "Analyst は private/ 配下を読めない・どこにも書き込めない", "Intern・匿名の利用者は読めない", "必要最小限の許可にする"],
    editor: { language: "json", policyKind: "resource", policyName: "shared-reports のバケットポリシー", account: ACCOUNT, starter: EMPTY },
    envPolicies: [{ kind: "identity", name: "PartnerReportsAccess", account: PARTNER, to: ["role:Analyst", "role:Intern"], doc: { Version: V, Statement: [{ Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject"], Resource: "arn:aws:s3:::shared-reports/*" }] } }],
    tests: [
      { label: "Analyst が reports/2026-10.csv を読む", principal: prole("Analyst"), action: "s3:GetObject", resource: obj("shared-reports", "reports/2026-10.csv"), resourceAccount: ACCOUNT, expect: "allow" },
      { label: "Analyst が private/salary.csv を読む", principal: prole("Analyst"), action: "s3:GetObject", resource: obj("shared-reports", "private/salary.csv"), resourceAccount: ACCOUNT, expect: "deny" },
      { label: "Analyst が reports/x.csv に書く", principal: prole("Analyst"), action: "s3:PutObject", resource: obj("shared-reports", "reports/x.csv"), resourceAccount: ACCOUNT, expect: "deny" },
      { label: "Intern が reports/2026-10.csv を読む", principal: prole("Intern"), action: "s3:GetObject", resource: obj("shared-reports", "reports/2026-10.csv"), resourceAccount: ACCOUNT, expect: "deny" },
      { label: "匿名の利用者が reports/2026-10.csv を読む", principal: { kind: "anonymous" }, action: "s3:GetObject", resource: obj("shared-reports", "reports/2026-10.csv"), resourceAccount: ACCOUNT, expect: "deny" },
    ],
    hints: ["別アカウントの主体には、相手側のアイデンティティベースのポリシーと、こちらのリソースベースのポリシーの両方の許可が必要です。", "Principal には {\"AWS\": \"ロールの ARN\"} を書きます。", "Resource を arn:aws:s3:::shared-reports/reports/* に絞ります。"],
    model: j({ Version: V, Statement: [{ Sid: "AllowPartnerAnalystReadReports", Effect: "Allow", Principal: { AWS: "arn:aws:iam::444455556666:role/Analyst" }, Action: "s3:GetObject", Resource: "arn:aws:s3:::shared-reports/reports/*" }] }),
    explain: {
      point: "クロスアカウントのアクセスは、主体側(取引先)のアイデンティティベースのポリシーと、リソース側(自社)のバケットポリシーの両方が許可した操作だけが成功します。取引先側で広く許可されていても、自社のバケットポリシーで Analyst と reports/ と GetObject に絞れば、それ以上は使えません。",
      compare: "Principal を取引先のアカウント全体にすると、取引先の管理者が付けた権限次第で誰でも読めるようになります。大量のアカウントに共有するなら、Principal \"*\" と aws:PrincipalOrgID の条件(組織内だけ)を組み合わせる方法もあります。KMS で暗号化している場合はキーポリシーの許可も必要です。",
      pitfalls: ["Principal \"*\" で許可する → 匿名の利用者にも公開される(ブロックパブリックアクセスが無効な場合)", "Action に s3:* を書く → 取引先側の Put も通る", "相手側の IAM だけを設定すればよいと考える"],
    },
    references: [R.cross, R.bucketEx, R.logic], reviewedAt: "2026-11-08", contentVersion: 1,
  },
];
