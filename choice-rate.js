// 選択肢の「選んだらまずい度」評価。資格問題演習で回答したあと、不正解の選択肢を 3 段階で自分で評価する。
// 惜しい（条件次第で成り立つ）／不適切（要件を満たさない・過剰）／危険（セキュリティ・データ損失・可用性を損なう）
// 保存キー aaa.choiceRate.v1 = { 問題ID: { 選択肢番号: 1〜3 } }。学習データとしてアカウントに同期する。
import { store } from "./storage.js";
const KEY = "aaa.choiceRate.v1";
export const LEVELS = [
  [1, "惜しい", "条件次第では成り立つ・要件の一部は満たす"],
  [2, "不適切", "要件を満たさない・コストや運用負荷が過大"],
  [3, "危険", "セキュリティ・データ損失・可用性を損なう"],
];
const ICON = { 1: "△", 2: "✕", 3: "☠" };
let data = store.get(KEY, {});
if (!data || typeof data !== "object" || Array.isArray(data)) data = {};
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
export const rateOf = (qid, i) => data[qid]?.[i] || 0;
export function setRate(qid, i, lv) {
  const m = { ...(data[qid] || {}) };
  if (lv) m[i] = lv;
  else delete m[i];
  if (Object.keys(m).length) data[qid] = m;
  else delete data[qid];
  store.set(KEY, data);
}
export const levelName = (lv) => LEVELS.find((l) => l[0] === lv)?.[1] || "";
export const badge = (lv) => el("span", `cr-badge cr-${lv}`, `${ICON[lv]} ${levelName(lv)}`);

/** 選択肢ごとの評価ボタン（不正解の選択肢に付ける）。onChange で要約を更新する */
export function rateWidget(q, i, onChange) {
  const box = el("div", "cr-widget");
  box.setAttribute("role", "radiogroup");
  box.setAttribute("aria-label", `選択肢 ${i + 1} を選んだらまずい度`);
  box.append(el("span", "cr-q", "選んだらまずい度"));
  const draw = () => {
    const cur = rateOf(q.id, i);
    box.querySelectorAll("button").forEach((b) => {
      const on = Number(b.dataset.lv) === cur;
      b.classList.toggle("on", on);
      b.setAttribute("aria-checked", String(on));
    });
    box.dataset.lv = cur;
  };
  LEVELS.forEach(([lv, name, hint]) => {
    const b = el("button", `cr-btn cr-${lv}`, `${ICON[lv]} ${name}`);
    b.type = "button";
    b.dataset.lv = lv;
    b.title = hint;
    b.setAttribute("role", "radio");
    b.addEventListener("click", () => {
      setRate(q.id, i, rateOf(q.id, i) === lv ? 0 : lv); // 同じものをもう一度押すと解除
      draw();
      onChange?.();
    });
    box.append(b);
  });
  draw();
  return box;
}
/** 評価の要約（この問題の不正解の選択肢をどう評価したか） */
export function rateSummary(q) {
  const wrong = q.choices.map((c, i) => (c.correct ? null : i)).filter((i) => i !== null);
  const done = wrong.filter((i) => rateOf(q.id, i));
  const p = el("p", "cr-summary");
  if (!done.length) {
    p.append(el("b", "", "選択肢の評価"), document.createTextNode(` 不正解の選択肢を「${LEVELS.map((l) => ICON[l[0]] + l[1]).join(" / ")}」で評価して、選んだらどれだけまずいかを整理しましょう（評価は保存され、次に解いたときにも表示されます）。`));
    return p;
  }
  p.append(el("b", "", `選択肢の評価 ${done.length} / ${wrong.length}`));
  LEVELS.forEach(([lv]) => {
    const n = done.filter((i) => rateOf(q.id, i) === lv).length;
    if (n) p.append(document.createTextNode(" "), badge(lv), document.createTextNode(` ${n}`));
  });
  return p;
}
/** 選んだ選択肢のうち、以前「危険」「不適切」と評価していたもの */
export function chosenRisk(q, sel) {
  return [...sel].filter((i) => !q.choices[i]?.correct && rateOf(q.id, i) >= 2).map((i) => [i, rateOf(q.id, i)]);
}
