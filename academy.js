// AWS Architecture Academy: 画面全体の操作感(ナビのスライド表示・サイドバー開閉・検索候補・通知・続きから)
import { SERVICES, byId as svcById } from "./services.js";
import { store } from "./storage.js";
import { searchClear } from "./ui.js";
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 通知(トースト) ---------- */
const toast = el("div", "toast");
toast.setAttribute("role", "status");
toast.hidden = true;
document.body.append(toast);
let toastT = 0;
window.addEventListener("toast", (e) => {
  toast.textContent = e.detail;
  toast.hidden = false;
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => (toast.hidden = true), 250);
  }, 3200);
});

/* ---------- サイドバー: スライドする選択表示 ---------- */
const nav = document.querySelector(".sidebar nav");
nav.classList.add("pill-nav");
const pill = el("span", "nav-pill");
pill.setAttribute("aria-hidden", "true");
nav.prepend(pill);
function movePill(instant) {
  const a = nav.querySelector('a[aria-current="page"]');
  if (!a) {
    pill.style.opacity = "0";
    return;
  }
  nav.classList.add("pill-ready");
  if (instant || reduce()) pill.style.transition = "none";
  pill.style.transform = `translate(${a.offsetLeft}px,${a.offsetTop}px)`;
  pill.style.width = a.offsetWidth + "px";
  pill.style.height = a.offsetHeight + "px";
  pill.style.opacity = "1";
  if (instant || reduce()) {
    pill.getBoundingClientRect();
    pill.style.transition = "";
  }
  // 横スクロール(スマホ)のときは選択項目を見える位置へ
  if (nav.scrollWidth > nav.clientWidth + 2) {
    const l = a.offsetLeft - nav.scrollLeft;
    if (l < 0 || l + a.offsetWidth > nav.clientWidth)
      nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2, behavior: instant || reduce() ? "auto" : "smooth" });
  }
}
let firstMove = true;
window.addEventListener("route-change", () => {
  requestAnimationFrame(() => {
    movePill(firstMove);
    firstMove = false;
  });
});
window.addEventListener("resize", () => movePill(true));
requestAnimationFrame(() => movePill(true));

/* ---------- サイドバーの開閉(PC) ---------- */
const topbar = document.querySelector(".topbar");
// 上部バーの高さを CSS 変数に(固定表示のサイドバー・タブの位置に使う)
{
  const setH = () => document.documentElement.style.setProperty("--topbar-h", topbar.offsetHeight + "px");
  setH();
  new ResizeObserver(setH).observe(topbar);
}
// スクロールしたら上部バーに薄いガラスを付ける(最上部では透過)
{
  const onScroll = () => document.body.classList.toggle("page-scrolled", window.scrollY > 4);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}
const toggle = el("button", "side-toggle", "☰");
toggle.type = "button";
toggle.id = "side-toggle";
toggle.title = "メニューの開閉";
// ☰ はワークスペース(サイドバー)の左上に置く。閉じたときもサイドバーは細い帯として残り、☰ から開ける
const shell = document.querySelector(".shell");
const sidebar = shell.querySelector(".sidebar");
// ☰ の右にサイトのロゴ、その下に「WORKSPACE」の見出しを置く(スマホでは上部バーのロゴを使う)
const sideHead = el("div", "side-head");
const sideLabel = sidebar.querySelector(":scope > .eyebrow");
const sideBrand = topbar.querySelector(".brand").cloneNode(true);
sideBrand.classList.add("side-brand");
sideHead.append(toggle, sideBrand);
sidebar.prepend(sideHead);
if (sideLabel) sideHead.after(sideLabel);
// ロゴと検索欄を、ページ本文の左端にそろえる(サイドバーの幅・開閉に合わせて追従)
{
  const main = document.querySelector("main");
  const align = () => {
    const root = document.documentElement.style;
    // ワークスペースは画面の最上部まで伸ばし、上部バーはその右から始める
    root.setProperty("--side-w", Math.round(sidebar.getBoundingClientRect().width) + "px");
    root.setProperty("--content-left", Math.round(parseFloat(getComputedStyle(main).paddingLeft || 0)) + "px");
  };
  align();
  new ResizeObserver(align).observe(main);
  new ResizeObserver(align).observe(sidebar);
  window.addEventListener("resize", align);
}
function setCollapsed(c, silent) {
  shell.classList.toggle("side-collapsed", c);
  document.body.classList.toggle("side-collapsed", c);
  toggle.setAttribute("aria-expanded", String(!c));
  toggle.setAttribute("aria-label", c ? "メニューを開く" : "メニューを閉じる");
  if (!silent) store.set("aaa.ui.sidebar", c ? "closed" : "open");
  setTimeout(() => movePill(true), 300);
}
setCollapsed(store.get("aaa.ui.sidebar", "open") === "closed", true);
// 手動の開閉は保存し、自動で閉じた状態を解除する(利用者の操作を優先)
let autoClosed = false;
toggle.addEventListener("click", () => {
  autoClosed = false;
  setCollapsed(!shell.classList.contains("side-collapsed"));
});
// サービス図鑑の解説ページでは横幅を確保するためにワークスペース(サイドバー)を自動で閉じ、
// 図鑑の一覧や他のページへ戻ったら元に戻す。保存している開閉の設定は変えない。
window.addEventListener("sidebar-auto", (e) => {
  const want = !!e.detail?.collapse;
  const isClosed = shell.classList.contains("side-collapsed");
  if (want && !isClosed) {
    autoClosed = true;
    setCollapsed(true, true);
  } else if (!want && autoClosed) {
    autoClosed = false;
    setCollapsed(false, true);
  }
});

/* ---------- ホーム: 前回の続きから ---------- */
function resume() {
  const holder = document.querySelector(".hero-copy");
  if (!holder) return;
  let r = $("resume");
  const svc = store.get("aaa.resume.svc", null),
    pb = store.get("aaa.resume.build", null);
  const items = [];
  if (svc && svcById.has(svc)) items.push([`図鑑：${svcById.get(svc).name}`, `#services/${svc}`]);
  if (pb) items.push([`構築問題の続き`, `#build/${pb}`]);
  if (!items.length) {
    r?.remove();
    return;
  }
  if (!r) {
    r = el("div", "resume");
    r.id = "resume";
    holder.append(r);
  }
  r.replaceChildren(el("span", "resume-label", "前回の続きから"));
  items.forEach(([t, h]) => {
    const a = el("a", "resume-link", t + " →");
    a.href = h;
    r.append(a);
  });
}
window.addEventListener("route-change", (e) => {
  const { page, id } = e.detail;
  if (page === "services" && id && svcById.has(id)) store.set("aaa.resume.svc", id);
  if (page === "build" && id) store.set("aaa.resume.build", id);
  if (page === "home") resume();
  document.body.dataset.page = page;
  if (page !== "practice") document.body.classList.remove("in-quiz");
  else if (!$("quiz-workspace").hidden) document.body.classList.add("in-quiz");
});
setTimeout(resume, 400);
