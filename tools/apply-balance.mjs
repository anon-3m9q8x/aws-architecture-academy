// 選択肢の書き直し(data/balance/*.json)を問題データ(data/bank/<試験>.js)に反映する。何度実行しても同じ結果になる。
//   node tools/apply-balance.mjs
// tools/build-questions.mjs で問題データを作り直したあとも、これを実行すれば書き直しが戻る。
import fs from "node:fs";
import path from "node:path";
import { root, readJSON } from "./balance-lib.mjs";
import { loadRewrites } from "./rewrite-lib.mjs";
const dir = path.join(root, "data/balance");
const patch = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) Object.assign(patch, readJSON(path.join(dir, f)));
// 本番形式に書き直した問題(data/rewrite)は選択肢ごと置き換わるので、文字数の書き直しは当てない
for (const id of Object.keys(loadRewrites())) delete patch[id];
const bankDir = path.join(root, "data/bank");
let changed = 0;
for (const f of fs.readdirSync(bankDir).filter((f) => /^[A-Z]{3}-C\d\d\.js$/.test(f))) {
  const file = path.join(bankDir, f);
  const src = fs.readFileSync(file, "utf8");
  const at = src.indexOf("export default ");
  const head = src.slice(0, at);
  const data = JSON.parse(src.slice(at + 15).trim().replace(/;$/, ""));
  for (const r of data.q) {
    const p = patch[r[0]];
    if (!p) continue;
    for (const [i, text] of Object.entries(p)) if (r[6][i] !== text) { r[6][i] = text; changed++; }
  }
  fs.writeFileSync(file, head + `export default ${JSON.stringify(data)};\n`);
}
console.log(`書き直し ${Object.keys(patch).length} 問 · 反映した選択肢 ${changed}`);
// 本番形式の書き直しを最後に反映する
await import("./apply-rewrite.mjs");
