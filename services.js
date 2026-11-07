// 図鑑の全サービス = 学習ノート107項目 + 追加サービス(services-extra / services-sap / services-2026)。説明・連携・比較・キーワードを統合する。
import { notebook } from "./data/notebook.js";
import { META } from "./data/services-meta.js";
import { EXTRA } from "./data/services-extra.js";
import { LINKS } from "./data/links.js";
import { cues } from "./data/cues.js";
import { EXTRA_SAP } from "./data/services-sap.js";
import { EXTRA_2026 } from "./data/services-2026.js";
import { LINKS_SAP } from "./data/links-sap.js";
import { PATTERNS } from "./data/sap-patterns.js";
import { VARIANTS } from "./data/variants.js";
import { COMPARE } from "./data/compare-groups.js";
const EXTRA_ALL = { ...EXTRA, ...EXTRA_SAP, ...EXTRA_2026 };

// 図鑑のカテゴリ(表示順)と色
export const CATS = [
  ["コンピューティング", "orange"], ["ストレージ", "green"], ["データベース", "blue"], ["ネットワーク", "violet"],
  ["セキュリティ", "red"], ["アプリ統合", "pink"], ["分析", "teal"], ["運用・管理", "slate"], ["開発者ツール", "sky"],
  ["移行", "amber"], ["AI・機械学習", "purple"], ["IoT", "lime"], ["メディア", "rose"], ["エンドユーザー・業務", "cyan"],
  ["コスト管理", "olive"], ["その他", "gray"], ["一般概念", "gray"],
];
const CAT_COLOR = Object.fromEntries(CATS);
const CAT_FIX = {
  codepipeline: "開発者ツール", codebuild: "開発者ツール", codedeploy: "開発者ツール", xray: "開発者ツール",
  ce: "コスト管理", budgets: "コスト管理", connect: "エンドユーザー・業務", iotcore: "IoT",
  grafana: "一般概念", internet: "一般概念", user: "一般概念", onprem: "一般概念",
};
const ABBR = {
  ec2: "EC2", asg: "ASG", lambda: "λ", ecs: "ECS", s3: "S3", backup: "BKP", rds: "RDS", aurora: "AUR", dynamodb: "DDB", elasticache: "EC$",
  vpc: "VPC", alb: "ALB", cloudfront: "CF", route53: "R53", apigw: "API", tgw: "TGW", dx: "DX", vpn: "VPN", vpce: "EP", sqs: "SQS", sns: "SNS",
  eventbridge: "EB", stepfn: "SFN", iam: "IAM", kms: "KMS", waf: "WAF", cognito: "ID", orgs: "ORG", cloudwatch: "CW", cloudtrail: "CT", config: "CFG",
  ssm: "SSM", cfn: "CFN", codepipeline: "CP", codebuild: "CB", codedeploy: "CD", ecr: "ECR", igw: "IGW", natgw: "NAT", eigw: "EIGW", internet: "◎",
  user: "◎", onprem: "DC", acm: "ACM", eks: "EKS", beanstalk: "EB", ebs: "EBS", efs: "EFS", fsx: "FSx", storagegw: "SGW", redshift: "RS",
  kinesis: "KDS", firehose: "FH", athena: "ATH", glue: "GLU", opensearch: "OS", nlb: "NLB", globalacc: "GA", vpcpeer: "PCX", secrets: "SM",
  shield: "SHD", guardduty: "GD", sso: "SSO", controltower: "CTW", xray: "XR", trustedadvisor: "TA", mq: "MQ", dms: "DMS", datasync: "DS",
  snowball: "SNW", mgn: "MGN", fargate: "FG", batch: "BAT", apprunner: "AR", glacier: "GLC", neptune: "NEP", timestream: "TS", emr: "EMR",
  msk: "MSK", quicksight: "QS", lakeformation: "LF", networkfirewall: "NFW", inspector: "INS", macie: "MAC", securityhub: "SH", cloudhsm: "HSM",
  directory: "AD", appsync: "GQL", ses: "SES", servicecatalog: "SC", ce: "CE", budgets: "$", billing: "BCM", transfer: "SFTP", migrationhub: "MH", bedrock: "BR",
  sagemaker: "SGM", rekognition: "REK", textract: "TXT", transcribe: "TRN", iotcore: "IoT", connect: "CC", fwm: "FMS", grafana: "GF", mgrafana: "AMG",
  sct: "SCT", dlm: "DLM", migeval: "ME", lambdaedge: "λ@E", rdsproxy: "PXY", dax: "DAX", cwlogs: "LOG", sts: "STS", gwlb: "GWLB", privateca: "PCA", cdk: "CDK", sam: "SAM",
};

const notes = new Map(notebook.services.map((s) => [s.id, s]));
export const SERVICES = [];
for (const nb of notebook.services) {
  const m = META[nb.id] || [nb.name, "", nb.purpose];
  SERVICES.push({
    id: nb.id, name: nb.name, full: m[0], doc: m[1], summary: m[2], cat: CAT_FIX[nb.id] || nb.category,
    purpose: nb.purpose, features: nb.features || [], useCases: nb.useCases, tip: nb.tip, note: true,
  });
}
for (const [id, x] of Object.entries(EXTRA_ALL)) {
  SERVICES.push({ id, name: x.n, full: x.f, doc: x.d, summary: x.s, cat: x.c === "IoT・エンドユーザー" ? "IoT" : x.c, purpose: x.p, features: x.ft || [], useCases: x.u, tip: x.t, note: false });
}
const order = new Map(CATS.map(([c], i) => [c, i]));
SERVICES.sort((a, b) => (order.get(a.cat) ?? 99) - (order.get(b.cat) ?? 99) || a.name.localeCompare(b.name, "ja"));
export const byId = new Map(SERVICES.map((s) => [s.id, s]));
SERVICES.forEach((s) => {
  s.color = CAT_COLOR[s.cat] || "gray";
  s.abbr = ABBR[s.id] || (s.name.replace(/^(Amazon |AWS )/, "").match(/[A-Z0-9]/g) || [s.name.slice(0, 2)]).join("").slice(0, 3) || s.name.slice(0, 2);
  s.cues = cues[s.id] || null;
  s.variants = VARIANTS[s.id] || [];
});

// 連携(双方向に引けるようにする)
const rel = new Map(SERVICES.map((s) => [s.id, []]));
function addRel(a, b, label, dir) {
  if (!rel.has(a) || !byId.has(b) || a === b) return;
  const list = rel.get(a);
  if (list.some((r) => r.id === b)) return;
  list.push({ id: b, label, dir, detail: linkDetail(a, b) });
}
export function linkDetail(a, b) {
  return LINKS[`${a}|${b}`] || LINKS[`${b}|${a}`] || LINKS_SAP[`${a}|${b}`] || LINKS_SAP[`${b}|${a}`] || null;
}
for (const e of notebook.edges) {
  addRel(e.from, e.to, e.label, "out");
  addRel(e.to, e.from, e.label, "in");
}
for (const [id, x] of Object.entries(EXTRA_ALL))
  for (const [to, label] of x.l || []) {
    addRel(id, to, label, "out");
    addRel(to, id, label, "in");
  }
// SAP 設計パターンの流れも連携として登録(パターン内の矢印 = 実際に設計される接続)
for (const p of PATTERNS)
  for (const [a, b, label] of p.s) {
    const x = p.n[a][0], y = p.n[b][0];
    if (["user", "internet", "onprem"].includes(x) && ["user", "internet", "onprem"].includes(y)) continue;
    addRel(x, y, `${label}(${p.id})`, "out");
    addRel(y, x, `${label}(${p.id})`, "in");
  }
// 詳細解説のある連携を先頭に
rel.forEach((list) => list.sort((p, q) => (q.detail ? 1 : 0) - (p.detail ? 1 : 0)));
export const relsOf = (id) => rel.get(id) || [];
export const compsOf = (id) => notebook.comparisons.filter((c) => c.a === id || c.b === id);
export const metaOf = (id) => {
  const s = byId.get(id);
  return s ? { name: s.name, color: s.color, abbr: s.abbr } : id === "user" ? { name: "ユーザー", color: "gray", abbr: "◎" } : null;
};
export const isNote = (id) => notes.has(id);
export const serviceCount = SERVICES.filter((s) => s.cat !== "一般概念").length;

// サービスが登場する SAP 設計パターン
export const patternsOf = (id) => PATTERNS.filter((p) => p.n.some(([svc]) => svc === id));

// 類似サービスの比較グループ(このサービスを含むもの)
export const groupsOf = (id) => COMPARE.filter((g) => g.pts[id]);
export { COMPARE };
