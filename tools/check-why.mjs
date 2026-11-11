// 選択肢ごとの「なぜ間違いか」データを検証する。
//   node tools/check-why.mjs <入力 JSON(問題)> <出力 JSON(理由)>   … 1 ファイルを検証
//   node tools/check-why.mjs                                         … data/why/parts/*.json をすべて検証
// 出力 JSON の形式: { "<問題 id>": { "<不正解の選択肢の番号(0 始まり)>": { "why": "理由", "mark": ["選択肢の本文の一部(完全一致)"] } } }
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

async function bankQuestions() {
  const map = new Map();
  for (const f of fs.readdirSync(path.join(root, "data/bank")).filter((f) => !/index|SERVICE/.test(f))) {
    const m = (await import(path.join(root, "data/bank", f))).default;
    for (const r of m.q) map.set(r[0], { id: r[0], choices: r[6], answer: r[7] });
  }
  return map;
}

export function checkWhy(questions, data) {
  const errors = [];
  for (const q of questions) {
    const entry = data[q.id];
    if (!entry) {
      errors.push(`${q.id}: 理由がありません`);
      continue;
    }
    q.choices.forEach((text, i) => {
      const e = entry[String(i)];
      if (q.answer.includes(i)) {
        if (e) errors.push(`${q.id}[${i}]: 正解の選択肢には理由を付けません`);
        return;
      }
      if (!e) return errors.push(`${q.id}[${i}]: 理由がありません`);
      if (typeof e.why !== "string" || e.why.length < 20 || e.why.length > 220) errors.push(`${q.id}[${i}]: 理由は 20〜220 文字にしてください(${e.why?.length})`);
      if (!Array.isArray(e.mark) || !e.mark.length || e.mark.length > 3) return errors.push(`${q.id}[${i}]: mark は 1〜3 個の配列にしてください`);
      for (const m of e.mark) {
        if (typeof m !== "string" || m.length < 2) errors.push(`${q.id}[${i}]: mark が短すぎます`);
        else if (!text.includes(m)) errors.push(`${q.id}[${i}]: mark「${m}」が選択肢の本文にありません`);
      }
      const marked = e.mark.reduce((a, m) => a + (m?.length || 0), 0);
      if (text.length > 25 && marked >= text.length * 0.9) errors.push(`${q.id}[${i}]: 選択肢全体ではなく、間違いに直結する部分だけに mark を付けてください`);
    });
    for (const k of Object.keys(entry)) if (!(Number(k) >= 0 && Number(k) < q.choices.length)) errors.push(`${q.id}: 選択肢の番号 ${k} は存在しません`);
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [inFile, outFile] = process.argv.slice(2);
  let errors = [];
  if (inFile) {
    const qs = JSON.parse(fs.readFileSync(inFile, "utf8"));
    errors = checkWhy(qs, JSON.parse(fs.readFileSync(outFile, "utf8")));
  } else {
    const all = await bankQuestions();
    const dir = path.join(root, "data/why/parts");
    const merged = {};
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) Object.assign(merged, JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
    errors = checkWhy([...all.values()], merged);
  }
  if (errors.length) {
    console.log(errors.slice(0, 80).join("\n"));
    console.log(`NG: ${errors.length} 件`);
    process.exit(1);
  }
  console.log("OK");
}
