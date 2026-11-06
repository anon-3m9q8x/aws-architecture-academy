// サービス図鑑: 一覧 → タップでサービスの解説ページへ。連携アニメーション・解説・連携・比較を 1 ページに統合。
import { SERVICES, CATS, byId, relsOf, compsOf, metaOf, isNote, serviceCount } from "./services.js";
import { FlowPlayer, normalizeScene, serviceScene, problemScene } from "./flow.js";
import { BUILD } from "./data/build.js";
import { $, el, slider, store } from "./ui.js";

let scenes = [];
let player = null;
let mode = "list"; // list | scenes
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
for (const [v, t] of [["list", "サービス一覧"], ["scenes", "連携シナリオ"]]) {
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
view.append(head, tools, countLine, grid, sceneGrid);
const detail = el("div", "ex-detail");
host.replaceChildren(view, detail);

const modeSlide = slider(modeSeg, ".seg-btn", (b) => b.dataset.v === mode);
const catSlide = slider(chips, ".ex-cat", (b) => b.dataset.v === cat);

function card(s) {
  const a = el("a", `ex-card c-${s.color}`);
  a.href = `#services/${s.id}`;
  const top = el("div", "ex-card-top");
  top.append(glyph(s), el("span", "ex-card-cat", s.cat));
  a.append(top, el("h3", "", s.name), el("p", "", s.purpose || s.summary));
  const n = relsOf(s.id).length;
  a.append(el("span", "ex-card-foot", `連携 ${n} 件  ·  ▶ アニメーション`));
  return a;
}
function renderList() {
  modeSeg.querySelectorAll(".seg-btn").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.v === mode)));
  modeSlide();
  tools.hidden = mode !== "list";
  grid.hidden = mode !== "list";
  sceneGrid.hidden = mode !== "scenes";
  if (mode === "scenes") {
    countLine.textContent = `${scenes.length} の連携シナリオ。複数サービスがつながる流れを、ステップごとに再生します。`;
    return;
  }
  chips.querySelectorAll(".ex-cat").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === cat)));
  catSlide();
  const q = query.trim().toLowerCase();
  const list = SERVICES.filter((s) => (cat === "all" || s.cat === cat) && (!q || [s.name, s.full, s.cat, s.purpose, s.summary, s.useCases, ...(s.features || []), ...(s.cues?.words || [])].join(" ").toLowerCase().includes(q)));
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
mode = store.get("aaa.ex.mode", "list") === "scenes" ? "scenes" : "list";
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
  if (isNote(s.id)) {
    const n = el("a", "button ghost", "学習ノートにメモ →");
    n.href = `#notebook/${s.id}`;
    links.append(n);
  }
  hero.append(hl, sum, links);
  // セクションの切り替えタブ(スクロール位置と連動してスライド)
  const tabs = el("nav", "ex-tabs");
  tabs.setAttribute("aria-label", "このページの内容");
  const secs = [["anim", "アニメーション"], ["about", "解説"], ["links", "連携"], ["exam", "比較・試験"]];
  secs.forEach(([k, t]) => {
    const a = el("a", "ex-tab", t);
    a.href = `#sec-${k}`;
    a.dataset.k = k;
    tabs.append(a);
  });
  let cur = "anim";
  const tabSlide = slider(tabs, ".ex-tab", (a) => a.dataset.k === cur);
  tabs.addEventListener("click", (e) => {
    const a = e.target.closest(".ex-tab");
    if (!a) return;
    e.preventDefault();
    cur = a.dataset.k;
    tabSlide();
    document.getElementById(`sec-${cur}`)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
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
      : a.pb ? `構築問題「${a.pb.title}」の模範解答の動きです。` : (a.scene().rule || "");
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
  secB.append(grid2);

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

  // 4. 比較・試験
  const secD = section("exam", "比較と試験のポイント", "EXAM FOCUS");
  const ex = el("div", "ex-about");
  if (s.tip) {
    const b = el("div", "ex-box tip wide");
    b.append(el("h3", "", "試験のポイント"), el("p", "", s.tip));
    ex.append(b);
  }
  if (s.cues) {
    const b = el("div", "ex-box");
    const w = el("div", "ex-words");
    s.cues.words.forEach((x) => w.append(el("span", "ex-word", x)));
    b.append(el("h3", "", "問題文にこの言葉が出たら"), w);
    ex.append(b);
    if (s.cues.not) {
      const n = el("div", "ex-box warn");
      n.append(el("h3", "", "選ばないとき"), el("p", "", s.cues.not));
      ex.append(n);
    }
  }
  const comps = compsOf(s.id);
  if (comps.length) {
    const b = el("div", "ex-box wide");
    b.append(el("h3", "", "似ているサービスとの違い"));
    comps.forEach((c) => {
      const other = byId.get(c.a === s.id ? c.b : c.a);
      const row = el("div", "ex-cmp");
      const a = el("a", "ex-rel-name");
      a.href = `#services/${other.id}`;
      a.append(glyph(other), el("b", "", `${s.name} vs ${other.name}`));
      row.append(a, el("p", "", c.text));
      b.append(row);
    });
    ex.append(b);
  }
  const pbs = BUILD.filter((pb) => pb.palette.includes(s.id) && pb.slots.some((x) => x.any.includes(s.id)));
  if (pbs.length) {
    const b = el("div", "ex-box wide");
    b.append(el("h3", "", "このサービスを使う構築問題"));
    const ul = el("div", "ex-pbs");
    pbs.forEach((pb) => {
      const a = el("a", "ex-pb", `${pb.level} · ${pb.title} →`);
      a.href = `#build/${pb.id}`;
      ul.append(a);
    });
    b.append(ul);
    ex.append(b);
  }
  if (!ex.children.length) ex.append(el("p", "muted", "このサービスの試験向けメモはまだありません。"));
  secD.append(ex);

  // 前後のサービス
  const pn = el("nav", "ex-pn");
  for (const [o, t] of [[SERVICES[idx - 1], "←"], [SERVICES[idx + 1], "→"]]) {
    if (!o) { pn.append(el("span")); continue; }
    const a = el("a", "ex-pn-a");
    a.href = `#services/${o.id}`;
    a.append(el("small", "", t === "←" ? "前のサービス" : "次のサービス"), el("b", "", `${t === "←" ? "← " : ""}${o.name}${t === "→" ? " →" : ""}`));
    pn.append(a);
  }
  detail.replaceChildren(back, hero, tabs, secA, secB, secC, secD, pn);
  detail.classList.remove("enter");
  void detail.offsetWidth;
  detail.classList.add("enter");
  if (anims.length) loadAnim(anims[0].key, false);
  requestAnimationFrame(() => tabSlide(true));
  // スクロールに合わせてタブの選択を移動
  const spy = new IntersectionObserver((ents) => {
    const vis = ents.filter((x) => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (vis && vis.target.dataset.sec !== cur) {
      cur = vis.target.dataset.sec;
      tabSlide();
    }
  }, { rootMargin: "-120px 0px -60% 0px" });
  [secA, secB, secC, secD].forEach((x) => spy.observe(x));
  detail._spy?.disconnect();
  detail._spy = spy;
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
  if (id.startsWith("scene:")) {
    const sc = scenes.find((x) => x.id === id.slice(6));
    if (sc) return openScene(sc);
  }
  const s = byId.get(id);
  if (s) openDetail(s);
  else location.hash = "services";
}
let lastId = null;
window.addEventListener("route-change", (e) => {
  const { page, id } = e.detail;
  if (page !== "services") {
    player?.pause();
    lastId = undefined;
    return;
  }
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
    lastId = null;
    const id = location.hash.split("/")[1];
    lastId = id;
    route(id);
  }
}
renderList();
detail.hidden = true;
load();
export { scenes };
