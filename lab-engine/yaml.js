// コマンド・ポリシー演習: CloudFormation テンプレート用の YAML の構文解析(よく使う書き方に限定したサブセット)。
// 対応: ブロックのマッピング・シーケンス、フロー([a, b] / {k: v})、引用符、コメント、ブロックスカラー(| >)、
//       CloudFormation の短縮形のタグ(!Ref !GetAtt !Sub !Join !If など)。アンカー・エイリアス(& *)、複数ドキュメントは未対応。
// 失敗した位置(行・列)と直し方の手掛かりを日本語で返す。eval は使わない。
import { pathKey } from "./json.js";

export class YamlError extends Error {
  constructor(message, line, col = 1, hint = "") { super(message); this.line = line; this.col = col; this.hint = hint; }
}
const FN_TAGS = ["Sub", "Join", "Select", "Split", "If", "Equals", "Not", "And", "Or", "FindInMap", "GetAZs", "ImportValue", "Base64", "Cidr", "Length", "ToJsonString", "Transform"];

/** タグを CloudFormation の長い形式に直す(!GetAtt A.B → { "Fn::GetAtt": ["A", "B"] }) */
function applyTag(tag, v, line) {
  if (tag === "Ref") return { Ref: v };
  if (tag === "Condition") return { Condition: v };
  if (tag === "GetAtt") {
    if (typeof v === "string") { const i = v.indexOf("."); if (i < 0) throw new YamlError(`!GetAtt は 論理ID.属性名 の形で書きます(「${v}」)`, line); return { "Fn::GetAtt": [v.slice(0, i), v.slice(i + 1)] }; }
    return { "Fn::GetAtt": v };
  }
  if (FN_TAGS.includes(tag)) return { [`Fn::${tag}`]: v };
  throw new YamlError(`タグ「!${tag}」は使えません`, line, 1, "CloudFormation の短縮形(!Ref !GetAtt !Sub !Join !If など)を確認してください");
}

function scalar(raw, line, col) {
  const s = raw.trim();
  if (s === "") return null;
  if (s.startsWith('"')) {
    if (!s.endsWith('"') || s.length < 2) throw new YamlError("ダブルクォート(\")が閉じられていません", line, col);
    return JSON.parse(s.replace(/\\'/g, "'"));
  }
  if (s.startsWith("'")) {
    if (!s.endsWith("'") || s.length < 2) throw new YamlError("シングルクォート(')が閉じられていません", line, col);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (/^(true|True|TRUE)$/.test(s)) return true;
  if (/^(false|False|FALSE)$/.test(s)) return false;
  if (/^(null|Null|NULL|~)$/.test(s)) return null;
  if (/^-?(0|[1-9]\d*)$/.test(s)) return Number(s);
  if (/^-?(0|[1-9]\d*)\.\d+$/.test(s)) return Number(s);
  if (/^[&*]/.test(s)) throw new YamlError("アンカー・エイリアス(& / *)は学習用環境では未対応です", line, col, "値をそのまま書いてください");
  if (s.startsWith("@") || s.startsWith("`")) throw new YamlError(`「${s[0]}」で始まる値は引用符で囲みます`, line, col);
  return s;
}

/** 1 行の中のフロー形式([..] {..} やタグ付きの値)を解析 */
function flow(text, line, baseCol) {
  let i = 0;
  const err = (m, h) => { throw new YamlError(m, line, baseCol + i, h); };
  const ws = () => { while (text[i] === " ") i++; };
  function val(stop) {
    ws();
    if (text[i] === "!") {
      const m = /^!([A-Za-z]+)/.exec(text.slice(i));
      if (!m) err("タグの書き方が正しくありません");
      i += m[0].length;
      ws();
      return applyTag(m[1], val(stop), line);
    }
    if (text[i] === "[") {
      i++; const out = [];
      ws();
      if (text[i] === "]") { i++; return out; }
      for (;;) { out.push(val(",]")); ws(); if (text[i] === ",") { i++; continue; } if (text[i] === "]") { i++; return out; } err("フローのシーケンス [ ] が閉じられていないか、区切りのカンマ(,)がありません"); }
    }
    if (text[i] === "{") {
      i++; const out = {};
      ws();
      if (text[i] === "}") { i++; return out; }
      for (;;) {
        ws();
        const c = colonAt(text.slice(i));
        if (c <= 0) err("フローのマッピングは { キー: 値 } の形にします(コロンの後ろに半角スペース)");
        const k = scalar(text.slice(i, i + c), line, baseCol + i);
        i += c + 1;
        out[k] = val(",}");
        ws();
        if (text[i] === ",") { i++; continue; }
        if (text[i] === "}") { i++; return out; }
        err("フローのマッピング { } が閉じられていないか、区切りのカンマ(,)がありません");
      }
    }
    if (text[i] === '"' || text[i] === "'") {
      const q = text[i];
      let j = i + 1;
      while (j < text.length && (text[j] !== q || (q === '"' && text[j - 1] === "\\"))) j++;
      if (j >= text.length) err(q === '"' ? "ダブルクォート(\")が閉じられていません" : "シングルクォート(')が閉じられていません");
      const v = scalar(text.slice(i, j + 1), line, baseCol + i);
      i = j + 1;
      return v;
    }
    let j = i;
    while (j < text.length && !stop.includes(text[j])) j++;
    const v = scalar(text.slice(i, j), line, baseCol + i);
    i = j;
    return v;
  }
  const v = val(stop0(text));
  ws();
  if (i < text.length) err(`値の後ろに余分な文字「${text.slice(i, i + 10)}」があります`, "コロンの後ろの値を引用符で囲むと解決することがあります");
  return v;
}
const stop0 = (t) => (/^\s*[[{!]/.test(t) ? "" : "\u0000");

/** コメントを除く(引用符の中の # は残す) */
function stripComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { if (i === 0 || /[\s[{,:-]/.test(s[i - 1])) q = c; continue; }
    if (c === "#" && (i === 0 || s[i - 1] === " " || s[i - 1] === "\t")) return s.slice(0, i);
  }
  return s;
}
/** "key: value" のコロンの位置(引用符・フローの外で、後ろが空白か行末のもの) */
function colonAt(s) {
  let q = null, depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if ((c === '"' || c === "'") && (i === 0 || /[\s[{,]/.test(s[i - 1]))) { q = c; continue; }
    if (c === "[" || c === "{") depth++;
    if (c === "]" || c === "}") depth--;
    if (c === ":" && depth === 0 && (i + 1 === s.length || s[i + 1] === " ")) return i;
  }
  return -1;
}

export function parseYaml(src) {
  const raw = src.replace(/\r\n?/g, "\n").split("\n");
  const L = [];
  raw.forEach((t, n) => {
    if (/^\t/.test(t) || /^ *\t/.test(t)) throw new YamlError("インデントにタブ文字は使えません", n + 1, 1, "YAML のインデントは半角スペースで書きます");
    const body = stripComment(t);
    if (body.trim() === "---") { if (L.some(Boolean)) throw new YamlError("複数のドキュメント(---)は未対応です", n + 1, 1, "テンプレートは 1 つのドキュメントにします"); L.push(null); return; }
    if (!body.trim()) { L.push(null); return; }
    const indent = body.length - body.trimStart().length;
    L.push({ indent, text: body.trim(), line: n + 1, raw: t });
  });
  const at = new Map();
  const path = [];
  const mark = (line, col = 1) => { if (!at.has(pathKey(path))) at.set(pathKey(path), { line, col }); };
  const next = (i) => { while (i < L.length && !L[i]) i++; return i; };
  const isSeq = (x) => x && (x.text === "-" || x.text.startsWith("- "));

  function block(i, indent) {
    i = next(i);
    const x = L[i];
    if (!x) return [null, i];
    if (isSeq(x)) return seq(i, x.indent);
    return map(i, x.indent);
  }
  // 値の部分(キーの後ろ・- の後ろ)。タグ・ブロックスカラー・入れ子のブロック・フロー・スカラー
  function value(rest, i, indent, line, col, seqParent = false) {
    let tag = null;
    const tm = /^!([A-Za-z]+)(\s+|$)/.exec(rest);
    if (tm) { tag = tm[1]; rest = rest.slice(tm[0].length); }
    const wrap = (v) => (tag ? applyTag(tag, v, line) : v);
    if (rest === "|" || rest === ">" || /^[|>][-+]?$/.test(rest)) {
      const lines = [];
      let j = i + 1, min = Infinity;
      while (j < L.length) {
        const y = L[j];
        if (y && y.indent <= indent) break;
        if (!y && raw[j] !== undefined) { const r = raw[j]; if (r.trim() && (r.length - r.trimStart().length) <= indent) break; }
        lines.push(raw[j]);
        if (raw[j].trim()) min = Math.min(min, raw[j].length - raw[j].trimStart().length);
        j++;
      }
      while (lines.length && !lines.at(-1).trim()) lines.pop();
      const body = lines.map((l) => l.slice(min === Infinity ? 0 : min));
      const keep = rest.endsWith("-") ? "" : "\n";
      const out = rest[0] === "|" ? body.join("\n") + keep : body.join(" ").replace(/\s+\n/g, "\n") + keep;
      return [wrap(out), j];
    }
    if (rest === "") {
      const j = next(i + 1);
      const y = L[j];
      if (y && (y.indent > indent || (isSeq(y) && y.indent === indent && !seqParent))) { const [v, k] = block(j, y.indent); return [wrap(v), k]; }
      return [wrap(null), i + 1];
    }
    // 複数行にわたるフロー
    let text = rest, j = i + 1;
    const open = (t) => [...t].reduce((d, c) => d + ("[{".includes(c) ? 1 : "]}".includes(c) ? -1 : 0), 0);
    if (/^[[{]/.test(text)) while (open(text) > 0 && j < L.length) { const y = L[next(j)]; if (!y) break; text += " " + y.text; j = next(j) + 1; }
    return [wrap(flow(text, line, col)), j];
  }
  function map(i, indent) {
    const out = {};
    for (;;) {
      i = next(i);
      const x = L[i];
      if (!x || x.indent < indent) return [out, i];
      if (x.indent > indent) throw new YamlError("インデントが揃っていません", x.line, x.indent + 1, "同じ階層のキーは同じ桁数のスペースで始めます");
      if (isSeq(x)) throw new YamlError("マッピングの途中に「- 」の要素があります", x.line, x.indent + 1, "シーケンスはキーの下で、キーより深くインデントします");
      const c = colonAt(x.text);
      if (c < 0) throw new YamlError(`「${x.text.slice(0, 30)}」にキーの区切りのコロン(:)がありません`, x.line, x.indent + 1, "キー: 値 の形で、コロンの後ろに半角スペースを入れます");
      const key = String(scalar(x.text.slice(0, c), x.line, x.indent + 1));
      if (Object.hasOwn(out, key)) throw new YamlError(`キー「${key}」が同じ階層に 2 回あります`, x.line, x.indent + 1);
      path.push(key);
      mark(x.line, x.indent + 1);
      const [v, j] = value(x.text.slice(c + 1).trim(), i, indent, x.line, x.indent + c + 3);
      out[key] = v;
      path.pop();
      i = j;
    }
  }
  function seq(i, indent) {
    const out = [];
    for (;;) {
      i = next(i);
      const x = L[i];
      if (!x || x.indent < indent) return [out, i];
      if (x.indent > indent) throw new YamlError("インデントが揃っていません", x.line, x.indent + 1);
      if (!isSeq(x)) return [out, i];
      path.push(out.length);
      mark(x.line, x.indent + 1);
      const content = x.text === "-" ? "" : x.text.slice(2);
      const off = x.text.length - x.text.slice(1).trimStart().length;
      const inner = x.indent + off;
      if (content === "-" || content.startsWith("- ")) {
        // 「- - 値」は入れ子のシーケンス
        L[i] = { indent: inner, text: content, line: x.line, raw: x.raw };
        const [v, j] = seq(i, inner);
        out.push(v);
        i = j;
      } else if (content && colonAt(content) > 0 && !/^[[{!"']/.test(content)) {
        // 「- キー: 値」はマッピングの開始。次の行以降は inner の桁にそろう
        L[i] = { indent: inner, text: content, line: x.line, raw: x.raw };
        const [v, j] = map(i, inner);
        out.push(v);
        i = j;
      } else {
        const [v, j] = value(content.trim(), i, x.indent, x.line, inner + 1, true);
        out.push(v);
        i = j;
      }
      path.pop();
    }
  }
  const first = next(0);
  if (first >= L.length) return { value: null, pos: () => ({ line: 1, col: 1 }) };
  if (L[first].indent !== 0) throw new YamlError("最初の行はインデントせずに書き始めます", L[first].line, 1);
  const [v, end] = block(first, 0);
  const rest = next(end);
  if (rest < L.length) throw new YamlError("インデントが揃っていません(最上位の階層に戻れない行があります)", L[rest].line, L[rest].indent + 1);
  const pos = (p) => { for (let n = p.length; n >= 0; n--) { const x = at.get(pathKey(p.slice(0, n))); if (x) return x; } return { line: 1, col: 1 }; };
  return { value: v, pos };
}
