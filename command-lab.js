// コマンド・ポリシー演習(#command-lab): 一覧・演習(3 ペイン / スマホはタブ)・採点・解説・学習記録。
// 入力はすべて文字列として扱い、HTML として描画しない(textContent のみ)。eval やシェルの実行は行わない。
// シミュレーションはブラウザの中だけで完結し、AWS の実環境へは通信しない。
import { LAB_QUESTIONS, labById, CATEGORY, MODE, LEVEL, EXAM_TAGS, iamEnv, readPolicies, searchText } from "./data/command-lab/index.js";
import { gradePolicy, gradeChoice, gradeGoals, gradeTemplate, lineDiff, STATUS, DECISION_LABEL } from "./lab-engine/grade.js";
import { deployTemplate, RESOURCE_SPECS } from "./lab-engine/cfn.js";
import { ROADMAP } from "./data/command-lab/roadmap.js";
import { KNOWN_ACTIONS, POLICY_KINDS, CONDITION_OPERATORS } from "./lab-engine/validator-iam.js";
import { SUPPORT, evaluate } from "./lab-engine/simulator-iam.js";
import { newSession, runCli, SUPPORTED_COMMANDS } from "./lab-engine/simulator-cli.js";
import { newApiSession, sendRequest, simulatedSignature, looksLikeSecret } from "./lab-engine/simulator-api.js";
import { formatJson } from "./lab-engine/json.js";
import { byId as svcById } from "./services.js";
import { el, store, searchClear, toast, slider } from "./ui.js";

const host = document.getElementById("command-lab");
const PKEY = "aaa.commandLab.progress.v1";
const DKEY = "aaa.commandLab.drafts.v1";
const FKEY = "aaa.commandLab.filters";
const SCHEMA = 1;

/* ---------- 学習記録(schemaVersion 付き。不正な値は読み飛ばす) ---------- */
function loadProgress() {
  const raw = store.get(PKEY, null);
  const out = { schemaVersion: SCHEMA, items: {} };
  if (!raw || typeof raw !== "object" || raw.schemaVersion !== SCHEMA || !raw.items || typeof raw.items !== "object") return out;
  for (const [id, v] of Object.entries(raw.items)) {
    if (!labById.has(id) || !v || typeof v !== "object") continue;
    out.items[id] = {
      attempts: Number.isInteger(v.attempts) && v.attempts >= 0 ? Math.min(v.attempts, 100000) : 0,
      hints: Number.isInteger(v.hints) && v.hints >= 0 ? Math.min(v.hints, 20) : 0,
      cleared: v.cleared === true,
      lastResult: ["pass", "fail"].includes(v.lastResult) ? v.lastResult : null,
      review: v.review === true,
      lastRun: typeof v.lastRun === "string" ? v.lastRun.slice(0, 40) : null,
      clearedAt: typeof v.clearedAt === "string" ? v.clearedAt.slice(0, 40) : null,
      sawModel: v.sawModel === true,
    };
  }
  return out;
}
function loadDrafts() {
  const raw = store.get(DKEY, null);
  const out = { schemaVersion: SCHEMA, items: {} };
  if (!raw || typeof raw !== "object" || raw.schemaVersion !== SCHEMA || !raw.items) return out;
  for (const [id, v] of Object.entries(raw.items)) {
    if (!labById.has(id) || !v || typeof v !== "object") continue;
    const val = v.v;
    if (typeof val === "string" && val.length <= 20000) out.items[id] = { v: val, at: String(v.at || "") };
    else if (val && typeof val === "object" && ["method", "url", "headers", "body"].every((k) => typeof (val[k] ?? "") === "string")) out.items[id] = { v: { method: String(val.method || "GET"), url: String(val.url || "").slice(0, 2000), headers: String(val.headers || "").slice(0, 5000), body: String(val.body || "").slice(0, 20000) }, at: String(v.at || "") };
  }
  return out;
}
let progress = loadProgress();
let drafts = loadDrafts();
const rec = (id) => (progress.items[id] ||= { attempts: 0, hints: 0, cleared: false, lastResult: null, review: false, lastRun: null, clearedAt: null, sawModel: false });
function saveProgress() { store.set(PKEY, progress); window.dispatchEvent(new Event("learning-update")); }
let draftTimer = 0;
function saveDraft(id, value) {
  const text = typeof value === "string" ? value : `${value.url}\n${value.headers}\n${value.body}`;
  if (looksLikeSecret(text)) { warnSecret(true); return; }
  warnSecret(false);
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    drafts.items[id] = { v: value, at: new Date().toISOString() };
    store.set(DKEY, drafts);
  }, 700);
}
function dropDraft(id) { delete drafts.items[id]; store.set(DKEY, drafts); }
let secretNote = null;
function warnSecret(on) { if (secretNote) secretNote.hidden = !on; }
export function labStats() {
  const items = Object.values(progress.items);
  return { total: LAB_QUESTIONS.length, cleared: items.filter((x) => x.cleared).length, tried: items.filter((x) => x.attempts > 0).length, review: items.filter((x) => x.review).length };
}
window.addEventListener("learning-update", () => { progress = loadProgress(); drafts = loadDrafts(); updateHome(); });

/* ---------- 共通部品 ---------- */
const STATE = (id) => { const r = progress.items[id]; if (!r || !r.attempts) return "new"; if (r.cleared) return "clear"; return r.lastResult === "fail" ? "wrong" : "tried"; };
const STATE_LABEL = { new: "未挑戦", clear: "クリア", wrong: "誤答あり", tried: "挑戦中" };
function chip(text, cls = "") { return el("span", `cl-chip ${cls}`, text); }
function stars(n) { return "★".repeat(n) + "☆".repeat(4 - n); }
function button(text, cls = "", on) { const b = el("button", cls, text); b.type = "button"; if (on) b.addEventListener("click", on); return b; }
function link(text, href, cls = "") { const a = el("a", cls, text); a.href = href; return a; }
function ext(text, href) { const a = el("a", "cl-ext", text + " ↗"); a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; return a; }
function pre(text, cls = "") { const p = el("pre", `cl-pre ${cls}`); p.textContent = text; return p; }
function section(title, ...kids) { const s = el("section", "cl-sec"); s.append(el("h3", "", title), ...kids); return s; }
function list(items, cls = "") { const ul = el("ul", cls); items.forEach((t) => ul.append(typeof t === "string" ? el("li", "", t) : t)); return ul; }
const shortArn = (a) => (a || "").replace(/^arn:aws:s3:::/, "s3://").replace(/^arn:aws:([a-z0-9-]+):[a-z0-9-]*:\d{12}:/, "$1:");
const EXPECT_LABEL = { allow: "許可", deny: "拒否", "implicit-deny": "暗黙的な拒否", "explicit-deny": "明示的な拒否" };

/* ---------- 一覧 ---------- */
let filters = { cat: "all", mode: "all", level: "all", tag: "all", status: "all", q: "" };
try { const f = store.get(FKEY, null); if (f && typeof f === "object") filters = { ...filters, ...Object.fromEntries(Object.entries(f).filter(([k, v]) => k in filters && typeof v === "string")) }; } catch { /* 既定値を使う */ }
function renderList() {
  const wrap = el("div", "cl-list");
  const head = el("div", "page-heading ws-head");
  const t = el("div");
  t.append(el("p", "eyebrow", "COMMAND & POLICY LAB"), el("h1", "", "コマンド・ポリシー演習"), el("p", "muted", "CLI・IAM ポリシー・API を、シミュレーターで書いて試します。"));
  const s = labStats();
  const prog = el("div", "bd-prog");
  prog.append(el("b", "", `${s.cleared} / ${s.total}`), el("small", "", "問 クリア"));
  head.append(t, prog);
  const how = el("ol", "bd-how cl-how");
  [["読む", "シナリオ・初期環境・達成条件を確認"], ["書く", "CLI / JSON / API リクエストを入力"], ["確かめる", "模擬実行で、許可・拒否・状態の変化を確認"], ["直す", "不正解の理由と解説を読み、再挑戦"]].forEach(([a, b], i) => {
    const li = el("li");
    li.append(el("i", "", String(i + 1)), el("b", "", a), el("span", "", b));
    how.append(li);
  });
  // フィルター
  const bar = el("div", "panel cl-filters");
  const seg = el("div", "seg cl-cats");
  seg.setAttribute("role", "group");
  seg.setAttribute("aria-label", "カテゴリ");
  [["all", "すべて"], ...Object.entries(CATEGORY).map(([k, v]) => [k, v.label])].forEach(([v, tx]) => {
    const b = button(tx, "seg-btn");
    b.dataset.v = v;
    b.setAttribute("aria-pressed", String(filters.cat === v));
    b.addEventListener("click", () => { filters.cat = v; persist(); renderList(); });
    seg.append(b);
  });
  const sel = (label, key, opts) => {
    const l = el("label", "cl-sel");
    const s2 = el("select");
    opts.forEach(([v, tx]) => { const o = el("option", "", tx); o.value = v; s2.append(o); });
    s2.value = filters[key];
    s2.addEventListener("change", () => { filters[key] = s2.value; persist(); renderList(); });
    l.append(el("span", "", label), s2);
    return l;
  };
  const search = el("input");
  search.type = "search";
  search.placeholder = "問題を検索(例: ListBucket、Cognito、dry-run)";
  search.setAttribute("aria-label", "問題を検索");
  search.value = filters.q;
  const sels = el("div", "cl-sels");
  sels.append(
    sel("モード", "mode", [["all", "すべて"], ...Object.entries(MODE).map(([k, v]) => [k, v.label])]),
    sel("難易度", "level", [["all", "すべて"], ...Object.entries(LEVEL).map(([k, v]) => [k, `レベル ${k} · ${v}`])]),
    sel("資格", "tag", [["all", "すべて"], ...EXAM_TAGS.map((t2) => [t2, t2])]),
    sel("状況", "status", [["all", "すべて"], ["new", "未挑戦"], ["wrong", "誤答あり"], ["clear", "クリア"], ["review", "復習フラグ"]]),
  );
  bar.append(seg, search, sels);
  requestAnimationFrame(() => slider(seg, ".seg-btn", (b) => b.dataset.v === filters.cat)(true));
  const grid = el("div", "bd-grid cl-grid-list");
  const count = el("p", "muted cl-count");
  count.setAttribute("role", "status");
  const draw = () => {
    const q = filters.q.trim().toLowerCase();
    const items = LAB_QUESTIONS.filter((x) =>
      (filters.cat === "all" || x.category === filters.cat) && (filters.mode === "all" || x.mode === filters.mode) &&
      (filters.level === "all" || String(x.level) === filters.level) && (filters.tag === "all" || x.examTags.includes(filters.tag)) &&
      (filters.status === "all" || (filters.status === "review" ? progress.items[x.id]?.review : STATE(x.id) === filters.status)) &&
      (!q || searchText(x).includes(q)));
    count.textContent = `${items.length} 問`;
    grid.replaceChildren(...items.map((x, i) => card(x, i)));
    if (!items.length) grid.append(el("p", "muted", "条件に合う問題がありません。フィルターを変えてください。"));
  };
  search.addEventListener("input", () => { filters.q = search.value; persist(); draw(); });
  draw();
  const scope = el("details", "panel cl-scope");
  scope.append(el("summary", "", "シミュレーターの対応範囲(模擬評価について)"));
  const sc = el("div", "cl-scope-body");
  sc.append(
    el("p", "", "この演習の判定は、学習用に定義した仮想環境と、対応した範囲のルールだけで行う模擬評価です。現実の AWS の許可判定や実行結果を完全には保証しません。公式の IAM Policy Simulator や IAM Access Analyzer と同じ結果になるとは限りません。対応していない要素は「判定対象外」と表示し、成功・失敗をでっちあげません。"),
    section("IAM ポリシー", el("p", "", `要素: ${SUPPORT.elements.join(", ")}`), el("p", "", `ポリシーの種類: ${SUPPORT.policyTypes.join("、")}`), el("p", "", `条件キー: ${SUPPORT.conditionKeys.join(", ")}`), el("p", "", `扱わないもの: ${SUPPORT.notModeled.join("、")}`)),
    section("AWS CLI", el("p", "", SUPPORTED_COMMANDS.join(" / ")), el("p", "", "--query は JMESPath の基本的な書き方、--output は json と text(--query と併用)に対応。シェルの記号(| ; > など)と OS のコマンドは実行しません。")),
    section("API リクエスト", el("p", "", "API Gateway(REST・Cognito / IAM 認可 / API キー / リクエストの検証 / CORS のプリフライト)、DynamoDB(GetItem・PutItem・Query・DeleteItem、インデックス・予約語・条件付き書き込み)、Lambda(Invoke の同期・非同期・DryRun)、S3(オブジェクトの GET・PUT・DELETE、匿名の要求)、SQS(SendMessage・GetQueueAttributes、FIFO)、EventBridge(PutEvents とルールの照合)。署名(SigV4)は模擬で、実際の署名計算・送信は行いません。")),
    section("CloudFormation", el("p", "", `テンプレート(YAML / JSON)の検証と模擬デプロイ。Parameters・Mappings・Conditions・Resources・Outputs、組み込み関数(Ref・GetAtt・Sub・Join・Select・Split・If・Equals・Not・And・Or・FindInMap・GetAZs・ImportValue・Base64)、疑似パラメーター、DependsOn・循環依存の検出、DeletionPolicy。対応するリソースタイプ: ${Object.keys(RESOURCE_SPECS).join(", ")}。それ以外のタイプや Transform(SAM)は「判定対象外」です。プロパティは最上位の名前と必須項目だけを確かめます(値の形式までは確かめません)。`)),
    el("p", "cl-warn", "本物の AWS 認証情報(アクセスキー・シークレットキー・セッショントークン)やプロファイル名は入力しないでください。この画面は外部と通信しません。"),
  );
  scope.append(sc);
  wrap.append(head, how, roadmapPanel(), statsPanel(), bar, count, grid, scope);
  host.replaceChildren(wrap);
  searchClear(search);
}
function persist() { store.set(FKEY, filters); }
/* ---------- ロードマップ・分野別の成績 ---------- */
const cleared = (id) => progress.items[id]?.cleared === true;
/** 指定した問題より後(なければ最初の未クリアのステップ)で、まだクリアしていない問題 */
function nextOnRoadmap(fromId) {
  const flat = ROADMAP.flatMap((st) => st.ids);
  const i = fromId ? flat.indexOf(fromId) : -1;
  const after = [...flat.slice(i + 1), ...flat.slice(0, Math.max(0, i))];
  const id = after.find((x) => !cleared(x) && x !== fromId);
  return id ? labById.get(id) : null;
}
function roadmapPanel() {
  const box = el("section", "panel cl-roadmap");
  const head = el("div", "cl-rm-head");
  const nx = nextOnRoadmap(null);
  head.append(el("h2", "", "学習ロードマップ"), el("p", "muted", "基礎(読む)→ 単一サービス → 複数の条件 → IaC・複数アカウントの順に進みます。順番どおりでなくても解けます。"));
  if (nx) head.append(link(`▶ 次の問題: ${nx.title}`, `#command-lab/${nx.id}`, "primary cl-rm-next"));
  else head.append(el("p", "cl-rm-done", "すべてのステップをクリアしました 🎉"));
  const ol = el("ol", "cl-rm-steps");
  let currentMarked = false;
  ROADMAP.forEach((st, i) => {
    const n = st.ids.filter(cleared).length;
    const done = n === st.ids.length;
    const isCur = !done && !currentMarked;
    if (isCur) currentMarked = true;
    const li = el("li", `cl-rm-step${done ? " done" : ""}${isCur ? " current" : ""}`);
    const d = el("details");
    if (isCur) d.open = true;
    const sm = el("summary");
    const bar = el("span", "cl-rm-bar");
    bar.style.setProperty("--p", `${Math.round((n / st.ids.length) * 100)}%`);
    sm.append(el("i", "", done ? "✓" : String(i + 1)), el("b", "", st.title), el("span", "cl-rm-n", `${n} / ${st.ids.length}`), bar);
    const ul = el("ul", "cl-rm-qs");
    st.ids.forEach((id) => { const q = labById.get(id); if (!q) return; const it = el("li", `st-${STATE(id)}`); it.append(el("span", "cl-mark", cleared(id) ? "✓" : "○"), link(`${CATEGORY[q.category].short} · ${q.title}`, `#command-lab/${id}`)); ul.append(it); });
    d.append(sm, el("p", "cl-rm-goal", st.goal), ul);
    li.append(d);
    ol.append(li);
  });
  box.append(head, ol);
  return box;
}
function statsPanel() {
  const d = el("details", "panel cl-stats-panel");
  d.append(el("summary", "", "分野別の成績"));
  const grid = el("div", "cl-stat-grid");
  const row = (label, ids) => {
    const tried = ids.filter((id) => progress.items[id]?.attempts > 0).length;
    const n = ids.filter(cleared).length;
    const wrong = ids.filter((id) => STATE(id) === "wrong").length;
    const r = el("div", "cl-stat-row");
    const bar = el("span", "cl-rm-bar");
    bar.style.setProperty("--p", `${ids.length ? Math.round((n / ids.length) * 100) : 0}%`);
    r.append(el("b", "", label), bar, el("span", "cl-stat-n", `${n} / ${ids.length}`), el("small", "muted", `挑戦 ${tried}${wrong ? ` · 誤答あり ${wrong}` : ""}`));
    return r;
  };
  const block = (title, rows) => { const b = el("div", "cl-stat-block"); b.append(el("h3", "", title), ...rows); return b; };
  grid.append(
    block("カテゴリ", Object.entries(CATEGORY).map(([k, v]) => row(v.label, LAB_QUESTIONS.filter((q) => q.category === k).map((q) => q.id)))),
    block("モード", Object.entries(MODE).map(([k, v]) => row(v.label, LAB_QUESTIONS.filter((q) => q.mode === k).map((q) => q.id)))),
    block("資格", EXAM_TAGS.map((t) => row(t, LAB_QUESTIONS.filter((q) => q.examTags.includes(t)).map((q) => q.id)))),
  );
  const weak = Object.entries(CATEGORY).map(([k, v]) => { const ids = LAB_QUESTIONS.filter((q) => q.category === k).map((q) => q.id); return { v, k, wrong: ids.filter((id) => STATE(id) === "wrong").length }; }).filter((x) => x.wrong).sort((a, b) => b.wrong - a.wrong)[0];
  if (weak) d.append(el("p", "cl-weak", `誤答が多い分野: ${weak.v.label}(${weak.wrong} 問)。「状況: 誤答あり」で絞り込んで復習できます。`));
  d.append(grid);
  return d;
}
function card(q, i) {
  const a = el("a", `bd-card cl-card st-${STATE(q.id)}`);
  a.href = `#command-lab/${q.id}`;
  a.style.setProperty("--d", `${Math.min(i, 12) * 25}ms`);
  const top = el("div", "bd-card-top");
  top.append(el("span", `cl-cat c-${q.category}`, CATEGORY[q.category].icon), chip(MODE[q.mode].label, `m-${q.mode}`), el("span", "cl-lv", stars(q.level)), el("span", "bd-st", STATE_LABEL[STATE(q.id)] + (progress.items[q.id]?.review ? " · 復習" : "")));
  const tags = el("div", "cl-tags");
  q.examTags.forEach((t) => tags.append(chip(t, "tag")));
  a.append(top, el("h3", "", q.title), el("p", "", q.scenario), tags);
  return a;
}

/* ---------- 演習 ---------- */
let cur = null; // { q, value, session, result, hints, tab, picked, revealed }
function renderProblem(q) {
  const r = rec(q.id);
  const d = drafts.items[q.id]?.v;
  cur = { q, hints: 0, tab: "brief", picked: [], result: null, revealed: false, value: null, session: null };
  if (q.category === "iam" || q.category === "cfn") cur.value = q.mode === "read" ? null : typeof d === "string" ? d : q.editor.starter;
  if (q.category === "cli") { cur.value = typeof d === "string" ? d : q.editor.starter; cur.session = newSession(q.editor.env); }
  if (q.category === "api") { cur.value = d && typeof d === "object" ? { ...d } : { ...q.editor.starter }; cur.session = newApiSession(q.editor.env); }
  const root = el("div", "cl-problem");
  // 上部
  const top = el("div", "cl-top");
  const idx = LAB_QUESTIONS.indexOf(q);
  const nav = el("div", "cl-topnav");
  const prev = LAB_QUESTIONS[idx - 1], next = LAB_QUESTIONS[idx + 1];
  nav.append(link("← 一覧", "#command-lab", "cl-back"));
  if (prev) nav.append(link("‹ 前の問題", `#command-lab/${prev.id}`, "cl-pn"));
  if (next) nav.append(link("次の問題 ›", `#command-lab/${next.id}`, "cl-pn"));
  const title = el("div", "cl-title");
  const meta = el("div", "cl-meta");
  meta.append(el("span", `cl-cat c-${q.category}`, CATEGORY[q.category].icon), chip(CATEGORY[q.category].label, "cat"), chip(`${MODE[q.mode].label} · ${MODE[q.mode].note}`, `m-${q.mode}`), chip(`レベル ${q.level} ${stars(q.level)}`, "lv"), ...q.examTags.map((t) => chip(t, "tag")), el("code", "cl-id", q.id));
  title.append(meta, el("h1", "", q.title));
  const reviewBtn = button(r.review ? "★ 復習に登録済み" : "☆ 復習に追加", "cl-review", () => { const x = rec(q.id); x.review = !x.review; saveProgress(); reviewBtn.textContent = x.review ? "★ 復習に登録済み" : "☆ 復習に追加"; reviewBtn.setAttribute("aria-pressed", String(x.review)); });
  reviewBtn.setAttribute("aria-pressed", String(r.review));
  top.append(nav, title, reviewBtn);
  // スマホのタブ
  const tabs = el("div", "cl-tabs");
  tabs.setAttribute("role", "tablist");
  const panes = {};
  [["brief", "問題"], ["work", q.mode === "read" ? "コード" : "エディター"], ["result", "結果"]].forEach(([k, tx]) => {
    const b = button(tx, "cl-tab");
    b.setAttribute("role", "tab");
    b.dataset.tab = k;
    b.addEventListener("click", () => setTab(k));
    tabs.append(b);
  });
  const grid = el("div", "cl-panes");
  panes.brief = el("section", "panel cl-pane cl-brief");
  panes.work = el("section", "panel cl-pane cl-work");
  panes.result = el("section", "panel cl-pane cl-result");
  panes.result.setAttribute("aria-live", "polite");
  panes.brief.setAttribute("aria-label", "問題");
  panes.work.setAttribute("aria-label", "エディター");
  panes.result.setAttribute("aria-label", "結果");
  grid.append(panes.brief, panes.work, panes.result);
  cur.grid = grid; cur.tabs = tabs; cur.panes = panes;
  const mbar = el("div", "cl-mbar");
  cur.mbar = mbar;
  root.append(top, tabs, grid, mbar);
  host.replaceChildren(root);
  renderBrief();
  renderWork();
  renderResult();
  setTab("brief", true);
}
/** 上部バー(スマホでは横並びのメニューも)の下端。タブの固定位置とスクロール先に使う */
function stickTop() {
  const tb = document.querySelector(".topbar")?.offsetHeight || 82;
  const sb = matchMedia("(max-width: 760px)").matches ? document.querySelector(".shell > .sidebar")?.offsetHeight || 0 : 0;
  return tb + sb;
}
function updateStick() { host.style.setProperty("--cl-stick", `${stickTop()}px`); }
window.addEventListener("resize", updateStick);
function setTab(k, quiet) {
  if (!cur) return;
  cur.tab = k;
  cur.grid.dataset.tab = k;
  cur.tabs.querySelectorAll(".cl-tab").forEach((b) => { b.setAttribute("aria-selected", String(b.dataset.tab === k)); });
  updateStick();
  if (!quiet && matchMedia("(max-width: 980px)").matches) {
    const y = cur.tabs.getBoundingClientRect().top + window.scrollY - stickTop() - 6;
    if (Math.abs(window.scrollY - y) > 4) window.scrollTo({ top: Math.max(0, y), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
}

/* ----- 左: 問題 ----- */
function renderBrief() {
  const { q } = cur;
  const p = cur.panes.brief;
  const det = el("details", "cl-scn");
  det.open = true;
  det.append(el("summary", "", "シナリオ"), el("p", "", q.scenario));
  const envSec = section("初期環境", list(q.environment));
  const reqs = el("ul", "cl-checklist");
  (q.requirements || []).forEach((t) => { const li = el("li"); li.append(el("span", "cl-box", "□"), el("span", "", t)); reqs.append(li); });
  cur.reqList = reqs;
  const reqSec = q.requirements ? section("達成条件", reqs) : null;
  const hintBox = el("div", "cl-hints");
  const hintBtn = button(`ヒントを見る(0 / ${q.hints.length})`, "cl-hint-btn", () => showHint());
  cur.hintBtn = hintBtn; cur.hintBox = hintBox;
  const hintSec = section("ヒント", hintBtn, hintBox);
  const svc = el("div", "cl-svc");
  q.services.forEach((id) => { const s = svcById.get(id); if (s) svc.append(link(`${s.name} →`, `#services/${id}`, "cl-svc-link")); });
  const svcSec = section("サービス図鑑で確認", svc);
  p.replaceChildren(det, envSec, ...(reqSec ? [reqSec] : []), hintSec, svcSec);
}
function showHint() {
  const { q } = cur;
  if (cur.hints >= q.hints.length) return;
  cur.hints++;
  const x = rec(q.id);
  x.hints = Math.max(x.hints, cur.hints);
  saveProgress();
  cur.hintBox.append(el("p", "cl-hint", `${cur.hints}. ${q.hints[cur.hints - 1]}`));
  cur.hintBtn.textContent = cur.hints < q.hints.length ? `次のヒント(${cur.hints} / ${q.hints.length})` : "ヒントはここまで";
  cur.hintBtn.disabled = cur.hints >= q.hints.length;
  setTab("brief");
}

/* ----- 中央: エディター ----- */
function codeEditor({ value, readOnly = false, lang = "json", label, onInput, onRun, rows = 16 }) {
  const root = el("div", `cl-ed lang-${lang}`);
  const gut = el("div", "cl-gut");
  gut.setAttribute("aria-hidden", "true");
  const ta = el("textarea", "cl-ta");
  ta.value = value || "";
  ta.readOnly = readOnly;
  ta.spellcheck = false;
  ta.rows = rows;
  ta.setAttribute("autocapitalize", "off");
  ta.setAttribute("autocomplete", "off");
  ta.setAttribute("autocorrect", "off");
  ta.wrap = "off";
  ta.setAttribute("aria-label", label);
  let escaped = false;
  const lines = () => {
    const n = ta.value.split("\n").length;
    if (gut.childElementCount !== n) gut.replaceChildren(...Array.from({ length: n }, (_, i) => el("span", "", String(i + 1))));
  };
  ta.addEventListener("scroll", () => { gut.scrollTop = ta.scrollTop; });
  ta.addEventListener("input", () => { lines(); markLine(0); onInput?.(ta.value); });
  ta.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); onRun?.(); return; }
    if (readOnly) return;
    if (e.key === "Escape") { escaped = true; return; }
    if (e.key === "Tab" && !escaped && !e.altKey) {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: en, value: v } = ta;
      if (e.shiftKey) {
        const ls = v.lastIndexOf("\n", s - 1) + 1;
        if (v.startsWith("  ", ls)) { ta.setRangeText("", ls, ls + 2, "end"); ta.selectionStart = ta.selectionEnd = Math.max(ls, s - 2); }
      } else ta.setRangeText("  ", s, en, "end");
      ta.dispatchEvent(new Event("input"));
      return;
    }
    escaped = false;
    if (e.key === "Enter" && (lang === "json" || lang === "yaml") && !e.shiftKey) {
      e.preventDefault();
      const { selectionStart: s, value: v } = ta;
      const ls = v.lastIndexOf("\n", s - 1) + 1;
      const indent = /^\s*/.exec(v.slice(ls, s))[0];
      const prevCh = v.slice(ls, s).replace(/\s+#.*$/, "").trimEnd().slice(-1);
      // JSON は { [ の後、YAML は「キー:」で終わる行の後に字下げを 1 段深くする
      const extra = (lang === "json" ? prevCh === "{" || prevCh === "[" : prevCh === ":" || prevCh === "|" || prevCh === ">") ? "  " : "";
      ta.setRangeText("\n" + indent + extra, s, ta.selectionEnd, "end");
      ta.dispatchEvent(new Event("input"));
    }
  });
  function markLine(n) { [...gut.children].forEach((s, i) => { s.classList.toggle("err", i + 1 === n); s.classList.remove("warn", "sec"); s.removeAttribute("title"); }); }
  /** 指摘のある行に印を付ける: [{ line, level: "error" | "warning" | "security", msg }] */
  function markLines(items) {
    markLine(0);
    for (const it of items) {
      const g = gut.children[it.line - 1];
      if (!g || !it.line) continue;
      g.classList.add(it.level === "error" ? "err" : it.level === "security" ? "sec" : "warn");
      g.title = [g.title, it.msg].filter(Boolean).join("\n");
    }
  }
  function insert(text, back = 0) {
    if (readOnly) return;
    const { selectionStart: s, selectionEnd: en } = ta;
    ta.setRangeText(text, s, en, "end");
    if (back) ta.selectionStart = ta.selectionEnd = ta.selectionStart - back;
    ta.focus();
    ta.dispatchEvent(new Event("input"));
  }
  function goto(line, col = 1) {
    const ls = ta.value.split("\n");
    let p = 0;
    for (let i = 0; i < line - 1 && i < ls.length; i++) p += ls[i].length + 1;
    ta.focus();
    ta.selectionStart = ta.selectionEnd = p + Math.max(0, col - 1);
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    ta.scrollTop = Math.max(0, (line - 4) * lh);
  }
  root.append(gut, ta);
  lines();
  return { root, ta, markLine, markLines, insert, goto, set(v) { ta.value = v; lines(); markLine(0); } };
}
function toolbar(...btns) { const t = el("div", "cl-toolbar"); t.append(...btns.filter(Boolean)); return t; }
function symbolBar(ed, symbols) {
  const b = el("div", "cl-symbols");
  b.setAttribute("aria-label", "記号の入力補助");
  symbols.forEach(([s, back = 0, label]) => { const x = button(label || s, "cl-sym", () => ed.insert(s, back)); x.title = `${s} を入力`; b.append(x); });
  return b;
}
let fontSize = Number(store.get("aaa.commandLab.font", 13)) || 13;
function fontButtons(target) {
  const apply = () => { target.style.setProperty("--cl-font", `${fontSize}px`); store.set("aaa.commandLab.font", fontSize); };
  apply();
  return [button("A−", "cl-tool", () => { fontSize = Math.max(11, fontSize - 1); apply(); }), button("A＋", "cl-tool", () => { fontSize = Math.min(20, fontSize + 1); apply(); })];
}
function expandButton() {
  const b = button("⤢ 拡大", "cl-tool", () => { const on = cur.grid.classList.toggle("expanded"); b.textContent = on ? "⤡ 元に戻す" : "⤢ 拡大"; b.setAttribute("aria-pressed", String(on)); });
  b.setAttribute("aria-pressed", "false");
  return b;
}
function copyButton(get) {
  return button("コピー", "cl-tool", async () => { try { await navigator.clipboard.writeText(get()); toast("コピーしました"); } catch { toast("コピーできませんでした"); } });
}
function secretWarning() {
  secretNote = el("p", "cl-warn cl-secret", "⚠ 本物の AWS 認証情報らしい文字列があります。この内容は保存しません。認証情報は入力しないでください。");
  secretNote.hidden = true;
  return secretNote;
}
/** IAM の補完候補: 入力中の語句から、要素名・アクション・条件キー・ARN を提案 */
function vocab(q) {
  const svcs = new Set((q.tests || []).map((t) => t.action.split(":")[0]));
  const actions = [...svcs].flatMap((s) => (KNOWN_ACTIONS[s] || []).map((a) => `${s}:${a}`));
  const arns = [...new Set((q.tests || []).flatMap((t) => { const r = t.resource; if (!r || r === "*") return []; if (r.startsWith("arn:aws:s3:::")) { const b = r.slice(13).split("/")[0]; return [`arn:aws:s3:::${b}`, `arn:aws:s3:::${b}/*`]; } return [r.replace(/[^/:]+$/, "*")]; }))];
  return [...new Set(["Version", "2012-10-17", "Statement", "Sid", "Effect", "Allow", "Deny", "Action", "NotAction", "Resource", "NotResource", "Principal", "NotPrincipal", "Condition", "AWS", "Service", ...CONDITION_OPERATORS, ...SUPPORT.conditionKeys.map((k) => k.replace("/*", "/")), "${aws:username}", "${aws:PrincipalTag/", ...actions, ...arns])];
}
function suggestBar(ed, words) {
  const bar = el("div", "cl-suggest");
  bar.setAttribute("aria-label", "補完候補");
  const update = () => {
    const { selectionStart: s, value: v } = ed.ta;
    const m = /[A-Za-z0-9:*${}/_.-]{2,}$/.exec(v.slice(0, s));
    const tok = m ? m[0] : "";
    const lower = tok.toLowerCase();
    const hits = tok ? words.filter((w) => w.toLowerCase().startsWith(lower) && w !== tok).slice(0, 8) : [];
    if (!hits.length) { bar.replaceChildren(el("span", "cl-suggest-empty", "入力すると、要素名・アクション・条件キーの候補を表示します")); return; }
    bar.replaceChildren(el("span", "cl-suggest-label", "候補:"), ...hits.map((w) => button(w, "cl-sug", () => { const st = ed.ta.selectionStart; ed.ta.setRangeText(w, st - tok.length, st, "end"); ed.ta.focus(); ed.ta.dispatchEvent(new Event("input")); })));
  };
  ed.ta.addEventListener("input", update);
  ed.ta.addEventListener("click", update);
  ed.ta.addEventListener("keyup", (e) => { if (e.key.startsWith("Arrow")) update(); });
  update();
  return bar;
}
function renderWork() {
  const { q } = cur;
  const p = cur.panes.work;
  p.replaceChildren();
  if (q.category === "iam" && q.mode === "read") return renderRead(p);
  if (q.category === "iam") return renderPolicyEditor(p);
  if (q.category === "cfn") return q.mode === "read" ? renderTemplateRead(p) : renderTemplateEditor(p);
  if (q.category === "cli") return renderTerminal(p);
  return renderApiForm(p);
}
function runBar(label, on) {
  const run = button(label, "primary cl-run", on);
  run.title = "Ctrl + Enter(Mac は ⌘ + Enter)でも実行できます";
  cur.mbar.replaceChildren(button(label, "primary", on), button("ヒント", "", () => showHint()), button("結果", "", () => setTab("result")));
  return run;
}
function renderPolicyEditor(p) {
  const { q } = cur;
  const kind = q.editor.policyKind;
  const tab = el("div", "cl-filetab");
  tab.append(el("span", "cl-file", `${q.editor.policyName}.json`), el("span", "cl-kind", POLICY_KINDS[kind]), q.editor.attachTo ? el("span", "cl-attach", `付け先: ${q.editor.attachTo.map((x) => x.replace("user:", "ユーザー ").replace("role:", "ロール ")).join("、")}`) : "");
  const ed = codeEditor({ value: cur.value, label: `${q.editor.policyName} の JSON`, onInput: (v) => { cur.value = v; saveDraft(q.id, v); }, onRun: () => runPolicy() });
  cur.ed = ed;
  const fmt = button("整形", "cl-tool", () => { try { ed.set(formatJson(ed.ta.value)); cur.value = ed.ta.value; saveDraft(q.id, cur.value); } catch (e) { toast(`整形できません: ${e.line} 行 ${e.col} 列 ${e.message}`); } });
  const reset = button("リセット", "cl-tool", () => { if (!confirm("入力を初期状態に戻します。よろしいですか?")) return; ed.set(q.editor.starter); cur.value = q.editor.starter; dropDraft(q.id); });
  const run = runBar("▶ テスト実行", () => runPolicy());
  p.append(tab, toolbar(run, fmt, reset, copyButton(() => ed.ta.value), ...fontButtons(p), expandButton()), ed.root, suggestBar(ed, vocab(q)), symbolBar(ed, [["{", 0], ["}", 0], ["[", 0], ["]", 0], ['""', 1, '" "'], [":", 0], [",", 0], ["*", 0], ["/", 0], ["${aws:username}", 0]]), secretWarning(), el("p", "cl-note", "テスト実行は、この問題の検証ケースをブラウザの中で模擬評価します。Esc の後に Tab でエディターの外へ移動できます。"));
}
function renderRead(p) {
  const { q } = cur;
  const tab = el("div", "cl-filetab");
  tab.append(el("span", "cl-file", "policy.json(読み取り専用)"), el("span", "cl-kind", POLICY_KINDS[q.codeKind || "identity"]));
  const ed = codeEditor({ value: q.code, readOnly: true, label: "読み取り専用のポリシー" });
  const form = el("form", "cl-choices");
  const fs = el("fieldset");
  fs.append(el("legend", "", q.multi ? "当てはまるものをすべて選ぶ" : "1 つ選ぶ"));
  q.choices.forEach((c, i) => {
    const l = el("label", "cl-choice");
    const inp = el("input");
    inp.type = q.multi ? "checkbox" : "radio";
    inp.name = "c";
    inp.value = String(i);
    l.append(inp, el("span", "", c.text));
    fs.append(l);
  });
  const submit = button("回答する", "primary cl-run", () => answerRead(form));
  cur.mbar.replaceChildren(button("回答する", "primary", () => answerRead(form)), button("ヒント", "", () => showHint()), button("結果", "", () => setTab("result")));
  form.addEventListener("submit", (e) => { e.preventDefault(); answerRead(form); });
  form.append(fs, submit);
  p.append(tab, toolbar(copyButton(() => q.code), ...fontButtons(p), expandButton()), ed.root, form);
}

/* ----- CLI ターミナル ----- */
function renderTerminal(p) {
  const { q } = cur;
  const term = el("div", "cl-term");
  const out = el("div", "cl-out");
  out.setAttribute("role", "log");
  out.setAttribute("aria-label", "実行結果");
  out.append(el("p", "cl-sys", `# 学習用の模擬ターミナル(${q.editor.env.region})。aws コマンドだけを模擬実行します。認証情報の入力は不要です。`));
  const line = el("div", "cl-prompt");
  const ps = el("span", "cl-ps", "$");
  const ta = el("textarea", "cl-cmd");
  ta.rows = 2;
  ta.spellcheck = false;
  ta.setAttribute("autocapitalize", "off");
  ta.setAttribute("autocorrect", "off");
  ta.setAttribute("aria-label", "aws コマンドを入力");
  ta.placeholder = "aws sts get-caller-identity";
  ta.value = cur.value || "";
  const hist = [];
  let hi = -1;
  const fit = () => { ta.style.height = "auto"; ta.style.height = Math.min(220, ta.scrollHeight + 2) + "px"; };
  ta.addEventListener("input", () => { cur.value = ta.value; saveDraft(q.id, ta.value); fit(); });
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !ta.value.trimEnd().endsWith("\\")) { e.preventDefault(); exec(); }
    else if (e.key === "ArrowUp" && !ta.value.includes("\n") && hist.length) { e.preventDefault(); hi = hi < 0 ? hist.length - 1 : Math.max(0, hi - 1); ta.value = hist[hi]; fit(); }
    else if (e.key === "ArrowDown" && !ta.value.includes("\n") && hi >= 0) { e.preventDefault(); hi = hi + 1 >= hist.length ? -1 : hi + 1; ta.value = hi < 0 ? "" : hist[hi]; fit(); }
  });
  function exec() {
    const cmd = ta.value.trim();
    if (!cmd) return;
    if (looksLikeSecret(cmd)) { warnSecret(true); toast("認証情報らしい文字列は実行しません"); return; }
    hist.push(cmd); hi = -1;
    const r = runCli(cur.session, cmd);
    out.append(el("p", "cl-in", `$ ${cmd}`));
    if (r.stdout) out.append(pre(r.stdout, "cl-stdout"));
    if (r.stderr) out.append(pre(r.stderr, `cl-stderr s-${r.status}`));
    if (r.hint) out.append(el("p", "cl-hintline", `ヒント: ${r.hint}`));
    if (r.status === "ok" && !r.stdout) out.append(el("p", "cl-sys", "(出力なし・終了コード 0)"));
    if (r.status !== "ok") out.append(el("p", "cl-sys", `終了コード ${r.exit}`));
    r.changes.forEach((c) => out.append(el("p", "cl-change", `● 状態の変化: ${c}`)));
    out.scrollTop = out.scrollHeight;
    ta.value = ""; cur.value = ""; saveDraft(q.id, ""); fit();
    gradeCli();
  }
  const run = runBar("▶ 実行", exec);
  const clear = button("表示をクリア", "cl-tool", () => out.replaceChildren());
  const reset = button("環境をリセット", "cl-tool", () => { if (!confirm("模擬環境を初期状態に戻し、実行履歴を消します。よろしいですか?")) return; cur.session = newSession(q.editor.env); out.replaceChildren(el("p", "cl-sys", "# 環境を初期状態に戻しました")); cur.result = null; renderResult(); });
  const supported = el("details", "cl-supported");
  supported.append(el("summary", "", "この環境で使えるコマンド"), el("p", "", SUPPORTED_COMMANDS.join(" / ")));
  line.append(ps, ta);
  term.append(out, line);
  p.append(el("div", "cl-filetab cl-term-tab", "ターミナル(模擬)"), toolbar(run, clear, reset, ...fontButtons(p), expandButton()), term, symbolBar({ insert: (s, back) => { const st = ta.selectionStart; ta.setRangeText(s, st, ta.selectionEnd, "end"); if (back) ta.selectionStart = ta.selectionEnd = ta.selectionStart - back; ta.focus(); ta.dispatchEvent(new Event("input")); } }, [["--", 0], ["''", 1, "' '"], ['""', 1, '" "'], ["=", 0], [",", 0], ["[]", 1, "[ ]"], ["*", 0], ["s3://", 0]]), supported, secretWarning(), el("p", "cl-note", "Enter で実行、Shift + Enter で改行、↑↓ で履歴。オプションの順序や引用符の違いは結果に影響しません。"));
  requestAnimationFrame(fit);
}

/* ----- API リクエスト ----- */
function renderApiForm(p) {
  const { q } = cur;
  const v = cur.value;
  const form = el("div", "cl-api");
  const row = el("div", "cl-api-line");
  const method = el("select", "cl-method");
  ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].forEach((m) => { const o = el("option", "", m); o.value = m; method.append(o); });
  method.value = v.method || "GET";
  method.setAttribute("aria-label", "HTTP メソッド");
  const url = el("input", "cl-url");
  url.type = "text";
  url.value = v.url || "";
  url.spellcheck = false;
  url.setAttribute("aria-label", "URL(エンドポイント)");
  url.setAttribute("autocapitalize", "off");
  row.append(method, url);
  const hLabel = el("label", "cl-api-label", "Headers(1 行に「名前: 値」)");
  const headers = codeEditor({ value: v.headers || "", lang: "headers", label: "リクエストヘッダー", rows: 5, onRun: () => send() });
  const bLabel = el("label", "cl-api-label", "Body");
  const body = codeEditor({ value: v.body || "", lang: "json", label: "リクエスト本文", rows: 9, onRun: () => send() });
  const sync = () => { cur.value = { method: method.value, url: url.value, headers: headers.ta.value, body: body.ta.value }; saveDraft(q.id, cur.value); };
  [method, url, headers.ta, body.ta].forEach((x) => x.addEventListener("input", sync));
  method.addEventListener("change", sync);
  url.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); send(); } });
  // 模擬署名
  const signers = Object.keys(q.editor.env.signers || {});
  const sig = el("div", "cl-sig");
  const who = el("select");
  who.setAttribute("aria-label", "模擬署名の主体");
  signers.forEach((s) => { const o = el("option", "", s); o.value = s; who.append(o); });
  const addSig = button("模擬署名を付ける", "cl-tool", () => {
    let u;
    try { u = new URL(url.value); } catch { toast("先に URL を入力してください"); return; }
    const m = /^(?:[a-z0-9.-]+\.)?([a-z0-9-]+)\.([a-z0-9-]+)\.amazonaws\.com$/.exec(u.hostname);
    const service = u.hostname.includes(".execute-api.") ? "execute-api" : u.hostname.includes(".s3.") ? "s3" : m ? m[1] : "execute-api";
    const region = /\.([a-z]{2}-[a-z]+-\d)\.amazonaws\.com$/.exec(u.hostname)?.[1] || "ap-northeast-1";
    const kept = headers.ta.value.split("\n").filter((l) => !/^\s*(authorization|x-amz-date)\s*:/i.test(l) && l.trim());
    headers.set([...kept, ...simulatedSignature(who.value, service, region).split("\n")].join("\n"));
    sync();
  });
  if (signers.length) sig.append(el("span", "", "署名(SigV4・模擬):"), who, addSig);
  const fmt = button("本文を整形", "cl-tool", () => { if (!body.ta.value.trim()) return; try { body.set(formatJson(body.ta.value)); sync(); } catch (e) { toast(`整形できません: ${e.line} 行 ${e.col} 列 ${e.message}`); } });
  const reset = button("リセット", "cl-tool", () => { if (!confirm("リクエストと模擬環境を初期状態に戻します。よろしいですか?")) return; const s = q.editor.starter; method.value = s.method; url.value = s.url; headers.set(s.headers); body.set(s.body); cur.session = newApiSession(q.editor.env); cur.result = null; dropDraft(q.id); sync(); renderResult(); });
  function send() {
    sync();
    const r = sendRequest(cur.session, cur.value);
    cur.lastApi = r;
    gradeApi();
  }
  const run = runBar("▶ 送信", send);
  form.append(row, sig, hLabel, headers.root, bLabel, body.root, symbolBar(body, [["{", 0], ["}", 0], ["[", 0], ["]", 0], ['""', 1, '" "'], [":", 0], [",", 0]]));
  p.append(el("div", "cl-filetab", "API リクエスト(模擬・外部へは送信しない)"), toolbar(run, fmt, reset, copyButton(() => `${cur.value.method} ${cur.value.url}\n${cur.value.headers}\n\n${cur.value.body}`), ...fontButtons(p), expandButton()), form, secretWarning(), el("p", "cl-note", "Ctrl + Enter で送信。署名はダミーで、実際の鍵は使いません。"));
}

/* ----- CloudFormation テンプレート ----- */
const YAML_SYMBOLS = [["!Ref ", 0], ["!GetAtt ", 0], ["!Sub \"\"", 1, "!Sub"], ["!If [, , ]", 6, "!If"], ["!Equals [, ]", 4, "!Equals"], ["- ", 0], [": ", 0], ["\"\"", 1, '" "'], ["[]", 1, "[ ]"], ["${AWS::StackName}", 0]];
function cfnVocab() {
  const keys = ["AWSTemplateFormatVersion", "Description", "Parameters", "Mappings", "Conditions", "Resources", "Outputs", "Type", "Properties", "DependsOn", "DeletionPolicy", "UpdateReplacePolicy", "Condition", "Default", "AllowedValues", "Value", "Export", "Name", "Retain", "Snapshot", "Delete", "AWS::StackName", "AWS::Region", "AWS::AccountId", "AWS::NoValue"];
  const props = Object.values(RESOURCE_SPECS).flatMap((x) => Object.keys(x.props));
  return [...new Set([...keys, ...Object.keys(RESOURCE_SPECS), ...props])];
}
function renderTemplateEditor(p) {
  const { q } = cur;
  const tab = el("div", "cl-filetab");
  tab.append(el("span", "cl-file", "template.yaml"), el("span", "cl-kind", "CloudFormation テンプレート(YAML / JSON)"), el("span", "cl-attach", `スタック名: ${q.editor.stackName || "lab-stack"}${q.editor.variants ? ` · 採点では ${Object.keys(q.editor.variants).join("・")} でもデプロイ` : ""}`));
  const ed = codeEditor({ value: cur.value, lang: "yaml", label: "CloudFormation テンプレート", rows: 20, onInput: (v) => { cur.value = v; saveDraft(q.id, v); }, onRun: () => runTemplate() });
  cur.ed = ed;
  const reset = button("リセット", "cl-tool", () => { if (!confirm("入力を初期状態に戻します。よろしいですか?")) return; ed.set(q.editor.starter); cur.value = q.editor.starter; dropDraft(q.id); });
  const run = runBar("▶ 模擬デプロイ", () => runTemplate());
  p.append(tab, toolbar(run, reset, copyButton(() => ed.ta.value), ...fontButtons(p), expandButton()), ed.root, suggestBar(ed, cfnVocab()), symbolBar(ed, YAML_SYMBOLS), secretWarning(), el("p", "cl-note", "模擬デプロイは、テンプレートの検証・組み込み関数の解決・作成順序の計算をブラウザの中で行います(実際の AWS には作成しません)。字下げはスペース 2 つ。Tab でも字下げできます。"));
}
function renderTemplateRead(p) {
  const { q } = cur;
  const tab = el("div", "cl-filetab");
  tab.append(el("span", "cl-file", "template.yaml(読み取り専用)"), el("span", "cl-kind", "CloudFormation テンプレート"));
  const ed = codeEditor({ value: q.code, readOnly: true, lang: "yaml", label: "読み取り専用のテンプレート", rows: 20 });
  // 模擬デプロイ(パラメーターを選べる)
  const opts = [["既定値", {}], ...Object.entries(q.deployParams || {}).map(([k, v]) => [Object.entries(v).map(([a, b]) => `${a}=${b}`).join("・") || k, v])];
  const pick = el("select");
  pick.setAttribute("aria-label", "模擬デプロイのパラメーター");
  opts.forEach(([label], i) => { const o = el("option", "", label); o.value = String(i); pick.append(o); });
  const preview = button("▶ 模擬デプロイ", "cl-tool", () => {
    const [label, params] = opts[Number(pick.value)];
    cur.preview = { stack: deployTemplate(q.code, { params, stackName: "lab-stack" }), label };
    renderResult();
    setTab("result");
  });
  const dep = el("div", "cl-sig");
  dep.append(el("span", "", "パラメーター:"), pick, preview);
  const form = el("form", "cl-choices");
  const fs = el("fieldset");
  fs.append(el("legend", "", q.multi ? "当てはまるものをすべて選ぶ" : "1 つ選ぶ"));
  q.choices.forEach((c, i) => {
    const l = el("label", "cl-choice");
    const inp = el("input");
    inp.type = q.multi ? "checkbox" : "radio";
    inp.name = "c";
    inp.value = String(i);
    l.append(inp, el("span", "", c.text));
    fs.append(l);
  });
  const submit = button("回答する", "primary cl-run", () => answerRead(form));
  cur.mbar.replaceChildren(button("回答する", "primary", () => answerRead(form)), button("ヒント", "", () => showHint()), button("結果", "", () => setTab("result")));
  form.addEventListener("submit", (e) => { e.preventDefault(); answerRead(form); });
  form.append(fs, submit);
  p.append(tab, toolbar(copyButton(() => q.code), ...fontButtons(p), expandButton()), ed.root, dep, form);
}

/* ---------- 採点と記録 ---------- */
function record(pass) {
  const x = rec(cur.q.id);
  x.attempts++;
  x.lastRun = new Date().toISOString();
  x.lastResult = pass ? "pass" : "fail";
  if (pass && !x.cleared) { x.cleared = true; x.clearedAt = x.lastRun; toast("クリア! 解説で理由を確かめましょう"); }
  saveProgress();
}
function runPolicy() {
  const { q } = cur;
  const res = gradePolicy(q, cur.ed.ta.value, iamEnv(q));
  cur.result = res;
  if (res.syntax) cur.ed.markLine(res.syntax.line);
  else cur.ed.markLines((res.issues || []).filter((i) => i.line));
  if (res.status !== "unsupported") record(res.status === "pass");
  renderResult();
  setTab("result");
}
function runTemplate() {
  const { q } = cur;
  const res = gradeTemplate(q, cur.ed.ta.value);
  cur.result = res;
  const st = res.stack;
  if (st.syntax) cur.ed.markLine(st.syntax.line);
  else cur.ed.markLines([...(st.errors || []).map((e) => ({ line: e.line, level: "error", msg: e.msg })), ...(st.warnings || []).map((w) => ({ line: w.line, level: "warning", msg: w.msg }))]);
  if (res.status !== "unsupported") record(res.status === "pass");
  renderResult();
  setTab("result");
}
function answerRead(form) {
  const picked = [...form.querySelectorAll("input:checked")].map((x) => Number(x.value));
  if (!picked.length) { toast("選択肢を選んでください"); return; }
  const res = gradeChoice(cur.q, picked);
  cur.result = res;
  record(res.status === "correct");
  form.querySelectorAll(".cl-choice").forEach((l, i) => { l.classList.toggle("is-correct", res.correct.includes(i)); l.classList.toggle("is-wrong", picked.includes(i) && !res.correct.includes(i)); });
  renderResult();
  setTab("result");
}
function gradeCli() {
  const res = gradeGoals(cur.q, cur.session);
  const was = cur.result?.status;
  cur.result = res;
  if (res.status !== "unsupported" && !(was === "pass" && res.status === "pass")) record(res.status === "pass");
  renderResult();
  if (res.status === "pass" && was !== "pass") setTab("result");
}
function gradeApi() {
  const res = gradeGoals(cur.q, cur.session);
  cur.result = res;
  if (cur.lastApi?.status === "ok" || cur.lastApi?.status === "unsupported") { if (res.status !== "unsupported") record(res.status === "pass"); }
  renderResult();
  setTab("result");
}

/* ----- 右: 結果 ----- */
function statusBanner(key, extra) {
  const s = STATUS[key];
  const b = el("div", `cl-status t-${s.tone}`);
  b.append(el("strong", "", s.label), el("span", "", extra || s.note));
  return b;
}
function renderResult() {
  const { q, result } = cur;
  const p = cur.panes.result;
  const head = el("div", "cl-res-head");
  head.append(el("h2", "", "結果"), el("span", "cl-sim-badge", "模擬評価"));
  const kids = [head];
  const x = rec(q.id);
  if (x.attempts) kids.push(el("p", "cl-stats", `試行 ${x.attempts} 回 · ヒント ${x.hints} 回${x.cleared ? ` · クリア済み(${(x.clearedAt || "").slice(0, 10)})` : ""}`));
  if (!result) {
    kids.push(statusBanner("idle", q.mode === "read" ? "コードを読み、選択肢に回答してください" : q.category === "iam" ? "ポリシーを書いて「テスト実行」" : q.category === "cfn" ? "テンプレートを書いて「模擬デプロイ」" : q.category === "cli" ? "コマンドを入力して実行してください" : "リクエストを組み立てて「送信」"));
    if (q.category === "cli" || q.category === "api") kids.push(goalList(q.goals.map((g) => ({ label: g.label, ok: false }))));
    if (q.category === "cfn" && q.checks) kids.push(goalList(q.checks.map((c) => ({ label: c.label + (c.security ? "(安全性)" : ""), ok: false }))));
    if (q.category === "cfn" && q.mode === "read" && cur.preview) kids.push(...deployView(cur.preview.stack, cur.preview.label));
  } else if (q.category === "cfn" && q.mode === "read") kids.push(...readResult(), ...(cur.preview ? deployView(cur.preview.stack, cur.preview.label) : []));
  else if (q.category === "cfn") kids.push(...templateResult());
  else if (q.category === "iam" && q.mode === "read") kids.push(...readResult());
  else if (q.category === "iam") kids.push(...policyResult());
  else if (q.category === "cli") kids.push(...cliResult());
  else kids.push(...apiResult());
  // 解説(クリア後は自動で表示。それ以前はボタンで)
  const done = x.cleared || cur.result?.status === "pass" || cur.result?.status === "correct";
  if (cur.revealed || (done && cur.result)) kids.push(explanation());
  if (done && cur.result) { const nx = nextOnRoadmap(q.id); if (nx) kids.push(link(`ロードマップの次の問題: ${nx.title} →`, `#command-lab/${nx.id}`, "cl-next")); }
  else if (cur.result) kids.push(button("解説と模範解答を見る(答えが表示されます)", "cl-reveal", () => { if (!x.cleared && !confirm("模範解答が表示されます。自分で解く前に見てもよいですか?")) return; cur.revealed = true; const r2 = rec(q.id); if (!r2.cleared) { r2.sawModel = true; saveProgress(); } renderResult(); }));
  kids.push(el("p", "cl-disclaimer", "模擬評価: 定義済みの仮想環境と対応範囲のルールだけで判定しています。現実の AWS での許可判定・動作を完全には保証しません。"));
  p.replaceChildren(...kids);
}
function goalList(goals) {
  const ul = el("ul", "cl-goals");
  goals.forEach((g) => { const li = el("li", g.ok ? "ok" : "ng"); li.append(el("span", "cl-mark", g.ok ? "✓" : "○"), el("span", "", g.label + (g.note ? `(${g.note})` : ""))); ul.append(li); });
  return section("達成条件のチェック", ul);
}
function caseTable(cases, showExpect = true) {
  const wrap = el("div", "cl-cases");
  cases.forEach((c) => {
    const d = el("details", `cl-case ${c.unsupported ? "un" : c.pass ? "ok" : c.overGrant ? "over" : "ng"}`);
    const s = el("summary");
    s.append(el("span", "cl-mark", c.unsupported ? "?" : c.pass ? "✓" : "✗"), el("span", "cl-case-l", c.label));
    const got = el("span", `cl-dec d-${c.got}`, DECISION_LABEL[c.got] || c.got);
    s.append(got);
    const body = el("div", "cl-case-b");
    const dl = el("dl");
    const row = (k, v) => dl.append(el("dt", "", k), el("dd", "", v));
    row("主体", c.principalLabel || "");
    row("操作", c.action);
    row("対象", c.resource);
    if (c.context && Object.keys(c.context).length) row("条件キー", Object.entries(c.context).map(([k, v]) => `${k}=${v}`).join(", "));
    if (showExpect) row("期待", EXPECT_LABEL[c.expect] || c.expect);
    row("判定の理由", c.reason);
    body.append(dl, traceList(c.trace));
    if (c.overGrant) body.append(el("p", "cl-warn", "許可してはいけない操作を許可しています(過剰な許可)。"));
    if (showExpect && !c.pass && !c.unsupported) body.append(el("p", "cl-tip", `ヒント: ${c.tip || caseTip(c)}`));
    d.append(s, body);
    wrap.append(d);
  });
  return wrap;
}
/** 不合格のケースの、汎用の見直しポイント(問題ごとの tip があればそちらを使う) */
function caseTip(c) {
  const allowBy = (c.trace || []).filter((t) => /Allow が一致/.test(t.result)).map((t) => t.result.replace(/^Allow が一致: /, "")).join("、");
  if (c.overGrant) return `${allowBy ? `${allowBy} がこの要求にも一致しています。` : ""}Action・Resource を必要な範囲に絞るか、Condition で条件を付けましょう。`;
  if (c.got === "explicit-deny") return "明示的な Deny が一致しています。Deny の条件や対象が広すぎないか(例外にすべき主体・操作が含まれていないか)を確かめましょう。";
  if (c.expect === "allow") return "この要求に一致する Allow がありません。評価フローで、Action・Resource・Principal・Condition のどれが一致しなかったかを確かめましょう。";
  if (c.expect === "explicit-deny") return "この要求は明示的な Deny で拒否されるべきです(暗黙的な拒否ではなく)。Deny のステートメントで条件に合わない要求を拒否しましょう。";
  return "期待と違う判定です。評価フローの各段階を確かめましょう。";
}
function traceList(trace = []) {
  const ol = el("ol", "cl-trace");
  trace.forEach((t) => { const li = el("li", t.decisive ? "decisive" : ""); li.append(el("b", "", t.step), el("span", "", t.result)); ol.append(li); });
  return ol;
}
function issueList(issues) {
  if (!issues?.length) return null;
  const ul = el("ul", "cl-issues");
  const L = { error: "設定のエラー", warning: "注意", security: "セキュリティ警告" };
  issues.forEach((i) => {
    const li = el("li", `lv-${i.level}`);
    li.append(el("b", "", L[i.level]), el("span", "", i.msg));
    if (i.line && cur?.ed) li.append(button(`${i.line} 行へ`, "cl-goto", () => { setTab("work"); cur.ed.goto(i.line); }));
    ul.append(li);
  });
  return section("ポリシーのチェック(行番号の印と対応)", ul);
}
function policyResult() {
  const r = cur.result;
  const out = [];
  if (r.status === "syntax") {
    out.push(statusBanner("syntax"));
    const box = el("div", "cl-syntax");
    box.append(el("b", "", `${r.syntax.line} 行 ${r.syntax.col} 列: ${r.syntax.message}`));
    if (r.syntax.hint) box.append(el("p", "", r.syntax.hint));
    box.append(button("その位置へ移動", "cl-tool", () => { setTab("work"); cur.ed.goto(r.syntax.line, r.syntax.col); }));
    out.push(box);
    return out;
  }
  const pass = r.cases.filter((c) => c.pass).length;
  const over = r.cases.filter((c) => c.overGrant).length;
  out.push(statusBanner(r.status, r.status === "config" && !r.cases.length ? "ポリシーとして成り立たない箇所があります(下のチェックを参照)" : r.status === "security" ? `許可してはいけない操作を ${over} 件許可しています` : undefined));
  if (r.cases.length) out.push(el("p", "cl-score", `検証ケース ${pass} / ${r.cases.length} 合格${over ? ` · 過剰な許可 ${over} 件` : ""}`));
  const iss = issueList(r.issues);
  if (iss) out.push(iss);
  if (r.cases.length) out.push(section("検証ケース(行を開くと評価フロー)", caseTable(r.cases)));
  return out;
}
function readResult() {
  const { q, result } = cur;
  const out = [statusBanner(result.status)];
  const ul = el("ul", "cl-why");
  q.choices.forEach((c, i) => { const li = el("li", c.correct ? "ok" : result.picked.includes(i) ? "ng" : ""); li.append(el("span", "cl-mark", c.correct ? "✓" : result.picked.includes(i) ? "✗" : "・"), el("span", "", `${c.text} — ${c.why}`)); ul.append(li); });
  out.push(section("選択肢の解説", ul));
  if (q.category === "cfn") return out;
  const doc = JSON.parse(q.code);
  const cases = q.tests.map((t) => { const e = evaluate({ ...t }, readPolicies(q, doc)); return { ...t, got: e.decision, reason: e.reason, trace: e.trace, principalLabel: e.principal.label, pass: true }; });
  out.push(section("模擬評価で確かめる", caseTable(cases.map((c) => ({ ...c, pass: true })), false)));
  return out;
}
function cliResult() {
  const { result, session } = cur;
  const last = session.history.at(-1);
  const out = [statusBanner(result.status, result.status === "config" ? "まだ達成していない条件があります" : undefined), goalList(result.goals)];
  if (last) {
    const lastSec = el("div", "cl-last");
    lastSec.append(el("p", "cl-lastcmd", `$ ${last.line}`));
    const st = { ok: "成功(終了コード 0)", error: `AWS のエラー: ${last.code}(終了コード ${last.exit})`, usage: `入力の誤り(終了コード ${last.exit})`, unsupported: "学習用環境では未対応" }[last.status];
    lastSec.append(el("p", `cl-laststat s-${last.status}`, st));
    if (last.call) lastSec.append(el("p", "cl-call", `呼び出した API: ${last.call.service} ${last.call.op}(リージョン ${last.call.region})`));
    if (last.hint) lastSec.append(el("p", "cl-hintline", last.hint));
    out.push(section("直前のコマンド", lastSec));
    if (last.checks.length) out.push(section("権限の確認(IAM の模擬評価)", ...last.checks.map((c) => { const d = el("div", "cl-check"); d.append(el("p", "", `${c.action} on ${c.resource}`), el("p", `cl-dec d-${c.decision}`, `${DECISION_LABEL[c.decision]} — ${c.reason}`), traceList(c.trace)); return d; })));
    if (last.changes.length) out.push(section("状態の変化", list(last.changes)));
  }
  return out;
}
function apiResult() {
  const { result } = cur;
  const r = cur.lastApi;
  const out = [statusBanner(r?.status === "unsupported" ? "unsupported" : result.status, r?.status === "secret" ? "認証情報らしい文字列を検出したため送信しませんでした" : r?.status === "input" ? "リクエストの形式に誤りがあります" : result.status === "config" ? "まだ達成していない条件があります" : undefined), goalList(result.goals)];
  if (!r) return out;
  if (r.problems?.length) out.push(section("入力の確認", list(r.problems, "cl-problems")));
  if (r.response) {
    const res = el("div", "cl-response");
    res.append(el("p", `cl-statusline c${String(r.response.status)[0]}`, `HTTP/1.1 ${r.response.status} ${r.response.statusText}`));
    const hs = Object.entries(r.response.headers || {}).map(([k, v]) => `${k}: ${v}`).join("\n");
    if (hs) res.append(pre(hs, "cl-headers"));
    if (r.response.body) res.append(pre(r.response.body, "cl-body"));
    out.push(section("レスポンス(模擬)", res));
  }
  if (r.flow?.length) {
    const ol = el("ol", "cl-flow");
    r.flow.forEach((f) => { const li = el("li", f.ok ? "ok" : "ng"); li.append(el("span", "cl-mark", f.ok ? "✓" : "✗"), el("b", "", f.step), el("span", "", f.result)); if (f.trace) li.append(traceList(f.trace)); ol.append(li); });
    out.push(section("評価フロー(認可の処理の流れ)", ol));
  }
  return out;
}

function templateResult() {
  const r = cur.result;
  const st = r.stack;
  const out = [];
  if (r.status === "syntax") {
    out.push(statusBanner("syntax", "テンプレートを解析できません"));
    const box = el("div", "cl-syntax");
    box.append(el("b", "", `${st.syntax.line} 行 ${st.syntax.col} 列: ${st.syntax.message}`));
    if (st.syntax.hint) box.append(el("p", "", st.syntax.hint));
    box.append(button("その位置へ移動", "cl-tool", () => { setTab("work"); cur.ed.goto(st.syntax.line, st.syntax.col); }));
    out.push(box);
    return out;
  }
  const failed = r.checks.filter((c) => !c.ok);
  out.push(statusBanner(r.status, r.status === "config" && st.errors.length ? `テンプレートのエラー ${st.errors.length} 件(スタックの作成に失敗します)` : r.status === "security" ? "安全性のチェックを満たしていません" : r.status === "config" ? `満たしていないチェックが ${failed.length} 件あります` : r.status === "unsupported" ? "対応範囲外の要素があるため、模擬デプロイできません" : undefined));
  if (st.errors.length) {
    const ul = el("ul", "cl-issues");
    st.errors.forEach((e) => { const li = el("li", "lv-error"); li.append(el("b", "", "エラー"), el("span", "", e.msg)); if (e.line) li.append(button(`${e.line} 行へ`, "cl-goto", () => { setTab("work"); cur.ed.goto(e.line); })); ul.append(li); });
    out.push(section("テンプレートのエラー(直したら再実行。次の段階のエラーが出ることもあります)", ul));
  }
  if (st.unsupported.length) out.push(section("判定対象外", list(st.unsupported)));
  if (r.checks.length) out.push(section("構成のチェック", (() => { const ul = el("ul", "cl-goals"); r.checks.forEach((c) => { const li = el("li", c.ok ? "ok" : "ng"); li.append(el("span", "cl-mark", c.ok ? "✓" : c.security ? "!" : "○"), el("span", "", c.label + (c.security ? "(安全性)" : ""))); ul.append(li); }); return ul; })()));
  if (!st.errors.length && !st.unsupported.length) {
    out.push(...deployView(st, "既定のパラメーター"));
    for (const [name, v] of Object.entries(st.variants || {})) {
      const d = el("details", "cl-variant");
      d.append(el("summary", "", `別の条件でのデプロイ: ${name}(作成 ${v.order.length} 件${v.skipped?.length ? `・条件で省略 ${v.skipped.join("、")}` : ""})`), ...deployView(v, name, true));
      out.push(d);
    }
  }
  return out;
}
/** 模擬デプロイの結果(作成の順序・リソース・出力) */
function deployView(st, label, compact = false) {
  const out = [];
  if (st.syntax || st.errors?.length) {
    const ul = el("ul", "cl-issues");
    if (st.syntax) ul.append(el("li", "lv-error", `${st.syntax.line} 行 ${st.syntax.col} 列: ${st.syntax.message}`));
    (st.errors || []).forEach((e) => ul.append(el("li", "lv-error", `${e.line ? `${e.line} 行: ` : ""}${e.msg}`)));
    out.push(section(`模擬デプロイ(${label}): 失敗`, ul));
    return out;
  }
  const flow = el("ol", "cl-order");
  st.order.forEach((lid) => { const r = st.resources[lid]; const li = el("li"); li.append(el("b", "", lid), el("span", "", r.type), r.dependsOn.length ? el("small", "", `← ${r.dependsOn.join("、")} の後`) : el("small", "", "依存なし")); flow.append(li); });
  const sec = section(`模擬デプロイ(${label}): 作成の順序`, flow);
  if (st.skipped?.length) sec.append(el("p", "cl-note", `条件が偽のため作らないリソース: ${st.skipped.join("、")}`));
  if (Object.keys(st.conditions || {}).length) sec.append(el("p", "cl-note", `条件: ${Object.entries(st.conditions).map(([k, v]) => `${k} = ${v ? "真" : "偽"}`).join("、")}`));
  out.push(sec);
  if (compact) return out;
  const res = el("div", "cl-cases");
  st.order.forEach((lid) => {
    const r = st.resources[lid];
    const d = el("details", "cl-case");
    const sm = el("summary");
    sm.append(el("span", "cl-mark", "▸"), el("span", "cl-case-l", `${lid}(${r.type})`), el("span", "cl-dec", r.deletionPolicy !== "Delete" ? `削除時 ${r.deletionPolicy}` : ""));
    const body = el("div", "cl-case-b");
    const dl = el("dl");
    const row = (k, v) => dl.append(el("dt", "", k), el("dd", "", v));
    row("物理 ID(模擬)", String(r.physicalId));
    if (r.arn) row("ARN(模擬)", r.arn);
    row("DeletionPolicy", r.deletionPolicy);
    body.append(dl, pre(JSON.stringify(r.props, null, 2), "cl-props"));
    d.append(sm, body);
    res.append(d);
  });
  out.push(section("作成されるリソースと、解決されたプロパティ(行を開く)", res));
  if (Object.keys(st.outputs || {}).length) out.push(section("出力(Outputs)", list(Object.entries(st.outputs).map(([k, o]) => `${k} = ${typeof o.value === "string" ? o.value : JSON.stringify(o.value)}${o.export ? `(エクスポート名 ${o.export})` : ""}`))));
  if (st.warnings?.length) out.push(section("注意", list(st.warnings.map((w) => `${w.line ? `${w.line} 行: ` : ""}${w.msg}`))));
  return out;
}

/* ----- 解説 ①〜⑦ ----- */
function modelText(q) { return q.category === "api" ? reqText(q.model) : q.model; }
function reqText(v) { return `${v.method} ${v.url}\n${v.headers}${v.body ? `\n\n${v.body}` : ""}`; }
function explanation() {
  const { q } = cur;
  const box = el("div", "cl-explain");
  box.append(el("h2", "", "解説"));
  const step = (n, t, ...kids) => { const s = el("section", "cl-step"); s.append(el("h3", "", `${n} ${t}`), ...kids); box.append(s); };
  step("①", "要件", list(q.requirements || [q.scenario]));
  // ② 入力した設定
  if ((q.category === "iam" || q.category === "cfn") && q.mode !== "read") step("②", q.category === "cfn" ? "入力したテンプレート" : "入力した設定", pre(cur.ed.ta.value));
  else if (q.category === "cli") step("②", "実行したコマンド", pre(cur.session.history.map((h) => `$ ${h.line}`).join("\n") || "(まだ実行していません)"));
  else if (q.category === "api") step("②", "送信したリクエスト", pre(cur.session.history.length ? reqText(cur.session.history.at(-1).req) : "(まだ送信していません)"));
  else step("②", q.category === "cfn" ? "読んだテンプレート" : "読んだポリシー", pre(q.code));
  // ③ 具体的なリクエスト
  if (q.category === "iam") step("③", "具体的なリクエスト(検証ケース)", list(q.tests.map((t) => `${t.label} → ${EXPECT_LABEL[t.expect]}`)));
  else if (q.category === "cfn") { const st = q.mode === "read" ? deployTemplate(q.code, { stackName: "lab-stack" }) : cur.result?.stack; step("③", "作成されるリソース(順序)", el("p", "", st?.order?.length ? st.order.map((lid) => `${lid}(${st.resources[lid].type})`).join(" → ") : "(模擬デプロイがまだ成功していません)")); }
  else if (q.category === "cli") { const c = cur.session.history.filter((h) => h.call).at(-1); step("③", "呼び出された API", el("p", "", c ? `${c.call.service} ${c.call.op} → ${c.checks.map((k) => `${k.action}(${shortArn(k.resource)})`).join("、") || "権限の確認なし"}` : "—")); }
  else { const c = cur.session.history.at(-1); step("③", "API の呼び出し", el("p", "", c?.req ? `${c.req.method} ${c.req.url}` : "—")); }
  step("④", "評価フローの要点", el("p", "", q.explain.point));
  const x = rec(q.id);
  step("⑤", "結果", el("p", "", x.cleared ? `クリア(試行 ${x.attempts} 回・ヒント ${x.hints} 回)。ヒントの利用は採点に影響しません。` : "まだクリアしていません。解説を参考に再挑戦しましょう。"));
  const pit = el("div");
  pit.append(el("p", "", q.explain.compare));
  if (q.explain.pitfalls?.length) pit.append(el("h4", "", "よくある誤答"), list(q.explain.pitfalls));
  step("⑥", "他の設定との違い", pit);
  const refs = el("ul", "cl-refs");
  q.references.forEach((r) => { const li = el("li"); li.append(ext(r.title, r.url)); refs.append(li); });
  const svc = el("p", "cl-svc");
  q.services.forEach((id) => { const s = svcById.get(id); if (s) svc.append(link(`図鑑: ${s.name}`, `#services/${id}`, "cl-svc-link")); });
  step("⑦", "公式資料と関連", refs, svc, el("p", "cl-reviewed", `最終レビュー: ${q.reviewedAt} · 内容の版 ${q.contentVersion} · 公式資料と照合した独自教材(AWS 認定試験の問題ではありません)`));
  // 模範解答・差分
  if (q.model) {
    const m = el("details", "cl-model");
    m.append(el("summary", "", "模範解答(一つの例。等価な別解も正解)"));
    m.append(pre(modelText(q)));
    if ((q.category === "iam" || q.category === "cfn") && cur.ed && q.mode !== "read") {
      let mine = cur.ed.ta.value;
      if (q.category === "iam") try { mine = formatJson(mine); } catch { /* 構文エラーのときはそのまま */ }
      const diff = el("div", "cl-diff");
      diff.setAttribute("aria-label", "あなたの入力と模範解答の差分");
      lineDiff(mine, q.model).forEach((d) => diff.append(el("div", `dl-${d.t}`, `${d.t === "add" ? "+ " : d.t === "del" ? "− " : "  "}${d.line}`)));
      m.append(el("h4", "", "あなたの入力との差分(− あなた / + 模範解答)"), diff);
    }
    box.append(m);
  }
  return box;
}

/* ---------- ホームのカード・ルーティング ---------- */
function updateHome() {
  const s = labStats();
  const a = document.getElementById("lab-solved");
  const pg = document.getElementById("lab-progress");
  if (a) a.textContent = `${s.cleared} / ${s.total}`;
  if (pg) { pg.max = s.total; pg.value = s.cleared; }
  document.querySelectorAll("[data-lab-count]").forEach((x) => (x.textContent = String(s.total)));
}
updateHome();
window.addEventListener("route-change", (e) => {
  if (e.detail.page !== "command-lab") { cur = null; return; }
  const q = e.detail.id && labById.get(e.detail.id);
  if (e.detail.id && !q) { location.replace("#command-lab"); return; }
  if (q) renderProblem(q); else { cur = null; renderList(); }
});
