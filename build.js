// サービス構築問題: サービスを配置し、線でつないで構成を組み立てる。採点後に模範解答をアニメーションで確認。
import { BUILD } from "./data/build.js";
import { PATTERNS } from "./data/sap-patterns.js";
import { byId, metaOf, linkDetail } from "./services.js";
import { FlowPlayer, problemScene, fitFont } from "./flow.js";
import { $, el, slider, store, toast } from "./ui.js";

const KEY = "aaa.build.v1";
const SVGNS = "http://www.w3.org/2000/svg";
const W = 780, H = 440, NW = 128, NH = 46;
let rec = store.get(KEY, {});
if (!rec || typeof rec !== "object") rec = {};
const host = $("build");
let level = "all";
let player = null;
let ws = null; // 作業中の状態 { pb, nodes: Map(id -> {x,y}), edges: Set("a|b"), sel, hint }

function s(tag, attrs, parent) {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs || {}) n.setAttribute(k, String(attrs[k]));
  if (parent) parent.append(n);
  return n;
}
const ekey = (a, b) => [a, b].sort().join("|");
/** 障害対応問題は「問題のある現在の構成」から始める。layout があればそれを使う */
function startState(pb) {
  if (!pb.start) return { nodes: [], edges: [] };
  const pos = pb.start.at || {};
  const ids = pb.start.nodes;
  const nodes = ids.map((id, i) => {
    const q = pos[id] || [10 + (i % 4) * 27, 20 + Math.floor(i / 4) * 55];
    return [id, { x: 80 + (q[0] / 100) * (W - 160), y: 50 + (q[1] / 100) * (H - 100) }];
  });
  return { nodes, edges: pb.start.edges.map(([a, b]) => ekey(a, b)) };
}
function save() { store.set(KEY, rec); window.dispatchEvent(new Event("learning-update")); }

/* ---------- 一覧 ---------- */
function renderList() {
  player?.destroy();
  player = null;
  const wrap = el("div", "bd-list-view");
  const head = el("div", "page-heading");
  const t = el("div");
  t.append(el("p", "eyebrow", "BUILD THE ARCHITECTURE"), el("h1", "", "サービス構築問題"), el("p", "muted", "要件を読み、必要なサービスを置いて線でつなぐ。資格試験で問われる「サービス同士の連携」を、手を動かして身につけます。"));
  const solved = BUILD.filter((pb) => rec[pb.id]?.ok).length;
  const prog = el("div", "bd-prog");
  prog.append(el("b", "", `${solved} / ${BUILD.length}`), el("small", "", "問 正解"));
  head.append(t, prog);
  const seg = el("div", "seg bd-levels");
  [["all", "すべて"], ["SAA", "SAA 設計"], ["SAP", "SAP 応用"], ["fix", "障害対応"]].forEach(([v, tx]) => {
    const b = el("button", "seg-btn", tx);
    b.type = "button";
    b.dataset.v = v;
    b.setAttribute("aria-pressed", String(v === level));
    seg.append(b);
  });
  const how = el("ol", "bd-how");
  [["読む", "要件・制約(障害対応ではチケットと証跡)から役割を考える"], ["置く / 外す", "パレットのサービスを追加し、不要なものは外す"], ["つなぐ", "2 つのサービスを順にタップして連携"], ["確かめる", "部品・連携・不要物で採点し、必要な設定と模範解答の動きを確認"]].forEach(([a, b], i) => {
    const li = el("li");
    li.append(el("i", "", String(i + 1)), el("b", "", a), el("span", "", b));
    how.append(li);
  });
  const grid = el("div", "bd-grid");
  BUILD.filter((pb) => level === "all" || (level === "fix" ? pb.mode === "fix" : pb.level === level)).forEach((pb, i) => {
    const r = rec[pb.id];
    const a = el("a", `bd-card${r?.ok ? " ok" : r ? " tried" : ""}`);
    a.href = `#build/${pb.id}`;
    const top = el("div", "bd-card-top");
    top.append(el("span", `bd-lv lv-${pb.level}`, pb.level), ...(pb.mode === "fix" ? [el("span", "bd-lv lv-fix", "障害対応")] : []), el("span", "bd-dom", pb.domain), el("span", "bd-st", r?.ok ? "✓ 正解" : r ? `挑戦 ${r.tries} 回` : "未挑戦"));
    const icons = el("div", "bd-icons");
    pb.slots.forEach((sl) => {
      const sv = byId.get(sl.any[0]);
      if (sv) icons.append(el("span", `svc-glyph c-${sv.color}`, sv.abbr));
    });
    a.append(top, el("h3", "", pb.title), el("p", "", pb.scenario), icons);
    a.style.setProperty("--d", `${i * 30}ms`);
    grid.append(a);
  });
  wrap.append(head, how, seg, grid);
  host.replaceChildren(wrap);
  const sl = slider(seg, ".seg-btn", (b) => b.dataset.v === level);
  sl(true);
  seg.addEventListener("click", (e) => {
    const b = e.target.closest(".seg-btn");
    if (!b) return;
    level = b.dataset.v;
    renderList();
  });
}

/* ---------- 問題 ---------- */
function openProblem(pb) {
  player?.destroy();
  player = null;
  const saved = store.get(`aaa.build.ws.${pb.id}`, null);
  const init = startState(pb);
  ws = { pb, nodes: new Map(saved?.nodes || init.nodes), edges: new Set(saved?.edges || init.edges), sel: null, hint: 0, checked: false };
  const wrap = el("div", "bd-prob");
  const back = el("a", "ex-back", "← 構築問題の一覧へ");
  back.href = "#build";
  const idx = BUILD.indexOf(pb);
  // 要件
  const brief = el("section", "panel bd-brief");
  const bt = el("div", "bd-card-top");
  bt.append(el("span", `bd-lv lv-${pb.level}`, pb.level), ...(pb.mode === "fix" ? [el("span", "bd-lv lv-fix", "障害対応")] : []), el("span", "bd-dom", pb.domain), el("span", "bd-st", `問題 ${idx + 1} / ${BUILD.length}`));
  const reqs = el("ul", "bd-reqs");
  pb.reqs.forEach((r) => reqs.append(el("li", "", r)));
  brief.append(bt, el("h1", "", pb.title));
  if (pb.mode === "fix") {
    const tk = el("div", "bd-ticket");
    tk.append(el("b", "", "障害チケット"), el("p", "", pb.scenario));
    brief.append(tk);
    if (pb.log?.length) {
      const lg = el("pre", "bd-log");
      lg.textContent = pb.log.join("\n");
      brief.append(el("h3", "", "観測・証跡(模擬)"), lg);
    }
    brief.append(el("p", "muted bd-fixnote", "キャンバスには現在の(問題のある)構成が置かれています。足りないものを追加し、原因になっているものは外してください。"));
  } else brief.append(el("p", "bd-scn", pb.scenario));
  brief.append(el("h3", "", pb.mode === "fix" ? "修復後に満たすこと" : "満たすべき要件"), reqs);
  if (pb.pattern?.length || pb.src) {
    const src = el("p", "bd-src");
    if (pb.src) src.append(el("span", "", `参照: ${pb.src}`));
    (pb.pattern || []).forEach((pid) => {
      const a = el("a", "pt-tag", pid);
      a.href = `#services/pattern:${pid}`;
      a.title = PATTERNS.find((x) => x.id === pid)?.t || pid;
      src.append(a);
    });
    brief.append(src);
  }
  // パレット
  const pal = el("section", "panel bd-pal");
  pal.append(el("h3", "", "サービスを配置"), el("p", "muted", "タップで追加・もう一度で外す。不要なサービスや、つなぐと誤りになる連携も混ざっています。"));
  const pl = el("div", "bd-pal-list");
  pb.palette.forEach((id) => {
    const sv = byId.get(id);
    const b = el("button", `bd-pi c-${sv.color}`);
    b.type = "button";
    b.dataset.id = id;
    b.append(el("span", `svc-glyph c-${sv.color}`, sv.abbr), el("span", "bd-pi-n", sv.name));
    pl.append(b);
  });
  pal.append(pl);
  // キャンバス
  const board = el("section", "panel bd-board");
  const bar = el("div", "bd-bar");
  const help = el("p", "bd-help", "サービスを 2 つ順にタップすると線でつながります。線をタップすると削除。ドラッグで移動。");
  const btnHint = el("button", "", "ヒント");
  const btnClear = el("button", "", "やり直す");
  const btnCheck = el("button", "primary", "採点する");
  [btnHint, btnClear, btnCheck].forEach((b) => (b.type = "button"));
  bar.append(help, btnHint, btnClear, btnCheck);
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "bd-svg", role: "application", "aria-label": "構成キャンバス" });
  const defs = s("defs", {}, svg);
  const pat = s("pattern", { id: "bd-dot", width: 24, height: 24, patternUnits: "userSpaceOnUse" }, defs);
  s("circle", { cx: 2, cy: 2, r: 1.2, class: "fp-gridpt" }, pat);
  s("rect", { width: W, height: H, fill: "url(#bd-dot)" }, svg);
  const gE = s("g", {}, svg), gN = s("g", {}, svg);
  const empty = s("text", { x: W / 2, y: H / 2, "text-anchor": "middle", class: "bd-empty" }, svg);
  empty.textContent = "左のパレットからサービスを配置しましょう";
  const hintBox = el("div", "bd-hint");
  hintBox.setAttribute("aria-live", "polite");
  board.append(bar, svg, hintBox);
  const result = el("section", "bd-result");
  result.hidden = true;
  const nav = el("nav", "ex-pn");
  for (const [o, t] of [[BUILD[idx - 1], "前の問題"], [BUILD[idx + 1], "次の問題"]]) {
    if (!o) { nav.append(el("span")); continue; }
    const a = el("a", "ex-pn-a");
    a.href = `#build/${o.id}`;
    a.append(el("small", "", t), el("b", "", o.title));
    nav.append(a);
  }
  const layout = el("div", "bd-layout");
  const side = el("div", "bd-side");
  side.append(brief, pal);
  layout.append(side, board);
  wrap.append(back, layout, result, nav);
  host.replaceChildren(wrap);
  wrap.classList.add("enter");

  function persist() {
    store.set(`aaa.build.ws.${pb.id}`, { nodes: [...ws.nodes], edges: [...ws.edges] });
  }
  function freeSpot() {
    const cols = 5, rows = 4;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = 80 + c * ((W - 160) / (cols - 1)), y = 60 + r * ((H - 120) / (rows - 1));
        if ([...ws.nodes.values()].every((p) => Math.hypot(p.x - x, p.y - y) > 90)) return { x, y };
      }
    return { x: W / 2 + (Math.random() - 0.5) * 200, y: H / 2 + (Math.random() - 0.5) * 140 };
  }
  const lines = new Map();
  function draw() {
    pl.querySelectorAll(".bd-pi").forEach((b) => b.setAttribute("aria-pressed", String(ws.nodes.has(b.dataset.id))));
    empty.style.display = ws.nodes.size ? "none" : "";
    gE.replaceChildren();
    lines.clear();
    ws.edges.forEach((k) => {
      const [a, b] = k.split("|");
      const p = ws.nodes.get(a), q = ws.nodes.get(b);
      if (!p || !q) { ws.edges.delete(k); return; }
      const g = s("g", { class: "bd-edge" }, gE);
      if (ws.mark) g.classList.add(ws.mark.edges.get(k) || "extra");
      const l1 = s("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: "bd-hit" }, g);
      const l2 = s("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: "bd-line" }, g);
      lines.set(k, [l1, l2]);
      const d = linkDetail(a, b);
      s("title", {}, g).textContent = d ? d.how : `${metaOf(a)?.name} — ${metaOf(b)?.name}`;
      g.addEventListener("click", () => {
        ws.edges.delete(k);
        ws.mark = null;
        persist();
        draw();
      });
    });
    gN.replaceChildren();
    ws.nodes.forEach((p, id) => {
      const m = metaOf(id) || { name: id, color: "gray", abbr: "?" };
      const g = s("g", { class: `fp-node bd-node c-${m.color}`, transform: `translate(${p.x},${p.y})`, tabindex: 0 }, gN);
      g.dataset.id = id;
      if (ws.sel === id) g.classList.add("sel");
      if (ws.mark) g.classList.add(ws.mark.nodes.get(id) || "extra");
      const inner = s("g", { class: "fp-in" }, g);
      s("rect", { class: "fp-halo", x: -NW / 2 - 6, y: -NH / 2 - 6, width: NW + 12, height: NH + 12, rx: 15 }, inner);
      s("rect", { class: "fp-box", x: -NW / 2, y: -NH / 2, width: NW, height: NH, rx: 12 }, inner);
      s("circle", { class: "fp-badge", cx: -NW / 2 + 21, cy: 0, r: 13.5 }, inner);
      const ab = s("text", { class: "fp-abbr", x: -NW / 2 + 21, y: 4, "text-anchor": "middle" }, inner);
      ab.textContent = m.abbr;
      ab.style.fontSize = m.abbr.length > 3 ? "7.5px" : m.abbr.length > 2 ? "9px" : "11px";
      const lb = s("text", { class: "fp-label", x: 12, y: 4.5, "text-anchor": "middle" }, inner);
      lb.textContent = m.name.length > 14 ? m.name.slice(0, 13) + "…" : m.name;
      lb.style.fontSize = fitFont(m.name, NW - 50) + "px";
      g.setAttribute("aria-label", `${m.name}${ws.sel === id ? "(選択中)" : ""}`);
    });
  }
  function toggleNode(id) {
    if (ws.nodes.has(id)) {
      ws.nodes.delete(id);
      [...ws.edges].forEach((k) => k.split("|").includes(id) && ws.edges.delete(k));
      if (ws.sel === id) ws.sel = null;
    } else ws.nodes.set(id, freeSpot());
    ws.mark = null;
    persist();
    draw();
  }
  pl.addEventListener("click", (e) => {
    const b = e.target.closest(".bd-pi");
    if (b) toggleNode(b.dataset.id);
  });
  function tapNode(id) {
    if (!ws.sel) ws.sel = id;
    else if (ws.sel === id) ws.sel = null;
    else {
      const k = ekey(ws.sel, id);
      if (ws.edges.has(k)) ws.edges.delete(k);
      else ws.edges.add(k);
      ws.sel = null;
      ws.mark = null;
      persist();
    }
    draw();
  }
  // ドラッグとタップの判定
  let drag = null;
  const toSvg = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };
  svg.addEventListener("pointerdown", (e) => {
    const g = e.target.closest(".bd-node");
    if (!g) return;
    const p = toSvg(e), n = ws.nodes.get(g.dataset.id);
    drag = { id: g.dataset.id, dx: n.x - p.x, dy: n.y - p.y, sx: e.clientX, sy: e.clientY, moved: false, g };
    g.setPointerCapture(e.pointerId);
    g.classList.add("drag");
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
    drag.moved = true;
    const p = toSvg(e);
    const x = Math.max(NW / 2 + 4, Math.min(W - NW / 2 - 4, p.x + drag.dx)), y = Math.max(NH / 2 + 4, Math.min(H - NH / 2 - 4, p.y + drag.dy));
    ws.nodes.set(drag.id, { x, y });
    drag.g.setAttribute("transform", `translate(${x},${y})`);
    lines.forEach(([l1, l2], k) => {
      const [a, b] = k.split("|");
      if (a !== drag.id && b !== drag.id) return;
      const end = a === drag.id ? "1" : "2";
      for (const l of [l1, l2]) { l.setAttribute("x" + end, x); l.setAttribute("y" + end, y); }
    });
  });
  const end = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.moved) tapNode(d.id);
    else persist();
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", () => (drag = null));
  svg.addEventListener("keydown", (e) => {
    const g = e.target.closest?.(".bd-node");
    if (g && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      tapNode(g.dataset.id);
      svg.querySelector(`.bd-node[data-id="${g.dataset.id}"]`)?.focus();
    }
  });
  btnClear.addEventListener("click", () => {
    const init = startState(pb);
    ws.nodes = new Map(init.nodes);
    ws.edges = new Set(init.edges);
    ws.sel = null;
    ws.mark = null;
    ws.hint = 0;
    hintBox.replaceChildren();
    result.hidden = true;
    persist();
    draw();
  });
  btnHint.addEventListener("click", () => {
    ws.hint = Math.min(pb.hints.length, ws.hint + 1);
    hintBox.replaceChildren(...pb.hints.slice(0, ws.hint).map((h, i) => {
      const p = el("p", "bd-hint-row");
      p.append(el("b", "", `ヒント ${i + 1}`), document.createTextNode(h));
      return p;
    }));
    btnHint.textContent = ws.hint >= pb.hints.length ? "ヒント(全部表示)" : `ヒント ${ws.hint + 1}`;
  });
  btnCheck.addEventListener("click", () => grade());

  function grade() {
    const placed = new Set(ws.nodes.keys());
    const slotHit = new Map();
    const nodes = new Map();
    const optional = new Map(pb.opt || []);
    pb.slots.forEach((sl) => {
      const id = sl.any.find((x) => placed.has(x));
      slotHit.set(sl.k, id || null);
      if (id) nodes.set(id, "ok");
    });
    const edges = new Map();
    const linkRes = pb.links.map(([a, b, label, cfg]) => {
      const A = pb.slots.find((x) => x.k === a).any.filter((x) => placed.has(x));
      const B = pb.slots.find((x) => x.k === b).any.filter((x) => placed.has(x));
      let ok = false, pair = null;
      for (const x of A) for (const y of B) if (ws.edges.has(ekey(x, y))) { ok = true; pair = [x, y]; edges.set(ekey(x, y), "ok"); }
      const ex = pair || [pb.slots.find((x) => x.k === a).any[0], pb.slots.find((x) => x.k === b).any[0]];
      return { a, b, label, ok, cfg: cfg || linkDetail(ex[0], ex[1])?.need || "", names: [nameOfSlot(a), nameOfSlot(b)] };
    });
    // 要件の部品でも任意(opt)でもない配置は、すべて「不要なサービス」
    const forbidWhy = new Map(pb.forbid);
    const forb = [...placed].filter((id) => !nodes.has(id) && !optional.has(id)).map((id) => [id, forbidWhy.get(id) || "この要件の構成には含めません。役割が重複するか、要件と関係のないサービスです。"]);
    forb.forEach(([id]) => nodes.set(id, "ng"));
    [...placed].filter((id) => optional.has(id)).forEach((id) => nodes.set(id, "opt"));
    // 必要な連携にない線。任意のサービスにつながる線は減点しない
    const extra = [];
    ws.edges.forEach((k) => {
      if (edges.has(k)) return;
      const [x, y] = k.split("|");
      if (nodes.get(x) === "ng" || nodes.get(y) === "ng") { edges.set(k, "ng"); return; }
      if (nodes.get(x) === "opt" || nodes.get(y) === "opt") return;
      edges.set(k, "ng");
      extra.push([x, y]);
    });
    const slotsOk = pb.slots.every((x) => slotHit.get(x.k));
    const linksOk = linkRes.every((x) => x.ok);
    const ok = slotsOk && linksOk && !forb.length && !extra.length;
    ws.mark = { nodes, edges };
    draw();
    const r = rec[pb.id] || { tries: 0, ok: false };
    r.tries++;
    r.ok = r.ok || ok;
    r.at = new Date().toISOString();
    rec[pb.id] = r;
    save();
    showResult(ok, slotHit, linkRes, forb, extra, optional);
  }
  function nameOfSlot(k) {
    const sl = pb.slots.find((x) => x.k === k);
    return sl.any.map((id) => byId.get(id)?.name).join(" / ");
  }
  function showResult(ok, slotHit, linkRes, forb, extra, optional) {
    result.hidden = false;
    const box = el("div", `panel bd-res ${ok ? "ok" : "ng"}`);
    const score = pb.slots.filter((x) => slotHit.get(x.k)).length + linkRes.filter((x) => x.ok).length;
    const max = pb.slots.length + pb.links.length;
    const hd = el("div", "bd-res-h");
    hd.append(el("span", "bd-res-mark", ok ? "✓" : "!"), el("div", ""));
    hd.lastChild.append(el("h2", "", ok ? (pb.mode === "fix" ? "復旧! 原因を取り除き、要件を満たす構成です" : "正解! 要件を満たす構成です") : "もう少し。✕ の項目を確認しましょう"), el("p", "muted", `部品と連携 ${score} / ${max}${forb.length ? `  ·  不要なサービス ${forb.length} 件` : ""}${extra.length ? `  ·  不要な連携 ${extra.length} 本` : ""}`));
    const meter = el("div", "bd-meter");
    const fill = el("i");
    meter.append(fill);
    requestAnimationFrame(() => (fill.style.width = `${(score / max) * 100}%`));
    const cols = el("div", "bd-res-cols");
    const c1 = el("div");
    c1.append(el("h3", "", "必要な部品"));
    const ul1 = el("ul", "bd-check");
    pb.slots.forEach((sl) => {
      const hit = slotHit.get(sl.k);
      const li = el("li", hit ? "ok" : "ng");
      li.append(el("b", "", (hit ? "✓ " : "✕ ") + (hit ? byId.get(hit).name : ws.checkedOnce || ok ? nameOfSlot(sl.k) : "?(未配置)")), el("span", "", sl.why));
      ul1.append(li);
    });
    c1.append(ul1);
    const c2 = el("div");
    c2.append(el("h3", "", "必要な連携"));
    const ul2 = el("ul", "bd-check");
    linkRes.forEach((x) => {
      const li = el("li", x.ok ? "ok" : "ng");
      li.append(el("b", "", `${x.ok ? "✓" : "✕"} ${x.names[0]} — ${x.names[1]}`), el("span", "", x.label));
      if (x.cfg && (x.ok || ws.checkedOnce)) li.append(el("small", "bd-cfg", `必要な設定: ${x.cfg}`));
      ul2.append(li);
    });
    c2.append(ul2);
    cols.append(c1, c2);
    box.append(hd, meter, cols);
    if (forb.length || extra.length) {
      const f = el("div", "bd-forb");
      if (forb.length) {
        f.append(el("h3", "", pb.mode === "fix" ? "外すべきサービス(原因・不要)" : "この要件では不要なサービス"));
        forb.forEach(([id, why]) => f.append(el("p", "", `${byId.get(id)?.name || id}: ${why}`)));
      }
      if (extra.length) {
        f.append(el("h3", "", "必要な連携にない線"));
        extra.forEach(([x, y]) => f.append(el("p", "", `${byId.get(x)?.name} — ${byId.get(y)?.name}: この構成ではこの 2 つを直接つなぎません。データや制御がどこを経由するかを見直しましょう。`)));
      }
      box.append(f);
    }
    const opts = [...optional].filter(([id]) => ws.nodes.has(id));
    if (opts.length) {
      const o = el("div", "bd-opt");
      o.append(el("h3", "", "置いても減点しないサービス"));
      opts.forEach(([id, why]) => o.append(el("p", "", `${byId.get(id)?.name}: ${why}`)));
      box.append(o);
    }
    ws.checkedOnce = true;
    const act = el("div", "bd-actions");
    const showAns = el("button", ok ? "primary" : "", ok ? "解説と模範解答の動きを見る" : "模範解答を見る");
    showAns.type = "button";
    act.append(showAns);
    box.append(act);
    const ans = el("div", "bd-answer");
    ans.hidden = true;
    box.append(ans);
    showAns.addEventListener("click", () => {
      ans.hidden = false;
      showAns.hidden = true;
      const ex = el("div", "ex-box tip");
      ex.append(el("h3", "", pb.mode === "fix" ? "根本原因と修復" : "解説"), el("p", "", pb.explain));
      if (pb.verify) ex.append(el("h3", "", "復旧の確認と再発防止"), el("p", "", pb.verify));
      const stage = el("div", "ex-player");
      const apply = el("button", "", "模範解答をキャンバスに反映");
      apply.type = "button";
      apply.addEventListener("click", () => {
        ws.nodes = new Map(Object.entries(pb.layout).map(([id, [x, y]]) => [id, { x: 80 + (x / 100) * (W - 160), y: 50 + (y / 100) * (H - 100) }]));
        ws.edges = new Set();
        pb.links.forEach(([a, b]) => {
          const x = pb.slots.find((q) => q.k === a).any.find((id) => id in pb.layout), y = pb.slots.find((q) => q.k === b).any.find((id) => id in pb.layout);
          if (x && y) ws.edges.add(ekey(x, y));
        });
        ws.mark = null;
        persist();
        draw();
        board.scrollIntoView({ behavior: "smooth", block: "center" });
        toast("模範解答を反映しました");
      });
      ans.append(el("h3", "", "模範解答の動き"), stage, ex, apply);
      player?.destroy();
      player = new FlowPlayer(stage, { meta: metaOf, onNode: (id) => byId.has(id) && (location.hash = `services/${id}`) });
      player.load(problemScene(pb, metaOf), { autoplay: true });
    });
    result.replaceChildren(box);
    result.classList.remove("enter");
    void result.offsetWidth;
    result.classList.add("enter");
    result.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    toast(ok ? `「${pb.title}」正解です` : "採点しました。✕ の項目を見直しましょう");
  }
  draw();
  window.scrollTo({ top: 0 });
  $("page-label").textContent = `構築問題 / ${pb.title}`;
  document.title = `${pb.title} | 構築問題 | AWS Architecture Academy`;
}

// 前回表示した問題 ID。一覧(#build)は id が undefined になるため、未表示を表す専用の値と区別する
const NONE = Symbol("none");
let last = NONE;
window.addEventListener("route-change", (e) => {
  const { page, id } = e.detail;
  if (page !== "build") {
    player?.pause();
    last = NONE;
    return;
  }
  if (id === last && host.children.length) return;
  last = id;
  const pb = BUILD.find((x) => x.id === id);
  if (pb) openProblem(pb);
  else renderList();
});
export const buildStats = () => ({ total: BUILD.length, solved: BUILD.filter((pb) => rec[pb.id]?.ok).length });
export function refreshRec() { rec = store.get(KEY, {}) || {}; }
