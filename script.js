import { additions } from "./data/catalog.js";
import { notebook } from "./data/notebook.js";
import "./practice.js";
import "./notebook.js";
import "./academy.js";
const $ = (id) => document.getElementById(id);
const services = [
  [
    "Application Load Balancer (ALB)",
    "ネットワーク",
    "HTTP / HTTPS の要求をルールやターゲットの状態に応じて振り分ける L7 ロードバランサー。",
    "network",
    "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html",
    "PX-02",
  ],
  [
    "Amazon EC2",
    "コンピューティング",
    "仮想サーバーでアプリケーションを実行。配置先の AZ やネットワーク、アクセス権も設計します。",
    "network",
    "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html",
  ],
  [
    "Amazon S3",
    "ストレージ",
    "オブジェクトストレージ。バケットとキーでデータを管理し、ブロックストレージと区別します。",
    "storage",
    "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html",
  ],
  [
    "Amazon RDS",
    "データベース",
    "リレーショナルデータベースをマネージドで運用。高可用性と読み取り分散の目的を分けて考えます。",
    "database",
    "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html",
  ],
  [
    "Amazon DynamoDB",
    "データベース",
    "キー・バリューとドキュメントモデルに対応する NoSQL データベース。トランザクション API も備えます。",
    "database",
    "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html",
  ],
  [
    "Amazon CloudFront",
    "ネットワーク",
    "エッジロケーションを使うコンテンツ配信サービス。キャッシュキーとオリジンへのアクセス制御が重要です。",
    "network",
    "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html",
  ],
  [
    "AWS IAM",
    "セキュリティ",
    "誰がどのリソースに何をできるかを制御。ネットワークの到達性を許可する機能とは別です。",
    "security",
    "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html",
  ],
  [
    "Reverse Proxy",
    "一般概念",
    "受信側の代理としてリクエストを受け付ける仕組み。AWS 固有のサービス名ではありません。",
    "network",
    "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html",
    "PX-02",
  ],
  [
    "ヘルスチェック",
    "一般概念",
    "対象の状態を確認し、振り分け判断などに使う仕組み。確認方法やしきい値は構成によって異なります。",
    "security",
    "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html",
    "HC-01",
  ],
];
services.push(...additions);
const labels = {
  home: "ホーム",
  notebook: "学習ノート",
  connections: "連携を調べる",
  favorites: "お気に入り",
  practice: "資格問題演習",
  services: "サービス図鑑",
  animation: "アニメーション",
  roadmap: "ロードマップ",
  progress: "学習履歴",
};
let memory = {};
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    $("storage-warning").hidden = false;
    return memory[key] ?? fallback;
  }
}
function save(key, value) {
  memory[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    $("storage-warning").hidden = false;
  }
}
const uiKey = "aaa.ui.preferences.v1",
  progressKey = "aaa.step1.progress.v1";
let preferences = read(uiKey, {});
if (
  !preferences ||
  typeof preferences !== "object" ||
  Array.isArray(preferences)
)
  preferences = {};
let theme = ["light", "dark", "system"].includes(preferences.theme)
  ? preferences.theme
  : "system";
let history = read(progressKey, []);
if (!Array.isArray(history)) history = [];
history = history.filter(
  (x) =>
    x &&
    typeof x.id === "string" &&
    typeof x.title === "string" &&
    typeof x.at === "string" &&
    Number.isFinite(Date.parse(x.at)),
);
const media = matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  const resolved =
    theme === "system" ? (media.matches ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
  $("theme-toggle").textContent = resolved === "dark" ? "☼ ライト" : "☾ ダーク";
  $("theme-toggle").setAttribute(
    "aria-label",
    resolved === "dark"
      ? "ライトモードに切り替える"
      : "ダークモードに切り替える",
  );
  $("theme-system").setAttribute("aria-pressed", String(theme === "system"));
}
applyTheme();
media.addEventListener("change", applyTheme);
$("theme-toggle").addEventListener("click", () => {
  theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  save(uiKey, { ...preferences, theme });
  applyTheme();
});
$("theme-system").addEventListener("click", () => {
  theme = "system";
  save(uiKey, { ...preferences, theme });
  applyTheme();
});
function element(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}
const NB_INDEX = notebook.services
  .map((n) => [n.name.replace(/^(Amazon |AWS )/, "").replace(/\(.*\)$/, "").toLowerCase(), n.id])
  .sort((a, b) => b[0].length - a[0].length);
function noteIdFor(name) {
  const k = name.replace(/^(Amazon |AWS )/, "").replace(/\s*\(.*\)$/, "").toLowerCase();
  const exact = NB_INDEX.find(([n]) => n === k);
  if (exact) return exact[1];
  if (/application load balancer/.test(k)) return "alb";
  if (/network load balancer/.test(k)) return "nlb";
  const part = NB_INDEX.find(([n]) => n.length > 2 && k.startsWith(n));
  return part ? part[1] : null;
}
const CAT_CLASS = { ネットワーク: "c-violet", コンピューティング: "c-orange", データベース: "c-blue", ストレージ: "c-green", セキュリティ: "c-red", アプリ統合: "c-pink", 分析: "c-teal", "運用・管理": "c-slate", 一般概念: "c-gray" };
function serviceCard(s) {
  const card = element("article", `card panel svc-card ${CAT_CLASS[s[1]] || ""}`);
  const image = element(
    "span",
    `service-glyph glyph-${s[3]}`,
    s[0].includes("(ALB)")
      ? "ALB"
      : s[0]
          .replace(/^(Amazon |AWS )/, "")
          .split(" ")[0]
          .slice(0, 3)
          .toUpperCase(),
  );
  image.setAttribute("aria-hidden", "true");
  card.append(
    image,
    element("span", "eyebrow", s[1]),
    element("h3", "", s[0]),
    element("p", "", s[2]),
  );
  const nid = noteIdFor(s[0]);
  if (nid) {
    const nl = element("a", "card-note", "ノートで詳しく →");
    nl.href = `#notebook/${nid}`;
    card.append(nl);
  }
  const link = element("a", "", "AWS 公式ドキュメント ↗");
  link.href = s[4];
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  card.append(link);
  if (s[5]) {
    const scene = element("a", "", "動きを見る →");
    scene.href = `#animation/${s[5]}`;
    card.append(scene);
  }
  return card;
}
if ($("service-count"))
  $("service-count").textContent = services.filter(
    (s) => s[1] !== "一般概念",
  ).length;
[services[0], services[3], services[2]].forEach((s) =>
  $("featured").append(serviceCard(s)),
);
function filter() {
  const q = $("search").value.trim().toLocaleLowerCase();
  const result = services.filter(
    (s) =>
      (s[0] + s[1] + s[2]).toLocaleLowerCase().includes(q) &&
      ($("category").value === "all" || s[1] === $("category").value),
  );
  $("catalog").replaceChildren(...result.map(serviceCard));
  $("search-count").textContent =
    `${result.length} 件の教材${result.length ? "" : " — 条件を変えて検索してください。"}`;
}
$("search").addEventListener("input", filter);
$("category").addEventListener("change", filter);
filter();
const stages = [
  [
    "基本を知る",
    "サービス図鑑で、コンピューティング・ストレージ・ネットワークの役割をつかむ。",
    "図鑑を開く",
    "#services",
  ],
  [
    "通信をたどる",
    "Reverse Proxy・負荷分散・ヘルスチェックをステップごとに確認する。",
    "アニメーションを開く",
    "#animation",
  ],
  [
    "比較して設計する",
    "DB・ストレージの使い分けと構成シミュレーター。",
    "今後実装",
    null,
  ],
  [
    "問題で、理解を確かめる",
    "分野別の演習と誤答の復習で、サービスの選定理由を言語化する。",
    "問題演習を開く",
    "#practice",
  ],
];
stages.forEach((s, i) => {
  const c = element("article", "panel roadmap-item");
  c.append(element("span", "roadmap-number", `0${i + 1}`));
  const body = element("div");
  body.append(element("h2", "", s[0]), element("p", "", s[1]));
  const a = element(s[3] ? "a" : "span", s[3] ? "" : "pill", s[2]);
  if (s[3]) a.href = s[3];
  body.append(a);
  c.append(body);
  $("roadmap-list").append(c);
});
function updateHistory() {
  document
    .querySelectorAll(".completed-count")
    .forEach((el) => (el.textContent = new Set(history.map((x) => x.id)).size));
  $("history").replaceChildren();
  if (!history.length) {
    $("history").append(
      element("h2", "", "最初の学習を、ここから。"),
      element(
        "p",
        "muted",
        "まだ記録はありません。アニメーションを最後まで確認し、学習済みボタンで記録してください。",
      ),
    );
    const a = element("a", "", "教材を開く →");
    a.href = "#animation";
    $("history").append(a);
    return;
  }
  const ul = element("ul");
  history.forEach((h) => {
    const li = element("li");
    const a = element("a", "", h.title);
    a.href = `#animation/${h.id}`;
    li.append(
      a,
      element(
        "small",
        "",
        `学習済みとして記録 · ${new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(h.at))}`,
      ),
    );
    ul.append(li);
  });
  $("history").append(ul);
}
/* ===== アニメーション(構成をたどる) ===== */
const NODE_KIND = {
  EC2: ["orange", "EC2"], Lambda: ["orange", "λ"], ECS: ["orange", "ECS"],
  ALB: ["violet", "ALB"], NLB: ["violet", "NLB"], CloudFront: ["violet", "CF"], APIGW: ["pink", "API"],
  VPCE: ["violet", "EP"], NAT: ["violet", "NAT"], IGW: ["violet", "IGW"],
  RDS: ["blue", "RDS"], DynamoDB: ["blue", "DDB"], DAX: ["blue", "DAX"], ElastiCache: ["blue", "EC"],
  S3: ["green", "S3"], SQS: ["pink", "SQS"], SNS: ["pink", "SNS"], Cognito: ["red", "ID"],
  Internet: ["gray", "◎"],
};
const STEP_TYPE = {
  request: ["リクエスト", "req"], response: ["応答", "res"], process: ["処理", "proc"],
  probe: ["ヘルスチェック", "probe"], decision: ["判定", "proc"], healthChange: ["状態変化", "bad"], status: ["状態", "proc"],
};
const METRIC_LABEL = {
  healthy: "正常なターゲット", unhealthy: "異常なターゲット", failureCountC: "Cの連続失敗",
  routedA: "Aへの振り分け", A: "Aへの振り分け", B: "Bへの振り分け", C: "Cへの振り分け", selectedTarget: "選ばれた振り分け先",
};
let scenes = [],
  scene = null,
  index = 0,
  timer = null,
  playing = false,
  view = null,
  rafId = 0;
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function stop() {
  clearTimeout(timer);
  timer = null;
  playing = false;
  $("play").textContent = "▶ 再生";
  $("play").setAttribute("aria-pressed", "false");
  $("player")?.classList.remove("is-playing");
}
function svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el;
}
const NW = 136, NH = 50;
function border(a, b) {
  // a の矩形の外周上で、b の方向にある点
  const dx = b.px - a.px, dy = b.py - a.py;
  if (!dx && !dy) return { x: a.px, y: a.py };
  const sx = NW / 2 / Math.abs(dx || 1e-9), sy = NH / 2 / Math.abs(dy || 1e-9);
  const t = Math.min(sx, sy) + 0.04;
  return { x: a.px + dx * Math.min(t, 1), y: a.py + dy * Math.min(t, 1) };
}
function buildScene() {
  const svg = svgEl("svg", { viewBox: "0 -28 720 350", role: "img", class: "flow-svg" });
  const defs = svgEl("defs");
  [["arrow", "edge-arrow"], ["arrow-on", "edge-arrow on"]].forEach(([id, cls]) => {
    const m = svgEl("marker", { id: `${id}-${scene.id}`, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
    m.append(svgEl("path", { d: "M0,0 L10,5 L0,10 z", class: cls }));
    defs.append(m);
  });
  svg.append(defs);
  const nodes = new Map(scene.graph.nodes.map((n) => [n.id, { ...n, px: 75 + n.x * 5.7, py: 40 + n.y * 2.2 }]));
  const edgeLayer = svgEl("g", { class: "edges" }), nodeLayer = svgEl("g", { class: "nodes" }), fx = svgEl("g", { class: "fx" });
  const edges = scene.graph.edges.map((e) => {
    const a = nodes.get(e.from), b = nodes.get(e.to), p = border(a, b), q = border(b, a);
    const g = svgEl("g", { class: `edge kind-${e.kind || "request"}` });
    const line = svgEl("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, "marker-end": `url(#arrow-${scene.id})` });
    g.append(line);
    if (e.label) {
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      const t = svgEl("text", { x: mx, y: my - 6, "text-anchor": "middle", class: "edge-label", style: "--fs:10px" });
      t.textContent = e.label;
      g.append(t);
    }
    edgeLayer.append(g);
    return { e, g, line };
  });
  const nodeEls = new Map();
  nodes.forEach((n) => {
    const [color, abbr] = NODE_KIND[n.serviceKey] || (n.role === "actor" ? ["gray", "◎"] : ["blue", (n.serviceKey || n.label).slice(0, 3)]);
    const g = svgEl("g", { class: `node c-${color}`, transform: `translate(${n.px},${n.py})`, tabindex: "-1" });
    g.append(svgEl("rect", { class: "halo", x: -NW / 2 - 6, y: -NH / 2 - 6, width: NW + 12, height: NH + 12, rx: 14 }));
    g.append(svgEl("rect", { class: "box", x: -NW / 2, y: -NH / 2, width: NW, height: NH, rx: 10 }));
    g.append(svgEl("circle", { class: "badge", cx: -NW / 2 + 20, cy: 0, r: 13 }));
    const ab = svgEl("text", { class: "badge-text", x: -NW / 2 + 20, y: 4, "text-anchor": "middle" });
    ab.textContent = abbr;
    ab.style.setProperty("--fs", abbr.length > 2 ? "8.5px" : "11px");
    g.append(ab);
    const label = svgEl("text", { class: "node-label", x: 12, y: 4.5, "text-anchor": "middle" });
    label.textContent = n.label;
    label.style.setProperty("--fs", n.label.length > 13 ? "10px" : n.label.length > 9 ? "11.5px" : "13px");
    g.append(label);
    const x = svgEl("g", { class: "err-mark", transform: `translate(${NW / 2 - 6},${-NH / 2 + 6})` });
    x.append(svgEl("circle", { r: 9 }));
    const xt = svgEl("text", { y: 4, "text-anchor": "middle" });
    xt.textContent = "✕";
    x.append(xt);
    g.append(x);
    nodeLayer.append(g);
    nodeEls.set(n.id, g);
  });
  svg.append(edgeLayer, nodeLayer, fx);
  $("graph").replaceChildren(svg);
  // タイムライン
  const tl = $("timeline");
  tl.replaceChildren(
    ...scene.steps.map((s, i) => {
      const b = element("button", `tl-dot t-${(STEP_TYPE[s.type] || ["", "req"])[1]}`);
      b.type = "button";
      b.dataset.step = i;
      b.title = `STEP ${i + 1}：${s.label}`;
      b.setAttribute("aria-label", `STEP ${i + 1} ${s.label}`);
      return b;
    }),
  );
  const list = $("step-list");
  list.replaceChildren(
    ...scene.steps.map((s, i) => {
      const li = element("li");
      const b = element("button", "step-row");
      b.type = "button";
      b.dataset.step = i;
      b.append(element("span", "n", String(i + 1)), element("span", `tag t-${(STEP_TYPE[s.type] || ["", "req"])[1]}`, (STEP_TYPE[s.type] || ["処理"])[0]), element("span", "l", s.label));
      li.append(b);
      return li;
    }),
  );
  view = { svg, nodes, edges, nodeEls, fx };
}
function loadScene(id) {
  const next = scenes.find((s) => s.id === id) || scenes[0];
  if (!next || next === scene) return;
  stop();
  scene = next;
  index = 0;
  $("scene-select").value = scene.id;
  $("scene-title").textContent = scene.title;
  $("objective").textContent = scene.objective;
  $("accuracy").textContent = scene.awsAccuracyNote;
  $("assumptions").textContent = scene.assumptions || "図と表示時間は教育用モデルです。公式仕様の最新レビューは未実施です。";
  $("selection-rule").textContent = scene.selectionRule || "";
  $("selection-rule").parentElement.hidden = !scene.selectionRule;
  $("seek").max = scene.steps.length - 1;
  buildScene();
  document.querySelectorAll(".scene-chip").forEach((c) => c.setAttribute("aria-current", String(c.dataset.scene === scene.id)));
  try { localStorage.setItem("aaa.resume.scene", scene.id); } catch {}
  render();
}
function hopsOf(step) {
  return [step.source, ...(step.via || []), step.target].filter(Boolean);
}
function animatePacket(step) {
  cancelAnimationFrame(rafId);
  view.fx.replaceChildren();
  const hops = hopsOf(step);
  const kind = (STEP_TYPE[step.type] || ["", "req"])[1];
  const src = view.nodes.get(step.source);
  if (hops.length < 2) {
    // 処理・判定・状態変化: ノードの上に吹き出しと波紋
    const ring = svgEl("rect", { class: `pulse t-${kind}`, x: src.px - NW / 2, y: src.py - NH / 2, width: NW, height: NH, rx: 10 });
    view.fx.append(ring, bubble(src.px, src.py - NH / 2 - 14, step.label, kind));
    return;
  }
  const pts = [];
  for (let i = 0; i < hops.length - 1; i++) {
    const a = view.nodes.get(hops[i]), b = view.nodes.get(hops[i + 1]);
    pts.push([border(a, b), border(b, a)]);
  }
  const dot = svgEl("circle", { class: `packet t-${kind}`, r: 7 });
  const tail = svgEl("circle", { class: `packet-tail t-${kind}`, r: 12 });
  const mid = pts[Math.floor(pts.length / 2)];
  const bx = (mid[0].x + mid[1].x) / 2, by = Math.min(mid[0].y, mid[1].y) - 16;
  view.fx.append(tail, dot, bubble(bx, Math.max(-14, by), step.label, kind));
  const total = pts.reduce((s, [p, q]) => s + Math.hypot(q.x - p.x, q.y - p.y), 0) || 1;
  const place = (t) => {
    let d = t * total;
    for (const [p, q] of pts) {
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      if (d <= len || q === pts[pts.length - 1][1]) {
        const r = len ? Math.min(d / len, 1) : 1;
        const x = p.x + (q.x - p.x) * r, y = p.y + (q.y - p.y) * r;
        dot.setAttribute("cx", x); dot.setAttribute("cy", y);
        tail.setAttribute("cx", x); tail.setAttribute("cy", y);
        return;
      }
      d -= len;
    }
  };
  if (reduceMotion()) return place(1);
  const dur = Math.min(1500, Math.max(500, (step.durationMs || 900) / Number($("speed").value) * 0.75));
  const t0 = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    place(1 - Math.pow(1 - t, 2.2));
    if (t < 1) rafId = requestAnimationFrame(tick);
    else view.svg.querySelectorAll(`.node.arrive`).forEach((n) => n.classList.add("hit"));
  };
  place(0);
  rafId = requestAnimationFrame(tick);
}
function bubble(x, y, text, kind) {
  const g = svgEl("g", { class: `bubble t-${kind}`, transform: `translate(${x},${y})` });
  const t = svgEl("text", { "text-anchor": "middle", y: 4, style: "--fs:11px" });
  t.textContent = text;
  const w = Math.min(240, Math.max(56, [...text].reduce((s, ch) => s + (/[ -~]/.test(ch) ? 6.4 : 11.5), 0) + 18));
  g.append(svgEl("rect", { x: -w / 2, y: -11, width: w, height: 22, rx: 11 }), t);
  return g;
}
function render() {
  if (!scene || !view) return;
  const step = scene.steps[index];
  const hops = hopsOf(step);
  view.svg.setAttribute("aria-label", `${scene.title}。STEP ${index + 1}：${step.label}。${step.narration}`);
  view.edges.forEach(({ e, g, line }) => {
    let dir = 0;
    for (let i = 0; i < hops.length - 1; i++) {
      if (hops[i] === e.from && hops[i + 1] === e.to) dir = 1;
      if (hops[i] === e.to && hops[i + 1] === e.from) dir = -1;
    }
    g.classList.toggle("active", !!dir);
    g.classList.toggle("reverse", dir === -1);
    line.setAttribute("marker-end", `url(#${dir ? "arrow-on" : "arrow"}-${scene.id})`);
  });
  const states = new Map();
  const metrics = {};
  scene.steps.slice(0, index + 1).forEach((s) => {
    if (s.type === "healthChange" || s.type === "status") states.set(s.source, s.label);
    Object.entries(s.metricChanges || {}).forEach(([k, v]) => {
      if (typeof v === "number") metrics[k] = (metrics[k] || 0) + v;
      else metrics[k] = v;
    });
  });
  view.nodeEls.forEach((g, id) => {
    g.classList.toggle("src", id === step.source);
    g.classList.toggle("dst", id === step.target);
    g.classList.toggle("via", (step.via || []).includes(id));
    g.classList.toggle("dim", !hops.includes(id));
    g.classList.toggle("error-node", states.get(id) === "unhealthy");
    g.classList.remove("hit", "arrive");
    if (id === step.target) g.classList.add("arrive");
  });
  animatePacket(step);
  const mbox = $("metrics");
  const entries = Object.entries(metrics);
  mbox.hidden = !entries.length;
  mbox.replaceChildren(...entries.map(([k, v]) => {
    const c = element("span", "metric");
    c.append(element("small", "", METRIC_LABEL[k] || k), element("b", "", typeof v === "number" ? String(v) : String(v)));
    return c;
  }));
  $("seek").value = index;
  $("seek").style.setProperty("--p", scene.steps.length > 1 ? (index / (scene.steps.length - 1)) * 100 + "%" : "100%");
  const [tname, tcls] = STEP_TYPE[step.type] || ["処理", "proc"];
  $("step-number").textContent = `STEP ${index + 1} / ${scene.steps.length} · ${scene.id}`;
  $("step-type").textContent = tname;
  $("step-type").className = `step-type t-${tcls}`;
  $("step-title").textContent = step.label;
  $("narration").textContent = step.narration;
  $("previous").disabled = index === 0;
  $("next").disabled = index === scene.steps.length - 1;
  $("complete").disabled = index !== scene.steps.length - 1;
  document.querySelectorAll("#timeline .tl-dot").forEach((d, i) => {
    d.classList.toggle("done", i < index);
    d.classList.toggle("now", i === index);
  });
  document.querySelectorAll("#step-list .step-row").forEach((r, i) => {
    r.classList.toggle("done", i < index);
    r.setAttribute("aria-current", String(i === index));
  });
  const nowRow = document.querySelector('#step-list .step-row[aria-current="true"]');
  const sl = $("step-list");
  if (nowRow && sl.scrollHeight > sl.clientHeight) {
    const top = nowRow.offsetTop - sl.clientHeight / 2 + nowRow.offsetHeight / 2;
    sl.scrollTo({ top, behavior: reduceMotion() ? "auto" : "smooth" });
  }
  $("complete-status").textContent = history.some((h) => h.id === scene.id)
    ? "この教材は記録済みです。"
    : index === scene.steps.length - 1
      ? "内容を理解できたら記録してください。"
      : "最後のステップまで確認すると記録できます。";
}
function schedule() {
  timer = setTimeout(
    () => {
      if (index >= scene.steps.length - 1) {
        stop();
        return;
      }
      index++;
      render();
      if (index === scene.steps.length - 1) stop();
      else schedule();
    },
    Math.max(scene.steps[index].durationMs || 900, 1300) / Number($("speed").value),
  );
}
function togglePlay() {
  if (!scene) return;
  if (playing) {
    stop();
    return;
  }
  if (reduceMotion()) {
    stop();
    index = Math.min(index + 1, scene.steps.length - 1);
    render();
    return;
  }
  if (index === scene.steps.length - 1) index = 0;
  playing = true;
  $("play").textContent = "❚❚ 一時停止";
  $("play").setAttribute("aria-pressed", "true");
  $("player").classList.add("is-playing");
  render();
  schedule();
}
$("play").addEventListener("click", togglePlay);
$("speed").addEventListener("change", () => {
  if (playing) {
    clearTimeout(timer);
    schedule();
  }
});
function stepTo(i) {
  stop();
  index = Math.max(0, Math.min(i, scene.steps.length - 1));
  render();
}
$("next").addEventListener("click", () => stepTo(index + 1));
$("previous").addEventListener("click", () => stepTo(index - 1));
$("reset").addEventListener("click", () => stepTo(0));
$("seek").addEventListener("input", () => stepTo(Number($("seek").value)));
for (const id of ["timeline", "step-list"])
  $(id).addEventListener("click", (e) => {
    const b = e.target.closest("[data-step]");
    if (b) stepTo(Number(b.dataset.step));
  });
$("scene-select").addEventListener("change", () => {
  location.hash = `animation/${$("scene-select").value}`;
});
document.addEventListener("keydown", (e) => {
  if ($("animation").hidden || !scene || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = document.activeElement?.tagName;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(tag) && document.activeElement.id !== "seek") return;
  if (e.key === " " && tag !== "BUTTON") {
    e.preventDefault();
    togglePlay();
  } else if (e.key === "ArrowRight" && document.activeElement.id !== "seek") {
    e.preventDefault();
    stepTo(index + 1);
  } else if (e.key === "ArrowLeft" && document.activeElement.id !== "seek") {
    e.preventDefault();
    stepTo(index - 1);
  } else if (e.key === "Home") {
    e.preventDefault();
    stepTo(0);
  }
});
$("complete").addEventListener("click", () => {
  if (!scene || index !== scene.steps.length - 1) return;
  history = [
    { id: scene.id, title: scene.title, at: new Date().toISOString() },
    ...history.filter((h) => h.id !== scene.id),
  ];
  save(progressKey, history);
  updateHistory();
  render();
  renderSceneChips();
  window.dispatchEvent(new Event("learning-update"));
  window.dispatchEvent(new CustomEvent("toast", { detail: `「${scene.title}」を学習済みにしました` }));
});
function renderSceneChips() {
  const done = new Set(history.map((h) => h.id));
  $("scene-chips").replaceChildren(
    ...scenes.map((s, i) => {
      const a = element("a", `scene-chip${done.has(s.id) ? " done" : ""}`);
      a.href = `#animation/${s.id}`;
      a.dataset.scene = s.id;
      a.setAttribute("aria-current", String(scene?.id === s.id));
      a.append(element("span", "n", done.has(s.id) ? "✓" : String(i + 1).padStart(2, "0")), element("span", "t", s.title));
      return a;
    }),
  );
}
function route() {
  const [requested, id] = location.hash.slice(1).split("/");
  const page = Object.hasOwn(labels, requested) ? requested : "home";
  document
    .querySelectorAll(".page")
    .forEach((el) => (el.hidden = el.id !== page));
  document.querySelectorAll("[data-page]").forEach((el) => {
    if (el.dataset.page === page) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  $("page-label").textContent = labels[page];
  document.title = `${labels[page]} | AWS Architecture Academy`;
  if (page === "animation") {
    if (id) loadScene(id);
  } else stop();
  window.dispatchEvent(new CustomEvent("route-change", { detail: { page, id } }));
}
window.addEventListener("hashchange", route);
updateHistory();
route();
async function fetchScenes() {
  try {
    const response = await fetch("data/scenes.json");
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.scenes) || data.scenes.length === 0)
      throw Error("教材が空です");
    for (const s of data.scenes) {
      const ids = new Set(s.graph.nodes.map((n) => n.id));
      if (
        !s.steps.length ||
        s.graph.edges.some((e) => !ids.has(e.from) || !ids.has(e.to)) ||
        s.steps.some(
          (t) => !ids.has(t.source) || (t.target && !ids.has(t.target)),
        )
      )
        throw Error("教材の参照不正");
    }
    scenes = data.scenes;
    $("scene-count").textContent = scenes.length;
    $("scene-select").replaceChildren(
      ...scenes.map((s) => {
        const o = element("option", "", s.title);
        o.value = s.id;
        return o;
      }),
    );
    $("loading").hidden = true;
    $("player").hidden = false;
    loadScene(location.hash.split("/")[1]);
    renderSceneChips();
  } catch {
    const message = element(
      "span",
      "",
      "教材を読み込めません。HTTP サーバー経由で開いてください。 ",
    );
    const retry = element("button", "", "再試行");
    retry.addEventListener("click", fetchScenes);
    $("loading").replaceChildren(message, retry);
    $("player").hidden = true;
    $("scene-count").textContent = "読込失敗";
  }
}
fetchScenes();
