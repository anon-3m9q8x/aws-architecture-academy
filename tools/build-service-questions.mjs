// サービス知識問題(資格試験の問題とは別枠)を、サービス図鑑のデータから生成する。
//   node tools/build-service-questions.mjs   → data/bank/SERVICE.js
// 図鑑の「用途(purpose)・利用シーン(useCases)・試験のキーワード(cues.words)・種類と機能(variants)・
// 紛らわしいサービス(cues.not)」から、単純な知識を問う 4 択を作る。図鑑を更新したら再生成する。
// 乱数はサービス id から決まるので、再生成しても問題 id と選択肢の並びは変わらない(回答履歴が保たれる)。
import fs from "node:fs";
import path from "node:path";
import { SERVICES, byId } from "../services.js";
import { findServices } from "../data/service-terms.js";

const outFile = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../data/bank/SERVICE.js");
const SKIP_CAT = new Set(["一般概念"]);
const SKIP_ID = new Set(["grafana", "internet", "onprem", "user"]);
const pool = SERVICES.filter((s) => !SKIP_CAT.has(s.cat) && !SKIP_ID.has(s.id));
const plain = (t) => String(t || "").replace(/==|!!/g, "").replace(/\s+/g, " ").trim();
const end = (t) => (/[。.!?！？]$/.test(t) ? t : t + "。");

function rng(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}
function shuffle(list, r) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const firstWord = (s) => s.name.split(/[\s/]/)[0].toLowerCase();
/** 紛らわしすぎて「どちらも正解」になり得る組み合わせ(同じ系列の名前・cues.not で比べられている)は誤答に使わない */
function confusable(a, b) {
  if (a.id === b.id) return true;
  if (firstWord(a) === firstWord(b)) return true;
  if (a.name.includes(b.name) || b.name.includes(a.name)) return true;
  const mentions = (x, y) => findServices(x.cues?.not || "").some((m) => m.id === y.id);
  return mentions(a, b) || mentions(b, a);
}
const GENERIC = new Set(["サービス", "管理", "データ", "アプリ", "アプリケーション", "利用", "環境", "提供", "使う", "する", "AWS", "自動", "安全", "簡単", "一元", "複数"]);
const keyTokens = (t) => new Set((plain(t).match(/[ァ-ヴー]{3,}|[\u4E00-\u9FFF]{2,}|[A-Za-z][A-Za-z0-9]{2,}/g) || []).filter((w) => !GENERIC.has(w)));
/** 用途・利用シーンの言葉が重なる(例: App Runner と Fargate の「コンテナ」)なら、誤答にすると答えが割れる */
function overlaps(a, b) {
  const A = new Set([...keyTokens(a.purpose), ...keyTokens(a.useCases)]);
  return [...keyTokens(b.purpose), ...keyTokens(b.useCases)].some((w) => A.has(w));
}
/**
 * 誤答のサービス: 同じカテゴリからは用途の重ならないものを sameMax 個まで、残りは別カテゴリから。
 * 同じカテゴリの近いサービスは「どちらも正解」になり得るため、単純な知識問題では避ける。
 */
function distractors(s, n, r, ok = () => true, sameMax = 1) {
  const fine = (x) => !confusable(s, x) && ok(x);
  const same = shuffle(pool.filter((x) => x.cat === s.cat && fine(x) && !overlaps(s, x)), r).slice(0, sameMax);
  const other = shuffle(pool.filter((x) => x.cat !== s.cat && fine(x) && !overlaps(s, x)), r);
  const out = [];
  for (const x of [...same, ...other]) {
    if (out.length >= n) break;
    if (out.some((y) => confusable(x, y) || overlaps(x, y))) continue;
    out.push(x);
  }
  return out;
}
const mentionsSelf = (text, s) => findServices(text).some((m) => m.id === s.id) || text.includes(s.name);
const rows = [];
/**
 * 行: [id, カテゴリ, 種類, 難易度(1 基礎 / 2 標準), 論点, 問題文, 選択肢, 正解の番号, 解説, 根拠ライン, 選択肢ごとの理由, サービス id]
 */
function push(s, kind, lv, concept, prompt, correct, wrongs, explanation, quote, r) {
  const opts = shuffle([{ ...correct, ok: true }, ...wrongs], r);
  const lines = [];
  if (quote) {
    const at = prompt.indexOf(quote);
    if (at >= 0) lines.push([at, at + quote.length, "手掛かり", 0]);
  }
  rows.push([`SVC-${s.id}-${kind}`, s.cat, kind, lv, concept, prompt, opts.map((o) => o.text), opts.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0), explanation, lines, opts.map((o) => o.why || ""), s.id]);
}
const label = (x) => x.name;
const card = (s) => `${s.full} は、${end(plain(s.purpose))}`;
const KINDS = { purpose: "用途からサービスを選ぶ", name: "サービスの用途を選ぶ", usecase: "利用シーンからサービスを選ぶ", words: "試験のキーワードからサービスを選ぶ", variant: "種類・機能の説明", not: "紛らわしいサービスとの違い" };

for (const s of pool) {
  const r = rng(s.id);
  const purpose = plain(s.purpose);
  const tip = plain(s.tip);
  // 1. 用途 → サービス
  if (purpose && !mentionsSelf(purpose, s)) {
    const w = distractors(s, 3, r, (x) => plain(x.purpose));
    if (w.length === 3)
      push(s, "purpose", 1, KINDS.purpose, `「${purpose}」ためのサービスはどれですか。`, { text: label(s), why: card(s) },
        w.map((x) => ({ text: label(x), why: card(x) })),
        `${plain(s.summary)}${tip ? ` 試験のポイント: ${end(tip)}` : ""}`, purpose, r);
  }
  // 2. サービス → 用途
  if (purpose) {
    const w = distractors(s, 3, r, (x) => plain(x.purpose) && plain(x.purpose) !== purpose);
    if (w.length === 3)
      push(s, "name", 1, KINDS.name, `${s.full} の主な用途として正しいものはどれですか。`, { text: purpose, why: `正解: ${s.name} の用途です。` },
        w.map((x) => ({ text: plain(x.purpose), why: `${x.name} の用途です。` })),
        `${plain(s.summary)}${tip ? ` 試験のポイント: ${end(tip)}` : ""}`, s.full, r);
  }
  // 3. 利用シーン → サービス
  const uc = plain(s.useCases);
  if (uc && !mentionsSelf(uc, s)) {
    const w = distractors(s, 3, r, (x) => plain(x.useCases), 0);
    if (w.length === 3)
      push(s, "usecase", 1, KINDS.usecase, `「${uc}」といった場面でよく使われるサービスはどれですか。`, { text: label(s), why: `${s.name} の代表的な利用シーンです。` },
        w.map((x) => ({ text: label(x), why: `${x.name}: ${end(plain(x.useCases))}` })),
        `${card(s)} ${plain(s.summary)}`, uc, r);
  }
  // 4. 試験のキーワード → サービス
  const words = (s.cues?.words || []).map(plain).filter((w) => w && !mentionsSelf(w, s));
  if (words.length >= 3) {
    const kw = words.slice(0, 4).join("」「");
    const w = distractors(s, 3, r, () => true, 0);
    if (w.length === 3)
      push(s, "words", 2, KINDS.words, `問題文に「${kw}」が出てきたら、まず思い浮かべるべきサービスはどれですか。`, { text: label(s), why: `${s.name} の目印になる言葉です。` },
        w.map((x) => ({ text: label(x), why: `${x.name}: ${end(plain(x.purpose))}` })),
        `${card(s)}${tip ? ` 試験のポイント: ${end(tip)}` : ""}${s.cues?.not ? ` 紛らわしい例: ${end(plain(s.cues.not))}` : ""}`, kw, r);
  }
  // 5. 種類・機能 → 説明(同じサービスの別の種類・機能を誤答にする)
  const vs = (s.variants || []).filter((v) => v[0] && v[2]);
  if (vs.length >= 3) {
    vs.slice(0, 6).forEach((v, i) => {
      const others = shuffle(vs.filter((o) => o !== v && plain(o[2]) !== plain(v[2])), r).slice(0, 3);
      if (others.length < 2) return;
      const detail = [plain(v[3]), plain(v[5]) && `ポイント: ${end(plain(v[5]))}`].filter(Boolean).join(" ");
      push(s, `variant${i + 1}`, 2, KINDS.variant, `${s.name} の「${plain(v[0])}」の説明として正しいものはどれですか。`, { text: plain(v[2]), why: `正解: ${end(plain(v[3]))}` },
        others.map((o) => ({ text: plain(o[2]), why: `「${plain(o[0])}」の説明です。` })),
        detail, `「${plain(v[0])}」`.slice(1, -1), r);
    });
  }
  // 6. 紛らわしいサービス: 「A → B」の B を選ぶ
  const not = plain(s.cues?.not);
  const m = not.match(/^(.+?)\s*→\s*(.+)$/);
  if (m) {
    const target = findServices(m[2]).map((x) => byId.get(x.id)).find((x) => x && x.id !== s.id && pool.includes(x));
    if (target) {
      const need = m[1].trim();
      const w = [s, ...distractors(target, 3, r, (x) => !confusable(s, x))].filter((x, i, a) => a.indexOf(x) === i && x.id !== target.id).slice(0, 3);
      if (w.length === 3)
        push(s, "not", 2, KINDS.not, `${s.name} と紛らわしい場面です。「${need}」に使うサービスはどれですか。`, { text: label(target), why: card(target) },
          w.map((x) => ({ text: label(x), why: card(x) })),
          `「${need}」→ ${target.name}。${card(target)} 一方、${card(s)}`, need, r);
    }
  }
}
const ids = new Set();
for (const r of rows) {
  if (ids.has(r[0])) throw new Error("重複 id " + r[0]);
  ids.add(r[0]);
  if (new Set(r[6]).size !== r[6].length) throw new Error("選択肢の重複 " + r[0]);
}
const byKind = {};
rows.forEach((r) => (byKind[r[2].replace(/\d+$/, "")] = (byKind[r[2].replace(/\d+$/, "")] || 0) + 1));
fs.writeFileSync(
  outFile,
  `// サービス知識問題(資格試験の問題とは別枠)— ${rows.length} 問 / ${pool.length} サービス\n` +
    `// 自動生成: tools/build-service-questions.mjs(サービス図鑑のデータから)。` +
    `行: [id, カテゴリ, 種類, 難易度, 論点, 問題文, 選択肢, 正解の番号, 解説, 根拠ライン, 選択肢ごとの理由, サービス id]\n` +
    `export default ${JSON.stringify({ code: "SERVICE", kinds: KINDS, q: rows })};\n`,
);
console.log(rows.length, "問", byKind);
