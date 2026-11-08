// コマンド・ポリシー演習: CloudFormation テンプレートの検証と模擬デプロイ(作成されるリソースと順序の計算)。
// 対応: Parameters / Mappings / Conditions / Resources / Outputs、組み込み関数(Ref・GetAtt・Sub・Join・Select・Split・If・Equals・
// Not・And・Or・FindInMap・GetAZs・ImportValue・Base64)、疑似パラメーター、DependsOn・循環依存の検出、DeletionPolicy。
// RESOURCE_SPECS に無いリソースタイプや Transform(SAM)は「判定対象外」。実際の AWS へのデプロイは行わない。
import { parseJson } from "./json.js";
import { parseYaml } from "./yaml.js";

const P = (...names) => Object.fromEntries(names.map((n) => (n.endsWith("!") ? [n.slice(0, -1), { req: true }] : [n, {}])));
/** リソースタイプごとの、トップレベルのプロパティ(! は必須)・GetAtt の属性・Ref の値 */
export const RESOURCE_SPECS = {
  "AWS::S3::Bucket": { props: P("BucketName", "AccessControl", "BucketEncryption", "VersioningConfiguration", "PublicAccessBlockConfiguration", "LifecycleConfiguration", "LoggingConfiguration", "NotificationConfiguration", "OwnershipControls", "Tags", "ObjectLockEnabled", "ObjectLockConfiguration", "ReplicationConfiguration", "WebsiteConfiguration", "CorsConfiguration"), attrs: ["Arn", "DomainName", "RegionalDomainName", "WebsiteURL"], ref: "バケット名", id: (c, p) => p.BucketName || `${c.stack}-${c.lid.toLowerCase()}-1a2b3c`, arn: (c, id) => `arn:aws:s3:::${id}` },
  "AWS::S3::BucketPolicy": { props: P("Bucket!", "PolicyDocument!"), attrs: [], ref: "バケット名", id: (c, p) => String(p.Bucket) },
  "AWS::EC2::VPC": { props: P("CidrBlock", "EnableDnsHostnames", "EnableDnsSupport", "InstanceTenancy", "Ipv4IpamPoolId", "Ipv4NetmaskLength", "Tags"), attrs: ["VpcId", "CidrBlock", "DefaultSecurityGroup"], ref: "VPC ID", id: (c) => `vpc-${c.hash}` },
  "AWS::EC2::Subnet": { props: P("VpcId!", "CidrBlock", "AvailabilityZone", "MapPublicIpOnLaunch", "Ipv6CidrBlock", "Tags"), attrs: ["SubnetId", "AvailabilityZone", "VpcId"], ref: "サブネット ID", id: (c) => `subnet-${c.hash}` },
  "AWS::EC2::InternetGateway": { props: P("Tags"), attrs: ["InternetGatewayId"], ref: "IGW ID", id: (c) => `igw-${c.hash}` },
  "AWS::EC2::VPCGatewayAttachment": { props: P("VpcId!", "InternetGatewayId", "VpnGatewayId"), attrs: [], ref: "アタッチメント ID", id: (c) => `attach-${c.hash}` },
  "AWS::EC2::NatGateway": { props: P("SubnetId!", "AllocationId", "ConnectivityType", "Tags"), attrs: ["NatGatewayId"], ref: "NAT ゲートウェイ ID", id: (c) => `nat-${c.hash}` },
  "AWS::EC2::EIP": { props: P("Domain", "InstanceId", "Tags"), attrs: ["AllocationId", "PublicIp"], ref: "パブリック IP", id: () => "198.51.100.77" },
  "AWS::EC2::RouteTable": { props: P("VpcId!", "Tags"), attrs: ["RouteTableId"], ref: "ルートテーブル ID", id: (c) => `rtb-${c.hash}` },
  "AWS::EC2::Route": { props: P("RouteTableId!", "DestinationCidrBlock", "DestinationIpv6CidrBlock", "GatewayId", "NatGatewayId", "TransitGatewayId", "VpcEndpointId", "VpcPeeringConnectionId", "InstanceId"), attrs: [], ref: "ルート", id: (c) => `r-${c.hash}` },
  "AWS::EC2::SubnetRouteTableAssociation": { props: P("SubnetId!", "RouteTableId!"), attrs: [], ref: "関連付け ID", id: (c) => `rtbassoc-${c.hash}` },
  "AWS::EC2::SecurityGroup": { props: P("GroupDescription!", "GroupName", "SecurityGroupIngress", "SecurityGroupEgress", "VpcId", "Tags"), attrs: ["GroupId", "VpcId"], ref: "セキュリティグループ ID", id: (c) => `sg-${c.hash}` },
  "AWS::EC2::SecurityGroupIngress": { props: P("GroupId!", "IpProtocol!", "FromPort", "ToPort", "CidrIp", "CidrIpv6", "SourceSecurityGroupId", "SourcePrefixListId", "Description"), attrs: ["Id"], ref: "ルール ID", id: (c) => `sgr-${c.hash}` },
  "AWS::EC2::Instance": { props: P("ImageId", "InstanceType", "SubnetId", "SecurityGroupIds", "SecurityGroups", "IamInstanceProfile", "KeyName", "UserData", "Tags", "BlockDeviceMappings", "Monitoring", "AvailabilityZone", "MetadataOptions", "LaunchTemplate"), attrs: ["PrivateIp", "PublicIp", "AvailabilityZone", "PrivateDnsName", "InstanceId"], ref: "インスタンス ID", id: (c) => `i-0${c.hash}${c.hash}`.slice(0, 19) },
  "AWS::IAM::Role": { props: P("AssumeRolePolicyDocument!", "ManagedPolicyArns", "Policies", "RoleName", "Path", "PermissionsBoundary", "MaxSessionDuration", "Description", "Tags"), attrs: ["Arn", "RoleId", "RoleName"], ref: "ロール名", id: (c, p) => p.RoleName || `${c.stack}-${c.lid}-ABC123`, arn: (c, id) => `arn:aws:iam::${c.account}:role/${id}` },
  "AWS::IAM::InstanceProfile": { props: P("Roles!", "InstanceProfileName", "Path"), attrs: ["Arn"], ref: "インスタンスプロファイル名", id: (c, p) => p.InstanceProfileName || `${c.stack}-${c.lid}`, arn: (c, id) => `arn:aws:iam::${c.account}:instance-profile/${id}` },
  "AWS::IAM::ManagedPolicy": { props: P("PolicyDocument!", "ManagedPolicyName", "Roles", "Users", "Groups", "Path", "Description"), attrs: ["PolicyArn"], ref: "ポリシーの ARN", id: (c, p) => `arn:aws:iam::${c.account}:policy/${p.ManagedPolicyName || c.lid}` },
  "AWS::Lambda::Function": { props: P("Code!", "Role!", "Runtime", "Handler", "MemorySize", "Timeout", "Environment", "FunctionName", "VpcConfig", "Layers", "Architectures", "DeadLetterConfig", "TracingConfig", "ReservedConcurrentExecutions", "Tags", "PackageType", "Description", "EphemeralStorage", "LoggingConfig"), attrs: ["Arn"], ref: "関数名", id: (c, p) => p.FunctionName || `${c.stack}-${c.lid}-AbC123`, arn: (c, id) => `arn:aws:lambda:${c.region}:${c.account}:function:${id}` },
  "AWS::Lambda::Permission": { props: P("Action!", "FunctionName!", "Principal!", "SourceArn", "SourceAccount", "PrincipalOrgID", "FunctionUrlAuthType"), attrs: [], ref: "ステートメント ID", id: (c) => `${c.stack}-${c.lid}` },
  "AWS::DynamoDB::Table": { props: P("KeySchema!", "AttributeDefinitions", "BillingMode", "ProvisionedThroughput", "TableName", "GlobalSecondaryIndexes", "LocalSecondaryIndexes", "StreamSpecification", "TimeToLiveSpecification", "PointInTimeRecoverySpecification", "SSESpecification", "DeletionProtectionEnabled", "Tags", "TableClass"), attrs: ["Arn", "StreamArn"], ref: "テーブル名", id: (c, p) => p.TableName || `${c.stack}-${c.lid}-XYZ987`, arn: (c, id) => `arn:aws:dynamodb:${c.region}:${c.account}:table/${id}` },
  "AWS::SQS::Queue": { props: P("QueueName", "VisibilityTimeout", "MessageRetentionPeriod", "RedrivePolicy", "RedriveAllowPolicy", "FifoQueue", "ContentBasedDeduplication", "KmsMasterKeyId", "SqsManagedSseEnabled", "DelaySeconds", "ReceiveMessageWaitTimeSeconds", "MaximumMessageSize", "Tags"), attrs: ["Arn", "QueueName", "QueueUrl"], ref: "キューの URL", id: (c, p) => `https://sqs.${c.region}.amazonaws.com/${c.account}/${p.QueueName || `${c.stack}-${c.lid}`}`, arn: (c, id) => `arn:aws:sqs:${c.region}:${c.account}:${id.split("/").pop()}` },
  "AWS::SQS::QueuePolicy": { props: P("Queues!", "PolicyDocument!"), attrs: [], ref: "ポリシー ID", id: (c) => `${c.stack}-${c.lid}` },
  "AWS::SNS::Topic": { props: P("TopicName", "Subscription", "KmsMasterKeyId", "FifoTopic", "ContentBasedDeduplication", "DisplayName", "Tags"), attrs: ["TopicArn", "TopicName"], ref: "トピックの ARN", id: (c, p) => `arn:aws:sns:${c.region}:${c.account}:${p.TopicName || `${c.stack}-${c.lid}`}`, arn: (c, id) => id },
  "AWS::SNS::Subscription": { props: P("TopicArn!", "Protocol!", "Endpoint", "RawMessageDelivery", "FilterPolicy", "FilterPolicyScope", "RedrivePolicy"), attrs: ["Arn"], ref: "サブスクリプションの ARN", id: (c) => `arn:aws:sns:${c.region}:${c.account}:sub-${c.hash}` },
  "AWS::Events::Rule": { props: P("EventPattern", "ScheduleExpression", "State", "Targets", "EventBusName", "Name", "Description", "RoleArn"), attrs: ["Arn"], ref: "ルール名", id: (c, p) => p.Name || `${c.stack}-${c.lid}`, arn: (c, id) => `arn:aws:events:${c.region}:${c.account}:rule/${id}` },
  "AWS::KMS::Key": { props: P("KeyPolicy", "Description", "EnableKeyRotation", "KeySpec", "KeyUsage", "MultiRegion", "PendingWindowInDays", "Enabled", "RotationPeriodInDays", "Tags"), attrs: ["Arn", "KeyId"], ref: "キー ID", id: (c) => `1234abcd-12ab-34cd-56ef-${c.hash}${c.hash}`.slice(0, 36), arn: (c, id) => `arn:aws:kms:${c.region}:${c.account}:key/${id}` },
  "AWS::KMS::Alias": { props: P("AliasName!", "TargetKeyId!"), attrs: [], ref: "エイリアス名", id: (c, p) => String(p.AliasName) },
  "AWS::Logs::LogGroup": { props: P("LogGroupName", "RetentionInDays", "KmsKeyId", "LogGroupClass", "DataProtectionPolicy", "Tags"), attrs: ["Arn"], ref: "ロググループ名", id: (c, p) => p.LogGroupName || `${c.stack}-${c.lid}-Q1w2E3`, arn: (c, id) => `arn:aws:logs:${c.region}:${c.account}:log-group:${id}:*` },
  "AWS::CloudWatch::Alarm": { props: P("MetricName", "Namespace", "Statistic", "ExtendedStatistic", "Period", "EvaluationPeriods!", "Threshold", "ComparisonOperator!", "Dimensions", "AlarmActions", "OKActions", "InsufficientDataActions", "AlarmName", "TreatMissingData", "DatapointsToAlarm", "AlarmDescription", "ActionsEnabled", "Unit", "Metrics"), attrs: ["Arn"], ref: "アラーム名", id: (c, p) => p.AlarmName || `${c.stack}-${c.lid}`, arn: (c, id) => `arn:aws:cloudwatch:${c.region}:${c.account}:alarm:${id}` },
  "AWS::RDS::DBInstance": { props: P("DBInstanceClass", "Engine", "EngineVersion", "AllocatedStorage", "MasterUsername", "MasterUserPassword", "ManageMasterUserPassword", "MultiAZ", "StorageEncrypted", "KmsKeyId", "PubliclyAccessible", "DBSubnetGroupName", "VPCSecurityGroups", "BackupRetentionPeriod", "DeletionProtection", "DBInstanceIdentifier", "Tags", "StorageType", "Port", "DBName", "EnableIAMDatabaseAuthentication", "CopyTagsToSnapshot"), attrs: ["Endpoint.Address", "Endpoint.Port", "DBInstanceArn"], ref: "DB インスタンス ID", id: (c, p) => (p.DBInstanceIdentifier || `${c.stack}-${c.lid}`).toLowerCase(), snapshot: true },
  "AWS::RDS::DBSubnetGroup": { props: P("DBSubnetGroupDescription!", "SubnetIds!", "DBSubnetGroupName", "Tags"), attrs: [], ref: "サブネットグループ名", id: (c, p) => p.DBSubnetGroupName || `${c.stack}-${c.lid}`.toLowerCase() },
  "AWS::SecretsManager::Secret": { props: P("Name", "Description", "GenerateSecretString", "SecretString", "KmsKeyId", "Tags", "ReplicaRegions"), attrs: ["Id"], ref: "シークレットの ARN", id: (c, p) => `arn:aws:secretsmanager:${c.region}:${c.account}:secret:${p.Name || c.lid}-AbCdEf` },
};
const RESOURCE_KEYS = ["Type", "Properties", "DependsOn", "DeletionPolicy", "UpdateReplacePolicy", "Condition", "Metadata", "CreationPolicy", "UpdatePolicy"];
const TOP_KEYS = ["AWSTemplateFormatVersion", "Description", "Metadata", "Parameters", "Rules", "Mappings", "Conditions", "Transform", "Resources", "Outputs"];
const PSEUDO = ["AWS::Region", "AWS::AccountId", "AWS::StackName", "AWS::StackId", "AWS::Partition", "AWS::URLSuffix", "AWS::NoValue", "AWS::NotificationARNs"];
const NOVALUE = Symbol("NoValue");
class Unsup extends Error {}

/** テンプレートの解析(JSON か YAML)。戻り値: { value, pos } または { syntax } */
export function parseTemplate(src) {
  const t = src.trimStart();
  try {
    if (t.startsWith("{")) { const r = parseJson(src); return { value: r.value, pos: r.pos, format: "json" }; }
    const r = parseYaml(src);
    return { value: r.value, pos: r.pos, format: "yaml" };
  } catch (e) {
    if (e.line) return { syntax: { message: e.message, line: e.line, col: e.col, hint: e.hint } };
    throw e;
  }
}

/**
 * テンプレートを検証して、模擬的にスタックを作る。
 * opts = { params: { 名前: 値 }, stackName, region, account, imports: { エクスポート名: 値 } }
 * 戻り値: { ok, syntax?, errors[], warnings[], unsupported[], resources: { 論理ID: {...} }, order[], outputs{}, conditions{} }
 */
export function deployTemplate(src, opts = {}) {
  const parsed = parseTemplate(src);
  if (parsed.syntax) return { ok: false, syntax: parsed.syntax, errors: [], warnings: [], unsupported: [], resources: {}, order: [], outputs: {} };
  const tpl = parsed.value;
  const errors = [], warnings = [], unsupported = [];
  const line = (path) => parsed.pos(path).line;
  const err = (msg, path = []) => errors.push({ msg, line: line(path) });
  const warn = (msg, path = []) => warnings.push({ msg, line: line(path) });
  const out = { ok: false, errors, warnings, unsupported, resources: {}, order: [], outputs: {}, conditions: {}, format: parsed.format };
  if (!tpl || typeof tpl !== "object" || Array.isArray(tpl)) { err("Template format error: unsupported structure.(テンプレートの最上位はマッピング(キー: 値)にします。--template-body にファイル名だけを書いていませんか? ファイルの内容を渡すには file:// を付けます)"); return out; }
  for (const k of Object.keys(tpl)) if (!TOP_KEYS.includes(k)) err(`Template format error: 最上位のセクション「${k}」は無効です(使えるのは ${TOP_KEYS.join(" / ")})`, [k]);
  if (tpl.Transform) { unsupported.push("Transform(SAM などのマクロ)は学習用環境では展開しません"); }
  if (tpl.AWSTemplateFormatVersion !== undefined && String(tpl.AWSTemplateFormatVersion) !== "2010-09-09") err(`AWSTemplateFormatVersion は "2010-09-09" にします(「${tpl.AWSTemplateFormatVersion}」)`, ["AWSTemplateFormatVersion"]);
  const R = tpl.Resources;
  if (!R || typeof R !== "object" || Array.isArray(R) || !Object.keys(R).length) { err("Template format error: Resources セクションが必要です(少なくとも 1 つのリソース)", ["Resources"]); return out; }
  const ctx = { region: opts.region || "ap-northeast-1", account: opts.account || "111122223333", stack: opts.stackName || "lab-stack" };
  // パラメーター
  const params = {};
  for (const [name, def] of Object.entries(tpl.Parameters || {})) {
    if (!def || typeof def !== "object" || !def.Type) { err(`Parameters: ${name} に Type がありません`, ["Parameters", name]); continue; }
    let v = opts.params && Object.hasOwn(opts.params, name) ? opts.params[name] : def.Default;
    if (v === undefined) { err(`Parameters: [${name}] must have values(既定値が無く、デプロイ時の値も指定されていません)`, ["Parameters", name]); continue; }
    if (def.AllowedValues && !def.AllowedValues.map(String).includes(String(v))) err(`Parameter '${name}' must be one of AllowedValues(「${v}」は ${def.AllowedValues.join(" / ")} にありません)`, ["Parameters", name]);
    if (def.Type === "Number" && Number.isNaN(Number(v))) err(`Parameter '${name}' must be a number`, ["Parameters", name]);
    if (/^List<|CommaDelimitedList/.test(def.Type)) v = Array.isArray(v) ? v : String(v).split(",").map((x) => x.trim());
    params[name] = def.Type === "Number" ? Number(v) : v;
  }
  const ids = new Set(Object.keys(R));
  for (const n of Object.keys(params)) if (ids.has(n)) err(`Template format error: パラメーターとリソースで同じ論理 ID「${n}」は使えません`, ["Resources", n]);
  // 条件
  const condDefs = tpl.Conditions || {};
  const condVal = {};
  const evalCond = (name, stack = []) => {
    if (name in condVal) return condVal[name];
    if (!(name in condDefs)) throw new Error(`Template format error: 条件「${name}」が Conditions にありません`);
    if (stack.includes(name)) throw new Error(`Template format error: 条件の循環参照 [${[...stack, name].join(" → ")}]`);
    const v = resolve(condDefs[name], ["Conditions", name], { cond: true, stack: [...stack, name] });
    return (condVal[name] = !!v);
  };
  // リソースの論理 ID・物理 ID
  const deps = Object.fromEntries([...ids].map((id) => [id, new Set()]));
  let curRes = null;
  const physical = {};
  const spec = (id) => RESOURCE_SPECS[R[id]?.Type];
  const fail = (msg, at) => { const e = new Error(msg); e.path = at; throw e; };
  function resolve(v, path, mode = {}) {
    if (Array.isArray(v)) return v.map((x, i) => resolve(x, [...path, i], mode)).filter((x) => x !== NOVALUE);
    if (!v || typeof v !== "object") return v;
    const keys = Object.keys(v);
    if (keys.length === 1) {
      const [k] = keys, a = v[k], p = [...path, k];
      if (k === "Ref") {
        if (typeof a !== "string") fail("Ref の値は論理 ID かパラメーター名の文字列にします", p);
        if (a === "AWS::NoValue") return NOVALUE;
        if (PSEUDO.includes(a)) return { "AWS::Region": ctx.region, "AWS::AccountId": ctx.account, "AWS::StackName": ctx.stack, "AWS::StackId": `arn:aws:cloudformation:${ctx.region}:${ctx.account}:stack/${ctx.stack}/0000`, "AWS::Partition": "aws", "AWS::URLSuffix": "amazonaws.com", "AWS::NotificationARNs": [] }[a];
        if (a in params) return params[a];
        if (mode.cond) fail(`Conditions の中で Ref できるのはパラメーターと疑似パラメーターだけです(「${a}」)`, p);
        if (!ids.has(a)) fail(`Template format error: Unresolved resource dependencies [${a}] in the Resources block of the template`, p);
        if (curRes) deps[curRes].add(a);
        return { __ref: a };
      }
      if (k === "Fn::GetAtt") {
        const [lid, attr] = Array.isArray(a) ? a : String(a).split(/\.(.+)/);
        if (!ids.has(lid)) fail(`Template format error: Unresolved resource dependencies [${lid}] in the Resources block of the template`, p);
        const sp = spec(lid);
        if (sp && !sp.attrs.includes(attr)) fail(`Template error: resource ${lid} does not support attribute type ${attr} in Fn::GetAtt(使える属性: ${sp.attrs.join(", ") || "なし"})`, p);
        if (curRes) deps[curRes].add(lid);
        return { __att: [lid, attr] };
      }
      if (k === "Fn::Sub") {
        const [tmpl, vars = {}] = Array.isArray(a) ? a : [a, {}];
        if (typeof tmpl !== "string") fail("Fn::Sub の最初の値は文字列にします", p);
        const rv = Object.fromEntries(Object.entries(vars).map(([n, x]) => [n, resolve(x, [...p, 1, n], mode)]));
        const parts = [];
        let last = 0;
        tmpl.replace(/\$\{(!?)([^}]+)\}/g, (m, bang, name, off) => {
          parts.push(tmpl.slice(last, off)); last = off + m.length;
          if (bang) { parts.push("${" + name + "}"); return m; }
          if (name in rv) parts.push(rv[name]);
          else if (name.includes(".") && !PSEUDO.includes(name)) parts.push(resolve({ "Fn::GetAtt": name.split(/\.(.+)/).slice(0, 2) }, p, mode));
          else parts.push(resolve({ Ref: name }, p, mode));
          return m;
        });
        parts.push(tmpl.slice(last));
        return parts.length === 1 ? parts[0] : { __join: parts };
      }
      if (k === "Fn::Join") {
        if (!Array.isArray(a) || a.length !== 2 || !Array.isArray(a[1]) && !(a[1] && typeof a[1] === "object")) fail("Fn::Join は [区切り文字, [値のリスト]] の形にします", p);
        const list = resolve(a[1], [...p, 1], mode);
        if (!Array.isArray(list)) fail("Fn::Join の 2 つめはリストにします", p);
        return { __join: list.flatMap((x, i) => (i ? [a[0], x] : [x])) };
      }
      if (k === "Fn::Select") { const i = Number(resolve(a[0], p, mode)), list = resolve(a[1], p, mode); if (!Array.isArray(list) || i < 0 || i >= list.length) fail("Fn::Select の位置がリストの範囲外です", p); return list[i]; }
      if (k === "Fn::Split") { const s = flatten(resolve(a[1], p, mode)); return typeof s === "string" ? s.split(a[0]) : { __split: [a[0], s] }; }
      if (k === "Fn::GetAZs") return [`${ctx.region}a`, `${ctx.region}c`, `${ctx.region}d`];
      if (k === "Fn::If") {
        if (!Array.isArray(a) || a.length !== 3) fail("Fn::If は [条件名, 真の値, 偽の値] の形にします", p);
        return evalCond(a[0], mode.stack) ? resolve(a[1], [...p, 1], mode) : resolve(a[2], [...p, 2], mode);
      }
      if (k === "Fn::Equals") { if (!Array.isArray(a) || a.length !== 2) fail("Fn::Equals は [値1, 値2] の形にします", p); return String(flatten(resolve(a[0], p, mode))) === String(flatten(resolve(a[1], p, mode))); }
      if (k === "Fn::Not") return !resolve(a[0], p, mode);
      if (k === "Fn::And") return a.every((x) => resolve(x, p, mode));
      if (k === "Fn::Or") return a.some((x) => resolve(x, p, mode));
      if (k === "Condition" && mode.cond) return evalCond(a, mode.stack);
      if (k === "Fn::FindInMap") {
        const [m, k1, k2] = a.map((x) => flatten(resolve(x, p, mode)));
        const v2 = tpl.Mappings?.[m]?.[k1]?.[k2];
        if (v2 === undefined) fail(`Template error: Unable to get mapping for ${m}::${k1}::${k2}`, p);
        return v2;
      }
      if (k === "Fn::ImportValue") { const n = flatten(resolve(a, p, mode)); if (!opts.imports || !(n in opts.imports)) fail(`No export named ${n} found(エクスポート元のスタックの Outputs を確認)`, p); return opts.imports[n]; }
      if (k === "Fn::Base64") return { __b64: resolve(a, p, mode) };
      if (k.startsWith("Fn::")) throw new Unsup(`${k} は学習用環境では未対応です`);
    }
    const o = {};
    for (const [k, x] of Object.entries(v)) { const r = resolve(x, [...path, k], mode); if (r !== NOVALUE) o[k] = r; }
    return o;
  }
  // 1 回目: 構造の検証・依存関係・条件
  for (const [lid, r] of Object.entries(R)) {
    const path = ["Resources", lid];
    if (!/^[A-Za-z0-9]+$/.test(lid)) err(`Template format error: 論理 ID「${lid}」には英数字だけを使います`, path);
    if (!r || typeof r !== "object") { err(`リソース ${lid} の定義が正しくありません`, path); continue; }
    for (const k of Object.keys(r)) if (!RESOURCE_KEYS.includes(k)) err(`Template format error: リソース ${lid} の「${k}」は無効な属性です(Properties の中に書くべきものではありませんか?)`, [...path, k]);
    if (!r.Type) { err(`Template format error: リソース ${lid} に Type がありません`, path); continue; }
    if (r.DeletionPolicy && !["Delete", "Retain", "RetainExceptOnCreate", "Snapshot"].includes(r.DeletionPolicy)) err(`リソース ${lid} の DeletionPolicy「${r.DeletionPolicy}」は無効です(Delete / Retain / RetainExceptOnCreate / Snapshot)`, [...path, "DeletionPolicy"]);
    const sp = RESOURCE_SPECS[r.Type];
    if (!sp) { if (/^AWS::[A-Za-z0-9]+::[A-Za-z0-9]+$/.test(r.Type)) unsupported.push(`リソースタイプ ${r.Type}(${lid})は学習用環境の対応範囲外です`); else err(`Template format error: Unrecognized resource types: [${r.Type}]`, [...path, "Type"]); continue; }
    if (r.DeletionPolicy === "Snapshot" && !sp.snapshot && r.Type !== "AWS::EC2::Volume") err(`リソース ${lid}(${r.Type})は DeletionPolicy: Snapshot に対応していません`, [...path, "DeletionPolicy"]);
    const props = r.Properties || {};
    if (r.Properties !== undefined && (typeof r.Properties !== "object" || Array.isArray(r.Properties))) { err(`リソース ${lid} の Properties はマッピングにします`, [...path, "Properties"]); continue; }
    for (const k of Object.keys(props)) if (!sp.props[k]) {
      const near = Object.keys(sp.props).find((x) => x.toLowerCase() === k.toLowerCase());
      err(`Properties validation failed for resource ${lid} with message: #: extraneous key [${k}] is not permitted${near ? `(「${near}」の誤り? 大文字・小文字を区別します)` : ""}`, [...path, "Properties", k]);
    }
    for (const [k, d] of Object.entries(sp.props)) if (d.req && !(k in props)) err(`Properties validation failed for resource ${lid} with message: #: required key [${k}] not found`, [...path, "Properties"]);
    for (const d of [].concat(r.DependsOn || [])) { if (!ids.has(d)) err(`Template format error: Unresolved resource dependencies [${d}] in the Resources block of the template(DependsOn)`, [...path, "DependsOn"]); else deps[lid].add(d); }
    if (r.Condition !== undefined && !(r.Condition in condDefs)) err(`Template format error: リソース ${lid} の Condition「${r.Condition}」が Conditions にありません`, [...path, "Condition"]);
  }
  if (errors.length) return out;
  for (const name of Object.keys(condDefs)) {
    try { out.conditions[name] = evalCond(name); }
    catch (e) { if (e instanceof Unsup) unsupported.push(e.message); else err(e.message, e.path || ["Conditions", name]); }
  }
  if (errors.length) return out;
  // 2 回目: プロパティの組み込み関数を解決
  const resolved = {};
  for (const [lid, r] of Object.entries(R)) {
    if (!RESOURCE_SPECS[r.Type]) continue;
    if (r.Condition && !condVal[r.Condition]) continue;
    curRes = lid;
    try { resolved[lid] = resolve(r.Properties || {}, ["Resources", lid, "Properties"]); }
    catch (e) { if (e instanceof Unsup) unsupported.push(`${lid}: ${e.message}`); else err(`${lid}: ${e.message}`, e.path || ["Resources", lid]); }
    curRes = null;
  }
  // 条件で作られないリソースへの参照
  for (const [lid, set] of Object.entries(deps)) for (const d of set) if (resolved[lid] && !resolved[d] && RESOURCE_SPECS[R[d]?.Type] && R[d].Condition && !condVal[R[d].Condition]) err(`Template format error: Unresolved resource dependencies [${d}] — ${d} は条件 ${R[d].Condition} が偽のため作られませんが、${lid} から参照されています`, ["Resources", lid]);
  if (errors.length) return out;
  // 循環依存と作成の順序(トポロジカルソート)
  const live = Object.keys(resolved);
  const order = [], state = {};
  const visit = (n, stack) => {
    if (state[n] === 2) return;
    if (state[n] === 1) { const cyc = [...new Set(stack.slice(stack.indexOf(n)))]; throw new Error(`Circular dependency between resources: [${cyc.join(", ")}]`); }
    state[n] = 1;
    for (const d of deps[n]) if (resolved[d]) visit(d, [...stack, d]);
    state[n] = 2;
    order.push(n);
  };
  try { live.forEach((n) => visit(n, [n])); }
  catch (e) { err(e.message, ["Resources"]); return out; }
  // 物理 ID・ARN を決めて、参照を値に置き換える
  let h = 0;
  for (const lid of order) {
    const sp = spec(lid), c = { ...ctx, lid, hash: (++h * 7919).toString(16).padStart(6, "0").slice(-6) + "a1b2c3d4".slice(0, 2) };
    const flatProps = deepFlatten(resolved[lid], physical);
    const id = sp.id(c, flatProps);
    physical[lid] = { id, arn: sp.arn ? sp.arn(c, id) : null, type: R[lid].Type, c };
  }
  for (const lid of order) {
    const props = deepFlatten(resolved[lid], physical);
    out.resources[lid] = { type: R[lid].Type, props, raw: R[lid].Properties || {}, physicalId: physical[lid].id, arn: physical[lid].arn, deletionPolicy: R[lid].DeletionPolicy || "Delete", updateReplacePolicy: R[lid].UpdateReplacePolicy || "Delete", dependsOn: [...deps[lid]].filter((d) => resolved[d]), line: line(["Resources", lid]) };
  }
  out.order = order;
  out.skipped = Object.keys(R).filter((lid) => RESOURCE_SPECS[R[lid].Type] && !resolved[lid]);
  // 出力
  const exportNames = new Set();
  for (const [name, o] of Object.entries(tpl.Outputs || {})) {
    if (!o || typeof o !== "object" || !("Value" in o)) { err(`Outputs: ${name} に Value がありません`, ["Outputs", name]); continue; }
    if (o.Condition && !condVal[o.Condition]) continue;
    try {
      curRes = null;
      const v = deepFlatten(resolve(o.Value, ["Outputs", name, "Value"]), physical);
      const ex = o.Export ? deepFlatten(resolve(o.Export.Name, ["Outputs", name, "Export"]), physical) : null;
      if (ex && exportNames.has(ex)) err(`Outputs: エクスポート名「${ex}」が重複しています(エクスポート名はリージョン内で一意)`, ["Outputs", name]);
      if (ex) exportNames.add(ex);
      out.outputs[name] = { value: v, export: ex };
    } catch (e) { if (e instanceof Unsup) unsupported.push(e.message); else err(`Outputs ${name}: ${e.message}`, ["Outputs", name]); }
  }
  out.ok = !errors.length;
  return out;
}

/** 参照({__ref} など)を物理 ID・属性値の文字列に置き換える */
function deepFlatten(v, physical) {
  if (Array.isArray(v)) return v.map((x) => deepFlatten(x, physical));
  if (v && typeof v === "object") {
    if (v.__ref) return physical[v.__ref]?.id ?? `<${v.__ref}>`;
    if (v.__att) { const [lid, attr] = v.__att; const p = physical[lid]; if (!p) return `<${lid}.${attr}>`; return attrValue(p, attr); }
    if (v.__join) return v.__join.map((x) => flatten(deepFlatten(x, physical))).join("");
    if (v.__b64) return deepFlatten(v.__b64, physical);
    if (v.__split) return String(deepFlatten(v.__split[1], physical)).split(v.__split[0]);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepFlatten(x, physical)]));
  }
  return v;
}
function flatten(v) { return v && typeof v === "object" && !Array.isArray(v) && (v.__ref || v.__att || v.__join) ? v : v; }
function attrValue(p, attr) {
  const { id, arn, c } = p;
  switch (attr) {
    case "Arn": case "DBInstanceArn": case "TopicArn": case "PolicyArn": return arn || id;
    case "QueueUrl": return id;
    case "QueueName": case "TopicName": return id.split(/[/:]/).pop();
    case "RoleName": return id;
    case "DomainName": return `${id}.s3.amazonaws.com`;
    case "RegionalDomainName": return `${id}.s3.${c.region}.amazonaws.com`;
    case "Endpoint.Address": return `${id}.abcdefghijkl.${c.region}.rds.amazonaws.com`;
    case "Endpoint.Port": return "3306";
    case "KeyId": return id;
    case "AvailabilityZone": return `${c.region}a`;
    default: return id;
  }
}
