// 書き直しが必要な問題を、作業用のファイルに書き出す。
//   node tools/balance-extract.mjs <出力フォルダ> [分割数=2]
import fs from "node:fs";
import path from "node:path";
import { loadBank, needs, L, correctLen, MIN, MAX } from "./balance-lib.mjs";
const out = process.argv[2];
const parts = Number(process.argv[3] || 2);
fs.mkdirSync(out, { recursive: true });
const { BANK, W } = await loadBank();
let total = 0;
for (const e of BANK) {
  const list = e.q
    .filter((r) => needs(r[6], r[7]))
    .map(([id, , ti, , concept, prompt, opts, ans]) => {
      const c = correctLen(opts, ans);
      return {
        id, topic: e.topics[ti], concept, prompt, answer: ans,
        target: { min: Math.ceil(c * MIN), max: Math.floor(c * MAX) },
        choices: opts.map((text, i) => ({ i, text, len: L(text), correct: ans.includes(i), ...(ans.includes(i) ? {} : { why: W[id]?.[i]?.[0] || "", marks: W[id]?.[i]?.[1] || [] }) })),
      };
    });
  total += list.length;
  const size = Math.ceil(list.length / parts);
  for (let p = 0; p < parts; p++) {
    const chunk = list.slice(p * size, (p + 1) * size);
    if (chunk.length) fs.writeFileSync(path.join(out, `${e.code}-${p + 1}.json`), JSON.stringify(chunk, null, 1));
  }
  console.log(e.code, list.length, "/", e.q.length);
}
console.log("total", total);
