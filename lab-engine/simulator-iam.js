// コマンド・ポリシー演習: IAM の許可判定(学習用の模擬評価)。
// AWS の評価ロジック(明示的な Deny → SCP → リソースベース → アクセス許可の境界 → アイデンティティベース)のうち、
// SUPPORT に挙げた範囲だけを再現する。対応外の条件キー・演算子は成功も失敗もでっちあげず "unsupported" を返す。
// 公式の IAM Policy Simulator / Access Analyzer と同じ結果になることは保証しない。
import { splitOperator, arr } from "./validator-iam.js";

export const SUPPORT = {
  elements: ["Version", "Statement", "Sid", "Effect", "Action", "NotAction", "Resource", "NotResource", "Principal", "NotPrincipal", "Condition"],
  policyTypes: ["アイデンティティベース", "リソースベース(S3 バケットポリシーなど)", "ロールの信頼ポリシー", "SCP", "アクセス許可の境界"],
  conditionKeys: ["aws:username", "aws:userid", "aws:PrincipalArn", "aws:PrincipalAccount", "aws:PrincipalType", "aws:PrincipalOrgID", "aws:PrincipalTag/*", "aws:ResourceTag/*", "aws:RequestTag/*", "aws:TagKeys", "aws:SourceIp", "aws:SourceVpce", "aws:SourceVpc", "aws:SecureTransport", "aws:MultiFactorAuthPresent", "aws:RequestedRegion", "aws:CurrentTime", "aws:SourceArn", "aws:SourceAccount", "aws:CalledVia", "s3:prefix", "s3:delimiter", "s3:max-keys", "s3:x-amz-server-side-encryption", "s3:x-amz-server-side-encryption-aws-kms-key-id", "s3:x-amz-acl", "s3:ExistingObjectTag/*", "s3:RequestObjectTag/*", "sts:ExternalId", "sts:RoleSessionName", "ec2:ResourceTag/*", "dynamodb:LeadingKeys", "kms:ViaService", "iam:PassedToService"],
  notModeled: ["セッションポリシー", "S3 のブロックパブリックアクセス・ACL・オブジェクト所有権", "KMS のグラント", "VPC エンドポイントポリシー", "RCP(リソースコントロールポリシー)", "サービスリンクロールの例外", "IPv6 の IpAddress 条件"],
};
const KEY_PREFIXES = SUPPORT.conditionKeys.filter((k) => k.endsWith("/*")).map((k) => k.slice(0, -1).toLowerCase());
const KEY_EXACT = new Set(SUPPORT.conditionKeys.filter((k) => !k.endsWith("/*")).map((k) => k.toLowerCase()));
const keySupported = (k) => KEY_EXACT.has(k.toLowerCase()) || KEY_PREFIXES.some((p) => k.toLowerCase().startsWith(p));
const MULTI_KEYS = new Set(["aws:tagkeys", "aws:calledvia", "dynamodb:leadingkeys"]);

/* ---------- 主体(プリンシパル) ---------- */
/** 主体の ARN と、条件キーの値(リクエストコンテキスト)を組み立てる */
export function principalInfo(p) {
  if (!p || p.kind === "anonymous") return { arn: null, account: null, label: "匿名(認証なし)", ctx: {}, type: "Anonymous" };
  if (p.kind === "service") return { arn: null, account: null, label: `サービス ${p.service}`, ctx: {}, type: "Service", service: p.service };
  const account = p.account;
  const tags = Object.fromEntries(Object.entries(p.tags || {}).map(([k, v]) => [`aws:PrincipalTag/${k}`, v]));
  if (p.kind === "iam-user") {
    const arn = `arn:aws:iam::${account}:user/${p.name}`;
    return { arn, account, label: `IAM ユーザー ${p.name}`, type: "User", ctx: { "aws:username": p.name, "aws:userid": p.userId || `AIDA${p.name.toUpperCase()}EXAMPLE`, "aws:PrincipalArn": arn, "aws:PrincipalAccount": account, "aws:PrincipalType": "User", ...(p.org ? { "aws:PrincipalOrgID": p.org } : {}), ...tags } };
  }
  if (p.kind === "iam-role") {
    const session = p.session || "session";
    const roleArn = `arn:aws:iam::${account}:role/${p.name}`;
    const arn = `arn:aws:sts::${account}:assumed-role/${p.name}/${session}`;
    return { arn, roleArn, account, label: `IAM ロール ${p.name}(セッション ${session})`, type: "AssumedRole", ctx: { "aws:userid": `AROA${p.name.toUpperCase()}EXAMPLE:${session}`, "aws:PrincipalArn": roleArn, "aws:PrincipalAccount": account, "aws:PrincipalType": "AssumedRole", ...(p.org ? { "aws:PrincipalOrgID": p.org } : {}), ...tags } };
  }
  if (p.kind === "root") {
    const arn = `arn:aws:iam::${account}:root`;
    return { arn, account, label: `アカウント ${account} のルートユーザー`, type: "Account", ctx: { "aws:PrincipalArn": arn, "aws:PrincipalAccount": account, "aws:PrincipalType": "Account" } };
  }
  return { arn: null, account: null, label: "不明な主体", ctx: {}, type: "Unknown", unsupported: true };
}

/* ---------- パターン照合 ---------- */
function globRe(pat, ci) {
  const re = "^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
  return new RegExp(re, ci ? "is" : "s");
}
export const globMatch = (pat, s, ci = false) => globRe(pat, ci).test(s);
/** ARN の照合: 6 つの構成要素(arn:partition:service:region:account:resource)ごとにワイルドカードを適用 */
export function arnMatch(pat, arn) {
  if (pat === "*") return true;
  const P = splitArn(pat), A = splitArn(arn);
  if (!P || !A) return globMatch(pat, arn);
  return P.every((p, i) => globMatch(p, A[i]));
}
function splitArn(s) {
  const parts = s.split(":");
  if (parts.length < 6 || parts[0] !== "arn") return null;
  return [...parts.slice(0, 5), parts.slice(5).join(":")];
}

/* ---------- ポリシー変数 ---------- */
const NOMATCH = Symbol("unresolved");
/** ${aws:username} などを置き換える。存在しない変数を含む値は一致しない(NOMATCH)。2012-10-17 以外では文字どおりに扱う */
function substitute(value, ctx, version, unsup) {
  if (version !== "2012-10-17" || typeof value !== "string" || !value.includes("${")) return value;
  let missing = false;
  const out = value.replace(/\$\{([^}]+)\}/g, (all, name) => {
    if (name === "*") return "\u0000STAR\u0000";
    if (name === "?") return "\u0000Q\u0000";
    if (name === "$") return "$";
    const key = name.trim();
    if (!keySupported(key)) { unsup.push(`ポリシー変数 \${${key}}`); return all; }
    const v = lookup(ctx, key);
    if (v === undefined || Array.isArray(v)) { missing = true; return all; }
    return String(v).replace(/[*?]/g, (c) => (c === "*" ? "\u0000STAR\u0000" : "\u0000Q\u0000"));
  });
  return missing ? NOMATCH : out;
}
/** 置換後の文字列をパターンとして照合(${*} ${?} はリテラルの * ? として扱う) */
function literalAwareGlob(pat, s, ci) {
  const parts = pat.split(/(\u0000STAR\u0000|\u0000Q\u0000)/);
  const re = "^" + parts.map((p) => (p === "\u0000STAR\u0000" ? "\\*" : p === "\u0000Q\u0000" ? "\\?" : p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, "."))).join("") + "$";
  return new RegExp(re, ci ? "is" : "s").test(s);
}
function arnMatchVar(pat, arn) {
  if (!pat.includes("\u0000")) return arnMatch(pat, arn);
  const P = splitArn(pat), A = splitArn(arn);
  if (!P || !A) return literalAwareGlob(pat, arn);
  return P.every((p, i) => literalAwareGlob(p, A[i]));
}
function lookup(ctx, key) {
  const k = Object.keys(ctx).find((x) => x.toLowerCase() === key.toLowerCase());
  return k === undefined ? undefined : ctx[k];
}

/* ---------- 条件 ---------- */
function ipInCidr(ip, cidr) {
  const toN = (a) => { const p = a.split(".").map(Number); return p.length === 4 && p.every((x) => x >= 0 && x <= 255) ? ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3] : null; };
  const [base, bits = "32"] = cidr.split("/");
  const a = toN(ip), b = toN(base), n = Number(bits);
  if (a === null || b === null || !(n >= 0 && n <= 32)) return null;
  const mask = n === 0 ? 0 : (~0 << (32 - n)) >>> 0;
  return ((a & mask) >>> 0) === ((b & mask) >>> 0);
}
const NEGATED = new Set(["StringNotEquals", "StringNotEqualsIgnoreCase", "StringNotLike", "NumericNotEquals", "DateNotEquals", "NotIpAddress", "ArnNotEquals", "ArnNotLike"]);
function compareOne(base, ctxVal, polVal) {
  const s = String(ctxVal), v = typeof polVal === "boolean" ? String(polVal) : polVal;
  switch (base) {
    case "StringEquals": case "StringNotEquals": return v !== NOMATCH && s === String(v).replace(/\u0000STAR\u0000/g, "*").replace(/\u0000Q\u0000/g, "?");
    case "StringEqualsIgnoreCase": case "StringNotEqualsIgnoreCase": return v !== NOMATCH && s.toLowerCase() === String(v).toLowerCase();
    case "StringLike": case "StringNotLike": return v !== NOMATCH && literalAwareGlob(String(v), s);
    case "ArnEquals": case "ArnNotEquals": return v !== NOMATCH && s === String(v);
    case "ArnLike": case "ArnNotLike": return v !== NOMATCH && arnMatchVar(String(v), s);
    case "Bool": return s.toLowerCase() === String(v).toLowerCase();
    case "IpAddress": case "NotIpAddress": { const r = ipInCidr(s, String(v)); if (r === null) throw new Unsup(`IP アドレス「${s}」または CIDR「${v}」(IPv4 のみ対応)`); return r; }
    default: {
      if (base.startsWith("Numeric")) {
        const a = Number(s), b = Number(v);
        if (Number.isNaN(a) || Number.isNaN(b)) return false;
        return { NumericEquals: a === b, NumericNotEquals: a === b, NumericLessThan: a < b, NumericLessThanEquals: a <= b, NumericGreaterThan: a > b, NumericGreaterThanEquals: a >= b }[base];
      }
      if (base.startsWith("Date")) {
        const t = (x) => (/^\d+$/.test(String(x)) ? Number(x) * 1000 : Date.parse(x));
        const a = t(s), b = t(v);
        if (Number.isNaN(a) || Number.isNaN(b)) return false;
        return { DateEquals: a === b, DateNotEquals: a === b, DateLessThan: a < b, DateLessThanEquals: a <= b, DateGreaterThan: a > b, DateGreaterThanEquals: a >= b }[base];
      }
      throw new Unsup(`条件演算子 ${base}`);
    }
  }
}
class Unsup extends Error {}
/** 1 つの条件キーの評価。戻り値 true / false。対応外は Unsup を投げる */
function evalKey(op, key, polValues, ctx, version) {
  const o = splitOperator(op);
  if (!o.known) throw new Unsup(`条件演算子 ${op}`);
  if (!keySupported(key)) throw new Unsup(`条件キー ${key}`);
  const unsup = [];
  const vals = arr(polValues).map((v) => substitute(v, ctx, version, unsup));
  if (unsup.length) throw new Unsup(unsup[0]);
  const raw = lookup(ctx, key);
  const present = raw !== undefined && !(Array.isArray(raw) && raw.length === 0);
  if (o.base === "Null") {
    const want = String(arr(polValues)[0]).toLowerCase() === "true";
    return want ? !present : present;
  }
  const neg = NEGATED.has(o.base);
  if (!present) {
    if (o.ifExists) return true;
    if (o.set === "ForAllValues") return true;
    return neg; // 否定の演算子は、キーが無いと true(一致しないので「等しくない」)
  }
  const ctxVals = arr(raw);
  const matchAny = (c) => vals.some((v) => compareOne(o.base, c, v));
  if (o.set === "ForAnyValue") return neg ? ctxVals.some((c) => !matchAny(c)) : ctxVals.some(matchAny);
  if (o.set === "ForAllValues") return neg ? ctxVals.every((c) => !matchAny(c)) : ctxVals.every(matchAny);
  if (MULTI_KEYS.has(key.toLowerCase()) && ctxVals.length > 1) throw new Unsup(`複数の値を持つ条件キー ${key} には ForAnyValue / ForAllValues が必要です`);
  return neg ? !matchAny(ctxVals[0]) : matchAny(ctxVals[0]);
}
function evalCondition(cond, ctx, version) {
  if (!cond) return { ok: true };
  const failed = [];
  for (const [op, block] of Object.entries(cond)) {
    for (const [key, v] of Object.entries(block || {})) {
      if (!evalKey(op, key, v, ctx, version)) failed.push(`${op} の ${key}`);
    }
  }
  return { ok: !failed.length, failed };
}

/* ---------- Principal の照合 ---------- */
/** 戻り値: "direct"(主体そのもの)/ "account"(アカウント単位の委任)/ false */
function principalMatch(pel, pi) {
  if (pel === "*") return "direct";
  if (!pel || typeof pel !== "object") return false;
  let best = false;
  for (const [type, v] of Object.entries(pel)) {
    for (const val of arr(v)) {
      if (type === "Service" && pi.type === "Service" && val === pi.service) return "direct";
      if (type !== "AWS") continue;
      if (val === "*") return "direct"; // {"AWS": "*"} は "*" と同じく、匿名を含むすべての主体
      if (!pi.account) continue;
      if (val === pi.account || val === `arn:aws:iam::${pi.account}:root`) best = best || "account";
      else if (val === pi.arn || (pi.roleArn && val === pi.roleArn)) return "direct";
    }
  }
  return best;
}

/**
 * ポリシーがこの主体に効くか。アイデンティティベース・境界は to(付け先: "user:alice" / "role:AppRole" / "*")、
 * SCP は accounts(対象アカウント)で決まる。リソースベース・信頼ポリシーは常に評価対象。
 */
export function appliesTo(pol, p, pi = principalInfo(p)) {
  if (pol.kind === "identity" || pol.kind === "boundary") {
    if (pol.account && pi.account && pol.account !== pi.account) return false;
    if (!pol.to) return true;
    const me = p?.kind === "iam-user" ? `user:${p.name}` : p?.kind === "iam-role" ? `role:${p.name}` : "";
    return arr(pol.to).some((t) => t === "*" || t === me);
  }
  if (pol.kind === "scp") return !pol.accounts || arr(pol.accounts).includes(pi.account);
  return true;
}

/** 1 つのステートメントが要求に当てはまるか。戻り値: { hit, why, unsupported } */
export function matchStatement(st, req, pi, version, kind) {
  const ctx = { ...pi.ctx, ...(req.context || {}) };
  // Action
  const act = req.action;
  const actHit = (list) => arr(list).some((a) => typeof a === "string" && globMatch(a, act, true));
  if ("Action" in st ? !actHit(st.Action) : actHit(st.NotAction)) return { hit: false, why: "Action が一致しない" };
  // Resource(信頼ポリシーには無い)
  if (kind !== "trust" && ("Resource" in st || "NotResource" in st)) {
    const unsup = [];
    const resHit = (list) => arr(list).some((r) => {
      const v = substitute(r, ctx, version, unsup);
      return v !== NOMATCH && typeof v === "string" && (v === "*" || arnMatchVar(v, req.resource));
    });
    const hit = "Resource" in st ? resHit(st.Resource) : !resHit(st.NotResource);
    if (unsup.length) return { hit: false, unsupported: unsup[0] };
    if (!hit) {
      const unresolved = arr(st.Resource ?? []).some((r) => substitute(r, ctx, version, []) === NOMATCH);
      return { hit: false, why: unresolved ? "Resource のポリシー変数がこの主体では解決できない" : "Resource が一致しない" };
    }
  }
  // Principal(リソースベース・信頼ポリシー)
  let via = null;
  if (kind === "resource" || kind === "trust") {
    if ("Principal" in st) { via = principalMatch(st.Principal, pi); if (!via) return { hit: false, why: "Principal が一致しない" }; }
    else if ("NotPrincipal" in st) { if (principalMatch(st.NotPrincipal, pi)) return { hit: false, why: "NotPrincipal に含まれる" }; via = "direct"; }
  }
  // Condition
  try {
    const c = evalCondition(st.Condition, ctx, version);
    if (!c.ok) return { hit: false, why: `Condition を満たさない(${c.failed.join("、")})` };
  } catch (e) {
    if (e instanceof Unsup) return { hit: false, unsupported: e.message };
    throw e;
  }
  return { hit: true, via };
}

/**
 * 要求 1 件を評価する。
 * req = { principal, action, resource, resourceAccount?, context? }
 * policies = [{ kind, name, doc, account? }]   (doc はパース済みの JSON)
 * 戻り値: { decision: "allow" | "implicit-deny" | "explicit-deny" | "unsupported", reason, matched[], trace[] }
 */
export function evaluate(req, policies) {
  const pi = principalInfo(req.principal);
  const trace = [];
  const matched = [];
  const unsupported = [];
  if (pi.unsupported) return { decision: "unsupported", reason: "この種類の主体は模擬評価の対象外です", matched, trace, principal: pi };
  const hits = { Deny: [], Allow: {} };
  policies = policies.filter((pol) => appliesTo(pol, req.principal, pi));
  for (const pol of policies) {
    const doc = pol.doc;
    if (!doc || typeof doc !== "object") continue;
    // SCP・境界・アイデンティティは主体のアカウントのものだけが効く
    if (["identity", "boundary", "scp"].includes(pol.kind) && (pi.type === "Service" || pi.type === "Anonymous")) continue;
    if (pol.kind === "scp" && pi.type === "Account") continue; // 管理アカウントのルートは除外(学習用の単純化)
    const version = doc.Version;
    arr(doc.Statement || []).forEach((st, idx) => {
      if (!st || typeof st !== "object") return;
      const r = matchStatement(st, req, pi, version, pol.kind);
      const ref = { policy: pol.name, kind: pol.kind, sid: st.Sid || `#${idx + 1}`, effect: st.Effect, via: r.via };
      if (r.unsupported) { unsupported.push(`${pol.name} の ${ref.sid}: ${r.unsupported}`); return; }
      if (!r.hit) return;
      matched.push(ref);
      if (st.Effect === "Deny") hits.Deny.push(ref);
      else if (st.Effect === "Allow") (hits.Allow[pol.kind] ||= []).push(ref);
    });
  }
  const label = (r) => `${r.policy}(${r.sid})`;
  // ① 明示的な Deny
  if (hits.Deny.length) {
    trace.push({ step: "明示的な Deny", result: `一致: ${hits.Deny.map(label).join("、")}`, decisive: true });
    return { decision: "explicit-deny", reason: `明示的な Deny(${hits.Deny.map(label).join("、")})が一致したため、どの Allow よりも優先して拒否`, matched, trace, principal: pi };
  }
  trace.push({ step: "明示的な Deny", result: "一致なし" });
  if (unsupported.length) {
    trace.push({ step: "対応範囲", result: unsupported[0], decisive: true });
    return { decision: "unsupported", reason: `模擬評価の対応範囲外の要素があるため判定できません: ${unsupported[0]}`, matched, trace, principal: pi };
  }
  const has = (k) => policies.some((p) => p.kind === k && !(["identity", "boundary", "scp"].includes(k) && (pi.type === "Service" || pi.type === "Anonymous")) && !(k === "scp" && pi.type === "Account"));
  const A = (k) => hits.Allow[k] || [];
  // ② SCP
  if (has("scp")) {
    if (!A("scp").length) {
      trace.push({ step: "SCP", result: "Allow が無い(SCP が許可していない操作)", decisive: true });
      return { decision: "implicit-deny", reason: "SCP がこの操作を許可していないため拒否(SCP は権限の上限)", matched, trace, principal: pi };
    }
    trace.push({ step: "SCP", result: `許可の範囲内: ${A("scp").map(label).join("、")}` });
  }
  // ③ リソースベース(信頼ポリシーを含む)
  const resAllow = [...A("resource"), ...A("trust")];
  const direct = resAllow.filter((r) => r.via === "direct");
  const resourceAccount = req.resourceAccount || policies.find((p) => p.kind === "resource" || p.kind === "trust")?.account || pi.account;
  const same = pi.account && resourceAccount === pi.account;
  const hasRes = has("resource") || has("trust");
  if (hasRes) trace.push({ step: "リソースベースのポリシー", result: resAllow.length ? `Allow が一致: ${resAllow.map((r) => `${label(r)}${r.via === "account" ? "(アカウント単位)" : ""}`).join("、")}` : "Allow の一致なし" });
  if (has("trust") && !A("trust").length) {
    trace.push({ step: "結果", result: "信頼ポリシーがこの主体を許可していない", decisive: true });
    return { decision: "implicit-deny", reason: "ロールを引き受けるには、そのロールの信頼ポリシーが主体を許可している必要がある(許可が無いので拒否)", matched, trace, principal: pi };
  }
  if (pi.type === "Service" || pi.type === "Anonymous") {
    if (direct.length) { trace.push({ step: "結果", result: "リソースベースのポリシーが許可", decisive: true }); return { decision: "allow", reason: `リソースベースのポリシー(${direct.map(label).join("、")})が許可`, matched, trace, principal: pi }; }
    return { decision: "implicit-deny", reason: "この主体を許可するリソースベースのポリシーが無いため拒否(暗黙的な拒否)", matched, trace, principal: pi };
  }
  if (same && direct.length && !has("trust")) {
    trace.push({ step: "結果", result: "同じアカウントで、リソースベースのポリシーが主体を直接指定して許可", decisive: true });
    return { decision: "allow", reason: `同じアカウント内では、主体を直接指定したリソースベースのポリシー(${direct.map(label).join("、")})だけで許可される`, matched, trace, principal: pi };
  }
  if (same && direct.length && has("trust")) {
    trace.push({ step: "結果", result: "信頼ポリシーが主体を直接指定して許可", decisive: true });
    return { decision: "allow", reason: `信頼ポリシー(${direct.map(label).join("、")})が主体を直接指定しているため、ロールを引き受けられる`, matched, trace, principal: pi };
  }
  // ④ アクセス許可の境界
  const idAllow = A("identity");
  if (has("boundary") && !A("boundary").length) {
    trace.push({ step: "アクセス許可の境界", result: "境界の範囲外", decisive: true });
    return { decision: "implicit-deny", reason: "アクセス許可の境界がこの操作を許可していないため拒否(アイデンティティベースの Allow があっても境界を超えられない)", matched, trace, principal: pi };
  }
  if (has("boundary")) trace.push({ step: "アクセス許可の境界", result: `範囲内: ${A("boundary").map(label).join("、")}` });
  // ⑤ アイデンティティベース
  trace.push({ step: "アイデンティティベースのポリシー", result: idAllow.length ? `Allow が一致: ${idAllow.map(label).join("、")}` : "Allow の一致なし" });
  if (!same && hasRes) {
    if (idAllow.length && resAllow.length) { trace.push({ step: "結果", result: "クロスアカウント: 両方が許可", decisive: true }); return { decision: "allow", reason: "別アカウントへのアクセスは、主体側のアイデンティティベースのポリシーと、相手側のリソースベースのポリシーの両方が許可しているため許可", matched, trace, principal: pi }; }
    trace.push({ step: "結果", result: "クロスアカウント: どちらかが許可していない", decisive: true });
    return { decision: "implicit-deny", reason: idAllow.length ? "別アカウントのリソースは、相手側のリソースベースのポリシーでも許可が必要(許可が無いので拒否)" : "別アカウントのリソースは、主体側のアイデンティティベースのポリシーでも許可が必要(許可が無いので拒否)", matched, trace, principal: pi };
  }
  if (!same && !hasRes) {
    trace.push({ step: "結果", result: "別アカウントのリソースにリソースベースのポリシーが無い", decisive: true });
    return { decision: "implicit-deny", reason: "別アカウントのリソースには、相手側のリソースベースのポリシー(またはロールの引き受け)が必要", matched, trace, principal: pi };
  }
  if (idAllow.length) { trace.push({ step: "結果", result: "許可", decisive: true }); return { decision: "allow", reason: `アイデンティティベースのポリシー(${idAllow.map(label).join("、")})が許可`, matched, trace, principal: pi }; }
  trace.push({ step: "結果", result: "どのポリシーも許可していない", decisive: true });
  return { decision: "implicit-deny", reason: "この操作を許可する Allow がどのポリシーにも無いため拒否(暗黙的な拒否)", matched, trace, principal: pi };
}

export const DECISION_LABEL = { allow: "許可(ALLOW)", "implicit-deny": "暗黙的な拒否(IMPLICIT_DENY)", "explicit-deny": "明示的な拒否(EXPLICIT_DENY)", unsupported: "判定対象外(UNSUPPORTED)" };
