// コマンド・ポリシー演習: 採点。文字列の完全一致ではなく、意味(構造)・動作(テストケース)・安全性で評価する。
// クリア = 必須の挙動がすべて合致し、禁止の挙動(許可してはいけない操作の許可)が 0 件。
// 判定対象外(unsupported)は「拒否」として採点しない。
import { validatePolicy } from "./validator-iam.js";
import { evaluate, DECISION_LABEL } from "./simulator-iam.js";
import { deployTemplate } from "./cfn.js";

export const STATUS = {
  syntax: { label: "構文エラー", tone: "bad", note: "JSON を解析できません" },
  config: { label: "設定上の問題", tone: "warn", note: "構文は正しいが、要件に合わない動作があります" },
  security: { label: "セキュリティ警告", tone: "bad", note: "許可してはいけない操作も許可しています" },
  unsupported: { label: "判定対象外", tone: "muted", note: "模擬評価の対応範囲外の要素があるため、正誤を判定できません" },
  pass: { label: "テスト成功", tone: "good", note: "この問題で定義した検証ケースをすべて満たしました(模擬評価)" },
  wrong: { label: "不正解", tone: "warn", note: "" },
  correct: { label: "正解", tone: "good", note: "" },
  idle: { label: "未実行", tone: "muted", note: "" },
};

const expectOk = (expect, got) => (expect === "deny" ? got === "implicit-deny" || got === "explicit-deny" : expect === got);

/** ポリシーの記述問題・修復問題 */
export function gradePolicy(q, src, env) {
  const kind = q.editor.policyKind || "identity";
  const v = validatePolicy(src, kind);
  if (v.syntax) return { status: "syntax", syntax: v.syntax, issues: [], cases: [] };
  const issues = v.issues;
  if (!v.ok) return { status: "config", issues, cases: [], doc: v.doc };
  const mine = { kind, name: q.editor.policyName || "あなたのポリシー", doc: v.doc, account: q.editor.account || env.account, to: q.editor.attachTo, accounts: q.editor.accounts };
  const cases = q.tests.map((t) => {
    const policies = [...(env.policies || []).filter((p) => !(q.editor.replaces && p.name === q.editor.replaces)), mine];
    const r = evaluate({ principal: t.principal, action: t.action, resource: t.resource, resourceAccount: t.resourceAccount || q.editor.resourceAccount, context: t.context || {} }, policies);
    const unsupported = r.decision === "unsupported";
    return { ...t, got: r.decision, pass: !unsupported && expectOk(t.expect, r.decision), unsupported, reason: r.reason, trace: r.trace, principalLabel: r.principal.label, overGrant: t.expect === "deny" && r.decision === "allow" };
  });
  let status;
  if (cases.some((c) => c.unsupported)) status = "unsupported";
  else if (cases.some((c) => c.overGrant)) status = "security";
  else if (cases.every((c) => c.pass)) status = "pass";
  else status = "config";
  return { status, issues, cases, doc: v.doc, securityWarnings: issues.filter((x) => x.level === "security") };
}

/** 読解問題(選択肢) */
export function gradeChoice(q, picked) {
  const correct = q.choices.map((c, i) => (c.correct ? i : -1)).filter((i) => i >= 0);
  const ok = picked.length === correct.length && correct.every((i) => picked.includes(i));
  return { status: ok ? "correct" : "wrong", correct, picked };
}

/** CLI・API の課題: 目標(goals)をセッションの状態と実行履歴で確認する */
export function gradeGoals(q, session) {
  const goals = q.goals.map((g) => {
    let ok = false, note = "";
    try { const r = g.test(session); ok = r === true || r?.ok === true; note = r?.note || ""; }
    catch (e) { ok = false; note = e.message; }
    return { label: g.label, ok, note };
  });
  const last = session.history.at(-1);
  if (last && last.status === "unsupported" && !goals.every((g) => g.ok)) return { status: "unsupported", goals };
  return { status: goals.every((g) => g.ok) ? "pass" : "config", goals };
}

/**
 * CloudFormation テンプレートの記述・修復問題: 模擬デプロイ(検証・組み込み関数の解決)をしてから、
 * 作られるリソースの設定を checks で確認する。security: true のチェックが満たされないときは「セキュリティ警告」。
 */
export function gradeTemplate(q, src) {
  const stack = deployTemplate(src, { params: q.editor.params || {}, stackName: q.editor.stackName || "lab-stack", imports: q.editor.imports });
  if (stack.syntax) return { status: "syntax", syntax: stack.syntax, stack, checks: [] };
  if (stack.errors.length) return { status: "config", stack, checks: [] };
  if (stack.unsupported.length) return { status: "unsupported", stack, checks: [] };
  // 別のパラメーターでのデプロイ結果(例: dev と prod の両方で確かめる)
  stack.variants = {};
  // variants の値は パラメーターの表、または { params, stackName }(別のスタック名でのデプロイ)
  for (const [name, cfg] of Object.entries(q.editor.variants || {})) {
    const opt = cfg && (cfg.params || cfg.stackName) ? cfg : { params: cfg };
    const v = deployTemplate(src, { params: opt.params || q.editor.params || {}, stackName: opt.stackName || q.editor.stackName || "lab-stack", imports: q.editor.imports });
    if (v.errors.length) return { status: "config", stack: { ...v, errors: v.errors.map((e) => ({ ...e, msg: `パラメーター ${name} でのデプロイ: ${e.msg}` })) }, checks: [] };
    stack.variants[name] = v;
  }
  const checks = q.checks.map((c) => {
    let ok = false;
    try { ok = !!c.test(stack); } catch { ok = false; }
    return { label: c.label, ok, security: !!c.security };
  });
  const status = checks.some((c) => c.security && !c.ok) ? "security" : checks.every((c) => c.ok) ? "pass" : "config";
  return { status, stack, checks };
}

/** 行単位の差分(LCS)。[{ t: "same" | "add" | "del", line }] */
export function lineDiff(a, b) {
  const A = a.split("\n"), B = b.split("\n");
  const n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i].trim() === B[j].trim() ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i].trim() === B[j].trim()) { out.push({ t: "same", line: B[j] }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push({ t: "del", line: A[i++] });
    else out.push({ t: "add", line: B[j++] });
  }
  while (i < n) out.push({ t: "del", line: A[i++] });
  while (j < m) out.push({ t: "add", line: B[j++] });
  return out;
}

export { DECISION_LABEL };
