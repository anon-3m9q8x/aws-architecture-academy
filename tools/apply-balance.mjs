// 選択肢の書き直し(data/balance/*.json)を問題データ(data/bank/<試験>.js)に反映する。何度実行しても同じ結果になる。
//   node tools/apply-balance.mjs
// tools/build-questions.mjs で問題データを作り直したあとも、これを実行すれば書き直しが戻る。
import fs from "node:fs";
import path from "node:path";
import { root, readJSON } from "./balance-lib.mjs";
const dir = path.join(root, "data/balance");
const patch = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) Object.assign(patch, readJSON(path.join(dir, f)));
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
