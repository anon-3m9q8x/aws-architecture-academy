// サービス図鑑: 一覧 → タップでサービスの解説ページへ。連携アニメーション・解説・連携・SAP 設計パターンを 1 ページに統合。
import { SERVICES, CATS, byId, relsOf, compsOf, metaOf, serviceCount, patternsOf, groupsOf, COMPARE } from "./services.js";
import { memo } from "./memo.js";
import { FlowPlayer, normalizeScene, serviceScene, problemScene } from "./flow.js";
import { BUILD } from "./data/build.js";
import { PATTERNS, EXERCISES, patternScene } from "./data/sap-patterns.js";
import { $, el, slider, store } from "./ui.js";

let scenes = [];
// 上部バーの高さ(スマホでは 2 段になる)を CSS 変数に反映し、固定表示のタブが上部バーの下に隠れないようにする
{
  const bar = document.querySelector(".topbar");
  const setH = () => document.documentElement.style.setProperty("--topbar-h", (bar?.offsetHeight || 82) + "px");
  setH();
  if (bar) new ResizeObserver(setH).observe(bar);
}
let player = null;
let mode = "list"; // list | patterns | compare | scenes
let cat = "all";
let query = "";
const host = $("services");

/* ---------- 共通部品 ---------- */
function glyph(s, big) {
  const g = el("span", `svc-glyph c-${s.color}${big ? " big" : ""}`, s.abbr);
  g.setAttribute("aria-hidden", "true");
  if (s.abbr.length > 3) g.classList.add("long");
  return g;
}

/* ---------- 一覧 ---------- */
const view = el("div", "ex-view");
const head = el("div", "page-heading ex-head");
const ht = el("div");
ht.append(el("p", "eyebrow", "SERVICE EXPLORER"), el("h1", "", "サービス図鑑"), el("p", "muted", `AWS の主要カテゴリを網羅した ${serviceCount} サービス。タップすると、連携アニメーションと詳しい解説へ移動します。`));
const modeSeg = el("div", "seg ex-mode");
modeSeg.setAttribute("role", "tablist");
for (const [v, t] of [["list", "サービス一覧"], ["compare", `類似サービス比較 ${COMPARE.length}`], ["patterns", `設計パターン ${PATTERNS.length}`], ["scenes", "連携シナリオ"]]) {
  const b = el("button", "seg-btn", t);
  b.type = "button";
  b.dataset.v = v;
  b.setAttribute("role", "tab");
  modeSeg.append(b);
}
head.append(ht, modeSeg);
const tools = el("div", "ex-tools");
const search = el("input");
search.type = "search";
search.placeholder = "サービス名・用途で検索(例: キュー、DNS、Kubernetes)";
search.setAttribute("aria-label", "サービスを検索");
const chips = el("div", "ex-cats");
chips.setAttribute("role", "group");
chips.setAttribute("aria-label", "カテゴリ");
const catCount = Object.fromEntries(CATS.map(([c]) => [c, SERVICES.filter((s) => s.cat === c).length]));
[["all", "すべて", SERVICES.length], ...CATS.filter(([c]) => catCount[c]).map(([c, col]) => [c, c, catCount[c], col])].forEach(([v, t, n, col]) => {
  const b = el("button", "ex-cat");
  b.type = "button";
  b.dataset.v = v;
  if (col) b.append(el("i", `dot c-${col}`));
  b.append(document.createTextNode(t), el("small", "", String(n)));
  chips.append(b);
});
tools.append(search, chips);
const countLine = el("p", "ex-count muted");
countLine.setAttribute("role", "status");
const grid = el("div", "ex-grid");
const sceneGrid = el("div", "ex-scenes");
const patGrid = el("div", "ex-patterns");
const cmpGrid = el("div", "cmp-grid");
// メモのバックアップ(旧・学習ノートの機能)
const backup = el("details", "panel memo-backup");
{
  backup.append(el("summary", "", "メモと学習済みのバックアップ"));
  const row = el("div", "memo-backup-row");
  const exp = el("button", "", "バックアップを保存 ↓");
  exp.type = "button";
  exp.addEventListener("click", () => memo.exportFile());
  const lab = el("label", "memo-import");
  const inp = el("input");
  inp.type = "file";
  inp.accept = "application/json,.json";
  lab.append(document.createTextNode("バックアップを取り込む "), inp);
  const st = el("span", "muted");
  st.setAttribute("role", "status");
  inp.addEventListener("change", async () => {
    const f = inp.files[0];
    if (!f) return;
    try {
      const n = await memo.importFile(f);
      st.textContent = `取り込みました(メモ ${n} 件)。既存のメモは残しています。`;
      renderList();
    } catch (e) {
      st.textContent = `取り込めませんでした:${e.message}`;
    } finally {
      inp.value = "";
    }
  });
  row.append(exp, lab, st);
  backup.append(row, el("p", "muted", "メモはこのブラウザにだけ保存されます。旧・学習ノートのメモもそのまま引き継いでいます。"));
}
view.append(head, tools, countLine, grid, cmpGrid, patGrid, sceneGrid, backup);
const detail = el("div", "ex-detail");
host.replaceChildren(view, detail);

const modeSlide = slider(modeSeg, ".seg-btn", (b) => b.dataset.v === mode);
const catSlide = slider(chips, ".ex-cat", (b) => b.dataset.v === cat);

function card(s) {
  const a = el("a", `ex-card c-${s.color}`);
  a.href = `#services/${s.id}`;
  const top = el("div", "ex-card-top");
  top.append(glyph(s), el("span", "ex-card-cat", s.cat));
  if (memo.isDone(s.id)) top.append(el("span", "ex-done", "✓ 学習済み"));
  else if (memo.get(s.id)) top.append(el("span", "ex-done memo", "✎ メモ"));
  a.append(top, el("h3", "", s.name), el("p", "", s.purpose || s.summary));
  const n = relsOf(s.id).length;
  const np = patternsOf(s.id).length;
  a.append(el("span", "ex-card-foot", `連携 ${n} 件${np ? `  ·  設計パターン ${np}` : ""}  ·  ▶ アニメーション`));
  return a;
}
function renderList() {
  modeSeg.querySelectorAll(".seg-btn").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.v === mode)));
  modeSlide();
  tools.hidden = mode !== "list";
  grid.hidden = mode !== "list";
  sceneGrid.hidden = mode !== "scenes";
  patGrid.hidden = mode !== "patterns";
  cmpGrid.hidden = mode !== "compare";
  if (mode === "compare") {
    countLine.textContent = `似ているサービスを ${COMPARE.length} のグループで比較。用途ごとにどれを選ぶか、得意なこと・選ばないときを整理しています(AWS Decision Guides を基に作成)。`;
    return;
  }
  if (mode === "scenes") {
    countLine.textContent = `${scenes.length} の連携シナリオ。複数サービスがつながる流れを、ステップごとに再生します。`;
    return;
  }
  if (mode === "patterns") {
    countLine.textContent = `SAP 正解構成図 90 枚から整理した ${PATTERNS.length} の設計パターン。接続の理由・成立条件・典型的な障害をまとめ、流れを再生できます。`;
    return;
  }
  chips.querySelectorAll(".ex-cat").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === cat)));
  catSlide();
  const q = query.trim().toLowerCase();
  const list = SERVICES.filter((s) => (cat === "all" || s.cat === cat) && (!q || [s.name, s.full, s.cat, s.purpose, s.summary, s.useCases, ...(s.features || []), ...(s.cues?.words || []), ...s.variants.map((v) => v[0])].join(" ").toLowerCase().includes(q)));
  countLine.textContent = `${list.length} 件${list.length ? "" : " — キーワードやカテゴリを変えてみてください。"}`;
  grid.replaceChildren(...list.map(card));
}
modeSeg.addEventListener("click", (e) => {
  const b = e.target.closest(".seg-btn");
  if (!b) return;
  mode = b.dataset.v;
  store.set("aaa.ex.mode", mode);
  renderList();
});
chips.addEventListener("click", (e) => {
  const b = e.target.closest(".ex-cat");
  if (!b) return;
  cat = b.dataset.v;
  renderList();
});
search.addEventListener("input", () => {
  query = search.value;
  renderList();
});
mode = ["scenes", "patterns", "compare"].includes(store.get("aaa.ex.mode", "list")) ? store.get("aaa.ex.mode", "list") : "list";
window.addEventListener("explorer-search", (e) => {
  mode = "list";
  cat = "all";
  query = search.value = e.detail || "";
  renderList();
});

function renderScenes() {
  sceneGrid.replaceChildren(
    ...scenes.map((sc, i) => {
      const a = el("a", "ex-scene");
      a.href = `#services/scene:${sc.id}`;
      const svcs = [...new Set(sc.nodes.map((n) => n.svc).filter((x) => x && byId.has(x)))];
      const row = el("div", "ex-scene-svcs");
      svcs.slice(0, 5).forEach((id) => row.append(glyph(byId.get(id))));
      a.append(el("span", "ex-scene-n", String(i + 1).padStart(2, "0")), el("h3", "", sc.title), el("p", "", sc.objective || ""), row);
      return a;
    }),
  );
}

function chain(p, small) {
  const row = el("div", `pt-chain${small ? " small" : ""}`);
  const seen = new Set();
  p.n.forEach(([id, label], i) => {
    const sv = byId.get(id);
    if (seen.has(id + label)) return;
    seen.add(id + label);
    if (row.children.length) row.append(el("i", "pt-arrow", "→"));
    const c = el("span", `pt-node c-${sv?.color || "gray"}`);
    if (sv) c.append(glyph(sv));
    c.append(el("span", "", small ? (sv?.name || label) : label));
    row.append(c);
  });
  return row;
}
function renderPatterns() {
  const groups = new Map();
  PATTERNS.forEach((p) => groups.set(p.f, [...(groups.get(p.f) || []), p]));
  const out = [];
  groups.forEach((list, f) => {
    const g = el("section", "pt-group");
    g.append(el("h2", "pt-group-h", `${f}  ·  ${list.length}`));
    const wrap = el("div", "pt-cards");
    list.forEach((p) => {
      const a = el("a", "pt-card");
      a.href = `#services/pattern:${p.id}`;
      const top = el("div", "pt-card-top");
      top.append(el("b", "pt-id", p.id), el("span", "muted", `構成図 ${p.d.length} 枚`));
      a.append(top, el("h3", "", p.t), chain(p, true), el("p", "", p.why));
      wrap.append(a);
    });
    g.append(wrap);
    out.push(g);
  });
  patGrid.replaceChildren(...out);
}
renderPatterns();
function patternFacts(p, opts = {}) {
  const box = el("div", "pt-facts");
  for (const [k, t, cls] of [["why", "採用理由", "tip"], ["need", "成立条件(設定・権限・経路)", ""], ["fail", "典型的な障害・検証事項", "warn"], ["trap", "混同しやすい点", "warn"]]) {
    if (!p[k]) continue;
    const b = el("div", `ex-box ${cls}`);
    b.append(el("h3", "", t), el("p", "", p[k]));
    box.append(b);
  }
  if (opts.full) {
    const ex = el("div", "ex-box wide");
    ex.append(el("h3", "", "関連演習で問われること"));
    const ul = el("ul", "pt-ex");
    p.ex.forEach((id) => {
      const e = EXERCISES[id];
      if (!e) return;
      const li = el("li");
      li.append(el("b", `pt-ex-id ${id[0] === "S" ? "sim" : "ts"}`, id), el("span", "", e[0]), el("small", "", e[1]));
      ul.append(li);
    });
    ex.append(ul, el("p", "muted pt-src", `参照構成図: ${p.d.map((x) => "SAP-" + x).join(" / ")}  ·  S = 構成シミュレーション / T = トラブルシューティング`));
    box.append(ex);
  }
  return box;
}
function buildsFor(ids) {
  return BUILD.filter((pb) => pb.pattern && ids.some((x) => pb.pattern.includes(x)));
}

/* ---------- 類似サービス比較 ---------- */
function compareBlock(g, hl, compact) {
  const box = el("section", "panel cmp-block");
  const h = el("div", "cmp-head");
  const t = el("a", "cmp-title", g.title);
  t.href = `#services/compare:${g.id}`;
  h.append(t);
  if (g.ref) {
    const r = el("a", "cmp-ref", "Decision Guide ↗");
    r.href = g.ref;
    r.target = "_blank";
    r.rel = "noopener noreferrer";
    h.append(r);
  }
  box.append(h, el("p", "muted cmp-intro", g.intro));
  // 各サービスの得意なこと / 選ばないとき
  const tbl = el("div", "cmp-table");
  const hd = el("div", "cmp-row cmp-th");
  hd.append(el("span", "", "サービス"), el("span", "", "得意なこと・向いている用途"), el("span", "", "選ばないとき・注意"));
  tbl.append(hd);
  Object.entries(g.pts).forEach(([id, [good, bad]]) => {
    const sv = byId.get(id);
    const row = el("div", `cmp-row${id === hl ? " hl" : ""}`);
    const n = el("a", "ex-rel-name");
    n.href = `#services/${id}`;
    n.append(glyph(sv), el("b", "", sv.name));
    row.append(n, el("span", "cmp-good", good), el("span", "cmp-bad", bad));
    tbl.append(row);
  });
  box.append(tbl);
  // 用途 → 選ぶサービス
  const cs = el("div", "cmp-cases");
  cs.append(el("h3", "", "用途ごとに選ぶなら"));
  g.cases.forEach(([use, id, why]) => {
    const sv = byId.get(id);
    const row = el("div", `cmp-case${id === hl ? " hl" : ""}`);
    const n = el("a", "ex-rel-name");
    n.href = `#services/${id}`;
    n.append(glyph(sv), el("b", "", sv.name));
    row.append(el("span", "cmp-use", use), el("i", "pt-arrow", "→"), n, el("small", "muted", why));
    cs.append(row);
  });
  box.append(cs);
  if (compact && hl) box.classList.add("compact");
  return box;
}
function renderCompareGrid() {
  cmpGrid.replaceChildren(
    ...COMPARE.map((g) => {
      const a = el("a", "pt-card cmp-card");
      a.href = `#services/compare:${g.id}`;
      const row = el("div", "ex-scene-svcs");
      Object.keys(g.pts).slice(0, 8).forEach((id) => row.append(glyph(byId.get(id))));
      a.append(el("h3", "", g.title), el("p", "", g.intro), row, el("span", "muted", `${Object.keys(g.pts).length} サービス · 用途 ${g.cases.length} 件`));
      return a;
    }),
  );
}
renderCompareGrid();
function openCompare(g) {
  player?.destroy();
  player = null;
  view.hidden = true;
  detail.hidden = false;
  detail._spy?.disconnect();
  const back = el("a", "ex-back", "← 類似サービス比較の一覧へ");
  back.href = "#services";
  back.addEventListener("click", () => { mode = "compare"; store.set("aaa.ex.mode", mode); });
  const i = COMPARE.indexOf(g);
  const pn = el("nav", "ex-pn");
  for (const [o, lab] of [[COMPARE[i - 1], "前の比較"], [COMPARE[i + 1], "次の比較"]]) {
    if (!o) { pn.append(el("span")); continue; }
    const a = el("a", "ex-pn-a");
    a.href = `#services/compare:${o.id}`;
    a.append(el("small", "", lab), el("b", "", o.title));
    pn.append(a);
  }
  const hero = el("header", "ex-hero c-teal");
  const t = el("div");
  t.append(el("p", "eyebrow", "類似サービス比較"), el("h1", "", g.title));
  hero.append(t);
  detail.replaceChildren(back, hero, compareBlock(g, null, false), el("p", "study-notice", "AWS Decision Guides と各サービスのドキュメントを基にした学習用の整理です。要件によっては別の選択が正しい場合もあります。"), pn);
  detail.classList.remove("enter");
  void detail.offsetWidth;
  detail.classList.add("enter");
  window.scrollTo({ top: 0, behavior: "auto" });
  document.title = `${g.title} | 類似サービス比較 | AWS Architecture Academy`;
  $("page-label").textContent = `サービス図鑑 / ${g.title}`;
}

/* ---------- 詳細(サービスの解説ページ) ---------- */
function section(id, title, eyebrow) {
  const sec = el("section", "ex-sec");
  sec.id = `sec-${id}`;
  sec.dataset.sec = id;
  const h = el("div", "ex-sec-h");
  h.append(el("p", "eyebrow", eyebrow), el("h2", "", title));
  sec.append(h);
  return sec;
}
function animsFor(s) {
  const list = [];
  const rels = relsOf(s.id);
  if (rels.length) list.push({ key: "auto", label: `${s.name} の連携`, scene: () => serviceScene(s, rels, metaOf) });
  scenes.filter((sc) => sc.nodes.some((n) => n.svc === s.id)).forEach((sc) => list.push({ key: sc.id, label: sc.title, scene: () => sc }));
  patternsOf(s.id).forEach((p) => list.push({ key: "pt-" + p.id, label: `${p.id} ${p.t}`, scene: () => patternScene(p, metaOf), pattern: p }));
  BUILD.filter((pb) => Object.keys(pb.layout).includes(s.id)).forEach((pb) => list.push({ key: pb.id, label: `構築: ${pb.title}`, scene: () => problemScene(pb, metaOf), pb }));
  return list;
}
function openDetail(s) {
  const seen = store.get("aaa.ex.viewed", []);
  if (Array.isArray(seen) && !seen.includes(s.id)) {
    store.set("aaa.ex.viewed", [...seen, s.id]);
    window.dispatchEvent(new Event("learning-update"));
  }
  player?.destroy();
  player = null;
  view.hidden = true;
  detail.hidden = false;
  const idx = SERVICES.indexOf(s);
  const back = el("a", "ex-back", "← サービス図鑑へ戻る");
  back.href = "#services";
  // 見出し
  const hero = el("header", `ex-hero c-${s.color}`);
  const hl = el("div", "ex-hero-main");
  hl.append(glyph(s, true));
  const ttl = el("div");
  ttl.append(el("p", "eyebrow", s.cat), el("h1", "", s.name), el("p", "ex-full", s.full));
  hl.append(ttl);
  const sum = el("p", "ex-sum", s.summary);
  const links = el("div", "ex-hero-links");
  if (s.doc) {
    const d = el("a", "button", "AWS 公式ドキュメント ↗");
    d.href = s.doc;
    d.target = "_blank";
    d.rel = "noopener noreferrer";
    links.append(d);
  }
  const done = el("button", "button ghost ex-done-btn");
  done.type = "button";
  const paintDone = () => {
    const on = memo.isDone(s.id);
    done.textContent = on ? "✓ 学習済み" : "学習済みにする";
    done.setAttribute("aria-pressed", String(on));
  };
  paintDone();
  done.addEventListener("click", () => {
    memo.toggleDone(s.id);
    paintDone();
  });
  links.append(done);
  hero.append(hl, sum, links);
  // セクションの切り替えタブ(スクロール位置と連動してスライド)
  const tabs = el("nav", "ex-tabs");
  tabs.setAttribute("aria-label", "このページの内容");
  const pats = patternsOf(s.id);
  const groups = groupsOf(s.id);
  const comps = compsOf(s.id);
  const secs = [["anim", "アニメーション"], ["about", "解説"], ...(s.variants.length ? [["kinds", "種類・発展形"]] : []), ...(groups.length || comps.length ? [["similar", "類似サービス"]] : []), ["links", "連携"], ["design", "設計パターン"], ["memo", "メモ"]];
  secs.forEach(([k, t]) => {
    const a = el("a", "ex-tab", t);
    a.href = `#sec-${k}`;
    a.dataset.k = k;
    tabs.append(a);
  });
  let cur = "anim";
  const tabSlide = slider(tabs, ".ex-tab", (a) => a.dataset.k === cur);
  // タブのクリック: 選択を即座に確定し、スクロールが終わるまでスクロール連動を止める(途中のセクションで選択が揺れない)
  let lock = null; // { k, until }
  let picked = null; // クリックで選んだセクション(ページ末尾で基準線まで上がれない短いセクション用)
  // 基準線 = 固定表示されたタブの下端。タブがまだ固定位置に来ていない(ページ上部)ときも、固定後の位置で計算する
  const tabLine = () => {
    const top = parseFloat(getComputedStyle(tabs).top) || 0;
    return Math.max(top, 0) + tabs.offsetHeight + 16;
  };
  tabs.addEventListener("click", (e) => {
    const a = e.target.closest(".ex-tab");
    if (!a) return;
    e.preventDefault();
    const k = a.dataset.k;
    const target = document.getElementById(`sec-${k}`);
    if (!target) return;
    cur = k;
    tabSlide();
    // 見出しがタブの下にちょうど来る位置へ(固定ヘッダーとタブの高さは画面幅で変わるため毎回計算)
    const y = window.scrollY + target.getBoundingClientRect().top - (tabLine() - 4);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    lock = { k, until: performance.now() + (smooth ? 1500 : 100) };
    picked = k;
    window.scrollTo({ top: Math.max(0, Math.min(y, max)), behavior: smooth ? "smooth" : "auto" });
  });

  // 1. アニメーション
  const secA = section("anim", "連携アニメーション", "IN MOTION");
  const anims = animsFor(s);
  const pick = el("div", "ex-anims");
  pick.setAttribute("role", "tablist");
  let curAnim = anims[0]?.key;
  anims.forEach((a) => {
    const b = el("button", "ex-anim", a.label);
    b.type = "button";
    b.dataset.k = a.key;
    pick.append(b);
  });
  const animSlide = slider(pick, ".ex-anim", (b) => b.dataset.k === curAnim);
  const stage = el("div", "ex-player");
  const animNote = el("p", "muted ex-anim-note");
  secA.append(pick, stage, animNote);
  if (!anims.length) stage.append(el("p", "muted", "このサービスの連携アニメーションはまだありません。"));
  function loadAnim(k, auto) {
    const a = anims.find((x) => x.key === k);
    if (!a) return;
    curAnim = k;
    pick.querySelectorAll(".ex-anim").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.k === k)));
    animSlide();
    if (!player) player = new FlowPlayer(stage, { meta: metaOf, onNode: (id) => id !== s.id && byId.has(id) && (location.hash = `services/${id}`) });
    player.load(a.scene(), { autoplay: auto });
    animNote.textContent = a.key === "auto"
      ? "中央のサービスから連携先へ順にパケットが流れます。ノードをタップするとそのサービスの解説へ移動します。"
      : a.pb ? `構築問題「${a.pb.title}」の模範解答の動きです。`
      : a.pattern ? `SAP 設計パターン ${a.pattern.id}: ${a.pattern.why}` : (a.scene().rule || "");
  }
  pick.addEventListener("click", (e) => {
    const b = e.target.closest(".ex-anim");
    if (b) loadAnim(b.dataset.k, true);
  });

  // 2. 解説
  const secB = section("about", "サービスの解説", "OVERVIEW");
  const grid2 = el("div", "ex-about");
  const def = el("div", "ex-box wide");
  def.append(el("h3", "", "公式ドキュメントでの位置づけ"), el("p", "", s.summary));
  grid2.append(def);
  if (s.purpose) {
    const b = el("div", "ex-box");
    b.append(el("h3", "", "目的"), el("p", "", s.purpose));
    grid2.append(b);
  }
  if (s.useCases) {
    const b = el("div", "ex-box");
    b.append(el("h3", "", "使いどころ"), el("p", "", s.useCases));
    grid2.append(b);
  }
  if (s.features?.length) {
    const b = el("div", "ex-box");
    const ul = el("ul");
    s.features.forEach((f) => ul.append(el("li", "", f)));
    b.append(el("h3", "", "主な機能"), ul);
    grid2.append(b);
  }
  if (s.tip) {
    const b = el("div", "ex-box tip wide");
    b.append(el("h3", "", "試験・設計のポイント"), el("p", "", s.tip));
    grid2.append(b);
  }
  if (s.cues) {
    const b = el("div", "ex-box");
    const w = el("div", "ex-words");
    s.cues.words.forEach((x) => w.append(el("span", "ex-word", x)));
    b.append(el("h3", "", "問題文にこの言葉が出たら"), w);
    grid2.append(b);
    if (s.cues.not) {
      const n = el("div", "ex-box warn");
      n.append(el("h3", "", "選ばないとき"), el("p", "", s.cues.not));
      grid2.append(n);
    }
  }
  secB.append(grid2);

  // 2-2. 種類・発展形(例: EBS のボリュームタイプ)
  let secK = null;
  if (s.variants.length) {
    secK = section("kinds", `種類・発展形・関連機能(${s.variants.length})`, "VARIANTS");
    const order = ["種類", "機能", "発展"];
    const label = { 種類: "種類 · 同じサービス内の選択肢", 機能: "機能 · 押さえておく関連機能", 発展: "発展形 · 上位版・派生サービス" };
    const wrapK = el("div", "kind-groups");
    order.forEach((k) => {
      const items = s.variants.filter((v) => v[1] === k);
      if (!items.length) return;
      const g = el("div", `kind-group k-${k}`);
      g.append(el("h3", "", label[k]));
      const ul = el("div", "kind-list");
      items.forEach(([n, , d]) => {
        const it = el("article", "kind-item");
        it.append(el("b", "", n), el("p", "", d));
        ul.append(it);
      });
      g.append(ul);
      wrapK.append(g);
    });
    secK.append(wrapK, el("p", "muted ex-anim-note", "上限値や提供状況は変わることがあります。公式ドキュメントで最新の内容を確認してください。"));
  }

  // 2-3. 類似サービスとの違い(用途ごと)
  let secS = null;
  if (groups.length || comps.length) {
    secS = section("similar", "類似サービスとの違い・用途ごとの選び方", "COMPARE");
    groups.forEach((g) => secS.append(compareBlock(g, s.id, true)));
    if (comps.length) {
      const b = el("div", "ex-box wide");
      b.append(el("h3", "", "1 対 1 で比べると"));
      comps.forEach((c) => {
        const other = byId.get(c.a === s.id ? c.b : c.a);
        if (!other) return;
        const row = el("div", "ex-cmp");
        const a = el("a", "ex-rel-name");
        a.href = `#services/${other.id}`;
        a.append(glyph(other), el("b", "", `${s.name} vs ${other.name}`));
        row.append(a, el("p", "", c.text));
        b.append(row);
      });
      secS.append(b);
    }
  }

  // 3. 連携
  const rels = relsOf(s.id);
  const secC = section("links", `他サービスとの連携(${rels.length} 件)`, "CONNECTIONS");
  const rl = el("div", "ex-rels");
  rels.forEach((r, k) => {
    const o = byId.get(r.id);
    const c = el("article", `ex-rel c-${o.color}${r.detail ? " rich" : ""}`);
    const top = el("div", "ex-rel-top");
    const nm = el("a", "ex-rel-name");
    nm.href = `#services/${o.id}`;
    nm.append(glyph(o), el("b", "", o.name));
    const dir = el("span", "ex-dir", r.dir === "in" ? `${o.name} → ${s.name}` : `${s.name} → ${o.name}`);
    top.append(nm, dir);
    c.append(top, el("p", "ex-rel-label", r.label));
    if (r.detail) {
      const dl = el("dl", "ex-rel-dl");
      for (const [k2, t] of [["how", "つながり方"], ["need", "必要な設定・権限"], ["exam", "試験の視点"]]) {
        if (!r.detail[k2]) continue;
        dl.append(el("dt", "", t), el("dd", "", r.detail[k2]));
      }
      c.append(dl);
      if (r.detail.p?.length) {
        const pr = el("div", "pt-tags");
        r.detail.p.forEach((pid) => {
          const a = el("a", "pt-tag", pid);
          a.href = `#services/pattern:${pid}`;
          a.title = PATTERNS.find((x) => x.id === pid)?.t || pid;
          pr.append(a);
        });
        c.append(pr);
      }
    }
    if (k < 8) {
      const play = el("button", "ex-play", "▶ この連携を再生");
      play.type = "button";
      play.addEventListener("click", () => {
        loadAnim("auto", false);
        player.go(k + 1);
        setTimeout(() => player.play(), 50);
        secA.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      c.append(play);
    }
    rl.append(c);
  });
  secC.append(rl);

  // 4. 設計パターン(SAP 正解構成図から整理した既習パターン)と、このサービスを使う構築問題
  const secD = section("design", `SAP 設計パターン(${pats.length} 件)`, "DESIGN PATTERNS");
  const dz = el("div", "pt-list");
  pats.forEach((p) => {
    const c = el("article", "panel pt-item");
    const top = el("div", "pt-card-top");
    const ttl = el("a", "pt-title");
    ttl.href = `#services/pattern:${p.id}`;
    ttl.append(el("b", "pt-id", p.id), el("span", "", p.t));
    top.append(ttl, el("span", "muted", p.f));
    const play = el("button", "ex-play", "▶ この流れを再生");
    play.type = "button";
    play.addEventListener("click", () => {
      loadAnim("pt-" + p.id, true);
      secA.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    c.append(top, chain(p), patternFacts(p), play);
    dz.append(c);
  });
  if (!pats.length) dz.append(el("p", "muted", "このサービスが主役になる SAP 設計パターンはまだありません。連携タブの組み合わせから学べます。"));
  const pbs = BUILD.filter((pb) => pb.palette.includes(s.id) && pb.slots.some((x) => x.any.includes(s.id)));
  if (pbs.length) {
    const b = el("div", "ex-box wide");
    b.append(el("h3", "", "このサービスを使う構築問題"));
    const ul = el("div", "ex-pbs");
    pbs.forEach((pb) => {
      const a = el("a", "ex-pb", `${pb.level}${pb.mode === "fix" ? " · 障害対応" : ""} · ${pb.title} →`);
      a.href = `#build/${pb.id}`;
      ul.append(a);
    });
    b.append(ul);
    dz.append(b);
  }
  secD.append(dz);

  // 6. メモ(旧・学習ノート)
  const secM = section("memo", "自分のメモ", "MY NOTES");
  {
    const ta = el("textarea", "memo-text");
    ta.value = memo.get(s.id);
    ta.placeholder = "覚えたいこと、間違えた理由、試験での見分け方など。このブラウザに自動保存されます。";
    ta.setAttribute("aria-label", `${s.name} のメモ`);
    const st = el("p", "muted memo-status");
    st.setAttribute("role", "status");
    let t = 0;
    ta.addEventListener("input", () => {
      clearTimeout(t);
      st.textContent = "入力中…";
      t = setTimeout(() => {
        memo.set(s.id, ta.value);
        st.textContent = memo.stored() ? "保存しました" : "このタブ内にだけ保持しています(ブラウザに保存できません)";
      }, 400);
    });
    secM.append(ta, st);
  }

  // 前後のサービス
  const pn = el("nav", "ex-pn");
  for (const [o, t] of [[SERVICES[idx - 1], "←"], [SERVICES[idx + 1], "→"]]) {
    if (!o) { pn.append(el("span")); continue; }
    const a = el("a", "ex-pn-a");
    a.href = `#services/${o.id}`;
    a.append(el("small", "", t === "←" ? "前のサービス" : "次のサービス"), el("b", "", `${t === "←" ? "← " : ""}${o.name}${t === "→" ? " →" : ""}`));
    pn.append(a);
  }
  detail.replaceChildren(...[back, hero, tabs, secA, secB, secK, secS, secC, secD, secM, pn].filter(Boolean));
  detail.classList.remove("enter");
  void detail.offsetWidth;
  detail.classList.add("enter");
  if (anims.length) loadAnim(anims[0].key, false);
  requestAnimationFrame(() => tabSlide(true));
  // スクロールに合わせてタブの選択を移動。
  // ・基準線(タブの下端)より上に見出しが来た最後のセクションを選ぶ(速くスクロールしても、その時点の位置から必ず決まる)
  // ・ページの最下部に達したら最後のセクションを選ぶ(短い「メモ」でも選ばれる)
  // ・タブのクリックで動いている間は、到着するまで選択を固定する(利用者がホイール等で操作したら解除)
  const secEls = [secA, secB, secK, secS, secC, secD, secM].filter(Boolean);
  const activeByScroll = () => {
    const doc = document.documentElement;
    if (window.scrollY + window.innerHeight >= doc.scrollHeight - 4) return secEls[secEls.length - 1].dataset.sec;
    const line = tabLine();
    let k = secEls[0].dataset.sec;
    for (const x of secEls) {
      if (x.getBoundingClientRect().top <= line) k = x.dataset.sec;
      else break;
    }
    return k;
  };
  let raf = 0;
  const sync = () => {
    raf = 0;
    if (host.hidden || detail.hidden || !tabs.isConnected) return;
    if (lock) {
      if (performance.now() < lock.until) return;
      lock = null;
    }
    let k = activeByScroll();
    // クリックで選んだセクションが画面内に見えている間は、その選択を保つ
    if (picked) {
      const r = document.getElementById(`sec-${picked}`)?.getBoundingClientRect();
      if (r && r.top >= 0 && r.top < window.innerHeight - 40) k = picked;
      else picked = null;
    }
    if (k !== cur) {
      cur = k;
      tabSlide();
    }
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(sync); };
  const onEnd = () => { lock = null; onScroll(); };
  const onUser = (e) => {
    if (e.type === "keydown" && e.target.closest?.("input, textarea, select")) return;
    picked = null;
    if (lock) { lock = null; onScroll(); }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scrollend", onEnd);
  window.addEventListener("resize", onScroll);
  for (const ev of ["wheel", "touchstart", "keydown"]) window.addEventListener(ev, onUser, { passive: true });
  detail._spy?.disconnect();
  detail._spy = {
    disconnect() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onEnd);
      window.removeEventListener("resize", onScroll);
      for (const ev of ["wheel", "touchstart", "keydown"]) window.removeEventListener(ev, onUser);
      cancelAnimationFrame(raf);
    },
  };
  window.scrollTo({ top: 0, behavior: "auto" });
  document.title = `${s.name} | サービス図鑑 | AWS Architecture Academy`;
  $("page-label").textContent = `サービス図鑑 / ${s.name}`;
}

function openScene(sc) {
  player?.destroy();
  player = null;
  view.hidden = true;
  detail.hidden = false;
  const back = el("a", "ex-back", "← 連携シナリオの一覧へ");
  back.href = "#services";
  back.addEventListener("click", () => { mode = "scenes"; store.set("aaa.ex.mode", mode); });
  const hero = el("header", "ex-hero c-blue");
  const t = el("div");
  t.append(el("p", "eyebrow", "連携シナリオ"), el("h1", "", sc.title), el("p", "ex-sum", sc.objective || ""));
  hero.append(t);
  const stage = el("div", "ex-player");
  const svcs = [...new Set(sc.nodes.map((n) => n.svc).filter((x) => x && byId.has(x)))];
  const row = el("div", "ex-scene-links");
  row.append(el("span", "muted", "登場するサービス:"));
  svcs.forEach((id) => {
    const a = el("a", "ex-rel-name");
    a.href = `#services/${id}`;
    a.append(glyph(byId.get(id)), el("b", "", byId.get(id).name));
    row.append(a);
  });
  const note = el("div", "ex-box tip");
  note.append(el("h3", "", "この構成を選ぶ場面"), el("p", "", sc.rule || ""), el("p", "muted", sc.note || ""));
  detail.replaceChildren(back, hero, stage, row, note);
  detail.classList.remove("enter");
  void detail.offsetWidth;
  detail.classList.add("enter");
  player = new FlowPlayer(stage, { meta: metaOf, onNode: (id) => byId.has(id) && (location.hash = `services/${id}`) });
  player.load(sc);
  store.set("aaa.resume.scene", sc.id);
  window.scrollTo({ top: 0, behavior: "auto" });
}

function openPattern(p) {
  player?.destroy();
  player = null;
  view.hidden = true;
  detail.hidden = false;
  detail._spy?.disconnect();
  const i = PATTERNS.indexOf(p);
  const back = el("a", "ex-back", "← 設計パターンの一覧へ");
  back.href = "#services";
  back.addEventListener("click", () => { mode = "patterns"; store.set("aaa.ex.mode", mode); });
  const hero = el("header", "ex-hero c-violet");
  const t = el("div");
  t.append(el("p", "eyebrow", `SAP 設計パターン · ${p.f}`), el("h1", "", `${p.id} ${p.t}`), el("p", "ex-sum", p.why));
  hero.append(t);
  const stage = el("div", "ex-player");
  const steps = el("ol", "pt-steps");
  p.s.forEach(([a, b, label, nar]) => {
    const li = el("li");
    li.append(el("b", "", `${p.n[a][1]} → ${p.n[b][1]}`), el("span", "", `${label}${nar ? " — " + nar : ""}`));
    steps.append(li);
  });
  const flowBox = el("div", "ex-box wide");
  flowBox.append(el("h3", "", "接続の流れと理由"), steps);
  const svcs = [...new Set(p.n.map(([id]) => id).filter((x) => byId.has(x) && !["user", "onprem", "internet"].includes(x)))];
  const row = el("div", "ex-scene-links");
  row.append(el("span", "muted", "登場するサービス:"));
  svcs.forEach((id) => {
    const a = el("a", "ex-rel-name");
    a.href = `#services/${id}`;
    a.append(glyph(byId.get(id)), el("b", "", byId.get(id).name));
    row.append(a);
  });
  const extra = [];
  const pbs = buildsFor([p.id]);
  if (pbs.length) {
    const b = el("div", "ex-box wide");
    b.append(el("h3", "", "このパターンの構築問題"));
    const ul = el("div", "ex-pbs");
    pbs.forEach((pb) => {
      const a = el("a", "ex-pb", `${pb.mode === "fix" ? "障害対応" : "構築"} · ${pb.title} →`);
      a.href = `#build/${pb.id}`;
      ul.append(a);
    });
    b.append(ul);
    extra.push(b);
  }
  const note = el("p", "study-notice", "ユーザー提供の学習マスター(正解構成図 90 枚・演習 70 問)から整理した学習用の要約です。構成図の記載と現行の AWS 仕様は別物です。提供状況・料金・制約は公式ドキュメントで確認してください。");
  const pn = el("nav", "ex-pn");
  for (const [o, lab] of [[PATTERNS[i - 1], "前のパターン"], [PATTERNS[i + 1], "次のパターン"]]) {
    if (!o) { pn.append(el("span")); continue; }
    const a = el("a", "ex-pn-a");
    a.href = `#services/pattern:${o.id}`;
    a.append(el("small", "", lab), el("b", "", `${o.id} ${o.t}`));
    pn.append(a);
  }
  detail.replaceChildren(back, hero, stage, row, flowBox, patternFacts(p, { full: true }), ...extra, note, pn);
  detail.classList.remove("enter");
  void detail.offsetWidth;
  detail.classList.add("enter");
  player = new FlowPlayer(stage, { meta: metaOf, onNode: (id) => byId.has(id) && !["user", "onprem", "internet"].includes(id) && (location.hash = `services/${id}`) });
  player.load(patternScene(p, metaOf));
  window.scrollTo({ top: 0, behavior: "auto" });
  document.title = `${p.id} ${p.t} | 設計パターン | AWS Architecture Academy`;
  $("page-label").textContent = `サービス図鑑 / ${p.id} ${p.t}`;
}

function route(id) {
  if (!id) {
    player?.destroy();
    player = null;
    detail._spy?.disconnect();
    detail.hidden = true;
    view.hidden = false;
    renderList();
    requestAnimationFrame(() => { modeSlide(true); catSlide(true); });
    return;
  }
  if (id.startsWith("compare:")) {
    const g = COMPARE.find((x) => x.id === id.slice(8));
    if (g) return openCompare(g);
  }
  if (id.startsWith("pattern:")) {
    const p = PATTERNS.find((x) => x.id === id.slice(8));
    if (p) return openPattern(p);
  }
  if (id.startsWith("scene:")) {
    const sc = scenes.find((x) => x.id === id.slice(6));
    if (sc) return openScene(sc);
  }
  const s = byId.get(id);
  if (s) openDetail(s);
  else location.hash = "services";
}
const NONE = Symbol("none");
let lastId = NONE;
const autoSidebar = (collapse) => window.dispatchEvent(new CustomEvent("sidebar-auto", { detail: { collapse } }));
window.addEventListener("route-change", (e) => {
  const { page, id } = e.detail;
  if (page !== "services") {
    player?.pause();
    lastId = NONE;
    autoSidebar(false);
    return;
  }
  // 解説ページ(サービス・設計パターン・比較・シナリオ)ではサイドバーを閉じ、一覧では開く
  autoSidebar(!!id);
  if (id === lastId) return;
  lastId = id;
  route(id);
});

async function load() {
  try {
    const r = await fetch("data/scenes.json");
    const d = await r.json();
    scenes = d.scenes.map(normalizeScene);
  } catch {
    scenes = [];
  }
  renderScenes();
  window.dispatchEvent(new CustomEvent("scenes-ready", { detail: scenes }));
  if (location.hash.startsWith("#services")) {
    const id = location.hash.split("/")[1];
    lastId = id;
    route(id);
  }
}
renderList();
detail.hidden = true;
load();
export { scenes };
