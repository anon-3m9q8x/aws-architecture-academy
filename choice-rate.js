// 選択肢の「選んだらまずい度」。資格問題演習の不正解の選択肢すべてに、あらかじめ 3 段階の評価と理由を設定している。
// データ: data/badness/<試験コード>.json = { 問題ID: { 選択肢番号: [段階 1〜3, 理由] } }(試験ごとに必要なときだけ読み込む)
//   1 惜しい … 方向性は合っていて要件の一部は満たす・条件次第で成り立つ
//   2 不適切 … 要件を満たさない・目的違い・過剰
//   3 危険   … 採用するとセキュリティ事故・データ損失・障害・法令違反などを招く
export const LEVELS = [
  [3, "危険", "採用するとセキュリティ事故・データ損失・障害・法令違反などを招く"],
  [2, "不適切", "要件を満たさない・目的違い・過剰"],
  [1, "惜しい", "方向性は合っていて、条件次第では成り立つ"],
];
const ICON = { 1: "△", 2: "✕", 3: "☠" };
const NAME = { 1: "惜しい", 2: "不適切", 3: "危険" };
const cache = new Map(); // 試験コード → Promise<データ>
const codeOf = (qid) => qid.split("-").slice(0, 2).join("-");
function load(qid) {
  const code = codeOf(qid);
  if (!/^[A-Z]{3}-C\d\d$/.test(code)) return Promise.resolve({});
  if (!cache.has(code)) cache.set(code, fetch(`data/badness/${code}.json?v=20261118`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
  return cache.get(code);
}
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
export const badge = (lv) => el("span", `cr-badge cr-${lv}`, `${ICON[lv]} ${NAME[lv]}`);

/** 不正解の選択肢に付ける「選んだらまずい度」(読み込み後に中身が入る) */
export function rateTag(q, i) {
  const box = el("div", "cr-tag");
  box.hidden = true;
  load(q.id).then((d) => {
    const v = d[q.id]?.[i];
    if (!v) return;
    const [lv, why] = v;
    box.append(el("span", "cr-q", "選んだらまずい度"), badge(lv), el("span", "cr-why", why || ""));
    box.dataset.lv = lv;
    box.hidden = false;
  });
  return box;
}
/** 選択肢一覧の上の要約 */
export function rateSummary(q) {
  const p = el("p", "cr-summary");
  p.hidden = true;
  load(q.id).then((d) => {
    const m = d[q.id];
    if (!m) return;
    p.append(el("b", "", "選んだらまずい度"));
    [3, 2, 1].forEach((lv) => {
      const n = Object.values(m).filter((v) => v[0] === lv).length;
      if (n) p.append(document.createTextNode(" "), badge(lv), document.createTextNode(` ${n}`));
    });
    p.append(el("small", "", "　危険 ＞ 不適切 ＞ 惜しい の順に、本番で選ぶと困る選択肢です。"));
    p.hidden = false;
  });
  return p;
}
/** 選んだ不正解の選択肢が「危険」「不適切」だったときの注意(結果の見出しに表示) */
export function chosenAlert(q, sel, letters) {
  const p = el("p", "cr-alert");
  p.hidden = true;
  load(q.id).then((d) => {
    const m = d[q.id] || {};
    const bad = [...sel].filter((i) => !q.choices[i]?.correct && m[i]?.[0] >= 2).map((i) => [i, m[i][0]]);
    if (!bad.length) return;
    const worst = Math.max(...bad.map((b) => b[1]));
    p.append(document.createTextNode(`⚠ 選んだ選択肢 ${bad.map(([i]) => letters[i]).join("・")} は `), ...bad.map(([, lv]) => badge(lv)), document.createTextNode(worst === 3 ? " です。本番の設計で採用すると事故につながる判断なので、理由を必ず確認しましょう。" : " です。要件とのずれを解説で確認しましょう。"));
    p.hidden = false;
  });
  return p;
}
/** 試験のまずい度データを読み込む(振り返りで使う) */
export const badnessFor = load;
