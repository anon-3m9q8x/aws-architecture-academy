import { store } from "./storage.js";
import { questions, DIFFICULTY } from "./data/questions.js";
import { serviceQuestions } from "./data/service-questions.js";
import { byId as svcById } from "./services.js";
import { findServices, servicesIn } from "./data/service-terms.js";
import { EXAMS, LEVELS, examByCode, probability, probBand, BAND_LABEL, primaryExam, TIER } from "./data/exams.js";
const $ = (id) => document.getElementById(id);
const key = "aaa.practice.attempts.v1";
const LETTERS = "ABCDEFGH";
$("question-count").textContent = questions.length;
document
  .querySelectorAll("[data-question-count]")
  .forEach((n) => (n.textContent = questions.length));
// 資格試験の問題と、サービス知識問題(別枠)。回答履歴は両方まとめて保存する
const allQuestions = [...questions, ...serviceQuestions];
const questionMap = new Map(allQuestions.map((q) => [q.id, q]));
let kind = "exam"; // 演習の種類: exam = 資格試験の問題 / service = サービス知識(試験外)
const isSvc = (q) => q.kind === "service";
const bankQ = () => (kind === "service" ? serviceQuestions : questions);
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

/* ---------- 解説の文章: 根拠ライン・サービス名のリンク ---------- */
const NUM = "①②③④⑤⑥⑦⑧⑨";
/** 文章にサービス名のリンクを付ける(図鑑へ移動し、戻るボタンで演習へ戻れる) */
function linkify(text, parent) {
  let p = 0;
  for (const { start, end, id } of findServices(text)) {
    if (start < p) continue;
    parent.append(document.createTextNode(text.slice(p, start)));
    const a = el("a", "svc-link", text.slice(start, end));
    a.href = `#services/${id}`;
    a.dataset.svc = id;
    a.title = `サービス図鑑で「${svcById.get(id)?.name || id}」を開く`;
    parent.append(a);
    p = end;
  }
  parent.append(document.createTextNode(text.slice(p)));
  return parent;
}
/** 問題文に根拠ライン(下線と番号)を引く。links=true ならサービス名もリンクにする */
function linedText(text, lines, parent, links) {
  const put = (t, into) => (links ? linkify(t, into) : into.append(document.createTextNode(t)));
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
const sentencesOf = (t) => (t.match(/[^。]+。?/g) || []).map((x) => x.trim()).filter(Boolean);

/* ---------- 成績 ---------- */
function latest() {
  const map = new Map();
  attempts.forEach((a) => map.set(a.id, a));
  return map;
}
/** 問題ごとの誤答回数 */
function wrongCounts() {
  const m = new Map();
  attempts.forEach((a) => !a.correct && m.set(a.id, (m.get(a.id) || 0) + 1));
  return m;
}
const REPEAT = 2; // 「複数回間違えた」とみなす誤答回数
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
      `資格試験 ${[...last.keys()].filter((id) => !isSvc(questionMap.get(id))).length} / ${questions.length} 問・サービス知識 ${[...last.keys()].filter((id) => isSvc(questionMap.get(id))).length} / ${serviceQuestions.length} 問に回答 · 回答 ${attempts.length} 回 · 正答率 ${attempts.length ? Math.round((correct / attempts.length) * 100) + "%" : "未回答"} · 復習対象 ${wrong} 問`,
    ),
  );
  const list = el("div", "domain-results");
  [...new Set(questions.map((q) => q.domain)), "サービス知識(試験外)"].forEach((domain) => {
    const subset = attempts.filter((a) => {
      const q = questionMap.get(a.id);
      return domain === "サービス知識(試験外)" ? isSvc(q) : !isSvc(q) && q.domain === domain;
    });
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
  renderWeak();
}

/* ---------- 複数回間違えた問題(個別にピックアップ) ---------- */
let weakPicked = new Set();
function weakList() {
  const last = latest();
  return [...wrongCounts()]
    .filter(([, n]) => n >= REPEAT)
    .map(([id, n]) => ({ q: questionMap.get(id), n, lastOk: !!last.get(id)?.correct, at: last.get(id)?.at || "" }))
    .sort((a, b) => b.n - a.n || (a.lastOk === b.lastOk ? b.at.localeCompare(a.at) : a.lastOk ? 1 : -1));
}
function startWith(ids, label) {
  window.dispatchEvent(new CustomEvent("practice-preset", { detail: { ids, label } }));
  $("quiz-start").click();
}
function renderWeak() {
  const box = $("weak-box");
  if (!box) return;
  const list = weakList();
  weakPicked = new Set([...weakPicked].filter((id) => list.some((x) => x.q.id === id)));
  box.replaceChildren();
  const head = el("div", "weak-head");
  const title = el("div");
  title.append(el("p", "eyebrow orange", "PICK UP · 苦手な問題"), el("h3", "", `${REPEAT} 回以上間違えた問題 · ${list.length} 問`));
  head.append(title);
  box.append(head);
  if (!list.length) {
    box.append(el("p", "muted weak-empty", `同じ問題を ${REPEAT} 回以上間違えると、ここに表示されます。1 問ずつ選んで解き直せます。`));
    return;
  }
  const tools = el("div", "weak-tools");
  const all = el("button", "", `すべて解き直す(${list.length}問)`);
  all.type = "button";
  all.addEventListener("click", () => startWith(list.map((x) => x.q.id), `${REPEAT} 回以上間違えた問題`));
  const picked = el("button", "primary", "選んだ問題を解く");
  picked.type = "button";
  picked.disabled = !weakPicked.size;
  picked.addEventListener("click", () => weakPicked.size && startWith([...weakPicked], `選んだ苦手問題(${weakPicked.size}問)`));
  const open = list.filter((x) => !x.lastOk);
  const notYet = el("button", "", `まだ正解していない問題(${open.length}問)`);
  notYet.type = "button";
  notYet.disabled = !open.length;
  notYet.addEventListener("click", () => startWith(open.map((x) => x.q.id), "直近も不正解の苦手問題"));
  tools.append(picked, notYet, all);
  head.append(tools);
  const ul = el("ul", "weak-list");
  list.forEach(({ q, n, lastOk }) => {
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
    lab.append(
      cb,
      el("span", "weak-n", `×${n}`),
      el("span", "weak-meta", `${code} · ${q.topic}`),
      el("span", "weak-q", q.prompt),
      el("span", `weak-last ${lastOk ? "ok" : "ng"}`, lastOk ? "直近は正解" : "直近も不正解"),
    );
    const go = el("button", "weak-go", "この問題を解く");
    go.type = "button";
    go.addEventListener("click", () => startWith([q.id], `苦手問題 ${q.id}`));
    li.append(lab, go);
    ul.append(li);
  });
  box.append(ul);
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
  return (presetIds ? allQuestions : bankQ()).filter(
    (q) =>
      (presetIds || svc || code === "all" || !!q.exams[code]) &&
      (presetIds || dom === "all" || (dom.startsWith("d:") ? q.exams[code]?.[0] === Number(dom.slice(2)) : q.domain === dom)) &&
      (presetIds || svc || band === "all" || probBand(probability(q, examFor(q))) === band) &&
      ($("quiz-difficulty").value === "all" || q.difficulty === Number($("quiz-difficulty").value)) &&
      ($("quiz-mode").value === "all" ||
        ($("quiz-mode").value === "wrong"
          ? last.has(q.id) && !last.get(q.id).correct
          : $("quiz-mode").value === "repeat"
            ? (wc.get(q.id) || 0) >= REPEAT
            : !last.has(q.id))) &&
      (!presetIds || presetIds.has(q.id)),
  );
}
let presetIds = null;
function updatePool() {
  const count = pool().length;
  const real = $("quiz-limit").value === "real" && count ? ` → 実試験と同じ ${Math.min(count, realCount())} 問をランダムに出題` : "";
  $("pool-count").textContent =
    `${count} 問が対象${count ? "" : " — 条件を変更してください"}${real}`;
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
    if (!n) return; // 問題のない試験(旧版)は出さない
    const o = el("option", "", `${e.code} ${e.name}${e.retire ? `(${e.retire.slice(5).replace("-", "/")} まで)` : ""} · ${n}問`);
    o.value = e.code;
    g.append(o);
  });
  $("quiz-cert").append(g);
});
/** 表示・確率の計算に使う試験: 選択中の試験があればそれ、なければ問題の主な試験 */
function examFor(q) {
  if (isSvc(q)) return null;
  const code = $("quiz-cert").value;
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
  } else if (code === "all") {
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
  if (code === "all") {
    const grid = el("div", "exam-chips");
    EXAMS.forEach((e) => {
      const n = questions.filter((q) => q.exams[e.code]).length;
      if (!n) return;
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
  syncKind();
});
/* ---------- 実試験と同じ問題数 ---------- */
/** 選択中の試験の実試験の問題数(すべての資格のときは 65 問) */
function realCount() {
  return examByCode.get($("quiz-cert").value)?.real?.[0] || 65;
}
function syncReal() {
  const o = $("quiz-limit").querySelector('option[value="real"]');
  if (!o) return;
  const ex = examByCode.get($("quiz-cert").value);
  o.textContent = ex?.real ? `実試験と同じ ${ex.real[0]}問(本番 ${ex.real[1]}分)` : "実試験と同じ 65問(資格を選ぶとその試験の問題数)";
  o.hidden = o.disabled = kind === "service";
  if (kind === "service" && $("quiz-limit").value === "real") $("quiz-limit").value = "10";
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
  $("quiz-prob").closest("label").hidden = svc;
  $("quiz-domain").closest("label").firstChild.textContent = svc ? "カテゴリ" : "分野";
  const code = $("quiz-cert").value;
  $("practice-exam-pill").textContent = svc ? "サービス知識(試験外)" : code === "all" ? "全資格対応" : code;
  const list = bankQ();
  const single = list.filter((q) => q.selectCount === 1).length;
  $("practice-type-pill").textContent = svc ? `サービス知識 ${list.length}問` : `単一${single}問 / 複数${list.length - single}問`;
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
  q.choices.forEach((choice, i) => {
    const row = el("div", choice.correct ? "explanation is-correct" : s.sel.has(i) ? "explanation is-chosen" : "explanation");
    row.append(el("strong", "", `${LETTERS[i]} · ${choice.correct ? "正解" : "不正解"}${s.sel.has(i) ? " / あなたの回答" : ""}`));
    row.append(linkify(choice.text, el("p", "choice-recap")));
    if (choice.explanation) row.append(linkify(choice.explanation, el("p", "")));
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
  tp.hidden = !q.topic;
  if (isSvc(q)) {
    const kp = el("span", "pill svc-pill", "サービス知識 · 試験外");
    kp.title = "サービス図鑑の内容から作成した知識確認問題です。資格試験の問題とは別枠で記録されます。";
    meta.replaceChildren(kp, lv, tp);
  } else meta.replaceChildren(pr, lv, tp);
  $("quiz-type").textContent = q.selectCount === 1 ? "単一選択" : `複数選択・${q.selectCount}つ`;
  $("quiz-prompt").replaceChildren();
  if (s.submitted && q.lines?.length) linedText(q.prompt, q.lines, $("quiz-prompt"), false);
  else $("quiz-prompt").textContent = q.prompt;
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
  session = $("quiz-limit").value === "real" ? pickReal(candidates, realCount()) : candidates.slice(0, Number($("quiz-limit").value));
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
      isSvc(q)
        ? el("span", "sum-tag", `サービス知識 · ${q.domain} · ${DIFFICULTY[q.difficulty]}`)
        : el("span", `sum-tag band-${probBand(probability(q, examFor(q)))}`, `${examFor(q)} · ${DIFFICULTY[q.difficulty]} · 約${probability(q, examFor(q))}%`),
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
        scrollTo({ top: ctx.scroll, behavior: "auto" });
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
