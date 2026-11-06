// AWS Architecture Academy: 画面全体の操作感(ナビのスライド表示・サイドバー開閉・検索候補・通知・続きから)
import { SERVICES, byId as svcById } from "./services.js";
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

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
const toggle = el("button", "side-toggle", "☰");
toggle.type = "button";
toggle.id = "side-toggle";
toggle.title = "メニューの開閉";
topbar.prepend(toggle);
const shell = document.querySelector(".shell");
function setCollapsed(c, silent) {
  shell.classList.toggle("side-collapsed", c);
  document.body.classList.toggle("side-collapsed", c);
  toggle.setAttribute("aria-expanded", String(!c));
  toggle.setAttribute("aria-label", c ? "メニューを開く" : "メニューを閉じる");
  if (!silent) store.set("aaa.ui.sidebar", c ? "closed" : "open");
  setTimeout(() => movePill(true), 300);
}
setCollapsed(store.get("aaa.ui.sidebar", "open") === "closed", true);
toggle.addEventListener("click", () => setCollapsed(!shell.classList.contains("side-collapsed")));

/* ---------- 検索候補(タイプアヘッド) ---------- */
const form = $("global-search-form"),
  input = $("global-search");
const box = el("div", "suggest");
box.id = "search-suggest";
box.setAttribute("role", "listbox");
box.hidden = true;
form.append(box);
input.setAttribute("role", "combobox");
input.setAttribute("aria-controls", "search-suggest");
input.setAttribute("aria-autocomplete", "list");
input.setAttribute("aria-expanded", "false");
let hits = [],
  active = -1;
function score(s, q) {
  const n = s.name.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(q) || s.full.toLowerCase().includes(q)) return 2;
  if (s.cat.toLowerCase().includes(q)) return 3;
  if ([s.purpose, s.useCases, s.tip, s.summary, ...(s.features || []), ...(s.cues?.words || [])].join(" ").toLowerCase().includes(q)) return 4;
  return 9;
}
function suggest() {
  const q = input.value.trim().toLowerCase();
  if (!q) {
    close();
    return;
  }
  hits = SERVICES
    .map((s) => [score(s, q), s])
    .filter(([v]) => v < 9)
    .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name))
    .slice(0, 7)
    .map(([, s]) => s);
  active = hits.length ? 0 : -1;
  draw(q);
}
function mark(text, q) {
  const f = el("span");
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) {
    f.textContent = text;
    return f;
  }
  f.append(document.createTextNode(text.slice(0, i)), el("mark", "", text.slice(i, i + q.length)), document.createTextNode(text.slice(i + q.length)));
  return f;
}
function draw(q) {
  box.replaceChildren();
  if (!hits.length) {
    box.append(el("p", "suggest-empty", "一致するサービスがありません。Enter で図鑑を検索します。"));
  } else
    hits.forEach((s, i) => {
      const a = el("a", "suggest-item");
      a.href = `#services/${s.id}`;
      a.id = `sg-${i}`;
      a.setAttribute("role", "option");
      a.setAttribute("aria-selected", String(i === active));
      const t = el("span", "sg-text");
      const name = mark(s.name, q);
      name.className = "sg-name";
      t.append(name, el("small", "", s.purpose || s.summary));
      a.append(el("span", "sg-cat", s.cat), t);
      a.addEventListener("mousedown", (e) => e.preventDefault());
      a.addEventListener("click", () => {
        close();
        input.value = "";
      });
      box.append(a);
    });
  box.append(el("p", "suggest-foot", "↑↓ で選択 · Enter で開く · Esc で閉じる"));
  box.hidden = false;
  input.setAttribute("aria-expanded", "true");
  input.setAttribute("aria-activedescendant", active >= 0 ? `sg-${active}` : "");
}
function close() {
  box.hidden = true;
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
}
input.addEventListener("input", suggest);
input.addEventListener("focus", () => input.value.trim() && suggest());
input.addEventListener("blur", () => setTimeout(close, 120));
input.addEventListener("keydown", (e) => {
  if (box.hidden) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!hits.length) return;
    active = (active + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length;
    draw(input.value.trim().toLowerCase());
  } else if (e.key === "Escape") {
    close();
  } else if (e.key === "Enter" && active >= 0 && hits[active]) {
    e.preventDefault();
    e.stopImmediatePropagation();
    location.hash = `services/${hits[active].id}`;
    input.value = "";
    close();
    input.blur();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    input.focus();
  }
});
input.placeholder = "サービス名・用途で検索…(例: Lambda、キュー、DNS)  / キーで移動";
input.setAttribute("aria-label", "サービスを検索");

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
