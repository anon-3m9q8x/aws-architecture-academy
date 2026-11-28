import { store } from "./storage.js";
import { questions, DIFFICULTY } from "./data/questions.js";
import { serviceQuestions } from "./data/service-questions.js";
import { expertQuestions } from "./data/expert-questions.js?v=20261118p";
import { byId as svcById } from "./services.js";
import { findServices, servicesIn } from "./data/service-terms.js";
import { findTerms, termButton, termify } from "./glossary.js?v=20261128a";
import { EXAMS, LEVELS, examByCode, probability, probBand, BAND_LABEL, primaryExam, TIER } from "./data/exams.js";
import { rateTag, rateSummary, chosenAlert } from "./choice-rate.js?v=20261118e";
import { shuffledOrder, labelsFor } from "./ui.js";
import * as timer from "./timer.js?v=20261127b";
import { goalCodes, goalDate, haveCodes, daysLeft, focusOn, setFocus, openGoalDialog } from "./goal.js?v=20261117c";
const $ = (id) => document.getElementById(id);
const key = "aaa.practice.attempts.v1";
const LETTERS = "12345678"; // 選択肢の番号(1 から)
$("question-count").textContent = questions.length;
document
  .querySelectorAll("[data-question-count]")
  .forEach((n) => (n.textContent = questions.length));
// 資格試験の問題と、サービス知識問題(別枠)。回答履歴は両方まとめて保存する
// 上級チャレンジ(試験より難しい問題)も別枠として同じ仕組みで出題する
const allQuestions = [...questions, ...serviceQuestions, ...expertQuestions];
const questionMap = new Map(allQuestions.map((q) => [q.id, q]));
let kind = "exam"; // 演習の種類: exam = 資格試験の問題 / service = サービス知識(試験外) / expert = 上級チャレンジ(試験より難しい)
const isSvc = (q) => q.kind === "service";
const isExpert = (q) => q?.kind === "expert";
const bankQ = () => (kind === "service" ? serviceQuestions : kind === "expert" ? expertQuestions : questions);
const expertQs = new Map();
expertQuestions.forEach((q) => Object.keys(q.exams).forEach((c) => (expertQs.get(c) || expertQs.set(c, []).get(c)).push(q)));
/** 選択中の種類での、資格ごとの問題(通常の問題 / 上級チャレンジ) */
const qsOf = (code) => (kind === "expert" ? expertQs : examQs).get(code) || [];
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
let attempts = [];
try {
  const data = store.get(key, []);
  if (Array.isArray(data))
    attempts = data.filter(
      (a) =>
        a &&
        questionMap.has(a.id) &&
        typeof a.correct === "boolean" &&
        Number.isFinite(Date.parse(a.at)),
    );
} catch {
  $("storage-warning").hidden = false;
}

/* ---------- 回答履歴の集計(回答のたびに全件を数え直さないよう、追加分だけ反映する) ---------- */
// 資格ごとの問題(examProgress・概要表示で何度も使う)
const examQs = new Map();
questions.forEach((q) => Object.keys(q.exams).forEach((c) => (examQs.get(c) || examQs.set(c, []).get(c)).push(q)));
const lastMap = new Map(), // 問題 → 直近の回答
  wrongMap = new Map(), // 問題 → 誤答回数
  totalMap = new Map(), // 問題 → 回答回数
  examDone = new Map(), // 資格 → 解いた問題数(重複なし)
  examAnswers = new Map(); // 資格 → 回答回数
let correctTotal = 0;
function indexAttempt(a) {
  const q = questionMap.get(a.id);
  const first = !lastMap.has(a.id);
  lastMap.set(a.id, a);
  totalMap.set(a.id, (totalMap.get(a.id) || 0) + 1);
  if (a.correct) correctTotal++;
  else wrongMap.set(a.id, (wrongMap.get(a.id) || 0) + 1);
  if (isExpert(q)) return; // 上級チャレンジは資格ごとの実施数に含めない(別枠)
  for (const c of Object.keys(q?.exams || {})) {
    examAnswers.set(c, (examAnswers.get(c) || 0) + 1);
    if (first) examDone.set(c, (examDone.get(c) || 0) + 1);
  }
}
attempts.forEach(indexAttempt);

/* ---------- 解説の文章: 根拠ライン・サービス名のリンク ---------- */
const NUM = "①②③④⑤⑥⑦⑧⑨";
/** 文章にサービス名のリンクを付ける(図鑑へ移動し、戻るボタンで演習へ戻れる) */
// 1 問の表示の中で、用語のボタンは各用語の最初の 1 回だけにする(問題を表示するたびに空にする)
let termSeen = new Set();
function linkify(text, parent) {
  let p = 0;
  // サービス名(図鑑へのリンク)と用語(解説のボタン)を、重ならないように順に置く
  const spans = [...findServices(text).map((x) => ({ ...x, k: "svc" })), ...findTerms(text).map((x) => ({ ...x, k: "term" }))].sort((a, b) => a.start - b.start || (a.k === "svc" ? -1 : 1));
  for (const { start, end, id, k } of spans) {
    if (start < p) continue;
    if (k === "term" && termSeen.has(id)) continue;
    parent.append(document.createTextNode(text.slice(p, start)));
    if (k === "term") {
      termSeen.add(id);
      parent.append(termButton(id, text.slice(start, end)));
    } else {
      const a = el("a", "svc-link", text.slice(start, end));
      a.href = `#services/${id}`;
      a.dataset.svc = id;
      a.title = `サービス図鑑で「${svcById.get(id)?.name || id}」を開く`;
      parent.append(a);
    }
    p = end;
  }
  parent.append(document.createTextNode(text.slice(p)));
  return parent;
}
/** 問題文に根拠ライン(下線と番号)を引く。links=true ならサービス名もリンクにする */
function linedText(text, lines, parent, links) {
  const put = (t, into) => (links ? linkify(t, into) : termify(t, into, termSeen));
  let p = 0;
  (lines || []).forEach(([a, b, kind], i) => {
    if (a < p) return;
    put(text.slice(p, a), parent);
    const m = el("mark", `ev-line ev-${i % 4}`);
    m.dataset.n = NUM[i] || i + 1;
    m.title = `根拠${NUM[i] || i + 1}:${kind}`;
    put(text.slice(a, b), m);
    parent.append(m);
    p = b;
  });
  put(text.slice(p), parent);
  return parent;
}
/** 選択肢の本文の「間違いに直結する部分」に下線を引く(marks は本文の部分文字列) */
function markedText(text, marks, parent, links) {
  const put = (t, into) => (links ? linkify(t, into) : into.append(document.createTextNode(t)));
  const spans = [];
  (marks || []).forEach((m) => {
    const a = m ? text.indexOf(m) : -1;
    if (a >= 0) spans.push([a, a + m.length]);
  });
  spans.sort((x, y) => x[0] - y[0]);
  let p = 0;
  spans.forEach(([a, b]) => {
    if (a < p) return;
    put(text.slice(p, a), parent);
    const m = el("mark", "why-mark");
    m.title = "ここが間違いの決め手";
    put(text.slice(a, b), m);
    parent.append(m);
    p = b;
  });
  put(text.slice(p), parent);
  return parent;
}
const sentencesOf = (t) => (t.match(/[^。]+。?/g) || []).map((x) => x.trim()).filter(Boolean);

/* ---------- 成績 ---------- */
/** 資格ごとに、今までに解いた問題数(重複なし)と回答回数 */
function examProgress(code) {
  return { total: examQs.get(code)?.length || 0, done: examDone.get(code) || 0, answers: examAnswers.get(code) || 0 };
}
const progressText = (code) => {
  const p = examProgress(code);
  return `実施 ${p.done}/${p.total}問`;
};
/** 問題ごとの直近の回答(集計済みの Map。書き換えないこと) */
function latest() {
  return lastMap;
}
/** 問題ごとの誤答回数 */
function wrongCounts() {
  return wrongMap;
}
const REPEAT = 2; // 「複数回間違えた」とみなす誤答回数
const DOMAINS = [...new Set(questions.map((q) => q.domain)), "サービス知識(試験外)"];
function stats() {
  const last = latest();
  let wrong = 0, examAnswered = 0, svcAnswered = 0;
  for (const [id, a] of last) {
    if (!a.correct) wrong++;
    if (isSvc(questionMap.get(id))) svcAnswered++;
    else examAnswered++;
  }
  const correct = correctTotal;
  // 資格の選択肢に、各資格で今までに解いた問題数を表示する
  $("quiz-cert").querySelectorAll("option[data-base]").forEach((o) => (o.textContent = `${o.dataset.base} · ${progressText(o.value)}`));
  if (typeof renderOverview === "function" && $("exam-overview") && !$("practice-setup").hidden) renderOverview();
  const history = $("practice-history") || document.createElement("div");
  history.replaceChildren(
    el("span", "eyebrow", "PRACTICE INSIGHTS"),
    el("h2", "", "演習の学習状況"),
    el(
      "p",
      "muted",
      `資格試験 ${examAnswered} / ${questions.length} 問・サービス知識 ${svcAnswered} / ${serviceQuestions.length} 問に回答 · 回答 ${attempts.length} 回 · 正答率 ${attempts.length ? Math.round((correct / attempts.length) * 100) + "%" : "未回答"} · 復習対象 ${wrong} 問`,
    ),
  );
  // 資格ごとの実施状況(1 問でも解いた資格のみ)
  const examRows = el("div", "domain-results exam-progress");
  EXAMS.forEach((e) => {
    const p = examProgress(e.code);
    if (!p.total || !p.done) return;
    const row = el("div", "domain-row");
    const bar = el("span", "domain-bar");
    const fill = el("i");
    fill.style.width = Math.round((p.done / p.total) * 100) + "%";
    bar.append(fill);
    row.append(el("span", "", e.code), bar, el("span", "", `${p.done}/${p.total}問 実施 · ${p.answers}回答`));
    examRows.append(row);
  });
  if (examRows.childElementCount) history.append(el("p", "exam-ov-h", "資格ごとの実施問題数"), examRows, el("p", "exam-ov-h", "分野ごとの正答率"));
  const list = el("div", "domain-results");
  // 分野ごとの回答数・正解数を 1 回の走査で集計する
  const agg = new Map();
  for (const a of attempts) {
    const q = questionMap.get(a.id);
    const d = isSvc(q) ? "サービス知識(試験外)" : isExpert(q) ? "上級チャレンジ" : q.domain;
    const r = agg.get(d) || agg.set(d, [0, 0]).get(d);
    r[0]++;
    if (a.correct) r[1]++;
  }
  DOMAINS.forEach((domain) => {
    const [n, ok] = agg.get(domain) || [0, 0];
    const subset = { length: n };
    const rate = n ? Math.round((ok / n) * 100) : null;
    const row = el("div", "domain-row");
    const bar = el("span", "domain-bar");
    const fill = el("i");
    fill.style.width = (rate ?? 0) + "%";
    bar.append(fill);
    row.append(el("span", "", domain), bar, el("span", "", rate === null ? "未回答" : `${rate}% · ${subset.length}回答`));
    list.append(row);
  });
  history.append(list);
  const a = el("a", "", "演習・復習を開く →");
  a.href = "#practice";
  history.append(a);
  renderWeak();
}

/* ---------- 間違えた問題の一覧(誤答回数つき・個別にピックアップ) ---------- */
let weakPicked = new Set();
// 一覧の絞り込み: min = 誤答回数の下限 / open = 直近も不正解のみ / exam = 資格(all / 試験コード / service)
const weakFilter = { min: 1, open: false, exam: "all" };
let weakShown = 40; // 一度に表示する件数(「さらに表示」で増やす)
const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}/${d.getDate()}`;
};
/** 1 回でも間違えた問題すべて(誤答回数・回答回数・直近の結果つき) */
function wrongAll() {
  const last = latest();
  const total = totalMap;
  return [...wrongCounts()]
    .map(([id, n]) => {
      const l = last.get(id);
      return { q: questionMap.get(id), n, total: total.get(id) || n, lastOk: !!l?.correct, at: l?.at || "" };
    })
    .filter((x) => x.q)
    .sort((a, b) => b.n - a.n || (a.lastOk === b.lastOk ? b.at.localeCompare(a.at) : a.lastOk ? 1 : -1));
}
function weakList() {
  return wrongAll().filter(
    (x) =>
      x.n >= weakFilter.min &&
      (!weakFilter.open || !x.lastOk) &&
      (weakFilter.exam === "all" || (weakFilter.exam === "service" ? isSvc(x.q) : !isSvc(x.q) && !!x.q.exams?.[weakFilter.exam])),
  );
}
function startWith(ids, label) {
  window.dispatchEvent(new CustomEvent("practice-preset", { detail: { ids, label } }));
  $("quiz-start").click();
}
function renderWeak() {
  const box = $("weak-box");
  if (!box) return;
  const everything = wrongAll();
  const list = weakList();
  weakPicked = new Set([...weakPicked].filter((id) => list.some((x) => x.q.id === id)));
  box.replaceChildren();
  const head = el("div", "weak-head");
  const title = el("div");
  const wrongTotal = everything.reduce((s, x) => s + x.n, 0);
  title.append(
    el("p", "eyebrow orange", "REVIEW · 間違えた問題"),
    el("h3", "", `不正解だった問題 · ${everything.length} 問(誤答 合計 ${wrongTotal} 回)`),
  );
  head.append(title);
  box.append(head);
  if (!everything.length) {
    box.append(el("p", "muted weak-empty", "不正解だった問題が、間違えた回数つきでここに表示されます。1 問ずつ選んで解き直せます。"));
    return;
  }

  // 絞り込み
  const filters = el("div", "weak-filters");
  const seg = el("div", "weak-seg");
  seg.setAttribute("role", "group");
  seg.setAttribute("aria-label", "表示する問題");
  const opts = [
    { label: "すべて", min: 1, open: false },
    { label: `${REPEAT}回以上`, min: REPEAT, open: false },
    { label: "直近も不正解", min: 1, open: true },
  ];
  opts.forEach((o) => {
    const b = el("button", "", o.label);
    b.type = "button";
    b.setAttribute("aria-pressed", String(weakFilter.min === o.min && weakFilter.open === o.open));
    b.addEventListener("click", () => {
      weakFilter.min = o.min;
      weakFilter.open = o.open;
      weakShown = 40;
      renderWeak();
    });
    seg.append(b);
  });
  const sel = el("select", "weak-exam");
  sel.setAttribute("aria-label", "資格で絞り込む");
  const addOpt = (v, t) => {
    const o = el("option", "", t);
    o.value = v;
    sel.append(o);
  };
  addOpt("all", `すべての資格(${everything.length})`);
  EXAMS.forEach((e) => {
    const c = everything.filter((x) => !isSvc(x.q) && x.q.exams?.[e.code]).length;
    if (c) addOpt(e.code, `${e.code}(${c})`);
  });
  const sc = everything.filter((x) => isSvc(x.q)).length;
  if (sc) addOpt("service", `サービス知識(${sc})`);
  if (![...sel.options].some((o) => o.value === weakFilter.exam)) weakFilter.exam = "all";
  sel.value = weakFilter.exam;
  sel.addEventListener("change", () => {
    weakFilter.exam = sel.value;
    weakShown = 40;
    renderWeak();
  });
  filters.append(seg, sel, el("span", "weak-count", `${list.length} 問を表示`));
  box.append(filters);

  if (!list.length) {
    box.append(el("p", "muted weak-empty", "この条件に当てはまる問題はありません。"));
    return;
  }
  const tools = el("div", "weak-tools");
  const all = el("button", "", `表示中をすべて解き直す(${list.length}問)`);
  all.type = "button";
  all.addEventListener("click", () => startWith(list.map((x) => x.q.id), "間違えた問題"));
  const picked = el("button", "primary", "選んだ問題を解く");
  picked.type = "button";
  picked.disabled = !weakPicked.size;
  if (weakPicked.size) picked.textContent = `選んだ ${weakPicked.size} 問を解く`;
  picked.addEventListener("click", () => weakPicked.size && startWith([...weakPicked], `選んだ間違えた問題(${weakPicked.size}問)`));
  tools.append(picked, all);
  box.append(tools);

  const ul = el("ul", "weak-list");
  list.slice(0, weakShown).forEach(({ q, n, total, lastOk, at }) => {
    const li = el("li", lastOk ? "is-ok" : "");
    const lab = el("label", "weak-pick");
    const cb = el("input");
    cb.type = "checkbox";
    cb.checked = weakPicked.has(q.id);
    cb.setAttribute("aria-label", `${q.id} を選ぶ`);
    cb.addEventListener("change", () => {
      if (cb.checked) weakPicked.add(q.id);
      else weakPicked.delete(q.id);
      picked.disabled = !weakPicked.size;
      picked.textContent = weakPicked.size ? `選んだ ${weakPicked.size} 問を解く` : "選んだ問題を解く";
    });
    const code = isSvc(q) ? "サービス知識" : primaryExam(q);
    const cnt = el("span", "weak-n");
    cnt.title = `${total} 回中 ${n} 回 不正解`;
    cnt.append(el("b", "", `×${n}`), el("small", "", `${total}回中`));
    const date = fmtDate(at);
    lab.append(
      cb,
      cnt,
      el("span", "weak-meta", `${code} · ${q.topic}${date ? ` · 最終 ${date}` : ""}`),
      el("span", "weak-q", q.prompt),
      el("span", `weak-last ${lastOk ? "ok" : "ng"}`, lastOk ? "直近は正解" : "直近も不正解"),
    );
    const go = el("button", "weak-go", "この問題を解く");
    go.type = "button";
    go.addEventListener("click", () => startWith([q.id], `間違えた問題 ${q.id}`));
    li.append(lab, go);
    ul.append(li);
  });
  box.append(ul);
  if (list.length > weakShown) {
    const more = el("button", "weak-more", `さらに表示(残り ${list.length - weakShown} 問)`);
    more.type = "button";
    more.addEventListener("click", () => {
      weakShown += 40;
      renderWeak();
    });
    box.append(more);
  }
}

/* ---------- 出題条件 ---------- */
function pool() {
  const last = latest();
  const wc = wrongCounts();
  const code = $("quiz-cert").value;
  const dom = $("quiz-domain").value;
  const band = $("quiz-prob").value;
  const svc = kind === "service";
  // 苦手問題などの指定出題は、種類をまたいで出す
  const goalSel = code === "goal";
  const base = presetIds
    ? allQuestions.filter((q) => presetIds.has(q.id))
    : !svc && goalSel
      ? kind === "expert"
        ? expertQuestions.filter((q) => goalCodes().some((c) => q.exams[c]))
        : goalQuestions()
      : !svc && code !== "all"
        ? qsOf(code)
        : bankQ();
  const diff = $("quiz-difficulty").value, mode = $("quiz-mode").value;
  return base.filter(
    (q) =>
      (presetIds || svc || code === "all" || goalSel || !!q.exams[code]) &&
      (presetIds || dom === "all" || (dom.startsWith("d:") ? q.exams[code]?.[0] === Number(dom.slice(2)) : q.domain === dom)) &&
      (presetIds || svc || kind === "expert" || band === "all" || probBand(probability(q, examFor(q))) === band) &&
      (diff === "all" || q.difficulty === Number(diff)) &&
      (mode === "all" ||
        (mode === "wrong"
          ? last.has(q.id) && !last.get(q.id).correct
          : mode === "repeat"
            ? (wc.get(q.id) || 0) >= REPEAT
            : !last.has(q.id))) &&
      (!presetIds || presetIds.has(q.id)),
  );
}
let presetIds = null;
/** 演習を始めた時点の、問題ごとの前回の結果(今回の回答で上書きしない) */
let prevResults = new Map();
function updatePool() {
  const count = pool().length;
  const real = $("quiz-limit").value === "real" && count ? ` → 実試験と同じ ${Math.min(count, realCount())} 問をランダムに出題` : "";
  $("pool-count").textContent =
    `${count} 問が対象${count ? "" : " — 条件を変更してください"}${real}`;
  $("quiz-start").disabled = !count;
  const chip = $("preset-chip");
  if (chip) chip.hidden = !presetIds;
}
/* ---------- 取得目標の資格 ---------- */
/** 目標の資格のうち、問題がある試験（一覧の順） */
const goalsWithQs = () => goalCodes().filter((c) => examQs.get(c)?.length);
let goalQsCache = { key: "", list: [] };
/** 目標の資格すべての問題（重複なし） */
function goalQuestions() {
  const codes = goalsWithQs();
  const key = codes.join(",");
  if (goalQsCache.key !== key) {
    const seen = new Set(), list = [];
    codes.forEach((c) => (examQs.get(c) || []).forEach((q) => !seen.has(q.id) && (seen.add(q.id), list.push(q))));
    goalQsCache = { key, list };
  }
  return goalQsCache.list;
}
const focusing = () => focusOn() && goalsWithQs().length > 0;
/** 資格の選択の既定値：目標に集中しているなら目標（複数なら「目標の資格すべて」）、ほかは すべて */
const defaultCert = () => (focusing() ? (goalsWithQs().length > 1 ? "goal" : goalsWithQs()[0]) : "all");
/* 資格(試験)の選択肢: 目標に集中しているときは目標の資格だけ。ほかはレベルごとにまとめ、目標の資格に ★ を付ける */
function buildCert() {
  const sel = $("quiz-cert");
  const keep = sel.value;
  sel.replaceChildren();
  const goals = goalsWithQs();
  if (focusing()) {
    if (goals.length > 1) {
      const o = el("option", "", `🎯 目標の資格すべて(${goals.join("・")})· ${goalQuestions().length}問`);
      o.value = "goal";
      sel.append(o);
    }
    goals.forEach((c) => {
      const e = examByCode.get(c);
      const o = el("option", "", "");
      o.value = c;
      o.dataset.base = `🎯 ${e.code} ${e.name}`;
      sel.append(o);
    });
  } else {
    const all = el("option", "", "すべての資格");
    all.value = "all";
    sel.append(all);
    LEVELS.forEach((lv) => {
      const g = el("optgroup");
      g.label = { Foundational: "基礎", Business: "ビジネス", Associate: "アソシエイト", Professional: "プロフェッショナル", Specialty: "専門知識" }[lv];
      EXAMS.filter((e) => e.level === lv).forEach((e) => {
        const n = examQs.get(e.code)?.length || 0;
        if (!n) return; // 問題のない試験(旧版)は出さない
        const o = el("option", "", "");
        o.value = e.code;
        o.dataset.base = `${goals.includes(e.code) ? "🎯 " : haveCodes().includes(e.code) ? "✅ " : ""}${e.code} ${e.name}${e.retire ? `(${e.retire.slice(5).replace("-", "/")} まで)` : ""}`;
        g.append(o);
      });
      if (g.children.length) sel.append(g);
    });
  }
  sel.querySelectorAll("option[data-base]").forEach((o) => (o.textContent = `${o.dataset.base} · ${progressText(o.value)}`));
  sel.value = [...sel.options].some((o) => o.value === keep) ? keep : defaultCert();
}
/* 演習の設定画面の上：目標の資格と「目標の資格に集中」 */
function renderGoalBar() {
  const bar = $("goal-bar");
  if (!bar) return;
  bar.replaceChildren();
  const goals = goalsWithQs();
  if (!goals.length) {
    bar.className = "goal-bar empty";
    const b = el("button", "goal-btn", "目標を設定する");
    b.type = "button";
    b.addEventListener("click", openGoalDialog);
    bar.append(el("span", "goal-ic", "🎯"), el("span", "goal-txt", "取得目標の資格を設定すると、その資格の問題に集中して演習できます。"), b);
    return;
  }
  bar.className = "goal-bar";
  const names = el("span", "goal-txt");
  names.append(el("b", "", "目標："), ...goals.map((c) => el("span", "goal-chip", c)));
  const d = daysLeft();
  if (d != null) names.append(el("span", "goal-days", d > 0 ? `受験まで あと ${d} 日` : d === 0 ? "今日が受験日" : "受験予定日を過ぎています"));
  const sw = el("label", "goal-sw");
  const cb = el("input");
  cb.type = "checkbox";
  cb.checked = focusOn();
  cb.addEventListener("change", () => setFocus(cb.checked));
  sw.append(cb, el("span", "", "目標の資格に集中"));
  const b = el("button", "goal-btn", "変更");
  b.type = "button";
  b.addEventListener("click", openGoalDialog);
  bar.append(el("span", "goal-ic", "🎯"), names, sw, b);
}
/* ホームの「取得目標の資格」カード：目標ごとの実施状況と受験までの日数 */
function renderGoalCard() {
  const card = $("goal-card");
  if (!card) return;
  card.replaceChildren();
  const goals = goalsWithQs();
  const head = el("div", "goal-card-h");
  head.append(el("h2", "", "🎯 取得目標と取得済みの資格"));
  const have = haveCodes();
  const edit = el("button", "goal-btn", goals.length || have.length ? "変更" : "目標を設定する");
  edit.type = "button";
  edit.addEventListener("click", openGoalDialog);
  head.append(edit);
  card.append(head);
  const haveRow = () => {
    if (!have.length) return;
    const row = el("p", "goal-have");
    row.append(el("b", "", "✅ 取得済み"), ...have.map((c) => {
      const x = el("span", "goal-have-chip", c);
      x.title = examByCode.get(c)?.name || c;
      return x;
    }));
    card.append(row);
  };
  if (!goals.length) {
    card.append(el("p", "goal-card-empty", "目指している資格を選ぶと、資格問題演習がその資格の問題に絞られ、ここに進み具合が表示されます。取得済みの資格も登録できます。"));
    haveRow();
    return;
  }
  const d = daysLeft();
  if (d != null) card.append(el("p", "goal-card-days", `${goalDate().replaceAll("-", "/")} 受験予定 · ${d > 0 ? `あと ${d} 日` : d === 0 ? "今日が受験日" : "受験予定日を過ぎています"}`));
  const list = el("div", "goal-card-list");
  goals.forEach((c) => {
    const e = examByCode.get(c), pg = examProgress(c);
    const a = el("a", "goal-card-item");
    a.href = "#practice";
    a.dataset.goal = c;
    const bar = el("span", "goal-card-bar");
    const fill = el("i");
    fill.style.width = (pg.total ? Math.round((pg.done / pg.total) * 100) : 0) + "%";
    bar.append(fill);
    a.append(el("b", "", e.code), el("span", "goal-card-name", e.name), bar, el("small", "", `${pg.done} / ${pg.total} 問を実施 · 演習する →`));
    list.append(a);
  });
  card.append(list);
  haveRow();
}
$("goal-card")?.addEventListener("click", (e) => {
  const a = e.target.closest("[data-goal]");
  if (!a) return;
  setFocus(true);
  $("quiz-cert").value = a.dataset.goal;
  $("quiz-cert").dispatchEvent(new Event("change"));
});
window.addEventListener("goal-change", () => {
  buildCert();
  $("quiz-cert").value = defaultCert();
  fillDomains();
  renderOverview();
  syncKind();
  updatePool();
  renderGoalBar();
  renderGoalCard();
});
window.addEventListener("route-change", (e) => e.detail?.page === "home" && renderGoalCard());
buildCert();
renderGoalBar();
renderGoalCard();
/** 表示・確率の計算に使う試験: 選択中の試験があればそれ、なければ問題の主な試験 */
function examFor(q) {
  if (isSvc(q)) return null;
  const code = $("quiz-cert").value;
  if (code === "goal") return goalsWithQs().find((c) => q.exams[c]) || primaryExam(q);
  return code !== "all" && q.exams[code] ? code : primaryExam(q);
}
/* 分野の選択肢: 資格を選ぶと試験ガイドの分野、すべてのときは問題の領域 */
function fillDomains() {
  const code = $("quiz-cert").value;
  const sel = $("quiz-domain");
  sel.replaceChildren(el("option", "", "すべての分野"));
  sel.firstChild.value = "all";
  if (kind === "service") {
    sel.firstChild.textContent = "すべてのカテゴリ";
    [...new Set(serviceQuestions.map((q) => q.domain))].forEach((cat) => {
      const o = el("option", "", `${cat} · ${serviceQuestions.filter((q) => q.domain === cat).length}問`);
      o.value = cat;
      sel.append(o);
    });
  } else if (code === "all" || code === "goal") {
    [...new Set((code === "goal" && kind !== "expert" ? goalQuestions() : bankQ()).map((q) => q.domain))].forEach((domain) => {
      const o = el("option", "", domain);
      o.value = domain;
      sel.append(o);
    });
  } else {
    examByCode.get(code).domains.forEach(([name, w], i) => {
      const n = qsOf(code).filter((q) => q.exams[code][0] === i + 1).length;
      const o = el("option", "", `分野${i + 1} ${name}(配点 ${w}%)· ${n}問`);
      o.value = "d:" + (i + 1);
      sel.append(o);
    });
  }
}
/* 選択中の試験の概要: 分野ごとの配点と問題数、出題確率の内訳 */
function renderOverview() {
  const box = $("exam-overview");
  if (!box) return;
  const code = $("quiz-cert").value;
  box.replaceChildren();
  if (kind === "service") {
    const grid = el("div", "exam-chips");
    [...new Set(serviceQuestions.map((q) => q.domain))].forEach((cat) => {
      const b = el("button", "exam-chip");
      b.type = "button";
      b.append(el("b", "", cat), el("span", "", `${serviceQuestions.filter((q) => q.domain === cat).length}問`));
      b.addEventListener("click", () => {
        $("quiz-domain").value = cat;
        updatePool();
      });
      grid.append(b);
    });
    box.append(
      el("p", "exam-ov-h", "サービス知識は資格試験の問題とは別枠です。図鑑の 250 以上のサービスについて、用途・利用シーン・試験のキーワード・種類や機能・紛らわしいサービスとの違いを確認します。カテゴリを選んで絞り込めます。"),
      grid,
    );
    return;
  }
  if (kind === "expert") {
    // 上級チャレンジ: 資格ごとの問題数と、解いた数・正答率
    const grid = el("div", "exam-chips");
    const only = code === "goal" ? goalCodes() : code !== "all" ? [code] : null;
    EXAMS.forEach((e) => {
      const list = expertQs.get(e.code) || [];
      if (!list.length || (only && !only.includes(e.code))) return;
      const done = list.filter((q) => lastMap.has(q.id));
      const ok = done.filter((q) => lastMap.get(q.id).correct).length;
      const b = el("button", "exam-chip expert-chip");
      b.type = "button";
      b.append(el("b", "", e.code), el("span", "", `${list.length}問`), el("span", "exam-chip-done", done.length ? `実施 ${done.length} · 正解 ${ok}` : "未実施"));
      b.title = e.name;
      b.addEventListener("click", () => {
        $("quiz-cert").value = e.code;
        $("quiz-cert").dispatchEvent(new Event("change"));
      });
      grid.append(b);
    });
    box.append(
      el("p", "exam-ov-h", "上級チャレンジは、試験の想定レベルより一段難しい専門的な問題です。複数のサービスの制約が絡む設計、拮抗するトレードオフ、障害の根本原因の特定などを扱います。通常の資格問題演習・学習計画・成績の集計とは別枠で記録されます。"),
      grid,
    );
    return;
  }
  if (code === "all" || code === "goal") {
    const grid = el("div", "exam-chips");
    const only = code === "goal" ? goalsWithQs() : null;
    EXAMS.forEach((e) => {
      const n = examQs.get(e.code)?.length || 0;
      if (!n || (only && !only.includes(e.code))) return;
      const b = el("button", "exam-chip");
      b.type = "button";
      b.append(el("b", "", e.code), el("span", "", `${n}問`), el("span", "exam-chip-done", progressText(e.code).replace(/\/\d+問/, "問")));
      b.title = e.name;
      b.addEventListener("click", () => {
        $("quiz-cert").value = e.code;
        $("quiz-cert").dispatchEvent(new Event("change"));
      });
      grid.append(b);
    });
    box.append(el("p", "exam-ov-h", only ? "目標の資格の問題をまとめて出題します。資格を選ぶと、試験ガイドの分野ごとに演習できます" : "資格を選ぶと、試験ガイドの分野ごとに演習できます"), grid);
    return;
  }
  const ex = examByCode.get(code);
  const qs = examQs.get(code) || [];
  const head = el("div", "exam-ov-top");
  const link = el("a", "", "公式試験ガイド ↗");
  link.href = ex.guide;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const pg = examProgress(code);
  head.append(el("b", "", `${ex.code} ${ex.name}`), el("span", "exam-ov-done", `今までに ${pg.done} / ${pg.total} 問を実施(回答 ${pg.answers} 回)`), el("span", "muted", `採点対象 ${ex.scored} 問${ex.scoredEstimated ? "(推定)" : ""}${ex.retire ? ` · ${ex.retire} で受験終了` : ""}`), link);
  const table = el("div", "exam-ov-rows");
  ex.domains.forEach(([name, w], i) => {
    const sub = qs.filter((q) => q.exams[code][0] === i + 1);
    const bands = { high: 0, mid: 0, low: 0 };
    sub.forEach((q) => bands[probBand(probability(q, code))]++);
    const row = el("button", "exam-ov-row");
    row.type = "button";
    const bar = el("span", "exam-ov-bar");
    const fill = el("i");
    fill.style.width = w * 2.5 + "%";
    bar.append(fill);
    row.append(el("span", "exam-ov-name", `分野${i + 1} ${name}`), bar, el("span", "exam-ov-w", `${w}%`), el("span", "exam-ov-n", `${sub.length}問 · 高${bands.high} 中${bands.mid} 低${bands.low}`));
    row.addEventListener("click", () => {
      $("quiz-domain").value = "d:" + (i + 1);
      updatePool();
    });
    table.append(row);
  });
  box.append(head, table);
}
$("quiz-cert").addEventListener("change", () => {
  fillDomains();
  renderOverview();
  syncKind();
});
/* ---------- 実試験と同じ問題数 ---------- */
/** 選択中の試験の実試験の問題数(すべての資格のときは 65 問) */
function realCount() {
  const code = $("quiz-cert").value;
  return examByCode.get(code === "goal" ? goalsWithQs()[0] : code)?.real?.[0] || 65;
}
function syncReal() {
  const o = $("quiz-limit").querySelector('option[value="real"]');
  if (!o) return;
  const ex = examByCode.get($("quiz-cert").value);
  o.textContent = ex?.real ? `実試験と同じ ${ex.real[0]}問(本番 ${ex.real[1]}分)` : "実試験と同じ 65問(資格を選ぶとその試験の問題数)";
  o.hidden = o.disabled = kind !== "exam";
  if (kind !== "exam" && $("quiz-limit").value === "real") $("quiz-limit").value = "10";
}
/** 実試験の形式: 試験全体なら分野の配点に合わせて各分野から、ほかは範囲内からランダムに選ぶ */
function pickReal(cands, n) {
  const code = $("quiz-cert").value;
  const ex = examByCode.get(code);
  if (!ex || $("quiz-domain").value !== "all" || presetIds || cands.length <= n) return cands.slice(0, n);
  const raw = ex.domains.map(([, w], i) => ({ d: i + 1, x: (n * w) / 100 }));
  const total = ex.domains.reduce((a, [, w]) => a + w, 0);
  raw.forEach((r) => (r.x = (r.x * 100) / total));
  raw.forEach((r) => (r.q = Math.floor(r.x)));
  let left = n - raw.reduce((a, r) => a + r.q, 0);
  [...raw].sort((a, b) => (b.x % 1) - (a.x % 1)).forEach((r) => left-- > 0 && r.q++);
  const out = [];
  raw.forEach(({ d, q }) => out.push(...cands.filter((c) => c.exams[code]?.[0] === d).slice(0, q)));
  for (const c of cands) if (out.length < n && !out.includes(c)) out.push(c);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
/* ---------- 演習の種類(資格試験 / サービス知識) ---------- */
function syncKind() {
  const svc = kind === "service";
  document.querySelectorAll("#quiz-kind [data-kind]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === kind)));
  $("quiz-cert").closest("label").hidden = svc;
  $("quiz-prob").closest("label").hidden = svc || kind === "expert";
  $("quiz-domain").closest("label").firstChild.textContent = svc ? "カテゴリ" : "分野";
  const code = $("quiz-cert").value;
  $("practice-exam-pill").textContent = svc ? "サービス知識(試験外)" : code === "all" ? "全資格対応" : code === "goal" ? "目標の資格" : code;
  const list = bankQ();
  const single = list.filter((q) => q.selectCount === 1).length;
  $("practice-type-pill").textContent = svc ? `サービス知識 ${list.length}問` : kind === "expert" ? `上級チャレンジ ${list.length}問` : `単一${single}問 / 複数${list.length - single}問`;
  syncReal();
}
document.querySelectorAll("#quiz-kind [data-kind]").forEach((b) =>
  b.addEventListener("click", () => {
    if (kind === b.dataset.kind) return;
    kind = b.dataset.kind;
    presetIds = null;
    fillDomains();
    renderOverview();
    syncKind();
    updatePool();
  }),
);
{
  const b = $("quiz-kind");
  b?.querySelector('[data-kind="exam"] small')?.replaceChildren(`${questions.length}問`);
  b?.querySelector('[data-kind="service"] small')?.replaceChildren(`${serviceQuestions.length}問`);
  b?.querySelector('[data-kind="expert"] small')?.replaceChildren(`${expertQuestions.length}問`);
}
fillDomains();
renderOverview();
syncKind();
["quiz-cert", "quiz-domain", "quiz-prob", "quiz-difficulty", "quiz-mode", "quiz-limit"].forEach((id) =>
  $(id).addEventListener("change", updatePool),
);
// ノートなどから「このサービスの問題」を出題する
window.addEventListener("practice-preset", (e) => {
  const ids = e.detail?.ids || [];
  presetIds = ids.length ? new Set(ids) : null;
  $("preset-label").textContent = e.detail?.label || "";
  ["quiz-cert", "quiz-prob", "quiz-difficulty", "quiz-mode"].forEach((id) => ($(id).value = "all"));
  if (!$("quiz-cert").value) $("quiz-cert").value = defaultCert(); // 目標に集中しているときは「すべて」が無い
  fillDomains();
  renderOverview();
  $("quiz-limit").value = "1000";
  settings();
});
$("preset-clear")?.addEventListener("click", () => {
  presetIds = null;
  updatePool();
});

/* ---------- タイマー ---------- */
// 本番ペース用に、選んだ資格の実試験 [問題数, 試験時間(分)] を渡す(資格を選んでいないときは 2 分/問)
function timerReal() {
  const code = $("quiz-cert").value;
  return examByCode.get(code === "goal" ? goalsWithQs()[0] : code)?.real || null;
}
timer.bindSetup($("quiz-timer-mode"), $("quiz-timer-min"), $("quiz-timer-min-wrap"), $("quiz-timer-hint"));
timer.mount($("quiz-timer"), $("quiz-workspace"));
/* ---------- セッション ---------- */
let session = [], // 問題
  states = [], // { sel:Set, submitted, correct, visited, order } sel は元の選択肢番号。order は表示順(表示位置 → 元の番号)
  position = 0,
  maxVisited = -1, // 表示したことのある最も後ろの問題
  sessionId = 0, // 演習を始めるたびに増やす(番号ボタンの作り直しの判定)
  selections = new Set(),
  submitted = false,
  results = [],
  finished = false;
function cur() {
  return states[position];
}
/** 選択肢の表示順。まだ無ければ毎回ランダムに作る(回答後は保持して並びを変えない) */
function orderOf(q, s) {
  if (!Array.isArray(s.order) || s.order.length !== q.choices.length || ![...s.order].sort((a, b) => a - b).every((v, i) => v === i)) s.order = shuffledOrder(q.choices.length);
  return s.order;
}
function statusOf(i) {
  const s = states[i];
  if (s.submitted) return s.correct ? "ok" : "ng";
  if (i === position) return "todo";
  return s.visited || i < maxVisited ? "miss" : "todo";
}
function counts() {
  let ok = 0, ng = 0, skip = 0, todo = 0;
  states.forEach((_, i) => {
    const st = statusOf(i);
    if (st === "ok") ok++;
    else if (st === "ng") ng++;
    else if (st === "miss") skip++;
    else todo++;
  });
  return { ok, ng, skip, todo, unanswered: states.filter((s) => !s.submitted).length };
}
function renderMap() {
  const map = $("quiz-map");
  if (!map) return;
  const n = session.length;
  const two = n > (matchMedia("(max-width:760px)").matches ? 10 : 20);
  map.classList.toggle("two", two);
  map.style.setProperty("--cols", two ? Math.ceil(n / 2) : n);
  // 問題数が同じなら番号ボタンを作り直さず、状態だけ更新する
  const reuse = map.childElementCount === n && map.dataset.session === String(sessionId);
  if (!reuse) {
    map.dataset.session = String(sessionId);
    map.replaceChildren(
      ...session.map((q, i) => {
        const b = el("button");
        b.type = "button";
        b.dataset.jump = i;
        b.append(el("span", "", String(i + 1)));
        return b;
      }),
    );
  }
  const buttons = map.children;
  for (let i = 0; i < n; i++) {
    const st = statusOf(i);
    const b = buttons[i];
    const cls = `qm ${st}${i === position ? " current" : ""}`;
    if (b.className === cls) continue;
    b.className = cls;
    const label = { ok: "正解", ng: "不正解", miss: "未回答", todo: "これから" }[st];
    b.setAttribute("aria-label", `問${i + 1} ${label}${i === position ? "（表示中）" : ""}`);
    b.title = `問${i + 1}：${label}`;
  }
  const c = counts();
  $("quiz-tally").replaceChildren(
    el("span", "t ok", `正解 ${c.ok}`),
    el("span", "t ng", `不正解 ${c.ng}`),
    el("span", "t miss", `未回答 ${c.skip}`),
    el("span", "t todo", `残り ${c.todo}`),
  );
  const miss = $("quiz-miss");
  miss.hidden = !c.skip;
  miss.querySelector("b").textContent = c.skip;
}
function renderChoiceMarks(q) {
  const s = cur();
  const order = orderOf(q, s);
  $("quiz-choices").querySelectorAll(".choice").forEach((label, pos) => {
    const i = order[pos];
    label.classList.remove("is-right", "is-wrong", "is-missed");
    const txt = label.querySelector(".choice-text");
    const c = q.choices[i];
    txt.replaceChildren();
    if (s.submitted && !c.correct && c.marks?.length) markedText(c.text, c.marks, txt);
    else txt.textContent = c.text;
    if (!s.submitted) return;
    const chosen = s.sel.has(i);
    if (q.choices[i].correct) label.classList.add(chosen ? "is-right" : "is-missed");
    else if (chosen) label.classList.add("is-wrong");
  });
}
function feedback(q) {
  termSeen = new Set(); // 解説では、用語をあらためて最初の 1 回だけボタンにする
  const s = cur();
  const box = $("quiz-feedback");
  box.replaceChildren();
  box.hidden = !s.submitted;
  if (!s.submitted) return;
  const order = orderOf(q, s);
  const L = labelsFor(order, LETTERS); // 元の番号 → 表示ラベル
  const head = el("div", `feedback-head ${s.correct ? "good" : "bad"}`);
  head.append(
    el("h3", s.correct ? "feedback-correct" : "feedback-wrong", s.correct ? "✓ 正解です" : "もう一度、考え方を整理しましょう"),
    el(
      "p",
      "",
      `正解：${order.filter((i) => q.choices[i].correct).map((i) => L[i]).join("・")}` +
        (s.correct ? "" : `　／　あなたの回答：${order.filter((i) => s.sel.has(i)).map((i) => L[i]).join("・")}`),
    ),
  );
  // 選んだ不正解の選択肢が「危険」「不適切」だったとき
  if (!s.correct) head.append(chosenAlert(q, s.sel, L));
  box.append(head);
  // 論点・トピック
  if (q.concept) {
    const c = el("p", "fb-concept");
    c.append(el("b", "", "論点"), document.createTextNode(q.concept), el("span", "muted", ` · ${q.topic}`));
    box.append(c);
  }
  // 根拠ライン: 問題文のどこから正解が導けるか
  const exS = sentencesOf(q.explanation || "");
  if (q.lines?.length) {
    const card = el("section", "evidence-card");
    card.append(el("p", "eyebrow", "EVIDENCE · 根拠ライン(問題文のこの部分から正解が導けます)"));
    card.append(linedText(q.prompt, q.lines, el("p", "ev-text"), true));
    const ol = el("ol", "ev-list");
    q.lines.forEach(([a, b, kind, ei], i) => {
      const li = el("li", `ev-${i % 4}`);
      const top = el("div", "ev-row");
      top.append(el("span", "ev-num", NUM[i] || String(i + 1)), el("span", "ev-kind", kind), el("q", "ev-quote", q.prompt.slice(a, b)));
      li.append(top);
      if (exS[ei]) {
        const why = el("p", "ev-why");
        why.append(el("span", "ev-arrow", "→ "));
        linkify(exS[ei], why);
        li.append(why);
      }
      ol.append(li);
    });
    card.append(ol);
    box.append(card);
  }
  // 解説(サービス名は図鑑へのリンク)
  const exp = el("div", "explanations");
  if (q.explanation) {
    exp.append(el("p", "eyebrow", "EXPLANATION · 解説"));
    exp.append(linkify(q.explanation, el("p", "fb-explanation")));
  }
  exp.append(el("p", "eyebrow", q.choices.some((c) => c.explanation) ? "ALL CHOICES · 選択肢ごとの理由" : "CHOICES · 選択肢"));
  exp.append(rateSummary(q));
  order.forEach((i) => {
    const choice = q.choices[i];
    const row = el("div", choice.correct ? "explanation is-correct" : s.sel.has(i) ? "explanation is-chosen" : "explanation");
    row.append(el("strong", "", `${L[i]} · ${choice.correct ? "正解" : "不正解"}${s.sel.has(i) ? " / あなたの回答" : ""}`));
    row.append(choice.correct ? linkify(choice.text, el("p", "choice-recap")) : markedText(choice.text, choice.marks, el("p", "choice-recap"), true));
    if (choice.explanation) {
      const why = el("p", choice.correct ? "" : "why-text");
      if (choice.correct) linkify(choice.explanation, why);
      else why.append(el("span", "why-label", "なぜ間違い"), linkify(choice.explanation, el("span", "why-body")));
      row.append(why);
    }
    if (!choice.correct) row.append(rateTag(q, i));
    exp.append(row);
  });
  box.append(exp);
  // 問題に登場したサービス → 図鑑
  const rel = servicesIn(q.prompt, ...q.choices.map((c) => c.text), q.explanation || "");
  if (q.service && !rel.includes(q.service)) rel.unshift(q.service);
  const foot = el("div", "feedback-links");
  if (rel.length) {
    foot.append(el("span", "muted", "登場したサービスを図鑑で確認:"));
    rel.slice(0, 10).forEach((id) => {
      const a = el("a", "note-chip svc-link", svcById.get(id)?.name || id);
      a.href = `#services/${id}`;
      a.dataset.svc = id;
      foot.append(a);
    });
  }
  const docId = (q.service && svcById.get(q.service)?.doc && q.service) || servicesIn(...q.choices.filter((c) => c.correct).map((c) => c.text), q.explanation || "").find((id) => svcById.get(id)?.doc) || rel.find((id) => svcById.get(id)?.doc);
  const docUrl = q.source || (docId && svcById.get(docId).doc);
  if (docUrl) {
    const source = el("a", "source-link", `公式ドキュメントで確認${!q.source && docId ? `(${svcById.get(docId).name})` : ""} ↗`);
    source.href = docUrl;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    foot.append(source);
  }
  box.append(foot);
}
function syncButtons() {
  const q = session[position],
    s = cur();
  $("quiz-submit").hidden = true; // 規定数を選ぶと自動で採点するため、確認ボタンは使わない
  $("quiz-submit").disabled = selections.size !== q.selectCount;
  $("quiz-next").hidden = !s.submitted && !finished;
  const last = position === session.length - 1;
  $("quiz-next").textContent = last ? "結果を見る →" : "次の問題へ →";
  $("quiz-prev").disabled = position === 0;
  $("quiz-skip").hidden = s.submitted || last || finished;
  $("quiz-finish").hidden = finished;
  $("quiz-selected").textContent = s.submitted
    ? ""
    : q.selectCount === 1
      ? selections.size
        ? `${labelsFor(orderOf(q, s), LETTERS)[[...selections][0]]} を選択`
        : "選択肢を選んでください（キー 1〜" + LETTERS[q.choices.length - 1] + "）"
      : `${selections.size} / ${q.selectCount} 選択 · あと ${q.selectCount - selections.size} つ選ぶと採点します`;
}
function render() {
  const q = session[position];
  const s = cur();
  s.visited = true;
  if (position > maxVisited) maxVisited = position;
  selections = new Set(s.sel);
  submitted = s.submitted;
  if (!finished) timer.at(position);
  $("quiz-position").textContent = `QUESTION ${String(position + 1).padStart(2, "0")} / ${session.length}`;
  $("quiz-progress").max = session.length;
  $("quiz-progress").value = states.filter((x) => x.submitted).length;
  const code = examFor(q);
  const ex = examByCode.get(code);
  const [d, tier] = q.exams[code] || [];
  const p = probability(q, code);
  const others = Object.keys(q.exams).filter((c) => c !== code);
  if (isSvc(q)) $("quiz-domain-label").textContent = `サービス知識(試験外)· ${q.domain}`;
  else $("quiz-domain-label").textContent = `${code} · 分野${d} ${ex?.domains[d - 1]?.[0] || q.domain}${others.length ? ` · ほか ${others.join(" / ")}` : ""}`;
  let meta = $("quiz-meta2");
  if (!meta) {
    meta = el("span", "quiz-meta2");
    meta.id = "quiz-meta2";
    $("quiz-type").after(meta);
  }
  const band = probBand(p);
  const pr = el("span", `pill prob-pill band-${band}`, `出題確率 ${BAND_LABEL[band]} · 約${p}%(推定)`);
  pr.title = `${TIER[tier]?.[0] || ""} · 分野の配点 ${ex?.domains[d - 1]?.[1]}% × 採点 ${ex?.scored} 問から推定。AWS は問題ごとの出題率を公開していません。`;
  const lv = el("span", `pill diff-pill lv${q.difficulty}`, `難易度 ${"★".repeat(q.difficulty)}${"☆".repeat(3 - q.difficulty)} ${DIFFICULTY[q.difficulty]}`);
  lv.title = DIFFICULTY[q.difficulty];
  const tp = el("span", "pill topic-pill", q.topic || "");
  const pv = prevResults.get(q.id);
  let times = 0;
  if (pv) for (const a of attempts) if (a.id === q.id && a.at <= pv.at) times++;
  const prev = pv
    ? el("span", `pill prev-pill ${pv.correct ? "ok" : "ng"}`, `前回 ${pv.correct ? "○ 正解" : "✕ 不正解"} · ${new Date(pv.at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })} · これまで ${times}回`)
    : el("span", "pill prev-pill new", "初めての問題");
  if (pv) prev.title = `前回 ${new Date(pv.at).toLocaleString("ja-JP")} に回答。これまでにこの問題を ${times} 回解いています。`;
  tp.hidden = !q.topic;
  if (isSvc(q)) {
    const kp = el("span", "pill svc-pill", "サービス知識 · 試験外");
    kp.title = "サービス図鑑の内容から作成した知識確認問題です。資格試験の問題とは別枠で記録されます。";
    meta.replaceChildren(prev, kp, lv, tp);
  } else if (isExpert(q)) {
    const xp = el("span", "pill expert-pill", "上級チャレンジ · 試験より難しい");
    xp.title = q.why ? `難しいポイント：${q.why}` : "試験の想定レベルを超える専門的な問題です。";
    const xl = el("span", "pill diff-pill lvx", "難易度 ★★★★ 上級");
    const why = el("span", "pill why-pill", q.why ? `ポイント：${q.why}` : "");
    why.hidden = !q.why;
    meta.replaceChildren(prev, xp, xl, tp, why);
  } else meta.replaceChildren(prev, pr, lv, tp);
  $("quiz-type").textContent = q.selectCount === 1 ? "単一選択" : `複数選択・${q.selectCount}つ`;
  $("quiz-prompt").replaceChildren();
  termSeen = new Set();
  if (s.submitted && q.lines?.length) linedText(q.prompt, q.lines, $("quiz-prompt"), false);
  else termify(q.prompt, $("quiz-prompt"), termSeen); // 問題文の専門用語はクリックで解説を開ける
  $("quiz-choices").replaceChildren();
  $("quiz-choices").append(el("legend", "", q.selectCount === 1 ? "1つ選んでください" : `${q.selectCount}つ選んでください`));
  orderOf(q, s).forEach((i, pos) => {
    const choice = q.choices[i];
    const label = el("label", "choice");
    const input = el("input");
    input.type = q.selectCount === 1 ? "radio" : "checkbox";
    input.name = "answer";
    input.value = i;
    input.checked = selections.has(i);
    input.disabled = s.submitted || finished;
    input.addEventListener("change", () => {
      if (cur().submitted) return;
      if (q.selectCount === 1) selections.clear();
      if (input.checked) selections.add(i);
      else selections.delete(i);
      cur().sel = new Set(selections);
      syncButtons();
      // 規定数を選んだ時点で採点する(単一選択は選んだ直後、複数選択は指定数がそろった時点)
      if (selections.size === q.selectCount) $("answer-form").requestSubmit();
    });
    label.append(input, el("span", "choice-letter", LETTERS[pos]), el("span", "choice-text", choice.text));
    $("quiz-choices").append(label);
  });
  renderChoiceMarks(q);
  feedback(q);
  syncButtons();
  renderMap();
  $("quiz-workspace").classList.toggle("reviewing", finished);
}
function goTo(i, focus = true) {
  if (i < 0 || i >= session.length) return;
  position = i;
  // 未回答の問題は表示するたびに選択肢の並びを変える(回答済み・結果の確認中は並びを保つ)
  if (!states[i].submitted && !finished) states[i].order = null;
  render();
  const top = $("quiz-workspace").getBoundingClientRect().top + scrollY - 8 - dockOffset();
  if (scrollY > top) scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  if (focus) $("quiz-prompt").focus({ preventScroll: true });
}
let lastJump = -1;
function jumpMissing() {
  const list = states.map((s, i) => (statusOf(i) === "miss" ? i : -1)).filter((i) => i >= 0);
  if (!list.length) return;
  const t = list.find((i) => i > lastJump) ?? list[0];
  lastJump = t;
  goTo(t);
}
$("quiz-start").addEventListener("click", () => {
  const candidates = pool();
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  // まだ解いたことのない問題を先に出す(同じグループ内はランダム)
  prevResults = new Map(latest());
  candidates.sort((a, b) => Number(prevResults.has(a.id)) - Number(prevResults.has(b.id)));
  session = $("quiz-limit").value === "real" ? pickReal(candidates, realCount()) : candidates.slice(0, Number($("quiz-limit").value));
  if (!session.length) return;
  sessionLabel = presetIds ? $("preset-label").textContent : [$("quiz-cert").selectedOptions[0]?.textContent.replace(/ · .*$/, ""), $("quiz-domain").value !== "all" ? $("quiz-domain").selectedOptions[0]?.textContent.replace(/ · .*$/, "") : ""].filter(Boolean).join(" / ");
  states = session.map(() => ({ sel: new Set(), submitted: false, correct: false, visited: false }));
  position = 0;
  maxVisited = -1;
  sessionId++;
  results = [];
  finished = false;
  lastJump = -1;
  $("practice-setup").hidden = true;
  $("quiz-result").hidden = true;
  $("quiz-workspace").hidden = false;
  document.body.classList.add("in-quiz");
  timer.start(session.length, timerReal());
  render();
  $("quiz-prompt").setAttribute("tabindex", "-1");
  $("quiz-prompt").focus();
});
$("answer-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!session.length || finished) return;
  const s = cur();
  if (s.submitted) return;
  const q = session[position];
  if (selections.size !== q.selectCount) return;
  s.submitted = true;
  submitted = true;
  s.sel = new Set(selections);
  const correct = q.choices.every((c, i) => c.correct === selections.has(i));
  s.correct = correct;
  const attempt = { id: q.id, correct, chosen: [...selections], at: new Date().toISOString() };
  attempts.push(attempt);
  indexAttempt(attempt);
  setupDirty = true;
  results.push(attempt);
  try {
    store.set(key, attempts);
  } catch {
    $("storage-warning").hidden = false;
  }
  window.dispatchEvent(new Event("learning-update"));
  render();
  $("quiz-feedback").scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  $("quiz-next").focus({ preventScroll: true });
  // 成績・間違えた問題の一覧・出題数は設定画面に戻ったときにまとめて更新する(回答ごとの再描画をしない)
});
let setupDirty = false;
function settings() {
  $("quiz-workspace").hidden = true;
  $("quiz-result").hidden = true;
  $("practice-setup").hidden = false;
  document.body.classList.remove("in-quiz");
  timer.stop();
  session = [];
  states = [];
  results = [];
  finished = false;
  if (setupDirty) {
    setupDirty = false;
    stats();
  }
  updatePool();
}
/* ---------- 一時中断と再開 ---------- */
// 途中の演習(出題順・選んだ選択肢・回答済み・現在位置)を aaa.practice.paused.v1 に保存する(アカウント同期)。
// 「一時中断」のほか、演習中にページを閉じた・別のタブへ移ったときも自動で保存し、設定画面の「続きから」で再開できる。
const PAUSE_KEY = "aaa.practice.paused.v1";
let sessionLabel = "";
function readPaused() {
  const p = store.get(PAUSE_KEY, null);
  if (!p || !Array.isArray(p.ids) || !Array.isArray(p.states) || p.ids.length !== p.states.length) return null;
  if (!p.ids.every((id) => questionMap.has(id))) return null;
  return p;
}
function savePaused() {
  if (!session.length || finished) return false;
  store.set(PAUSE_KEY, {
    at: new Date().toISOString(),
    label: sessionLabel,
    ids: session.map((q) => q.id),
    position,
    maxVisited,
    states: states.map((s) => ({ sel: [...s.sel], submitted: s.submitted, correct: s.correct, visited: s.visited, order: s.submitted ? s.order || null : null })),
    timer: timer.snapshot(),
  });
  return true;
}
function clearPaused() {
  if (store.get(PAUSE_KEY, null)) store.set(PAUSE_KEY, null);
  renderPaused();
}
function resumePaused() {
  const p = readPaused();
  if (!p) return renderPaused();
  session = p.ids.map((id) => questionMap.get(id));
  states = p.states.map((s) => ({ sel: new Set(s.sel || []), submitted: !!s.submitted, correct: !!s.correct, visited: !!s.visited, order: s.submitted && Array.isArray(s.order) ? s.order : null }));
  position = Math.min(session.length - 1, Math.max(0, p.position || 0));
  maxVisited = p.maxVisited ?? -1;
  sessionLabel = p.label || "";
  prevResults = new Map(latest());
  sessionId++;
  results = [];
  finished = false;
  lastJump = -1;
  store.set(PAUSE_KEY, null);
  $("practice-setup").hidden = true;
  $("quiz-result").hidden = true;
  $("quiz-workspace").hidden = false;
  document.body.classList.add("in-quiz");
  // 未回答の問題から再開する
  if (states[position]?.submitted) {
    const next = states.findIndex((s) => !s.submitted);
    if (next >= 0) position = next;
  }
  timer.start(session.length, null, p.timer && typeof p.timer === "object" ? p.timer : { total: 0, per: [], limit: 0, off: false });
  render();
  $("quiz-prompt").setAttribute("tabindex", "-1");
  $("quiz-prompt").focus({ preventScroll: true });
}
function renderPaused() {
  const box = $("paused-box");
  if (!box) return;
  box.replaceChildren();
  const p = readPaused();
  if (!p) return;
  const done = p.states.filter((s) => s.submitted), ok = done.filter((s) => s.correct).length;
  const d = new Date(p.at);
  const card = el("div", "paused-card");
  const txt = el("div", "paused-txt");
  txt.append(
    el("b", "", `⏸ 中断中の演習${p.label ? `：${p.label}` : ""}`),
    el("small", "", `${p.ids.length} 問中 ${done.length} 問に回答（正解 ${ok}）・ ${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} に中断`),
  );
  const go = el("button", "primary", "続きから解く");
  go.type = "button";
  go.addEventListener("click", resumePaused);
  const drop = el("button", "", "破棄");
  drop.type = "button";
  drop.addEventListener("click", () => {
    confirmBox("中断中の演習を破棄しますか？（回答済みの問題の記録は残ります）", "破棄する", "キャンセル").then((yes) => yes && clearPaused());
  });
  card.append(txt, go, drop);
  box.append(card);
}
$("quiz-pause").addEventListener("click", () => {
  if (!savePaused()) return;
  settings();
  renderPaused();
  window.dispatchEvent(new CustomEvent("toast", { detail: "演習を一時中断しました。「続きから解く」で再開できます" }));
});
// ページを閉じる・別のタブへ移るときは自動で保存
const autoPause = () => session.length && !finished && !$("quiz-workspace").hidden && savePaused();
window.addEventListener("pagehide", autoPause);
document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && autoPause());
window.addEventListener("route-change", (e) => {
  if (e.detail?.page === "practice") renderPaused();
});
/* ---------- 前回(1 回前)の演習 ---------- */
// 演習を終えたとき(結果を見た・終了した)に、出題した問題と結果を aaa.practice.last.v1 に保存する(新しい順に 5 回分、アカウント同期)。
// 設定画面の「前回の演習」から、同じ問題をもう一度・不正解だけ・1 問ずつ開き直せる。
const LAST_KEY = "aaa.practice.last.v1";
function readLast() {
  const v = store.get(LAST_KEY, []);
  return (Array.isArray(v) ? v : []).filter((x) => x && Array.isArray(x.items) && x.items.length && x.items.every((it) => questionMap.has(it.id)));
}
function saveLast() {
  const items = session.map((q, i) => ({ id: q.id, done: states[i].submitted, ok: states[i].submitted && states[i].correct }));
  if (!items.some((it) => it.done)) return;
  const list = readLast().slice(0, 4);
  store.set(LAST_KEY, [{ at: new Date().toISOString(), label: sessionLabel, items }, ...list]);
}
let lastIdx = 0;
function renderLast() {
  const box = $("last-box");
  if (!box) return;
  box.replaceChildren();
  const list = readLast();
  if (!list.length) return;
  lastIdx = Math.min(lastIdx, list.length - 1);
  const cur = list[lastIdx];
  const done = cur.items.filter((it) => it.done), ok = done.filter((it) => it.ok).length;
  const d = new Date(cur.at);
  const det = el("details", "last-card");
  const sum = el("summary");
  const txt = el("span", "last-txt");
  txt.append(
    el("b", "", `↩ ${lastIdx === 0 ? "前回" : `${lastIdx + 1} 回前`}の演習${cur.label ? `：${cur.label}` : ""}`),
    el("small", "", `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ・ ${cur.items.length} 問中 ${done.length} 問に回答（正解 ${ok}・不正解 ${done.length - ok}）`),
  );
  sum.append(txt);
  const acts = el("span", "last-acts");
  const btn = (label, cls, ids, title) => {
    const b = el("button", cls, label);
    b.type = "button";
    b.addEventListener("click", (e) => {
      e.preventDefault();
      if (!ids.length) return;
      window.dispatchEvent(new CustomEvent("practice-preset", { detail: { ids, label: title } }));
      $("quiz-start").click();
    });
    return b;
  };
  const when = `${d.getMonth() + 1}/${d.getDate()}`;
  acts.append(btn("同じ問題をもう一度", "primary", cur.items.map((it) => it.id), `${when} の演習をもう一度`));
  const ng = cur.items.filter((it) => it.done && !it.ok).map((it) => it.id);
  if (ng.length) acts.append(btn(`不正解だけ（${ng.length}）`, "", ng, `${when} の演習で不正解だった問題`));
  const rest = cur.items.filter((it) => !it.done).map((it) => it.id);
  if (rest.length) acts.append(btn(`未回答だけ（${rest.length}）`, "", rest, `${when} の演習で未回答だった問題`));
  sum.append(acts);
  det.append(sum);
  // 問題の一覧(1 問ずつ開ける)
  const ul = el("ol", "last-qs");
  cur.items.forEach((it) => {
    const q = questionMap.get(it.id);
    const li = el("li", it.done ? (it.ok ? "ok" : "ng") : "na");
    li.append(el("span", "last-mark", it.done ? (it.ok ? "○" : "×") : "－"));
    const b = el("button", "last-q", q.concept || q.topic || q.prompt.slice(0, 40));
    b.type = "button";
    b.title = q.prompt.slice(0, 140);
    b.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("practice-preset", { detail: { ids: [it.id], label: `${when} の演習の問題` } }));
      $("quiz-start").click();
    });
    li.append(b);
    ul.append(li);
  });
  det.append(ul);
  if (list.length > 1) {
    const nav = el("div", "last-nav");
    nav.append(el("small", "", "それより前の演習："));
    list.forEach((x, i) => {
      const xd = new Date(x.at);
      const b = el("button", i === lastIdx ? "on" : "", i === 0 ? "前回" : `${i + 1} 回前（${xd.getMonth() + 1}/${xd.getDate()}）`);
      b.type = "button";
      b.addEventListener("click", () => {
        lastIdx = i;
        renderLast();
        $("last-box").querySelector("details").open = true;
      });
      nav.append(b);
    });
    det.append(nav);
  }
  box.append(det);
}
window.addEventListener("route-change", (e) => e.detail?.page === "practice" && renderLast());
renderLast();
renderPaused();
$("quiz-exit").addEventListener("click", () => {
  const answered = states.filter((s) => s.submitted).length;
  saveLast();
  lastIdx = 0;
  // 「終了」は中断の保存をしない(自動保存された分も消す)
  if (store.get(PAUSE_KEY, null)) store.set(PAUSE_KEY, null);
  settings();
  renderPaused();
  renderLast();
  if (answered) window.dispatchEvent(new CustomEvent("toast", { detail: `回答した${answered}問は記録済みです` }));
});
$("quiz-prev").addEventListener("click", () => goTo(position - 1));
$("quiz-skip").addEventListener("click", () => goTo(position + 1));
$("quiz-miss").addEventListener("click", jumpMissing);
$("quiz-map").addEventListener("click", (e) => {
  const b = e.target.closest("[data-jump]");
  if (b) goTo(Number(b.dataset.jump));
});
$("quiz-finish").addEventListener("click", () => tryFinish());
function tryFinish() {
  const left = states.map((s, i) => (!s.submitted ? i : -1)).filter((i) => i >= 0);
  if (!left.length) return showResult();
  confirmBox(`未回答が${left.length}問あります（オレンジ／灰色の番号）。未回答は記録されません。`, "このまま結果を見る", "未回答へ移動").then((ok) => {
    if (ok) showResult();
    else goTo(left[0]);
  });
}
$("quiz-next").addEventListener("click", () => {
  if (finished) {
    if (position < session.length - 1) goTo(position + 1);
    else showResult();
    return;
  }
  if (!cur().submitted) return;
  const nextOpen = states.findIndex((s, i) => i > position && !s.submitted);
  if (position < session.length - 1) {
    goTo(nextOpen >= 0 ? nextOpen : position + 1);
    return;
  }
  tryFinish();
});
function showResult() {
  finished = true;
  const tm = timer.finish();
  if (store.get(PAUSE_KEY, null)) store.set(PAUSE_KEY, null);
  saveLast();
  lastIdx = 0;
  renderLast();
  $("quiz-workspace").hidden = true;
  document.body.classList.remove("in-quiz");
  const box = $("quiz-result");
  box.hidden = false;
  box.replaceChildren();
  const done = states.filter((s) => s.submitted);
  const correct = done.filter((s) => s.correct).length;
  const rate = done.length ? Math.round((correct / done.length) * 100) : 0;
  const ring = el("div", "result-ring");
  ring.style.setProperty("--p", rate);
  ring.append(el("div", "result-score", `${correct} / ${session.length}`), el("small", "", `正答率 ${rate}%`));
  box.append(
    el("p", "eyebrow", "SESSION COMPLETE"),
    el("h2", "", correct === session.length ? "全問正解。設計の判断がしっかり身についています。" : "今日の一歩、おつかれさまでした。"),
    ring,
    el(
      "p",
      "muted",
      `回答 ${done.length}問 · 未回答 ${session.length - done.length}問 — このセッションの正答率です。AWS 公式試験のスコアではありません。`,
    ),
  );
  if (tm.total >= 1000) {
    const avg = done.length ? tm.total / done.length : 0;
    const tp = el("p", `result-time${tm.limit && tm.total > tm.limit ? " over" : ""}`, `⏱ 所要時間 ${timer.fmt(tm.total)}${done.length ? ` · 1問あたり平均 ${timer.fmt(avg)}` : ""}`);
    if (tm.limit) tp.append(el("span", "", tm.total <= tm.limit ? ` · 制限時間 ${timer.fmt(tm.limit)} 以内（残り ${timer.fmt(tm.limit - tm.total)}）` : ` · 制限時間 ${timer.fmt(tm.limit)} を ${timer.fmt(tm.total - tm.limit)} 超過`));
    box.append(tp);
  }
  const list = el("ul", "session-summary");
  session.forEach((q, i) => {
    const s = states[i];
    const item = el("li", s.submitted ? (s.correct ? "ok" : "ng") : "miss");
    const btn = el("button", "summary-row");
    btn.type = "button";
    btn.append(
      el("span", "mark", s.submitted ? (s.correct ? "✓" : "×") : "—"),
      el("span", "q", `${String(i + 1).padStart(2, "0")}. ${q.prompt}`),
      isSvc(q)
        ? el("span", "sum-tag", `サービス知識 · ${q.domain} · ${DIFFICULTY[q.difficulty]}`)
        : el("span", `sum-tag band-${probBand(probability(q, examFor(q)))}`, `${examFor(q)} · ${DIFFICULTY[q.difficulty]} · 約${probability(q, examFor(q))}%`),
      el("span", "go", "見直す →"),
    );
    if (tm.per[i] >= 1000) btn.querySelector(".sum-tag")?.append(` · ⏱ ${timer.fmt(tm.per[i])}`);
    btn.addEventListener("click", () => {
      box.hidden = true;
      $("quiz-workspace").hidden = false;
      document.body.classList.add("in-quiz");
      goTo(i);
    });
    item.append(btn);
    list.append(item);
  });
  box.append(list);
  const actions = el("div", "result-actions");
  const back = el("button", "primary", "設定に戻って学習を続ける");
  back.addEventListener("click", settings);
  actions.append(back);
  const wrongIds = session.filter((q, i) => states[i].submitted && !states[i].correct).map((q) => q.id);
  if (wrongIds.length) {
    const review = el("button", "", `間違えた${wrongIds.length}問をもう一度`);
    review.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("practice-preset", { detail: { ids: wrongIds, label: "前回間違えた問題" } }));
      $("quiz-start").click();
    });
    actions.append(review);
  }
  if (correct < session.length) {
    const review2 = el("button", "", "誤答を復習する");
    review2.addEventListener("click", () => {
      settings();
      $("quiz-mode").value = "wrong";
      updatePool();
    });
    actions.append(review2);
  }
  box.append(actions);
  box.setAttribute("tabindex", "-1");
  box.focus();
  window.dispatchEvent(new CustomEvent("toast", { detail: `結果：${correct} / ${session.length}（正答率 ${rate}%）` }));
}

/* ---------- 確認ダイアログ ---------- */
function confirmBox(msg, okLabel, noLabel) {
  return new Promise((res) => {
    const ov = el("div", "uic");
    const box = el("div", "uic-box");
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    const p = el("p", "", msg);
    const row = el("div", "uic-row");
    const no = el("button", "", noLabel || "キャンセル");
    const ok = el("button", "primary", okLabel || "続ける");
    row.append(no, ok);
    box.append(p, row);
    ov.append(box);
    const done = (v) => {
      ov.remove();
      document.removeEventListener("keydown", kd, true);
      res(v);
    };
    const kd = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        done(false);
      }
    };
    no.addEventListener("click", () => done(false));
    ok.addEventListener("click", () => done(true));
    ov.addEventListener("click", (e) => e.target === ov && done(false));
    document.addEventListener("keydown", kd, true);
    document.body.append(ov);
    ok.focus();
  });
}
export { confirmBox };

/* ---------- 解説 ⇄ サービス図鑑の行き来 ---------- */
// 解説のサービス名から図鑑へ移ったら、図鑑の画面に「演習へ戻る」ボタンを出し、同じ問題・同じ位置に戻す。
let returnCtx = null;
const backBar = el("div", "practice-back");
backBar.hidden = true;
const backBtn = el("button", "primary", "");
backBtn.type = "button";
const backClose = el("button", "practice-back-x", "×");
backClose.type = "button";
backClose.setAttribute("aria-label", "戻るボタンを閉じる");
backBar.append(backBtn, backClose);
document.body.append(backBar);
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-svc]");
  if (!a || !a.closest("#practice")) return;
  const inResult = !$("quiz-result").hidden;
  returnCtx = { position, scroll: scrollY, inResult, label: inResult ? "結果" : `問${position + 1}の解説` };
});
backBtn.addEventListener("click", () => {
  location.hash = "practice";
});
backClose.addEventListener("click", () => {
  returnCtx = null;
  backBar.hidden = true;
});
window.addEventListener("route-change", (e) => {
  const page = e.detail?.page;
  if (page === "services" && returnCtx && session.length) {
    backBtn.textContent = `← 演習に戻る(${returnCtx.label})`;
    backBar.hidden = false;
  } else backBar.hidden = true;
  if (page === "practice" && returnCtx && session.length) {
    const ctx = returnCtx;
    returnCtx = null;
    // ページ切り替え時の先頭スクロールの後に、元の位置へ戻す
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!ctx.inResult && !$("quiz-workspace").hidden && ctx.position !== position) goTo(ctx.position, false);
        scrollTo({ top: ctx.scroll, behavior: "instant" });
      }),
    );
  }
});

/* ---------- キーボード操作 ---------- */
document.addEventListener("keydown", (e) => {
  if ($("quiz-workspace").hidden || location.hash.split("/")[0] !== "#practice") return;
  if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector(".uic")) return;
  const tag = document.activeElement?.tagName;
  if (tag === "TEXTAREA" || (tag === "INPUT" && !["radio", "checkbox"].includes(document.activeElement.type)) || tag === "SELECT") return;
  const q = session[position];
  if (!q) return;
  const idx = /^[1-8]$/.test(e.key) ? Number(e.key) - 1 : -1;
  if (idx >= 0 && idx < q.choices.length && !cur().submitted && !finished) {
    e.preventDefault();
    const input = $("quiz-choices").querySelectorAll("input")[idx];
    if (q.selectCount === 1) input.checked = true;
    else input.checked = !input.checked;
    input.dispatchEvent(new Event("change"));
    input.focus({ preventScroll: true });
    return;
  }
  if (e.key === "Enter") {
    if (!cur().submitted && !finished) {
      if (selections.size === q.selectCount) {
        e.preventDefault();
        $("answer-form").requestSubmit();
      }
    } else if (document.activeElement?.tagName !== "BUTTON" && document.activeElement?.tagName !== "A") {
      e.preventDefault();
      $("quiz-next").click();
    }
    return;
  }
  if (e.key === "ArrowRight" && tag !== "INPUT") {
    e.preventDefault();
    goTo(position + 1);
  } else if (e.key === "ArrowLeft" && tag !== "INPUT") {
    e.preventDefault();
    goTo(position - 1);
  }
});
// リサイズ中は 1 フレームに 1 回だけ描き直す(連続した resize イベントで問題マップを作り直し続けない)
let mapResizeQueued = false;
window.addEventListener("resize", () => {
  if (mapResizeQueued || !session.length) return;
  mapResizeQueued = true;
  requestAnimationFrame(() => { mapResizeQueued = false; if (session.length) renderMap(); });
}, { passive: true });
// 演習中の上部(問題番号・正誤の集計・問題マップ)を、画面上部に固定されたヘッダーの真下に固定する。
// ヘッダーの高さは画面幅で変わるため実測して CSS 変数に入れる(横長のバーだけを数え、PC の縦型サイドバーは除く)
function dockOffset() {
  let bottom = 0;
  for (const sel of [".topbar", ".sidebar"]) {
    const n = document.querySelector(sel);
    if (!n) continue;
    const cs = getComputedStyle(n);
    if (cs.position !== "sticky" && cs.position !== "fixed") continue;
    const r = n.getBoundingClientRect();
    if (r.width < innerWidth * 0.6 || r.height <= 0) continue;
    bottom = Math.max(bottom, (parseFloat(cs.top) || 0) + r.height);
  }
  return Math.round(bottom);
}
function syncDockTop() {
  const root = document.documentElement.style;
  root.setProperty("--quiz-dock-top", dockOffset() + "px");
  const dock = $("quiz-dock");
  if (dock && dock.offsetHeight) root.setProperty("--quiz-dock-h", dock.offsetHeight + "px");
}
window.addEventListener("resize", syncDockTop);
if ("ResizeObserver" in window) {
  const ro = new ResizeObserver(syncDockTop);
  for (const sel of [".topbar", ".sidebar", "#quiz-dock"]) { const n = document.querySelector(sel); if (n) ro.observe(n); }
}
syncDockTop();
stats();
updatePool();
