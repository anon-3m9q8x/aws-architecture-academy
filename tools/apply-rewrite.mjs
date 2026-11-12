// 本番形式への書き直し(data/rewrite/*.json)を問題データ(data/bank/<試験>.js)と「なぜ間違い」(data/why/index.js)に反映する。
//   node tools/apply-rewrite.mjs
// 問題文・選択肢・正解・解説を置き換え、根拠ラインを新しい問題文から計算し直す。何度実行しても同じ結果になる。
// tools/apply-balance.mjs(文字数の書き直し)より後に実行する(書き直した問題は文字数の書き直しの対象外)。
import fs from "node:fs";
import path from "node:path";
import { evidenceLines, buildIdf } from "./question-lines.mjs";
import { root, loadRewrites } from "./rewrite-lib.mjs";

const RW = loadRewrites();
const bankDir = path.join(root, "data/bank");
const files = fs.readdirSync(bankDir).filter((f) => /^[A-Z]{3}-C\d\d\.js$/.test(f)).sort();
const banks = files.map((f) => {
  const file = path.join(bankDir, f);
  const src = fs.readFileSync(file, "utf8");
  const at = src.indexOf("export default ");
  return { file, head: src.slice(0, at), data: JSON.parse(src.slice(at + 15).trim().replace(/;$/, "")) };
});
const KEYS = "ABCDEFGH";
const toQ = (r) => ({
  question: r[5],
  options: Object.fromEntries(r[6].map((o, i) => [KEYS[i], o])),
  answer: r[7].map((i) => KEYS[i]),
  explanation: r[8],
});
let n = 0;
for (const b of banks) for (const r of b.data.q) {
  const w = RW[r[0]];
  if (!w) continue;
  r[5] = w.q;
  r[6] = w.o;
  r[7] = w.a;
  r[8] = w.e;
  n++;
}
// 根拠ラインは語の珍しさ(全問題の問題文から計算)を使うので、置き換え後に計算する
const idf = buildIdf(banks.flatMap((b) => b.data.q.map(toQ)));
for (const b of banks) {
  for (const r of b.data.q) if (RW[r[0]]) r[9] = evidenceLines(toQ(r), idf);
  fs.writeFileSync(b.file, b.head + `export default ${JSON.stringify(b.data)};\n`);
}
console.log(`本番形式の書き直し ${n} 問を反映`);
// 「なぜ間違い」も作り直す(data/why/parts と書き直しをまとめる)
await import("./build-why.mjs");
