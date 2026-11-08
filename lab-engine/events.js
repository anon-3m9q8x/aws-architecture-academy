// コマンド・ポリシー演習: EventBridge のイベントパターンの照合(学習用)。
// 対応: 値の配列(完全一致)、prefix・suffix・equals-ignore-case・wildcard・anything-but・numeric・exists、入れ子のオブジェクト。
// 照合は「パターンに書いたすべてのフィールドが一致(AND)、配列の中の値はどれか 1 つ(OR)」。
export class PatternError extends Error {}

/** パターンの形を検証する(葉は必ず配列) */
export function validatePattern(p, path = "") {
  if (!p || typeof p !== "object" || Array.isArray(p)) throw new PatternError(`Event pattern is not valid. Reason: ${path || "パターン"} はオブジェクトにします`);
  if (!Object.keys(p).length) throw new PatternError("Event pattern is not valid. Reason: 空のパターンは使えません");
  for (const [k, v] of Object.entries(p)) {
    const at = path ? `${path}.${k}` : k;
    if (Array.isArray(v)) {
      if (!v.length) throw new PatternError(`Event pattern is not valid. Reason: "${at}" の配列が空です`);
      for (const x of v) if (x && typeof x === "object") {
        const ops = Object.keys(x);
        const okOps = ["prefix", "suffix", "equals-ignore-case", "wildcard", "anything-but", "numeric", "exists"];
        if (ops.length !== 1 || !okOps.includes(ops[0])) throw new PatternError(`Event pattern is not valid. Reason: "${at}" の演算子「${ops.join(",")}」は使えません(学習用環境の対応: ${okOps.join(" / ")})`);
        if (ops[0] === "numeric" && (!Array.isArray(x.numeric) || x.numeric.length % 2)) throw new PatternError(`Event pattern is not valid. Reason: "${at}" の numeric は ["<", 100] のように演算子と数値の組で書きます`);
      }
    } else if (v && typeof v === "object") validatePattern(v, at);
    else throw new PatternError(`Event pattern is not valid. Reason: "${at}" must be an object or an array(値は配列で書きます。例: ["${v}"])`);
  }
}
function leaf(rule, val, present) {
  if (rule === null || typeof rule !== "object") return present && (Array.isArray(val) ? val : [val]).some((x) => x === rule);
  const [op, arg] = Object.entries(rule)[0];
  const vals = Array.isArray(val) ? val : [val];
  if (op === "exists") return arg ? present : !present;
  if (!present) return false;
  return vals.some((x) => {
    if (op === "prefix") return typeof x === "string" && (typeof arg === "string" ? x.startsWith(arg) : x.toLowerCase().startsWith(String(arg["equals-ignore-case"] || "").toLowerCase()));
    if (op === "suffix") return typeof x === "string" && x.endsWith(arg);
    if (op === "equals-ignore-case") return typeof x === "string" && x.toLowerCase() === String(arg).toLowerCase();
    if (op === "wildcard") return typeof x === "string" && new RegExp("^" + String(arg).replace(/[.+^${}()|[\]\\?]/g, "\\$&").replace(/\*/g, ".*") + "$").test(x);
    if (op === "anything-but") {
      if (arg && typeof arg === "object" && !Array.isArray(arg)) return !leaf(arg, x, true);
      return ![].concat(arg).includes(x);
    }
    if (op === "numeric") {
      if (typeof x !== "number") return false;
      for (let i = 0; i < arg.length; i += 2) {
        const o = arg[i], n = arg[i + 1];
        const ok = { "<": x < n, "<=": x <= n, ">": x > n, ">=": x >= n, "=": x === n }[o];
        if (!ok) return false;
      }
      return true;
    }
    return false;
  });
}
/** イベントがパターンに一致するか */
export function matchPattern(pattern, event) {
  return Object.entries(pattern).every(([k, rule]) => {
    const present = event && typeof event === "object" && Object.hasOwn(event, k);
    const val = present ? event[k] : undefined;
    if (Array.isArray(rule)) return rule.some((r) => leaf(r, val, present));
    if (!present || !val || typeof val !== "object") return false;
    return matchPattern(rule, val);
  });
}
/** put-events のエントリーを、EventBridge が届けるイベントの形にする */
export function toEvent(entry, env, i = 0) {
  return { version: "0", id: `0000000${i}-sim0-4e00-a000-00000000000${i}`, "detail-type": entry.DetailType, source: entry.Source, account: env.account, time: entry.Time || env.now || "2026-11-08T06:00:00Z", region: env.region, resources: entry.Resources || [], detail: typeof entry.Detail === "string" ? JSON.parse(entry.Detail) : entry.Detail || {} };
}
