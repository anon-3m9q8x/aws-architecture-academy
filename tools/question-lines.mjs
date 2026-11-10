// 「根拠ライン」の抽出: 問題文のどの部分から正解が導き出せるかを推定する。
// 問題文を句(、。区切り)に分け、①正解の選択肢・解説と共有する語(珍しい語ほど重い。誤答とも共有する語は軽く)
// ②要件・制約を表す言い回し(最も〜 / 〜したい / 〜てはならない / 時間・数値)で点を付け、上位の句を選ぶ。
// 選んだ句には、最も多く語を共有する解説の一文を対応付ける。

const KATA = "ァ-ヴー";
const TOKEN_RE = new RegExp(`[A-Za-z][A-Za-z0-9.\\-/@]*[A-Za-z0-9]|[0-9][0-9,.]*\\s?(?:%|ミリ秒|秒|分|時間|日|週間|か月|ヶ月|年|GB|TB|PB|MB|KB|台|件|回|倍|TPS|ms)?|[${KATA}]{2,}|[\\u4E00-\\u9FFF々]{2,}`, "g");
const STOP = new Set([
  "どれ", "方法", "構成", "場合", "必要", "利用", "使用", "企業", "会社", "ある", "設定", "以下", "選択", "対応", "実現", "考え",
  "可能", "要件", "次の", "現在", "すべて", "最適", "適切", "最も", "Amazon", "AWS", "使い", "管理", "使っ", "アプリケーション", "データ",
  "サービス", "ユーザー", "システム", "チーム", "担当者", "開発者", "環境", "作成", "提供", "機能",
]);
export function tokens(text) {
  const out = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    let t = m[0].replace(/\s+/g, "");
    if (t.length < 2 || STOP.has(t)) continue;
    out.push({ t: t.toLowerCase(), i: m.index, len: m[0].length });
  }
  return out;
}

// 要件・制約の言い回し: [正規表現, 点数, 種類]
const CUES = [
  [/最も(?:コスト|費用|安価|低コスト|経済)|コスト(?:効率|を(?:最小|抑え|削減|下げ))|費用(?:対効果|を(?:抑え|最小|削減))|安価|追加(?:の)?(?:費用|コスト)|料金/, 3, "コストの条件"],
  [/運用(?:上の|の)?(?:負荷|負担|オーバーヘッド|手間)|管理(?:の)?(?:負荷|負担|作業)|最小限の(?:労力|作業|変更|運用)|手作業|自動(?:で|的|化)|マネージド|サーバーの管理/, 3, "運用の条件"],
  [/(?:ミリ秒|秒|分|時間|日|週間|か月|年)(?:以内|未満|以下|以上|間|後|ごと)|リアルタイム|即時|低レイテンシー|レイテンシー|遅延|スループット|性能|高速|RPO|RTO|ダウンタイム/, 2.5, "性能・時間の条件"],
  [/暗号化|監査|コンプライアンス|規制|準拠|最小権限|権限|認証|機密|漏えい|改ざん|不正|攻撃|脆弱性|インターネットを経由|インターネットに出|パブリック|プライベート/, 2, "セキュリティの条件"],
  [/可用性|耐障害|障害|冗長|フェイルオーバー|災害|リージョン(?:全体|障害|間)|アベイラビリティーゾーン|AZ|中断|停止|復旧/, 2, "可用性の条件"],
  [/変更(?:せず|しない|を加えず|なし)|既存の|コードを(?:変更|書き換え)|再設計|そのまま|移行/, 2, "既存環境の条件"],
  [/かかっても|許容|問題ありません|構いません|かまいません|差し支え|気にしない|不要で|不要です|不要です/, 2.5, "許容できる条件"],
  [/(?:たい|ません|なりません|ない|必要があり|求められ|求めて|必須|避けたい|望んで|義務|しなければ|べき)/, 1.5, "要件"],
  [/判明|発生|エラー|失敗|増加|増えて|超え|不足|できない|遅い|頻繁|急増|スパイク|ピーク|予測(?:でき|不能)|変動/, 1.5, "状況・症状"],
  [/[0-9]+\s?(?:%|台|件|TB|GB|PB|倍|万|千|百)|数百|数千|数万|数十|大量|大規模|多数|数百万/, 1, "規模の条件"],
  [/のみ|だけ|以外|ずに|なく|ないよう|限定|一元|一括|全(?:アカウント|リージョン|社)|組織全体|複数の(?:アカウント|リージョン)/, 1.2, "範囲の条件"],
];
const ASK_RE = /(?:どれ|どの|選んで|ですか|でしょうか)/;
const LEAD_RE = /^(?:また|ただし|さらに|なお|一方|その際|このとき|しかし|そこで|現在|特に)、?\s*/;

function splitClauses(q) {
  // 句読点で区切り、短すぎる断片は次と結合する。[start, end) のオフセットを返す
  const parts = [];
  let s = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (c === "。" || c === "、" || c === "？" || c === "?") {
      parts.push([s, i + 1]);
      s = i + 1;
    }
  }
  if (s < q.length) parts.push([s, q.length]);
  const merged = [];
  for (const p of parts) {
    const last = merged[merged.length - 1];
    if (last && last[1] - last[0] < 9 && q[last[1] - 1] !== "。") last[1] = p[1];
    else merged.push([...p]);
  }
  return merged.map(([a, b]) => {
    let seg = q.slice(a, b);
    const lead = seg.match(LEAD_RE);
    if (lead) {
      a += lead[0].length;
      seg = seg.slice(lead[0].length);
    }
    while (b > a && /[、。？?\s]/.test(q[b - 1])) b--;
    while (a < b && /\s/.test(q[a])) a++;
    return [a, b];
  });
}

/** 問いの文(「最もコスト効率の良い方法はどれですか」)から条件部分だけを取り出す */
function askQualifier(q, a, b) {
  const seg = q.slice(a, b);
  // 「最も/できるだけ ～い・な・た・る」+ 名詞 の形容部分
  const m = seg.match(/(?:最も|もっとも|できるだけ|なるべく)[^、。]*?(?:い|な|た|る|く)(?=[\u4E00-\u9FFF\u30A1-\u30FAA-Za-z])/);
  if (m && !/^(?:最も|もっとも)(?:適し|適切|良い|よい|効果的|正しい|妥当|ふさわし|有効)[^、]{0,3}$/.test(m[0])) {
    const s = a + m.index;
    let e = s + m[0].length;
    return [s, e];
  }
  // 「セキュリティを改善しながら費用を削減する対策を 2 つ選んでください」: 目的の部分
  const t = seg.match(/^(.{6,}?)(?:ための|する|できる|な)?(?:方法|構成|設計|対策|手順|組み合わせ|アプローチ|ソリューション|選択肢|設定|変更|作業|措置|手段)(?:として|を|は)/);
  if (t && CUES.filter(([, , k]) => !["要件", "状況・症状"].includes(k)).some(([re]) => re.test(t[1]))) {
    let e = a + t[0].length - t[0].match(/(?:方法|構成|設計|対策|手順|組み合わせ|アプローチ|ソリューション|選択肢|設定|変更|作業|措置|手段)(?:として|を|は)$/)[0].length;
    return [a, e];
  }
  return null;
}
export function buildIdf(allQuestions) {
  const df = new Map();
  for (const q of allQuestions) for (const t of new Set(tokens(q.question).map((x) => x.t))) df.set(t, (df.get(t) || 0) + 1);
  const N = allQuestions.length;
  return (t) => Math.log(1 + N / (1 + (df.get(t) || 0)));
}

function sentences(text) {
  const out = [];
  let s = 0;
  for (let i = 0; i < text.length; i++) if (text[i] === "。") (out.push(text.slice(s, i + 1).trim()), (s = i + 1));
  if (s < text.length && text.slice(s).trim()) out.push(text.slice(s).trim());
  return out;
}

/**
 * @returns {Array<[start, end, kind, explanationSentenceIndex]>}
 */
export function evidenceLines(q, idf) {
  const text = q.question;
  const correct = q.answer.map((k) => q.options[k]).join(" ");
  const wrong = Object.entries(q.options).filter(([k]) => !q.answer.includes(k)).map(([, v]) => v).join(" ");
  const cSet = new Set(tokens(correct).map((x) => x.t));
  const wSet = new Set(tokens(wrong).map((x) => x.t));
  const expS = sentences(q.explanation);
  const eSets = expS.map((s) => new Set(tokens(s).map((x) => x.t)));
  const eAll = new Set(eSets.flatMap((s) => [...s]));
  const scored = [];
  for (let [a, b] of splitClauses(text)) {
    if (b - a < 4) continue;
    let seg = text.slice(a, b);
    let isAsk = false;
    const full = text.slice(a, Math.min(text.length, b + 2));
    if (ASK_RE.test(full) && (/どれ|選んで/.test(full))) {
      const r = askQualifier(text, a, b);
      if (!r) continue;
      [a, b] = r;
      seg = text.slice(a, b);
      isAsk = true;
    }
    let lex = 0;
    const segTokens = tokens(seg);
    const seen = new Set();
    for (const { t } of segTokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      let w = 0;
      if (cSet.has(t)) w += 1.2;
      if (eAll.has(t)) w += 1;
      if (!w) continue;
      if (wSet.has(t) && !cSet.has(t)) w *= 0.35;
      else if (wSet.has(t)) w *= 0.6;
      lex += w * idf(t);
    }
    let cue = 0, kind = null, kindScore = 0;
    for (const [re, pts, k] of CUES) {
      if (re.test(seg)) {
        cue += pts;
        if (pts > kindScore && k !== "要件") (kind = k), (kindScore = pts);
      }
    }
    if (!kind) kind = cue ? "要件" : "手掛かり";
    let score = lex + cue * 2.2 + (isAsk ? 3 : 0);
    // 背景だけの書き出し(「ある企業は、」)は弱く
    if (/^ある[^、]{0,20}(?:は|では)$/.test(seg) || seg.length < 6) score *= 0.3;
    const strong = ["コストの条件", "運用の条件", "性能・時間の条件", "許容できる条件"].includes(kind);
    scored.push({ a, b, score, kind, strong, segTokens: seen });
  }
  if (!scored.length) {
    // 問いの一文だけの問題: 「〜として正しいものはどれですか」の前までを手掛かりにする
    const m = text.match(/^(.*?)(?:として|について|に関して|の説明として|の)?(?:最も)?(?:正しい|適切な|適した|当てはまる|該当する|ふさわしい|妥当な)?(?:もの|説明|記述|サービス|方法|組み合わせ|選択肢)?(?:は|を)(?:どれ|次のうち|2 つ|二つ)/);
    if (m && m[1].length >= 6) {
      let a = 0, b = m[1].length;
      const lead = text.match(LEAD_RE);
      if (lead) a = lead[0].length;
      return [[a, b, "手掛かり", 0]];
    }
    return [];
  }
  const max = Math.max(...scored.map((s) => s.score));
  const limit = text.length > 160 ? 4 : text.length > 90 ? 3 : 2;
  let picked = scored.filter((s) => s.score >= max * (s.strong ? 0.3 : 0.5)).sort((x, y) => y.score - x.score).slice(0, limit);
  // 長すぎる強調を避ける(問題文の 65% まで)
  let total = 0;
  picked = picked.filter((p) => {
    total += p.b - p.a;
    return total <= text.length * 0.65 || p === picked[0];
  });
  picked.sort((x, y) => x.a - y.a);
  return picked.map((p) => {
    let best = 0, bestScore = -1;
    eSets.forEach((set, i) => {
      let s = 0;
      for (const t of p.segTokens) if (set.has(t)) s += idf(t);
      if (s > bestScore) (bestScore = s), (best = i);
    });
    return [p.a, p.b, p.kind, bestScore > 0 ? best : 0];
  });
}
export { sentences as explanationSentences };
