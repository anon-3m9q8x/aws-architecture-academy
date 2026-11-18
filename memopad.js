// メモ：ワークスペース「メモ」と、どの画面からでも開ける「メモ」パネル。
// 保存キー aaa.memo.v1 は学習データとしてアカウントに同期される（ログイン中はアカウントごとに共有、未ログインはこの端末に保存）。
import { store } from "./storage.js";

const KEY = "aaa.memo.v1";
const UI_KEY = "aaa.memo.ui"; // 最後に開いたメモ（端末ごとの表示の都合なので同期しない）
const MAX = { notes: 500, title: 200, body: 50000 };
const $ = (id) => document.getElementById(id);

/* ---------- データ ---------- */
function clean(raw) {
  const out = { v: 1, notes: [] };
  if (!raw || !Array.isArray(raw.notes)) return out;
  const seen = new Set();
  for (const n of raw.notes) {
    if (!n || typeof n.id !== "string" || seen.has(n.id) || !/^[A-Za-z0-9_-]{1,40}$/.test(n.id)) continue;
    seen.add(n.id);
    out.notes.push({
      id: n.id,
      title: String(n.title || "").slice(0, MAX.title),
      body: String(n.body || "").slice(0, MAX.body),
      created: Number(n.created) || Date.now(),
      updated: Number(n.updated) || Date.now(),
      ctx: n.ctx && typeof n.ctx === "object" ? { label: String(n.ctx.label || "").slice(0, 80), hash: String(n.ctx.hash || "").slice(0, 200) } : null,
    });
    if (out.notes.length >= MAX.notes) break;
  }
  return out;
}
let state = clean(store.get(KEY, null));
let timer = null;
let status = "saved";
function persist() {
  clearTimeout(timer);
  timer = null;
  const ok = store.set(KEY, state);
  status = ok ? "saved" : "error";
  paintStatus();
}
function schedule() {
  status = "saving";
  paintStatus();
  clearTimeout(timer);
  timer = setTimeout(persist, 600);
}
// 画面を閉じる・切り替える直前に、入力中の内容を保存する
addEventListener("pagehide", () => timer && persist());
document.addEventListener("visibilitychange", () => document.hidden && timer && persist());

const sorted = () => [...state.notes].sort((a, b) => b.updated - a.updated);
const find = (id) => state.notes.find((n) => n.id === id);
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function ctxNow() {
  const label = $("page-label")?.textContent || "";
  return { label, hash: location.hash || "#home" };
}
function create(ctx) {
  if (state.notes.length >= MAX.notes) {
    alert(`メモは${MAX.notes}件までです。不要なメモを削除してください。`);
    return null;
  }
  const t = Date.now();
  const n = { id: newId(), title: "", body: "", created: t, updated: t, ctx: ctx || null };
  state.notes.push(n);
  return n;
}
function update(id, patch) {
  const n = find(id);
  if (!n) return;
  if (patch.title != null) n.title = patch.title.slice(0, MAX.title);
  if (patch.body != null) n.body = patch.body.slice(0, MAX.body);
  n.updated = Date.now();
  schedule();
  window.dispatchEvent(new CustomEvent("memo-change", { detail: { id } }));
}
function remove(id) {
  state.notes = state.notes.filter((n) => n.id !== id);
  persist();
  window.dispatchEvent(new CustomEvent("memo-change", { detail: { id, removed: true } }));
}
const titleOf = (n) => n.title.trim() || n.body.trim().split("\n")[0].slice(0, 40) || "無題のメモ";
function when(t) {
  const d = new Date(t), now = new Date();
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return d.toDateString() === now.toDateString() ? `今日 ${hm}` : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}
const uiGet = () => { try { return JSON.parse(localStorage.getItem(UI_KEY) || "{}"); } catch { return {}; } };
const uiSet = (v) => { try { localStorage.setItem(UI_KEY, JSON.stringify({ ...uiGet(), ...v })); } catch {} };
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const statusText = () => (status === "saving" ? "保存中…" : status === "error" ? "保存できませんでした" : window.AcademyAccount?.isSignedIn?.() ? "保存済み（アカウントに同期）" : "保存済み（この端末）");
function paintStatus() {
  document.querySelectorAll("[data-memo-status]").forEach((x) => {
    x.textContent = statusText();
    x.dataset.state = status;
  });
}

/* ---------- 1つのメモを編集する部品（ページとパネルで共用） ---------- */
function editor(root, opt) {
  // opt: { getId, setId, ctx }  まだメモが無いときは、最初に入力した時点で作る
  const title = el("input", "mp-title");
  title.type = "text";
  title.placeholder = "タイトル（省略可）";
  title.maxLength = MAX.title;
  title.setAttribute("aria-label", "メモのタイトル");
  const body = el("textarea", "mp-body");
  body.placeholder = "ここにメモを書きます。入力すると自動で保存されます。";
  body.setAttribute("aria-label", "メモの本文");
  const meta = el("p", "mp-meta");
  root.append(title, meta, body);
  function ensure() {
    let id = opt.getId();
    if (id && find(id)) return id;
    const n = create(opt.ctx());
    if (!n) return null;
    opt.setId(n.id);
    return n.id;
  }
  const onInput = () => {
    const id = ensure();
    if (id) update(id, { title: title.value, body: body.value });
  };
  title.addEventListener("input", onInput);
  body.addEventListener("input", onInput);
  function load() {
    const n = find(opt.getId());
    if (document.activeElement !== title) title.value = n ? n.title : "";
    if (document.activeElement !== body) body.value = n ? n.body : "";
    meta.replaceChildren();
    if (n) {
      meta.append(el("span", "", `更新 ${when(n.updated)}`));
      if (n.ctx && n.ctx.label) {
        const a = el("a", "mp-ctx", `書いた場所：${n.ctx.label}`);
        a.href = n.ctx.hash || "#home";
        meta.append(a);
      }
    } else meta.append(el("span", "", "新しいメモ"));
  }
  return { load, focus: () => (title.value ? body : title).focus(), title, body };
}

/* ---------- ワークスペース「メモ」 ---------- */
const page = $("memo");
let pageId = uiGet().last || null;
let query = "";
if (page) {
  page.innerHTML = `<div class="mp-page">
    <div class="mp-head"><div><h1>メモ</h1><p>学習中に気づいたこと・覚えたいことを自由に書けます。どの画面でも右下の「メモ」から開いて書き足せます。</p></div>
      <button type="button" class="mp-btn primary" id="mp-new">＋ 新しいメモ</button></div>
    <div class="mp-grid">
      <aside class="mp-side" aria-label="メモの一覧">
        <input type="search" id="mp-q" class="mp-search" placeholder="メモを検索" aria-label="メモを検索" />
        <p class="mp-count" id="mp-count"></p>
        <ul class="mp-list" id="mp-list"></ul>
      </aside>
      <section class="mp-main" id="mp-main" aria-label="メモの編集">
        <div class="mp-main-top"><button type="button" class="mp-btn mp-back" id="mp-back">← 一覧</button><span class="mp-status" data-memo-status></span><button type="button" class="mp-btn mp-del" id="mp-del">削除</button></div>
        <div id="mp-ed" class="mp-ed"></div>
      </section>
    </div>
  </div>`;
  const ed = editor($("mp-ed"), { getId: () => pageId, setId: (id) => { pageId = id; uiSet({ last: id }); drawList(); }, ctx: () => null });
  function drawList() {
    const list = $("mp-list");
    const q = query.trim().toLowerCase();
    const notes = sorted().filter((n) => !q || (n.title + "\n" + n.body).toLowerCase().includes(q));
    $("mp-count").textContent = q ? `${notes.length} 件ヒット（全 ${state.notes.length} 件）` : `${state.notes.length} 件のメモ`;
    list.replaceChildren(
      ...notes.map((n) => {
        const li = el("li");
        const b = el("button", `mp-item${n.id === pageId ? " on" : ""}`);
        b.type = "button";
        b.dataset.id = n.id;
        b.append(el("b", "", titleOf(n)), el("span", "mp-snip", n.body.trim().replace(/\s+/g, " ").slice(0, 70) || "（本文なし）"), el("small", "", `${when(n.updated)}${n.ctx && n.ctx.label ? ` ・ ${n.ctx.label}` : ""}`));
        li.append(b);
        return li;
      }),
    );
    if (!notes.length) list.append(el("li", "mp-empty", q ? "見つかりませんでした。" : "まだメモがありません。「＋ 新しいメモ」から書き始めましょう。"));
  }
  function open(id) {
    pageId = id;
    uiSet({ last: id });
    page.classList.add("editing");
    ed.load();
    drawList();
    $("mp-del").hidden = !find(id);
  }
  $("mp-list").addEventListener("click", (e) => {
    const b = e.target.closest(".mp-item");
    if (b) open(b.dataset.id);
  });
  $("mp-new").addEventListener("click", () => {
    open(null);
    ed.focus();
  });
  $("mp-back").addEventListener("click", () => page.classList.remove("editing"));
  $("mp-del").addEventListener("click", () => {
    const n = find(pageId);
    if (!n || !confirm(`「${titleOf(n)}」を削除しますか？\nこの操作は元に戻せません。`)) return;
    remove(pageId);
    open(sorted()[0]?.id || null);
    page.classList.remove("editing");
  });
  $("mp-q").addEventListener("input", (e) => {
    query = e.target.value;
    drawList();
  });
  window.addEventListener("memo-change", () => {
    drawList();
    ed.load();
    $("mp-del").hidden = !find(pageId);
  });
  window.addEventListener("route-change", (e) => {
    if (e.detail?.page !== "memo") return;
    if (!find(pageId)) pageId = sorted()[0]?.id || null;
    ed.load();
    drawList();
    $("mp-del").hidden = !find(pageId);
    paintStatus();
  });
}

/* ---------- どの画面からでも開ける「メモ」パネル ---------- */
const fab = el("button", "mp-fab");
fab.type = "button";
fab.innerHTML = '<span aria-hidden="true">✎</span> メモ';
fab.setAttribute("aria-label", "メモを開く");
fab.setAttribute("aria-expanded", "false");
const panel = el("aside", "mp-panel");
panel.hidden = true;
panel.setAttribute("aria-label", "メモ");
panel.innerHTML = `<div class="mp-ph" title="ドラッグで移動・ダブルクリックで元の位置と大きさへ"><span class="mp-grip" aria-hidden="true">⠿</span><b>✎ メモ</b><select class="mp-pick" aria-label="編集するメモを選ぶ"></select><button type="button" class="mp-pnew" title="新しいメモ">＋ 新規</button><button type="button" class="mp-size" title="大きさを切り替え（小→中→大→特大）">⤢</button><button type="button" class="mp-x" aria-label="メモを閉じる">×</button></div>
  <div class="mp-ped"></div>
  <div class="mp-pf"><span class="mp-status" data-memo-status></span><a href="#memo" class="mp-all">メモ一覧を開く →</a></div>
  <span class="mp-resize" title="ドラッグで大きさを変更" aria-hidden="true"></span>`;
document.body.append(fab, panel);
let panelId = null;
const ped = editor(panel.querySelector(".mp-ped"), { getId: () => panelId, setId: (id) => { panelId = id; uiSet({ last: id }); drawPick(); }, ctx: ctxNow });
const pick = panel.querySelector(".mp-pick");
function drawPick() {
  pick.replaceChildren(el("option", "", "＋ 新しいメモ"));
  pick.firstChild.value = "";
  for (const n of sorted()) {
    const o = el("option", "", titleOf(n));
    o.value = n.id;
    pick.append(o);
  }
  pick.value = find(panelId) ? panelId : "";
}
/* ---------- メモを画面内で移動する ----------
 * 「メモ」ボタンはそのままドラッグ、パネルは見出し部分をドラッグして動かせる。位置は端末ごとに保存し(aaa.memo.ui の fab / pos)、
 * 画面の外にはみ出さないように収める。見出しをダブルクリックすると元の位置(右下)に戻る。
 */
const clampXY = (x, y, w, h) => [Math.min(Math.max(8, x), Math.max(8, innerWidth - w - 8)), Math.min(Math.max(8, y), Math.max(8, innerHeight - h - 8))];
function place(elm, pos) {
  if (!pos) {
    elm.style.left = elm.style.top = elm.style.right = elm.style.bottom = "";
    return;
  }
  const r = elm.getBoundingClientRect();
  const [x, y] = clampXY(pos.x, pos.y, r.width, r.height);
  Object.assign(elm.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto" });
}
/** パネルの位置: 移動していなければ、ボタンの近く(上、入らなければ下)に出す */
function placePanel() {
  const pos = uiGet().pos;
  if (pos) return place(panel, pos);
  const fp = uiGet().fab;
  if (!fp) return place(panel, null);
  const f = fab.getBoundingClientRect(), r = panel.getBoundingClientRect();
  const y = f.top - r.height - 10 >= 8 ? f.top - r.height - 10 : f.bottom + 10;
  place(panel, { x: f.right - r.width, y });
}
function draggable(handle, target, key, { onTap } = {}) {
  let start = null, moved = false;
  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (handle !== target && e.target.closest("select,button,input,textarea,a")) return; // 見出しの中の操作部品はドラッグしない
    const r = target.getBoundingClientRect();
    start = { px: e.clientX, py: e.clientY, x: r.left, y: r.top, w: r.width, h: r.height };
    moved = false;
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener("pointermove", (e) => {
    if (!start) return;
    const dx = e.clientX - start.px, dy = e.clientY - start.py;
    if (!moved && Math.hypot(dx, dy) < 5) return;
    moved = true;
    document.body.classList.add("mp-dragging");
    const [x, y] = clampXY(start.x + dx, start.y + dy, start.w, start.h);
    Object.assign(target.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto" });
    if (target === fab && !panel.hidden && !uiGet().pos) placePanel();
  });
  const end = (e) => {
    if (!start) return;
    start = null;
    document.body.classList.remove("mp-dragging");
    if (moved) {
      const r = target.getBoundingClientRect();
      uiSet({ [key]: { x: Math.round(r.left), y: Math.round(r.top) } });
      if (target === fab) handle.dataset.dragged = "1"; // 直後の click を開閉にしない
    } else onTap?.(e);
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}
/* ---------- メモの大きさ ----------
 * 見出しの「⤢」をクリックするたびに 小 → 中 → 大 → 特大 の順に切り替える。右下の角をドラッグすると自由な大きさにできる。
 * 大きさは端末ごとに保存(aaa.memo.ui の size = { w, h, step })。画面に入りきらないときは収まる大きさに縮める。
 */
const SIZES = [
  ["小", 320, 400],
  ["中", 380, 560],
  ["大", 520, 680],
  ["特大", 760, 820],
];
function applySize() {
  const sz = uiGet().size;
  const btn = panel.querySelector(".mp-size");
  if (!sz) {
    panel.style.width = panel.style.height = panel.style.maxHeight = "";
    btn.title = "大きさを切り替え（いまは標準。小→中→大→特大）";
    return;
  }
  // 右下の定位置(ボタンの上)に出すときは、ボタンの分だけ高さを控える
  const w = Math.min(sz.w, innerWidth - 16), h = Math.min(sz.h, innerHeight - (uiGet().pos || uiGet().fab ? 16 : 92));
  Object.assign(panel.style, { width: w + "px", height: h + "px", maxHeight: "none" });
  btn.title = `大きさを切り替え（いまは${sz.step != null ? SIZES[sz.step][0] : "自由な大きさ"}。小→中→大→特大）`;
}
panel.querySelector(".mp-size").addEventListener("click", () => {
  const cur = uiGet().size;
  const step = cur?.step != null ? (cur.step + 1) % SIZES.length : 2; // 標準・自由な大きさからは「大」へ
  const [, w, h] = SIZES[step];
  uiSet({ size: { w, h, step } });
  applySize();
  placePanel();
});
{
  const grip = panel.querySelector(".mp-resize");
  let st = null;
  grip.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const r = panel.getBoundingClientRect();
    // 左上を固定して右下へ広げる(位置を左上基準にそろえる)
    Object.assign(panel.style, { left: r.left + "px", top: r.top + "px", right: "auto", bottom: "auto" });
    uiSet({ pos: { x: Math.round(r.left), y: Math.round(r.top) } });
    st = { px: e.clientX, py: e.clientY, w: r.width, h: r.height, x: r.left, y: r.top };
    grip.setPointerCapture(e.pointerId);
    document.body.classList.add("mp-resizing");
  });
  grip.addEventListener("pointermove", (e) => {
    if (!st) return;
    const w = Math.max(280, Math.min(innerWidth - st.x - 8, st.w + e.clientX - st.px));
    const h = Math.max(260, Math.min(innerHeight - st.y - 8, st.h + e.clientY - st.py));
    Object.assign(panel.style, { width: w + "px", height: h + "px", maxHeight: "none" });
  });
  const end = () => {
    if (!st) return;
    st = null;
    document.body.classList.remove("mp-resizing");
    const r = panel.getBoundingClientRect();
    uiSet({ size: { w: Math.round(r.width), h: Math.round(r.height), step: null } });
    applySize();
  };
  grip.addEventListener("pointerup", end);
  grip.addEventListener("pointercancel", end);
}
draggable(fab, fab, "fab");
draggable(panel.querySelector(".mp-ph"), panel, "pos");
fab.addEventListener("click", (e) => {
  if (fab.dataset.dragged) {
    delete fab.dataset.dragged;
    e.stopImmediatePropagation();
  }
}, true);
panel.querySelector(".mp-ph").addEventListener("dblclick", (e) => {
  if (e.target.closest("select,button")) return;
  uiSet({ pos: null, fab: null, size: null });
  place(fab, null);
  applySize();
  place(panel, null);
});
place(fab, uiGet().fab);
addEventListener("resize", () => {
  place(fab, uiGet().fab);
  if (!panel.hidden) {
    applySize();
    placePanel();
  }
});
function openPanel() {
  const last = uiGet().last;
  panelId = find(panelId) ? panelId : find(last) ? last : null;
  panel.hidden = false;
  applySize();
  placePanel();
  fab.setAttribute("aria-expanded", "true");
  document.body.classList.add("memo-open");
  drawPick();
  ped.load();
  paintStatus();
  ped.focus();
}
function closePanel(keepFocus) {
  if (timer) persist();
  panel.hidden = true;
  fab.setAttribute("aria-expanded", "false");
  document.body.classList.remove("memo-open");
  if (!keepFocus) fab.focus({ preventScroll: true });
}
// メモ以外の場所を触ったら閉じる(書きかけの内容は保存してから閉じる。触った先の操作やフォーカスはそのまま生かす)
document.addEventListener("pointerdown", (e) => {
  if (panel.hidden || panel.contains(e.target) || fab.contains(e.target)) return;
  closePanel(true);
}, true);
fab.addEventListener("click", () => (panel.hidden ? openPanel() : closePanel()));
panel.querySelector(".mp-x").addEventListener("click", () => closePanel());
panel.querySelector(".mp-pnew").addEventListener("click", () => {
  panelId = null;
  drawPick();
  ped.load();
  ped.focus();
});
pick.addEventListener("change", () => {
  panelId = pick.value || null;
  if (panelId) uiSet({ last: panelId });
  ped.load();
});
panel.querySelector(".mp-all").addEventListener("click", () => {
  if (panelId) {
    pageId = panelId;
    uiSet({ last: panelId });
  }
  closePanel();
});
panel.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePanel();
});
window.addEventListener("memo-change", () => {
  if (panel.hidden) return;
  drawPick();
  ped.load();
});
// ワークスペース「メモ」ではパネルの代わりにページで書くので、ボタンを隠す
window.addEventListener("route-change", (e) => {
  const onMemo = e.detail?.page === "memo";
  fab.hidden = onMemo;
  if (onMemo && !panel.hidden) closePanel();
});
fab.hidden = document.body.dataset.route === "memo";

// サイドバーの「メモ」に件数を表示
function paintBadge() {
  document.querySelectorAll("[data-memo-count]").forEach((b) => {
    b.textContent = String(state.notes.length);
    b.hidden = !state.notes.length;
  });
}
paintBadge();
window.addEventListener("memo-change", paintBadge);
