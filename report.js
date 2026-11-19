// 毎日の「学習時間」と「振り返り」を、回答履歴から自動で作る。
// 学習時間 … 回答した時刻の間隔を合計(10 分以上あいたら別の学習として区切り、1 問目の時間を足す)
// 振り返り … その日の回答・正答率・分野別の成績・苦手な問題・再び間違えた問題・克服した問題・選んでしまった危険な選択肢・
//            直近 7 日との比較・計画の達成度から、まとめと明日やることを文章にする。今日の分は途中経過として随時更新される。
import { readAttempts, qById, ymd } from "./review.js?v=20261119a";
import { examByCode, primaryExam } from "./data/exams.js";
import { badnessFor } from "./choice-rate.js?v=20261118e";

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const GAP = 10 * 60 * 1000; // これ以上あいたら別の学習
const STEP_MAX = 6 * 60 * 1000; // 1 問にかけた時間の上限(解説を読んだ時間を含む)
const FIRST = { Foundational: 75, Business: 75, Associate: 120, Professional: 180, Specialty: 150 };
const firstSec = (q) => FIRST[examByCode.get(primaryExam(q))?.level] || 90;
const addDays = (s, n) => {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() + n);
  return ymd(d);
};

/** その日の回答(時刻順) */
function dayAttempts(d, atts) {
  return atts.filter((a) => ymd(new Date(a.at)) === d).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
/** 学習時間(分)。回答の間隔から推定する */
export function studyMinutes(d, atts = readAttempts()) {
  const list = dayAttempts(d, atts);
  if (!list.length) return 0;
  let ms = 0, prev = null;
  for (const a of list) {
    const t = Date.parse(a.at);
    if (prev === null || t - prev > GAP) ms += firstSec(qById.get(a.id)) * 1000; // 学習の 1 問目
    else ms += Math.min(STEP_MAX, t - prev);
    prev = t;
  }
  ms += 60 * 1000; // 最後の問題の解説を読む時間
  return Math.max(1, Math.round(ms / 60000));
}

/** 分野の名前(資格の試験ガイドの分野。サービス知識問題はカテゴリ) */
function domainOf(q) {
  if (q.kind === "service") return { key: "svc:" + q.domain, label: `サービス知識・${q.domain}` };
  const code = primaryExam(q);
  const ex = examByCode.get(code);
  const i = q.exams?.[code]?.[0];
  return { key: `${code}:${i}`, label: `${code} 分野${i} ${ex?.domains[i - 1]?.[0] || q.domain}` };
}
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/** その日の振り返りを集計する */
export function analyzeDay(d, atts = readAttempts()) {
  const list = dayAttempts(d, atts);
  if (!list.length) return null;
  const before = atts.filter((a) => ymd(new Date(a.at)) < d);
  const wrongBefore = new Set(before.filter((a) => !a.correct).map((a) => a.id));
  const seenBefore = new Set(before.map((a) => a.id));
  // 問題ごとのその日の結果
  const per = new Map();
  for (const a of list) {
    const r = per.get(a.id) || per.set(a.id, { id: a.id, n: 0, ok: 0, last: false, chosen: [] }).get(a.id);
    r.n++;
    if (a.correct) r.ok++;
    r.last = a.correct;
    if (!a.correct && Array.isArray(a.chosen)) r.chosen.push(...a.chosen);
  }
  const recs = [...per.values()];
  const correct = list.filter((a) => a.correct).length;
  // 分野別
  const dom = new Map();
  for (const a of list) {
    const k = domainOf(qById.get(a.id));
    const x = dom.get(k.key) || dom.set(k.key, { ...k, n: 0, ok: 0 }).get(k.key);
    x.n++;
    if (a.correct) x.ok++;
  }
  const doms = [...dom.values()].sort((a, b) => b.n - a.n);
  // 直近 7 日(この日を除く)
  const from = addDays(d, -7);
  const week = before.filter((a) => ymd(new Date(a.at)) >= from);
  const weekAcc = week.length ? pct(week.filter((a) => a.correct).length, week.length) : null;
  return {
    d, list, recs,
    total: list.length, correct, acc: pct(correct, list.length),
    fresh: recs.filter((r) => !seenBefore.has(r.id)).length,
    redo: recs.filter((r) => seenBefore.has(r.id)).length,
    relapse: recs.filter((r) => wrongBefore.has(r.id) && !r.last), // 前にも間違えて、また間違えた
    overcome: recs.filter((r) => wrongBefore.has(r.id) && r.last), // 前に間違えた問題を正解した
    weak: recs.filter((r) => !r.last).sort((a, b) => b.n - b.ok - (a.n - a.ok)),
    doms,
    weekAcc,
    minutes: studyMinutes(d, atts),
  };
}

const conceptOf = (id) => {
  const q = qById.get(id);
  return q?.concept || q?.topic || q?.prompt?.slice(0, 30) || id;
};

/**
 * 振り返りの表示。opts: { today:boolean, rate:計画の達成度(0〜1|null), tomorrow:[明日の課題の文], review:前日の復習の実施状況 }
 */
export function dailyReport(d, opts = {}) {
  const box = el("div", "auto-report");
  const r = analyzeDay(d);
  const head = el("p", "auto-report-h");
  head.append(el("b", "", opts.today ? "📝 今日の振り返り（自動・途中経過）" : "📝 この日の振り返り（自動）"));
  box.append(head);
  if (!r) {
    box.append(el("p", "auto-report-empty", opts.today ? "まだ問題を解いていません。演習で回答すると、学習時間と振り返りが自動でまとまります。" : "この日は問題を解いていません。"));
    return box;
  }
  // 1. 概要
  const diff = r.weekAcc == null ? "" : r.acc - r.weekAcc;
  const sum = el("p", "auto-report-sum");
  sum.textContent =
    `${r.total} 回答（新しい問題 ${r.fresh}・解き直し ${r.redo}）、正答率 ${r.acc}%、学習時間 約 ${r.minutes} 分。` +
    (r.weekAcc == null ? "" : `直近 7 日の平均 ${r.weekAcc}% より ${diff >= 0 ? `+${diff}` : diff} ポイント${diff >= 5 ? "で、調子が上がっています" : diff <= -5 ? "で、やや下がりました" : "で、ほぼ横ばいです"}。`) +
    (opts.rate != null ? ` 計画の達成度は ${Math.round(opts.rate * 100)}%${opts.rate >= 1 ? "（達成）" : ""}。` : "");
  box.append(sum);
  const ul = el("ul", "auto-report-list");
  const li = (icon, title, text) => {
    const x = el("li");
    x.append(el("span", "ar-ic", icon), el("b", "", title), document.createTextNode(" " + text));
    ul.append(x);
  };
  // 2. 分野別(得意・苦手)
  const strong = r.doms.filter((x) => x.n >= 3 && pct(x.ok, x.n) >= 80);
  const weakD = r.doms.filter((x) => x.n >= 2 && pct(x.ok, x.n) < 60).sort((a, b) => pct(a.ok, a.n) - pct(b.ok, b.n));
  li("📊", "分野別", r.doms.slice(0, 4).map((x) => `${x.label} ${x.ok}/${x.n}（${pct(x.ok, x.n)}%）`).join("、") + (r.doms.length > 4 ? ` ほか ${r.doms.length - 4} 分野` : ""));
  if (strong.length) li("👍", "よくできた", strong.map((x) => x.label).join("、") + " は 8 割以上正解できています。");
  if (weakD.length) li("⚠", "苦手な分野", weakD.slice(0, 3).map((x) => `${x.label}（${pct(x.ok, x.n)}%）`).join("、") + " の正答率が低めです。");
  // 3. 苦手な問題・再発・克服
  if (r.weak.length) li("✕", "間違えた論点", r.weak.slice(0, 5).map((x) => conceptOf(x.id)).join("／") + (r.weak.length > 5 ? ` ほか ${r.weak.length - 5} 問` : ""));
  if (r.relapse.length) li("🔁", "再び間違えた", `${r.relapse.length} 問は以前も間違えた問題です（${r.relapse.slice(0, 3).map((x) => conceptOf(x.id)).join("／")}）。理解があいまいなまま覚えている可能性があるので、解説の根拠ラインを確認しましょう。`);
  if (r.overcome.length) li("✓", "克服", `以前間違えた ${r.overcome.length} 問に正解できました。`);
  // 4. 選んでしまった危険な選択肢(あとから埋める)
  const danger = el("li");
  danger.hidden = true;
  ul.append(danger);
  Promise.all(r.weak.map((x) => badnessFor(x.id).then((m) => ({ x, m: m[x.id] || {} })))).then((rows) => {
    const hits = rows.flatMap(({ x, m }) => [...new Set(x.chosen)].filter((i) => m[i]?.[0] === 3).map((i) => ({ id: x.id, why: m[i][1] })));
    if (!hits.length) return;
    danger.append(el("span", "ar-ic", "☠"), el("b", "", "危険な選択肢"), document.createTextNode(` ${hits.length} 回、本番で採用すると事故につながる選択肢を選びました（${hits.slice(0, 2).map((h) => h.why).join("／")}）。`));
    danger.hidden = false;
  });
  box.append(ul);
  // 5. 明日やること
  const next = [];
  if (r.weak.length) next.push(`前日の復習で、間違えた ${r.weak.length} 問とその類題を解き直す`);
  if (weakD[0]) next.push(`${weakD[0].label} を重点的に演習する`);
  if (r.relapse.length) next.push(`再び間違えた ${r.relapse.length} 問は、正解の根拠を言葉で説明できるか確認する`);
  (opts.tomorrow || []).slice(0, 2).forEach((t) => next.push(`計画：${t}`));
  if (!next.length) next.push("正答率が高いので、新しい分野や本番形式の問題に進む");
  const nx = el("div", "auto-report-next");
  nx.append(el("b", "", opts.today ? "明日やること" : "次の日にやること"));
  const ol = el("ol");
  next.forEach((t) => ol.append(el("li", "", t)));
  nx.append(ol);
  box.append(nx);
  return box;
}
