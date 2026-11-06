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
  function update(instant) {
    const items = [...group.querySelectorAll(itemSel)];
    items.forEach((x) => x.classList.toggle("sl-on", !!isActive(x)));
    const a = items.find(isActive);
    if (!a || !a.offsetParent) {
      ind.style.opacity = "0";
      return;
    }
    const noAnim = instant || first || reduce();
    if (noAnim) ind.style.transition = "none";
    ind.style.width = a.offsetWidth + "px";
    ind.style.height = a.offsetHeight + "px";
    ind.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
    ind.style.opacity = "1";
    if (noAnim) {
      ind.getBoundingClientRect();
      ind.style.transition = "";
    }
    first = false;
    // 横スクロールのグループでは選択項目を見える位置へ
    if (group.scrollWidth > group.clientWidth + 2) {
      const l = a.offsetLeft - group.scrollLeft;
      if (l < 0 || l + a.offsetWidth > group.clientWidth)
        group.scrollTo({ left: a.offsetLeft - group.clientWidth / 2 + a.offsetWidth / 2, behavior: noAnim ? "auto" : "smooth" });
    }
  }
  new ResizeObserver(() => update(true)).observe(group);
  return update;
}

export function toast(msg) {
  window.dispatchEvent(new CustomEvent("toast", { detail: msg }));
}

export const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v) ?? d;
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
