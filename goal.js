// 取得目標の資格（最大 3 つ）と受験予定日、取得済みの資格。学習データ aaa.goal.v1 としてアカウントに同期される。
import { store } from "./storage.js";
import { EXAMS, LEVELS, examByCode } from "./data/exams.js";

const KEY = "aaa.goal.v1";
const FOCUS_KEY = "aaa.goal.focus"; // 「目標の資格に集中」の切り替え（端末ごとの表示設定なので同期しない）
export const MAX_GOALS = 3;
const today = () => new Date().toISOString().slice(0, 10);
/** 目標に選べる試験（受験終了日を過ぎた旧版は除く） */
export const goalExams = () => EXAMS.filter((e) => !e.retire || e.retire >= today());

function clean(raw) {
  const exams = Array.isArray(raw?.exams) ? [...new Set(raw.exams.filter((c) => examByCode.has(c)))].slice(0, MAX_GOALS) : [];
  const date = typeof raw?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : "";
  // 取得済み（目標と同じ資格は目標を優先）。旧版の試験も選べる
  const have = Array.isArray(raw?.have) ? [...new Set(raw.have.filter((c) => examByCode.has(c) && !exams.includes(c)))] : [];
  return { exams, date, have };
}
let goal = clean(store.get(KEY, null));
export const goalCodes = () => [...goal.exams];
export const goalDate = () => goal.date;
export const haveCodes = () => [...goal.have];
export function setGoal(next) {
  goal = clean(next);
  store.set(KEY, goal);
  window.dispatchEvent(new Event("goal-change"));
  window.dispatchEvent(new Event("learning-update"));
}
export function focusOn() {
  try { return localStorage.getItem(FOCUS_KEY) !== "0"; } catch { return true; }
}
export function setFocus(on) {
  try { localStorage.setItem(FOCUS_KEY, on ? "1" : "0"); } catch {}
  window.dispatchEvent(new Event("goal-change"));
}
/** 受験予定日までの日数（未設定なら null） */
export function daysLeft() {
  if (!goal.date) return null;
  const d = new Date(goal.date + "T00:00:00"), t = new Date(today() + "T00:00:00");
  return Math.round((d - t) / 86400000);
}

/* ---------- 目標の設定ダイアログ ---------- */
const LEVEL_JA = { Foundational: "基礎", Business: "ビジネス", Associate: "アソシエイト", Professional: "プロフェッショナル", Specialty: "専門知識" };
export function openGoalDialog() {
  const prev = document.activeElement;
  const ov = document.createElement("div");
  ov.className = "goal-ov";
  const stOf = (c) => (goal.exams.includes(c) ? "goal" : goal.have.includes(c) ? "have" : "none");
  const canGoal = new Set(goalExams().map((e) => e.code));
  ov.innerHTML = `<div class="goal-dlg" role="dialog" aria-modal="true" aria-labelledby="goal-dlg-t">
    <h2 id="goal-dlg-t">🎯 取得目標の資格・✅ 取得済みの資格</h2>
    <p class="goal-dlg-lead">資格ごとに「目標」か「取得済み」を選んでください。目標は最大 ${MAX_GOALS} つで、資格問題演習では目標の資格の問題に絞って出題します。取得済みは旧版の試験も選べます。</p>
    <div class="goal-levels">${LEVELS.map((lv) => {
      const ex = EXAMS.filter((e) => e.level === lv && (canGoal.has(e.code) || stOf(e.code) !== "none" || e.retire));
      if (!ex.length) return "";
      return `<fieldset><legend>${LEVEL_JA[lv]}</legend>${ex.map((e) => {
        const st = stOf(e.code), g = canGoal.has(e.code);
        const r = (v, label, dis) => `<label class="goal-st goal-st-${v}"><input type="radio" name="st-${e.code}" value="${v}" ${st === v ? "checked" : ""} ${dis ? "disabled" : ""}><span>${label}</span></label>`;
        return `<div class="goal-row" data-code="${e.code}"><span class="goal-row-n"><b>${e.code}</b>${e.name}${e.retire ? `<small>${e.retire < today() ? "受験終了" : e.retire.slice(5).replace("-", "/") + " まで"}</small>` : ""}</span><span class="goal-seg" role="radiogroup" aria-label="${e.code}">${r("none", "—")}${r("goal", "🎯 目標", !g)}${r("have", "✅ 取得済み")}</span></div>`;
      }).join("")}</fieldset>`;
    }).join("")}</div>
    <label class="goal-date">受験予定日（任意）<input type="date" value="${goal.date}" min="${today()}"></label>
    <p class="goal-msg" role="status"></p>
    <div class="goal-acts"><button type="button" class="goal-clear">すべて外す</button><span></span><button type="button" class="goal-cancel">キャンセル</button><button type="button" class="goal-save">保存</button></div>
  </div>`;
  document.body.append(ov);
  const rows = [...ov.querySelectorAll(".goal-row")];
  const val = (row) => row.querySelector("input:checked")?.value || "none";
  const msg = ov.querySelector(".goal-msg");
  const sync = () => {
    const ng = rows.filter((r) => val(r) === "goal").length, nh = rows.filter((r) => val(r) === "have").length;
    rows.forEach((r) => {
      const gi = r.querySelector('input[value="goal"]');
      gi.disabled = !canGoal.has(r.dataset.code) || (val(r) !== "goal" && ng >= MAX_GOALS);
      r.dataset.st = val(r);
    });
    msg.textContent = `目標 ${ng} つ${ng >= MAX_GOALS ? `（最大 ${MAX_GOALS} つ）` : ""} ・ 取得済み ${nh} つ`;
  };
  ov.querySelectorAll('input[type="radio"]').forEach((b) => b.addEventListener("change", sync));
  sync();
  const close = () => {
    ov.remove();
    prev?.focus?.({ preventScroll: true });
  };
  ov.querySelector(".goal-cancel").addEventListener("click", close);
  ov.querySelector(".goal-clear").addEventListener("click", () => {
    if (!confirm("目標と取得済みの資格をすべて外しますか？")) return;
    setGoal({ exams: [], date: "", have: [] });
    close();
  });
  ov.querySelector(".goal-save").addEventListener("click", () => {
    // 試験の一覧の順（基礎 → 専門知識）で保存する。目標の先頭が「主な目標」
    setGoal({
      exams: rows.filter((r) => val(r) === "goal").map((r) => r.dataset.code),
      have: rows.filter((r) => val(r) === "have").map((r) => r.dataset.code),
      date: ov.querySelector('input[type="date"]').value,
    });
    setFocus(true);
    close();
  });
  ov.addEventListener("click", (e) => e.target === ov && close());
  ov.addEventListener("keydown", (e) => e.key === "Escape" && close());
  (ov.querySelector('.goal-row[data-st="goal"] input:checked') || ov.querySelector('input[type="radio"]'))?.focus();
}
