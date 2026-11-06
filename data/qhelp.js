// 追加問題の作成ヘルパー。選択肢は [テキスト, 解説] で、正解のテキストは先頭に "*" を付ける。
// ex: { "試験コード": [試験ガイドの分野番号(1 始まり), "core" | "common" | "niche"] }
import { examByCode } from "./exams.js";
const REVIEW = "独自教材・公式出典付き(試験ガイドと公式ドキュメントで照合 / 専門家レビュー未実施)";
export function mk(id, area, lv, ex, prompt, choices, source) {
  const cs = choices.map(([t, e]) => ({ text: t.replace(/^\*/, ""), explanation: e, correct: t.startsWith("*") }));
  const fams = [...new Set(Object.keys(ex).map((c) => examByCode.get(c)?.family).filter(Boolean))];
  return {
    id, prompt, domain: area, difficulty: lv, exams: ex,
    certification: fams[0], certifications: fams,
    selectCount: cs.filter((c) => c.correct).length, choices: cs, source, reviewStatus: REVIEW,
  };
}
// SAP は C03(新)と C02(旧)で分野が違うため両方を指定する
export const sap = (c03, c02, tier = "common") => ({ "SAP-C03": [c03, tier], "SAP-C02": [c02, tier] });
// DVA は C03 と C02 で分野の並びが同じ
export const dva = (d, tier = "common") => ({ "DVA-C03": [d, tier], "DVA-C02": [d, tier] });
export const D = "https://docs.aws.amazon.com/";
