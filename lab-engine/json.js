// コマンド・ポリシー演習: JSON の構文解析。JSON.parse と同じ規則で読み、失敗した位置(行・列)と直し方の手掛かりを日本語で返す。
// eval は使わない。入力は文字列としてのみ扱う。

export class JsonSyntaxError extends Error {
  constructor(message, pos, src, hint) {
    super(message);
    const before = src.slice(0, pos);
    this.pos = pos;
    this.line = before.split("\n").length;
    this.col = pos - before.lastIndexOf("\n");
    this.hint = hint || "";
  }
}

const WS = new Set([" ", "\t", "\n", "\r"]);

/** 構文解析。成功すれば値、失敗すれば JsonSyntaxError を投げる。重複キーは dupKeys に記録する */
export function parseJson(src) {
  let i = 0;
  const dupKeys = [];
  const fail = (msg, hint, at = i) => { throw new JsonSyntaxError(msg, Math.min(at, src.length), src, hint); };
  const ws = () => { while (i < src.length && WS.has(src[i])) i++; };
  const ch = () => src[i];
  function value() {
    ws();
    const c = ch();
    if (c === "{") return object();
    if (c === "[") return array();
    if (c === '"') return string();
    if (c === "'") fail("文字列にシングルクォート(')は使えません", "JSON の文字列とキーはダブルクォート(\")で囲みます");
    if (c === "-" || (c >= "0" && c <= "9")) return number();
    for (const [w, v] of [["true", true], ["false", false], ["null", null]]) if (src.startsWith(w, i)) { i += w.length; return v; }
    if (c === undefined) fail("JSON が途中で終わっています", "閉じかっこ } や ] が足りない可能性があります");
    if (c === "}" || c === "]") fail(`ここに値が必要です(「${c}」が早すぎます)`, "直前のカンマ(,)が余分な可能性があります(JSON は末尾のカンマを許しません)");
    fail(`「${c}」は JSON の値として読めません`, /[A-Za-z]/.test(c) ? "文字列ならダブルクォート(\")で囲みます" : "");
  }
  function object() {
    const start = i;
    i++;
    const out = {};
    ws();
    if (ch() === "}") { i++; return out; }
    for (;;) {
      ws();
      if (ch() === "}") fail("最後の項目の後ろにカンマ(,)があります", "JSON は末尾のカンマを許しません。直前の , を削除してください");
      if (ch() !== '"') fail(ch() === undefined ? "オブジェクト { が閉じられていません" : "キーはダブルクォート(\")で囲んだ文字列にします", ch() === "'" ? "シングルクォートではなくダブルクォートを使います" : ch() === undefined ? `{ の位置: ${posText(start)}` : "");
      const keyAt = i;
      const k = string();
      if (Object.hasOwn(out, k)) dupKeys.push({ key: k, ...lc(keyAt) });
      ws();
      if (ch() !== ":") fail(`キー「${k}」の後ろにコロン(:)が必要です`);
      i++;
      out[k] = value();
      ws();
      if (ch() === ",") { i++; continue; }
      if (ch() === "}") { i++; return out; }
      if (ch() === undefined) fail("オブジェクト { が閉じられていません", `{ の位置: ${posText(start)}`);
      fail("項目の区切りにカンマ(,)が必要です", "前の項目の行末に , を付けてください", i);
    }
  }
  function array() {
    const start = i;
    i++;
    const out = [];
    ws();
    if (ch() === "]") { i++; return out; }
    for (;;) {
      ws();
      if (ch() === "]") fail("配列の最後の要素の後ろにカンマ(,)があります", "JSON は末尾のカンマを許しません");
      out.push(value());
      ws();
      if (ch() === ",") { i++; continue; }
      if (ch() === "]") { i++; return out; }
      if (ch() === undefined) fail("配列 [ が閉じられていません", `[ の位置: ${posText(start)}`);
      fail("配列の要素の区切りにカンマ(,)が必要です");
    }
  }
  function string() {
    const start = i;
    i++;
    let out = "";
    for (;;) {
      const c = src[i];
      if (c === undefined) fail("文字列のダブルクォート(\")が閉じられていません", `文字列の開始: ${posText(start)}`, start);
      if (c === "\n") fail("文字列の途中で改行しています", "閉じるダブルクォート(\")が抜けていないか確認してください", start);
      if (c === '"') { i++; return out; }
      if (c === "\\") {
        const e = src[i + 1];
        const map = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
        if (e in map) { out += map[e]; i += 2; continue; }
        if (e === "u" && /^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) { out += String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16)); i += 6; continue; }
        fail("文字列の中のバックスラッシュ(\\)の使い方が正しくありません", "\\ そのものは \\\\ と書きます");
      }
      if (c < " ") fail("文字列の中に制御文字があります");
      out += c;
      i++;
    }
  }
  function number() {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(src.slice(i));
    if (!m) fail("数値の書き方が正しくありません");
    i += m[0].length;
    return Number(m[0]);
  }
  function lc(p) { const b = src.slice(0, p); return { line: b.split("\n").length, col: p - b.lastIndexOf("\n") }; }
  function posText(p) { const x = lc(p); return `${x.line} 行 ${x.col} 列`; }
  if (typeof src !== "string") throw new TypeError("string expected");
  const v = value();
  ws();
  if (i < src.length) fail("JSON の終わりの後ろに余分な文字があります", "最上位は 1 つのオブジェクト {...} にします");
  return { value: v, dupKeys };
}

/** 整形(キー順はそのまま) */
export function formatJson(src) {
  return JSON.stringify(parseJson(src).value, null, 2);
}
