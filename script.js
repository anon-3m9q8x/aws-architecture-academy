import { additions } from "./data/catalog.js";
import "./practice.js";
import "./notebook.js";
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
function serviceCard(s) {
  const card = element("article", "card panel");
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
let scenes = [],
  scene = null,
  index = 0,
  timer = null,
  playing = false;
function stop() {
  clearTimeout(timer);
  timer = null;
  playing = false;
  $("play").textContent = "再生";
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
  $("assumptions").textContent =
    scene.assumptions ||
    "図と表示時間は教育用モデルです。公式仕様の最新レビューは未実施です。";
  $("seek").max = scene.steps.length - 1;
  render();
}
function svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el;
}
function render() {
  if (!scene) return;
  const step = scene.steps[index];
  const svg = svgEl("svg", {
    viewBox: "0 0 720 300",
    role: "img",
    "aria-label": `${scene.title}。${step.narration}`,
  });
  const nodes = new Map(
    scene.graph.nodes.map((n) => [
      n.id,
      { ...n, px: 75 + n.x * 5.7, py: 40 + n.y * 2.2 },
    ]),
  );
  scene.graph.edges.forEach((e) => {
    const a = nodes.get(e.from),
      b = nodes.get(e.to);
    const hops = [step.source, ...(step.via || []), step.target].filter(
      Boolean,
    );
    const active = hops.some(
      (id, i) =>
        i < hops.length - 1 &&
        ((id === e.from && hops[i + 1] === e.to) ||
          (id === e.to && hops[i + 1] === e.from)),
    );
    svg.append(
      svgEl("line", {
        x1: a.px,
        y1: a.py,
        x2: b.px,
        y2: b.py,
        class: active ? "active-edge" : "",
      }),
    );
  });
  const states = new Map();
  scene.steps.slice(0, index + 1).forEach((s) => {
    if (s.type === "healthChange" || s.type === "status")
      states.set(s.source, s.label);
  });
  nodes.forEach((n) => {
    const group = svgEl("g", {
      class: [
        n.id === step.source || n.id === step.target ? "active" : "",
        states.get(n.id) === "unhealthy" ? "error-node" : "",
      ].join(" "),
    });
    group.append(
      svgEl("rect", {
        x: n.px - 68,
        y: n.py - 25,
        width: 136,
        height: 50,
        rx: 8,
      }),
    );
    const label = svgEl("text", {
      x: n.px,
      y: n.py + 5,
      "text-anchor": "middle",
    });
    label.textContent =
      n.label === "Reverse Proxy / ALB" ? "Reverse Proxy / ALB" : n.label;
    label.setAttribute("font-size", n.label.length > 15 ? "11" : "13");
    group.append(label);
    svg.append(group);
  });
  $("graph").replaceChildren(svg);
  $("seek").value = index;
  $("step-number").textContent =
    `STEP ${index + 1} / ${scene.steps.length} · ${scene.id}`;
  $("step-title").textContent = step.label;
  $("narration").textContent = step.narration;
  $("previous").disabled = index === 0;
  $("next").disabled = index === scene.steps.length - 1;
  $("complete").disabled = index !== scene.steps.length - 1;
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
    scene.steps[index].durationMs / Number($("speed").value),
  );
}
$("play").addEventListener("click", () => {
  if (!scene) return;
  if (playing) {
    stop();
    return;
  }
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stop();
    index = Math.min(index + 1, scene.steps.length - 1);
    render();
    return;
  }
  if (index === scene.steps.length - 1) index = 0;
  playing = true;
  $("play").textContent = "一時停止";
  render();
  schedule();
});
$("speed").addEventListener("change", () => {
  if (playing) {
    clearTimeout(timer);
    schedule();
  }
});
$("next").addEventListener("click", () => {
  stop();
  index = Math.min(index + 1, scene.steps.length - 1);
  render();
});
$("previous").addEventListener("click", () => {
  stop();
  index = Math.max(index - 1, 0);
  render();
});
$("reset").addEventListener("click", () => {
  stop();
  index = 0;
  render();
});
$("seek").addEventListener("input", () => {
  stop();
  index = Number($("seek").value);
  render();
});
$("scene-select").addEventListener("change", () => {
  location.hash = `animation/${$("scene-select").value}`;
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
  window.dispatchEvent(new Event("learning-update"));
});
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
