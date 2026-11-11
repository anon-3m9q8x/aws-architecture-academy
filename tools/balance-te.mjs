// 書き足しの「〜して、」「〜えて、」などの「て、」つなぎを「〜し、」「〜え、」に直す(正解の選択肢では少ない書き方のため)。
// 元の本文にあった箇所と、下線部分(marks)が崩れる場合は変えない。
//   node tools/balance-te.mjs
import fs from "node:fs";
import path from "node:path";
import { root, loadBank, readJSON, L, MIN, correctLen } from "./balance-lib.mjs";
const { BANK, W } = await loadBank();
const rows = new Map(BANK.flatMap((e) => e.q.map((r) => [r[0], r])));
const SKIP = /(とし|すべ|改め|初め|極め|あえ|見|み)て、$/;
const dir = path.join(root, "data/balance");
let changed = 0, kept = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const file = path.join(dir, f);
  const patch = readJSON(file);
  for (const [id, p] of Object.entries(patch)) {
    const r = rows.get(id);
    for (const [i, text] of Object.entries(p)) {
      if (r[7].includes(Number(i))) continue;
      const orig = r[6][i];
      const next = text.replace(/(.{0,3})([しえせけめべ]|立て|て)て、/g, (all, pre, k, at, s) => {
        const ctx = all;
        if (orig.includes(ctx) || SKIP.test(pre + k + "て、")) return all;
        return pre + k + "、";
      });
      if (next === text) continue;
      const marks = W[id]?.[i]?.[1] || [];
      const opts = r[6].map((o, j) => p[j] ?? o);
      const okLen = L(next) >= correctLen(opts, r[7]) * MIN;
      if (okLen && marks.every((m) => next.includes(m))) { p[i] = next; changed++; } else kept++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(patch, null, 1) + "\n");
}
console.log(`「て、」を直した選択肢 ${changed} · 下線部分が崩れる・短くなりすぎるため残した ${kept}`);
