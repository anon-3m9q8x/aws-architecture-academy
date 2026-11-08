// コマンド・ポリシー演習の問題データの統合と、一覧用のラベル・検索索引。
import { IAM_QUESTIONS } from "./questions-iam.js";
import { CLI_QUESTIONS } from "./questions-cli.js";
import { API_QUESTIONS } from "./questions-api.js";
import { ACCOUNT } from "./environments.js";

export const LAB_QUESTIONS = [...IAM_QUESTIONS, ...CLI_QUESTIONS, ...API_QUESTIONS];
export const labById = new Map(LAB_QUESTIONS.map((q) => [q.id, q]));

export const CATEGORY = { iam: { label: "IAM・S3 JSON", short: "IAM", icon: "{ }" }, cli: { label: "AWS CLI", short: "CLI", icon: ">_" }, api: { label: "API リクエスト", short: "API", icon: "⇄" } };
export const MODE = { read: { label: "読解", note: "コードの意図・影響範囲を読む" }, write: { label: "記述", note: "要件を設定に落とし込む" }, exec: { label: "実行", note: "実行して結果を確かめる" }, fix: { label: "修復", note: "誤設定・誤ったコマンドを直す" } };
export const LEVEL = { 1: "意味・一部分", 2: "単一サービスの設定", 3: "複数条件の検証", 4: "複数アカウント・権限・障害復旧" };
export const EXAM_TAGS = [...new Set(LAB_QUESTIONS.flatMap((q) => q.examTags))].sort();

/** IAM 問題の固定の環境(問題で編集しないポリシー) */
export function iamEnv(q) {
  return { account: ACCOUNT, policies: q.envPolicies || [] };
}
/** 読解問題で表示するポリシーを、環境のポリシーと合わせた一覧 */
export function readPolicies(q, doc) {
  return [...(q.envPolicies || []), { kind: q.codeKind || "identity", name: "表示中のポリシー", doc, to: q.codeAttachTo, accounts: q.codeAccounts, account: ACCOUNT }];
}
export const searchText = (q) => [q.id, q.title, q.scenario, ...(q.requirements || []), ...(q.examTags || []), CATEGORY[q.category].label, MODE[q.mode].label].join(" ").toLowerCase();
