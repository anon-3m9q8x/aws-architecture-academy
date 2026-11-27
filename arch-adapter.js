// AWS Architecture Academy — 既存の連携シーン(flow.js 形式)を、新しい通信アニメーション形式(arch-player.js)に変換する
// 新形式: { id, title, canvas, zones, nodes:[{id,name,x,y,description,svc}], steps:[{order,source,target,title,operation,duration_ms,packet_color,edge_color,description,via}], extra_connections, notes }
const W = 760, H = 440;
const OUTSIDE = new Set(["user", "internet", "onprem"]);
const KIND = {
  request: { op: "リクエスト", p: "#ffb347", e: "#ed922b" },
  response: { op: "応答", p: "#7cc8ff", e: "#3a9ad9" },
  process: { op: "処理", p: "#c9a2ff", e: "#9b6bea" },
  decision: { op: "判定", p: "#c9a2ff", e: "#9b6bea" },
  status: { op: "状態", p: "#c9a2ff", e: "#9b6bea" },
  setup: { op: "設定", p: "#7be0a6", e: "#2fb36b" },
  addon: { op: "機能を追加", p: "#5fe0d0", e: "#1fa99a" },
  probe: { op: "ヘルスチェック", p: "#b8e06b", e: "#86b52e" },
  healthChange: { op: "状態変化", p: "#ff8a8a", e: "#e05252" },
};

/** flow.js 形式のシーン → 新形式。desc(svcId) はノードの説明文を返す関数 */
export function sceneToArch(sc, desc = () => "") {
  const pos = (n) => ({ x: Math.round(70 + (n.x / 100) * (W - 140)), y: Math.round(56 + (n.y / 100) * (H - 112)) });
  const nodes = sc.nodes.map((n) => ({ id: n.id, name: n.label || n.id, ...pos(n), description: (n.svc && desc(n.svc)) || "", svc: n.svc || null }));
  const inside = nodes.filter((n) => !OUTSIDE.has(n.svc || n.id));
  const zones = [];
  if (inside.length && inside.length < nodes.length) {
    const xs = inside.map((n) => n.x), ys = inside.map((n) => n.y);
    const x0 = Math.max(6, Math.min(...xs) - 80), x1 = Math.min(W - 6, Math.max(...xs) + 80);
    const y0 = Math.max(6, Math.min(...ys) - 56), y1 = Math.min(H - 6, Math.max(...ys) + 48);
    zones.push({ x: x0, y: y0, width: x1 - x0, height: y1 - y0, label: "AWS Cloud" });
  }
  const ids = new Set(nodes.map((n) => n.id));
  const used = new Set();
  const steps = [];
  (sc.steps || []).forEach((t) => {
    const k = KIND[t.type] || KIND.request;
    const src = ids.has(t.source) ? t.source : ids.has(t.target) ? t.target : null;
    if (!src) return;
    const tgt = t.target && ids.has(t.target) ? t.target : t.chipOn && ids.has(t.chipOn) ? t.chipOn : src;
    const via = (t.via || []).filter((v) => ids.has(v));
    if (src !== tgt) [src, ...via, tgt].forEach((v, i, a) => i && used.add([a[i - 1], v].sort().join("|")));
    const chips = Array.isArray(t.chips) && t.chips.length ? t.chips.join("・") : "";
    steps.push({
      order: steps.length + 1, source: src, target: tgt, via,
      title: t.label || k.op, operation: chips || k.op,
      description: t.narration || "", duration_ms: Math.max(1200, Math.min(2600, t.dur || 1900)),
      packet_color: k.p, edge_color: k.e,
    });
  });
  const extra_connections = (sc.edges || [])
    .filter((e) => ids.has(e.from) && ids.has(e.to) && !used.has([e.from, e.to].sort().join("|")))
    .map((e) => ({ source: e.from, target: e.to, kind: e.kind === "response" ? "応答経路" : "関連付け", label: e.label || "" }));
  const notes = [sc.objective, sc.rule, sc.note].filter((x) => typeof x === "string" && x.trim());
  return { id: sc.id, title: sc.title || "", canvas: { width: W, height: H }, zones, nodes, steps, extra_connections, notes };
}

const NOTE_KEYS = { alternate_route: "代替経路", association: "関連付け" };
/** 資料データ(data/architectures.js)の extra_connections の種類を日本語にそろえる */
export function prepArch(a, desc = () => "") {
  return {
    ...a,
    nodes: a.nodes.map((n) => ({ ...n, description: n.description || desc(n.svc) || "" })),
    extra_connections: (a.extra_connections || []).map((c) => ({ ...c, kind: NOTE_KEYS[c.kind] || c.kind })),
  };
}
