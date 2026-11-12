// 本番形式の書き直し(data/rewrite/*.json)を検証する。
//   node tools/check-rewrite.mjs [ファイル名...]   (省略時はすべて)
// 確認すること: 形式・正解の番号・不正解すべての理由と下線部分・文字数(試験レベルの目安)・
// 選択肢の書き方(「〜します。」の文)・正解だけが長い/短いといった見分けの手掛かり。
import fs from "node:fs";
import path from "node:path";
import { root, rewriteDir, TARGET, levelOf } from "./rewrite-lib.mjs";

const L = (s) => [...s].length;
const only = process.argv.slice(2);
const files = fs.readdirSync(rewriteDir).filter((f) => f.endsWith(".json") && (!only.length || only.includes(f))).sort();
const { BANK } = await import(path.join(root, "data/bank/index.js"));
const ids = new Set(BANK.flatMap((e) => e.q.map((r) => r[0])));
const errors = [], warns = [];
let n = 0, longest = 0, single = 0;
const stems = [], opts = [];
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(rewriteDir, f), "utf8"));
  for (const [id, w] of Object.entries(data)) {
    n++;
    const t = TARGET[levelOf(id)];
    if (!ids.has(id)) errors.push(`${id}: 存在しない問題`);
    if (typeof w.q !== "string" || typeof w.e !== "string" || !Array.isArray(w.o) || !Array.isArray(w.a)) { errors.push(`${id}: 形式が違う`); continue; }
    if (w.o.length < 4 || w.o.length > 6) errors.push(`${id}: 選択肢は 4〜6 個`);
    if (new Set(w.o).size !== w.o.length) errors.push(`${id}: 同じ本文の選択肢がある`);
    if (!w.a.length || w.a.some((i) => !(i in w.o))) errors.push(`${id}: 正解の番号が不正`);
    if (w.a.length > 1 && !/(2 つ|3 つ|二つ|三つ)/.test(w.q)) errors.push(`${id}: 複数選択なのに問題文に選ぶ数がない`);
    const sl = L(w.q);
    stems.push(sl);
    if (sl < t.stem[0] || sl > t.stem[1]) errors.push(`${id}: 問題文 ${sl} 字(目安 ${t.stem[0]}〜${t.stem[1]} 字)`);
    if (!/(どれですか|選んでください|選択してください|どの方法|どの構成)/.test(w.q)) warns.push(`${id}: 問いの文の形が本番と違う`);
    if ((w.q.match(/。/g) || []).length < 4 && levelOf(id) !== "foundational") errors.push(`${id}: 問題文が短いシナリオ(状況・課題・制約・問いの 4 文以上にする)`);
    w.o.forEach((o, i) => {
      const ol = L(o);
      opts.push(ol);
      if (/\n/.test(o)) errors.push(`${id}[${i}]: 改行を含む`);
      if (ol < t.opt[0] || ol > t.opt[1]) errors.push(`${id}[${i}]: 選択肢 ${ol} 字(目安 ${t.opt[0]}〜${t.opt[1]} 字)`);
      if (levelOf(id) !== "foundational" && !/。$/.test(o)) errors.push(`${id}[${i}]: 選択肢は「〜します。」の文で終える`);
      if (w.a.includes(i)) return;
      const y = w.why?.[i] ?? w.why?.[String(i)];
      if (!y || !y.why) { errors.push(`${id}[${i}]: 不正解の理由がない`); return; }
      (y.mark || []).forEach((m) => !o.includes(m) && errors.push(`${id}[${i}]: 下線部分「${m}」が選択肢にない`));
      if (!(y.mark || []).length) errors.push(`${id}[${i}]: 下線部分がない`);
    });
    Object.keys(w.why || {}).forEach((k) => w.a.includes(Number(k)) && errors.push(`${id}: 正解 ${k} に不正解の理由がある`));
    // 見分けの手掛かり: 正解が不正解の平均より 25% 以上長い/短い
    const c = w.a.reduce((s, i) => s + L(w.o[i]), 0) / w.a.length;
    const wrong = w.o.filter((_, i) => !w.a.includes(i)).map(L);
    const avg = wrong.reduce((s, x) => s + x, 0) / wrong.length;
    if (c > avg * 1.25) errors.push(`${id}: 正解だけが長い(正解 ${Math.round(c)} 字 / 不正解の平均 ${Math.round(avg)} 字)`);
    if (c < avg * 0.75) errors.push(`${id}: 正解だけが短い(正解 ${Math.round(c)} 字 / 不正解の平均 ${Math.round(avg)} 字)`);
    if (w.a.length === 1) {
      single++;
      if (wrong.every((x) => x < c)) longest++;
    }
  }
}
const med = (a) => a.sort((x, y) => x - y)[a.length >> 1] || 0;
const rate = single ? Math.round((longest / single) * 100) : 0;
console.log(`書き直し ${n} 問 · 問題文の中央値 ${med(stems)} 字 · 選択肢の中央値 ${med(opts)} 字 · 正解が最長の割合 ${rate}%(目安 15〜40%)`);
if (single >= 10 && (rate < 10 || rate > 45)) errors.push(`正解が最長になる割合 ${rate}% が目安から外れている`);
warns.forEach((w) => console.log("注意:", w));
errors.forEach((e) => console.log("エラー:", e));
if (errors.length) { console.log(`エラー ${errors.length} 件`); process.exit(1); }
console.log("OK");
