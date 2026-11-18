// 日ごとの演習記録と「前日の復習」。
// 記録 … 資格問題演習・サービス知識問題の回答履歴（aaa.practice.attempts.v1）を日付ごとにまとめる（端末の現地時間）。
// 前日の復習 … 毎日、直近の学習日（今日より前で回答がある最後の日）に解いた問題から復習セットを作る。
//   ①その日に間違えた問題（すべて）②その類題（同じ試験・同じ論点の未回答の問題。無ければ同じサービスが登場する問題）
//   ③その日に正解した問題の一部（定着の確認）。セットはその日のうちは変わらないよう aaa.review.v1 に保存し、アカウントに同期する。
import { store } from "./storage.js";
import { questions } from "./data/questions.js";
import { serviceQuestions } from "./data/service-questions.js";
import { servicesIn } from "./data/service-terms.js";
import { primaryExam } from "./data/exams.js";

const KEY = "aaa.review.v1";
const ATT = "aaa.practice.attempts.v1";
const MAX = 40;
const all = [...questions, ...serviceQuestions];
export const qById = new Map(all.map((q) => [q.id, q]));
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const pad = (n) => String(n).padStart(2, "0");
export const ymd = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const today = () => ymd(new Date());
const WD = ["日", "月", "火", "水", "木", "金", "土"];
export const mdw = (s) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}(${WD[new Date(s + "T00:00:00").getDay()]})`;

export function readAttempts() {
  try {
    const a = store.get(ATT, []);
    return Array.isArray(a) ? a.filter((x) => x && qById.has(x.id) && typeof x.correct === "boolean" && Number.isFinite(Date.parse(x.at))) : [];
  } catch {
    return [];
  }
}

/** 日付 → その日に解いた問題 [{ id, n（回答回数）, ok（正解数）, last（最後の結果）, firstWrong（その日に1回でも間違えたか） }]（最初に解いた順） */
export function dayRecords(atts = readAttempts()) {
  const days = new Map();
  [...atts].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).forEach((a) => {
    const d = ymd(new Date(a.at));
    const m = days.get(d) || days.set(d, new Map()).get(d);
    const r = m.get(a.id) || m.set(a.id, { id: a.id, n: 0, ok: 0, last: false, wrong: false }).get(a.id);
    r.n++;
    if (a.correct) r.ok++;
    else r.wrong = true;
    r.last = a.correct;
  });
  const out = new Map();
  [...days.keys()].sort().reverse().forEach((d) => out.set(d, [...days.get(d).values()]));
  return out;
}

/* ---------- 前日の復習セット ---------- */
function rng(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = (a, r) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function similarOf(q, answered, taken, r) {
  const ok = (x) => x.id !== q.id && !answered.has(x.id) && !taken.has(x.id);
  if (q.kind === "service") {
    const c = serviceQuestions.filter((x) => ok(x) && x.service === q.service);
    return c.length ? c[Math.floor(r() * c.length)] : null;
  }
  const code = primaryExam(q);
  const same = questions.filter((x) => ok(x) && x.exams[code] && x.topic === q.topic);
  if (same.length) return same[Math.floor(r() * same.length)];
  const svc = servicesIn(q.concept || "", q.prompt || "").slice(0, 3);
  if (!svc.length) return null;
  const near = questions.filter((x) => ok(x) && x.exams[code] && servicesIn(x.concept || "").some((s) => svc.includes(s)));
  return near.length ? near[Math.floor(r() * near.length)] : null;
}
function build(from, recs, atts) {
  const r = rng(today() + from);
  const answered = new Set(atts.map((a) => a.id));
  const wrong = recs.filter((x) => x.wrong).map((x) => x.id);
  const right = shuffle(recs.filter((x) => !x.wrong).map((x) => x.id), r);
  const taken = new Set([...wrong, ...right]);
  const similar = [];
  for (const id of wrong) {
    if (similar.length >= 10) break;
    const s = similarOf(qById.get(id), answered, taken, r);
    if (s) {
      similar.push(s.id);
      taken.add(s.id);
    }
  }
  // 正解した問題は半分（最低 3 問）を確認用に入れる
  const keepRight = right.slice(0, Math.max(Math.min(3, right.length), Math.ceil(right.length / 2)));
  let w = wrong.slice(0, MAX), s = similar, k = keepRight;
  s = s.slice(0, Math.max(0, MAX - w.length));
  k = k.slice(0, Math.max(0, MAX - w.length - s.length));
  const kinds = {};
  w.forEach((id) => (kinds[id] = "wrong"));
  s.forEach((id) => (kinds[id] = "similar"));
  k.forEach((id) => (kinds[id] = "right"));
  return { date: today(), from, ids: shuffle([...w, ...s, ...k], r), kinds, size: recs.length };
}
/** 今日の復習セット（前の学習日が無ければ null） */
export function reviewSet() {
  const atts = readAttempts();
  const t = today();
  const saved = store.get(KEY, null);
  if (saved && saved.date === t && Array.isArray(saved.ids) && saved.ids.every((id) => qById.has(id))) return saved;
  const days = dayRecords(atts);
  const from = [...days.keys()].find((d) => d < t);
  if (!from) return null;
  const set = build(from, days.get(from), atts.filter((a) => ymd(new Date(a.at)) < t));
  if (!set.ids.length) return null;
  store.set(KEY, set);
  return set;
}
/** 今日の実施状況: done（今日解いた問題数）, correct（そのうち直近が正解） */
export function reviewProgress(set, atts = readAttempts()) {
  const t = today(), ids = new Set(set.ids);
  const last = new Map();
  atts.forEach((a) => ids.has(a.id) && ymd(new Date(a.at)) === t && last.set(a.id, a.correct));
  return { done: last.size, correct: [...last.values()].filter(Boolean).length, total: set.ids.length, doneIds: new Set(last.keys()) };
}
export function startIds(ids, label) {
  if (!ids.length) return;
  window.dispatchEvent(new CustomEvent("practice-preset", { detail: { ids, label } }));
  $("quiz-start")?.click();
  if (location.hash !== "#practice") location.hash = "practice";
}
export function startReview() {
  const set = reviewSet();
  if (!set) return;
  const p = reviewProgress(set);
  const rest = set.ids.filter((id) => !p.doneIds.has(id));
  startIds(rest.length ? rest : set.ids, `前日の復習（${mdw(set.from)} の問題から）`);
}
const KIND_LABEL = { wrong: "間違えた問題", similar: "類題", right: "正解の確認" };
export function reviewSummary(set) {
  const c = { wrong: 0, similar: 0, right: 0 };
  set.ids.forEach((id) => c[set.kinds[id]]++);
  return Object.entries(c).filter(([, n]) => n).map(([k, n]) => `${KIND_LABEL[k]} ${n}`).join("・");
}

/** 前日の復習のカード（資格問題演習の設定画面・学習計画で使う） */
export function reviewCard(cls = "") {
  const set = reviewSet();
  const box = el("div", `review-card ${cls}`);
  if (!set) {
    box.classList.add("empty");
    box.append(el("span", "review-ic", "🔁"), el("p", "review-txt", "前日の復習：問題を解いた翌日から、その日に解いた問題をもとに復習問題（間違えた問題・類題・正解の確認）を毎日作ります。"));
    return box;
  }
  const p = reviewProgress(set);
  const txt = el("div", "review-txt");
  const head = el("p", "review-h");
  head.append(el("b", "", "🔁 前日の復習"), document.createTextNode(` ${mdw(set.from)} に解いた ${set.size} 問から ${set.ids.length} 問を作成`));
  const bar = el("span", "review-bar");
  const fill = el("i");
  fill.style.width = Math.round((p.done / p.total) * 100) + "%";
  bar.append(fill);
  txt.append(head, el("small", "", reviewSummary(set)), bar, el("small", "", `今日 ${p.done} / ${p.total} 問を実施${p.done ? `（正解 ${p.correct}）` : ""}${p.done >= p.total ? " ✓ 完了" : ""}`));
  const b = el("button", p.done >= p.total ? "goal-btn" : "button primary", p.done >= p.total ? "もう一度解く" : p.done ? "続きから" : "復習を始める");
  b.type = "button";
  b.addEventListener("click", startReview);
  box.append(txt, b);
  return box;
}

/** 日ごとに解いた問題の一覧（学習計画のページで使う）。open に指定した日を開いておく */
export function recordList(open, limit = 21) {
  const days = dayRecords();
  const wrap = el("section", "record-list panel");
  const h = el("div", "plan-cal-h");
  h.append(el("h2", "", "日ごとに解いた問題"), el("span", "plan-legend", `${days.size} 日分の記録`));
  wrap.append(h);
  if (!days.size) {
    wrap.append(el("p", "plan-note-s", "資格問題演習で問題を解くと、日ごとに記録されます。"));
    return wrap;
  }
  [...days.entries()].slice(0, limit).forEach(([d, recs]) => {
    const det = el("details", "record-day");
    det.dataset.date = d;
    if (d === open) det.open = true;
    const ok = recs.filter((r) => r.last).length;
    const sum = el("summary");
    sum.append(el("b", "", mdw(d) + (d === today() ? " 今日" : "")), el("span", "", `${recs.length} 問`), el("span", ok / recs.length >= 0.8 ? "rec-good" : ok / recs.length < 0.6 ? "rec-bad" : "", `正解 ${ok} / ${recs.length}（${Math.round((ok / recs.length) * 100)}%）`));
    det.append(sum);
    det.addEventListener(
      "toggle",
      () => {
        if (!det.open || det.dataset.ready) return;
        det.dataset.ready = "1";
        const acts = el("div", "record-acts");
        const again = el("button", "goal-btn", `この日の ${recs.length} 問をもう一度`);
        again.type = "button";
        again.addEventListener("click", () => startIds(recs.map((r) => r.id), `${mdw(d)} に解いた問題`));
        acts.append(again);
        const wrongIds = recs.filter((r) => !r.last).map((r) => r.id);
        if (wrongIds.length) {
          const w = el("button", "goal-btn", `不正解だった ${wrongIds.length} 問だけ`);
          w.type = "button";
          w.addEventListener("click", () => startIds(wrongIds, `${mdw(d)} に不正解だった問題`));
          acts.append(w);
        }
        const ul = el("ul", "record-qs");
        recs.forEach((r) => {
          const q = qById.get(r.id);
          const li = el("li", r.last ? "ok" : "ng");
          li.append(el("span", "rec-mark", r.last ? "○" : "×"), el("span", "rec-code", q.kind === "service" ? "サービス" : primaryExam(q) || ""));
          const btn = el("button", "rec-q", q.concept || q.topic || q.prompt.slice(0, 40));
          btn.type = "button";
          btn.title = "この問題を解き直す\n" + q.prompt.slice(0, 120);
          btn.addEventListener("click", () => startIds([r.id], `${mdw(d)} の問題`));
          li.append(btn, el("small", "", r.n > 1 ? `${r.n} 回（正解 ${r.ok}）` : ""));
          ul.append(li);
        });
        det.append(acts, ul);
      },
    );
    wrap.append(det);
    if (det.open) det.dispatchEvent(new Event("toggle"));
  });
  return wrap;
}

/* ---------- 資格問題演習の設定画面に表示 ---------- */
function renderPractice() {
  const holder = $("review-box");
  if (!holder) return;
  holder.replaceChildren(reviewCard());
}
let dirty = true;
window.addEventListener("learning-update", () => {
  if ($("practice")?.hidden === false && $("practice-setup")?.hidden === false) renderPractice();
  else dirty = true;
});
window.addEventListener("route-change", (e) => {
  if (e.detail?.page === "practice" && dirty) {
    dirty = false;
    renderPractice();
  }
});
// 演習の結果から設定画面に戻ったときも最新にする
new MutationObserver(() => $("practice-setup") && !$("practice-setup").hidden && renderPractice()).observe($("practice-setup") || document.body, { attributes: true, attributeFilter: ["hidden"] });
renderPractice();
