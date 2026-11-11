// 選択肢の文字数のバランス(正解だけが長くて見分けられる状態を防ぐ)の共通処理
import fs from "node:fs";
import path from "node:path";
export const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
export const L = (s) => [...s].length;
export const MIN = 0.85; // 不正解の選択肢は、正解の文字数のこの割合以上
export const MAX = 1.4;
export const SHORT = 12; // 正解がこの文字数以下(用語だけの選択肢)は、数文字の差では見分けられないので対象外 // 不正解の選択肢は、正解の文字数のこの割合以下(元からこれより長いものは除く)
export async function loadBank() {
  const { BANK } = await import(path.join(root, "data/bank/index.js"));
  const W = (await import(path.join(root, "data/why/index.js"))).default;
  return { BANK, W };
}
/** 選択肢がすべて用語だけ(空白・読点なしの 30 字以下: API 名やサービス名など)。説明を付け足すと逆に手掛かりになるので対象外 */
export const termOnly = (opts) => opts.every((o) => !/[\s、。]/.test(o) && L(o) <= 30);
export const correctLen = (opts, ans) => ans.reduce((s, i) => s + L(opts[i]), 0) / ans.length;
/** 書き直しが必要か: 不正解の選択肢のどれかが正解の MIN 倍より短い */
export function needs(opts, ans) {
  const c = correctLen(opts, ans);
  if (c <= SHORT || termOnly(opts)) return false;
  return opts.some((o, i) => !ans.includes(i) && L(o) < c * MIN);
}
export function readJSON(f) {
  return JSON.parse(fs.readFileSync(f, "utf8"));
}
