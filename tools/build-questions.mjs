// 資格問題演習のデータを、問題集 JSON(AWS 全資格 オリジナル問題集 v2)から生成する。
//   node tools/build-questions.mjs <問題集の json フォルダ>
// 問題文・選択肢・正解・解説・分野・トピック・難易度・論点は資料のまま変更しない。
// 追加するのは「根拠ライン」(問題文のどの部分から正解が導けるか: [開始, 終了, 種類, 対応する解説の文番号])だけ。
// 生成後に tools/apply-balance.mjs を実行し、文字数をそろえた不正解の選択肢(data/balance/*.json)を反映する。
import fs from "node:fs";
import path from "node:path";
import { evidenceLines, buildIdf } from "./question-lines.mjs";

const src = process.argv[2];
if (!src) {
  console.error("usage: node tools/build-questions.mjs <json dir>");
  process.exit(1);
}
const outDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../data/bank");
fs.mkdirSync(outDir, { recursive: true });
const files = fs.readdirSync(src).filter((f) => f.endsWith(".json")).sort();
const exams = files.map((f) => JSON.parse(fs.readFileSync(path.join(src, f), "utf8")));
const idf = buildIdf(exams.flatMap((e) => e.questions));
const DIFF = { 基礎: 1, 標準: 2, 応用: 3 };
const index = [];
let total = 0;
for (const ex of exams) {
  const topics = [...new Set(ex.questions.map((q) => q.topic))];
  const rows = ex.questions.map((q) => {
    const keys = Object.keys(q.options);
    if (!DIFF[q.difficulty]) throw new Error(`${q.id}: 不明な難易度 ${q.difficulty}`);
    const ans = q.answer.map((k) => keys.indexOf(k));
    if (ans.some((i) => i < 0)) throw new Error(`${q.id}: 正解が選択肢にない`);
    const d = Number(q.domain.replace(/^D/, ""));
    return [q.id, d, topics.indexOf(q.topic), DIFF[q.difficulty], q.concept, q.question, keys.map((k) => q.options[k]), ans, q.explanation, evidenceLines(q, idf)];
  });
  total += rows.length;
  const name = ex.exam_code;
  const body =
    `// ${name} ${ex.exam_name} — ${rows.length} 問(AWS 全資格 オリジナル問題集 v2 / 2026-11 の公式試験ガイドに準拠)\n` +
    `// 自動生成: tools/build-questions.mjs。行: [id, 分野番号, トピック番号, 難易度(1 基礎 / 2 標準 / 3 応用), 論点, 問題文, 選択肢, 正解の番号, 解説, 根拠ライン]\n` +
    `export default ${JSON.stringify({ code: name, topics, q: rows })};\n`;
  fs.writeFileSync(path.join(outDir, `${name}.js`), body);
  index.push(name);
}
fs.writeFileSync(
  path.join(outDir, "index.js"),
  `// 自動生成: tools/build-questions.mjs\n` + index.map((n, i) => `import e${i} from "./${n}.js";`).join("\n") + `\nexport const BANK = [${index.map((_, i) => "e" + i).join(", ")}];\n`,
);
console.log(`${index.length} 試験 / ${total} 問 → ${outDir}`);
await import("./apply-balance.mjs");
