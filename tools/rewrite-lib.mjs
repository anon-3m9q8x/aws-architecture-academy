// 資格問題の本番形式への書き直し(data/rewrite/<試験>-<n>.json)の共通処理
//   { 問題id: { q: 問題文, o: [選択肢...], a: [正解の番号...], e: 解説, why: { 不正解の番号: { why, mark: [...] } } } }
// 問題文は「状況 → 現状・課題 → 制約 → 問い」の長文シナリオ、選択肢は「〜します。」の 2 文程度の具体的な構成案。
import fs from "node:fs";
import path from "node:path";

export const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
export const rewriteDir = path.join(root, "data/rewrite");

/** すべての書き直しを読み込む(ファイル名順に後勝ち) */
export function loadRewrites() {
  const out = {};
  if (!fs.existsSync(rewriteDir)) return out;
  for (const f of fs.readdirSync(rewriteDir).filter((f) => f.endsWith(".json")).sort()) {
    Object.assign(out, JSON.parse(fs.readFileSync(path.join(rewriteDir, f), "utf8")));
  }
  return out;
}

/**
 * 試験レベルごとの目安(文字数)。本番試験と CloudTech の問題集を参考にした範囲。
 * stem: 問題文、opt: 選択肢 1 つ。
 */
export const TARGET = {
  professional: { stem: [280, 520], opt: [80, 240] }, // SAP / DOP
  specialty: { stem: [230, 460], opt: [70, 220] }, // ANS / SCS / MLA / DEA / AIP / AIB
  associate: { stem: [180, 380], opt: [55, 180] }, // SAA / SOA / DVA
  foundational: { stem: [90, 260], opt: [20, 120] }, // CLF / AIF
};
export function levelOf(code) {
  if (/^(SAP|DOP)/.test(code)) return "professional";
  if (/^(SAA|SOA|DVA)/.test(code)) return "associate";
  if (/^(CLF|AIF)/.test(code)) return "foundational";
  return "specialty";
}
