// AWS 認定の全試験(2026-11-06 時点の公式試験ガイドで確認)。
// real: [実試験の問題数(採点対象外を含む), 試験時間(分)] / domains: [分野名, 配点比率%] / scored: 採点対象の問題数(公式の記載。不明な試験は同レベルの値で推定)
// 出典: https://docs.aws.amazon.com/aws-certification/latest/examguides/aws-certification-exam-guides.html
const G = "https://docs.aws.amazon.com/aws-certification/latest/";
export const LEVELS = ["Foundational", "Business", "Associate", "Professional", "Specialty"];
export const EXAMS = [
  { code: "CLF-C02", real: [65, 90], family: "CLF", level: "Foundational", name: "Cloud Practitioner", scored: 50, guide: G + "cloud-practitioner-02/cloud-practitioner-02.html",
    domains: [["クラウドの概念", 24], ["セキュリティとコンプライアンス", 30], ["クラウドテクノロジーとサービス", 34], ["請求・料金・サポート", 12]] },
  { code: "AIF-C01", real: [65, 90], family: "AIF", level: "Foundational", name: "AI Practitioner", scored: 50, guide: G + "ai-practitioner-01/ai-practitioner-01.html",
    domains: [["AI と ML の基礎", 20], ["生成 AI の基礎", 24], ["基盤モデルの活用", 28], ["責任ある AI のガイドライン", 14], ["AI ソリューションのセキュリティ・コンプライアンス・ガバナンス", 14]] },
  { code: "AIB-C01", real: [65, 130], family: "AIB", level: "Business", name: "AI Business Strategist", scored: 50, scoredEstimated: true, guide: G + "ai-business-strategist-01/ai-business-strategist-01.html",
    domains: [["AI の基礎とリテラシー", 24], ["AI 戦略とビジネス価値の創出", 28], ["AI ガバナンスと責任ある AI", 24], ["組織の準備・リーダーシップ・AI 変革", 24]] },
  { code: "SAA-C03", real: [65, 130], family: "SAA", level: "Associate", name: "Solutions Architect - Associate", scored: 50, guide: G + "examguides/solutions-architect-associate-03.html",
    domains: [["セキュアなアーキテクチャ", 30], ["回復性のあるアーキテクチャ", 26], ["高性能なアーキテクチャ", 24], ["コスト最適化されたアーキテクチャ", 20]] },
  { code: "SOA-C03", real: [65, 130], family: "SOA", level: "Associate", name: "CloudOps Engineer - Associate", scored: 50, guide: G + "sysops-administrator-associate-03/sysops-administrator-associate-03.html",
    domains: [["監視・ログ・分析・修復・性能最適化", 22], ["信頼性と事業継続", 22], ["デプロイ・プロビジョニング・自動化", 22], ["セキュリティとコンプライアンス", 16], ["ネットワークとコンテンツ配信", 18]] },
  { code: "DEA-C01", real: [65, 130], family: "DEA", level: "Associate", name: "Data Engineer - Associate", scored: 50, guide: G + "data-engineer-associate-01/data-engineer-associate-01.html",
    domains: [["データの取り込みと変換", 34], ["データストアの管理", 26], ["データの運用とサポート", 22], ["データのセキュリティとガバナンス", 18]] },
  { code: "DVA-C03", real: [65, 130], family: "DVA", level: "Associate", name: "Developer - Associate", scored: 50, guide: G + "developer-associate-03/developer-associate-03.html",
    domains: [["AWS サービスを使った開発", 30], ["セキュリティ", 26], ["テストとデプロイ", 22], ["トラブルシューティングと最適化", 22]] },
  { code: "DVA-C02", real: [65, 130], family: "DVA", level: "Associate", name: "Developer - Associate(旧版)", scored: 50, retire: "2026-11-30", guide: G + "developer-associate-02/developer-associate-02.html",
    domains: [["AWS サービスを使った開発", 32], ["セキュリティ", 26], ["デプロイ", 24], ["トラブルシューティングと最適化", 18]] },
  { code: "MLA-C02", real: [65, 130], family: "MLA", level: "Associate", name: "Machine Learning Engineer - Associate", scored: 50, guide: G + "machine-learning-engineer-associate-02/machine-learning-engineer-associate-02.html",
    domains: [["ML と AI のデータ準備", 28], ["ML モデルと基盤モデルの開発", 24], ["ML / AI ワークフローのデプロイとオーケストレーション", 24], ["ML / AI の運用・監視・保護", 24]] },
  { code: "SAP-C03", real: [75, 180], family: "SAP", level: "Professional", name: "Solutions Architect - Professional", scored: 65, guide: G + "solutions-architect-professional-03/solutions-architect-professional-03.html",
    domains: [["クラウド向けのアーキテクチャ設計と実装", 25], ["セキュリティ・コンプライアンス・ガバナンス", 25], ["コスト最適化されたアーキテクチャ設計", 15], ["回復性・移行・事業継続", 15], ["運用上の優秀性と自動化", 20]] },
  { code: "SAP-C02", real: [75, 180], family: "SAP", level: "Professional", name: "Solutions Architect - Professional(旧版)", scored: 65, retire: "2026-11-16", guide: G + "solutions-architect-professional-02/solutions-architect-professional-02.html",
    domains: [["組織の複雑さに対応する設計", 26], ["新しいソリューションの設計", 29], ["既存ソリューションの継続的改善", 25], ["ワークロードの移行とモダナイズ", 20]] },
  { code: "DOP-C02", real: [75, 180], family: "DOP", level: "Professional", name: "DevOps Engineer - Professional", scored: 65, guide: G + "devops-engineer-professional-02/devops-engineer-professional-02.html",
    domains: [["SDLC の自動化", 22], ["構成管理と IaC", 17], ["回復性のあるクラウドソリューション", 15], ["監視とログ", 15], ["インシデントとイベントへの対応", 14], ["セキュリティとコンプライアンス", 17]] },
  { code: "AIP-C01", real: [75, 180], family: "AIP", level: "Professional", name: "Generative AI Developer - Professional", scored: 65, scoredEstimated: true, guide: G + "ai-professional-01/ai-professional-01.html",
    domains: [["基盤モデルの統合・データ管理・コンプライアンス", 31], ["実装と統合", 26], ["AI の安全性・セキュリティ・ガバナンス", 20], ["生成 AI アプリの運用効率と最適化", 12], ["テスト・検証・トラブルシューティング", 11]] },
  { code: "ANS-C01", real: [65, 170], family: "ANS", level: "Specialty", name: "Advanced Networking - Specialty", scored: 50, guide: G + "advanced-networking-specialty-01/advanced-networking-specialty-01.html",
    domains: [["ネットワーク設計", 30], ["ネットワーク実装", 26], ["ネットワークの管理と運用", 20], ["ネットワークのセキュリティ・コンプライアンス・ガバナンス", 24]] },
  { code: "SCS-C03", real: [65, 170], family: "SCS", level: "Specialty", name: "Security - Specialty", scored: 50, guide: G + "security-specialty-03/security-specialty-03.html",
    domains: [["検出", 16], ["インシデント対応", 14], ["インフラストラクチャのセキュリティ", 18], ["ID とアクセス管理", 20], ["データ保護", 18], ["セキュリティの基盤とガバナンス", 14]] },
];
export const examByCode = new Map(EXAMS.map((e) => [e.code, e]));

// 出題確率の推定: その分野の想定出題数 = 採点問題数 × 分野の配点比率。
// その論点が分野内で占める割合(中心 22% / 標準 9% / 周辺 3.5%)を掛けて期待出題数 λ とし、
// 「1 回の受験で少なくとも 1 問出る確率」= 1 - e^(-λ) とする。AWS は問題ごとの出題率を公開していないため、あくまで目安。
export const TIER = { core: ["中心の論点", 0.22], common: ["標準の論点", 0.09], niche: ["周辺の論点", 0.035] };
export function probability(q, code) {
  const m = q.exams?.[code];
  const ex = examByCode.get(code);
  if (!m || !ex) return null;
  const [d, tier] = m;
  const w = ex.domains[d - 1]?.[1] || 0;
  const lambda = ex.scored * (w / 100) * (TIER[tier]?.[1] || TIER.common[1]);
  return Math.round((1 - Math.exp(-lambda)) * 100);
}
export const probBand = (p) => (p === null ? null : p >= 85 ? "high" : p >= 60 ? "mid" : "low");
export const BAND_LABEL = { high: "高", mid: "中", low: "低" };
/** 問題が対象とする試験のうち、表示に使う既定の試験(最新版を優先) */
export function primaryExam(q) {
  const codes = Object.keys(q.exams || {});
  return EXAMS.find((e) => codes.includes(e.code))?.code || codes[0] || null;
}
