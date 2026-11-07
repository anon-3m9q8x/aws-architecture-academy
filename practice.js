import { store } from "./storage.js";
import { questions } from "./data/questions.js";
import { solve } from "./data/solve.js";
import { notebook } from "./data/notebook.js";
import { EXAMS, LEVELS, examByCode, probability, probBand, BAND_LABEL, primaryExam, TIER } from "./data/exams.js";
const $ = (id) => document.getElementById(id);
const key = "aaa.practice.attempts.v1";
const LETTERS = "ABCDEFGH";
$("question-count").textContent = questions.length;
document
  .querySelectorAll("[data-question-count]")
  .forEach((n) => (n.textContent = questions.length));
const questionMap = new Map(questions.map((q) => [q.id, q]));
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

/* ---------- 問題文・選択肢からノートを見つける ---------- */
const ALIASES = [
  ["Application Load Balancer", "alb"], ["Network Load Balancer", "nlb"], ["Read Replica", "rds"], ["リードレプリカ", "rds"],
  ["Multi-AZ", "rds"], ["Gateway Endpoint", "vpce"], ["ゲートウェイエンドポイント", "vpce"], ["インターフェースVPCエンドポイント", "vpce"],
  ["NAT Gateway", "natgw"], ["NATゲートウェイ", "natgw"], ["インターネットゲートウェイ", "igw"], ["SCP", "orgs"],
  ["Glacier", "glacier"], ["FSx", "fsx"], ["ElastiCache", "elasticache"], ["Kubernetes", "eks"], ["セキュリティグループ", "vpc"],
  ["ネットワークACL", "vpc"], ["DLQ", "sqs"], ["デッドレターキュー", "sqs"], ["Evaluate Target Health", "route53"],
];
const NAMES = notebook.services
  .filter((s) => !["internet", "user", "onprem"].includes(s.id))
  .map((s) => [s.name.replace(/^(Amazon |AWS )/, "").replace(/\(.*\)$/, ""), s.id])
  .concat(ALIASES)
  .sort((a, b) => b[0].length - a[0].length);
function relatedNotes(q) {
  const text = [q.prompt, ...q.choices.filter((c) => c.correct).map((c) => c.text + " " + c.explanation)].join(" ");
  const found = [];
  let rest = text;
  for (const [name, id] of NAMES) {
    if (name.length < 2) continue;
    const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"), "i");
    if (re.test(rest)) {
      if (!found.includes(id)) found.push(id);
      rest = rest.replace(new RegExp(re.source, "gi"), " ");
    }
  }
  return found.slice(0, 5);
}
export { relatedNotes };
const noteName = new Map(notebook.services.map((s) => [s.id, s.name]));

/* ---------- 成績 ---------- */
function latest() {
  const map = new Map();
  attempts.forEach((a) => map.set(a.id, a));
  return map;
}
function stats() {
  const last = latest();
  const wrong = [...last.values()].filter((a) => !a.correct).length;
  const correct = attempts.filter((a) => a.correct).length;
  $("attempt-count").textContent = attempts.length;
  $("accuracy-rate").textContent = attempts.length
    ? `${Math.round((correct / attempts.length) * 100)}%`
    : "—";
  $("mistake-count").textContent = wrong;
  const history = $("practice-history") || document.createElement("div");
  history.replaceChildren(
    el("span", "eyebrow", "PRACTICE INSIGHTS"),
    el("h2", "", "演習の学習状況"),
    el(
      "p",
      "muted",
      `${last.size} / ${questions.length} 問に回答 · 回答 ${attempts.length} 回 · 正答率 ${attempts.length ? Math.round((correct / attempts.length) * 100) + "%" : "未回答"} · 復習対象 ${wrong} 問`,
    ),
  );
  const list = el("div", "domain-results");
  [...new Set(questions.map((q) => q.domain))].forEach((domain) => {
    const subset = attempts.filter((a) => questionMap.get(a.id).domain === domain);
    const rate = subset.length ? Math.round((subset.filter((a) => a.correct).length / subset.length) * 100) : null;
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
}

/* ---------- 出題条件 ---------- */
function pool() {
  const last = latest();
  const code = $("quiz-cert").value;
  const dom = $("quiz-domain").value;
  const band = $("quiz-prob").value;
  return questions.filter(
    (q) =>
      (code === "all" || !!q.exams[code]) &&
      (dom === "all" || (dom.startsWith("d:") ? q.exams[code]?.[0] === Number(dom.slice(2)) : q.domain === dom)) &&
      (band === "all" || probBand(probability(q, examFor(q))) === band) &&
      ($("quiz-difficulty").value === "all" || q.difficulty === Number($("quiz-difficulty").value)) &&
      ($("quiz-mode").value === "all" ||
        ($("quiz-mode").value === "wrong"
          ? last.has(q.id) && !last.get(q.id).correct
          : !last.has(q.id))) &&
      (!presetIds || presetIds.has(q.id)),
  );
}
let presetIds = null;
function updatePool() {
  const count = pool().length;
  $("pool-count").textContent =
    `${count} 問が対象${count ? "" : " — 条件を変更してください"}`;
  $("quiz-start").disabled = !count;
  const chip = $("preset-chip");
  if (chip) chip.hidden = !presetIds;
}
/* 資格(試験)の選択肢: レベルごとにまとめ、試験コードを値にする */
LEVELS.forEach((lv) => {
  const g = el("optgroup");
  g.label = { Foundational: "基礎", Business: "ビジネス", Associate: "アソシエイト", Professional: "プロフェッショナル", Specialty: "専門知識" }[lv];
  EXAMS.filter((e) => e.level === lv).forEach((e) => {
    const n = questions.filter((q) => q.exams[e.code]).length;
    const o = el("option", "", `${e.code} ${e.name}${e.retire ? `(${e.retire.slice(5).replace("-", "/")} まで)` : ""} · ${n}問`);
    o.value = e.code;
    g.append(o);
  });
  $("quiz-cert").append(g);
});
/** 表示・確率の計算に使う試験: 選択中の試験があればそれ、なければ問題の主な試験 */
function examFor(q) {
  const code = $("quiz-cert").value;
  return code !== "all" && q.exams[code] ? code : primaryExam(q);
}
/* 分野の選択肢: 資格を選ぶと試験ガイドの分野、すべてのときは問題の領域 */
function fillDomains() {
  const code = $("quiz-cert").value;
  const sel = $("quiz-domain");
  sel.replaceChildren(el("option", "", "すべての分野"));
  sel.firstChild.value = "all";
  if (code === "all") {
    [...new Set(questions.map((q) => q.domain))].forEach((domain) => {
      const o = el("option", "", domain);
      o.value = domain;
      sel.append(o);
    });
  } else {
    examByCode.get(code).domains.forEach(([name, w], i) => {
      const n = questions.filter((q) => q.exams[code]?.[0] === i + 1).length;
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
  if (code === "all") {
    const grid = el("div", "exam-chips");
    EXAMS.forEach((e) => {
      const n = questions.filter((q) => q.exams[e.code]).length;
      const b = el("button", "exam-chip");
      b.type = "button";
      b.append(el("b", "", e.code), el("span", "", `${n}問`));
      b.title = e.name;
      b.addEventListener("click", () => {
        $("quiz-cert").value = e.code;
        $("quiz-cert").dispatchEvent(new Event("change"));
      });
      grid.append(b);
    });
    box.append(el("p", "exam-ov-h", "資格を選ぶと、試験ガイドの分野ごとに演習できます"), grid);
    return;
  }
  const ex = examByCode.get(code);
  const qs = questions.filter((q) => q.exams[code]);
  const head = el("div", "exam-ov-top");
  const link = el("a", "", "公式試験ガイド ↗");
  link.href = ex.guide;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  head.append(el("b", "", `${ex.code} ${ex.name}`), el("span", "muted", `採点対象 ${ex.scored} 問${ex.scoredEstimated ? "(推定)" : ""}${ex.retire ? ` · ${ex.retire} で受験終了` : ""}`), link);
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
  const code = $("quiz-cert").value;
  $("practice-exam-pill").textContent = code === "all" ? "全資格対応" : code;
});
fillDomains();
renderOverview();
{
  const single = questions.filter((q) => q.selectCount === 1).length;
  $("practice-type-pill").textContent = `単一${single}問 / 複数${questions.length - single}問`;
}
["quiz-cert", "quiz-domain", "quiz-prob", "quiz-difficulty", "quiz-mode", "quiz-limit"].forEach((id) =>
  $(id).addEventListener("change", updatePool),
);
// ノートなどから「このサービスの問題」を出題する
window.addEventListener("practice-preset", (e) => {
  const ids = e.detail?.ids || [];
  presetIds = ids.length ? new Set(ids) : null;
  $("preset-label").textContent = e.detail?.label || "";
  ["quiz-cert", "quiz-prob", "quiz-difficulty", "quiz-mode"].forEach((id) => ($(id).value = "all"));
  fillDomains();
  renderOverview();
  $("quiz-limit").value = "1000";
  settings();
});
$("preset-clear")?.addEventListener("click", () => {
  presetIds = null;
  updatePool();
});

/* ---------- セッション ---------- */
let session = [], // 問題
  states = [], // { sel:Set, submitted, correct, visited }
  position = 0,
  selections = new Set(),
  submitted = false,
  results = [],
  finished = false;
function cur() {
  return states[position];
}
function statusOf(i) {
  const s = states[i];
  if (s.submitted) return s.correct ? "ok" : "ng";
  if (i === position) return "todo";
  const maxVisited = states.reduce((m, x, j) => (x.visited ? j : m), -1);
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
  map.replaceChildren(
    ...session.map((q, i) => {
      const st = statusOf(i);
      const b = el("button", `qm ${st}${i === position ? " current" : ""}`);
      b.type = "button";
      b.dataset.jump = i;
      const label = { ok: "正解", ng: "不正解", miss: "未回答", todo: "これから" }[st];
      b.setAttribute("aria-label", `問${i + 1} ${label}${i === position ? "（表示中）" : ""}`);
      b.title = `問${i + 1}：${label}`;
      b.append(el("span", "", String(i + 1)));
      return b;
    }),
  );
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
  $("quiz-choices").querySelectorAll(".choice").forEach((label, i) => {
    label.classList.remove("is-right", "is-wrong", "is-missed");
    if (!s.submitted) return;
    const chosen = s.sel.has(i);
    if (q.choices[i].correct) label.classList.add(chosen ? "is-right" : "is-missed");
    else if (chosen) label.classList.add("is-wrong");
  });
}
function feedback(q) {
  const s = cur();
  const box = $("quiz-feedback");
  box.replaceChildren();
  box.hidden = !s.submitted;
  if (!s.submitted) return;
  const head = el("div", `feedback-head ${s.correct ? "good" : "bad"}`);
  head.append(
    el("h3", s.correct ? "feedback-correct" : "feedback-wrong", s.correct ? "✓ 正解です" : "もう一度、考え方を整理しましょう"),
    el(
      "p",
      "",
      `正解：${q.choices.map((c, i) => (c.correct ? LETTERS[i] : null)).filter(Boolean).join("・")}` +
        (s.correct ? "" : `　／　あなたの回答：${[...s.sel].sort().map((i) => LETTERS[i]).join("・")}`),
    ),
  );
  box.append(head);
  const sv = solve[q.id];
  if (sv) {
    const card = el("section", "solve-card");
    card.append(el("p", "eyebrow", "HOW TO SOLVE · 解き方"));
    const k = el("p", "solve-key");
    k.append(el("b", "", "決め手 "), document.createTextNode(sv.key));
    card.append(k);
    const ol = el("ol", "solve-steps");
    sv.steps.forEach((t) => ol.append(el("li", "", t)));
    card.append(ol);
    if (sv.trap) {
      const tp = el("p", "solve-trap");
      tp.append(el("b", "", "ひっかけ "), document.createTextNode(sv.trap));
      card.append(tp);
    }
    box.append(card);
  }
  const exp = el("div", "explanations");
  exp.append(el("p", "eyebrow", "ALL CHOICES · 選択肢ごとの理由"));
  q.choices.forEach((choice, i) => {
    const row = el("div", choice.correct ? "explanation is-correct" : s.sel.has(i) ? "explanation is-chosen" : "explanation");
    row.append(
      el("strong", "", `${LETTERS[i]} · ${choice.correct ? "正解" : "不正解"}${s.sel.has(i) ? " / あなたの回答" : ""}`),
      el("p", "", choice.explanation),
    );
    exp.append(row);
  });
  box.append(exp);
  const rel = relatedNotes(q);
  const foot = el("div", "feedback-links");
  if (rel.length) {
    foot.append(el("span", "muted", "図鑑で確認:"));
    rel.forEach((id) => {
      const a = el("a", "note-chip", noteName.get(id));
      a.href = `#services/${id}`;
      foot.append(a);
    });
  }
  const source = el("a", "source-link", "公式ドキュメントで確認 ↗");
  source.href = q.source;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  foot.append(source);
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
        ? `${LETTERS[[...selections][0]]} を選択`
        : "選択肢を選んでください（キー A〜" + LETTERS[q.choices.length - 1] + "）"
      : `${selections.size} / ${q.selectCount} 選択 · あと ${q.selectCount - selections.size} つ選ぶと採点します`;
}
function render() {
  const q = session[position];
  const s = cur();
  s.visited = true;
  selections = new Set(s.sel);
  submitted = s.submitted;
  $("quiz-position").textContent = `QUESTION ${String(position + 1).padStart(2, "0")} / ${session.length}`;
  $("quiz-progress").max = session.length;
  $("quiz-progress").value = states.filter((x) => x.submitted).length;
  const code = examFor(q);
  const ex = examByCode.get(code);
  const [d, tier] = q.exams[code] || [];
  const p = probability(q, code);
  const others = Object.keys(q.exams).filter((c) => c !== code);
  $("quiz-domain-label").textContent = `${code} · 分野${d} ${ex?.domains[d - 1]?.[0] || q.domain}${others.length ? ` · ほか ${others.join(" / ")}` : ""}`;
  let meta = $("quiz-meta2");
  if (!meta) {
    meta = el("span", "quiz-meta2");
    meta.id = "quiz-meta2";
    $("quiz-type").after(meta);
  }
  const band = probBand(p);
  const pr = el("span", `pill prob-pill band-${band}`, `出題確率 ${BAND_LABEL[band]} · 約${p}%(推定)`);
  pr.title = `${TIER[tier]?.[0] || ""} · 分野の配点 ${ex?.domains[d - 1]?.[1]}% × 採点 ${ex?.scored} 問から推定。AWS は問題ごとの出題率を公開していません。`;
  const lv = el("span", `pill diff-pill lv${q.difficulty}`, `難易度 ${"★".repeat(q.difficulty)}${"☆".repeat(4 - q.difficulty)}`);
  lv.title = ["", "基礎", "標準", "発展", "設計応用"][q.difficulty];
  meta.replaceChildren(pr, lv);
  $("quiz-type").textContent = q.selectCount === 1 ? "単一選択" : `複数選択・${q.selectCount}つ`;
  $("quiz-prompt").textContent = q.prompt;
  $("quiz-choices").replaceChildren();
  $("quiz-choices").append(el("legend", "", q.selectCount === 1 ? "1つ選んでください" : `${q.selectCount}つ選んでください`));
  q.choices.forEach((choice, i) => {
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
    label.append(input, el("span", "choice-letter", LETTERS[i]), el("span", "choice-text", choice.text));
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
  render();
  const top = $("quiz-workspace").getBoundingClientRect().top + scrollY - 8;
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
  session = candidates.slice(0, Number($("quiz-limit").value));
  if (!session.length) return;
  states = session.map(() => ({ sel: new Set(), submitted: false, correct: false, visited: false }));
  position = 0;
  results = [];
  finished = false;
  lastJump = -1;
  $("practice-setup").hidden = true;
  $("quiz-result").hidden = true;
  $("quiz-workspace").hidden = false;
  document.body.classList.add("in-quiz");
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
  stats();
  updatePool();
});
function settings() {
  $("quiz-workspace").hidden = true;
  $("quiz-result").hidden = true;
  $("practice-setup").hidden = false;
  document.body.classList.remove("in-quiz");
  session = [];
  states = [];
  results = [];
  finished = false;
  updatePool();
}
$("quiz-exit").addEventListener("click", () => {
  const answered = states.filter((s) => s.submitted).length;
  settings();
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
  const list = el("ul", "session-summary");
  session.forEach((q, i) => {
    const s = states[i];
    const item = el("li", s.submitted ? (s.correct ? "ok" : "ng") : "miss");
    const btn = el("button", "summary-row");
    btn.type = "button";
    btn.append(
      el("span", "mark", s.submitted ? (s.correct ? "✓" : "×") : "—"),
      el("span", "q", `${String(i + 1).padStart(2, "0")}. ${q.prompt}`),
      el("span", `sum-tag band-${probBand(probability(q, examFor(q)))}`, `${examFor(q)} · ★${q.difficulty} · 約${probability(q, examFor(q))}%`),
      el("span", "go", "見直す →"),
    );
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

/* ---------- キーボード操作 ---------- */
document.addEventListener("keydown", (e) => {
  if ($("quiz-workspace").hidden || location.hash.split("/")[0] !== "#practice") return;
  if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector(".uic")) return;
  const tag = document.activeElement?.tagName;
  if (tag === "TEXTAREA" || (tag === "INPUT" && !["radio", "checkbox"].includes(document.activeElement.type)) || tag === "SELECT") return;
  const q = session[position];
  if (!q) return;
  const k = e.key.toUpperCase();
  let idx = LETTERS.indexOf(k);
  if (idx < 0 && /^[1-8]$/.test(e.key)) idx = Number(e.key) - 1;
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
window.addEventListener("resize", () => session.length && renderMap());
stats();
updatePool();
