// 学習計画（#plan）: 取得目標の資格と受験予定日から「最短で合格する」ための日別の学習計画を作り、
// 毎日の記録を残す。記録は 2 種類:
//   自動 … 資格問題演習の回答履歴（aaa.practice.attempts.v1）から、日ごとの回答数・正答率・計画の達成度を集計
//   手動 … 学習時間・調子・振り返りメモ（この画面で入力）
// 保存キー aaa.plan.v1 は学習データとしてアカウントに同期される（account.js の KEYS）。
import { store } from "./storage.js";
import { questions } from "./data/questions.js";
import { EXAMS, examByCode } from "./data/exams.js";
import { goalCodes, goalDate, haveCodes, setGoal, openGoalDialog, MAX_GOALS } from "./goal.js?v=20261117c";

const KEY = "aaa.plan.v1";
const ATT = "aaa.practice.attempts.v1";
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

/* ---------- 日付（端末の現地時間で扱う。toISOString は UTC になり、日本では朝 9 時前に日付がずれるため使わない） ---------- */
const pad = (n) => String(n).padStart(2, "0");
const ymd = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const today = () => ymd(new Date());
const parse = (s) => new Date(s + "T00:00:00");
const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const WD = ["日", "月", "火", "水", "木", "金", "土"];
const md = (s) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
const mdw = (s) => `${md(s)}(${WD[parse(s).getDay()]})`;

/* ---------- 試験ごとの前提 ---------- */
// 1 問あたりの学習時間（問題を解く＋解説を読む）。プロフェッショナルは問題文が長いので長め
const SEC = { Foundational: 75, Business: 75, Associate: 120, Professional: 180, Specialty: 150 };
// 合格ラインの目安（スケールスコアを正答率に置き換えた概算。AWS は換算方法を公開していない）
const PASS = { Foundational: 70, Business: 70, Associate: 72, Professional: 75, Specialty: 75 };
const PHASE = {
  1: ["分野別演習", "配点の高い分野から、全問を 1 周する"],
  2: ["弱点復習", "間違えた問題を正解できるまで解き直す"],
  3: ["総合演習", "全分野を混ぜて、苦手を優先して解く"],
  4: ["模試・仕上げ", "本番と同じ問題数で模試 → 復習 → 最終確認"],
  0: ["休み", "計画上の休養日"],
  5: ["受験日", ""],
};
const qById = new Map(questions.map((q) => [q.id, q]));
const examQs = (code) => questions.filter((q) => q.exams?.[code]);
const planExams = () => EXAMS.filter((e) => (!e.retire || e.retire >= today()) && examQs(e.code).length);

/* ---------- 保存データ ---------- */
function clean(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  const log = p.log && typeof p.log === "object" && !Array.isArray(p.log) ? p.log : {};
  return {
    v: 1,
    exam: examByCode.has(p.exam) ? p.exam : "",
    min: Number.isFinite(p.min) ? Math.min(600, Math.max(15, p.min)) : 90,
    rest: Array.isArray(p.rest) ? p.rest.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6) : [],
    created: typeof p.created === "string" ? p.created : "",
    end: typeof p.end === "string" ? p.end : "",
    fixed: !!p.fixed, // 受験予定日を指定して作った計画か（false = 最短の日程で作った計画）
    q: Number.isFinite(p.q) ? p.q : 0, // 1 日の目標問題数
    days: Array.isArray(p.days) ? p.days.filter((d) => d && typeof d.d === "string" && Array.isArray(d.tasks)) : [],
    log,
  };
}
let plan = clean(store.get(KEY, null));
function save() {
  store.set(KEY, plan);
  window.dispatchEvent(new Event("plan-change"));
}
function readAttempts() {
  try {
    const a = store.get(ATT, []);
    return Array.isArray(a) ? a.filter((x) => x && qById.has(x.id) && typeof x.correct === "boolean" && Number.isFinite(Date.parse(x.at))) : [];
  } catch {
    return [];
  }
}

/* ---------- 現状の分析（回答履歴 → 分野ごとの実施・正答・未回答、日ごとの集計） ---------- */
function analyze(code) {
  const ex = examByCode.get(code);
  const qs = examQs(code);
  const atts = readAttempts()
    .filter((a) => qById.get(a.id).exams?.[code])
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const latest = new Map(), wrongCnt = new Map();
  const days = new Map(); // 日付 → { total, correct, newByDom, review }
  const seen = new Set(), wrongBefore = new Set();
  for (const a of atts) {
    const d = ymd(new Date(a.at));
    const s = days.get(d) || days.set(d, { total: 0, correct: 0, newByDom: {}, review: 0, newTotal: 0 }).get(d);
    const dom = qById.get(a.id).exams[code][0];
    s.total++;
    if (a.correct) s.correct++;
    if (!seen.has(a.id)) {
      s.newByDom[dom] = (s.newByDom[dom] || 0) + 1;
      s.newTotal++;
      seen.add(a.id);
    } else if (wrongBefore.has(a.id)) s.review++;
    if (!a.correct) {
      wrongBefore.add(a.id);
      wrongCnt.set(a.id, (wrongCnt.get(a.id) || 0) + 1);
    }
    latest.set(a.id, a);
  }
  const doms = ex.domains.map(([name, w], i) => {
    const list = qs.filter((q) => q.exams[code][0] === i + 1);
    const answered = list.filter((q) => latest.has(q.id));
    const correct = answered.filter((q) => latest.get(q.id).correct).length;
    return {
      i: i + 1, name, w, total: list.length, answered: answered.length, correct,
      acc: answered.length ? correct / answered.length : null,
      unseen: list.filter((q) => !latest.has(q.id)).map((q) => q.id),
      ids: list.map((q) => q.id),
    };
  });
  const answeredN = doms.reduce((a, d) => a + d.answered, 0);
  const correctN = doms.reduce((a, d) => a + d.correct, 0);
  // 1 周目で間違える割合の見込み（回答が少ないうちは 35% と仮定）
  const wr = answeredN >= 20 ? Math.min(0.6, Math.max(0.1, 1 - correctN / answeredN)) : 0.35;
  const wrongNow = [...latest.values()].filter((a) => !a.correct).map((a) => a.id);
  return { code, ex, qs, atts, latest, wrongCnt, days, doms, wr, wrongNow, answeredN, correctN };
}
const secOf = (ex) => SEC[ex.level] || 120;
const passOf = (ex) => PASS[ex.level] || 72;
const capOf = (ex, min) => Math.max(5, Math.floor((min * 60) / secOf(ex)));

/* ---------- 計画の作成 ---------- */
// 必要な学習日（作業）を、1 日 Q 問として順に並べる。
//  フェーズ1: 配点の高い分野から未回答の問題を 1 周（2 日目以降は前日までの誤答の復習を 2 割入れる）
//  フェーズ2: 残った誤答の解き直し（2 周目でも一部は間違える前提で 1.3 倍）
//  フェーズ4: 模試 → 模試の復習 → 模試 → 最終確認（最後の 4 学習日）
//  日数に余裕があるときは、フェーズ2 と 4 の間を「総合演習」で埋める
function buildWork(st, Q) {
  const real = st.ex.real[0];
  const queue = [...st.doms].sort((a, b) => b.w - a.w || a.i - b.i).map((d) => ({ dom: d.i, left: d.unseen.length })).filter((x) => x.left > 0);
  let pool = st.wrongNow.length;
  const work = [];
  while (queue.length) {
    const tasks = [];
    const rev = pool > 0 ? Math.min(pool, Math.max(1, Math.round(Q * 0.2))) : 0;
    let cap = Q - rev, taken = 0;
    while (cap > 0 && queue.length) {
      const h = queue[0], t = Math.min(cap, h.left);
      tasks.push({ k: "new", dom: h.dom, n: t });
      h.left -= t;
      cap -= t;
      taken += t;
      if (!h.left) queue.shift();
    }
    if (rev) {
      tasks.push({ k: "review", n: rev });
      pool -= rev;
    }
    pool += Math.round(taken * st.wr);
    work.push({ ph: 1, tasks });
  }
  pool = Math.ceil(pool * 1.3);
  while (pool > 0) {
    const n = Math.min(Q, pool);
    work.push({ ph: 2, tasks: [{ k: "review", n }] });
    pool -= n;
  }
  const tail = [
    { ph: 4, tasks: [{ k: "mock", n: real }] },
    { ph: 4, tasks: [{ k: "review", n: Math.max(5, Math.round(real * st.wr)) }] },
    { ph: 4, tasks: [{ k: "mock", n: real }] },
    { ph: 4, tasks: [{ k: "final" }] },
  ];
  return { work, tail };
}
/** start から、休みの曜日を除いた学習日を n 日ぶん（end の前日まで） */
function studyDates(start, n, rest, end) {
  const out = [];
  for (let d = start, guard = 0; out.length < n && guard < 800; d = addDays(d, 1), guard++) {
    if (end && d >= end) break;
    if (!rest.includes(parse(d).getDay())) out.push(d);
  }
  return out;
}
/** 計画を作る。end を指定しない場合は、1 日の学習時間で最短に終わる日程にする */
function makePlan({ code, min, rest, end, from }) {
  const st = analyze(code);
  const base = capOf(st.ex, min);
  const start = from || today();
  const shortest = (() => {
    const { work, tail } = buildWork(st, base);
    const ds = studyDates(start, work.length + tail.length, rest);
    return { days: ds.length, exam: addDays(ds[ds.length - 1] || start, 1) };
  })();
  let Q = base, work, tail, dates, short = false;
  if (!end) {
    ({ work, tail } = buildWork(st, Q));
    dates = studyDates(start, work.length + tail.length, rest);
    end = addDays(dates[dates.length - 1] || start, 1);
  } else {
    const avail = studyDates(start, 9999, rest, end);
    // 受験日までに収まるまで 1 日の問題数を増やす（上限 1 日 300 問）
    for (; Q <= 300; Q += Math.max(1, Math.round(Q * 0.05))) {
      ({ work, tail } = buildWork(st, Q));
      if (work.length + tail.length <= avail.length) break;
    }
    if (work.length + tail.length > avail.length) {
      // それでも足りない（受験日が近すぎる）: 仕上げを優先し、入りきる分だけにする
      short = true;
      const keepTail = tail.slice(-Math.min(tail.length, avail.length));
      work = work.slice(0, Math.max(0, avail.length - keepTail.length));
      tail = keepTail;
    }
    const extra = avail.length - work.length - tail.length;
    for (let i = 0; i < extra; i++) work.push({ ph: 3, tasks: [{ k: "mix", n: Q }] });
    dates = avail;
  }
  const seq = [...work, ...tail];
  const days = [];
  let k = 0;
  for (let d = start; d < end; d = addDays(d, 1)) {
    if (rest.includes(parse(d).getDay()) || k >= seq.length) days.push({ d, ph: 0, tasks: [{ k: "rest" }] });
    else days.push({ d, ...seq[k++] });
  }
  days.push({ d: end, ph: 5, tasks: [{ k: "exam" }] });
  return { st, days, end, Q, base, short, shortest };
}

/* ---------- 日ごとの達成度 ---------- */
const dayStat = (st, d) => st.days.get(d) || { total: 0, correct: 0, newByDom: {}, review: 0, newTotal: 0 };
function taskDone(t, s, log) {
  if (t.k === "new") return s.newByDom[t.dom] || 0;
  if (t.k === "review") return s.review;
  if (t.k === "mix" || t.k === "mock") return s.total;
  if (t.k === "final") return log?.chk?.includes("final") ? 1 : 0;
  return 0;
}
const taskTarget = (t) => (t.k === "final" ? 1 : t.n || 0);
function dayRate(day, st) {
  const s = dayStat(st, day.d), log = plan.log[day.d];
  let need = 0, got = 0;
  for (const t of day.tasks) {
    const n = taskTarget(t);
    if (!n) continue;
    need += n;
    got += Math.min(n, taskDone(t, s, log));
  }
  return need ? got / need : null;
}
function taskLabel(t, ex) {
  if (t.k === "new") return `分野${t.dom}「${ex.domains[t.dom - 1]?.[0] || ""}」の新しい問題`;
  if (t.k === "review") return "間違えた問題の解き直し";
  if (t.k === "mix") return "総合演習（苦手を優先・全分野）";
  if (t.k === "mock") return `模試（本番と同じ ${t.n} 問・${ex.real[1]} 分）`;
  if (t.k === "final") return "最終確認：誤答ノート・メモ・苦手サービスを見直す";
  if (t.k === "rest") return "休み（無理せず、気になる問題を数問だけでも OK）";
  if (t.k === "exam") return `受験日 — ${ex.code} ${ex.name}`;
  return "";
}

/* ---------- 課題から演習を始める（資格問題演習の「指定出題」を使う） ---------- */
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function idsFor(t, st, left) {
  const n = Math.max(1, left);
  const wrongSorted = () => [...st.wrongNow].sort((a, b) => (st.wrongCnt.get(b) || 0) - (st.wrongCnt.get(a) || 0));
  if (t.k === "new") {
    const d = st.doms[t.dom - 1];
    const extra = shuffle(d.ids.filter((id) => !d.unseen.includes(id))).sort((a, b) => (st.latest.get(a)?.correct ? 1 : 0) - (st.latest.get(b)?.correct ? 1 : 0));
    return [...shuffle([...d.unseen]), ...extra].slice(0, n);
  }
  if (t.k === "review") {
    const w = wrongSorted();
    if (w.length >= n) return w.slice(0, n);
    // 誤答が足りないときは、正答率の低い分野の問題で補う
    const weak = [...st.doms].filter((d) => d.total).sort((a, b) => (a.acc ?? 0) - (b.acc ?? 0))[0];
    return [...w, ...shuffle(weak.ids.filter((id) => !w.includes(id)))].slice(0, n);
  }
  if (t.k === "mix") {
    // 未回答・直近不正解を優先し、正解済みは少しだけ混ぜる
    const score = (id) => (!st.latest.has(id) ? 2 : !st.latest.get(id).correct ? 3 : 0.4) + Math.random();
    return st.qs.map((q) => q.id).sort((a, b) => score(b) - score(a)).slice(0, n);
  }
  if (t.k === "mock") {
    // 分野の配点比率どおりに、ランダムに選ぶ
    const total = st.ex.domains.reduce((a, [, w]) => a + w, 0);
    const out = [];
    st.doms.forEach((d) => out.push(...shuffle([...d.ids]).slice(0, Math.round((t.n * d.w) / total))));
    const rest = shuffle(st.qs.map((q) => q.id).filter((id) => !out.includes(id)));
    while (out.length < t.n && rest.length) out.push(rest.pop());
    return shuffle(out.slice(0, t.n));
  }
  return [];
}
function startTask(t, st, left) {
  const ids = idsFor(t, st, left);
  if (!ids.length) return;
  window.dispatchEvent(new CustomEvent("practice-preset", { detail: { ids, label: `学習計画：${taskLabel(t, st.ex)}` } }));
  $("quiz-start")?.click();
  location.hash = "practice";
}

/* ---------- 合格ラインへの到達度 ---------- */
function readiness(st) {
  const tw = st.doms.reduce((a, d) => a + d.w, 0) || 1;
  const est = st.doms.reduce((a, d) => a + d.w * (d.acc ?? 0), 0) / tw;
  const cover = st.qs.length ? st.answeredN / st.qs.length : 0;
  const pass = passOf(st.ex);
  const pct = Math.round(est * 100);
  const state = pct >= pass + 5 && cover >= 0.8 ? ["ok", "合格圏"] : pct >= pass - 5 && cover >= 0.5 ? ["near", "あと一歩"] : ["low", "強化中"];
  return { pct, cover: Math.round(cover * 100), pass, state };
}
function streak(st) {
  let d = today(), n = 0;
  const active = (x) => dayStat(st, x).total > 0 || (plan.log[x]?.min || 0) > 0;
  if (!active(d)) d = addDays(d, -1); // 今日まだなら、昨日までの連続日数
  while (active(d) && n < 999) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/* ---------- 画面 ---------- */
const page = $("plan");
let selected = today();
let draftOpen = false; // 設定フォームを開いているか

function settingsForm(st) {
  const box = el("form", "plan-form panel");
  const exams = planExams();
  const goals = goalCodes();
  const cur = plan.exam || goals.find((c) => exams.some((e) => e.code === c)) || "";
  const dateVal = plan.exam && plan.fixed ? plan.end : goalDate() || "";
  box.innerHTML = `<div class="plan-form-h"><h2>${plan.days.length ? "計画を作り直す" : "最短合格プランを作る"}</h2>
    <p>目標の資格と 1 日に使える学習時間から、合格までの日別の計画を作ります。受験予定日を空にすると、最短で受験できる日程を提案します。今までの演習の回答は計画に反映され、記録は作り直しても残ります。</p></div>
    <div class="plan-form-grid">
      <label>資格<select name="exam" required><option value="">選んでください</option>${exams.map((e) => `<option value="${e.code}" ${e.code === cur ? "selected" : ""}>${goals.includes(e.code) ? "🎯 " : ""}${e.code} ${e.name}</option>`).join("")}</select></label>
      <label>1 日の学習時間<select name="min">${[30, 45, 60, 90, 120, 150, 180, 240, 300].map((m) => `<option value="${m}" ${m === plan.min ? "selected" : ""}>${m >= 60 ? `${Math.floor(m / 60)} 時間${m % 60 ? ` ${m % 60} 分` : ""}` : `${m} 分`}</option>`).join("")}</select></label>
      <label>受験予定日（空 = 最短）<input type="date" name="end" value="${dateVal}" min="${addDays(today(), 2)}"></label>
      <fieldset class="plan-rest"><legend>休みの曜日（任意）</legend>${[1, 2, 3, 4, 5, 6, 0].map((w) => `<label><input type="checkbox" name="rest" value="${w}" ${plan.rest.includes(w) ? "checked" : ""}><span>${WD[w]}</span></label>`).join("")}</fieldset>
    </div>
    <p class="plan-preview" role="status"></p>
    <div class="plan-form-acts">${plan.days.length ? '<button type="button" class="goal-btn plan-cancel">キャンセル</button>' : ""}<button type="submit" class="button primary">この内容で計画を作る</button></div>`;
  const read = () => {
    const f = new FormData(box);
    return { code: f.get("exam"), min: Number(f.get("min")), end: f.get("end") || "", rest: f.getAll("rest").map(Number) };
  };
  const preview = () => {
    const o = read(), p = box.querySelector(".plan-preview");
    if (!o.code) {
      p.textContent = goals.length ? "" : "🎯 取得目標の資格をまだ設定していません。ここで資格を選ぶと、目標にも追加します。";
      return;
    }
    if (o.rest.length >= 7) {
      p.textContent = "すべての曜日を休みにはできません。";
      return;
    }
    const r = makePlan({ code: o.code, min: o.min, rest: o.rest, end: o.end || null });
    const ex = r.st.ex, minutes = Math.round((r.Q * secOf(ex)) / 60);
    p.replaceChildren();
    if (!o.end) p.append(el("b", "", `最短の受験日：${mdw(r.end)}（${diffDays(today(), r.end)} 日後）`), document.createTextNode(` ・ 1 日 ${r.Q} 問（約 ${o.min} 分）`));
    else {
      p.append(el("b", "", `${mdw(r.end)} 受験 ・ 1 日 ${r.Q} 問（約 ${minutes} 分）`));
      if (r.short) p.append(el("span", "plan-warn", ` ⚠ 受験日までの日数が足りません。仕上げを優先した計画になります。受験日を ${mdw(r.shortest.exam)} 以降にすると全範囲を回せます。`));
      else if (r.Q > r.base) p.append(el("span", "plan-warn", ` ⚠ 受験日に間に合わせるには 1 日 約 ${minutes} 分 必要です（今の設定では最短 ${mdw(r.shortest.exam)}）。`));
      else if (r.shortest.exam < o.end) p.append(el("span", "plan-hint", ` 💡 今のペースなら ${mdw(r.shortest.exam)} に受験できます（${diffDays(r.shortest.exam, o.end)} 日早く合格を狙えます）。余った日は総合演習に充てます。`));
    }
  };
  box.addEventListener("input", preview);
  box.addEventListener("change", preview);
  preview();
  box.querySelector(".plan-cancel")?.addEventListener("click", () => {
    draftOpen = false;
    render();
  });
  box.addEventListener("submit", (e) => {
    e.preventDefault();
    const o = read();
    if (!o.code || o.rest.length >= 7) return;
    if (plan.days.length && !confirm("今日以降の計画を作り直します（これまでの記録は残ります）。よろしいですか？")) return;
    const r = makePlan({ code: o.code, min: o.min, rest: o.rest, end: o.end || null });
    const t = today();
    const keep = plan.exam === o.code ? plan.days.filter((d) => d.d < t) : [];
    plan = clean({ ...plan, exam: o.code, min: o.min, rest: o.rest, created: plan.exam === o.code && plan.created ? plan.created : t, end: r.end, fixed: !!o.end, q: r.Q, days: [...keep, ...r.days] });
    save();
    // 受験予定日・目標の資格を、取得目標の設定にも反映する
    const g = goalCodes();
    const exams = g.includes(o.code) ? g : g.length < MAX_GOALS ? [o.code, ...g] : g;
    if (exams.includes(o.code) && (o.end || r.end) !== goalDate()) setGoal({ exams, have: haveCodes().filter((c) => c !== o.code), date: o.end || r.end });
    else if (!g.includes(o.code) && exams.includes(o.code)) setGoal({ exams, have: haveCodes().filter((c) => c !== o.code), date: goalDate() });
    draftOpen = false;
    selected = t;
    window.dispatchEvent(new CustomEvent("toast", { detail: `学習計画を作成しました（${mdw(r.end)} 受験）` }));
    render();
  });
  return box;
}

function summary(st) {
  const ex = st.ex, t = today();
  const wrap = el("section", "plan-summary panel");
  const left = diffDays(t, plan.end);
  const head = el("div", "plan-sum-h");
  const title = el("div");
  title.append(el("p", "eyebrow orange", "STUDY PLAN"), el("h2", "", `${ex.code} ${ex.name}`));
  const acts = el("div", "plan-sum-acts");
  const edit = el("button", "goal-btn", "計画を作り直す");
  edit.type = "button";
  edit.addEventListener("click", () => {
    draftOpen = true;
    render();
    page.querySelector(".plan-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  acts.append(edit);
  head.append(title, acts);
  wrap.append(head);
  // 期間とフェーズ
  const r = readiness(st);
  const sk = streak(st);
  const study = plan.days.filter((d) => d.ph >= 1 && d.ph <= 4);
  const passed = study.filter((d) => d.d <= t);
  const doneDays = passed.filter((d) => (dayRate(d, st) ?? 0) >= 1);
  const totalQ = study.reduce((a, d) => a + d.tasks.reduce((x, k) => x + (k.k === "final" ? 0 : k.n || 0), 0), 0);
  const plannedToDate = study.filter((d) => d.d <= t).reduce((a, d) => a + d.tasks.reduce((x, k) => x + (k.k === "final" ? 0 : k.n || 0), 0), 0);
  const actualToDate = [...st.days.entries()].filter(([d]) => d >= plan.created && d <= t).reduce((a, [, s]) => a + s.total, 0);
  const pace = plannedToDate ? actualToDate / plannedToDate : 1;
  const kpis = el("div", "plan-kpis");
  const kpi = (label, value, sub, cls = "") => {
    const k = el("div", "plan-kpi " + cls);
    k.append(el("span", "", label), el("strong", "", value), el("small", "", sub));
    kpis.append(k);
  };
  kpi("受験まで", left > 0 ? `あと ${left} 日` : left === 0 ? "今日" : "終了", `${mdw(plan.end)} ${plan.fixed ? "受験予定" : "受験（最短）"}`);
  kpi("計画どおりのペース", plannedToDate ? `${Math.round(pace * 100)}%` : "—", `今日までの予定 ${plannedToDate} 問 / 実施 ${actualToDate} 問`, pace >= 1 ? "good" : pace >= 0.7 ? "" : "bad");
  kpi("推定得点率", `${r.pct}%`, `合格目安 ${r.pass}% ・ 解いた問題の正答率 ${st.answeredN ? Math.round((st.correctN / st.answeredN) * 100) : 0}% ・ 実施率 ${r.cover}%`, r.state[0] === "ok" ? "good" : r.state[0] === "low" ? "bad" : "");
  kpi("連続学習", `${sk} 日`, `計画達成 ${doneDays.length} / ${passed.length} 日 ・ 全 ${study.length} 学習日 ${totalQ} 問`);
  wrap.append(kpis);
  // フェーズの帯（休みの日は前のフェーズに含める）
  const bar = el("div", "plan-phases");
  const segs = [];
  plan.days.forEach((d) => {
    const ph = d.ph === 0 ? (segs.at(-1)?.ph ?? 1) : d.ph;
    const lastSeg = segs.at(-1);
    if (lastSeg && lastSeg.ph === ph && ph !== 5) {
      lastSeg.to = d.d;
      lastSeg.n++;
    } else segs.push({ ph, from: d.d, to: d.d, n: 1 });
  });
  segs.forEach((g) => {
    const seg = el("div", `plan-phase ph${g.ph}`);
    seg.style.flexGrow = String(g.n);
    seg.title = `${PHASE[g.ph][0]} ${md(g.from)}〜${md(g.to)}（${g.n} 日）\n${PHASE[g.ph][1]}`;
    seg.append(el("b", "", PHASE[g.ph][0]), el("small", "", g.ph === 5 ? md(g.from) : `${md(g.from)}〜${md(g.to)}`));
    if (t >= g.from && t <= g.to) seg.classList.add("now");
    bar.append(seg);
  });
  wrap.append(bar);
  // 注意
  if (plan.fixed && goalDate() && goalDate() !== plan.end && goalCodes().includes(plan.exam))
    wrap.append(el("p", "plan-warn", `⚠ 取得目標の受験予定日（${mdw(goalDate())}）が計画（${mdw(plan.end)}）と違います。「計画を作り直す」で合わせてください。`));
  if (pace < 0.7 && plannedToDate >= 20) wrap.append(el("p", "plan-warn", "⚠ 計画より遅れています。今日の課題を優先するか、「計画を作り直す」で今日からの日程を引き直してください。"));
  return wrap;
}

function dayPanel(st) {
  const ex = st.ex, t = today();
  const day = plan.days.find((d) => d.d === selected) || { d: selected, ph: -1, tasks: [] };
  const s = dayStat(st, selected);
  const log = plan.log[selected] || {};
  const wrap = el("section", "plan-day panel");
  const h = el("div", "plan-day-h");
  const isToday = selected === t, future = selected > t;
  h.append(el("h2", "", `${isToday ? "今日のプラン" : future ? "予定" : "記録"} · ${mdw(selected)}`));
  if (day.ph >= 0) h.append(el("span", `plan-ph-chip ph${day.ph}`, PHASE[day.ph][0]));
  if (!isToday) {
    const back = el("button", "goal-btn", "今日へ");
    back.type = "button";
    back.addEventListener("click", () => {
      selected = t;
      render();
    });
    h.append(back);
  }
  wrap.append(h);
  if (day.ph >= 1 && day.ph <= 4) wrap.append(el("p", "plan-day-lead", PHASE[day.ph][1]));
  // 課題
  const list = el("ul", "plan-tasks");
  if (!day.tasks.length) list.append(el("li", "plan-task muted", "計画の期間外です。"));
  day.tasks.forEach((tk) => {
    const li = el("li", `plan-task k-${tk.k}`);
    const n = taskTarget(tk), done = taskDone(tk, s, log);
    const info = el("div", "plan-task-i");
    info.append(el("b", "", taskLabel(tk, ex)));
    if (tk.k === "final") {
      const lab = el("label", "plan-check");
      const cb = el("input");
      cb.type = "checkbox";
      cb.checked = done >= 1;
      cb.disabled = future;
      cb.addEventListener("change", () => {
        const l = (plan.log[selected] ||= {});
        l.chk = cb.checked ? [...new Set([...(l.chk || []), "final"])] : (l.chk || []).filter((x) => x !== "final");
        save();
        render();
      });
      lab.append(cb, el("span", "", "完了"));
      info.append(lab);
    } else if (n) {
      const bar = el("span", "plan-task-bar");
      const fill = el("i");
      fill.style.width = Math.min(100, Math.round((done / n) * 100)) + "%";
      bar.append(fill);
      info.append(bar, el("small", "", `${Math.min(done, n)} / ${n} 問${done >= n ? " ✓ 達成" : ""}${tk.k === "mock" ? " ・ 本番の時間を測って解く" : ""}`));
    }
    li.append(info);
    if (n && tk.k !== "final" && !future && done < n) {
      const go = el("button", "button primary plan-go", selected === t ? "はじめる" : "取り戻す");
      go.type = "button";
      go.addEventListener("click", () => startTask(tk, st, n - done));
      li.append(go);
    } else if (n && tk.k !== "final" && done >= n && !future) {
      const more = el("button", "goal-btn plan-go", "もう少し");
      more.type = "button";
      more.addEventListener("click", () => startTask(tk, st, Math.max(5, Math.round(n / 3))));
      li.append(more);
    }
    list.append(li);
  });
  wrap.append(list);
  // 記録
  if (!future) {
    const rec = el("div", "plan-record");
    const auto = el("p", "plan-auto");
    const acc = s.total ? Math.round((s.correct / s.total) * 100) : null;
    const rate = dayRate(day, st);
    auto.append(el("b", "", "自動記録"), document.createTextNode(` 回答 ${s.total} 問${acc != null ? `（正答率 ${acc}%）` : ""} ・ 新しい問題 ${s.newTotal} ・ 解き直し ${s.review}${rate != null ? ` ・ 計画の達成度 ${Math.round(rate * 100)}%` : ""}`));
    rec.append(auto);
    const est = Math.round((s.total * secOf(ex)) / 60);
    const form = el("div", "plan-rec-grid");
    form.innerHTML = `<label>学習時間（分）<span class="plan-min"><input type="number" min="0" max="1440" step="5" inputmode="numeric" value="${log.min ?? ""}" placeholder="${est || 0}">${est ? `<button type="button" class="goal-btn plan-est">演習から推定 ${est} 分</button>` : ""}</span></label>
      <fieldset class="plan-mood"><legend>調子</legend>${[["4", "😄", "好調"], ["3", "🙂", "ふつう"], ["2", "😐", "いまいち"], ["1", "😣", "不調"]].map(([v, e, l]) => `<label title="${l}"><input type="radio" name="mood-${selected}" value="${v}" ${String(log.mood) === v ? "checked" : ""}><span>${e}<small>${l}</small></span></label>`).join("")}</fieldset>
      <label class="plan-note">振り返り（分かったこと・苦手・明日やること）<textarea rows="3" maxlength="2000" placeholder="例：Transit Gateway と VPC ピアリングの使い分けで迷った。明日もう一度。">${(log.note || "").replace(/</g, "&lt;")}</textarea></label>`;
    let tmr = 0;
    const commit = () => {
      const min = form.querySelector('input[type="number"]').value;
      const mood = form.querySelector(".plan-mood input:checked")?.value;
      const note = form.querySelector("textarea").value.trim();
      const l = { ...(plan.log[selected] || {}) };
      if (min === "") delete l.min;
      else l.min = Math.min(1440, Math.max(0, Math.round(Number(min) || 0)));
      if (mood) l.mood = Number(mood);
      if (note) l.note = note;
      else delete l.note;
      if (Object.keys(l).length) plan.log[selected] = l;
      else delete plan.log[selected];
      save();
      status.textContent = "保存しました";
      refreshCalendar(st);
    };
    const status = el("small", "plan-saved", "");
    status.setAttribute("role", "status");
    form.addEventListener("input", () => {
      status.textContent = "保存中…";
      clearTimeout(tmr);
      tmr = setTimeout(commit, 500);
    });
    form.querySelector(".plan-est")?.addEventListener("click", () => {
      form.querySelector('input[type="number"]').value = est;
      commit();
    });
    rec.append(form, status);
    wrap.append(rec);
  }
  return wrap;
}

let calBox = null;
function calendar(st) {
  const wrap = el("section", "plan-cal panel");
  const h = el("div", "plan-cal-h");
  h.append(el("h2", "", "毎日の記録"));
  const lg = el("span", "plan-legend");
  lg.innerHTML = '<i class="lv0"></i>未実施 <i class="lv1"></i>一部 <i class="lv2"></i>半分以上 <i class="lv3"></i>達成 <i class="rest"></i>休み';
  h.append(lg);
  wrap.append(h);
  calBox = el("div", "plan-cal-grid");
  wrap.append(calBox);
  refreshCalendar(st);
  return wrap;
}
function refreshCalendar(st) {
  if (!calBox) return;
  const t = today();
  const first = plan.days[0]?.d || t, last = plan.end || t;
  // 月曜はじまりの週で並べる
  let s = first;
  while (parse(s).getDay() !== 1) s = addDays(s, -1);
  const byDate = new Map(plan.days.map((d) => [d.d, d]));
  calBox.replaceChildren();
  ["月", "火", "水", "木", "金", "土", "日"].forEach((w) => calBox.append(el("span", "plan-cal-wd", w)));
  let e = last;
  while (parse(e).getDay() !== 0) e = addDays(e, 1);
  for (let d = s; d <= e; d = addDays(d, 1)) {
    const day = byDate.get(d);
    const b = el("button", "plan-cell");
    b.type = "button";
    if (!day) {
      b.classList.add("out");
      b.disabled = true;
      b.textContent = "";
      calBox.append(b);
      continue;
    }
    const stt = dayStat(st, d), log = plan.log[d];
    const rate = dayRate(day, st);
    let lv = "";
    if (day.ph === 0) lv = "rest";
    else if (day.ph === 5) lv = "exam";
    else if (d <= t) lv = rate == null ? "lv0" : rate >= 1 ? "lv3" : rate >= 0.5 ? "lv2" : rate > 0 || stt.total ? "lv1" : d < t ? "lv0 miss" : "lv0";
    else lv = "future";
    b.className = `plan-cell ${lv} ph${day.ph}`;
    if (d === t) b.classList.add("today");
    if (d === selected) b.classList.add("sel");
    b.append(el("span", "plan-cell-d", Number(d.slice(8)) === 1 || d === s || d === first ? md(d) : String(Number(d.slice(8)))));
    const mark = day.ph === 5 ? "🎯" : log?.mood ? ["", "😣", "😐", "🙂", "😄"][log.mood] : stt.total ? String(stt.total) : log?.note ? "✎" : "";
    if (mark) b.append(el("small", "", mark));
    b.title = `${mdw(d)} ${PHASE[day.ph][0]}${d <= t && day.ph >= 1 && day.ph <= 4 ? ` ・ 回答 ${stt.total} 問 ・ 達成度 ${Math.round((rate ?? 0) * 100)}%` : ""}${log?.min ? ` ・ ${log.min} 分` : ""}${log?.note ? `\n${log.note.slice(0, 80)}` : ""}`;
    b.addEventListener("click", () => {
      selected = d;
      render();
      page.querySelector(".plan-day")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    calBox.append(b);
  }
}

function domains(st) {
  const wrap = el("section", "plan-doms panel");
  const r = readiness(st);
  const h = el("div", "plan-cal-h");
  h.append(el("h2", "", "分野別の到達度"), el("span", `plan-state ${r.state[0]}`, `${r.state[1]} · 推定得点率 ${r.pct}% / 合格目安 ${r.pass}%`));
  wrap.append(h);
  const list = el("div", "plan-dom-list");
  st.doms.forEach((d) => {
    const row = el("div", "plan-dom");
    const acc = d.acc == null ? null : Math.round(d.acc * 100);
    const name = el("span", "plan-dom-n");
    name.append(el("b", "", `分野${d.i}`), document.createTextNode(` ${d.name}`), el("small", "", ` 配点 ${d.w}%`));
    const bar = el("span", "plan-dom-bar");
    const fill = el("i");
    fill.style.width = (acc ?? 0) + "%";
    fill.className = acc == null ? "" : acc >= r.pass ? "ok" : acc >= r.pass - 15 ? "near" : "low";
    const line = el("b", "plan-dom-line");
    line.style.left = r.pass + "%";
    bar.append(fill, line);
    row.append(name, bar, el("small", "plan-dom-v", `${acc == null ? "未実施" : `正答 ${acc}%`} ・ 実施 ${d.answered}/${d.total}`));
    list.append(row);
  });
  wrap.append(list, el("p", "plan-note-s", "推定得点率は、分野ごとの「各問題の直近の回答」の正答率を配点比率で重み付けした目安です（まだ解いていない問題は 0 点として数えるため、全問を 1 周すると実力に近づきます）。合格ラインは公式スコア（100〜1000）を正答率に置き換えた概算で、AWS は換算方法を公開していません。教材はオリジナル問題のため、合格を保証するものではありません。"));
  return wrap;
}

function render() {
  if (!page) return;
  page.replaceChildren(el("h1", "sr-only", "学習計画"));
  const valid = plan.exam && examByCode.has(plan.exam) && plan.days.length;
  if (!valid) {
    const intro = el("section", "plan-intro panel");
    intro.append(el("p", "eyebrow orange", "STUDY PLAN"), el("h2", "", "合格までの道のりを、日ごとの課題に。"), el("p", "", "資格と学習時間を選ぶだけで、①配点の高い分野から全問を 1 周 → ②間違えた問題の解き直し → ③模試で仕上げ、の順に最短の日程を組みます。毎日の回答は自動で記録され、学習時間・調子・振り返りもここに残せます。"));
    if (!goalCodes().length) {
      const g = el("button", "goal-btn", "🎯 取得目標の資格を設定する");
      g.type = "button";
      g.addEventListener("click", openGoalDialog);
      intro.append(g);
    }
    page.append(intro, settingsForm());
    return;
  }
  const st = analyze(plan.exam);
  if (selected < plan.days[0].d || selected > plan.end) selected = today();
  page.append(summary(st));
  if (draftOpen) page.append(settingsForm());
  const grid = el("div", "plan-grid");
  const main = el("div", "plan-main"), side = el("div", "plan-side");
  main.append(dayPanel(st), domains(st));
  side.append(calendar(st));
  grid.append(main, side);
  page.append(grid);
}

/* ---------- ホームの「今日の学習プラン」 ---------- */
function renderHome() {
  const box = $("plan-home");
  if (!box) return;
  box.replaceChildren();
  const valid = plan.exam && examByCode.has(plan.exam) && plan.days.length;
  const h = el("div", "goal-card-h");
  h.append(el("h2", "", "📅 今日の学習プラン"));
  const open = el("a", "goal-btn", valid ? "学習計画を開く →" : "最短合格プランを作る →");
  open.href = "#plan";
  h.append(open);
  box.append(h);
  if (!valid) {
    box.append(el("p", "goal-card-empty", "資格と 1 日の学習時間から、合格までの日別の計画を作ります。毎日の演習は自動で記録されます。"));
    return;
  }
  const st = analyze(plan.exam), t = today();
  const day = plan.days.find((d) => d.d === t);
  const left = diffDays(t, plan.end);
  box.append(el("p", "goal-card-days", `${st.ex.code} ・ ${mdw(plan.end)} 受験 · ${left > 0 ? `あと ${left} 日` : left === 0 ? "今日が受験日" : "受験日を過ぎました"} ・ 連続 ${streak(st)} 日`));
  if (!day) {
    box.append(el("p", "goal-card-empty", t > plan.end ? "計画の期間が終わりました。結果に合わせて次の計画を作りましょう。" : "今日は計画の期間外です。"));
    return;
  }
  const s = dayStat(st, t), log = plan.log[t];
  const list = el("div", "plan-home-list");
  day.tasks.forEach((tk) => {
    const n = taskTarget(tk), done = Math.min(n, taskDone(tk, s, log));
    const a = el("a", "goal-card-item");
    a.href = "#plan";
    a.append(el("b", "", PHASE[day.ph][0]), el("span", "goal-card-name", taskLabel(tk, st.ex)));
    if (n && tk.k !== "final") {
      const bar = el("span", "goal-card-bar");
      const fill = el("i");
      fill.style.width = Math.round((done / n) * 100) + "%";
      bar.append(fill);
      a.append(bar, el("small", "", `${done} / ${n} 問${done >= n ? " ✓" : ""}`));
    } else if (tk.k === "final") a.append(el("small", "", done ? "✓ 完了" : "未完了"));
    list.append(a);
  });
  box.append(list);
}

let dirty = false;
const refresh = () => {
  renderHome();
  if (page && !page.hidden) render();
  else dirty = true;
};
window.addEventListener("learning-update", refresh);
window.addEventListener("goal-change", refresh);
window.addEventListener("route-change", (e) => {
  const p = e.detail?.page;
  if (p === "plan") {
    if (dirty || !page.childElementCount) render();
    dirty = false;
  }
  if (p === "home") renderHome();
});
// 日付が変わったら「今日」を更新する（開きっぱなしの対策）
let lastDay = today();
setInterval(() => {
  if (today() !== lastDay) {
    if (selected === lastDay) selected = today();
    lastDay = today();
    refresh();
  }
}, 60000);
renderHome();
if (page && !page.hidden) render();
