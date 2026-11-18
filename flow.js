// AWS Architecture Academy — 連携アニメーションの再生エンジン(FlowPlayer)
// ・曲線の経路を、光の尾を引くパケットがイージング付きで移動
// ・到着時の波紋、処理中の脈動、経路の流れる破線、ノードの拡大と減光をなめらかに遷移
// ・1 本の requestAnimationFrame で時間を管理し、速度変更・一時停止・シークしても途切れない
import { relsOf, linkDetail, byId as svcById } from "./services.js";
const SVGNS = "http://www.w3.org/2000/svg";
const W = 780, H = 420, NH = 50;
let NW = 138; // ノードの幅(教材ごとに変えられる。描画のたびに再生中の教材の値にそろえる)
const STEP = {
  request: ["リクエスト", "req"], response: ["応答", "res"], process: ["処理", "proc"],
  probe: ["ヘルスチェック", "probe"], setup: ["設定を追加", "set"], addon: ["機能を追加", "set"], decision: ["判定", "proc"], healthChange: ["状態変化", "bad"], status: ["状態", "proc"],
};
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
function s(tag, attrs, parent) {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs || {}) n.setAttribute(k, String(attrs[k]));
  if (parent) parent.append(n);
  return n;
}
function h(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
const KEY2ID = { EC2: "ec2", ALB: "alb", NLB: "nlb", CloudFront: "cloudfront", S3: "s3", Lambda: "lambda", DynamoDB: "dynamodb", RDS: "rds", VPCE: "vpce", NAT: "natgw", IGW: "igw", APIGW: "apigw", Cognito: "cognito", SQS: "sqs", SNS: "sns", DAX: "dax", ElastiCache: "elasticache", ECS: "ecs", Internet: "internet" };
export function svcIdOfKey(k) { return KEY2ID[k] || (k ? String(k).toLowerCase() : null); }

/** scenes.json の教材を共通形式に変換 */
export function normalizeScene(raw) {
  return {
    id: raw.id, title: raw.title, objective: raw.objective,
    rule: raw.selectionRule, note: raw.assumptions,
    nodes: raw.graph.nodes.map((n) => ({ id: n.id, label: n.label, svc: n.role === "actor" ? "user" : svcIdOfKey(n.serviceKey), x: n.x, y: n.y })),
    edges: raw.graph.edges.map((e) => ({ from: e.from, to: e.to, label: e.label, kind: e.kind })),
    steps: raw.steps.map((t) => ({ type: t.type, source: t.source, target: t.target, via: t.via || [], label: t.label, narration: t.narration, dur: t.durationMs, metrics: t.metricChanges })),
  };
}

export class FlowPlayer {
  constructor(host, opts = {}) {
    this.host = host;
    this.opts = opts;
    this.speed = 1;
    this.playing = false;
    this.i = 0;
    this.raf = 0;
    this.meta = opts.meta || (() => ({}));
    host.classList.add("fp");
    host.tabIndex = 0;
    host.setAttribute("role", "group");
    host.setAttribute("aria-label", "連携アニメーション");
    this.stage = h("div", "fp-stage");
    this.capt = h("div", "fp-cap");
    this.capt.setAttribute("aria-live", "polite");
    const bar = h("div", "fp-bar");
    this.btnReset = h("button", "fp-btn", "↺");
    this.btnReset.title = "先頭へ";
    this.btnPrev = h("button", "fp-btn", "◀");
    this.btnPrev.title = "前へ(←)";
    this.btnPlay = h("button", "fp-btn fp-play", "▶ 再生");
    this.btnPlay.title = "再生・一時停止(Space)";
    this.btnNext = h("button", "fp-btn", "▶");
    this.btnNext.title = "次へ(→)";
    this.btnNext.textContent = "▶▶";
    [this.btnReset, this.btnPrev, this.btnPlay, this.btnNext].forEach((b) => (b.type = "button"));
    this.track = h("div", "fp-track");
    this.fill = h("i", "fp-fill");
    this.marks = h("div", "fp-marks");
    this.track.append(this.fill, this.marks);
    this.spd = h("select", "fp-speed");
    this.spd.setAttribute("aria-label", "再生速度");
    [["0.5", "0.5×"], ["1", "1×"], ["1.5", "1.5×"], ["2", "2×"]].forEach(([v, t]) => {
      const o = h("option", "", t);
      o.value = v;
      if (v === "1") o.selected = true;
      this.spd.append(o);
    });
    bar.append(this.btnReset, this.btnPrev, this.btnPlay, this.btnNext, this.track, this.spd);
    this.list = opts.list === false ? null : h("ol", "fp-steps");
    // 「処理 / リクエスト」の説明とステップ一覧を図の上に置く
    host.replaceChildren(this.capt, ...(this.list ? [this.list] : []), this.stage, bar);
    this.btnPlay.addEventListener("click", () => this.toggle());
    this.btnNext.addEventListener("click", () => this.go(this.i + 1));
    this.btnPrev.addEventListener("click", () => this.go(this.i - 1));
    this.btnReset.addEventListener("click", () => this.go(0));
    this.spd.addEventListener("change", () => {
      const now = performance.now();
      const el = (now - this.t0) * this.speed;
      this.speed = Number(this.spd.value);
      this.t0 = now - el / this.speed;
    });
    this.track.addEventListener("pointerdown", (e) => {
      const r = this.track.getBoundingClientRect();
      const n = this.scene?.steps.length || 1;
      this.go(Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n)));
    });
    host.addEventListener("keydown", (e) => {
      if (e.target !== host && e.target.tagName !== "BUTTON" && e.target.tagName !== "svg") return;
      if (e.key === " ") { e.preventDefault(); this.toggle(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); this.go(this.i + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); this.go(this.i - 1); }
      else if (e.key === "Home") { e.preventDefault(); this.go(0); }
    });
    if (this.list)
      this.list.addEventListener("click", (e) => {
        const b = e.target.closest("[data-i]");
        if (b) this.go(Number(b.dataset.i));
      });
    this.io = new IntersectionObserver((ents) => ents.forEach((en) => { if (!en.isIntersecting && this.playing) this.pause(); }));
    this.io.observe(host);
  }

  load(scene, { autoplay = false, start = 0 } = {}) {
    this.pause();
    cancelAnimationFrame(this.raf);
    this.single = false;
    this.phase = "travel";
    this.scene = scene;
    this.build();
    this.go(start, true);
    if (autoplay && !reduce()) this.play();
  }

  /* ---------- 図の組み立て ---------- */
  build() {
    const sc = this.scene;
    this.nw = sc.nodeWidth || 138;
    NW = this.nw;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "fp-svg", role: "img", "aria-label": sc.title || "" });
    const defs = s("defs", {}, svg);
    const uid = "fp" + Math.random().toString(36).slice(2, 8);
    this.uid = uid;
    for (const [id, cls] of [["a", "fp-arrow"], ["ao", "fp-arrow on"]]) {
      const m = s("marker", { id: `${uid}-${id}`, viewBox: "0 0 10 10", refX: 8.5, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
      s("path", { d: "M0,0 L10,5 L0,10 z", class: cls }, m);
    }
    const glow = s("radialGradient", { id: `${uid}-g` }, defs);
    s("stop", { offset: "0%", "stop-color": "currentColor", "stop-opacity": "0.9" }, glow);
    s("stop", { offset: "100%", "stop-color": "currentColor", "stop-opacity": "0" }, glow);
    s("pattern", { id: `${uid}-dot`, width: 22, height: 22, patternUnits: "userSpaceOnUse" }, defs).append(s("circle", { cx: 1.5, cy: 1.5, r: 1.1, class: "fp-gridpt" }));
    s("rect", { x: 0, y: 0, width: W, height: H, fill: `url(#${uid}-dot)`, class: "fp-grid" }, svg);
    const pos = new Map(sc.nodes.map((n) => [n.id, { ...n, px: 78 + (n.x / 100) * (W - 156), py: 48 + (n.y / 100) * (H - 96) }]));
    this.pos = pos;
    const gE = s("g", { class: "fp-edges" }, svg);
    const gL = s("g", { class: "fp-elabels" }, svg);
    const gN = s("g", { class: "fp-nodes" }, svg);
    this.fx = s("g", { class: "fp-fx" }, svg);
    // 同じ 2 点間に往復の線があれば曲げて重ならないようにする
    const pairCount = new Map();
    this.edges = sc.edges.filter((e) => pos.has(e.from) && pos.has(e.to)).map((e) => {
      const key = [e.from, e.to].sort().join("|");
      const k = (pairCount.get(key) || 0) + 1;
      pairCount.set(key, k);
      const a = pos.get(e.from), b = pos.get(e.to);
      const bend = k === 1 ? (sc.curved === false ? 0 : 0.08) : -0.18 * (k - 1);
      const d = curve(a, b, bend);
      const g = s("g", { class: `fp-edge k-${e.kind || "request"}` }, gE);
      const base = s("path", { d: d.path, class: "fp-line", ...(sc.undirected ? {} : { "marker-end": `url(#${uid}-a)` }) }, g);
      const flow = s("path", { d: d.path, class: "fp-flow" }, g);
      let lab = null;
      if (e.label) {
        lab = s("g", { class: "fp-elab", transform: `translate(${d.mx},${d.my})` }, gL);
        const t = s("text", { "text-anchor": "middle", y: 3.5 }, lab);
        t.textContent = e.label;
        const w = textW(e.label, 10.5) + 12;
        lab.insertBefore(s("rect", { x: -w / 2, y: -9, width: w, height: 17, rx: 8.5 }), t);
      }
      if (e.appear != null) g.dataset.appear = e.appear;
      if (lab && e.appear != null) lab.dataset.appear = e.appear;
      if (e.dashed) g.classList.add("is-addon");
      return { e, g, base, flow, lab, len: base.getTotalLength ? 0 : 0 };
    });
    this.nodes = new Map();
    const meta = this.meta;
    pos.forEach((n) => {
      const m = meta(n.svc) || {};
      const g = s("g", { class: `fp-node c-${m.color || "gray"}`, transform: `translate(${n.px},${n.py})` }, gN);
      const inner = s("g", { class: "fp-in" }, g);
      s("rect", { class: "fp-halo", x: -NW / 2 - 7, y: -NH / 2 - 7, width: NW + 14, height: NH + 14, rx: 16 }, inner);
      s("rect", { class: "fp-box", x: -NW / 2, y: -NH / 2, width: NW, height: NH, rx: 12 }, inner);
      s("circle", { class: "fp-badge", cx: -NW / 2 + 22, cy: 0, r: 14.5 }, inner);
      const ab = s("text", { class: "fp-abbr", x: -NW / 2 + 22, y: 4, "text-anchor": "middle" }, inner);
      const abbr = m.abbr || (n.svc === "user" ? "◎" : (n.label || "").slice(0, 3));
      ab.textContent = abbr;
      ab.style.fontSize = abbr.length > 3 ? "7.5px" : abbr.length > 2 ? "9px" : "11px";
      const lb = s("text", { class: "fp-label", x: 13, y: 4.5, "text-anchor": "middle" }, inner);
      const label = n.label || m.name || n.id;
      lb.textContent = label.length > 15 ? label.slice(0, 14) + "…" : label;
      lb.style.fontSize = fitFont(label) + "px";
      const x = s("g", { class: "fp-x", transform: `translate(${NW / 2 - 6},${-NH / 2 + 6})` }, inner);
      s("circle", { r: 9 }, x);
      s("text", { y: 4, "text-anchor": "middle" }, x).textContent = "✕";
      if (this.opts.onNode && n.svc) {
        g.classList.add("fp-link");
        g.addEventListener("click", () => this.opts.onNode(n.svc));
      }
      const title = s("title", {}, g);
      title.textContent = label;
      if (n.appear != null) g.dataset.appear = n.appear;
      if (n.addon) g.classList.add("is-addon");
      this.nodes.set(n.id, { n, g, inner });
    });
    // パケット: 本体 + 光の尾
    this.pk = s("g", { class: "fp-packet" }, this.fx);
    this.trail = Array.from({ length: 12 }, (_, i) => s("circle", { r: 7 - i * 0.45, class: "fp-tr", opacity: 0 }, this.pk));
    this.halo = s("circle", { r: 16, fill: `url(#${uid}-g)`, class: "fp-ph" }, this.pk);
    this.dot = s("circle", { r: 6.5, class: "fp-pd" }, this.pk);
    this.pk.style.opacity = "0";
    this.ring = s("rect", { class: "fp-ring", rx: 14 }, this.fx);
    this.ring.style.opacity = "0";
    this.bub = s("g", { class: "fp-bub" }, this.fx);
    this.bubR = s("rect", { rx: 12, height: 24, y: -12 }, this.bub);
    this.bubT = s("text", { "text-anchor": "middle", y: 4.5 }, this.bub);
    this.ghost = s("path", { class: "fp-ghost" }, svg);
    // 「設定を追加」のチップ(ノードの上に積み上がる)
    this.gChip = s("g", { class: "fp-chips" }, svg);
    this.chips = [];
    const perNode = new Map();
    sc.steps.forEach((t, k) => {
      if (!t.chips?.length) return;
      const on = t.chipOn || t.target;
      const nd = pos.get(on);
      if (!nd) return;
      t.chips.forEach((txt) => {
        const idx = perNode.get(on) || 0;
        perNode.set(on, idx + 1);
        const w = textW("＋" + txt, 10) + 14;
        const g = s("g", { class: "fp-chip", transform: `translate(${nd.px},${nd.py - NH / 2 - 14 - idx * 21})` }, this.gChip);
        s("rect", { x: -w / 2, y: -9, width: w, height: 18, rx: 9 }, g);
        s("text", { "text-anchor": "middle", y: 3.5 }, g).textContent = "＋" + txt;
        this.chips.push({ g, k });
      });
    });
    this.svg = svg;
    // ノードの範囲に合わせて表示範囲を詰める(横一列の構成でも余白が大きくならない)
    const ys = [...pos.values()].map((n) => n.py);
    const chipRoom = Math.max(0, ...[...perNode.values()].map((c) => c * 21 - 10));
    const top = Math.max(0, Math.min(...ys) - NH / 2 - 46 - chipRoom), bot = Math.min(H, Math.max(...ys) + NH / 2 + 30);
    const vh = Math.max(230, bot - top), vy = Math.max(0, Math.min(H - vh, (top + bot) / 2 - vh / 2));
    svg.setAttribute("viewBox", `0 ${vy.toFixed(0)} ${W} ${vh.toFixed(0)}`);
    this.stage.replaceChildren(svg);
    // ステップの目盛りと一覧
    const n = sc.steps.length;
    this.marks.replaceChildren(...sc.steps.map((t, i) => {
      const m = h("span", `fp-mk t-${(STEP[t.type] || STEP.request)[1]}`);
      m.style.left = `${((i + 0.5) / n) * 100}%`;
      return m;
    }));
    if (this.list)
      this.list.replaceChildren(...sc.steps.map((t, i) => {
        const li = h("li");
        const b = h("button", "fp-row");
        b.type = "button";
        b.dataset.i = i;
        const [tn, tc] = STEP[t.type] || STEP.request;
        b.append(h("span", "fp-n", String(i + 1)), h("span", `fp-tag t-${tc}`, tn), h("span", "fp-l", t.label));
        li.append(b);
        return li;
      }));
  }

  /* ---------- 再生制御 ---------- */
  toggle() { this.playing ? this.pause() : this.play(); }
  play() {
    if (!this.scene) return;
    if (reduce()) { this.go(this.i + 1); return; }
    if (this.i >= this.scene.steps.length - 1 && this.phase === "done") this.go(0, true);
    // go() が一時停止中の「1 回だけ動かす」プレビューを始めていても、再生に切り替えたら解除する
    // (解除しないと最初のステップの後でループが止まり、再生中なのに動かなくなる)
    this.single = false;
    this.playing = true;
    this.host.classList.add("is-playing");
    this.btnPlay.textContent = "❚❚ 一時停止";
    this.btnPlay.setAttribute("aria-pressed", "true");
    if (this.phase === "done") this.t0 = performance.now() - this.travel * 1000 / this.speed;
    else this.t0 = performance.now() - (this.pausedAt || 0) / this.speed;
    this.loop();
  }
  pause() {
    if (this.playing) this.pausedAt = (performance.now() - this.t0) * this.speed;
    this.playing = false;
    this.host.classList.remove("is-playing");
    this.btnPlay.textContent = "▶ 再生";
    this.btnPlay.setAttribute("aria-pressed", "false");
  }
  destroy() { this.pause(); cancelAnimationFrame(this.raf); this.io.disconnect(); }

  go(i, silent) {
    if (!this.scene) return;
    const n = this.scene.steps.length;
    this.i = Math.max(0, Math.min(n - 1, i));
    this.prepare();
    this.pausedAt = 0;
    this.t0 = performance.now();
    this.phase = "travel";
    if (!this.playing) {
      // 一時停止中でも、選んだステップは 1 回だけ動かして見せる
      this.single = true;
      this.loop();
    }
    if (!silent) this.host.focus({ preventScroll: true });
    this.opts.onStep?.(this.i, this.scene.steps[this.i]);
  }

  /* ステップの静的な状態(ノードの強調・経路・吹き出し・説明)を整える */
  prepare() {
    NW = this.nw;
    const sc = this.scene, st = sc.steps[this.i];
    const hops = [st.source, ...(st.via || []), st.target].filter(Boolean);
    const kind = (STEP[st.type] || STEP.request)[1];
    this.kind = kind;
    // 経路を集める
    const segs = [];
    for (let k = 0; k < hops.length - 1; k++) {
      const a = hops[k], b = hops[k + 1];
      let hit = this.edges.find((x) => x.e.from === a && x.e.to === b);
      let rev = false;
      if (!hit) { hit = this.edges.find((x) => x.e.from === b && x.e.to === a); rev = !!hit; }
      if (hit) segs.push({ path: hit.base, rev, edge: hit });
      else {
        const p = this.pos.get(a), q = this.pos.get(b);
        if (p && q) {
          const g = s("path", { d: curve(p, q, 0.12).path, class: "fp-ghost" }, this.fx);
          segs.push({ path: g, rev: false, ghost: true });
        }
      }
    }
    this.fx.querySelectorAll(".fp-ghost").forEach((g) => { if (!segs.some((x) => x.path === g)) g.remove(); });
    this.segs = segs.map((x) => ({ ...x, len: x.path.getTotalLength() }));
    this.total = this.segs.reduce((a, b) => a + b.len, 0);
    const active = new Set(this.segs.filter((x) => x.edge).map((x) => x.edge));
    this.edges.forEach((x) => {
      const on = active.has(x);
      x.g.classList.toggle("on", on);
      x.g.classList.toggle("rev", on && this.segs.find((y) => y.edge === x)?.rev);
      x.g.classList.toggle("t-res", on && kind === "res");
      x.g.classList.toggle("t-probe", on && kind === "probe");
      if (!sc.undirected) x.base.setAttribute("marker-end", `url(#${this.uid}-${on ? "ao" : "a"})`);
      x.lab?.classList.toggle("on", on);
    });
    // 段階的に登場するノード・連携線・チップ(このステップより後のものは隠す)
    this.svg.querySelectorAll("[data-appear]").forEach((x) => {
      const a = Number(x.dataset.appear);
      x.classList.toggle("is-hidden", a > this.i);
      x.classList.toggle("is-new", a === this.i);
    });
    this.chips.forEach(({ g, k }) => {
      g.classList.toggle("is-hidden", k > this.i);
      g.classList.toggle("is-new", k === this.i);
    });
    // 状態(異常ノード)とメトリクス
    const down = new Set();
    const metrics = {};
    sc.steps.slice(0, this.i + 1).forEach((t) => {
      if (t.type === "healthChange") /unhealthy|異常|停止|障害/.test(t.label) ? down.add(t.source) : down.delete(t.source);
      for (const [k, v] of Object.entries(t.metrics || {})) metrics[k] = typeof v === "number" ? (metrics[k] || 0) + v : v;
    });
    this.nodes.forEach(({ g }, id) => {
      g.classList.toggle("is-src", id === st.source);
      g.classList.toggle("is-dst", id === (st.focus || st.target));
      g.classList.toggle("is-via", (st.via || []).includes(id));
      g.classList.toggle("is-dim", !hops.includes(id));
      g.classList.toggle("is-down", down.has(id));
      g.classList.remove("pop");
    });
    // 吹き出し
    this.bubT.textContent = st.label;
    const w = Math.min(300, textW(st.label, 12) + 26);
    this.bubR.setAttribute("width", w);
    this.bubR.setAttribute("x", -w / 2);
    let bx, by;
    if (this.total && this.segs.length) {
      const mid = this.pointAt(st.focus ? 0.25 : 0.5);
      bx = mid.x; by = mid.y - 24;
    } else {
      const p = this.pos.get(st.source);
      bx = p.px; by = p.py - NH / 2 - 22;
    }
    bx = Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, bx));
    by = Math.max(16, Math.min(H - 16, by));
    this.bub.setAttribute("class", `fp-bub t-${kind}`);
    this.bub.style.setProperty("--bx", bx + "px");
    this.bub.style.setProperty("--by", by + "px");
    this.bub.classList.remove("show");
    void this.bub.getBBox?.();
    requestAnimationFrame(() => this.bub.classList.add("show"));
    // パケットの色
    this.pk.setAttribute("class", `fp-packet t-${kind}`);
    this.ring.setAttribute("class", `fp-ring t-${kind}`);
    // 説明
    const [tn] = STEP[st.type] || STEP.request;
    const n = sc.steps.length;
    this.capt.replaceChildren(
      h("span", `fp-ty t-${kind}`, tn),
      h("b", "fp-ct", `STEP ${this.i + 1} / ${n}　${st.label}`),
      h("p", "", st.narration || ""),
    );
    const mk = Object.entries(metrics);
    if (mk.length) {
      const box = h("div", "fp-metrics");
      mk.forEach(([k, v]) => { const c = h("span", "fp-m"); c.append(h("small", "", METRIC[k] || k), h("b", "", String(v))); box.append(c); });
      this.capt.append(box);
    }
    this.btnPrev.disabled = this.i === 0;
    this.btnNext.disabled = this.i === n - 1;
    if (this.list) {
      this.list.querySelectorAll(".fp-row").forEach((r, k) => {
        r.classList.toggle("done", k < this.i);
        r.setAttribute("aria-current", String(k === this.i));
      });
      const cur = this.list.querySelector('[aria-current="true"]');
      // 横並びのステップ一覧: 現在のステップを中央へ(ページ自体はスクロールさせない)
      if (cur && this.list.scrollWidth > this.list.clientWidth) {
        const li = cur.parentElement;
        this.list.scrollTo({ left: li.offsetLeft - this.list.clientWidth / 2 + li.offsetWidth / 2, behavior: reduce() ? "auto" : "smooth" });
      }
    }
    this.travel = this.total ? Math.max(0.75, Math.min(1.9, (st.dur || 1300) / 1000 * 0.7 + this.total / 900)) : 1.0;
    this.hold = 0.9 + Math.min(1.4, (st.narration || "").length / 70);
  }

  pointAt(t) {
    let d = t * this.total;
    for (const sg of this.segs) {
      if (d <= sg.len || sg === this.segs[this.segs.length - 1]) {
        const at = Math.max(0, Math.min(sg.len, sg.rev ? sg.len - d : d));
        return sg.path.getPointAtLength(at);
      }
      d -= sg.len;
    }
    return { x: 0, y: 0 };
  }

  loop() {
    cancelAnimationFrame(this.raf);
    const tick = (now) => {
      const el = ((now - this.t0) * this.speed) / 1000;
      const n = this.scene.steps.length;
      const tr = this.travel, total = tr + this.hold;
      const p = Math.min(1, el / tr);
      this.drawFrame(p, el);
      const prog = (this.i + Math.min(1, el / total)) / n;
      this.fill.style.transform = `scaleX(${prog})`;
      if (this.single && el >= tr + 0.7) {
        this.single = false;
        this.phase = "done";
        this.drawFrame(1, tr + 0.7);
        return;
      }
      if (this.playing && el >= total) {
        if (this.i >= n - 1) { this.phase = "done"; this.pause(); this.fill.style.transform = "scaleX(1)"; this.opts.onEnd?.(); return; }
        this.i++;
        this.prepare();
        this.t0 = now;
        this.opts.onStep?.(this.i, this.scene.steps[this.i]);
      }
      if (this.playing || this.single) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  drawFrame(p, el) {
    NW = this.nw;
    const st = this.scene.steps[this.i];
    if (reduce()) p = 1;
    if (this.total) {
      const e = ease(p);
      this.pk.style.opacity = String(p >= 1 ? Math.max(0, 1 - (el - this.travel) * 3) : Math.min(1, p * 6));
      const head = this.pointAt(e);
      this.dot.setAttribute("cx", head.x); this.dot.setAttribute("cy", head.y);
      this.halo.setAttribute("cx", head.x); this.halo.setAttribute("cy", head.y);
      this.trail.forEach((c, k) => {
        const tt = Math.max(0, e - (k + 1) * 0.022);
        const q = this.pointAt(tt);
        c.setAttribute("cx", q.x); c.setAttribute("cy", q.y);
        c.setAttribute("opacity", e > 0.01 && p < 1 ? (0.5 * (1 - k / this.trail.length)).toFixed(3) : "0");
      });
      this.ring.style.opacity = "0";
      if (st.focus && e >= 0.5) {
        const fn = this.nodes.get(st.focus);
        if (fn && !fn.g.classList.contains("pop")) { fn.g.classList.add("pop"); }
      }
      if (st.focus && p < 1) this.ripple(st.focus, Math.max(0, (e - 0.5) * 2.2), e >= 0.5);
      if (p >= 1 && st.target && !st.focus) {
        const node = this.nodes.get(st.target);
        if (node && !node.g.classList.contains("pop")) node.g.classList.add("pop");
        this.ripple(st.target, Math.min(1, (el - this.travel) / 0.8));
      }
    } else {
      this.pk.style.opacity = "0";
      // 処理・判定: ノードのまわりで 2 回脈打つ
      this.ripple(st.source, (el % 1.05) / 1.05, el < 2.1 || this.playing);
    }
  }

  ripple(id, t, show = true) {
    const nd = this.pos.get(id);
    if (!nd || !show || t >= 1) { this.ring.style.opacity = "0"; return; }
    const k = outBack(Math.min(1, t)) * 14;
    this.ring.setAttribute("x", nd.px - NW / 2 - k);
    this.ring.setAttribute("y", nd.py - NH / 2 - k);
    this.ring.setAttribute("width", NW + 2 * k);
    this.ring.setAttribute("height", NH + 2 * k);
    this.ring.style.opacity = String(0.85 * (1 - t));
  }
}

const METRIC = {
  healthy: "正常なターゲット", unhealthy: "異常なターゲット", failureCountC: "C の連続失敗",
  routedA: "A への振り分け", A: "A への振り分け", B: "B への振り分け", C: "C への振り分け", selectedTarget: "選ばれた振り分け先",
};

export function fitFont(label, room = NW - 52) {
  const t = label.length > 15 ? label.slice(0, 14) + "…" : label;
  return Math.max(8.5, Math.min(13, room / textW(t, 1))).toFixed(1);
}
function textW(t, fs) { return [...String(t)].reduce((a, ch) => a + (/[ -~]/.test(ch) ? fs * 0.58 : fs * 1.02), 0); }

/** 2 つのノードの枠の外周を結ぶ、少し曲がった 2 次ベジェ曲線 */
function curve(a, b, bend) {
  const dx = b.px - a.px, dy = b.py - a.py, L = Math.hypot(dx, dy) || 1;
  const cx = (a.px + b.px) / 2 - (dy / L) * L * bend, cy = (a.py + b.py) / 2 + (dx / L) * L * bend;
  const p = edgePt(a, cx, cy), q = edgePt(b, cx, cy);
  const mx = 0.25 * p.x + 0.5 * cx + 0.25 * q.x, my = 0.25 * p.y + 0.5 * cy + 0.25 * q.y;
  return { path: `M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${q.x.toFixed(1)},${q.y.toFixed(1)}`, mx, my };
}
function edgePt(n, tx, ty) {
  const dx = tx - n.px, dy = ty - n.py;
  if (!dx && !dy) return { x: n.px, y: n.py };
  const sx = (NW / 2 + 5) / Math.abs(dx || 1e-9), sy = (NH / 2 + 5) / Math.abs(dy || 1e-9);
  const t = Math.min(sx, sy, 1);
  return { x: n.px + dx * t, y: n.py + dy * t };
}

/* ---------- サービスの連携を「一連の流れ」として組み立てる ---------- */
// リクエストが通る順番の目安(小さいほど利用者に近い)。連携データには通信の向きが無いため、サービスの役割から並べる
const TIER = {
  user: 0, internet: 0, onprem: 0, route53: 1, globalacc: 1, cloudfront: 2, lambdaedge: 2, shield: 2, amplify: 2,
  apigw: 3, alb: 3, nlb: 3, gwlb: 3, igw: 3, appsync: 3, cognito: 3, transfer: 3, vpn: 3, dx: 3, tgw: 3, natgw: 4.6, vpce: 4.6, rdsproxy: 5.6, dax: 5.8, elasticache: 5.8,
  ec2: 4, asg: 4, ecs: 4, eks: 4, fargate: 4, lambda: 4, beanstalk: 4, apprunner: 4, batch: 4, stepfn: 4.5,
  sqs: 5, sns: 5, eventbridge: 5, kinesis: 5, firehose: 5.5, mq: 5, msk: 5,
  glacier: 7, athena: 7, glue: 6.5, quicksight: 7.5, redshift: 7, emr: 7, lakeformation: 7,
};
const CAT_TIER = { ネットワーク: 3, コンピューティング: 4, アプリ統合: 5, "AI・機械学習": 4.5, データベース: 6, ストレージ: 6, 分析: 7, 移行: 6, IoT: 3, メディア: 5, "エンドユーザー・業務": 5 };
// 流れの途中に置くのではなく、サービスに「足す」設定・機能として表すもの
const ADDON = new Set(["iam", "kms", "acm", "waf", "shield", "cloudwatch", "cwlogs", "cloudtrail", "config", "secrets", "ssm", "xray", "guardduty", "macie", "inspector", "securityhub", "sts", "backup", "dlm", "privateca", "cloudhsm", "orgs", "sso", "accessanalyzer", "budgets", "ce", "trustedadvisor", "cfn", "cdk", "sam"]);
const isAddon = (id) => ADDON.has(id) || ["セキュリティ", "運用・管理", "コスト管理", "開発者ツール"].includes(svcById.get(id)?.cat);
const tierOf = (id) => TIER[id] ?? CAT_TIER[svcById.get(id)?.cat] ?? 5;
const related = (a, b) => a === b || relsOf(a).some((r) => r.id === b);
// 「必要な設定」の文から、追加する設定・機能の名前を取り出す(チップに表示)
const SETTING = [
  [/OAC|オリジンアクセスコントロール/, "OAC"], [/OAI/, "OAI"], [/バケットポリシー/, "バケットポリシー"], [/リソースベース(の)?ポリシー/, "リソースポリシー"], [/キーポリシー/, "キーポリシー"],
  [/実行ロール/, "実行ロール"], [/IAM ?ロール|ロール/, "IAM ロール"], [/IAM ?ポリシー|権限|許可/, "IAM 権限"], [/セキュリティグループ|SG/, "セキュリティグループ"],
  [/ターゲットグループ/, "ターゲットグループ"], [/ヘルスチェック/, "ヘルスチェック"], [/リスナー/, "リスナー"], [/証明書|ACM/, "証明書"], [/ルート表|ルートテーブル/, "ルート表"],
  [/サブネット/, "サブネット"], [/VPC ?エンドポイント/, "VPC エンドポイント"], [/イベント通知/, "イベント通知"], [/トリガー|イベントソースマッピング/, "トリガー"],
  [/暗号化|KMS/, "暗号化"], [/可視性タイムアウト/, "可視性タイムアウト"], [/DLQ|デッドレター/, "DLQ"], [/サブスクリプション/, "サブスクリプション"], [/キャッシュポリシー|キャッシュ/, "キャッシュ設定"],
  [/エイリアス/, "エイリアスレコード"], [/レコード/, "DNS レコード"], [/ライフサイクル/, "ライフサイクル"], [/バージョニング/, "バージョニング"], [/レプリケーション/, "レプリケーション"],
  [/起動テンプレート/, "起動テンプレート"], [/スケーリングポリシー/, "スケーリング"], [/パラメータグループ/, "パラメータグループ"], [/タグ/, "タグ"], [/オリジン/, "オリジン設定"],
  [/ステージ|デプロイ/, "デプロイ"], [/オーソライザー|認可/, "オーソライザー"], [/ルール/, "ルール"],
];
function settingsIn(text) {
  if (!text) return [];
  const hits = [];
  for (const [re, name] of SETTING) {
    const m = text.match(re);
    if (m && !hits.some((h) => h.name === name)) hits.push({ name, at: m.index });
  }
  return hits.sort((a, b) => a.at - b.at).slice(0, 2).map((h) => h.name);
}
const nm = (id, metaOf) => (id === "user" ? "ユーザー" : metaOf(id)?.name || id);

/** あるサービスを含む連携を、利用者側から奥へ向かう「一連の流れ」として再生する教材を作る。
 *  ・連携先をリクエストの通る順(TIER)に 1 列に並べ、隣どうしに実際の連携があるものだけをつなぐ
 *  ・つなぐ前に必要な設定(連携の詳細の need)があれば、「＋設定」のチップを足すステップを入れる
 *  ・IAM・KMS・監視などは流れに入れず、あとからサービスに「機能を追加」するステップで登場させる */
export function serviceScene(svc, rels, metaOf) {
  const me = svc.id;
  if (isAddon(me)) return addonScene(svc, rels, metaOf);
  const myTier = TIER[me] ?? CAT_TIER[svc.cat] ?? 5;
  const flowCands = rels.filter((r) => !isAddon(r.id) && svcById.has(r.id) && !["internet", "user", "onprem"].includes(r.id));
  const addonCands = rels.filter((r) => isAddon(r.id) && svcById.has(r.id) && r.id !== me);
  // 詳細解説のある連携を優先して選ぶ
  const ordered = (list, cmp) => [...list.filter((r) => r.detail).sort(cmp), ...list.filter((r) => !r.detail).sort(cmp)];
  // 左(利用者側)へ: 自分より手前の段から、直前のノードと実際に連携しているものを 2 つまで(同じ段は 1 つ)
  const left = [];
  let end = me;
  const leftCands = ordered(flowCands.filter((r) => tierOf(r.id) < myTier), (a, b) => tierOf(b.id) - tierOf(a.id));
  // すぐ手前には、入口(API・ロードバランサー)やコンピューティングを優先する(典型的なリクエストの経路になりやすい)
  const CORE = ["lambda", "ec2", "ecs", "apigw", "alb", "fargate", "eks"];
  const near = leftCands.find((r) => CORE.includes(r.id)) || leftCands.find((r) => tierOf(r.id) >= 3 && tierOf(r.id) <= 4.5) || leftCands[0];
  if (near) {
    left.push(near.id);
    end = near.id;
  }
  // さらに手前へ: 直前のノードの連携先から、入口になるサービスを 1 つ(API Gateway・ALB・CloudFront・Route 53 を優先)
  const ENTRY = ["apigw", "alb", "nlb", "cloudfront", "route53", "appsync"];
  if (near) {
    const ext = ordered(relsOf(end).filter((r) => svcById.has(r.id) && !isAddon(r.id) && r.id !== me && tierOf(r.id) < tierOf(end)), (a, b) => (ENTRY.includes(b.id) ? 1 : 0) - (ENTRY.includes(a.id) ? 1 : 0) || tierOf(b.id) - tierOf(a.id));
    const pick = ext.find((r) => ENTRY.includes(r.id)) || (tierOf(end) > 4.5 ? ext[0] : null);
    if (pick) {
      left.unshift(pick.id);
      end = pick.id;
    }
  }
  // 右(奥)へ: 自分より奥の段から、合計 5 ノードに収まるまで
  const right = [];
  end = me;
  const room = () => 5 - left.length - 1 - right.length - (left.length && tierOf(left[0]) <= 3 ? 1 : 0);
  ordered(flowCands.filter((r) => tierOf(r.id) >= myTier + 0.75), (a, b) => tierOf(a.id) - tierOf(b.id)).forEach((r) => {
    if (room() > 0 && right.length < 3 && tierOf(r.id) > tierOf(end) && related(end, r.id)) {
      right.push(r.id);
      end = r.id;
    }
  });
  let chain = [...left, me, ...right];
  // 入口のサービスなら、先頭に利用者を置く
  if (tierOf(chain[0]) <= 3 && tierOf(chain[0]) >= 1 && chain.length < 5) chain.unshift("user");
  // 流れが短すぎるときは、詳細のある連携先を奥に足す
  if (chain.filter((x) => x !== "user").length < 2) {
    const extra = ordered(flowCands.filter((r) => !chain.includes(r.id)), (a, b) => tierOf(a.id) - tierOf(b.id)).slice(0, 2).map((r) => r.id);
    chain = [...chain, ...extra];
  }
  const addons = addonCands.filter((r) => !chain.includes(r.id)).sort((a, b) => (b.detail?.need ? 1 : 0) - (a.detail?.need ? 1 : 0)).slice(0, 3).map((r) => r.id);
  const relOf = (id) => rels.find((r) => r.id === id);
  // 配置: 流れは横一列、追加する機能はサービスの下
  const N = chain.length;
  const xs = chain.map((_, i) => (N === 1 ? 50 : 4 + (i / (N - 1)) * 92));
  const nodes = chain.map((id, i) => ({ id, label: nm(id, metaOf), svc: id, x: xs[i], y: addons.length ? 26 : 50 }));
  const meX = xs[chain.indexOf(me)];
  const edges = [], steps = [];
  steps.push({ type: "process", source: me, target: null, label: `${svc.name} の役割`, narration: svc.summary || svc.purpose || "", dur: 1400 });
  // 流れを左から右へ。各区間で、必要な設定を足してからパケットを通す
  for (let i = 0; i < N - 1; i++) {
    const a = chain[i], b = chain[i + 1];
    const det = a === "user" ? null : linkDetail(a, b);
    const r = a === me ? relOf(b) : b === me ? relOf(a) : null;
    const set = settingsIn(det?.need);
    if (set.length) {
            // ロール・権限は呼び出す側(コンピューティング)に付けることが多い
      const host = set.some((x) => /ロール/.test(x)) && tierOf(a) >= 4 && tierOf(a) <= 4.5 ? a : b;
      steps.push({ type: "setup", source: host, target: null, chipOn: host, label: `${nm(host, metaOf)} に ${set.join("・")} を追加`, narration: det.need, chips: set, dur: 1200 });
    }
    edges.push({ from: a, to: b, label: "" });
    const rl = (r?.label || relsOf(a).find((x) => x.id === b)?.label || "").replace(/\(P\d+\)$/, "");
    const label = a === "user" ? `${nm(b, metaOf)} へアクセス` : `${nm(a, metaOf)} → ${nm(b, metaOf)}`;
    steps.push({ type: "request", source: a, target: b, label: label.length > 24 ? label.slice(0, 23) + "…" : label, narration: (rl && a !== "user" ? `【${rl}】` : "") + (det?.how || (a === "user" ? `利用者のリクエストは最初に ${nm(b, metaOf)} に届きます。` : `${nm(a, metaOf)} から ${nm(b, metaOf)} へ処理が進みます。`)), dur: 1600 });
  }
  // あとから足す機能(IAM・KMS・監視など)
  addons.forEach((id, k) => {
    const det = linkDetail(me, id);
    const r = relOf(id);
    const x = Math.max(6, Math.min(94, meX + (k - (addons.length - 1) / 2) * 26));
    const appear = steps.length;
    nodes.push({ id, label: nm(id, metaOf), svc: id, x, y: 74, appear, addon: true });
    edges.push({ from: id, to: me, label: "", appear, dashed: true });
    const set = settingsIn(det?.need);
    steps.push({ type: "addon", source: id, target: me, label: `＋ ${nm(id, metaOf)} を追加`, narration: [det?.how || r?.label || "", det?.need ? `必要な設定：${det.need}` : ""].filter(Boolean).join(" "), chips: set.length ? set : undefined, dur: 1500 });
  });
  const route = chain.map((id) => nm(id, metaOf)).join(" → ");
  steps.push({ type: "request", source: chain[0], via: chain.slice(1, -1), target: chain[N - 1], label: "通しで流す", dur: 2600, narration: `${route} の順に処理が流れます。${addons.length ? `${addons.map((id) => nm(id, metaOf)).join("・")} は、${svc.name} に機能として追加して使います。` : ""}`, dur: 1400 });
  return { id: "svc-" + me, title: `${svc.name} の連携`, nodes, edges, steps, curved: false, nodeWidth: N >= 5 ? 116 : N === 4 ? 128 : 138 };
}

/** IAM・KMS・監視などの「機能として足す」サービス: 使う側のサービスを並べ、順にこのサービスを追加していく */
function addonScene(svc, rels, metaOf) {
  const me = svc.id;
  const users = [...rels.filter((r) => r.detail && svcById.has(r.id)), ...rels.filter((r) => !r.detail && svcById.has(r.id))].filter((r) => r.id !== me).slice(0, 4);
  const N = users.length;
  const nodes = [{ id: me, label: svc.name, svc: me, x: 50, y: 74 }];
  const edges = [], steps = [];
  steps.push({ type: "process", source: me, target: null, label: `${svc.name} の役割`, narration: svc.summary || svc.purpose || "", dur: 1400 });
  users.forEach((r, i) => {
    const appear = steps.length;
    nodes.push({ id: r.id, label: nm(r.id, metaOf), svc: r.id, x: N === 1 ? 50 : 8 + (i / (N - 1)) * 84, y: 26, appear });
    edges.push({ from: me, to: r.id, label: "", appear, dashed: true });
    const det = r.detail;
    const set = settingsIn(det?.need);
    steps.push({ type: "addon", source: me, target: r.id, label: `${nm(r.id, metaOf)} に ${svc.name} を追加`, narration: [`【${r.label.replace(/\(P\d+\)$/, "")}】`, det?.how || "", det?.need ? `必要な設定：${det.need}` : ""].filter(Boolean).join(" "), chips: set.length ? set : undefined, dur: 1500 });
  });
  steps.push({ type: "process", source: me, target: null, label: "まとめ", narration: `${svc.name} は単独で動くのではなく、${users.map((r) => nm(r.id, metaOf)).join("・")} などのサービスに機能として追加して使います。`, dur: 1400 });
  return { id: "svc-" + me, title: `${svc.name} の連携`, nodes, edges, steps, curved: false, nodeWidth: N >= 4 ? 128 : 138 };
}

/** 構築問題の模範解答から教材を作る */
export function problemScene(pb, metaOf) {
  const ids = Object.keys(pb.layout);
  const nodes = ids.map((id) => ({ id, label: metaOf(id)?.name || id, svc: id, x: pb.layout[id][0], y: pb.layout[id][1] }));
  const edges = [];
  const slotOf = (k) => pb.slots.find((x) => x.k === k);
  const pick = (k) => slotOf(k)?.any.find((id) => ids.includes(id));
  pb.links.forEach(([a, b, label]) => {
    const x = pick(a), y = pick(b);
    if (x && y) edges.push({ from: x, to: y, label });
  });
  const steps = pb.flow.map(([from, to, label, narration]) => ({ type: "request", source: from, target: to, label, narration, dur: 1500 }));
  return { id: "pb-" + pb.id, title: pb.title, nodes, edges, steps };
}
