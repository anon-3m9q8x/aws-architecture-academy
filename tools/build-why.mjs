// 不正解の選択肢ごとの「なぜ間違いか」と「間違いに直結する部分(下線)」を、演習用のデータにまとめる。
//   node tools/build-why.mjs
// 入力: data/why/parts/*.json({ 問題id: { 選択肢の番号: { why, mark: [...] } } }。tools/check-why.mjs で検証済みのもの)
// 出力: data/why/index.js({ 問題id: { 選択肢の番号: [理由, [下線を引く部分...]] } })
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dir = path.join(root, "data/why/parts");
const out = {};
let n = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const [id, entry] of Object.entries(data)) {
    out[id] = {};
    for (const [i, { why, mark }] of Object.entries(entry)) {
      out[id][i] = [why, mark];
      n++;
    }
  }
}
fs.writeFileSync(
  path.join(root, "data/why/index.js"),
  `// 自動生成: tools/build-why.mjs(${Object.keys(out).length} 問・${n} 選択肢)。{ 問題id: { 不正解の選択肢の番号: [なぜ間違いか, [間違いに直結する部分...]] } }\n` +
    `export default ${JSON.stringify(out)};\n`,
);
console.log(`data/why/index.js: ${Object.keys(out).length} 問・${n} 選択肢`);
