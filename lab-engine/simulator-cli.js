// コマンド・ポリシー演習: AWS CLI の模擬実行。事前に定義した仮想リソース(環境)に対して、対応したコマンドだけを実行する。
// 実際の AWS とは通信しない。各操作は IAM の模擬評価(simulator-iam.js)を通し、拒否されれば CLI と同じ形のエラーを返す。
import { parseCommand, shorthand, jmes, CliError } from "./parser-cli.js";
import { evaluate } from "./simulator-iam.js";

// 操作ごとのオプション定義。params の型: value / flag / list / int
export const COMMANDS = {
  sts: { "get-caller-identity": { params: {}, api: "GetCallerIdentity" } },
  s3: {
    ls: { positional: ["[s3://bucket/prefix]"], params: { recursive: "flag", "human-readable": "flag", summarize: "flag" }, api: "ListObjectsV2" },
    cp: { positional: ["<src>", "<dst>"], params: { sse: "value", "sse-kms-key-id": "value", "content-type": "value", recursive: "flag", acl: "value" }, api: "PutObject" },
    rm: { positional: ["<s3://bucket/key>"], params: { recursive: "flag" }, api: "DeleteObject" },
  },
  s3api: {
    "list-objects-v2": { params: { bucket: "value", prefix: "value", delimiter: "value", "max-items": "int", "start-after": "value" }, required: ["bucket"], api: "ListObjectsV2", example: { bucket: "my-bucket", prefix: "users/alice/" } },
    "get-bucket-versioning": { params: { bucket: "value" }, required: ["bucket"], api: "GetBucketVersioning" },
    "put-bucket-versioning": { params: { bucket: "value", "versioning-configuration": "value" }, required: ["bucket", "versioning-configuration"], api: "PutBucketVersioning", example: { "versioning-configuration": "Status=Enabled" } },
    "head-object": { params: { bucket: "value", key: "value" }, required: ["bucket", "key"], api: "HeadObject" },
    "get-bucket-policy": { params: { bucket: "value" }, required: ["bucket"], api: "GetBucketPolicy" },
  },
  ec2: {
    "describe-instances": { params: { "instance-ids": "list", filters: "list", "max-items": "int" }, api: "DescribeInstances", example: { filters: "Name=instance-state-name,Values=running" } },
    "stop-instances": { params: { "instance-ids": "list", "dry-run": "flag", "no-dry-run": "flag", force: "flag" }, required: ["instance-ids"], api: "StopInstances", example: { "instance-ids": "i-0123456789abcdef0" } },
    "start-instances": { params: { "instance-ids": "list", "dry-run": "flag", "no-dry-run": "flag" }, required: ["instance-ids"], api: "StartInstances" },
    "describe-vpcs": { params: { "vpc-ids": "list", filters: "list" }, api: "DescribeVpcs" },
    "describe-subnets": { params: { "subnet-ids": "list", filters: "list" }, api: "DescribeSubnets", example: { filters: "Name=vpc-id,Values=vpc-0abc" } },
    "describe-security-groups": { params: { "group-ids": "list", filters: "list" }, api: "DescribeSecurityGroups" },
  },
  cloudwatch: {
    "describe-alarms": { params: { "alarm-names": "list", "state-value": "value", "alarm-name-prefix": "value" }, api: "DescribeAlarms", example: { "state-value": "ALARM" } },
    "get-metric-statistics": { params: { namespace: "value", "metric-name": "value", dimensions: "list", "start-time": "value", "end-time": "value", period: "int", statistics: "list", unit: "value" }, required: ["namespace", "metric-name", "start-time", "end-time", "period"], api: "GetMetricStatistics", example: { dimensions: "Name=InstanceId,Value=i-0123456789abcdef0", statistics: "Average" } },
  },
  lambda: {
    "list-functions": { params: { "max-items": "int" }, api: "ListFunctions" },
    invoke: { positional: ["<outfile>"], params: { "function-name": "value", payload: "value", "invocation-type": "value", "log-type": "value", qualifier: "value" }, required: ["function-name"], api: "Invoke", example: { "function-name": "order-total", payload: "'{\"price\": 100}'" } },
  },
  logs: {
    "filter-log-events": { params: { "log-group-name": "value", "filter-pattern": "value", "start-time": "int", "end-time": "int", "log-stream-names": "list", limit: "int" }, required: ["log-group-name"], api: "FilterLogEvents", example: { "filter-pattern": "ERROR" } },
  },
};
export const SUPPORTED_COMMANDS = Object.entries(COMMANDS).flatMap(([s, ops]) => Object.keys(ops).map((o) => `aws ${s} ${o}`));

class AwsError extends Error { constructor(code, message, status = 254) { super(message); this.code = code; this.status = status; } }
const clone = (x) => JSON.parse(JSON.stringify(x));
const pad = (n, w) => String(n).padStart(w, " ");
const fmtDate = (iso) => iso.replace("T", " ").replace(/\.\d+Z$|Z$/, "").slice(0, 19);

/** 環境のコピーを作る(実行で状態が変わるため、問題ごとにリセットできるように) */
export function newSession(env) { return { env: clone(env), history: [], local: clone(env.local || { files: {} }) }; }

/** 1 行を実行。戻り値: { status: "ok" | "error" | "usage" | "unsupported", stdout, stderr, exit, call, checks[], changes[] } */
export function runCli(session, line) {
  const env = session.env;
  const rec = { line, status: "ok", stdout: "", stderr: "", exit: 0, call: null, checks: [], changes: [] };
  try {
    const cmd = parseCommand(line, COMMANDS);
    const region = cmd.global.region || env.region;
    const ctx = { env, session, cmd, region, rec, spec: COMMANDS[cmd.service][cmd.op] };
    rec.call = { service: cmd.service, op: cmd.op, opts: cmd.opts, positional: cmd.positional, region, global: cmd.global };
    if (cmd.global.output === "table" || cmd.global.output === "yaml") throw new CliError(`--output ${cmd.global.output} は学習用環境では未対応です`, "--output json(既定)か、--query と組み合わせた --output text を使ってください", "unsupported");
    const result = HANDLERS[`${cmd.service} ${cmd.op}`](ctx);
    if (result && result.text !== undefined) rec.stdout = result.text;
    else if (result) {
      let data = result.data;
      if (cmd.global.query !== undefined) data = jmes(cmd.global.query, data);
      rec.result = data;
      rec.stdout = formatOutput(data, cmd.global.output, cmd.global.query !== undefined);
    }
  } catch (e) {
    if (e instanceof AwsError) { rec.status = "error"; rec.code = e.code; rec.stderr = `An error occurred (${e.code}) when calling the ${COMMANDS[rec.call.service][rec.call.op].api} operation: ${e.message}`; rec.exit = e.status; }
    else if (e instanceof CliError) { rec.status = e.kind === "unsupported" || e.kind === "shell" ? "unsupported" : "usage"; rec.stderr = e.message; rec.hint = e.hint; rec.exit = 252; }
    else throw e;
  }
  session.history.push(rec);
  return rec;
}

function formatOutput(data, output, hasQuery) {
  if (output === "text") {
    if (!hasQuery && data && typeof data === "object") throw new CliError("--output text は --query と組み合わせて使ってください(学習用環境の対応範囲)", "例: --query 'Reservations[].Instances[].InstanceId' --output text", "unsupported");
    const line = (v) => (Array.isArray(v) ? v.map((x) => (x && typeof x === "object" ? JSON.stringify(x) : x === null ? "None" : String(x))).join("\t") : v === null ? "None" : typeof v === "object" ? Object.values(v).join("\t") : String(v));
    if (Array.isArray(data) && data.some(Array.isArray)) return data.map((r) => (Array.isArray(r) ? line(r.flat(Infinity)) : line(r))).join("\n");
    if (Array.isArray(data) && data.some((x) => x && typeof x === "object")) return data.map(line).join("\n");
    return line(data);
  }
  return data === null ? "null" : JSON.stringify(data, null, 4);
}

/* ---------- 権限の確認 ---------- */
function authorize(ctx, action, resource, extra = {}, resourcePolicy = null, resourceAccount = null) {
  const { env } = ctx;
  const policies = [...(env.policies || [])];
  if (resourcePolicy) policies.push({ kind: "resource", name: resourcePolicy.name, doc: resourcePolicy.doc, account: resourceAccount });
  const req = { principal: env.caller, action, resource, resourceAccount: resourceAccount || env.account, context: { "aws:RequestedRegion": ctx.region, "aws:SecureTransport": "true", "aws:SourceIp": env.sourceIp || "203.0.113.10", ...(env.context || {}), ...extra } };
  const r = evaluate(req, policies);
  ctx.rec.checks.push({ action, resource, context: extra, decision: r.decision, reason: r.reason, trace: r.trace });
  if (r.decision === "allow") return;
  if (r.decision === "unsupported") throw new CliError(`この操作の権限は模擬評価の対象外です: ${r.reason}`, "", "unsupported");
  const who = r.principal.arn || r.principal.label;
  const why = r.decision === "explicit-deny" ? (r.matched.find((m) => m.effect === "Deny")?.kind === "scp" ? "with an explicit deny in a service control policy" : r.matched.find((m) => m.effect === "Deny")?.kind === "resource" ? "with an explicit deny in a resource-based policy" : "with an explicit deny in an identity-based policy") : /SCP/.test(r.reason) ? "because no service control policy allows the " + action + " action" : /境界/.test(r.reason) ? "because no permissions boundary allows the " + action + " action" : "because no identity-based policy allows the " + action + " action";
  const code = ctx.cmd.service === "ec2" ? "UnauthorizedOperation" : ctx.cmd.service === "s3" || ctx.cmd.service === "s3api" ? "AccessDenied" : "AccessDeniedException";
  throw new AwsError(code, `User: ${who} is not authorized to perform: ${action} on resource: ${ctx.cmd.service === "ec2" ? resource : `"${resource}"`} ${why}`);
}

/* ---------- S3 ---------- */
function bucketOf(ctx, name) {
  const b = ctx.env.s3?.buckets?.[name];
  if (!b) throw new AwsError("NoSuchBucket", "The specified bucket does not exist");
  return b;
}
function s3url(u) {
  const m = /^s3:\/\/([^/]+)\/?(.*)$/.exec(u || "");
  if (!m) return null;
  return { bucket: m[1], key: m[2] };
}
function bucketPolicy(b, name) { return b.policy ? { name: `${name} のバケットポリシー`, doc: b.policy } : null; }
function listKeys(b, prefix = "", delimiter = null, startAfter = null) {
  const keys = Object.keys(b.objects || {}).filter((k) => k.startsWith(prefix) && (!startAfter || k > startAfter)).sort();
  if (!delimiter) return { contents: keys, prefixes: [] };
  const prefixes = new Set(), contents = [];
  for (const k of keys) {
    const rest = k.slice(prefix.length), i = rest.indexOf(delimiter);
    if (i >= 0) prefixes.add(prefix + rest.slice(0, i + 1)); else contents.push(k);
  }
  return { contents, prefixes: [...prefixes].sort() };
}

const HANDLERS = {
  "sts get-caller-identity"({ env }) {
    const c = env.caller;
    const arn = c.kind === "iam-role" ? `arn:aws:sts::${c.account}:assumed-role/${c.name}/${c.session || "session"}` : `arn:aws:iam::${c.account}:user/${c.name}`;
    const userId = c.kind === "iam-role" ? `AROA${c.name.toUpperCase().replace(/[^A-Z0-9]/g, "")}EXAMPLE:${c.session || "session"}` : `AIDA${c.name.toUpperCase().replace(/[^A-Z0-9]/g, "")}EXAMPLE`;
    return { data: { UserId: userId, Account: c.account, Arn: arn } };
  },
  "s3 ls"(ctx) {
    const { cmd, env } = ctx;
    const target = cmd.positional[0];
    if (!target) {
      authorize(ctx, "s3:ListAllMyBuckets", "arn:aws:s3:::*");
      return { text: Object.entries(env.s3?.buckets || {}).filter(([, b]) => (b.owner || env.account) === env.account).map(([n, b]) => `${fmtDate(b.created)} ${n}`).join("\n") };
    }
    const u = s3url(target);
    if (!u) throw new CliError(`「${target}」は S3 の URI ではありません`, "s3://バケット名/プレフィックス/ の形で指定します");
    const b = bucketOf(ctx, u.bucket);
    const delimiter = cmd.opts.recursive ? null : "/";
    // s3 ls はプレフィックスの末尾が / でないと、その名前で始まるものも表示する
    authorize(ctx, "s3:ListBucket", `arn:aws:s3:::${u.bucket}`, { "s3:prefix": u.key, ...(delimiter ? { "s3:delimiter": "/" } : {}) }, bucketPolicy(b, u.bucket), b.owner);
    const { contents, prefixes } = listKeys(b, u.key, delimiter);
    const base = delimiter ? u.key.slice(0, u.key.lastIndexOf("/") + 1) : "";
    const size = (n) => (cmd.opts["human-readable"] ? (n >= 1024 * 1024 ? `${(n / 1048576).toFixed(1)} MiB` : n >= 1024 ? `${(n / 1024).toFixed(1)} KiB` : `${n} Bytes`) : String(n));
    const lines = [...prefixes.map((p) => `${" ".repeat(27)}PRE ${p.slice(base.length)}`), ...contents.map((k) => `${fmtDate(b.objects[k].modified)} ${pad(size(b.objects[k].size), 10)} ${cmd.opts.recursive ? k : k.slice(base.length)}`)];
    if (cmd.opts.summarize) lines.push("", `Total Objects: ${contents.length}`, `   Total Size: ${size(contents.reduce((a, k) => a + b.objects[k].size, 0))}`);
    return { text: lines.join("\n") };
  },
  "s3 cp"(ctx) {
    const { cmd, env, session } = ctx;
    const [src, dst] = cmd.positional;
    const S = s3url(src), D = s3url(dst);
    if (cmd.opts.recursive) throw new CliError("--recursive の cp は学習用環境では未対応です", "", "unsupported");
    if (S && D) throw new CliError("S3 から S3 へのコピーは学習用環境では未対応です", "", "unsupported");
    if (!S && !D) throw new CliError("cp の送り元か送り先のどちらかを s3:// にします", "例: aws s3 cp report.csv s3://my-bucket/reports/report.csv");
    if (D) {
      const f = session.local.files[src];
      if (!f) throw new CliError(`The user-provided path ${src} does not exist.`, `この環境の手元のファイル: ${Object.keys(session.local.files).join(", ") || "なし"}`);
      const b = bucketOf(ctx, D.bucket);
      const key = !D.key || D.key.endsWith("/") ? D.key + src.split("/").pop() : D.key;
      const extra = {};
      if (cmd.opts.sse) { if (!["AES256", "aws:kms", "aws:kms:dsse"].includes(cmd.opts.sse)) throw new CliError(`--sse の値「${cmd.opts.sse}」は無効です(AES256 / aws:kms)`); extra["s3:x-amz-server-side-encryption"] = cmd.opts.sse; }
      if (cmd.opts["sse-kms-key-id"]) extra["s3:x-amz-server-side-encryption-aws-kms-key-id"] = cmd.opts["sse-kms-key-id"];
      if (cmd.opts.acl) extra["s3:x-amz-acl"] = cmd.opts.acl;
      authorize(ctx, "s3:PutObject", `arn:aws:s3:::${D.bucket}/${key}`, extra, bucketPolicy(b, D.bucket), b.owner);
      const existed = !!b.objects[key];
      b.objects[key] = { size: f.size, modified: env.now || "2026-11-08T06:00:00Z", sse: cmd.opts.sse || b.defaultEncryption || "AES256" };
      ctx.rec.changes.push(`s3://${D.bucket}/${key} を${existed ? "上書き" : "作成"}`);
      return { text: `upload: ./${src} to s3://${D.bucket}/${key}` };
    }
    const b = bucketOf(ctx, S.bucket);
    authorize(ctx, "s3:GetObject", `arn:aws:s3:::${S.bucket}/${S.key}`, {}, bucketPolicy(b, S.bucket), b.owner);
    const o = b.objects[S.key];
    if (!o) throw new AwsError("404", "Not Found", 1);
    const name = dst === "." || dst.endsWith("/") ? (dst === "." ? "" : dst) + S.key.split("/").pop() : dst;
    session.local.files[name] = { size: o.size };
    ctx.rec.changes.push(`手元に ${name} をダウンロード`);
    return { text: `download: s3://${S.bucket}/${S.key} to ./${name}` };
  },
  "s3 rm"(ctx) {
    const { cmd } = ctx;
    const u = s3url(cmd.positional[0]);
    if (!u || !u.key) throw new CliError("削除するオブジェクトを s3://バケット/キー で指定します");
    if (cmd.opts.recursive) throw new CliError("--recursive の rm は学習用環境では未対応です", "", "unsupported");
    const b = bucketOf(ctx, u.bucket);
    authorize(ctx, "s3:DeleteObject", `arn:aws:s3:::${u.bucket}/${u.key}`, {}, bucketPolicy(b, u.bucket), b.owner);
    if (b.objects[u.key]) { delete b.objects[u.key]; ctx.rec.changes.push(`s3://${u.bucket}/${u.key} を削除`); }
    return { text: `delete: s3://${u.bucket}/${u.key}` };
  },
  "s3api list-objects-v2"(ctx) {
    const { cmd } = ctx;
    const o = cmd.opts;
    const b = bucketOf(ctx, o.bucket);
    const extra = {};
    if (o.prefix !== undefined) extra["s3:prefix"] = o.prefix;
    if (o.delimiter !== undefined) extra["s3:delimiter"] = o.delimiter;
    authorize(ctx, "s3:ListBucket", `arn:aws:s3:::${o.bucket}`, extra, bucketPolicy(b, o.bucket), b.owner);
    let { contents, prefixes } = listKeys(b, o.prefix || "", o.delimiter || null, o["start-after"]);
    if (o["max-items"]) contents = contents.slice(0, Number(o["max-items"]));
    const data = {};
    if (contents.length) data.Contents = contents.map((k) => ({ Key: k, LastModified: b.objects[k].modified.replace("Z", "+00:00"), ETag: `"${hash(k)}"`, Size: b.objects[k].size, StorageClass: b.objects[k].storageClass || "STANDARD" }));
    if (prefixes.length) data.CommonPrefixes = prefixes.map((p) => ({ Prefix: p }));
    data.RequestCharged = null;
    data.Prefix = o.prefix || "";
    if (!contents.length && !prefixes.length) delete data.RequestCharged;
    return { data };
  },
  "s3api get-bucket-versioning"(ctx) {
    const b = bucketOf(ctx, ctx.cmd.opts.bucket);
    authorize(ctx, "s3:GetBucketVersioning", `arn:aws:s3:::${ctx.cmd.opts.bucket}`, {}, bucketPolicy(b, ctx.cmd.opts.bucket), b.owner);
    return { data: b.versioning ? { Status: b.versioning } : {} };
  },
  "s3api put-bucket-versioning"(ctx) {
    const { cmd } = ctx;
    const b = bucketOf(ctx, cmd.opts.bucket);
    const conf = shorthand(cmd.opts["versioning-configuration"]);
    if (!["Enabled", "Suspended"].includes(conf.Status)) throw new AwsError("MalformedXML", "The XML you provided was not well-formed or did not validate against our published schema");
    authorize(ctx, "s3:PutBucketVersioning", `arn:aws:s3:::${cmd.opts.bucket}`, {}, bucketPolicy(b, cmd.opts.bucket), b.owner);
    const before = b.versioning || "未設定";
    b.versioning = conf.Status;
    ctx.rec.changes.push(`${cmd.opts.bucket} のバージョニング: ${before} → ${conf.Status}`);
    return { text: "" };
  },
  "s3api head-object"(ctx) {
    const { bucket, key } = ctx.cmd.opts;
    const b = bucketOf(ctx, bucket);
    authorize(ctx, "s3:GetObject", `arn:aws:s3:::${bucket}/${key}`, {}, bucketPolicy(b, bucket), b.owner);
    const o = b.objects[key];
    if (!o) throw new AwsError("404", "Not Found");
    return { data: { AcceptRanges: "bytes", LastModified: new Date(o.modified).toUTCString(), ContentLength: o.size, ETag: `"${hash(key)}"`, ContentType: "binary/octet-stream", ServerSideEncryption: o.sse || "AES256", Metadata: {} } };
  },
  "s3api get-bucket-policy"(ctx) {
    const b = bucketOf(ctx, ctx.cmd.opts.bucket);
    authorize(ctx, "s3:GetBucketPolicy", `arn:aws:s3:::${ctx.cmd.opts.bucket}`, {}, bucketPolicy(b, ctx.cmd.opts.bucket), b.owner);
    if (!b.policy) throw new AwsError("NoSuchBucketPolicy", "The bucket policy does not exist");
    return { data: { Policy: JSON.stringify(b.policy) } };
  },
  /* ---------- EC2 ---------- */
  "ec2 describe-instances"(ctx) {
    const { cmd, env, region } = ctx;
    authorize(ctx, "ec2:DescribeInstances", "*");
    const all = (env.ec2?.instances || []).filter((i) => (i.region || env.region) === region);
    let list = all;
    const ids = cmd.opts["instance-ids"];
    if (ids) {
      for (const id of ids) {
        if (!/^i-[0-9a-f]{8,17}$/.test(id)) throw new AwsError("InvalidInstanceID.Malformed", `Invalid id: "${id}"`);
        if (!all.some((i) => i.InstanceId === id)) throw new AwsError("InvalidInstanceID.NotFound", `The instance ID '${id}' does not exist`);
      }
      list = list.filter((i) => ids.includes(i.InstanceId));
    }
    list = applyFilters(list, cmd.opts.filters, EC2_FILTERS);
    const groups = new Map();
    for (const i of list) { if (!groups.has(i.ReservationId)) groups.set(i.ReservationId, []); groups.get(i.ReservationId).push(i); }
    return { data: { Reservations: [...groups].map(([rid, ins]) => ({ ReservationId: rid, OwnerId: env.account, Groups: [], Instances: ins.map(publicInstance) })) } };
  },
  "ec2 stop-instances"(ctx) { return stateChange(ctx, "stop"); },
  "ec2 start-instances"(ctx) { return stateChange(ctx, "start"); },
  "ec2 describe-vpcs"(ctx) {
    authorize(ctx, "ec2:DescribeVpcs", "*");
    let list = (ctx.env.ec2?.vpcs || []).filter((v) => (v.region || ctx.env.region) === ctx.region);
    if (ctx.cmd.opts["vpc-ids"]) list = idFilter(list, "VpcId", ctx.cmd.opts["vpc-ids"], "InvalidVpcID.NotFound", "vpc ID");
    list = applyFilters(list, ctx.cmd.opts.filters, { "vpc-id": (v) => [v.VpcId], "cidr-block": (v) => [v.CidrBlock], "is-default": (v) => [String(!!v.IsDefault)], state: (v) => [v.State], ...TAG_FILTERS });
    return { data: { Vpcs: list.map(strip) } };
  },
  "ec2 describe-subnets"(ctx) {
    authorize(ctx, "ec2:DescribeSubnets", "*");
    let list = (ctx.env.ec2?.subnets || []).filter((v) => (v.region || ctx.env.region) === ctx.region);
    if (ctx.cmd.opts["subnet-ids"]) list = idFilter(list, "SubnetId", ctx.cmd.opts["subnet-ids"], "InvalidSubnetID.NotFound", "subnet ID");
    list = applyFilters(list, ctx.cmd.opts.filters, { "vpc-id": (v) => [v.VpcId], "subnet-id": (v) => [v.SubnetId], "availability-zone": (v) => [v.AvailabilityZone], "cidr-block": (v) => [v.CidrBlock], "map-public-ip-on-launch": (v) => [String(!!v.MapPublicIpOnLaunch)], ...TAG_FILTERS });
    return { data: { Subnets: list.map(strip) } };
  },
  "ec2 describe-security-groups"(ctx) {
    authorize(ctx, "ec2:DescribeSecurityGroups", "*");
    let list = (ctx.env.ec2?.securityGroups || []).filter((v) => (v.region || ctx.env.region) === ctx.region);
    if (ctx.cmd.opts["group-ids"]) list = idFilter(list, "GroupId", ctx.cmd.opts["group-ids"], "InvalidGroup.NotFound", "security group");
    list = applyFilters(list, ctx.cmd.opts.filters, { "vpc-id": (v) => [v.VpcId], "group-id": (v) => [v.GroupId], "group-name": (v) => [v.GroupName], "ip-permission.from-port": (v) => (v.IpPermissions || []).map((p) => String(p.FromPort)), "ip-permission.cidr": (v) => (v.IpPermissions || []).flatMap((p) => (p.IpRanges || []).map((r) => r.CidrIp)), ...TAG_FILTERS });
    return { data: { SecurityGroups: list.map(strip) } };
  },
  /* ---------- CloudWatch ---------- */
  "cloudwatch describe-alarms"(ctx) {
    const o = ctx.cmd.opts;
    authorize(ctx, "cloudwatch:DescribeAlarms", "*");
    if (o["state-value"] && !["OK", "ALARM", "INSUFFICIENT_DATA"].includes(o["state-value"])) throw new AwsError("ValidationError", `1 validation error detected: Value '${o["state-value"]}' at 'stateValue' failed to satisfy constraint: Member must satisfy enum value set: [INSUFFICIENT_DATA, ALARM, OK]`);
    let list = ctx.env.cloudwatch?.alarms || [];
    if (o["alarm-names"]) list = list.filter((a) => o["alarm-names"].includes(a.AlarmName));
    if (o["alarm-name-prefix"]) list = list.filter((a) => a.AlarmName.startsWith(o["alarm-name-prefix"]));
    if (o["state-value"]) list = list.filter((a) => a.StateValue === o["state-value"]);
    return { data: { MetricAlarms: clone(list), CompositeAlarms: [] } };
  },
  "cloudwatch get-metric-statistics"(ctx) {
    const o = ctx.cmd.opts;
    authorize(ctx, "cloudwatch:GetMetricStatistics", "*");
    if (!o.statistics && !o["extended-statistics"]) throw new AwsError("InvalidParameterCombination", "Must specify either Statistics or ExtendedStatistics, but not both.");
    const bad = o.statistics.filter((s) => !["Average", "Sum", "Minimum", "Maximum", "SampleCount"].includes(s));
    if (bad.length) throw new AwsError("InvalidParameterValue", `The parameter Statistics.member.1 must be a value in the set [ Average, Sum, SampleCount, Maximum, Minimum ]. (「${bad[0]}」)`);
    const period = Number(o.period);
    if (period % 60 !== 0 && ![1, 5, 10, 30].includes(period)) throw new AwsError("InvalidParameterValue", "The parameter Period must be a multiple of 60.");
    const st = Date.parse(o["start-time"]), en = Date.parse(o["end-time"]);
    if (Number.isNaN(st) || Number.isNaN(en)) throw new CliError("--start-time / --end-time は日時(例: 2026-11-08T00:00:00Z)で指定します");
    if (en <= st) throw new AwsError("InvalidParameterValue", "The parameter StartTime must be less than the parameter EndTime.");
    const dims = (o.dimensions || []).map((d) => shorthand(d));
    if (dims.some((d) => !d.Name || d.Value === undefined)) throw new CliError("--dimensions は Name=名前,Value=値 の形で指定します", "例: --dimensions Name=InstanceId,Value=i-0123456789abcdef0");
    const key = `${o.namespace}|${o["metric-name"]}|${dims.map((d) => `${d.Name}=${d.Value}`).sort().join(",")}`;
    const series = ctx.env.cloudwatch?.metrics?.[key] || [];
    const unit = ctx.env.cloudwatch?.units?.[o["metric-name"]] || "None";
    const buckets = new Map();
    for (const p of series) {
      const t = Date.parse(p.t);
      if (t < st || t >= en) continue;
      const b0 = st + Math.floor((t - st) / (period * 1000)) * period * 1000;
      if (!buckets.has(b0)) buckets.set(b0, []);
      buckets.get(b0).push(p.v);
    }
    const dps = [...buckets].sort((a, b) => a[0] - b[0]).map(([t, v]) => {
      const d = { Timestamp: new Date(t).toISOString().replace(".000Z", "+00:00") };
      for (const s of o.statistics) d[s] = s === "Average" ? round(v.reduce((a, b) => a + b, 0) / v.length) : s === "Sum" ? round(v.reduce((a, b) => a + b, 0)) : s === "Minimum" ? Math.min(...v) : s === "Maximum" ? Math.max(...v) : v.length;
      d.Unit = unit;
      return d;
    });
    return { data: { Label: o["metric-name"], Datapoints: dps } };
  },
  /* ---------- Lambda ---------- */
  "lambda list-functions"(ctx) {
    authorize(ctx, "lambda:ListFunctions", "*");
    const fns = Object.entries(ctx.env.lambda?.functions || {}).filter(([, f]) => (f.region || ctx.env.region) === ctx.region);
    return { data: { Functions: fns.map(([n, f]) => ({ FunctionName: n, FunctionArn: `arn:aws:lambda:${ctx.region}:${ctx.env.account}:function:${n}`, Runtime: f.Runtime, Role: f.Role, Handler: f.Handler, CodeSize: f.CodeSize || 1024, Timeout: f.Timeout || 3, MemorySize: f.MemorySize || 128, LastModified: f.LastModified || "2026-11-01T00:00:00.000+0000", PackageType: "Zip", Architectures: [f.Arch || "arm64"] })) } };
  },
  "lambda invoke"(ctx) {
    const { cmd, env, session } = ctx;
    const o = cmd.opts;
    const out = cmd.positional[0];
    if (!out) throw new CliError("aws: error: the following arguments are required: outfile", "応答を書き出すファイル名を最後に指定します(例: response.json)");
    const name = o["function-name"].replace(/^arn:aws:lambda:[^:]+:\d+:function:/, "");
    const f = env.lambda?.functions?.[name];
    const arn = `arn:aws:lambda:${ctx.region}:${env.account}:function:${name}`;
    if (o.payload !== undefined && cmd.global["cli-binary-format"] !== "raw-in-base64-out") {
      // AWS CLI v2 は既定で --payload を base64 として扱う
      const ok = /^[A-Za-z0-9+/]+={0,2}$/.test(o.payload) && o.payload.length % 4 === 0;
      if (!ok) throw new CliError(`Invalid base64: "${o.payload}"`, "AWS CLI v2 は --payload を base64 として扱います。JSON をそのまま渡すには --cli-binary-format raw-in-base64-out を付けます");
    }
    authorize(ctx, "lambda:InvokeFunction", arn);
    if (!f || (f.region || env.region) !== ctx.region) throw new AwsError("ResourceNotFoundException", `Function not found: ${arn}`);
    let payload = o.payload ?? "{}";
    if (o.payload !== undefined && cmd.global["cli-binary-format"] !== "raw-in-base64-out") payload = atob(o.payload);
    let event;
    try { event = JSON.parse(payload); } catch { throw new AwsError("InvalidRequestContentException", "Could not parse request body into json: Could not parse payload into json"); }
    if (o["invocation-type"] === "Event") { ctx.rec.changes.push(`${name} を非同期で呼び出し`); return { data: { StatusCode: 202 } }; }
    if (o["invocation-type"] === "DryRun") return { data: { StatusCode: 204 } };
    const res = runFunction(f, event);
    session.local.files[out] = { size: JSON.stringify(res.body).length, content: JSON.stringify(res.body) };
    ctx.rec.changes.push(`${out} に関数の応答を保存: ${JSON.stringify(res.body)}`);
    ctx.rec.lambdaResponse = res.body;
    return { data: { StatusCode: 200, ...(res.error ? { FunctionError: "Unhandled" } : {}), ExecutedVersion: "$LATEST" } };
  },
  /* ---------- CloudWatch Logs ---------- */
  "logs filter-log-events"(ctx) {
    const o = ctx.cmd.opts;
    const g = ctx.env.logs?.groups?.[o["log-group-name"]];
    authorize(ctx, "logs:FilterLogEvents", `arn:aws:logs:${ctx.region}:${ctx.env.account}:log-group:${o["log-group-name"]}:*`);
    if (!g) throw new AwsError("ResourceNotFoundException", "The specified log group does not exist.");
    let ev = g.events;
    if (o["log-stream-names"]) ev = ev.filter((e) => o["log-stream-names"].includes(e.stream));
    if (o["start-time"]) ev = ev.filter((e) => Date.parse(e.t) >= Number(o["start-time"]));
    if (o["end-time"]) ev = ev.filter((e) => Date.parse(e.t) <= Number(o["end-time"]));
    if (o["filter-pattern"]) ev = ev.filter(logPattern(o["filter-pattern"]));
    if (o.limit) ev = ev.slice(0, Number(o.limit));
    return { data: { events: ev.map((e, i) => ({ logStreamName: e.stream, timestamp: Date.parse(e.t), message: e.message, ingestionTime: Date.parse(e.t) + 120, eventId: String(37000000000000000000000000000 + i * 1000) })), searchedLogStreams: [] } };
  },
};

/* ---------- 共通部品 ---------- */
function round(n) { return Math.round(n * 1000) / 1000; }
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(16).padStart(8, "0").repeat(4); }
function strip(o) { const { region, ...rest } = o; return clone(rest); }
function idFilter(list, field, ids, code, label) {
  for (const id of ids) if (!list.some((x) => x[field] === id)) throw new AwsError(code, `The ${label} '${id}' does not exist`);
  return list.filter((x) => ids.includes(x[field]));
}
const TAG_FILTERS = {};
function tagFilter(name) {
  if (name.startsWith("tag:")) return (r) => (r.Tags || []).filter((t) => t.Key === name.slice(4)).map((t) => t.Value);
  if (name === "tag-key") return (r) => (r.Tags || []).map((t) => t.Key);
  if (name === "tag-value") return (r) => (r.Tags || []).map((t) => t.Value);
  return null;
}
const EC2_FILTERS = {
  "instance-state-name": (i) => [i.State.Name], "instance-type": (i) => [i.InstanceType], "instance-id": (i) => [i.InstanceId],
  "vpc-id": (i) => [i.VpcId], "subnet-id": (i) => [i.SubnetId], "availability-zone": (i) => [i.Placement.AvailabilityZone],
  "private-ip-address": (i) => [i.PrivateIpAddress], "ip-address": (i) => (i.PublicIpAddress ? [i.PublicIpAddress] : []),
  "image-id": (i) => [i.ImageId], "instance.group-id": (i) => (i.SecurityGroups || []).map((g) => g.GroupId),
};
/** --filters の評価: 複数のフィルターは AND、Values の中は OR、値は * と ? のワイルドカードを使える */
function applyFilters(list, raw, table) {
  if (!raw) return list;
  const filters = [];
  for (const r of raw) {
    const v = shorthand(r, ["Values"]);
    for (const f of Array.isArray(v) ? v : [v]) {
      if (!f.Name || !f.Values) throw new CliError(`--filters は Name=名前,Values=値 の形で指定します(「${r}」)`, "例: --filters Name=instance-state-name,Values=running");
      filters.push({ Name: f.Name, Values: [].concat(f.Values) });
    }
  }
  return list.filter((x) => filters.every((f) => {
    const get = table[f.Name] || tagFilter(f.Name);
    if (!get) throw new AwsError("InvalidParameterValue", `The filter '${f.Name}' is invalid`);
    const have = get(x);
    return f.Values.some((p) => have.some((h) => new RegExp("^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$").test(h)));
  }));
}
function publicInstance(i) {
  const { region, ReservationId, ...rest } = i;
  return clone(rest);
}
function stateChange(ctx, kind) {
  const { cmd, env, region } = ctx;
  const ids = cmd.opts["instance-ids"];
  const all = (env.ec2?.instances || []).filter((i) => (i.region || env.region) === region);
  for (const id of ids) {
    if (!/^i-[0-9a-f]{8,17}$/.test(id)) throw new AwsError("InvalidInstanceID.Malformed", `Invalid id: "${id}"`);
  }
  for (const id of ids) {
    const inst = all.find((i) => i.InstanceId === id);
    const tags = Object.fromEntries((inst?.Tags || []).flatMap((t) => [[`ec2:ResourceTag/${t.Key}`, t.Value], [`aws:ResourceTag/${t.Key}`, t.Value]]));
    authorize(ctx, kind === "stop" ? "ec2:StopInstances" : "ec2:StartInstances", `arn:aws:ec2:${region}:${env.account}:instance/${id}`, tags);
  }
  for (const id of ids) if (!all.some((i) => i.InstanceId === id)) throw new AwsError("InvalidInstanceID.NotFound", `The instance ID '${id}' does not exist`);
  if (cmd.opts["dry-run"]) throw new AwsError("DryRunOperation", "Request would have succeeded, but DryRun flag is set.");
  const code = { pending: 0, running: 16, stopping: 64, stopped: 80 };
  const items = ids.map((id) => {
    const inst = all.find((i) => i.InstanceId === id);
    const prev = inst.State.Name;
    const next = kind === "stop" ? (prev === "stopped" ? "stopped" : "stopping") : (prev === "running" ? "running" : "pending");
    const final = kind === "stop" ? "stopped" : "running";
    if (prev !== final) ctx.rec.changes.push(`${id}: ${prev} → ${final}`);
    inst.State = { Code: code[final], Name: final };
    return { CurrentState: { Code: code[next], Name: next }, InstanceId: id, PreviousState: { Code: code[prev] ?? 16, Name: prev } };
  });
  return { data: { [kind === "stop" ? "StoppingInstances" : "StartingInstances"]: items } };
}
/** CloudWatch Logs のフィルターパターン(語句の AND、"..." のフレーズ、-語 の除外)。JSON や数値の条件は未対応 */
function logPattern(p) {
  const s = p.trim();
  if (s.startsWith("{") || s.startsWith("[")) throw new CliError("JSON / スペース区切りのフィルターパターンは学習用環境では未対応です", "語句(例: ERROR、\"timed out\")で絞り込んでください", "unsupported");
  const terms = [...s.matchAll(/(-?)"([^"]+)"|(-?)(\S+)/g)].map((m) => ({ neg: !!(m[1] || m[3]), t: m[2] || m[4] }));
  return (e) => terms.every(({ neg, t }) => e.message.includes(t) !== neg);
}
/** 関数の振る舞い(問題用に定義した小さな処理)。任意のコードは実行しない */
function runFunction(f, event) {
  switch (f.behavior) {
    case "order-total": {
      const items = Array.isArray(event.items) ? event.items : null;
      if (!items) return { error: true, body: { errorType: "ValidationError", errorMessage: "items は配列で指定してください" } };
      const total = items.reduce((a, it) => a + Number(it.price || 0) * Number(it.qty || 1), 0);
      return { body: { orderId: event.orderId ?? null, total, currency: "JPY" } };
    }
    case "echo": return { body: { received: event } };
    case "fail": return { error: true, body: { errorType: "Error", errorMessage: "Task timed out after 3.00 seconds" } };
    default: return { body: { ok: true } };
  }
}
