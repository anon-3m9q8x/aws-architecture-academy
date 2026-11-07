// 共通 UI: 選択表示がスライドするインジケーター、要素生成のヘルパー
export const $ = (id) => document.getElementById(id);
export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * グループ内の「選択中」の項目の背後に、なめらかにスライドする背景を置く。
 * isActive(item) が true の要素へ移動する。update() を呼ぶと再計算。
 */
export function slider(group, itemSel, isActive) {
  group.classList.add("sl-group");
  let ind = group.querySelector(":scope > .sl-ind");
  if (!ind) {
    ind = el("span", "sl-ind");
    ind.setAttribute("aria-hidden", "true");
    group.prepend(ind);
  }
  let first = true;
  let pos = null; // 現在の表示位置 {x, y, w, h}(グループ内の座標)
  let raf = 0;
  // クリックでボタンにフォーカスが移ると、ブラウザがグループを瞬間的に横スクロールすることがある。
  // その前の位置を覚えておき、そこから選択の背景と一緒に同じ速さで動かす(背景が左右にぶれない)。
  let downScroll = null, downAt = 0;
  group.addEventListener("pointerdown", () => { downScroll = group.scrollLeft; downAt = performance.now(); }, { capture: true });
  const place = (p) => {
    ind.style.width = p.w + "px";
    ind.style.height = p.h + "px";
    ind.style.transform = `translate(${p.x}px, ${p.y}px)`;
  };
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  function update(instant) {
    const items = [...group.querySelectorAll(itemSel)];
    items.forEach((x) => x.classList.toggle("sl-on", !!isActive(x)));
    const a = items.find(isActive);
    if (!a || !a.offsetParent) {
      ind.style.opacity = "0";
      return;
    }
    const to = { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight };
    // 横スクロールのグループでは選択項目が見える位置までスクロールする
    const maxS = Math.max(0, group.scrollWidth - group.clientWidth);
    let s1 = group.scrollLeft;
    if (maxS > 2) {
      const l = to.x - group.scrollLeft;
      if (l < 0 || l + to.w > group.clientWidth) s1 = Math.max(0, Math.min(maxS, to.x - group.clientWidth / 2 + to.w / 2));
    }
    cancelAnimationFrame(raf);
    ind.style.opacity = "1";
    ind.style.transition = "none";
    if (instant || first || reduce() || !pos) {
      place(to);
      group.scrollLeft = s1;
      pos = to;
      first = false;
      downScroll = null;
      ind.getBoundingClientRect();
      ind.style.transition = "opacity 0.2s";
      return;
    }
    // 背景の移動とグループのスクロールを 1 本のアニメーションで同時に動かす(見た目の動きが一方向になる)
    const s0 = downScroll !== null && performance.now() - downAt < 800 ? downScroll : group.scrollLeft;
    downScroll = null;
    const from = { ...pos };
    const t0 = performance.now(), dur = 340;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur), e = ease(t);
      pos = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e };
      place(pos);
      if (s1 !== s0 || group.scrollLeft !== s1) group.scrollLeft = s0 + (s1 - s0) * e;
      if (t < 1) raf = requestAnimationFrame(step);
      else pos = to;
    };
    group.scrollLeft = s0;
    raf = requestAnimationFrame(step);
  }
  new ResizeObserver(() => update(true)).observe(group);
  return update;
}

export function toast(msg) {
  window.dispatchEvent(new CustomEvent("toast", { detail: msg }));
}

export { store } from "./storage.js";
