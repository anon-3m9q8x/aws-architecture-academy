// ホーム(学習の続き・今週の回答数・おすすめ)、全体検索、「連携を調べる」。
// 旧・学習ノートのページは廃止し、内容はサービス図鑑に統合した(メモは memo.js)。
import { notebook } from "./data/notebook.js";
import { questions } from "./data/questions.js";
import { BUILD } from "./data/build.js";
import { serviceCount, byId as svcById } from "./services.js";
import { memo } from "./memo.js";
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const byId = new Map(notebook.services.map((s) => [s.id, s]));
function noteLink(id, label) {
  const a = el("a", "", label || byId.get(id).name);
  a.href = `#services/${id}`;
  return a;
}
$("global-search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const q = $("global-search").value.trim();
  window.dispatchEvent(new CustomEvent("explorer-search", { detail: q }));
  location.hash = "services";
});
for (const id of ["connection-from", "connection-to"])
  notebook.services.forEach((s) => {
    const o = el("option", "", s.name);
    o.value = s.id;
    $(id).append(o);
  });
$("connection-from").value = "s3";
$("connection-to").value = "lambda";
function findPath(a, b) {
  if (a === b) return [];
  const queue = [a],
    visited = new Map([[a, null]]);
  while (queue.length) {
    const x = queue.shift();
    if (x === b) break;
    for (const edge of notebook.edges) {
      if (edge.from !== x && edge.to !== x) continue;
      const other = edge.from === x ? edge.to : edge.from;
      if (visited.has(other)) continue;
      visited.set(other, { previous: x, edge });
      queue.push(other);
    }
  }
  if (!visited.has(b)) return null;
  const steps = [];
  for (let at = b; at !== a; ) {
    const step = visited.get(at);
    steps.unshift({ ...step, from: step.previous, to: at });
    at = step.previous;
  }
  return steps;
}
function renderConnection() {
  const a = $("connection-from").value,
    b = $("connection-to").value,
    path = findPath(a, b),
    box = $("connection-result");
  box.replaceChildren();
  if (path === null) {
    box.append(
      el("h2", "", "登録された関連は見つかりませんでした"),
      el(
        "p",
        "muted",
        "関連データがないことは、連携できないことを意味しません。",
      ),
    );
    return;
  }
  if (a === b) {
    box.append(el("p", "", "異なる2つの項目を選んでください。"));
    return;
  }
  box.append(
    el("p", "eyebrow", `${path.length} STEP CONNECTION`),
    el("h2", "", `${byId.get(a).name} と ${byId.get(b).name}`),
  );
  const list = el("ol", "connection-path");
  path.forEach((step) => {
    const item = el("li");
    const row = el("div", "path-nodes");
    row.append(
      noteLink(step.from),
      el("span", "", step.edge.from === step.from ? "→" : "←"),
      noteLink(step.to),
    );
    item.append(row, el("p", "", step.edge.label));
    list.append(item);
  });
  box.append(
    list,
    el(
      "p",
      "muted",
      "矢印は元資料にある関連の向きです。逆向きの関連も検索対象です。最短の関連数を探すものであり、実際の通信経路・認可・料金を検証するものではありません。",
    ),
  );
}
$("connection-find").addEventListener("click", renderConnection);
function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
}
function updateDashboard() {
  const sceneHistory = readJson("aaa.step1.progress.v1", []),
    raw = readJson("aaa.practice.attempts.v1", []),
    build = readJson("aaa.build.v1", {});
  const attempts = Array.isArray(raw)
    ? raw.filter((a) => a && Number.isFinite(Date.parse(a.at)))
    : [];
  const answered = new Set(attempts.map((a) => a.id));
  const solved = Object.values(build || {}).filter((r) => r && r.ok).length;
  const tracks = [
    ["連携を動きで見る、サービス図鑑", `${serviceCount} サービス・連携アニメーション`, Math.min(readJson("aaa.ex.viewed", []).length, serviceCount), serviceCount, "#services", "animation"],
    ["要件から組み立てる、構築問題", `${BUILD.length} 問・置いてつないで採点`, solved, BUILD.length, "#build", "notes"],
    ["問題で確かめる、資格問題演習", `${questions.length} 問・全 13 資格`, answered.size, questions.length, "#practice", "practice"],
    ["学習済みにしたサービス", `図鑑でメモと学習済みを記録`, memo.doneCount(), serviceCount, "#services", "animation"],
  ];
  void sceneHistory;
  const box = $("learning-tracks");
  box.replaceChildren(
    ...tracks.map((t) => {
      const row = el("article", "learning-track");
      const thumb = el("div", `track-thumb ${t[5]}`);
      thumb.append(
        el(
          "span",
          "",
          t[5] === "notes" ? "⬡" : t[5] === "animation" ? "▷" : "✓",
        ),
      );
      const title = el("div", "track-title");
      title.append(el("h3", "", t[0]), el("p", "", t[1]));
      const progress = el("div", "track-progress");
      const bar = el("progress");
      bar.max = t[3];
      bar.value = t[2];
      bar.setAttribute("aria-label", t[0] + "の進捗");
      progress.append(bar, el("small", "", `${t[2]} / ${t[3]}`));
      const a = el("a", "continue-button", "学習する");
      a.href = t[4];
      row.append(thumb, title, progress, a);
      return row;
    }),
  );
  const chart = $("weekly-chart");
  chart.replaceChildren();
  let total = 0;
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - i,
    );
    const next = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1,
    );
    const n = attempts.filter((a) => {
      const d = new Date(a.at);
      return d >= date && d < next;
    }).length;
    total += n;
    const col = el("div", "chart-column");
    col.append(el("span", "chart-value", n));
    const bar = el("div", "chart-bar");
    bar.dataset.value = n;
    col.append(
      bar,
      el(
        "span",
        "chart-day",
        new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date),
      ),
    );
    col.setAttribute(
      "aria-label",
      `${date.getMonth() + 1}月${date.getDate()}日 ${n} 回答`,
    );
    chart.append(col);
  }
  const max = Math.max(
    1,
    ...[...chart.querySelectorAll(".chart-bar")].map((b) =>
      Number(b.dataset.value),
    ),
  );
  chart
    .querySelectorAll(".chart-bar")
    .forEach(
      (bar) =>
        (bar.style.height = `${(Number(bar.dataset.value) / max) * 110}px`),
    );
  $("weekly-summary").textContent =
    `直近7日間に ${total} 回答${total ? "。少しずつ、着実に。" : "。最初の一問からはじめましょう。"}`;
}
["cloudfront", "sqs", "rdsproxy"].forEach((id) => {
  const s = svcById.get(id);
  const row = el("article", "recommendation");
  row.append(el("span", `svc-glyph c-${s.color}`, s.abbr));
  const text = el("div");
  const a = el("a", "", s.name);
  a.href = `#services/${id}`;
  text.append(a, el("p", "", s.purpose));
  row.append(text);
  $("recommended-notes").append(row);
});
function route() {
  const [page, id] = location.hash.slice(1).split("/");
  if (page === "connections") {
    if (byId.has(id)) $("connection-from").value = id;
    renderConnection();
  }
}
window.addEventListener("hashchange", route);
window.addEventListener("learning-update", updateDashboard);
renderConnection();
updateDashboard();
route();
