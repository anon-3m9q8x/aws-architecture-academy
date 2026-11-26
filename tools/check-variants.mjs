// 種類・発展形・関連機能(data/variants/part-NN.js)の形式検査。
// 使い方: node tools/check-variants.mjs            … 全 part
//         node tools/check-variants.mjs 07         … part-07 だけ
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "variants");
const only = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => /^part-\d+\.js$/.test(f) && (!only || f === `part-${only}.js`)).sort();
const KINDS = new Set(["種類", "機能", "発展"]);
let errors = 0, items = 0, services = 0, empty = [];
const seen = new Map();
const marksOk = (t) => (t.match(/==/g) || []).length % 2 === 0 && (t.match(/!!/g) || []).length % 2 === 0;
for (const f of files) {
  const { PART } = await import(pathToFileURL(path.join(dir, f)).href + "?" + Date.now());
  const err = (m) => { errors++; console.log(`✗ ${f}: ${m}`); };
  for (const [id, list] of Object.entries(PART)) {
    if (seen.has(id)) err(`${id} は ${seen.get(id)} にもあります`);
    seen.set(id, f);
    if (!Array.isArray(list)) { err(`${id}: 配列ではありません`); continue; }
    if (!list.length) { empty.push(id); continue; }
    services++;
    const names = new Set();
    list.forEach((v, i) => {
      items++;
      const at = `${id}[${i}] ${Array.isArray(v) ? v[0] : ""}`;
      if (!Array.isArray(v) || v.length !== 8) return err(`${at}: 要素数が 8 ではありません(${v?.length})`);
      const [name, kind, short, detail, use, point, specs, vs] = v;
      if (names.has(name)) err(`${at}: 名前が重複`);
      names.add(name);
      if (!KINDS.has(kind)) err(`${at}: 区分が不正(${kind})`);
      for (const [label, t, min, max] of [["名前", name, 2, 60], ["一言", short, 8, 45], ["詳しい説明", detail, 110, 330], ["使いどころ", use, 45, 190], ["ポイント", point, 60, 240], ["混同しやすいもの", vs, 40, 200]]) {
        if (typeof t !== "string") { err(`${at}: ${label} が文字列ではありません`); continue; }
        if (t.length < min) err(`${at}: ${label} が短すぎます(${t.length} < ${min})`);
        if (t.length > max) err(`${at}: ${label} が長すぎます(${t.length} > ${max})`);
        if (!marksOk(t)) err(`${at}: ${label} の == / !! が閉じていません`);
      }
      if (/==|!!/.test(name + short)) err(`${at}: 名前・一言に強調記法は使えません`);
      if (!Array.isArray(specs) || specs.length < 2 || specs.length > 4) err(`${at}: 押さえる仕様は 2〜4 個の配列`);
      else specs.forEach((b) => { if (typeof b !== "string" || b.length < 12 || b.length > 110 || !marksOk(b)) err(`${at}: 押さえる仕様の 1 行が不正(12〜110 字): ${String(b).slice(0, 30)}`); });
      const marks = ((detail + use + point + vs + (Array.isArray(specs) ? specs.join("") : "")).match(/==[^=]+?==|!![^!]+?!!/g) || []).length;
      if (marks < 1 || marks > 6) err(`${at}: 強調は 1〜6 か所(現在 ${marks})`);
    });
  }
}
console.log(`${files.length} ファイル / ${services} サービス / ${items} 項目 / 空 ${empty.length}${empty.length ? "(" + empty.join(",") + ")" : ""} / エラー ${errors}`);
process.exit(errors ? 1 : 0);
