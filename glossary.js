// 用語集: 問題文・選択肢・解説に出てくる専門用語(LLM-as-a-judge、RAG、RPO など)の詳しい解説。
// データ: data/glossary-data.js = [{ id, term, aliases, cat, short, body, example, exam, parts, services }]
// ・findTerms(text) で文章中の用語を見つけ、termify() で用語をクリックできるボタンにする(資格問題演習で使用)
// ・openTerm(id) で解説のダイアログを開く(構成要素の用語・関係するサービスへ移動できる)
// ・renderGlossary(box) で図鑑の「用語集」タブを描く
import DATA from "./data/glossary-data.js?v=20261118s";
import MARKS from "./data/glossary-marks.js?v=20261119a";
import { byId as svcById } from "./services.js";

export const TERMS = DATA.filter((t) => t && t.id && t.term && t.body);
export const termById = new Map(TERMS.map((t) => [t.id, t]));
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
// 表記 → 用語(長い表記から順に照合する)
const forms = [];
for (const t of TERMS) for (const f of [t.term, ...(t.aliases || [])]) if (f && f.length >= 2) forms.push([f, t.id]);
forms.sort((a, b) => b[0].length - a[0].length);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RE = forms.length ? new RegExp(forms.map(([f]) => esc(f)).join("|"), "gi") : null;
const lookup = new Map(forms.map(([f, id]) => [f.toLowerCase(), id]));
const isAsciiWord = (c) => !!c && /[A-Za-z0-9]/.test(c);

/** 文章中の用語の位置 [{ start, end, id }](英字の用語は単語の途中では一致させない) */
export function findTerms(text) {
  const out = [];
  if (!RE || !text) return out;
  for (const m of text.matchAll(RE)) {
    const id = lookup.get(m[0].toLowerCase());
    if (!id) continue;
    const s = m.index, e = s + m[0].length;
    if (/^[A-Za-z0-9]/.test(m[0]) && isAsciiWord(text[s - 1])) continue;
    if (/[A-Za-z0-9]$/.test(m[0]) && isAsciiWord(text[e])) continue;
    out.push({ start: s, end: e, id });
  }
  return out;
}
/** 用語のボタン */
export function termButton(id, label) {
  const b = el("button", "term-link", label);
  b.type = "button";
  b.dataset.term = id;
  b.title = `用語：${termById.get(id)?.short || ""}`;
  return b;
}
/** 文章を、用語をボタンにして parent に追加する。seen に入っている用語は 2 回目以降ボタンにしない */
export function termify(text, parent, seen = new Set()) {
  let p = 0;
  for (const { start, end, id } of findTerms(text)) {
    if (start < p || seen.has(id)) continue;
    seen.add(id);
    parent.append(document.createTextNode(text.slice(p, start)), termButton(id, text.slice(start, end)));
    p = end;
  }
  parent.append(document.createTextNode(text.slice(p)));
  return parent;
}

/** 重要ライン(黄色のマーカー)と注意(オレンジ)を付けながら、用語をボタンにして parent に追加する */
function markify(text, parent, seen, marks, warns) {
  const rs = [];
  const add = (list, kind) => (list || []).forEach((p) => { const i = p ? text.indexOf(p) : -1; if (i >= 0) rs.push([i, i + p.length, kind]); });
  add(warns, "w");
  add(marks, "m");
  rs.sort((a, b) => a[0] - b[0]);
  let pos = 0;
  for (const [s, e, kind] of rs) {
    if (s < pos) continue;
    if (s > pos) termify(text.slice(pos, s), parent, seen);
    parent.append(termify(text.slice(s, e), el(kind === "m" ? "mark" : "strong", kind === "m" ? "kmark" : "kwarn"), seen));
    pos = e;
  }
  if (pos < text.length) termify(text.slice(pos), parent, seen);
  return parent;
}

/* ---------- 解説のダイアログ ---------- */
let dlg = null;
const history = [];
export function openTerm(id, push = true) {
  const t = termById.get(id);
  if (!t) return;
  if (!dlg) {
    dlg = el("dialog", "term-dialog");
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
      const b = e.target.closest("[data-term]");
      if (b && dlg.contains(b)) openTerm(b.dataset.term);
      const back = e.target.closest(".term-back");
      if (back) {
        history.pop();
        openTerm(history.pop(), true);
      }
    });
    dlg.addEventListener("close", () => (history.length = 0));
    document.body.append(dlg);
  }
  if (push) history.push(id);
  dlg.replaceChildren();
  const head = el("div", "term-head");
  if (history.length > 1) {
    const back = el("button", "term-back", "← 戻る");
    back.type = "button";
    head.append(back);
  }
  head.append(el("span", "term-cat", t.cat || "用語"));
  const x = el("button", "term-x", "×");
  x.type = "button";
  x.setAttribute("aria-label", "閉じる");
  x.addEventListener("click", () => dlg.close());
  head.append(x);
  dlg.append(head, el("h2", "term-title", t.term));
  if (t.aliases?.length) dlg.append(el("p", "term-alias", `別の表記：${t.aliases.join("・")}`));
  dlg.append(el("p", "term-short", t.short || ""));
  const seen = new Set([t.id]);
  const mk = MARKS[t.id] || {};
  if (mk.body || mk.exam || mk.example || mk.warn) {
    const legend = el("p", "kind-legend term-legend");
    [["mark", "kmark", "重要", "試験で問われる要点"], ["strong", "kwarn", "注意", "ひっかけ・制限・費用"]].forEach(([tag, cls, chip, text]) => {
      if (cls === "kwarn" && !(mk.warn || []).length) return;
      const item = el("span", "kind-legend-item");
      item.append(el(tag, cls, chip), el("span", "", text));
      legend.append(item);
    });
    dlg.append(legend);
  }
  const sec = (title, text, key) => {
    if (!text) return;
    const d = el("div", "term-sec");
    d.append(el("h3", "", title), markify(text, el("p"), seen, mk[key], mk.warn));
    dlg.append(d);
  };
  sec("解説", t.body, "body");
  // 構成要素の用語(例: LLM-as-a-judge の「LLM」)
  const parts = (t.parts || []).filter((p) => termById.has(p) && p !== t.id);
  if (parts.length) {
    const d = el("div", "term-sec term-parts");
    d.append(el("h3", "", "構成する用語"));
    parts.forEach((p) => {
      const pt = termById.get(p);
      const row = el("div", "term-part");
      row.append(termButton(p, pt.term), el("span", "", ` — ${pt.short}`));
      d.append(row);
    });
    dlg.append(d);
  }
  sec("AWS での使われ方", t.example, "example");
  sec("試験のポイント", t.exam, "exam");
  const svcs = (t.services || []).filter((s) => svcById.has(s));
  const users = TERMS.filter((u) => u.id !== t.id && (u.parts || []).includes(t.id));
  if (svcs.length || users.length) {
    const d = el("div", "term-sec term-links");
    if (svcs.length) {
      d.append(el("h3", "", "関係するサービス"));
      const w = el("div", "term-chips");
      svcs.forEach((s) => {
        const a = el("a", "term-svc", svcById.get(s).name);
        a.href = `#services/${s}`;
        a.addEventListener("click", () => dlg.close());
        w.append(a);
      });
      d.append(w);
    }
    if (users.length) {
      d.append(el("h3", "", "この用語を含む用語"));
      const w = el("div", "term-chips");
      users.forEach((u) => w.append(termButton(u.id, u.term)));
      d.append(w);
    }
    dlg.append(d);
  }
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}
// ページ内のどこでも、用語のボタンを押したら解説を開く
document.addEventListener("click", (e) => {
  const b = e.target.closest?.(".term-link[data-term]");
  if (!b || (dlg && dlg.contains(b))) return;
  e.preventDefault();
  e.stopPropagation();
  openTerm(b.dataset.term);
}, true);

/* ---------- 図鑑の「用語集」タブ ---------- */
const CAT_ORDER = ["生成AI", "機械学習", "ネットワーク", "セキュリティ", "可用性・信頼性", "データ・分析", "開発・運用", "アーキテクチャ", "ビジネス・ガバナンス"];
let gq = "", gcat = "all";
export function renderGlossary(box) {
  box.replaceChildren();
  const tools = el("div", "ex-tools gl-tools");
  const input = el("input");
  input.type = "search";
  input.placeholder = "用語を検索(例: LLM、RAG、RPO、べき等)";
  input.value = gq;
  const chips = el("div", "ex-cats");
  const cats = CAT_ORDER.filter((c) => TERMS.some((t) => t.cat === c));
  const other = TERMS.some((t) => !CAT_ORDER.includes(t.cat));
  [["all", `すべて`, TERMS.length], ...cats.map((c) => [c, c, TERMS.filter((t) => t.cat === c).length]), ...(other ? [["other", "その他", TERMS.filter((t) => !CAT_ORDER.includes(t.cat)).length]] : [])].forEach(([v, t, n]) => {
    const b = el("button", "ex-cat");
    b.type = "button";
    b.setAttribute("aria-pressed", String(v === gcat));
    b.append(document.createTextNode(t), el("small", "", String(n)));
    b.addEventListener("click", () => {
      gcat = v;
      renderGlossary(box);
    });
    chips.append(b);
  });
  tools.append(input, chips);
  const list = el("div", "gl-grid");
  const draw = () => {
    const q = gq.trim().toLowerCase();
    const hit = TERMS.filter((t) => (gcat === "all" || (gcat === "other" ? !CAT_ORDER.includes(t.cat) : t.cat === gcat)) && (!q || [t.term, ...(t.aliases || []), t.short, t.body].join(" ").toLowerCase().includes(q)))
      .sort((a, b) => a.term.localeCompare(b.term, "ja"));
    list.replaceChildren(
      ...hit.map((t) => {
        const c = el("button", "gl-card");
        c.type = "button";
        c.dataset.term = t.id;
        c.classList.add("term-link");
        c.append(el("span", "gl-cat", t.cat || ""), el("b", "", t.term), el("span", "gl-short", t.short || ""));
        return c;
      }),
    );
    if (!hit.length) list.append(el("p", "muted", "該当する用語がありません。"));
  };
  input.addEventListener("input", () => {
    gq = input.value;
    draw();
  });
  box.append(tools, list);
  draw();
}
