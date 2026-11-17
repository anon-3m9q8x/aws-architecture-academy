// 取得目標の資格（最大 3 つ）と受験予定日。学習データ aaa.goal.v1 としてアカウントに同期される。
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
  return { exams, date };
}
let goal = clean(store.get(KEY, null));
export const goalCodes = () => [...goal.exams];
export const goalDate = () => goal.date;
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
  const selected = new Set(goal.exams);
  ov.innerHTML = `<div class="goal-dlg" role="dialog" aria-modal="true" aria-labelledby="goal-dlg-t">
    <h2 id="goal-dlg-t">🎯 取得目標の資格</h2>
    <p class="goal-dlg-lead">目指している資格を選んでください（最大 ${MAX_GOALS} つ）。資格問題演習では、選んだ資格の問題に絞って出題します。</p>
    <div class="goal-levels">${LEVELS.map((lv) => {
      const ex = goalExams().filter((e) => e.level === lv);
      if (!ex.length) return "";
      return `<fieldset><legend>${LEVEL_JA[lv]}</legend>${ex.map((e) => `<label class="goal-opt"><input type="checkbox" value="${e.code}" ${selected.has(e.code) ? "checked" : ""}><span><b>${e.code}</b>${e.name}${e.retire ? `<small>${e.retire.slice(5).replace("-", "/")} まで</small>` : ""}</span></label>`).join("")}</fieldset>`;
    }).join("")}</div>
    <label class="goal-date">受験予定日（任意）<input type="date" value="${goal.date}" min="${today()}"></label>
    <p class="goal-msg" role="status"></p>
    <div class="goal-acts"><button type="button" class="goal-clear">目標を外す</button><span></span><button type="button" class="goal-cancel">キャンセル</button><button type="button" class="goal-save">保存</button></div>
  </div>`;
  document.body.append(ov);
  const boxes = [...ov.querySelectorAll('input[type="checkbox"]')];
  const msg = ov.querySelector(".goal-msg");
  const sync = () => {
    const n = boxes.filter((b) => b.checked).length;
    boxes.forEach((b) => (b.disabled = !b.checked && n >= MAX_GOALS));
    msg.textContent = n ? `${n} つ選択中${n >= MAX_GOALS ? `（最大 ${MAX_GOALS} つ）` : ""}` : "資格を選んでください";
  };
  boxes.forEach((b) => b.addEventListener("change", sync));
  sync();
  const close = () => {
    ov.remove();
    prev?.focus?.({ preventScroll: true });
  };
  ov.querySelector(".goal-cancel").addEventListener("click", close);
  ov.querySelector(".goal-clear").addEventListener("click", () => {
    setGoal({ exams: [], date: "" });
    close();
  });
  ov.querySelector(".goal-save").addEventListener("click", () => {
    // 選んだ順ではなく、試験の一覧の順（基礎 → 専門知識）で保存する。先頭が「主な目標」
    setGoal({ exams: boxes.filter((b) => b.checked).map((b) => b.value), date: ov.querySelector('input[type="date"]').value });
    setFocus(true);
    close();
  });
  ov.addEventListener("click", (e) => e.target === ov && close());
  ov.addEventListener("keydown", (e) => e.key === "Escape" && close());
  (boxes.find((b) => b.checked) || boxes[0])?.focus();
}
