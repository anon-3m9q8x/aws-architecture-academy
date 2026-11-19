// 用語集の重要ライン(data/glossary-marks/*.json)を検査する: node tools/check-glossary-marks.mjs [ファイル...]
// 形式: [{ id, short?:bool, body:[語句], example:[語句], exam:[語句], warn:[語句] }]
// ・語句は解説の文章にそのまま含まれていること(完全一致)・同じ欄で重ならないこと・長さ 4〜60 字
import fs from "fs"; import path from "path";
import DATA from "../data/glossary-data.js";
const byId = new Map(DATA.map((t) => [t.id, t]));
const dir = "data/glossary-marks";
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f));
let bad = 0, n = 0; const seen = new Set();
const ng = (id, m) => { bad++; console.log("NG", id, m); };
for (const f of files) {
  let arr; try { arr = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { ng(f, "JSON: " + e.message); continue; }
  for (const x of arr) {
    n++; const t = byId.get(x.id); if (!t) { ng(x.id, "用語がありません"); continue; }
    if (seen.has(x.id)) ng(x.id, "重複"); seen.add(x.id);
    const all = [];
    for (const k of ["body", "example", "exam", "warn"]) {
      for (const p of x[k] || []) {
        if (typeof p !== "string" || p.length < 4 || p.length > 60) ng(x.id, `${k} の長さ: ${p}`);
        const src = k === "warn" ? [t.body, t.example, t.exam].join("\n") : t[k] || "";
        if (!src.includes(p)) ng(x.id, `${k} に含まれない: ${p}`);
        all.push([k === "warn" ? null : k, p]);
      }
    }
    for (const k of ["body", "example", "exam"]) {
      const s = t[k] || ""; const ps = [...(x[k] || []), ...(x.warn || []).filter((p) => s.includes(p))];
      const r = ps.map((p) => [s.indexOf(p), s.indexOf(p) + p.length]).sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < r.length; i++) if (r[i][0] < r[i - 1][1]) ng(x.id, `${k} で語句が重なっています`);
    }
    if (!(x.body || []).length && !(x.exam || []).length) ng(x.id, "body / exam のどちらかに1つ以上");
  }
}
const missing = files.length && !process.argv.slice(2).length ? DATA.filter((t) => !seen.has(t.id)).length : 0;
console.log(`${bad ? "NG" : "OK"} ${n} 語を検査、エラー ${bad} 件${missing ? `、未作成 ${missing} 語` : ""}`); process.exit(bad ? 1 : 0);
