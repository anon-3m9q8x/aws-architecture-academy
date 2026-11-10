// 文章に登場する AWS サービスを図鑑の項目に対応付ける(資格問題演習の解説で、サービス名を図鑑へのリンクにする)。
// 図鑑の名前・正式名・略称から自動で語を作り、表記ゆれ・機能名は ALIASES で補う。最長一致で重なりなく拾う。
import { SERVICES, byId } from "../services.js";

const SKIP = new Set(["internet", "user", "onprem", "grafana"]);
// 単独では一般的な英単語・別の意味になる名前は、「AWS 」「Amazon 」が付くときだけ拾う
const NEED_PREFIX = new Set(["batch", "health", "account", "transform", "connect", "artifact", "marketplace", "interconnect", "ams", "translate", "location", "nova", "signer", "continuum", "lightsail", "personalize", "detective", "inspector", "shield", "budgets", "backup", "quicksight"]);
// 略称として使わない(他の意味と衝突する)
const BAD_ABBR = new Set(["RES", "RAM", "PCS", "AMS", "TNB", "A2C", "EVS", "SAR", "ARC"]);
const ALIASES = [
  ["Application Load Balancer", "alb"], ["Elastic Load Balancing", "alb"], ["ELB", "alb"], ["Network Load Balancer", "nlb"], ["Gateway Load Balancer", "gwlb"], ["GWLB", "gwlb"],
  ["EC2 Auto Scaling", "asg"], ["Auto Scaling グループ", "asg"], ["Auto Scaling", "asg"], ["スポットインスタンス", "ec2"], ["Spot インスタンス", "ec2"],
  ["S3 Glacier", "glacier"], ["Glacier", "glacier"], ["S3 Intelligent-Tiering", "s3"], ["S3 Object Lock", "s3"], ["S3 Transfer Acceleration", "s3"],
  ["Kinesis Data Firehose", "firehose"], ["Firehose", "firehose"], ["Kinesis Data Analytics", "flink"], ["Managed Service for Apache Flink", "flink"], ["Kinesis", "kinesis"],
  ["QuickSight", "quicksight"], ["Amazon Quick", "quicksight"], ["PrivateLink", "vpce"], ["VPC エンドポイント", "vpce"], ["ゲートウェイエンドポイント", "vpce"], ["インターフェイスエンドポイント", "vpce"], ["インターフェース VPC エンドポイント", "vpce"],
  ["VPC ピアリング", "vpcpeer"], ["VPC Peering", "vpcpeer"], ["NAT ゲートウェイ", "natgw"], ["NAT Gateway", "natgw"], ["インターネットゲートウェイ", "igw"], ["Egress-Only インターネットゲートウェイ", "eigw"],
  ["セキュリティグループ", "vpc"], ["ネットワーク ACL", "vpc"], ["VPC フローログ", "vpc"], ["Transit Gateway", "tgw"], ["Direct Connect", "dx"], ["Site-to-Site VPN", "vpn"],
  ["Session Manager", "ssm"], ["Parameter Store", "ssm"], ["Patch Manager", "ssm"], ["Systems Manager", "ssm"], ["CloudWatch Logs", "cwlogs"], ["Logs Insights", "cwlogs"],
  ["Identity Center", "sso"], ["Access Analyzer", "accessanalyzer"], ["SCP", "orgs"], ["サービスコントロールポリシー", "orgs"], ["Application Migration Service", "mgn"], ["AWS MGN", "mgn"],
  ["AppStream", "appstream"], ["Chatbot", "qchat"], ["OpenSearch", "opensearch"], ["SageMaker", "sagemaker"], ["Bedrock", "bedrock"], ["CloudFront Functions", "cloudfront"],
  ["Route53", "route53"], ["DynamoDB Accelerator", "dax"], ["DAX", "dax"], ["Aurora Serverless", "aurora"], ["Redshift Spectrum", "redshift"], ["EventBridge Scheduler", "eventbridge"], ["EventBridge Pipes", "eventbridge"],
  ["File Gateway", "storagegw"], ["Volume Gateway", "storagegw"], ["Tape Gateway", "storagegw"], ["Snowball", "snowball"], ["Snowcone", "snowball"], ["Cost and Usage Report", "dataexports"], ["CUR", "dataexports"], ["Data Exports", "dataexports"],
  ["Managed Prometheus", "prometheus"], ["Managed Service for Prometheus", "prometheus"], ["Managed Grafana", "mgrafana"], ["FIS", "fis"], ["DRS", "edrs"], ["Elastic Disaster Recovery", "edrs"],
  ["Config ルール", "config"], ["AWS Config", "config"], ["Q Developer", "qdeveloper"], ["Q Business", "qbusiness"], ["Amazon Q", "qbusiness"], ["Glue Data Catalog", "glue"], ["Glue", "glue"],
  ["Lambda@Edge", "lambdaedge"], ["Fargate", "fargate"], ["Step Functions", "stepfn"], ["Secrets Manager", "secrets"], ["IAM Identity Center", "sso"], ["Certificate Manager", "acm"], ["Private CA", "privateca"],
  ["Cognito", "cognito"], ["Shield Advanced", "shield"], ["Shield Standard", "shield"], ["Amazon Inspector", "inspector"], ["Amazon Detective", "detective"], ["AWS Budgets", "budgets"], ["AWS Backup", "backup"],
  ["Comprehend Medical", "comprehendmedical"], ["Trusted Advisor", "trustedadvisor"], ["Health Dashboard", "health"], ["AWS Health", "health"], ["Service Quotas", "servicequotas"],
];
const strip = (s) => s.replace(/\s*[(（][^)）]*[)）]\s*/g, " ").replace(/^(?:Amazon|AWS)\s+/, "").trim();
const terms = new Map(); // 語 → id
const add = (t, id) => {
  t = t.trim();
  if (t.length < 2 || !byId.has(id) || terms.has(t)) return;
  terms.set(t, id);
};
for (const [t, id] of ALIASES) add(t, id);
for (const s of SERVICES) {
  if (SKIP.has(s.id)) continue;
  const names = [s.name, s.full].filter(Boolean);
  for (const n of names) {
    const bare = strip(n);
    if (NEED_PREFIX.has(s.id)) {
      add("AWS " + bare, s.id);
      add("Amazon " + bare, s.id);
    } else if (!/^[A-Za-z]{1,2}$/.test(bare)) add(bare, s.id);
    const ab = n.match(/[(（]([A-Z][A-Za-z0-9 .-]{1,12})[)）]/);
    if (ab && !BAD_ABBR.has(ab[1]) && !/互換|旧/.test(ab[1])) add(ab[1].replace(/^AWS /, ""), s.id);
    for (const part of bare.split("/")) if (part !== bare && part.trim().length > 2) add(part, s.id);
  }
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s?");
const list = [...terms.keys()].sort((a, b) => b.length - a.length);
const RE = new RegExp(
  list.map((t) => (/^[A-Za-z0-9]/.test(t) ? "(?<![A-Za-z0-9])" : "") + esc(t) + (/[A-Za-z0-9]$/.test(t) ? "(?![A-Za-z0-9])" : "")).join("|"),
  "g",
);
const lookup = new Map([...terms].map(([t, id]) => [t.replace(/\s+/g, "").toLowerCase(), id]));

/** 文章中のサービス名: [{ start, end, id }](前の「AWS 」「Amazon 」も含める) */
export function findServices(text) {
  const out = [];
  if (!text) return out;
  for (const m of text.matchAll(RE)) {
    const id = lookup.get(m[0].replace(/\s+/g, "").toLowerCase());
    if (!id) continue;
    let start = m.index;
    const pre = text.slice(Math.max(0, start - 7), start).match(/(?:Amazon|AWS)\s?$/);
    if (pre) start -= pre[0].length;
    out.push({ start, end: m.index + m[0].length, id });
  }
  return out;
}
/** 文章に登場するサービスの id(登場順・重複なし) */
export function servicesIn(...texts) {
  const ids = [];
  for (const t of texts) for (const { id } of findServices(t)) if (!ids.includes(id)) ids.push(id);
  return ids;
}
