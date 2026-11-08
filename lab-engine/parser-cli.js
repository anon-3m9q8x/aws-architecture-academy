// コマンド・ポリシー演習: AWS CLI のコマンド行を字句解析し、操作と引数の構造へ変換する。
// シェルは実行しない。パイプ・リダイレクト・コマンド置換などのシェル構文は拒否する。
// オプションの順序・引用符・余分な空白は結果に影響しない(構造で比較する)。

export class CliError extends Error {
  constructor(message, hint = "", kind = "usage") { super(message); this.hint = hint; this.kind = kind; }
}

/** bash 風の字句解析(' と " の引用、\ のエスケープ、行末の \ による継続) */
export function tokenize(line) {
  const out = [];
  let cur = "", has = false, i = 0;
  const s = line.replace(/\\\r?\n/g, " ");
  while (i < s.length) {
    const c = s[i];
    if (c === "'") {
      const j = s.indexOf("'", i + 1);
      if (j < 0) throw new CliError("シングルクォート(')が閉じられていません", "引用符は対にします");
      cur += s.slice(i + 1, j); has = true; i = j + 1; continue;
    }
    if (c === '"') {
      i++; has = true;
      for (;;) {
        if (i >= s.length) throw new CliError("ダブルクォート(\")が閉じられていません", "引用符は対にします");
        const d = s[i];
        if (d === '"') { i++; break; }
        if (d === "\\" && /["\\$`]/.test(s[i + 1] || "")) { cur += s[i + 1]; i += 2; continue; }
        if (d === "$" || d === "`") throw new CliError("ダブルクォートの中の $ や ` は、この学習用ターミナルでは展開しません", "値はシングルクォート(')で囲んでください");
        cur += d; i++;
      }
      continue;
    }
    if (c === "\\") { if (i + 1 < s.length) { cur += s[i + 1]; has = true; } i += 2; continue; }
    if (/\s/.test(c)) { if (has) { out.push(cur); cur = ""; has = false; } i++; continue; }
    if ("|;&<>`".includes(c) || (c === "$" && s[i + 1] === "(")) {
      throw new CliError(`シェルの記号「${c === "$" ? "$(" : c}」は使えません`, "この画面はシェルではなく、aws コマンド 1 つだけを模擬実行します(パイプ・リダイレクト・連結は不可)", "shell");
    }
    cur += c; has = true; i++;
  }
  if (has) out.push(cur);
  return out;
}

const GLOBAL = { region: "value", output: "value", query: "value", profile: "value", "no-cli-pager": "flag", "no-paginate": "flag", "cli-binary-format": "value", "endpoint-url": "value", debug: "flag", "no-verify-ssl": "flag", color: "value", "cli-read-timeout": "value", "cli-connect-timeout": "value" };

/**
 * 1 行を { service, op, opts, positional, global } に変換する。
 * spec: COMMANDS[service][op] = { params: { name: "value" | "flag" | "list" | "int" }, positional: [ ... ], required: [...] }
 */
export function parseCommand(line, COMMANDS) {
  const t = tokenize(line.trim());
  if (!t.length) throw new CliError("コマンドを入力してください");
  if (t[0] !== "aws") throw new CliError(`「${t[0]}」は実行できません`, "この学習用ターミナルでは aws で始まるコマンドだけを模擬実行します(OS のコマンドは実行しません)", "unsupported");
  if (t.length === 1) throw new CliError("aws の後ろにサービス名を指定してください", "例: aws sts get-caller-identity");
  const global = {}, opts = {}, positional = [];
  // サービスより前にグローバルオプションを置く書き方にも対応
  let k = 1;
  const takeGlobal = (name, at) => {
    if (GLOBAL[name] === "flag") { global[name] = true; return at + 1; }
    const v = t[at + 1];
    if (v === undefined || (v.startsWith("--") && name !== "query")) throw new CliError(`--${name} に値がありません`);
    global[name] = v; return at + 2;
  };
  while (k < t.length && t[k].startsWith("--")) {
    const [nm, eq] = splitEq(t[k]);
    if (!GLOBAL[nm]) break;
    if (eq !== null) { global[nm] = eq; k++; } else k = takeGlobal(nm, k);
  }
  const service = t[k], op = t[k + 1];
  if (!service) throw new CliError("サービス名がありません");
  const svc = COMMANDS[service];
  if (!svc) throw new CliError(`サービス「${service}」は学習用環境では未対応です`, `対応しているサービス: ${Object.keys(COMMANDS).join(", ")}`, "unsupported");
  if (!op || op.startsWith("--")) throw new CliError(`aws ${service} の後ろに操作(サブコマンド)を指定してください`, `例: ${Object.keys(svc).slice(0, 3).map((x) => `aws ${service} ${x}`).join(" / ")}`);
  const spec = svc[op];
  if (!spec) {
    const near = Object.keys(svc).find((x) => x.replace(/-/g, "") === op.replace(/-/g, "") || x.startsWith(op.slice(0, 6)));
    throw new CliError(`「aws ${service} ${op}」は学習用環境では未対応です`, near ? `「aws ${service} ${near}」のことですか? ` : `この環境で使える操作: ${Object.keys(svc).join(", ")}`, near ? "usage" : "unsupported");
  }
  for (let i = k + 2; i < t.length; ) {
    const tok = t[i];
    if (tok.startsWith("--")) {
      const [name, eq] = splitEq(tok);
      if (GLOBAL[name]) { if (eq !== null) { global[name] = eq; i++; } else i = takeGlobal(name, i); continue; }
      const type = spec.params?.[name];
      if (!type) {
        const near = Object.keys(spec.params || {}).find((x) => x.startsWith(name.replace(/s$/, "")) || name.startsWith(x.replace(/s$/, "")));
        throw new CliError(`Unknown options: --${name}`, near ? `「--${near}」の誤りではありませんか?` : `aws ${service} ${op} で使えるオプション: ${Object.keys(spec.params || {}).map((x) => "--" + x).join(" ") || "なし"}`);
      }
      if (name in opts) throw new CliError(`--${name} が 2 回指定されています`);
      if (type === "flag") { opts[name] = true; i++; continue; }
      if (eq !== null) { opts[name] = type === "list" ? [eq] : eq; i++; continue; }
      const vals = [];
      let j = i + 1;
      while (j < t.length && !t[j].startsWith("--")) { vals.push(t[j]); j++; if (type !== "list") break; }
      if (!vals.length) throw new CliError(`--${name} に値がありません`, `例: --${name} ${spec.example?.[name] || "<値>"}`);
      if (type === "int" && !/^\d+$/.test(vals[0])) throw new CliError(`--${name} には整数を指定します(「${vals[0]}」)`);
      opts[name] = type === "list" ? vals : vals[0];
      i = j;
    } else { positional.push(tok); i++; }
  }
  const maxPos = (spec.positional || []).length;
  if (positional.length > maxPos) throw new CliError(`余分な引数があります: ${positional.slice(maxPos).join(" ")}`, maxPos ? `位置引数は ${spec.positional.join(" ")} の ${maxPos} 個です` : "オプションは --名前 値 の形で指定します");
  const reqPos = (spec.positional || []).filter((p) => !p.startsWith("["));
  if (positional.length < reqPos.length) throw new CliError(`引数が足りません: ${reqPos.slice(positional.length).join(" ")}`, `書式: aws ${service} ${op} ${spec.positional.join(" ")}`);
  const missing = (spec.required || []).filter((r) => !(r in opts));
  if (missing.length) throw new CliError(`aws: error: the following arguments are required: ${missing.map((x) => "--" + x).join(", ")}`, `必須のオプション ${missing.map((x) => "--" + x).join(" ")} を指定してください`);
  if (global.profile !== undefined) throw new CliError("--profile は学習用環境では使いません", "この環境の呼び出し元は問題ごとに決まっています。実際のプロファイル名や認証情報を入力しないでください", "usage");
  if (global.debug) throw new CliError("--debug は学習用環境では未対応です", "", "unsupported");
  if (global["endpoint-url"]) throw new CliError("--endpoint-url は学習用環境では未対応です", "模擬環境は外部と通信しません", "unsupported");
  if (global.output && !["json", "text", "table", "yaml"].includes(global.output)) throw new CliError(`--output に「${global.output}」は指定できません(json / text / table / yaml)`);
  return { service, op, opts, positional, global, tokens: t };
}
function splitEq(tok) {
  const body = tok.slice(2);
  const e = body.indexOf("=");
  return e < 0 ? [body, null] : [body.slice(0, e), body.slice(e + 1)];
}

/** 短縮構文 Name=a,Values=x,y を { Name: "a", Values: ["x","y"] } に。JSON の値も受け付ける */
export function shorthand(v, listKeys = []) {
  const s = v.trim();
  if (s.startsWith("{") || s.startsWith("[")) {
    try { return JSON.parse(s); } catch { throw new CliError(`JSON として読めません: ${s}`, "JSON はシングルクォートで囲み、中はダブルクォートを使います"); }
  }
  const out = {};
  let key = null;
  for (const part of s.split(",")) {
    const m = /^([A-Za-z][A-Za-z0-9]*)=(.*)$/.exec(part);
    if (m) { key = m[1]; out[key] = listKeys.includes(key) ? [m[2]] : m[2]; }
    else if (key && listKeys.includes(key)) out[key].push(part);
    else throw new CliError(`短縮構文として読めません: 「${s}」`, `例: ${listKeys.length ? "Name=instance-state-name,Values=running" : "Key=Value"}(= の前後に空白を入れない)`);
  }
  return out;
}

/* ---------- --query(JMESPath の一部) ---------- */
// 対応: 識別子・. ・[n]・[]・[*]・[?条件](== != < <= > >= && || !)・[a, b]・{k: a}・|・length / contains / starts_with / sort / join
export function jmes(expr, data) {
  const p = new JP(expr);
  const ast = p.parseExpr();
  if (p.i < p.s.length) throw new CliError(`--query を解析できません(位置 ${p.i + 1}「${p.s.slice(p.i, p.i + 8)}」)`, "この環境は JMESPath の基本的な書き方に対応しています(例: Reservations[].Instances[].InstanceId)");
  return run(ast, data);
}
class JP {
  constructor(s) { this.s = s; this.i = 0; }
  ws() { while (/\s/.test(this.s[this.i] || "")) this.i++; }
  peek(str) { this.ws(); return this.s.startsWith(str, this.i); }
  eat(str) { if (this.peek(str)) { this.i += str.length; return true; } return false; }
  expect(str) { if (!this.eat(str)) throw new CliError(`--query の「${str}」が必要な位置です(位置 ${this.i + 1})`); }
  parseExpr() {
    let left = this.parseOr();
    while (this.eat("|")) { if (this.s[this.i] === "|") throw new CliError("--query の || は条件の中でだけ使えます"); left = { k: "pipe", l: left, r: this.parseOr() }; }
    return left;
  }
  parseOr() { let l = this.parseAnd(); while (this.peek("||")) { this.i += 2; l = { k: "or", l, r: this.parseAnd() }; } return l; }
  parseAnd() { let l = this.parseNot(); while (this.eat("&&")) l = { k: "and", l, r: this.parseNot() }; return l; }
  parseNot() { if (this.peek("!") && !this.peek("!=")) { this.i++; return { k: "not", e: this.parseNot() }; } return this.parseCmp(); }
  parseCmp() {
    const l = this.parseChain();
    for (const op of ["==", "!=", "<=", ">=", "<", ">"]) if (this.eat(op)) return { k: "cmp", op, l, r: this.parseChain() };
    return l;
  }
  parseChain() {
    const steps = [];
    this.ws();
    const c = this.s[this.i];
    if (c === "'") steps.push({ t: "lit", v: this.rawString() });
    else if (c === "`") steps.push({ t: "lit", v: this.jsonLit() });
    else if (c === "@") { this.i++; steps.push({ t: "cur" }); }
    else if (c === "(") { this.i++; const e = this.parseExpr(); this.expect(")"); steps.push({ t: "sub", e }); }
    else if (c === "{") steps.push(this.hash());
    else if (c === "[") { /* 括弧から始まる */ }
    else if (/[A-Za-z_"]/.test(c || "")) {
      const name = this.ident();
      if (this.peek("(")) { this.i++; steps.push(this.func(name)); } else steps.push({ t: "field", name });
    } else if (c === "*") { this.i++; steps.push({ t: "objwild" }); }
    else throw new CliError(`--query を解析できません(位置 ${this.i + 1})`);
    for (;;) {
      if (this.peek(".")) {
        this.i++; this.ws();
        if (this.s[this.i] === "[") steps.push(this.multiList());
        else if (this.s[this.i] === "{") steps.push(this.hash());
        else if (this.s[this.i] === "*") { this.i++; steps.push({ t: "objwild" }); }
        else steps.push({ t: "field", name: this.ident() });
      } else if (this.peek("[")) {
        const save = this.i;
        this.i++; this.ws();
        if (this.eat("]")) steps.push({ t: "flatten" });
        else if (this.s[this.i] === "*" && this.s.slice(this.i + 1).trimStart().startsWith("]")) { this.i++; this.expect("]"); steps.push({ t: "wild" }); }
        else if (this.s[this.i] === "?") { this.i++; const cond = this.parseExpr(); this.expect("]"); steps.push({ t: "filter", cond }); }
        else if (/[-\d]/.test(this.s[this.i])) { const m = /^-?\d+/.exec(this.s.slice(this.i)); this.i += m[0].length; this.expect("]"); steps.push({ t: "index", n: Number(m[0]) }); }
        else { this.i = save; if (!steps.length) { steps.push(this.multiList()); } else break; }
      } else break;
    }
    return { k: "chain", steps };
  }
  ident() {
    this.ws();
    if (this.s[this.i] === '"') { const j = this.s.indexOf('"', this.i + 1); if (j < 0) throw new CliError("--query の \" が閉じられていません"); const v = this.s.slice(this.i + 1, j); this.i = j + 1; return v; }
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.s.slice(this.i));
    if (!m) throw new CliError(`--query の位置 ${this.i + 1} に名前が必要です`);
    this.i += m[0].length; return m[0];
  }
  rawString() { const j = this.s.indexOf("'", this.i + 1); if (j < 0) throw new CliError("--query の ' が閉じられていません"); const v = this.s.slice(this.i + 1, j); this.i = j + 1; return v; }
  jsonLit() { const j = this.s.indexOf("`", this.i + 1); if (j < 0) throw new CliError("--query の ` が閉じられていません"); const raw = this.s.slice(this.i + 1, j); this.i = j + 1; try { return JSON.parse(raw); } catch { return raw; } }
  multiList() { this.expect("["); const items = []; do { items.push(this.parseExpr()); } while (this.eat(",")); this.expect("]"); return { t: "mlist", items }; }
  hash() { this.expect("{"); const items = []; do { const key = this.ident(); this.expect(":"); items.push([key, this.parseExpr()]); } while (this.eat(",")); this.expect("}"); return { t: "mhash", items }; }
  func(name) {
    const args = [];
    if (!this.eat(")")) { do { if (this.peek("&")) { this.i++; args.push({ k: "ref", e: this.parseExpr() }); } else args.push(this.parseExpr()); } while (this.eat(",")); this.expect(")"); }
    if (!["length", "contains", "starts_with", "sort", "join", "to_string", "max", "min", "sum", "sort_by", "reverse"].includes(name)) throw new CliError(`--query の関数 ${name}() は学習用環境では未対応です`, "", "unsupported");
    return { t: "fn", name, args };
  }
}
const isNull = (v) => v === null || v === undefined;
function truthy(v) { return !(isNull(v) || v === false || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length)); }
function run(n, v) {
  if (n.k === "pipe") return run(n.r, run(n.l, v));
  if (n.k === "or") { const a = run(n.l, v); return truthy(a) ? a : run(n.r, v); }
  if (n.k === "and") { const a = run(n.l, v); return truthy(a) ? run(n.r, v) : a; }
  if (n.k === "not") return !truthy(run(n.e, v));
  if (n.k === "cmp") {
    const a = run(n.l, v), b = run(n.r, v);
    if (n.op === "==") return JSON.stringify(a) === JSON.stringify(b);
    if (n.op === "!=") return JSON.stringify(a) !== JSON.stringify(b);
    if (typeof a !== "number" || typeof b !== "number") return null;
    return { "<": a < b, "<=": a <= b, ">": a > b, ">=": a >= b }[n.op];
  }
  return steps(n.steps, 0, v);
}
function nextBreak(st, from) { let j = from; while (j < st.length && st[j].t !== "flatten") j++; return j; }
function steps(st, from, v) {
  for (let i = from; i < st.length; i++) {
    const s = st[i];
    if (s.t === "lit") { v = s.v; continue; }
    if (s.t === "cur") continue;
    if (s.t === "sub") { v = run(s.e, v); continue; }
    if (s.t === "field") { v = v && typeof v === "object" && !Array.isArray(v) ? v[s.name] ?? null : null; continue; }
    if (s.t === "index") { v = Array.isArray(v) ? v[s.n < 0 ? v.length + s.n : s.n] ?? null : null; continue; }
    if (s.t === "mlist") { v = isNull(v) ? null : s.items.map((e) => run(e, v)); continue; }
    if (s.t === "mhash") { v = isNull(v) ? null : Object.fromEntries(s.items.map(([k, e]) => [k, run(e, v)])); continue; }
    if (s.t === "fn") { v = callFn(s, v); continue; }
    if (s.t === "flatten" || s.t === "wild" || s.t === "filter" || s.t === "objwild") {
      let list;
      if (s.t === "objwild") { if (!v || typeof v !== "object" || Array.isArray(v)) return null; list = Object.values(v); }
      else {
        if (!Array.isArray(v)) return null;
        list = v;
        if (s.t === "flatten") { list = []; for (const x of v) Array.isArray(x) ? list.push(...x) : list.push(x); }
        if (s.t === "filter") list = list.filter((x) => truthy(run(s.cond, x)));
      }
      const j = nextBreak(st, i + 1);
      v = list.map((x) => steps(st.slice(0, j), i + 1, x)).filter((x) => !isNull(x));
      i = j - 1;
    }
  }
  return v;
}
function callFn(s, cur) {
  const a = s.args.map((x) => (x.k === "ref" ? x : run(x, cur)));
  switch (s.name) {
    case "length": return Array.isArray(a[0]) || typeof a[0] === "string" ? a[0].length : a[0] && typeof a[0] === "object" ? Object.keys(a[0]).length : null;
    case "contains": return Array.isArray(a[0]) ? a[0].some((x) => JSON.stringify(x) === JSON.stringify(a[1])) : typeof a[0] === "string" ? a[0].includes(a[1]) : null;
    case "starts_with": return typeof a[0] === "string" ? a[0].startsWith(a[1]) : null;
    case "sort": return Array.isArray(a[0]) ? [...a[0]].sort() : null;
    case "reverse": return Array.isArray(a[0]) ? [...a[0]].reverse() : typeof a[0] === "string" ? [...a[0]].reverse().join("") : null;
    case "join": return Array.isArray(a[1]) ? a[1].join(a[0]) : null;
    case "to_string": return typeof a[0] === "string" ? a[0] : JSON.stringify(a[0]);
    case "max": return Array.isArray(a[0]) && a[0].length ? a[0].reduce((x, y) => (y > x ? y : x)) : null;
    case "min": return Array.isArray(a[0]) && a[0].length ? a[0].reduce((x, y) => (y < x ? y : x)) : null;
    case "sum": return Array.isArray(a[0]) ? a[0].reduce((x, y) => x + y, 0) : null;
    case "sort_by": return Array.isArray(a[0]) && a[1]?.k === "ref" ? [...a[0]].sort((x, y) => { const p = run(a[1].e, x), q = run(a[1].e, y); return p < q ? -1 : p > q ? 1 : 0; }) : null;
  }
  return null;
}
