// 書き直し(data/balance/<試験>-<n>.json: { 問題id: { 選択肢の番号: 新しい本文 } })を検証する。
//   node tools/check-balance.mjs <パッチ json> [作業ファイル json]
// 作業ファイルを渡すと、そこに含まれる問題がすべて基準を満たしているかも確認する。
import { loadBank, L, correctLen, MIN, MAX, SHORT, termOnly, readJSON } from "./balance-lib.mjs";
const [pf, wf] = process.argv.slice(2);
const patch = readJSON(pf);
const { BANK, W } = await loadBank();
const rows = new Map(BANK.flatMap((e) => e.q.map((r) => [r[0], r])));
const errors = [], warns = [];
// 正解の選択肢にほとんど出てこない書き方。不正解にだけ書き足すと新しい手掛かりになるので、元の本文に無いものは足さない
const STYLE = [[/。./, "文の途中の「。」(2 文)"], [/ため、/, "「〜ため、」"], [/よう(に)?、/, "「〜よう、」"], [/うえで/, "「〜うえで」"], [/ことで、/, "「〜ことで、」"],
  // 2 回目の言い換えで増えた前置き(目的・方針・前提を述べる決まり文句)
  [/として、|(構成|設定|運用|方針|体制|手順)とし|目的で|前提で|方針で|狙いで|狙い、|に向け|見込んで|見込み、|に備え/, "目的・方針・前提を述べる前置き(「〜として、」「〜目的で」「〜前提で」「〜構成とし」「〜に備え」など)"]];
const ids = wf ? readJSON(wf).map((x) => x.id) : Object.keys(patch);
let longest = 0, n = 0;
for (const id of Object.keys(patch)) if (!rows.has(id)) errors.push(`${id}: 存在しない問題`);
for (const id of ids) {
  const r = rows.get(id);
  if (!r) continue;
  const ans = r[7], orig = r[6], p = patch[id] || {};
  const opts = orig.map((o, i) => (p[i] ?? p[String(i)] ?? o));
  for (const k of Object.keys(p)) if (!(Number(k) in orig)) errors.push(`${id}: 選択肢 ${k} は存在しない`);
  opts.forEach((o, i) => {
    if (typeof o !== "string" || !o.trim() || /\n/.test(o)) errors.push(`${id}[${i}]: 本文が空か改行を含む`);
  });
  if (new Set(opts).size !== opts.length) errors.push(`${id}: 同じ本文の選択肢がある`);
  const c0 = correctLen(orig, ans), c = correctLen(opts, ans);
  ans.forEach((i) => {
    if (opts[i] !== orig[i] && L(opts[i]) < L(orig[i]) * 0.6) warns.push(`${id}[${i}]: 正解を大きく短くした (${L(orig[i])}→${L(opts[i])})`);
  });
  opts.forEach((o, i) => {
    if (ans.includes(i)) return;
    if (o !== orig[i]) STYLE.forEach(([re, name]) => re.test(o) && !re.test(orig[i]) && errors.push(`${id}[${i}]: 書き足しに${name}を使っている(正解にはほぼ無い書き方なので手掛かりになる)`));
    (W[id]?.[i]?.[1] || []).forEach((m) => !o.includes(m) && errors.push(`${id}[${i}]: 下線部分「${m}」が本文に残っていない`));
    const len = L(o);
    if (c <= SHORT || termOnly(orig)) return;
    if (len < c * MIN) errors.push(`${id}[${i}]: 短すぎる ${len} 字(正解 ${Math.round(c)} 字 → ${Math.ceil(c * MIN)} 字以上)`);
    if (len > c * MAX && len > L(orig[i])) errors.push(`${id}[${i}]: 長すぎる ${len} 字(${Math.floor(c * MAX)} 字以下)`);
  });
  if (ans.length === 1) {
    n++;
    const ci = L(opts[ans[0]]);
    if (opts.every((o, i) => i === ans[0] || L(o) < ci)) longest++;
  }
}
const rate = n ? Math.round((longest / n) * 100) : 0;
console.log(`問題 ${ids.length} / 書き直し ${Object.keys(patch).length} 問 · 単一選択で正解が最長: ${rate}% (目安 15〜35%)`);
if (n >= 20 && (rate < 10 || rate > 40)) errors.push(`正解が最長になる割合 ${rate}% が目安(15〜35%)から外れている`);
warns.forEach((w) => console.log("注意:", w));
errors.slice(0, 80).forEach((e) => console.log("エラー:", e));
if (errors.length) { console.log(`エラー ${errors.length} 件`); process.exit(1); }
console.log("OK");
