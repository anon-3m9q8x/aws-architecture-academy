// data/glossary-marks/*.json(用語集の重要ライン)をまとめて data/glossary-marks.js を作る: node tools/build-glossary-marks.mjs
import fs from "fs"; import path from "path";
const dir = "data/glossary-marks"; const out = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort())
  for (const x of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) {
    const o = {}; for (const k of ["body", "example", "exam", "warn"]) if ((x[k] || []).length) o[k] = x[k];
    out[x.id] = o;
  }
fs.writeFileSync("data/glossary-marks.js", "// 用語集の重要ライン(自動生成: node tools/build-glossary-marks.mjs。元データは data/glossary-marks/*.json)\nexport default " + JSON.stringify(out) + ";\n");
console.log("OK", Object.keys(out).length, "terms");
