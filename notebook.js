import { notebook } from "./data/notebook.js";
import { questions } from "./data/questions.js";
import { cues } from "./data/cues.js";
import { relatedNotes } from "./practice.js";
import { serviceCount } from "./services.js";
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const byId = new Map(notebook.services.map((s) => [s.id, s]));
const storageKey = "aaa.notebook.v1";
let state = { notes: {}, favorites: [], completed: [] },
  storageAvailable = true;
function sanitize(raw) {
  const clean = { notes: {}, favorites: [], completed: [] };
  if (!raw || typeof raw !== "object") return clean;
  if (raw.notes && typeof raw.notes === "object")
    for (const [id, text] of Object.entries(raw.notes))
      if (byId.has(id) && typeof text === "string" && text.length <= 20000)
        clean.notes[id] = text;
  for (const key of ["favorites", "completed"])
    if (Array.isArray(raw[key]))
      clean[key] = [...new Set(raw[key].filter((id) => byId.has(id)))];
  return clean;
}
try {
  state = sanitize(JSON.parse(localStorage.getItem(storageKey) || "null"));
} catch {
  storageAvailable = false;
  $("storage-warning").hidden = false;
}
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
    $("storage-warning").hidden = false;
  }
  updateDashboard();
  renderFavorites();
}
let selected = "ec2";
const categoryColors = {
  コンピューティング: "orange",
  ストレージ: "green",
  データベース: "violet",
  ネットワーク: "blue",
  セキュリティ: "coral",
};
function icon(s) {
  return el(
    "span",
    `note-icon ${categoryColors[s.category] || "blue"}`,
    s.name.replace(/^(Amazon |AWS )/, "").slice(0, 3),
  );
}
function noteLink(id, label) {
  const a = el("a", "", label || byId.get(id).name);
  a.href = `#notebook/${id}`;
  return a;
}
function section(title) {
  const c = el("section", "note-section");
  c.append(el("h2", "", title));
  return c;
}
function bullet(items) {
  const ul = el("ul");
  items.forEach((t) => ul.append(el("li", "", t)));
  return ul;
}
function visibleList() {
  const q = $("notebook-search").value.trim().toLowerCase();
  const category = $("notebook-category").value;
  return notebook.services.filter(
    (s) =>
      (category === "all" || s.category === category) &&
      [s.name, s.category, s.tip, s.purpose, s.useCases, ...s.features].join(" ").toLowerCase().includes(q),
  );
}
function renderIndex() {
  const q = $("notebook-search").value.trim().toLowerCase();
  const category = $("notebook-category").value;
  const list = notebook.services.filter(
    (s) =>
      (category === "all" || s.category === category) &&
      [s.name, s.category, s.tip, s.purpose, s.useCases, ...s.features]
        .join(" ")
        .toLowerCase()
        .includes(q),
  );
  $("notebook-count").textContent =
    `${list.length} / ${notebook.services.length} 項目`;
  $("notebook-list").replaceChildren(
    ...list.map((s) => {
      const a = noteLink(s.id);
      a.className = "notebook-index-item";
      a.replaceChildren(icon(s));
      const text = el("span");
      text.append(el("strong", "", s.name), el("small", "", s.category));
      a.append(text);
      if (state.completed.includes(s.id))
        a.append(el("span", "note-check", "✓"));
      if (s.id === selected) a.setAttribute("aria-current", "true");
      return a;
    }),
  );
  if (!list.length)
    $("notebook-list").append(
      el("p", "muted", "見つかりません。検索条件を変えてください。"),
    );
  placeIndexPill();
}
// 選択中の項目へスライドする表示 + 一覧の自動スクロール
const idxPill = el("span", "idx-pill");
let idxPrev = null;
function placeIndexPill() {
  const list = $("notebook-list");
  if (!idxPill.isConnected || idxPill.parentNode !== list) list.prepend(idxPill);
  const a = list.querySelector('[aria-current="true"]');
  if (!a || !a.offsetHeight) {
    idxPill.style.opacity = "0";
    return;
  }
  const y = a.offsetTop, h = a.offsetHeight, w = a.offsetWidth;
  const animate = idxPrev && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  idxPill.style.transition = "none";
  if (animate) idxPill.style.transform = `translateY(${idxPrev.y}px)`;
  idxPill.getBoundingClientRect();
  idxPill.style.transition = animate ? "" : "none";
  idxPill.style.transform = `translateY(${y}px)`;
  idxPill.style.height = h + "px";
  idxPill.style.width = w + "px";
  idxPill.style.opacity = "1";
  idxPrev = { y };
  const sc = list.closest(".notebook-index");
  const scroller = [list, sc].find((n) => n && n.scrollHeight > n.clientHeight + 2 && getComputedStyle(n).overflowY !== "visible");
  if (scroller) {
    const r = a.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
    if (r.top < sr.top + 8 || r.bottom > sr.bottom - 8)
      scroller.scrollBy({ top: r.top - sr.top - sr.height / 2 + r.height / 2, behavior: animate ? "smooth" : "auto" });
  }
}
window.addEventListener("resize", () => {
  idxPrev = null;
  placeIndexPill();
});
$("notebook-list").addEventListener("keydown", (e) => {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const items = [...$("notebook-list").querySelectorAll(".notebook-index-item")];
  const i = items.indexOf(document.activeElement);
  const n = items[Math.max(0, Math.min(items.length - 1, (i < 0 ? items.findIndex((x) => x.getAttribute("aria-current") === "true") : i) + (e.key === "ArrowDown" ? 1 : -1)))];
  if (n) {
    e.preventDefault();
    location.hash = n.getAttribute("href").slice(1);
    setTimeout(() => $("notebook-list").querySelector(`[href="${n.getAttribute("href")}"]`)?.focus({ preventScroll: true }), 0);
  }
});
function renderDetail(id) {
  const s = byId.get(id);
  const box = $("notebook-detail");
  box.replaceChildren();
  if (!s) {
    box.append(
      el("h2", "", "ノートが見つかりません"),
      noteLink("ec2", "EC2から学習をはじめる →"),
    );
    return;
  }
  selected = id;
  renderIndex();
  const heading = el("div", "note-heading");
  const titles = el("div");
  titles.append(el("p", "eyebrow", s.category), el("h2", "", s.name));
  const toEx = el("a", "button ghost note-ex", "図鑑で連携アニメーションを見る →");
  toEx.href = `#services/${id}`;
  heading.append(titles, toEx);
  box.append(heading, el("p", "note-purpose", s.purpose));
  const cue = cues[id];
  if (cue) {
    const c = el("section", "cue-card");
    c.append(el("p", "eyebrow", "EXAM CUES · この言葉が出たら"));
    const ws = el("div", "cue-words");
    cue.words.forEach((w) => ws.append(el("span", "cue-word", w)));
    c.append(ws);
    if (cue.not) {
      const n = el("p", "cue-not");
      n.append(el("b", "", "選ばないとき "), document.createTextNode(cue.not));
      c.append(n);
    }
    box.append(c);
  }
  if (s.features.length) {
    const c = section("何ができる？");
    c.append(bullet(s.features));
    box.append(c);
  }
  if (s.useCases) {
    const c = section("こんなときに使う");
    c.append(el("p", "", s.useCases));
    box.append(c);
  }
  const tip = section("学習のポイント");
  tip.append(el("p", "note-tip", s.tip));
  box.append(tip);
  const comparisons = notebook.comparisons.filter(
    (c) => c.a === id || c.b === id,
  );
  if (comparisons.length) {
    const c = section("似たサービスとの違い");
    comparisons.forEach((item) => {
      const other = item.a === id ? item.b : item.a;
      const row = el("div", "comparison-note");
      row.append(noteLink(other), el("p", "", item.text));
      c.append(row);
    });
    box.append(c);
  }
  const links = notebook.edges.filter((e) => e.from === id || e.to === id);
  if (links.length) {
    const c = section("ほかのサービスとどうつながる？");
    c.append(
      el(
        "p",
        "muted",
        "役割の関連を示しています。データ通信だけでなく、設定・認証・管理の関係も含みます。",
      ),
    );
    box.append(c);
    c.append(relationDiagram(id, links));
    const list = el("div", "relationship-list");
    links.slice(0, 15).forEach((edge) => {
      const other = edge.from === id ? edge.to : edge.from;
      const row = el("div", "relationship-item");
      row.append(noteLink(other), el("span", "", edge.label));
      list.append(row);
    });
    c.append(list);
    const a = el("a", "text-link", "2つのサービスの関連を調べる →");
    a.href = `#connections/${id}`;
    c.append(a);
  }
  const qs = questionsFor(id);
  if (qs.length) {
    const c = section("このサービスが出てくる問題");
    const last = practiceLatest();
    const ul = el("ul", "note-questions");
    qs.slice(0, 6).forEach((q) => {
      const st = last.get(q.id);
      const li = el("li", st ? (st.correct ? "ok" : "ng") : "");
      li.append(el("span", "mark", st ? (st.correct ? "✓" : "×") : "・"), el("span", "", q.prompt));
      ul.append(li);
    });
    c.append(ul);
    const b = el("button", "primary", `この${qs.length}問を解く →`);
    b.addEventListener("click", () => {
      location.hash = "practice";
      window.dispatchEvent(new CustomEvent("practice-preset", { detail: { ids: qs.map((q) => q.id), label: `${s.name} の問題` } }));
    });
    c.append(b);
    box.append(c);
  }
  const memo = section("自分の言葉で、メモする");
  memo.append(
    el(
      "p",
      "muted",
      "気づいたことや迷った点を残しましょう。このブラウザだけに保存されます。",
    ),
  );
  const label = el("label", "sr-only", "学習メモ");
  label.htmlFor = "service-memo";
  const textarea = el("textarea");
  textarea.id = "service-memo";
  textarea.rows = 5;
  textarea.maxLength = 20000;
  textarea.placeholder = "例：Multi-AZとRead Replicaの目的は違う…";
  textarea.value = state.notes[id] || "";
  const status = el("span", "memo-status");
  status.setAttribute("role", "status");
  textarea.addEventListener("input", () => {
    state.notes[id] = textarea.value;
    save();
    status.textContent = storageAvailable
      ? "保存済み"
      : "このタブ内だけに保持しています";
  });
  memo.append(label, textarea, status);
  box.append(memo);
  const done = el(
    "button",
    "primary",
    state.completed.includes(id)
      ? "✓ 学習済みを取り消す"
      : "このノートを学習済みにする",
  );
  done.id = "note-complete";
  done.setAttribute("aria-pressed", String(state.completed.includes(id)));
  done.addEventListener("click", () => {
    state.completed = state.completed.includes(id)
      ? state.completed.filter((x) => x !== id)
      : [...state.completed, id];
    save();
    renderDetail(id);
  });
  const pager = el("nav", "note-pager");
  const order = visibleList();
  const at = order.findIndex((x) => x.id === id);
  const prev = order[at - 1], next = order[at + 1];
  if (prev) pager.append(noteLink(prev.id, `← ${prev.name}`));
  else pager.append(el("span"));
  if (next) pager.append(noteLink(next.id, `${next.name} →`));
  box.append(done, pager, el("p", "note-provenance", s.provenance));
}
function practiceLatest() {
  const map = new Map();
  try {
    const raw = JSON.parse(localStorage.getItem("aaa.practice.attempts.v1") || "[]");
    if (Array.isArray(raw)) raw.forEach((a) => a && a.id && map.set(a.id, a));
  } catch {}
  return map;
}
const qIndex = new Map();
questions.forEach((q) => relatedNotes(q).forEach((nid) => {
  if (!qIndex.has(nid)) qIndex.set(nid, []);
  qIndex.get(nid).push(q);
}));
function questionsFor(id) {
  return qIndex.get(id) || [];
}
// 関連サービスを放射状に描くミニ図
function relationDiagram(id, links) {
  const NS = "http://www.w3.org/2000/svg";
  const mk = (t, a) => {
    const n = document.createElementNS(NS, t);
    Object.entries(a).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  };
  const seen = new Map();
  links.forEach((e) => {
    const o = e.from === id ? e.to : e.from;
    if (o === id || !byId.has(o)) return;
    if (seen.has(o)) seen.get(o).label += " / " + e.label;
    else seen.set(o, { from: id, to: o, label: e.label });
  });
  const items = [...seen.values()].slice(0, 10);
  const W = 560, H = 260, cx = W / 2, cy = H / 2;
  const svg = mk("svg", { viewBox: `0 0 ${W} ${H}`, class: "rel-svg", role: "img", "aria-label": `${byId.get(id).name}と関連する${items.length}項目の図` });
  items.forEach((e, i) => {
    const other = e.from === id ? e.to : e.from;
    const ang = (i / items.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(ang) * 205, y = cy + Math.sin(ang) * 100;
    const line = mk("line", { x1: cx, y1: cy, x2: x, y2: y, class: "rel-line", style: `--d:${i * 60}ms` });
    svg.append(line);
    const a = mk("a", { href: `#notebook/${other}`, class: "rel-node", style: `--d:${i * 60 + 120}ms` });
    const name = byId.get(other).name;
    const w = Math.min(130, Math.max(54, [...name].reduce((s, ch) => s + (/[ -~]/.test(ch) ? 7 : 12), 0) + 18));
    a.append(mk("rect", { x: x - w / 2, y: y - 14, width: w, height: 28, rx: 14 }));
    const t = mk("text", { x, y: y + 4.5, "text-anchor": "middle" });
    t.textContent = name;
    a.append(t);
    const tt = mk("title", {});
    tt.textContent = `${name}：${e.label}`;
    a.append(tt);
    svg.append(a);
  });
  const c = mk("g", { class: "rel-center" });
  c.append(mk("circle", { cx, cy, r: 34 }));
  const t = mk("text", { x: cx, y: cy + 5, "text-anchor": "middle" });
  t.textContent = byId.get(id).name.length > 9 ? byId.get(id).name.slice(0, 8) + "…" : byId.get(id).name;
  c.append(t);
  svg.append(c);
  const wrap = el("div", "rel-wrap");
  wrap.append(svg);
  return wrap;
}
function renderFavorites() {}
for (const cat of [...new Set(notebook.services.map((s) => s.category))]) {
  const o = el("option", "", cat);
  o.value = cat;
  $("notebook-category").append(o);
}
$("notebook-search").addEventListener("input", renderIndex);
$("notebook-category").addEventListener("change", renderIndex);
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
  const done = state.completed.length;
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
    ["要件から組み立てる、構築問題", "17 問・置いてつないで採点", solved, 17, "#build", "notes"],
    ["問題で確かめる、設計の判断", "60 問・選ぶ理由まで理解する", answered.size, questions.length, "#practice", "practice"],
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
  const s = byId.get(id);
  const row = el("article", "recommendation");
  row.append(icon(s));
  const text = el("div");
  const a = el("a", "", s.name);
  a.href = `#services/${id}`;
  text.append(a, el("p", "", s.purpose));
  row.append(text);
  $("recommended-notes").append(row);
});
$("notebook-export").addEventListener("click", () => {
  const blob = new Blob(
    [JSON.stringify({ schemaVersion: 1, ...state }, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = el("a");
  a.href = url;
  a.download = "aws-study-notes.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("notebook-import").addEventListener("change", async () => {
  const file = $("notebook-import").files[0];
  if (!file) return;
  try {
    if (file.size > 1000000) throw Error("1MB以下のファイルを選んでください");
    const parsed = JSON.parse(await file.text());
    if (
      parsed.schemaVersion !== 1 ||
      !parsed.notes ||
      !Array.isArray(parsed.favorites) ||
      !Array.isArray(parsed.completed)
    )
      throw Error("対応するバックアップ形式ではありません");
    for (const [id, text] of Object.entries(parsed.notes))
      if (byId.has(id) && (typeof text !== "string" || text.length > 20000))
        throw Error("メモは2万文字以下の文字列である必要があります");
    const incoming = sanitize(parsed);
    for (const [id, text] of Object.entries(incoming.notes)) {
      const old = state.notes[id] || "";
      const merged = !old
        ? text
        : old.includes(text)
          ? old
          : `${old}\n\n【取り込んだメモ】\n${text}`;
      if (merged.length > 20000) throw Error("結合後のメモが長すぎます");
    }
    for (const [id, text] of Object.entries(incoming.notes)) {
      const old = state.notes[id] || "";
      state.notes[id] = !old
        ? text
        : old.includes(text)
          ? old
          : `${old}\n\n【取り込んだメモ】\n${text}`;
    }
    for (const k of ["favorites", "completed"])
      state[k] = [...new Set([...state[k], ...incoming[k]])];
    save();
    renderDetail(selected);
    $("notebook-import-status").textContent = storageAvailable
      ? "取り込みました。既存のメモは保持しています。"
      : "取り込みました。このタブ内にだけ保持しています。";
  } catch (e) {
    $("notebook-import-status").textContent =
      `取り込めませんでした：${e.message}`;
  } finally {
    $("notebook-import").value = "";
  }
});
function route() {
  const [page, id] = location.hash.slice(1).split("/");
  if (page === "notebook") renderDetail(id || selected);
  if (page === "connections") {
    if (byId.has(id)) $("connection-from").value = id;
    renderConnection();
  }
}
window.addEventListener("hashchange", route);
window.addEventListener("learning-update", updateDashboard);
renderIndex();
renderDetail(selected);
renderFavorites();
renderConnection();
updateDashboard();
route();
