// AWS Architecture Academy — テーマ・ルーティング・ホーム
import { SERVICES, byId, relsOf, serviceCount } from "./services.js";
import { BUILD } from "./data/build.js";
import "./practice.js";
import "./home.js";
import "./explorer.js";
import { buildStats, refreshRec } from "./build.js";
import "./academy.js";
const $ = (id) => document.getElementById(id);
const labels = {
  home: "ホーム",
  services: "サービス図鑑",
  build: "構築問題",
  practice: "資格問題演習",
  connections: "連携を調べる",
};
// 旧ページの URL は統合先へ転送
// 学習ノートは図鑑に統合: #notebook/<id> は #services/<id> へ
const MOVED = { animation: "services", favorites: "services", notebook: "services", roadmap: "home", progress: "practice" };

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    $("storage-warning").hidden = false;
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    $("storage-warning").hidden = false;
  }
}
const uiKey = "aaa.ui.preferences.v1";
let preferences = read(uiKey, {});
if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) preferences = {};
let theme = ["light", "dark", "system"].includes(preferences.theme) ? preferences.theme : "system";
const media = matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
  $("theme-toggle").textContent = resolved === "dark" ? "☼ ライト" : "☾ ダーク";
  $("theme-toggle").setAttribute("aria-label", resolved === "dark" ? "ライトモードに切り替える" : "ダークモードに切り替える");
  $("theme-system").setAttribute("aria-pressed", String(theme === "system"));
}
applyTheme();
media.addEventListener("change", applyTheme);
$("theme-toggle").addEventListener("click", () => {
  theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  preferences = { ...preferences, theme };
  save(uiKey, preferences);
  applyTheme();
});
$("theme-system").addEventListener("click", () => {
  theme = "system";
  preferences = { ...preferences, theme };
  save(uiKey, preferences);
  applyTheme();
});
function element(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

/* ---------- ホーム ---------- */
document.querySelectorAll("[data-service-count]").forEach((x) => (x.textContent = serviceCount));
document.querySelectorAll("[data-build-count]").forEach((x) => (x.textContent = BUILD.length));
$("svc-total").textContent = serviceCount;
function updateBuild() {
  refreshRec();
  const b = buildStats();
  $("build-solved").textContent = `${b.solved} / ${b.total}`;
  $("build-progress").max = b.total;
  $("build-progress").value = b.solved;
}
updateBuild();
window.addEventListener("learning-update", updateBuild);
window.addEventListener("scenes-ready", (e) => ($("scene-count").textContent = e.detail.length || "—"));
// 試験によく出る連携
[["cloudfront", "s3"], ["apigw", "lambda"], ["sns", "sqs"], ["ec2", "s3"], ["alb", "ec2"], ["lambda", "sqs"]].slice(0, 3).forEach(([a, b]) => {
  const A = byId.get(a), B = byId.get(b);
  const r = relsOf(a).find((x) => x.id === b);
  const card = element("a", "card panel pair-card");
  card.href = `#services/${a}`;
  const icons = element("div", "pair-icons");
  for (const s of [A, B]) {
    const g = element("span", `svc-glyph c-${s.color}`, s.abbr);
    icons.append(g);
  }
  icons.insertBefore(element("i", "pair-line"), icons.lastChild);
  card.append(icons, element("h3", "", `${A.name} × ${B.name}`), element("p", "", r?.detail?.how || r?.label || A.purpose), element("span", "card-note", "連携を再生 →"));
  $("featured").append(card);
});

/* ---------- ルーティング ---------- */
let lastPage = null;
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
function route() {
  let [requested, id] = location.hash.slice(1).split("/");
  if (MOVED[requested]) {
    location.replace(`#${MOVED[requested]}${requested === "animation" && id ? `/scene:${id}` : requested === "notebook" && id ? `/${id}` : ""}`);
    return;
  }
  const page = Object.hasOwn(labels, requested) ? requested : "home";
  // ページ ID と同じハッシュによるブラウザの自動スクロールを打ち消し、先頭から表示する
  if (page !== lastPage) requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  lastPage = page;
  document.querySelectorAll(".page").forEach((el) => {
    const show = el.id === page;
    if (show && el.hidden) {
      el.hidden = false;
      el.classList.remove("page-enter");
      void el.offsetWidth;
      el.classList.add("page-enter");
    } else if (!show) el.hidden = true;
  });
  document.querySelectorAll("[data-page]").forEach((el) => {
    if (el.dataset.page === page) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  $("page-label").textContent = labels[page];
  document.title = `${labels[page]} | AWS Architecture Academy`;
  window.dispatchEvent(new CustomEvent("route-change", { detail: { page, id } }));
}
window.addEventListener("hashchange", route);
route();
export { SERVICES };
