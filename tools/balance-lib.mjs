// 選択肢の文字数のバランス(正解だけが長くて見分けられる状態を防ぐ)の共通処理
import fs from "node:fs";
import path from "node:path";
export const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
export const L = (s) => [...s].length;
export const MIN = 0.85; // 不正解の選択肢は、正解の文字数のこの割合以上
export const MAX = 1.4; // 不正解の選択肢は、正解の文字数のこの割合以下(元からこれより長いものは除く)
export async function loadBank() {
  const { BANK } = await import(path.join(root, "data/bank/index.js"));
  const W = (await import(path.join(root, "data/why/index.js"))).default;
  return { BANK, W };
}
export const correctLen = (opts, ans) => ans.reduce((s, i) => s + L(opts[i]), 0) / ans.length;
/** 書き直しが必要か: 不正解の選択肢のどれかが正解の MIN 倍より短い */
export function needs(opts, ans) {
  const c = correctLen(opts, ans);
  return opts.some((o, i) => !ans.includes(i) && L(o) < c * MIN);
}
export function readJSON(f) {
  return JSON.parse(fs.readFileSync(f, "utf8"));
}
