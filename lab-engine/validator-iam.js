// コマンド・ポリシー演習: IAM ポリシーの構造チェック(JSON 構文の次の段階)。
// ポリシーの種類ごとに使える要素が違う: identity(IAM ユーザー・ロールに付ける)/ resource(S3 バケットポリシーなど)/
// trust(ロールの信頼ポリシー)/ scp(Organizations のサービスコントロールポリシー)/ boundary(アクセス許可の境界)。
// 結果の issues: level = "error"(設定として成り立たない)/ "warning"(要件に合わない可能性)/ "security"(想定外の許可)
import { parseJson } from "./json.js";

export const POLICY_KINDS = {
  identity: "アイデンティティベースのポリシー",
  resource: "リソースベースのポリシー",
  trust: "ロールの信頼ポリシー",
  scp: "サービスコントロールポリシー(SCP)",
  boundary: "アクセス許可の境界",
};

// この学習環境で意味を確認できるアクション(サービスプレフィックス → アクション名)。綴りの確認と補完候補に使う。
export const KNOWN_ACTIONS = {
  s3: ["GetObject", "PutObject", "DeleteObject", "ListBucket", "ListAllMyBuckets", "GetBucketLocation", "GetObjectVersion", "DeleteObjectVersion", "ListBucketVersions", "GetObjectTagging", "PutObjectTagging", "PutObjectAcl", "GetObjectAcl", "AbortMultipartUpload", "ListMultipartUploadParts", "GetBucketPolicy", "PutBucketPolicy", "DeleteBucketPolicy", "CreateBucket", "DeleteBucket", "GetBucketVersioning", "PutBucketVersioning", "GetEncryptionConfiguration", "PutEncryptionConfiguration", "PutLifecycleConfiguration", "GetLifecycleConfiguration", "PutBucketPublicAccessBlock", "GetBucketPublicAccessBlock", "ReplicateObject", "RestoreObject"],
  ec2: ["DescribeInstances", "StartInstances", "StopInstances", "RebootInstances", "TerminateInstances", "RunInstances", "DescribeVpcs", "DescribeSubnets", "DescribeSecurityGroups", "AuthorizeSecurityGroupIngress", "RevokeSecurityGroupIngress", "CreateTags", "DeleteTags", "DescribeImages", "DescribeVolumes", "CreateSnapshot", "DescribeRegions", "DescribeAvailabilityZones"],
  dynamodb: ["GetItem", "PutItem", "UpdateItem", "DeleteItem", "Query", "Scan", "BatchGetItem", "BatchWriteItem", "DescribeTable", "ListTables", "CreateTable", "DeleteTable", "ConditionCheckItem"],
  sts: ["AssumeRole", "AssumeRoleWithWebIdentity", "AssumeRoleWithSAML", "GetCallerIdentity", "TagSession", "SetSourceIdentity", "GetSessionToken"],
  iam: ["PassRole", "GetRole", "CreateRole", "DeleteRole", "AttachRolePolicy", "DetachRolePolicy", "PutRolePolicy", "ListRoles", "ListAttachedRolePolicies", "CreateUser", "DeleteUser", "ListUsers", "GetUser", "CreateAccessKey", "ChangePassword", "CreatePolicy", "SimulatePrincipalPolicy"],
  kms: ["Encrypt", "Decrypt", "GenerateDataKey", "GenerateDataKeyWithoutPlaintext", "ReEncryptFrom", "ReEncryptTo", "DescribeKey", "CreateGrant", "ScheduleKeyDeletion", "DisableKey", "PutKeyPolicy", "ListKeys"],
  lambda: ["InvokeFunction", "GetFunction", "ListFunctions", "CreateFunction", "UpdateFunctionCode", "UpdateFunctionConfiguration", "DeleteFunction", "AddPermission"],
  logs: ["CreateLogGroup", "CreateLogStream", "PutLogEvents", "DescribeLogGroups", "DescribeLogStreams", "FilterLogEvents", "GetLogEvents", "DeleteLogGroup", "PutRetentionPolicy"],
  cloudwatch: ["PutMetricData", "GetMetricData", "GetMetricStatistics", "ListMetrics", "DescribeAlarms", "PutMetricAlarm", "DeleteAlarms", "SetAlarmState"],
  sqs: ["SendMessage", "ReceiveMessage", "DeleteMessage", "GetQueueAttributes", "GetQueueUrl", "ChangeMessageVisibility", "PurgeQueue", "ListQueues"],
  sns: ["Publish", "Subscribe", "CreateTopic", "ListTopics", "GetTopicAttributes"],
  "execute-api": ["Invoke", "ManageConnections"],
  cloudtrail: ["StopLogging", "StartLogging", "DeleteTrail", "UpdateTrail", "CreateTrail", "LookupEvents", "DescribeTrails", "PutEventSelectors"],
  organizations: ["LeaveOrganization", "DescribeOrganization", "ListAccounts"],
  secretsmanager: ["GetSecretValue", "DescribeSecret", "PutSecretValue", "RotateSecret", "ListSecrets"],
  ssm: ["GetParameter", "GetParameters", "PutParameter", "StartSession", "SendCommand"],
  config: ["StopConfigurationRecorder", "DeleteConfigurationRecorder", "DescribeConfigRules"],
  guardduty: ["DeleteDetector", "DisassociateFromMasterAccount", "UpdateDetector"],
};
const KNOWN_LOWER = Object.fromEntries(Object.entries(KNOWN_ACTIONS).map(([s, a]) => [s, new Map(a.map((x) => [x.toLowerCase(), x]))]));

export const CONDITION_OPERATORS = [
  "StringEquals", "StringNotEquals", "StringEqualsIgnoreCase", "StringNotEqualsIgnoreCase", "StringLike", "StringNotLike",
  "NumericEquals", "NumericNotEquals", "NumericLessThan", "NumericLessThanEquals", "NumericGreaterThan", "NumericGreaterThanEquals",
  "DateEquals", "DateNotEquals", "DateLessThan", "DateLessThanEquals", "DateGreaterThan", "DateGreaterThanEquals",
  "Bool", "IpAddress", "NotIpAddress", "ArnEquals", "ArnLike", "ArnNotEquals", "ArnNotLike", "Null",
];
const STATEMENT_KEYS = ["Sid", "Effect", "Action", "NotAction", "Resource", "NotResource", "Principal", "NotPrincipal", "Condition"];

const arr = (v) => (Array.isArray(v) ? v : [v]);
/** 条件演算子名を分解: ForAnyValue:StringLike → { set: "ForAnyValue", base: "StringLike", ifExists: false } */
export function splitOperator(op) {
  let set = null, base = op, ifExists = false;
  const m = /^(ForAnyValue|ForAllValues):(.+)$/.exec(op);
  if (m) { set = m[1]; base = m[2]; }
  if (base.endsWith("IfExists") && base !== "IfExists") { ifExists = true; base = base.slice(0, -8); }
  return { set, base, ifExists, known: CONDITION_OPERATORS.includes(base) };
}

/**
 * ソース文字列を検証する。戻り値: { ok, syntax, doc, issues }
 * syntax: JSON 構文エラー({ message, line, col, hint })。構文が正しい場合は null。
 */
export function validatePolicy(src, kind = "identity") {
  let parsed;
  try { parsed = parseJson(src); }
  catch (e) {
    if (e.line) return { ok: false, syntax: { message: e.message, line: e.line, col: e.col, hint: e.hint }, doc: null, issues: [] };
    throw e;
  }
  const doc = parsed.value;
  const issues = [];
  const add = (level, msg, where = "") => issues.push({ level, msg, where });
  parsed.dupKeys.forEach((d) => add("warning", `キー「${d.key}」が同じオブジェクトに 2 回書かれています(後の値だけが使われます)`, `${d.line} 行`));
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    add("error", "ポリシーの最上位は { } のオブジェクトにします");
    return { ok: false, syntax: null, doc, issues };
  }
  for (const k of Object.keys(doc)) if (!["Version", "Id", "Statement"].includes(k)) add("error", `最上位に「${k}」は書けません(使えるのは Version・Id・Statement)`, k);
  if (doc.Version === undefined) add("warning", "Version がありません。\"2012-10-17\" を指定しないと ${aws:username} などのポリシー変数が使えません", "Version");
  else if (doc.Version === "2008-10-17") add("warning", "Version \"2008-10-17\" は古い版です。ポリシー変数を使うには \"2012-10-17\" にします", "Version");
  else if (doc.Version !== "2012-10-17") add("error", `Version は日付の文字列 "2012-10-17" にします(「${String(doc.Version)}」はポリシーの言語の版として無効です)`, "Version");
  if (doc.Statement === undefined) { add("error", "Statement がありません", "Statement"); return { ok: false, syntax: null, doc, issues }; }
  const stmts = arr(doc.Statement);
  if (!stmts.length) add("error", "Statement が空です。少なくとも 1 つのステートメントが必要です", "Statement");
  const sids = new Set();
  stmts.forEach((st, i) => {
    const at = st && st.Sid ? `Statement「${st.Sid}」` : `Statement[${i}]`;
    if (!st || typeof st !== "object" || Array.isArray(st)) { add("error", `${at} はオブジェクト { } にします`, at); return; }
    for (const k of Object.keys(st)) if (!STATEMENT_KEYS.includes(k)) add("error", `「${k}」はステートメントの要素ではありません${/^(effect|action|resource|principal|condition|sid)$/i.test(k) ? "(大文字・小文字を区別します)" : ""}`, at);
    if (st.Sid !== undefined) {
      if (typeof st.Sid !== "string" || !/^[A-Za-z0-9]*$/.test(st.Sid)) add(kind === "identity" ? "warning" : "warning", "Sid は英数字だけにします", at);
      if (sids.has(st.Sid)) add("error", `Sid「${st.Sid}」が重複しています`, at);
      sids.add(st.Sid);
    }
    if (st.Effect === undefined) add("error", `${at}: Effect(Allow / Deny)がありません`, at);
    else if (st.Effect !== "Allow" && st.Effect !== "Deny") add("error", `${at}: Effect は "Allow" か "Deny" です(「${st.Effect}」は無効。大文字・小文字も区別します)`, at);
    // 排他の要素
    if ("Action" in st && "NotAction" in st) add("error", `${at}: Action と NotAction は同時に書けません`, at);
    if (!("Action" in st) && !("NotAction" in st)) add("error", `${at}: Action(または NotAction)がありません`, at);
    if ("Resource" in st && "NotResource" in st) add("error", `${at}: Resource と NotResource は同時に書けません`, at);
    if ("Principal" in st && "NotPrincipal" in st) add("error", `${at}: Principal と NotPrincipal は同時に書けません`, at);
    const hasRes = "Resource" in st || "NotResource" in st;
    const hasPr = "Principal" in st || "NotPrincipal" in st;
    if (kind === "trust") {
      if (hasRes) add("error", `${at}: 信頼ポリシーに Resource は書けません(対象はそのロール自身です)`, at);
      if (!hasPr) add("error", `${at}: 信頼ポリシーには Principal(ロールを引き受けられる主体)が必要です`, at);
    } else if (kind === "resource") {
      if (!hasPr) add("error", `${at}: リソースベースのポリシーには Principal が必要です`, at);
      if (!hasRes) add("error", `${at}: Resource がありません`, at);
    } else {
      if (hasPr) add("error", `${at}: ${POLICY_KINDS[kind]}に Principal は書けません(付け先のユーザー・ロールが主体になります)`, at);
      if (!hasRes) add("error", `${at}: Resource がありません`, at);
    }
    // Action の形式
    for (const key of ["Action", "NotAction"]) if (key in st) {
      const list = arr(st[key]);
      if (!list.length) add("error", `${at}: ${key} が空です`, at);
      for (const a of list) {
        if (typeof a !== "string") { add("error", `${at}: ${key} の値は文字列にします`, at); continue; }
        if (a === "*") continue;
        // アクション名は大文字・小文字を区別しない(サービスのプレフィックスも同様)
        const m = /^([A-Za-z0-9-]+):([A-Za-z0-9*?]+)$/.exec(a);
        if (!m) { add("error", `${at}: アクション「${a}」の形式が正しくありません(例: "s3:GetObject")`, at); continue; }
        const svc = m[1].toLowerCase(), name = m[2];
        if (!KNOWN_LOWER[svc]) add("warning", `${at}: サービス「${svc}」はこの学習環境の対応範囲外です(綴りも確認してください)`, at);
        else if (!/[*?]/.test(name) && !KNOWN_LOWER[svc].has(name.toLowerCase())) {
          const near = [...KNOWN_LOWER[svc].values()].find((x) => x.toLowerCase().startsWith(name.toLowerCase().slice(0, 5)));
          add("warning", `${at}: 「${a}」はこの学習環境で知られていないアクションです${near ? `(「${svc}:${near}」の誤り?)` : ""}`, at);
        }
      }
    }
    for (const key of ["Resource", "NotResource"]) if (key in st) {
      const list = arr(st[key]);
      if (!list.length) add("error", `${at}: ${key} が空です`, at);
      for (const r of list) {
        if (typeof r !== "string") { add("error", `${at}: ${key} の値は文字列にします`, at); continue; }
        if (r !== "*" && !/^arn:[a-z*-]+:[a-z0-9*-]+:[a-z0-9*-]*:(\d{12}|\*)?:.+$/.test(r)) add("error", `${at}: 「${r}」は ARN の形式ではありません(例: arn:aws:s3:::my-bucket/*)`, at);
      }
    }
    // S3 のアクションと ARN の組み合わせ(よくある誤り)
    if ("Action" in st && "Resource" in st) {
      const acts = arr(st.Action).filter((x) => typeof x === "string").map((x) => x.toLowerCase());
      const res = arr(st.Resource).filter((x) => typeof x === "string");
      const s3Res = res.filter((r) => r.startsWith("arn:aws:s3:::"));
      const objActs = acts.filter((a) => /^s3:(get|put|delete)object|^s3:abortmultipart/.test(a));
      if (objActs.length && s3Res.length && s3Res.every((r) => !r.slice(13).includes("/"))) add("warning", `${at}: オブジェクトの操作(${objActs.join(", ")})にはオブジェクトの ARN(例: arn:aws:s3:::bucket/*)が必要です。バケットの ARN だけでは一致しません`, at);
      if (acts.includes("s3:listbucket") && s3Res.length && s3Res.every((r) => r.slice(13).includes("/"))) add("warning", `${at}: s3:ListBucket はバケットの ARN(arn:aws:s3:::bucket)に対する操作です。オブジェクトの ARN では一致しません。一覧の範囲は Condition の s3:prefix で絞ります`, at);
    }
    // Principal の形式
    for (const key of ["Principal", "NotPrincipal"]) if (key in st) {
      const p = st[key];
      if (p !== "*" && (typeof p !== "object" || Array.isArray(p) || p === null)) add("error", `${at}: ${key} は "*" か {"AWS": ...} / {"Service": ...} の形にします`, at);
      else if (p !== "*") for (const k of Object.keys(p)) if (!["AWS", "Service", "Federated", "CanonicalUser"].includes(k)) add("error", `${at}: ${key} の種類「${k}」は無効です(AWS / Service / Federated / CanonicalUser)`, at);
    }
    // Condition
    if ("Condition" in st) {
      const c = st.Condition;
      if (!c || typeof c !== "object" || Array.isArray(c)) add("error", `${at}: Condition は { "演算子": { "条件キー": 値 } } の形にします`, at);
      else for (const [op, block] of Object.entries(c)) {
        const o = splitOperator(op);
        if (!o.known) add("error", `${at}: 条件演算子「${op}」はこの学習環境では使えないか、綴りが誤っています`, at);
        if (!block || typeof block !== "object" || Array.isArray(block)) add("error", `${at}: 「${op}」の中は { "条件キー": 値 } にします`, at);
      }
    }
    // セキュリティ警告(構文は正しくても許可が広すぎる)
    if (st.Effect === "Allow") {
      const acts = "Action" in st ? arr(st.Action) : [];
      if (acts.includes("*")) add("security", `${at}: Action "*" はすべての操作を許可します`, at);
      else { const wild = acts.filter((a) => typeof a === "string" && /^[a-z0-9-]+:\*$/.test(a)); if (wild.length) add("security", `${at}: ${wild.join(", ")} はそのサービスの全操作(削除や設定変更を含む)を許可します`, at); }
      if ("NotAction" in st) add("security", `${at}: Allow と NotAction の組み合わせは、列挙した以外の「すべての操作」を許可します`, at);
      if ("NotResource" in st) add("security", `${at}: Allow と NotResource の組み合わせは、列挙した以外の「すべてのリソース」を許可します`, at);
      if (kind !== "trust" && arr(st.Resource ?? []).includes("*") && acts.some((a) => typeof a === "string" && /^(s3|dynamodb|kms|secretsmanager):/.test(a) && !/list|describe/i.test(a))) add("security", `${at}: Resource "*" はアカウント内のすべての対象(他人のデータを含む)に適用されます`, at);
      if ((kind === "resource" || kind === "trust") && (st.Principal === "*" || arr(st.Principal?.AWS ?? []).includes("*")) && !st.Condition) add("security", `${at}: Principal "*" を条件なしで許可すると、誰でも(他のアカウントや匿名の利用者も)対象になります`, at);
    }
  });
  return { ok: !issues.some((x) => x.level === "error"), syntax: null, doc, issues };
}

export { arr };
