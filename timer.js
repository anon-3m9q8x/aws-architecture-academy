// 演習タイマー: 演習全体の経過時間と 1 問ごとの所要時間を計る。
// モード: up = 経過時間(カウントアップ) / exam = 本番ペース(実試験の 試験時間 ÷ 問題数 × 出題数) / custom = 分数を指定 / off = 表示しない
// 制限時間のあるモードは残り時間を表示し、残りわずかで色を変え、時間切れ後は超過時間を表示する(回答は続けられる)。
// 設定(モード・指定分数)は aaa.practice.timer.v1 に保存する(この端末のみ)。
import { store } from "./storage.js";
import { toast } from "./ui.js";

const KEY = "aaa.practice.timer.v1";
const PACE_MIN = 2; // 試験情報が無いときの 1 問あたりの目安(分)。SAA-C03 は 130 分 / 65 問 = 2 分
const MODES = ["up", "exam", "custom", "off"];

let conf = (() => {
  let v = null;
  try { v = store.get(KEY, null); } catch { v = null; }
  const mode = MODES.includes(v?.mode) ? v.mode : "up";
  const minutes = Number.isFinite(v?.minutes) && v.minutes >= 1 && v.minutes <= 600 ? Math.round(v.minutes) : 20;
  return { mode, minutes };
})();
const saveConf = () => { try { store.set(KEY, conf); } catch { /* 保存できなくても動作は続ける */ } };

export const fmt = (ms) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};

/* ---------- 設定画面のコントロール ---------- */
export function bindSetup(modeSel, minInput, minWrap, hint) {
  if (!modeSel) return;
  modeSel.value = conf.mode;
  if (minInput) minInput.value = conf.minutes;
  const sync = () => {
    if (minWrap) minWrap.hidden = modeSel.value !== "custom";
    if (hint) hint.textContent = modeSel.value === "exam" ? "本番と同じ 1 問あたりの時間で制限時間を決めます(例：SAA-C03 は 130分 / 65問 ≈ 2分/問)" : "";
  };
  modeSel.addEventListener("change", () => {
    conf.mode = MODES.includes(modeSel.value) ? modeSel.value : "up";
    saveConf();
    sync();
  });
  minInput?.addEventListener("change", () => {
    const n = Math.round(Number(minInput.value));
    conf.minutes = Number.isFinite(n) ? Math.min(600, Math.max(1, n)) : 20;
    minInput.value = conf.minutes;
    saveConf();
  });
  sync();
}

/* ---------- 演習中のタイマー ---------- */
const st = { total: 0, per: [], limit: 0, running: false, last: 0, pos: 0, warned: false, over: false, active: false, frozen: false };
let iv = 0;
// 残りわずかとみなす時間: 制限時間の 10%(30 秒〜5 分)
const lowAt = () => Math.min(5 * 60000, Math.max(30000, st.limit * 0.1));
const ICON_PAUSE = '<svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true"><rect x="2" y="1.5" width="2.8" height="9" rx="0.8" fill="currentColor"/><rect x="7.2" y="1.5" width="2.8" height="9" rx="0.8" fill="currentColor"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true"><path d="M3 1.6v8.8a.6.6 0 0 0 .9.5l7-4.4a.6.6 0 0 0 0-1L3.9 1.1a.6.6 0 0 0-.9.5z" fill="currentColor"/></svg>';
let ui = null; // { box, main, label, q, toggle, reset, workspace }

export function mount(box, workspace) {
  if (!box) return;
  box.replaceChildren();
  const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const label = mk("span", "qt-label", "経過");
  const main = mk("b", "qt-main", "00:00");
  const q = mk("span", "qt-q", "この問題 00:00");
  const toggle = mk("button", "qt-btn");
  toggle.type = "button";
  const reset = mk("button", "qt-btn", "↺");
  reset.type = "button";
  reset.title = "タイマーをリセット(0 から計り直す)";
  reset.setAttribute("aria-label", "タイマーをリセット");
  const clock = mk("span", "qt-clock");
  clock.setAttribute("role", "timer");
  clock.append(label, main);
  box.append(clock, q, toggle, reset);
  const flip = () => { if (!st.active || st.frozen) return; st.running ? pause() : resume(); };
  // タイマーの表示部分のどこを押しても一時停止/再開(リセットボタンだけは別)
  box.tabIndex = 0;
  box.setAttribute("role", "button");
  box.addEventListener("click", (e) => { if (e.target.closest(".qt-reset")) return; flip(); });
  box.addEventListener("keydown", (e) => {
    if (e.target !== box || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    flip();
  });
  // 一時停止中は、ぼかした問題パネルを押しても再開できる
  workspace?.addEventListener("click", (e) => {
    if (!workspace.classList.contains("timer-paused") || !e.target.closest(".question-panel")) return;
    e.preventDefault();
    e.stopPropagation();
    resume();
  }, true);
  toggle.tabIndex = -1;
  reset.classList.add("qt-reset");
  reset.addEventListener("click", (e) => {
    e.stopPropagation();
    st.total = 0;
    st.per = st.per.map(() => 0);
    st.warned = st.over = false;
    st.last = performance.now();
    paint();
    toast("タイマーをリセットしました");
  });
  ui = { box, main, label, q, toggle, reset, workspace };
}

function tick() {
  if (!st.running) return;
  const now = performance.now();
  const d = now - st.last;
  st.last = now;
  st.total += d;
  st.per[st.pos] = (st.per[st.pos] || 0) + d;
  paint();
}

function paint() {
  if (!ui) return;
  const limited = st.limit > 0;
  const left = st.limit - st.total;
  ui.box.hidden = !st.active;
  ui.label.textContent = limited ? (left >= 0 ? "残り" : "超過") : "経過";
  ui.main.textContent = limited ? (left >= 0 ? fmt(left + 999) : "+" + fmt(-left)) : fmt(st.total);
  ui.q.textContent = `この問題 ${fmt(st.per[st.pos] || 0)}`;
  const low = limited && left >= 0 && left <= lowAt();
  ui.box.classList.toggle("low", low);
  ui.box.classList.toggle("over", limited && left < 0);
  ui.box.classList.toggle("paused", !st.running && !st.frozen);
  ui.box.title = limited ? `制限時間 ${fmt(st.limit)} · 経過 ${fmt(st.total)}` : `演習の経過時間 ${fmt(st.total)}`;
  ui.toggle.innerHTML = st.running ? ICON_PAUSE : ICON_PLAY;
  ui.toggle.title = st.running ? "タイマーを一時停止" : "タイマーを再開";
  ui.toggle.setAttribute("aria-label", ui.toggle.title);
  ui.box.setAttribute("aria-label", (st.running ? "タイマーを一時停止" : "タイマーを再開") + "(タイマーを押す)");
  ui.toggle.hidden = st.frozen;
  ui.reset.hidden = st.frozen;
  ui.workspace?.classList.toggle("timer-paused", !st.running && st.active && !st.frozen);
  if (limited && low && !st.warned) {
    st.warned = true;
    toast(`残り時間 ${fmt(left + 999)} です`);
  }
  if (limited && left < 0 && !st.over) {
    st.over = true;
    st.warned = true;
    toast("制限時間になりました。このまま回答を続けられます(超過時間を表示します)");
  }
}

/** 制限時間(ms)。exam モードは実試験の [問題数, 分] から 1 問あたりの時間 × 出題数 */
function limitFor(n, real) {
  if (conf.mode === "custom") return conf.minutes * 60000;
  if (conf.mode === "exam") {
    const per = Array.isArray(real) && real[0] > 0 && real[1] > 0 ? real[1] / real[0] : PACE_MIN;
    return Math.max(1, Math.ceil(per * n)) * 60000;
  }
  return 0;
}

/** 演習の開始。snap があれば中断時の状態から再開する */
export function start(n, real, snap) {
  clearInterval(iv);
  const off = snap ? snap.off : conf.mode === "off";
  st.active = !off;
  st.frozen = false;
  st.total = snap ? Math.max(0, Number(snap.total) || 0) : 0;
  st.per = Array.from({ length: n }, (_, i) => Math.max(0, Number(snap?.per?.[i]) || 0));
  st.limit = snap ? Math.max(0, Number(snap.limit) || 0) : off ? 0 : limitFor(n, real);
  st.warned = st.limit > 0 && st.limit - st.total <= lowAt();
  st.over = st.limit > 0 && st.total > st.limit;
  st.pos = 0;
  st.running = true;
  st.last = performance.now();
  iv = setInterval(tick, 250);
  paint();
}
/** 表示中の問題が変わった(1 問ごとの時間の計測先) */
export function at(i) {
  tick();
  st.pos = i;
  paint();
}
export function pause() {
  if (!st.running) return;
  tick();
  st.running = false;
  paint();
}
export function resume() {
  if (st.running || st.frozen) return;
  st.running = true;
  st.last = performance.now();
  paint();
}
/** 結果表示・終了: 計測を止めて値を固定する */
export function finish() {
  tick();
  st.running = false;
  st.frozen = true;
  clearInterval(iv);
  paint();
  return summary();
}
export function stop() {
  finish();
  st.active = false;
  paint();
}
export function summary() {
  return { total: st.total, per: [...st.per], limit: st.limit, active: st.active };
}
/** 一時中断で保存する値 */
export function snapshot() {
  tick();
  return { total: Math.round(st.total), per: st.per.map(Math.round), limit: st.limit, off: !st.active };
}
